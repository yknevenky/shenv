/**
 * Unified Asset Service
 * Aggregates data from Drive and Gmail into a unified asset model
 */

import { apiClient } from './api';
import { driveOAuthApi, driveAssetsApi, driveAnalyticsApi } from './drive';
import {
  getRiskLevel,
  type UnifiedAsset,
  type DriveFileAsset,
  type EmailSenderAsset,
  type AssetType,
  type AssetFilters,
  type AssetSort,
  type AssetListResponse,
  type AssetStats,
  type PlatformConnection,
  type RiskLevel,
} from '../types/assets';

/**
 * Transform Drive asset to unified format
 */
function transformDriveAsset(driveAsset: any): DriveFileAsset {
  const riskScore = driveAsset.riskScore || 0;

  // Determine file type from mimeType or assetType
  let fileType: DriveFileAsset['metadata']['fileType'] = 'other';
  const assetType = (driveAsset.assetType || '').toLowerCase();
  if (assetType.includes('spreadsheet')) fileType = 'spreadsheet';
  else if (assetType.includes('document')) fileType = 'document';
  else if (assetType.includes('presentation')) fileType = 'presentation';
  else if (assetType.includes('form')) fileType = 'form';
  else if (assetType.includes('folder')) fileType = 'folder';
  else if (assetType.includes('image')) fileType = 'image';
  else if (assetType.includes('pdf')) fileType = 'pdf';

  return {
    id: `drive_${driveAsset.id}`,
    type: 'drive_file',
    platform: 'google_workspace',
    name: driveAsset.name || 'Untitled',
    owner: driveAsset.ownerEmail || 'Unknown',
    ownerEmail: driveAsset.ownerEmail,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    createdAt: driveAsset.createdAt,
    lastActivityAt: driveAsset.lastModifiedAt || driveAsset.createdAt,
    lastSyncedAt: driveAsset.lastSyncedAt || new Date().toISOString(),
    url: driveAsset.url,
    metadata: {
      mimeType: driveAsset.mimeType || '',
      fileType,
      externalId: driveAsset.externalId || driveAsset.sheetId || '',
      permissionCount: driveAsset.permissionCount || 0,
      isOrphaned: driveAsset.isOrphaned || false,
      isInactive: driveAsset.isInactive || false,
      isPublic: false, // Will be determined from permissions
      isDomainShared: false, // Will be determined from permissions
    },
  };
}

/**
 * Transform Email Sender to unified format
 */
function transformEmailSender(sender: any): EmailSenderAsset {
  // Calculate risk score for senders based on verification and volume
  let riskScore = 0;
  if (!sender.isVerified) riskScore += 40; // Unverified sender is risky
  if (sender.emailCount > 100) riskScore += 20; // High volume
  if (!sender.hasUnsubscribe && sender.emailCount > 10) riskScore += 15; // Can't unsubscribe

  return {
    id: `sender_${sender.id}`,
    type: 'email_sender',
    platform: 'google_workspace',
    name: sender.senderName || sender.senderEmail,
    description: `${sender.emailCount} emails`,
    owner: sender.senderEmail,
    ownerEmail: sender.senderEmail,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    createdAt: sender.firstEmailDate,
    lastActivityAt: sender.lastEmailDate,
    lastSyncedAt: sender.lastSyncedAt || new Date().toISOString(),
    metadata: {
      senderEmail: sender.senderEmail,
      senderName: sender.senderName,
      emailCount: sender.emailCount || 0,
      attachmentCount: sender.attachmentCount || 0,
      firstEmailDate: sender.firstEmailDate,
      lastEmailDate: sender.lastEmailDate,
      hasUnsubscribe: sender.hasUnsubscribe || false,
      unsubscribeLink: sender.unsubscribeLink,
      isVerified: sender.isVerified ?? true,
      isUnsubscribed: sender.isUnsubscribed || false,
      unsubscribedAt: sender.unsubscribedAt,
    },
  };
}

/**
 * Unified Asset Service API
 */
