import { getDriveClient } from './google-auth.js';
import { logger } from '../utils/logger.js';
import { GovernanceActionRepository } from '../db/repositories/governance-action.js';
import { AuditLogRepository } from '../db/repositories/audit-log.js';
import { SheetRepository } from '../db/repositories/sheet.js';

/**
 * Service for executing governance actions on Google Sheets
 */
export class GovernanceService {
  /**
   * Delete a Google Sheet
   */
  static async deleteSheet(
    serviceAccountJson: string,
    sheetId: string,
    userId: number,
    actionId: number,
    actorEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      const drive = getDriveClient(credentials);

      logger.info('Deleting sheet', { sheetId, userId, actionId });

      await drive.files.delete({
        fileId: sheetId,
        supportsAllDrives: true,
      });

      // Log audit trail
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.deleted',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'delete',
        },
      });

      logger.info('Sheet deleted successfully', { sheetId });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete sheet', { sheetId, error });

      // Log failure
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.delete.failed',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'delete',
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message || 'Failed to delete sheet',
      };
    }
  }

  /**
   * Change sheet visibility (make private or restricted)
   */
  static async changeSheetVisibility(
    serviceAccountJson: string,
    sheetId: string,
    visibility: 'private' | 'restricted',
    userId: number,
    actionId: number,
    actorEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      const drive = getDriveClient(credentials);

      logger.info('Changing sheet visibility', { sheetId, visibility, userId, actionId });

      // Get current permissions
      const permissionsResponse = await drive.permissions.list({
        fileId: sheetId,
        fields: 'permissions(id, type, role)',
        supportsAllDrives: true,
      });

      const permissions = permissionsResponse.data.permissions || [];

      // Remove 'anyone' and 'domain' permissions to make it private/restricted
      for (const perm of permissions) {
        if (perm.type === 'anyone' || (visibility === 'private' && perm.type === 'domain')) {
          await drive.permissions.delete({
            fileId: sheetId,
            permissionId: perm.id!,
            supportsAllDrives: true,
          });

          logger.info('Removed permission', { sheetId, permissionId: perm.id, type: perm.type });
        }
      }

      // Log audit trail
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.visibility_changed',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'change_visibility',
          newVisibility: visibility,
          removedPermissions: permissions
            .filter(p => p.type === 'anyone' || (visibility === 'private' && p.type === 'domain'))
            .map(p => ({ id: p.id, type: p.type })),
        },
      });

      logger.info('Sheet visibility changed successfully', { sheetId, visibility });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to change sheet visibility', { sheetId, error });

      // Log failure
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.visibility_change.failed',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'change_visibility',
          newVisibility: visibility,
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message || 'Failed to change sheet visibility',
      };
    }
  }

  /**
   * Remove a specific permission from a sheet
   */
  static async removePermission(
    serviceAccountJson: string,
    sheetId: string,
    permissionId: string,
    userId: number,
    actionId: number,
    actorEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      const drive = getDriveClient(credentials);

      logger.info('Removing permission', { sheetId, permissionId, userId, actionId });

      // Get permission details before removal for audit
      const permDetails = await drive.permissions.get({
        fileId: sheetId,
        permissionId,
        fields: 'id, emailAddress, role, type',
        supportsAllDrives: true,
      });

      await drive.permissions.delete({
        fileId: sheetId,
        permissionId,
        supportsAllDrives: true,
      });

      // Log audit trail
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.permission_removed',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'remove_permission',
          permissionId,
          removedPermission: {
            email: permDetails.data.emailAddress,
            role: permDetails.data.role,
            type: permDetails.data.type,
          },
        },
      });

      logger.info('Permission removed successfully', { sheetId, permissionId });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to remove permission', { sheetId, permissionId, error });

      // Log failure
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.permission_remove.failed',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'remove_permission',
          permissionId,
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message || 'Failed to remove permission',
      };
    }
  }

  /**
   * Transfer ownership of a sheet
   */
  static async transferOwnership(
    serviceAccountJson: string,
    sheetId: string,
    newOwnerEmail: string,
    userId: number,
    actionId: number,
    actorEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      const drive = getDriveClient(credentials);

      logger.info('Transferring ownership', { sheetId, newOwnerEmail, userId, actionId });

      // Add new owner with 'owner' role
      await drive.permissions.create({
        fileId: sheetId,
        supportsAllDrives: true,
        transferOwnership: true,
        requestBody: {
          type: 'user',
          role: 'owner',
          emailAddress: newOwnerEmail,
        },
      });

      // Log audit trail
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.ownership_transferred',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'transfer_ownership',
          newOwnerEmail,
        },
      });

      logger.info('Ownership transferred successfully', { sheetId, newOwnerEmail });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to transfer ownership', { sheetId, newOwnerEmail, error });

      // Log failure
      await AuditLogRepository.create({
        userId,
        eventType: 'sheet.ownership_transfer.failed',
        actorEmail,
        targetResource: `sheet:${sheetId}`,
        metadata: {
          actionId,
          sheetId,
          actionType: 'transfer_ownership',
          newOwnerEmail,
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message || 'Failed to transfer ownership',
      };
    }
  }

  /**
   * Execute a governance action based on its type
   */
  static async executeAction(
    actionId: number,
    serviceAccountJson: string,
    userId: number,
    actorEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const action = await GovernanceActionRepository.findById(actionId);

      if (!action) {
        return { success: false, error: 'Action not found' };
      }

      if (action.status !== 'approved') {
        return { success: false, error: 'Action is not approved' };
      }

      // Get sheet details
      const sheet = await SheetRepository.findById(action.sheetId);
      if (!sheet) {
        return { success: false, error: 'Sheet not found' };
      }

      const metadata = action.metadata as any;
      let result: { success: boolean; error?: string };

      switch (action.actionType) {
        case 'delete':
          result = await this.deleteSheet(serviceAccountJson, sheet.sheetId, userId, actionId, actorEmail);
          break;

        case 'change_visibility':
          result = await this.changeSheetVisibility(
            serviceAccountJson,
            sheet.sheetId,
            metadata?.visibility || 'private',
            userId,
            actionId,
            actorEmail
          );
          break;

        case 'remove_permission':
          result = await this.removePermission(
            serviceAccountJson,
            sheet.sheetId,
            metadata?.permissionId,
            userId,
            actionId,
            actorEmail
          );
          break;

        case 'transfer_ownership':
          result = await this.transferOwnership(
            serviceAccountJson,
            sheet.sheetId,
            metadata?.newOwnerEmail,
            userId,
            actionId,
            actorEmail
          );
          break;

        default:
          return { success: false, error: `Unknown action type: ${action.actionType}` };
      }

      // Update action status
      if (result.success) {
        await GovernanceActionRepository.markAsExecuted(actionId);
      } else {
        await GovernanceActionRepository.markAsFailed(actionId, result.error || 'Unknown error');
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to execute action', { actionId, error });
      await GovernanceActionRepository.markAsFailed(actionId, error.message);

      return {
        success: false,
        error: error.message || 'Failed to execute action',
      };
    }
  }
}
