/**
 * Approval Workflow API Routes
 * Handles HTTP endpoints for approval operations
 */

import { Hono } from 'hono';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { UserRepository } from '../db/repositories/user.js';
import { ActionApprovalRepository } from '../db/repositories/action-approval.js';
import { ApprovalWorkflowService } from '../services/approval-workflow-service.js';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/index.js';

export const approvalsRouter = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
approvalsRouter.use('*', jwtMiddleware, attachUser);

/**
 * GET /approvals/pending
 * Get pending approvals for the current user
 */
approvalsRouter.get('/pending', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user) {
      return c.json({ error: true, message: 'User not found' }, 404);
    }

    logger.info('GET /approvals/pending', { userId, email: user.email });

    const pendingApprovals = await ApprovalWorkflowService.getPendingApprovalsForUser(
      user.email
    );

    return c.json({
      approvals: pendingApprovals,
      total: pendingApprovals.length,
    });
  } catch (error: any) {
    logger.error('Error getting pending approvals', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get pending approvals',
      code: 'GET_PENDING_APPROVALS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * POST /approvals/:id/approve
 * Approve a governance action
 */
approvalsRouter.post('/:id/approve', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);
    const approvalId = parseInt(c.req.param('id'));

    if (!user) {
      return c.json({ error: true, message: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const { comment } = body;

    logger.info('POST /approvals/:id/approve', { userId, approvalId });

    // Verify the approval belongs to this user
    const approval = await ActionApprovalRepository.findById(approvalId);

    if (!approval) {
      return c.json({ error: true, message: 'Approval not found' }, 404);
    }

    if (approval.approverEmail !== user.email) {
      return c.json({
        error: true,
        message: 'You are not authorized to approve this action',
      }, 403);
    }

    if (approval.isApproved !== null) {
      return c.json({
        error: true,
        message: 'This approval has already been responded to',
      }, 400);
    }

    const result = await ApprovalWorkflowService.recordApprovalDecision(
      approvalId,
      true,
      user.email,
      comment
    );

    return c.json({
      success: true,
      approved: result.approved,
      actionStatus: result.actionStatus,
      message:
        result.actionStatus === 'approved'
          ? 'Action fully approved and ready for execution'
          : 'Approval recorded, waiting for other approvers',
    });
  } catch (error: any) {
    logger.error('Error approving action', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to approve action',
      code: 'APPROVE_ACTION_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * POST /approvals/:id/reject
 * Reject a governance action
 */
approvalsRouter.post('/:id/reject', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);
    const approvalId = parseInt(c.req.param('id'));

    if (!user) {
      return c.json({ error: true, message: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const { comment } = body;

    logger.info('POST /approvals/:id/reject', { userId, approvalId });

    // Verify the approval belongs to this user
    const approval = await ActionApprovalRepository.findById(approvalId);

    if (!approval) {
      return c.json({ error: true, message: 'Approval not found' }, 404);
    }

    if (approval.approverEmail !== user.email) {
      return c.json({
        error: true,
        message: 'You are not authorized to reject this action',
      }, 403);
    }

    if (approval.isApproved !== null) {
      return c.json({
        error: true,
        message: 'This approval has already been responded to',
      }, 400);
    }

    const result = await ApprovalWorkflowService.recordApprovalDecision(
      approvalId,
      false,
      user.email,
      comment
    );

    return c.json({
      success: true,
      approved: result.approved,
      actionStatus: result.actionStatus,
      message: 'Action rejected',
    });
  } catch (error: any) {
    logger.error('Error rejecting action', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to reject action',
      code: 'REJECT_ACTION_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /approvals/history
 * Get approval history for the current user
 */
approvalsRouter.get('/history', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user) {
      return c.json({ error: true, message: 'User not found' }, 404);
    }

    logger.info('GET /approvals/history', { userId, email: user.email });

    const allApprovals = await ActionApprovalRepository.findByApprover(user.email);

    const approvalHistory = allApprovals.map(a => ({
      id: a.id,
      actionId: a.actionId,
      approverEmail: a.approverEmail,
      isApproved: a.isApproved,
      comment: a.comment,
      respondedAt: a.respondedAt,
    }));

    return c.json({
      approvals: approvalHistory,
      total: approvalHistory.length,
    });
  } catch (error: any) {
    logger.error('Error getting approval history', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get approval history',
      code: 'GET_APPROVAL_HISTORY_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * POST /webhooks/approval
 * Webhook endpoint for external approval systems
 */
approvalsRouter.post('/webhooks/approval', async (c) => {
  try {
    const body = await c.req.json();
    const { approvalId, isApproved, approverEmail, comment } = body;

    if (!approvalId || isApproved === undefined || !approverEmail) {
      return c.json({
        error: true,
        message: 'Missing required fields: approvalId, isApproved, approverEmail',
      }, 400);
    }

    logger.info('Webhook: Approval decision received', { approvalId, isApproved });

    const result = await ApprovalWorkflowService.recordApprovalDecision(
      approvalId,
      isApproved,
      approverEmail,
      comment
    );

    return c.json({
      success: true,
      actionStatus: result.actionStatus,
      message: 'Approval decision recorded',
    });
  } catch (error: any) {
    logger.error('Error processing approval webhook', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to process approval webhook',
      code: 'WEBHOOK_APPROVAL_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});
