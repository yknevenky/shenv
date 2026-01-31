/**
 * Google Workspace Platform Adapter
 *
 * Implements the IPlatformAdapter interface for Google Workspace
 * (Google Drive, Sheets, Docs, Slides, Forms, etc.)
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../../utils/logger.js';
import {
  IPlatformAdapter,
  Platform,
  AssetType,
  DiscoveredAsset,
  DiscoveredPermission,
  DiscoveredWorkspaceUser,
} from './adapter.interface.js';

// ==================== GOOGLE WORKSPACE ADAPTER ====================

export class GoogleWorkspaceAdapter implements IPlatformAdapter {
  getPlatform(): Platform {
    return 'google_workspace';
  }

  /**
   * Detect credential type: service_account or oauth
   */
  private detectCredentialType(credentials: any): 'service_account' | 'oauth' | 'unknown' {
    if (credentials.type === 'service_account') {
      return 'service_account';
    }
    if (credentials.accessToken || credentials.refreshToken) {
      return 'oauth';
    }
    return 'unknown';
  }

  /**
   * Create OAuth2 client from OAuth credentials
   */
  private createOAuthClient(credentials: any): OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const tokenData: any = {
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    };

    if (credentials.expiresAt) {
      tokenData.expiry_date = new Date(credentials.expiresAt).getTime();
    }

    oauth2Client.setCredentials(tokenData);

    return oauth2Client;
  }

  /**
   * Create auth client based on credential type
   */
  private async createAuthClient(credentials: any): Promise<any> {
    const credType = this.detectCredentialType(credentials);

    if (credType === 'service_account') {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      return auth;
    } else if (credType === 'oauth') {
      return this.createOAuthClient(credentials);
    } else {
      throw new Error('Unknown credential type');
    }
  }

  /**
   * Validate Google credentials (service account or OAuth)
   */
  async validateCredentials(credentials: any): Promise<boolean> {
    try {
      if (!credentials || typeof credentials !== 'object') {
        return false;
      }

      const credType = this.detectCredentialType(credentials);

      if (credType === 'service_account') {
        // Check required fields for Google service account
        const requiredFields = [
          'type',
          'project_id',
          'private_key_id',
          'private_key',
          'client_email',
          'client_id',
        ];

        for (const field of requiredFields) {
          if (!credentials[field]) {
            logger.warn(`Missing required field in Google service account: ${field}`);
            return false;
          }
        }

        // Try to create a client to validate credentials
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const client = await auth.getClient();
        if (!client) {
          return false;
        }

        return true;
      } else if (credType === 'oauth') {
        // OAuth credentials - check required fields
        if (!credentials.accessToken) {
          logger.warn('Missing accessToken in OAuth credentials');
          return false;
        }

        // OAuth credentials are validated at token exchange time
        return true;
      } else {
        logger.warn('Unknown credential type');
        return false;
      }
    } catch (error) {
      logger.error('Failed to validate Google credentials', { error });
      return false;
    }
  }

  /**
   * Discover all Google Drive assets (Sheets, Docs, Slides, etc.)
   */
  async discoverAssets(credentials: any, userId: number): Promise<DiscoveredAsset[]> {
    try {
      logger.info('Starting Google Workspace asset discovery', { userId });

      const auth = await this.createAuthClient(credentials);
      const drive = google.drive({ version: 'v3', auth });
      const discoveredAssets: DiscoveredAsset[] = [];
      let pageToken: string | undefined;

      do {
        // Build request params conditionally to avoid passing undefined
        const listParams: any = {
          q: "trashed=false", // Exclude trashed files
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink, owners, createdTime, modifiedTime, permissions)',
          pageSize: 1000,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        };

        // Only add pageToken if it exists
        if (pageToken) {
          listParams.pageToken = pageToken;
        }

        const response = await drive.files.list(listParams);

        const files = response.data.files || [];

        for (const file of files) {
          // Map permissions
          const permissions: DiscoveredPermission[] = (file.permissions || []).map((perm: any) => ({
            externalPermissionId: perm.id || '',
            email: perm.emailAddress || undefined,
            role: this.normalizeRole(perm.role || 'reader'),
            type: perm.type || 'user',
            displayName: perm.displayName || undefined,
          }));

          const mimeType = file.mimeType || 'application/octet-stream';
          const assetType = this.mapMimeTypeToAssetType(mimeType);

          // Build asset object with required fields
          const asset: DiscoveredAsset = {
            externalId: file.id || '',
            assetType,
            name: file.name || 'Untitled',
            ownerEmail: file.owners?.[0]?.emailAddress || 'unknown@example.com',
            url: file.webViewLink || `https://drive.google.com/file/d/${file.id}`,
            permissions,
          };

          // Add optional fields only if they exist
          if (mimeType) {
            asset.mimeType = mimeType;
          }
          if (file.createdTime) {
            asset.createdAt = new Date(file.createdTime);
          }
          if (file.modifiedTime) {
            asset.lastModifiedAt = new Date(file.modifiedTime);
          }

          discoveredAssets.push(asset);
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info(`Discovered ${discoveredAssets.length} Google Workspace assets`, { userId });
      return discoveredAssets;
    } catch (error) {
      logger.error('Failed to discover Google Workspace assets', { userId, error });
      throw new Error(`Google Workspace discovery failed: ${error}`);
    }
  }

  /**
   * Discover workspace users using Google Admin API
   * NOTE: Only works with service account + Domain-Wide Delegation, not OAuth
   */
  async discoverWorkspaceUsers(credentials: any, userId: number): Promise<DiscoveredWorkspaceUser[]> {
    try {
      logger.info('Starting Google Workspace user discovery', { userId });

      // Check credential type - workspace user discovery requires service account
      const credType = this.detectCredentialType(credentials);
      if (credType === 'oauth') {
        logger.warn('Workspace user discovery not available with OAuth credentials (requires DWD)');
        return []; // Return empty array for OAuth users
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
      });

      const admin = google.admin({ version: 'directory_v1', auth });
      const users: DiscoveredWorkspaceUser[] = [];
      let pageToken: string | undefined;

      do {
        // Build request params conditionally to avoid passing undefined
        const listParams: any = {
          customer: 'my_customer',
          maxResults: 500,
        };

        // Only add pageToken if it exists
        if (pageToken) {
          listParams.pageToken = pageToken;
        }

        const response = await admin.users.list(listParams);

        const workspaceUsers = response.data.users || [];

        for (const user of workspaceUsers) {
          // Build user object with required fields
          const workspaceUser: DiscoveredWorkspaceUser = {
            email: user.primaryEmail || '',
            isAdmin: user.isAdmin || false,
            isSuspended: user.suspended || false,
          };

          // Add optional fields only if they exist
          if (user.name?.fullName) {
            workspaceUser.fullName = user.name.fullName;
          }
          if (user.creationTime) {
            workspaceUser.createdAt = new Date(user.creationTime);
          }
          if (user.lastLoginTime) {
            workspaceUser.lastLoginAt = new Date(user.lastLoginTime);
          }

          users.push(workspaceUser);
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info(`Discovered ${users.length} Google Workspace users`, { userId });
      return users;
    } catch (error) {
      logger.error('Failed to discover Google Workspace users', { userId, error });
      throw new Error(`Google Workspace user discovery failed: ${error}`);
    }
  }

  /**
   * Get permissions for a specific asset
   */
  async getAssetPermissions(credentials: any, externalAssetId: string): Promise<DiscoveredPermission[]> {
    try {
      const auth = await this.createAuthClient(credentials);
      const drive = google.drive({ version: 'v3', auth });

      const response = await drive.permissions.list({
        fileId: externalAssetId,
        fields: 'permissions(id, emailAddress, role, type, displayName)',
      });

      const permissions = response.data.permissions || [];

      return permissions.map((perm: any) => ({
        externalPermissionId: perm.id || '',
        email: perm.emailAddress || undefined,
        role: this.normalizeRole(perm.role || 'reader'),
        type: perm.type || 'user',
        displayName: perm.displayName || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get asset permissions', { externalAssetId, error });
      throw new Error(`Failed to get permissions: ${error}`);
    }
  }

  /**
   * Get detailed information about a specific asset
   */
  async getAssetDetails(credentials: any, externalAssetId: string): Promise<DiscoveredAsset> {
    try {
      const auth = await this.createAuthClient(credentials);
      const drive = google.drive({ version: 'v3', auth });

      const response = await drive.files.get({
        fileId: externalAssetId,
        fields: 'id, name, mimeType, webViewLink, owners, createdTime, modifiedTime, permissions',
      });

      const file = response.data;

      const permissions: DiscoveredPermission[] = (file.permissions || []).map((perm: any) => ({
        externalPermissionId: perm.id || '',
        email: perm.emailAddress || undefined,
        role: this.normalizeRole(perm.role || 'reader'),
        type: perm.type || 'user',
        displayName: perm.displayName || undefined,
      }));

      const mimeType = file.mimeType || 'application/octet-stream';

      // Build asset object with required fields
      const asset: DiscoveredAsset = {
        externalId: file.id || externalAssetId,
        assetType: this.mapMimeTypeToAssetType(mimeType),
        name: file.name || 'Untitled',
        ownerEmail: file.owners?.[0]?.emailAddress || 'unknown@example.com',
        url: file.webViewLink || `https://drive.google.com/file/d/${file.id}`,
        permissions,
      };

      // Add optional fields only if they exist
      if (mimeType) {
        asset.mimeType = mimeType;
      }
      if (file.createdTime) {
        asset.createdAt = new Date(file.createdTime);
      }
      if (file.modifiedTime) {
        asset.lastModifiedAt = new Date(file.modifiedTime);
      }

      return asset;
    } catch (error) {
      logger.error('Failed to get asset details', { externalAssetId, error });
      throw new Error(`Failed to get asset details: ${error}`);
    }
  }

  /**
   * Delete an asset permanently
   */
  async deleteAsset(credentials: any, externalAssetId: string): Promise<void> {
    try {
      // Note: For OAuth, user needs Drive write scope
      const credType = this.detectCredentialType(credentials);
      const auth = credType === 'service_account'
        ? new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] })
        : await this.createAuthClient(credentials);

      const drive = google.drive({ version: 'v3', auth });

      await drive.files.delete({
        fileId: externalAssetId,
      });

      logger.info('Asset deleted successfully', { externalAssetId });
    } catch (error) {
      logger.error('Failed to delete asset', { externalAssetId, error });
      throw new Error(`Failed to delete asset: ${error}`);
    }
  }

  /**
   * Change asset visibility (remove public/domain sharing)
   */
  async changeVisibility(credentials: any, externalAssetId: string, visibility: string): Promise<void> {
    try {
      const credType = this.detectCredentialType(credentials);
      const auth = credType === 'service_account'
        ? new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] })
        : await this.createAuthClient(credentials);

      const drive = google.drive({ version: 'v3', auth });

      // Get current permissions
      const permissions = await this.getAssetPermissions(credentials, externalAssetId);

      // Remove 'anyone' and 'domain' permissions for private/restricted visibility
      for (const perm of permissions) {
        if (perm.type === 'anyone' || perm.type === 'domain') {
          await drive.permissions.delete({
            fileId: externalAssetId,
            permissionId: perm.externalPermissionId,
          });
          logger.info('Removed permission', { externalAssetId, permissionId: perm.externalPermissionId, type: perm.type });
        }
      }

      logger.info('Asset visibility changed successfully', { externalAssetId, visibility });
    } catch (error) {
      logger.error('Failed to change asset visibility', { externalAssetId, error });
      throw new Error(`Failed to change visibility: ${error}`);
    }
  }

  /**
   * Remove a specific permission from an asset
   */
  async removePermission(credentials: any, externalAssetId: string, externalPermissionId: string): Promise<void> {
    try {
      const credType = this.detectCredentialType(credentials);
      const auth = credType === 'service_account'
        ? new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] })
        : await this.createAuthClient(credentials);

      const drive = google.drive({ version: 'v3', auth });

      await drive.permissions.delete({
        fileId: externalAssetId,
        permissionId: externalPermissionId,
      });

      logger.info('Permission removed successfully', { externalAssetId, externalPermissionId });
    } catch (error) {
      logger.error('Failed to remove permission', { externalAssetId, externalPermissionId, error });
      throw new Error(`Failed to remove permission: ${error}`);
    }
  }

  /**
   * Transfer ownership of an asset
   */
  async transferOwnership(credentials: any, externalAssetId: string, newOwnerEmail: string): Promise<void> {
    try {
      const credType = this.detectCredentialType(credentials);
      const auth = credType === 'service_account'
        ? new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] })
        : await this.createAuthClient(credentials);

      const drive = google.drive({ version: 'v3', auth });

      // Create new owner permission
      await drive.permissions.create({
        fileId: externalAssetId,
        requestBody: {
          type: 'user',
          role: 'owner',
          emailAddress: newOwnerEmail,
        },
        transferOwnership: true,
      });

      logger.info('Ownership transferred successfully', { externalAssetId, newOwnerEmail });
    } catch (error) {
      logger.error('Failed to transfer ownership', { externalAssetId, newOwnerEmail, error });
      throw new Error(`Failed to transfer ownership: ${error}`);
    }
  }

  /**
   * Map Google MIME type to generic asset type
   */
  mapMimeTypeToAssetType(mimeType: string): AssetType {
    const mimeTypeMap: Record<string, AssetType> = {
      'application/vnd.google-apps.spreadsheet': 'spreadsheet',
      'application/vnd.google-apps.document': 'document',
      'application/vnd.google-apps.presentation': 'presentation',
      'application/vnd.google-apps.form': 'form',
      'application/vnd.google-apps.folder': 'folder',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet', // Excel
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document', // Word
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation', // PowerPoint
    };

    return mimeTypeMap[mimeType] || 'other';
  }

  /**
   * Calculate risk score for an asset
   */
  calculateRiskScore(asset: DiscoveredAsset, workspaceUsers: DiscoveredWorkspaceUser[]): number {
    let riskScore = 0;
    const workspaceEmails = new Set(workspaceUsers.map(u => u.email.toLowerCase()));

    // Check permissions for risk factors
    for (const perm of asset.permissions) {
      // Factor 1: Anyone with link (40 points)
      if (perm.type === 'anyone') {
        riskScore += 40;
      }

      // Factor 2: Domain-wide access (25 points)
      if (perm.type === 'domain') {
        riskScore += 25;
      }

      // Factor 3: External users (20 points for any external user)
      if (perm.email && !workspaceEmails.has(perm.email.toLowerCase())) {
        riskScore = Math.min(riskScore + 20, 100);
      }

      // Factor 4: External editors/owners (15 additional points)
      if (perm.email && !workspaceEmails.has(perm.email.toLowerCase()) &&
          (perm.role === 'owner' || perm.role === 'writer' || perm.role === 'editor')) {
        riskScore = Math.min(riskScore + 15, 100);
      }
    }

    // Factor 5: High permission count (10 points if 50+)
    if (asset.permissions.length >= 50) {
      riskScore = Math.min(riskScore + 10, 100);
    }

    // Factor 6: Inactive (10 points if not modified in 6+ months)
    if (asset.lastModifiedAt) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (asset.lastModifiedAt < sixMonthsAgo) {
        riskScore = Math.min(riskScore + 10, 100);
      }
    }

    // Factor 7: Orphaned (20 points if owner not in workspace)
    const ownerInWorkspace = workspaceEmails.has(asset.ownerEmail.toLowerCase());
    if (!ownerInWorkspace) {
      riskScore = Math.min(riskScore + 20, 100);
    }

    return Math.min(riskScore, 100);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Normalize Google permission roles to standard roles
   */
  private normalizeRole(googleRole: string): string {
    const roleMap: Record<string, string> = {
      'owner': 'owner',
      'organizer': 'owner',
      'fileOrganizer': 'owner',
      'writer': 'editor',
      'commenter': 'commenter',
      'reader': 'viewer',
    };

    return roleMap[googleRole] || googleRole;
  }
}
