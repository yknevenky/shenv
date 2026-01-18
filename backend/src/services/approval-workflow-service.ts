import { logger } from '../utils/logger.js';
import { GovernanceActionRepository } from '../db/repositories/governance-action.js';
import { ActionApprovalRepository } from '../db/repositories/action-approval.js';
import { AuditLogRepository } from '../db/repositories/audit-log.js';

/**
 * Service for managing approval workflows
 */
export class ApprovalWorkflowService {
  /**
   * Create a governance action with approvers
   */
  static async createActionWithApprovers(
    userId: number,
    assetId: number,
    actionType: 'delete' | 'change_visibility' | 'remove_permission' | 'transfer_ownership',
    requestedBy: string,
    approvers: string[],
    reason: string,
    metadata?: Record<string, any>
  ): Promise<{ actionId: number; approvalIds: number[] }> {
    try {
      // Create governance action
      const action = await GovernanceActionRepository.create({
        userId,
        assetId,
        actionType,
        requestedBy,
        reason,
        status: 'pending',
        metadata: metadata || null,
      });

      logger.info('Created governance action', { actionId: action.id, actionType });

      // Create approval records for each approver
      const approvalIds: number[] = [];

      for (const approverEmail of approvers) {
        const approval = await ActionApprovalRepository.create({
          actionId: action.id,
          approverEmail,
          isApproved: null, // Pending
          respondedAt: null,
        });

        approvalIds.push(approval.id);
      }

      // Log audit trail
      await AuditLogRepository.create({
        userId,
        eventType: 'action.created',
        actorEmail: requestedBy,
        targetResource: `action:${action.id}`,
        metadata: {
          actionId: action.id,
          assetId,
          actionType,
          approvers,
          reason,
        },
      });

      logger.info('Created approval workflow', {
        actionId: action.id,
        approverCount: approvers.length,
      });

      return { actionId: action.id, approvalIds };
    } catch (error: any) {
      logger.error('Failed to create action with approvers', error);
      throw new Error(`Failed to create action: ${error.message}`);
    }
  }

  /**
   * Record an approval decision
   */
  static async recordApprovalDecision(
    approvalId: number,
    isApproved: boolean,
    approverEmail: string,
    comment?: string
  ): Promise<{ approved: boolean; actionStatus: 'pending' | 'approved' | 'rejected' }> {
    try {
      // Record the decision
      const approval = await ActionApprovalRepository.recordDecision(
        approvalId,
        isApproved,
        comment
      );

      logger.info('Recorded approval decision', {
        approvalId,
        actionId: approval.actionId,
        isApproved,
      });

      const action = await GovernanceActionRepository.findById(approval.actionId);
      if (!action) {
        throw new Error('Action not found');
      }

      // Log audit trail
      await AuditLogRepository.create({
        userId: action.userId,
        eventType: isApproved ? 'action.approved' : 'action.rejected',
        actorEmail: approverEmail,
        targetResource: `action:${action.id}`,
        metadata: {
          actionId: action.id,
          approvalId,
          decision: isApproved ? 'approved' : 'rejected',
          comment,
        },
      });

      // Check if action should be approved or rejected
      const hasRejection = await ActionApprovalRepository.hasAnyRejection(action.id);

      if (hasRejection) {
        // Any rejection means the action is rejected
        await GovernanceActionRepository.markAsRejected(action.id);

        await AuditLogRepository.create({
          userId: action.userId,
          eventType: 'action.status_changed',
          actorEmail: approverEmail,
          targetResource: `action:${action.id}`,
          metadata: {
            actionId: action.id,
            oldStatus: action.status,
            newStatus: 'rejected',
            reason: 'One or more approvers rejected',
          },
        });

        return { approved: false, actionStatus: 'rejected' };
      }

      // Check if all approvals are complete
      const hasAllApprovals = await ActionApprovalRepository.hasAllApprovals(action.id);

      if (hasAllApprovals) {
        // All approvals received, mark action as approved
        await GovernanceActionRepository.markAsApproved(action.id);

        await AuditLogRepository.create({
          userId: action.userId,
          eventType: 'action.status_changed',
          actorEmail: approverEmail,
          targetResource: `action:${action.id}`,
          metadata: {
            actionId: action.id,
            oldStatus: action.status,
            newStatus: 'approved',
            reason: 'All approvers approved',
          },
        });

        return { approved: true, actionStatus: 'approved' };
      }

      // Still pending more approvals
      return { approved: false, actionStatus: 'pending' };
    } catch (error: any) {
      logger.error('Failed to record approval decision', error);
      throw new Error(`Failed to record decision: ${error.message}`);
    }
  }

  /**
   * Get approval status for an action
   */
  static async getApprovalStatus(actionId: number): Promise<{
    actionStatus: string;
    approvals: {
      total: number;
      approved: number;
      rejected: number;
      pending: number;
    };
    approvers: Array<{
      email: string;
      status: 'approved' | 'rejected' | 'pending';
      comment?: string;
      respondedAt?: Date;
    }>;
  }> {
    try {
      const action = await GovernanceActionRepository.findById(actionId);
      if (!action) {
        throw new Error('Action not found');
      }

      const allApprovals = await ActionApprovalRepository.findAllByAction(actionId);
      const counts = await ActionApprovalRepository.countApprovalsByStatus(actionId);

      const approvers = allApprovals.map(a => {
        const approver: {
          email: string;
          status: 'approved' | 'rejected' | 'pending';
          comment?: string;
          respondedAt?: Date;
        } = {
          email: a.approverEmail,
          status: (a.isApproved === null
            ? 'pending'
            : a.isApproved
            ? 'approved'
            : 'rejected') as 'approved' | 'rejected' | 'pending',
        };

        // Add optional fields only if they exist
        if (a.comment !== null) {
          approver.comment = a.comment;
        }
        if (a.respondedAt !== null) {
          approver.respondedAt = a.respondedAt;
        }

        return approver;
      });

      return {
        actionStatus: action.status,
        approvals: {
          total: allApprovals.length,
          ...counts,
        },
        approvers,
      };
    } catch (error: any) {
      logger.error('Failed to get approval status', error);
      throw new Error(`Failed to get approval status: ${error.message}`);
    }
  }

  /**
   * Check if user is an approver for an action
   */
  static async isApprover(actionId: number, email: string): Promise<boolean> {
    const approval = await ActionApprovalRepository.findByActionAndApprover(actionId, email);
    return approval !== undefined;
  }

  /**
   * Get pending approvals for a specific approver
   */
  static async getPendingApprovalsForUser(approverEmail: string): Promise<
    Array<{
      approvalId: number;
      actionId: number;
      actionType: string;
      reason: string;
      requestedBy: string;
      createdAt: Date;
    }>
  > {
    try {
      const allApprovals = await ActionApprovalRepository.findByApprover(approverEmail);

      // Filter pending approvals
      const pendingApprovals = allApprovals.filter(a => a.isApproved === null);

      const result = [];

      for (const approval of pendingApprovals) {
        const action = await GovernanceActionRepository.findById(approval.actionId);
        if (action) {
          result.push({
            approvalId: approval.id,
            actionId: action.id,
            actionType: action.actionType,
            reason: action.reason,
            requestedBy: action.requestedBy,
            createdAt: action.createdAt,
          });
        }
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to get pending approvals for user', error);
      throw new Error(`Failed to get pending approvals: ${error.message}`);
    }
  }
}
