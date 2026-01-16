import { getDriveClient } from './google-auth.js';
import { logger } from '../utils/logger.js';
import { SheetRepository } from '../db/repositories/sheet.js';
import { PermissionRepository } from '../db/repositories/permission.js';
import { WorkspaceUserRepository } from '../db/repositories/workspace-user.js';

interface DiscoveredSheet {
  sheetId: string;
  name: string;
  ownerEmail: string;
  url: string;
  createdAt: Date;
  lastModifiedAt: Date;
  permissionCount: number;
  permissions: DiscoveredPermission[];
}

interface DiscoveredPermission {
  permissionId: string;
  email: string | null;
  role: string;
  type: string;
  displayName: string | null;
}

/**
 * Service for discovering Google Sheets and analyzing them for governance
 */
export class SheetsDiscoveryService {
  /**
   * Discover all Google Sheets accessible by the service account
   */
  static async discoverAllSheets(
    userId: number,
    serviceAccountJson: string
  ): Promise<{ discovered: number; stored: number }> {
    try {
      // Parse service account JSON
      const credentials = JSON.parse(serviceAccountJson);
      const drive = getDriveClient(credentials);

      logger.info('Starting sheet discovery for user', { userId });

      const discoveredSheets: DiscoveredSheet[] = [];
      let pageToken: string | undefined;

      do {
        const response = await drive.files.list({
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          fields: 'nextPageToken, files(id, name, webViewLink, owners, createdTime, modifiedTime, permissions)',
          pageSize: 1000,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          pageToken: pageToken || undefined,
        });

        const files = response.data.files || [];

        for (const file of files) {
          const permissions: DiscoveredPermission[] = (file.permissions || []).map((perm: any) => ({
            permissionId: perm.id || '',
            email: perm.emailAddress || null,
            role: perm.role || 'reader',
            type: perm.type || 'user',
            displayName: perm.displayName || null,
          }));

          discoveredSheets.push({
            sheetId: file.id || '',
            name: file.name || 'Untitled',
            ownerEmail: file.owners?.[0]?.emailAddress || 'unknown@example.com',
            url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
            createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
            lastModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
            permissionCount: permissions.length,
            permissions,
          });
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info(`Discovered ${discoveredSheets.length} sheets`);

      // Store sheets in database
      let storedCount = 0;
      for (const sheet of discoveredSheets) {
        const storedSheet = await SheetRepository.upsert(userId, {
          sheetId: sheet.sheetId,
          name: sheet.name,
          ownerEmail: sheet.ownerEmail,
          url: sheet.url,
          createdAt: sheet.createdAt,
          lastModifiedAt: sheet.lastModifiedAt,
          permissionCount: sheet.permissionCount,
          isOrphaned: false,
          isInactive: false,
          riskScore: 0, // Will be calculated separately
        });

        // Store permissions
        for (const perm of sheet.permissions) {
          await PermissionRepository.upsert({
            sheetId: storedSheet.id,
            permissionId: perm.permissionId,
            email: perm.email || 'anyone',
            role: perm.role,
            type: perm.type,
            displayName: perm.displayName,
            snapshotDate: new Date(),
          });
        }

        storedCount++;
      }

      logger.info(`Stored ${storedCount} sheets with permissions`);

      return {
        discovered: discoveredSheets.length,
        stored: storedCount,
      };
    } catch (error: any) {
      logger.error('Error discovering sheets', error);
      throw new Error(`Failed to discover sheets: ${error.message}`);
    }
  }

  /**
   * Analyze sheets for governance risks and update risk scores
   */
  static async analyzeSheetRisks(userId: number): Promise<void> {
    try {
      logger.info('Analyzing sheet risks for user', { userId });

      const { sheets } = await SheetRepository.findAllByUser(userId, { limit: 10000 });
      const workspaceUsers = await WorkspaceUserRepository.findAllByUser(userId);
      const workspaceEmails = new Set(workspaceUsers.map(u => u.email));

      for (const sheet of sheets) {
        let riskScore = 0;

        // Get permissions for this sheet
        const permissions = await PermissionRepository.findAllBySheet(sheet.id);

        // Risk Factor 1: Anyone with link (HIGH RISK)
        const anyonePermissions = permissions.filter(p => p.type === 'anyone');
        if (anyonePermissions.length > 0) {
          riskScore += 40;
        }

        // Risk Factor 2: Domain-wide access (MEDIUM RISK)
        const domainPermissions = permissions.filter(p => p.type === 'domain');
        if (domainPermissions.length > 0) {
          riskScore += 25;
        }

        // Risk Factor 3: External users (outside workspace) (MEDIUM RISK)
        const externalUsers = permissions.filter(
          p => p.email && !workspaceEmails.has(p.email) && p.type === 'user'
        );
        if (externalUsers.length > 0) {
          riskScore += 20;
        }

        // Risk Factor 4: High number of users (LOW RISK)
        if (permissions.length > 50) {
          riskScore += 10;
        } else if (permissions.length > 20) {
          riskScore += 5;
        }

        // Risk Factor 5: Editor/Owner access to external users (HIGH RISK)
        const externalEditors = externalUsers.filter(p => p.role === 'writer' || p.role === 'owner');
        if (externalEditors.length > 0) {
          riskScore += 15;
        }

        // Risk Factor 6: Orphaned sheet (owner not in workspace)
        const isOrphaned = !workspaceEmails.has(sheet.ownerEmail);
        if (isOrphaned) {
          riskScore += 20;
          await SheetRepository.markAsOrphaned(sheet.id);
        }

        // Risk Factor 7: Inactive sheet (not modified in 6+ months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const isInactive = sheet.lastModifiedAt ? sheet.lastModifiedAt < sixMonthsAgo : false;
        if (isInactive) {
          riskScore += 10;
          await SheetRepository.markAsInactive(sheet.id);
        }

        // Cap risk score at 100
        riskScore = Math.min(riskScore, 100);

        // Update risk score in database
        await SheetRepository.updateRiskScore(sheet.id, riskScore);
      }

      logger.info('Sheet risk analysis complete');
    } catch (error: any) {
      logger.error('Error analyzing sheet risks', error);
      throw new Error(`Failed to analyze sheet risks: ${error.message}`);
    }
  }

  /**
   * Full discovery and analysis workflow
   */
  static async discoverAndAnalyze(
    userId: number,
    serviceAccountJson: string
  ): Promise<{ discovered: number; stored: number }> {
    const result = await this.discoverAllSheets(userId, serviceAccountJson);
    await this.analyzeSheetRisks(userId);
    return result;
  }
}