export const unifiedAssetApi = {
  /**
   * Get platform connection status
   */
  getConnectionStatus: async (): Promise<PlatformConnection> => {
    try {
      // Check OAuth/Service Account status
      const oauthStatus = await driveOAuthApi.getStatus();

      if (oauthStatus.isConnected) {
        return {
          platform: 'google_workspace',
          isConnected: true,
          authType: oauthStatus.authType,
          email: oauthStatus.email,
          capabilities: {
            canReadDrive: true,
            canWriteDrive: oauthStatus.authType === 'service_account',
            canReadGmail: true, // Assuming Gmail OAuth is separate
            canWriteGmail: true,
            canReadWorkspaceUsers: oauthStatus.authType === 'service_account',
          },
        };
      }

      // Check for service account
      try {
        const saResponse = await apiClient.get('/api/platforms/google_workspace/status');
        if (saResponse.data?.data?.hasCredentials) {
          const credResponse = await apiClient.get('/api/platforms/credentials');
          const googleCred = credResponse.data?.data?.platforms?.find(
            (p: any) => p.platform === 'google_workspace'
          );

          if (googleCred) {
            return {
              platform: 'google_workspace',
              isConnected: true,
              authType: googleCred.credentialType,
              email: googleCred.email || null,
              capabilities: {
                canReadDrive: true,
                canWriteDrive: googleCred.credentialType === 'service_account',
                canReadGmail: false, // Service account doesn't have Gmail access
                canWriteGmail: false,
                canReadWorkspaceUsers: googleCred.credentialType === 'service_account',
              },
            };
          }
        }
      } catch {
        // Ignore errors
      }

      return {
        platform: 'google_workspace',
        isConnected: false,
        authType: null,
        email: null,
        capabilities: {
          canReadDrive: false,
          canWriteDrive: false,
          canReadGmail: false,
          canWriteGmail: false,
          canReadWorkspaceUsers: false,
        },
      };
    } catch (err) {
      console.error('Failed to get connection status:', err);
      return {
        platform: 'google_workspace',
        isConnected: false,
        authType: null,
        email: null,
        capabilities: {
          canReadDrive: false,
          canWriteDrive: false,
          canReadGmail: false,
          canWriteGmail: false,
          canReadWorkspaceUsers: false,
        },
      };
    }
  },

  /**
   * Get all assets with filters and pagination
   */
  getAssets: async (
    filters: AssetFilters = {},
    sort: AssetSort = { field: 'riskScore', order: 'desc' },
    limit: number = 50,
    offset: number = 0
  ): Promise<AssetListResponse> => {
    const allAssets: UnifiedAsset[] = [];
    const types = filters.types || ['drive_file', 'email_sender'];

    // Fetch Drive assets if requested
    if (types.includes('drive_file')) {
      try {
        const driveParams: any = {
          limit: 100, // Fetch more to allow filtering
          offset: 0,
          platform: 'google_workspace',
        };

        if (filters.search) driveParams.search = filters.search;
        if (filters.isOrphaned) driveParams.orphaned = true;
        if (filters.isInactive) driveParams.inactive = true;
        if (filters.riskLevels?.includes('high')) driveParams.highRisk = true;

        const driveResult = await driveAssetsApi.list(driveParams);
        const driveAssets = driveResult.assets.map(transformDriveAsset);
        allAssets.push(...driveAssets);
      } catch (err) {
        console.error('Failed to fetch Drive assets:', err);
      }
    }

    // Fetch Email Senders if requested
    if (types.includes('email_sender')) {
      try {
        const response = await apiClient.get('/api/gmail/senders', {
          params: {
            limit: 100,
            offset: 0,
            search: filters.search || '',
          },
        });

        if (response.data?.data?.senders) {
          const senderAssets = response.data.data.senders.map(transformEmailSender);
          allAssets.push(...senderAssets);
        }
      } catch (err) {
        console.error('Failed to fetch Email senders:', err);
      }
    }

    // Apply additional filters
    let filteredAssets = allAssets;

    // Filter by risk level
    if (filters.riskLevels && filters.riskLevels.length > 0) {
      filteredAssets = filteredAssets.filter(a => filters.riskLevels!.includes(a.riskLevel));
    }

    // Filter by verified (for email senders)
    if (filters.isVerified !== undefined) {
      filteredAssets = filteredAssets.filter(a => {
        if (a.type === 'email_sender') {
          return a.metadata.isVerified === filters.isVerified;
        }
        return true;
      });
    }

    // Sort assets
    filteredAssets.sort((a, b) => {
      let aVal: any = a[sort.field as keyof UnifiedAsset];
      let bVal: any = b[sort.field as keyof UnifiedAsset];

      // Handle dates
      if (sort.field === 'createdAt' || sort.field === 'lastActivityAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      // Handle strings
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (sort.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Apply pagination
    const total = filteredAssets.length;
    const paginatedAssets = filteredAssets.slice(offset, offset + limit);

    return {
      assets: paginatedAssets,
      total,
      limit,
      offset,
      hasMore: offset + paginatedAssets.length < total,
    };
  },

  /**
   * Get asset statistics
   */
  getStats: async (): Promise<AssetStats> => {
    const stats: AssetStats = {
      total: 0,
      byType: {
        drive_file: 0,
        email_sender: 0,
        email_message: 0,
      },
      byRiskLevel: {
        low: 0,
        medium: 0,
        high: 0,
      },
      highRiskCount: 0,
      recentActivityCount: 0,
    };

    try {
      // Get Drive stats
      const driveOverview = await driveAnalyticsApi.getOverview('google_workspace');
      stats.byType.drive_file = driveOverview.totalAssets || 0;
      stats.highRiskCount += driveOverview.highRiskAssets || 0;

      // Map Drive risk distribution
      if (driveOverview.riskDistribution) {
        for (const dist of driveOverview.riskDistribution) {
          const level = dist.riskLevel as RiskLevel;
          if (stats.byRiskLevel[level] !== undefined) {
            stats.byRiskLevel[level] += dist.count;
          }
        }
      }
    } catch (err) {
      console.error('Failed to get Drive stats:', err);
    }

    try {
      // Get Email sender stats
      const response = await apiClient.get('/api/gmail/senders', {
        params: { limit: 1000, offset: 0 },
      });

      if (response.data?.data?.senders) {
        const senders = response.data.data.senders;
        stats.byType.email_sender = senders.length;

        // Calculate risk distribution for senders
        for (const sender of senders) {
          let riskScore = 0;
          if (!sender.isVerified) riskScore += 40;
          if (sender.emailCount > 100) riskScore += 20;

          const level = getRiskLevel(riskScore);
          stats.byRiskLevel[level]++;
          if (level === 'high') stats.highRiskCount++;

          // Check recent activity
          if (sender.lastEmailDate) {
            const daysSince = (Date.now() - new Date(sender.lastEmailDate).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince <= 7) stats.recentActivityCount++;
          }
        }
      }
    } catch (err) {
      console.error('Failed to get Email sender stats:', err);
    }

    stats.total = stats.byType.drive_file + stats.byType.email_sender + stats.byType.email_message;

    return stats;
  },

  /**
   * Discover assets (trigger discovery for all types)
   */
  discoverAssets: async (types: AssetType[] = ['drive_file', 'email_sender']): Promise<{
    drive?: { discovered: number; stored: number };
    gmail?: { senders: number; emails: number };
  }> => {
    const results: any = {};

    if (types.includes('drive_file')) {
      try {
        results.drive = await driveAssetsApi.discover('google_workspace');
      } catch (err) {
        console.error('Drive discovery failed:', err);
      }
    }

    if (types.includes('email_sender')) {
      try {
        const response = await apiClient.post('/api/gmail/senders/fetch-all', {
          saveToDb: true,
        });
        if (response.data?.data) {
          results.gmail = {
            senders: response.data.data.uniqueSenders || 0,
            emails: response.data.data.totalProcessed || 0,
          };
        }
      } catch (err) {
        console.error('Gmail discovery failed:', err);
      }
    }

    return results;
  },

  /**
   * Get asset details by ID
   */
  getAssetDetails: async (assetId: string): Promise<UnifiedAsset | null> => {
    const [type, id] = assetId.split('_');

    if (type === 'drive') {
      try {
        const result = await driveAssetsApi.getDetails(parseInt(id));
        const asset = transformDriveAsset(result.asset);
        // Add permissions
        if (result.permissions) {
          asset.metadata.permissions = result.permissions.map((p: any) => ({
            id: p.externalPermissionId || p.id,
            email: p.email,
            displayName: p.displayName,
            role: p.role,
            type: p.type,
          }));
          // Check for public/domain access
          asset.metadata.isPublic = result.permissions.some((p: any) => p.type === 'anyone');
          asset.metadata.isDomainShared = result.permissions.some((p: any) => p.type === 'domain');
        }
        return asset;
      } catch (err) {
        console.error('Failed to get Drive asset details:', err);
        return null;
      }
    }

    if (type === 'sender') {
      try {
        const response = await apiClient.get(`/api/gmail/senders/${id}`);
        if (response.data?.data) {
          return transformEmailSender(response.data.data);
        }
      } catch (err) {
        console.error('Failed to get sender details:', err);
      }
    }

    return null;
  },

  /**
   * Perform action on asset
   */
  performAction: async (
    assetId: string,
    action: 'delete' | 'unsubscribe' | 'refresh'
  ): Promise<{ success: boolean; error?: string }> => {
    const [type, id] = assetId.split('_');

    try {
      if (type === 'drive') {
        if (action === 'refresh') {
          await driveAssetsApi.refresh(parseInt(id));
          return { success: true };
        }
        // Other drive actions would go through governance
      }

      if (type === 'sender') {
        if (action === 'delete') {
          await apiClient.delete(`/api/gmail/senders/${id}`);
          return { success: true };
        }
        if (action === 'unsubscribe') {
          const response = await apiClient.post(`/api/gmail/senders/${id}/unsubscribe`);
          return { success: true, ...response.data?.data };
        }
      }

      return { success: false, error: 'Unsupported action' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Action failed' };
    }
  },
};

// Re-export helper function
export { getRiskLevel } from '../types/assets';
