/**
 * Governance Actions API Routes
 * Handles HTTP endpoints for governance action operations
 */

import { Hono } from 'hono';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { UserRepository } from '../db/repositories/user.js';
import { GovernanceActionRepository } from '../db/repositories/governance-action.js';
import { ActionApprovalRepository } from '../db/repositories/action-approval.js';
import { AuditLogRepository } from '../db/repositories/audit-log.js';
import { AssetRepository } from '../db/repositories/asset.js';
import { GovernanceService } from '../services/governance-service.js';
import { ApprovalWorkflowService } from '../services/approval-workflow-service.js';
import { decrypt } from './service-account.js';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/index.js';

export const governanceRouter = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
governanceRouter.use('*', jwtMiddleware, attachUser);

/**
 * POST /governance/actions
 * Create a new governance action request
 */
governanceRouter.post('/actions', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user) {
      return c.json({ error: true, message: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const { assetId, actionType, reason, approvers, metadata } = body;

    // Validate required fields
    if (!assetId || !actionType || !reason) {
      return c.json({
        error: true,
        message: 'Missing required fields: assetId, actionType, reason',
      }, 400);
    }

    // Validate action type
    const validTypes = ['delete', 'change_visibility', 'remove_permission', 'transfer_ownership'];
    if (!validTypes.includes(actionType)) {
      return c.json({
        error: true,
        message: `Invalid actionType. Must be one of: ${validTypes.join(', ')}`,
      }, 400);
    }

    // Get asset from database
    const asset = await AssetRepository.findById(assetId);
    if (!asset || asset.userId !== userId) {
      return c.json({ error: true, message: 'Asset not found' }, 404);
    }

    const approversList = approvers && Array.isArray(approvers) ? approvers : [];

    // Create action with approvers
    const result = await ApprovalWorkflowService.createActionWithApprovers(
      userId,
      asset.id,
      actionType,
      user.email,
      approversList,
      reason,
      metadata
    );

    logger.info('Created governance action', {
      userId,
      actionId: result.actionId,
      actionType,
    });

    return c.json({
      success: true,
      actionId: result.actionId,
      approvalIds: result.approvalIds,
      message: approversList.length > 0
        ? 'Action created and sent for approval'
        : 'Action created',
    }, 201);
  } catch (error: any) {
    logger.error('Error creating governance action', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to create governance action',
      code: 'CREATE_ACTION_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /governance/actions
 * List all governance actions for the user
 */
governanceRouter.get('/actions', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const status = c.req.query('status') as any;

    logger.info('GET /governance/actions', { userId, status });

    let actions;
    if (status) {
      actions = await GovernanceActionRepository.findByStatus(userId, status);
    } else {
      actions = await GovernanceActionRepository.findAllByUser(userId);
    }

    // Enrich with asset details
    const enrichedActions = await Promise.all(
      actions.map(async (action) => {
        const asset = await AssetRepository.findById(action.assetId);
        const approvals = await ActionApprovalRepository.findAllByAction(action.id);

        return {
          id: action.id,
          assetId: asset?.id,
          externalId: asset?.externalId,
          assetName: asset?.name,
          actionType: action.actionType,
          status: action.status,
          reason: action.reason,
          requestedBy: action.requestedBy,
          createdAt: action.createdAt,
          executedAt: action.executedAt,
          errorMessage: action.errorMessage,
          metadata: action.metadata,
          approvals: approvals.map(a => ({
            id: a.id,
            approverEmail: a.approverEmail,
            isApproved: a.isApproved,
            comment: a.comment,
            respondedAt: a.respondedAt,
          })),
        };
      })
    );

    return c.json({
      actions: enrichedActions,
      total: enrichedActions.length,
    });
  } catch (error: any) {
    logger.error('Error listing governance actions', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to list governance actions',
      code: 'LIST_ACTIONS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /governance/actions/:id
 * Get a specific governance action with details
 */
governanceRouter.get('/actions/:id', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const actionId = parseInt(c.req.param('id'));

    const action = await GovernanceActionRepository.findById(actionId);

    if (!action) {
      return c.json({ error: true, message: 'Action not found' }, 404);
    }

    if (action.userId !== userId) {
      return c.json({ error: true, message: 'Unauthorized' }, 403);
    }

    const asset = await AssetRepository.findById(action.assetId);
    const approvalStatus = await ApprovalWorkflowService.getApprovalStatus(actionId);

    return c.json({
      action: {
        id: action.id,
        assetId: asset?.id,
        externalId: asset?.externalId,
        assetName: asset?.name,
        actionType: action.actionType,
        status: action.status,
        reason: action.reason,
        requestedBy: action.requestedBy,
        createdAt: action.createdAt,
        executedAt: action.executedAt,
        errorMessage: action.errorMessage,
        metadata: action.metadata,
      },
      approvalStatus,
    });
  } catch (error: any) {
    logger.error('Error getting governance action', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get governance action',
      code: 'GET_ACTION_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * POST /governance/actions/:id/execute
 * Execute an approved governance action
 */
governanceRouter.post('/actions/:id/execute', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);
    const actionId = parseInt(c.req.param('id'));

    if (!user || !user.hasServiceAccount || !user.serviceAccount) {
      return c.json({
        error: true,
        message: 'No service account configured',
      }, 400);
    }

    const action = await GovernanceActionRepository.findById(actionId);

    if (!action) {
      return c.json({ error: true, message: 'Action not found' }, 404);
    }

    if (action.userId !== userId) {
      return c.json({ error: true, message: 'Unauthorized' }, 403);
    }

    if (action.status !== 'approved') {
      return c.json({
        error: true,
        message: `Action is not approved. Current status: ${action.status}`,
      }, 400);
    }

    logger.info('Executing governance action', { userId, actionId });

    const serviceAccountJson = decrypt(user.serviceAccount);

    const result = await GovernanceService.executeAction(
      actionId,
      serviceAccountJson,
      userId,
      user.email
    );

    if (result.success) {
      return c.json({
        success: true,
        message: 'Action executed successfully',
      });
    } else {
      return c.json({
        success: false,
        error: result.error,
        message: 'Action execution failed',
      }, 500);
    }
  } catch (error: any) {
    logger.error('Error executing governance action', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to execute governance action',
      code: 'EXECUTE_ACTION_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /governance/audit-logs
 * Get audit logs for the user
 */
governanceRouter.get('/audit-logs', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    logger.info('GET /governance/audit-logs', { userId, limit, offset });

    const { logs, total } = await AuditLogRepository.findAllByUser(userId, {
      limit,
      offset,
    });

    return c.json({
      logs: logs.map(log => ({
        id: log.id,
        eventType: log.eventType,
        actorEmail: log.actorEmail,
        targetResource: log.targetResource,
        timestamp: log.timestamp,
        metadata: log.metadata,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('Error getting audit logs', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get audit logs',
      code: 'GET_AUDIT_LOGS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});
