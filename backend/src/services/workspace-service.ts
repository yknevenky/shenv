import { getAdminClient } from './google-auth.js';
import { logger } from '../utils/logger.js';

interface WorkspaceUserData {
  email: string;
  fullName: string;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
}

/**
 * Service for interacting with Google Workspace Admin API
 */
export class WorkspaceService {
  /**
   * Discover all users in the Google Workspace
   * Requires Domain-Wide Delegation to be enabled for the service account
   */
  static async discoverWorkspaceUsers(
    serviceAccountJson: string,
    adminEmail?: string
  ): Promise<WorkspaceUserData[]> {
    try {
      // Parse service account JSON
      const credentials = JSON.parse(serviceAccountJson);

      // Get Admin SDK client with optional Domain-Wide Delegation
      const admin = getAdminClient(credentials, adminEmail);

      const users: WorkspaceUserData[] = [];
      let pageToken: string | undefined;

      do {
        const response = await admin.users.list({
          customer: 'my_customer', // Special value for the customer associated with the domain
          maxResults: 500,
          ...(pageToken && { pageToken }),
          projection: 'full',
        });

        const usersList = response.data.users || [];

        for (const user of usersList) {
          users.push({
            email: user.primaryEmail || '',
            fullName: user.name?.fullName || '',
            isAdmin: user.isAdmin || false,
            isSuspended: user.suspended || false,
            createdAt: user.creationTime ? new Date(user.creationTime) : null,
            lastLoginAt: user.lastLoginTime ? new Date(user.lastLoginTime) : null,
          });
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info(`Discovered ${users.length} workspace users`);
      return users;
    } catch (error: any) {
      logger.error('Error discovering workspace users', error);

      if (error.code === 403) {
        throw new Error(
          'Insufficient permissions. Ensure Domain-Wide Delegation is enabled ' +
          'for the service account with Admin SDK API scope: ' +
          'https://www.googleapis.com/auth/admin.directory.user.readonly'
        );
      }

      if (error.code === 401) {
        throw new Error('Authentication failed. Check service account credentials.');
      }

      throw new Error(`Failed to discover workspace users: ${error.message}`);
    }
  }

  /**
   * Check if the service account has Domain-Wide Delegation enabled
   * and can access the Admin API
   */
  static async checkAdminApiAccess(
    serviceAccountJson: string,
    adminEmail?: string
  ): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      await this.discoverWorkspaceUsers(serviceAccountJson, adminEmail);
      return { hasAccess: true };
    } catch (error: any) {
      return {
        hasAccess: false,
        error: error.message,
      };
    }
  }
}
