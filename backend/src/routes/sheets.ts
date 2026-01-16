/**
 * Sheets API Routes
 * Handles HTTP endpoints for sheet operations
 */

import { Hono } from 'hono';
import { SheetsDiscoveryService } from '../services/sheets-discovery-service.js';
import { WorkspaceService } from '../services/workspace-service.js';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { UserRepository } from '../db/repositories/user.js';
import { SheetRepository } from '../db/repositories/sheet.js';
import { PermissionRepository } from '../db/repositories/permission.js';
import { WorkspaceUserRepository } from '../db/repositories/workspace-user.js';
import { decrypt } from './service-account.js';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/index.js';

export const sheetsRouter = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
sheetsRouter.use('*', jwtMiddleware, attachUser);

/**
 * GET /api/sheets
 * List all sheets with pagination and search (from database)
 */
sheetsRouter.get('/', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user || !user.hasServiceAccount || !user.serviceAccount) {
      return c.json({
        error: true,
        message: 'No service account configured. Please upload a service account JSON.',
        code: 'NO_SERVICE_ACCOUNT',
      }, 400);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const isOrphaned = c.req.query('isOrphaned') === 'true' ? true : undefined;
    const isInactive = c.req.query('isInactive') === 'true' ? true : undefined;

    logger.info('GET /api/sheets', { userId, page, limit, search });

    const queryOptions: {
      search?: string;
      isOrphaned?: boolean;
      isInactive?: boolean;
      limit: number;
      offset: number;
    } = {
      limit,
      offset: (page - 1) * limit,
    };

    if (search) queryOptions.search = search;
    if (isOrphaned !== undefined) queryOptions.isOrphaned = isOrphaned;
    if (isInactive !== undefined) queryOptions.isInactive = isInactive;

    const { sheets, total } = await SheetRepository.findAllByUser(userId, queryOptions);

    return c.json({
      sheets: sheets.map(s => ({
        id: s.sheetId,
        name: s.name,
        url: s.url,
        owner: s.ownerEmail,
        createdTime: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
        modifiedTime: s.lastModifiedAt ? s.lastModifiedAt.toISOString() : new Date().toISOString(),
        permissionCount: s.permissionCount,
        riskScore: s.riskScore,
        isOrphaned: s.isOrphaned,
        isInactive: s.isInactive,
      })),
      total,
      page,
      limit,
      hasMore: (page * limit) < total,
    });
  } catch (error) {
    logger.error('Error in GET /api/sheets', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to fetch sheets',
      code: 'FETCH_SHEETS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * POST /api/sheets/discover
 * Trigger sheet discovery and analysis
 */
sheetsRouter.post('/discover', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user || !user.hasServiceAccount || !user.serviceAccount) {
      return c.json({
        error: true,
        message: 'No service account configured. Please upload a service account JSON.',
        code: 'NO_SERVICE_ACCOUNT',
      }, 400);
    }

    logger.info('POST /api/sheets/discover', { userId });

    const serviceAccountJson = decrypt(user.serviceAccount);
    const result = await SheetsDiscoveryService.discoverAndAnalyze(userId, serviceAccountJson);

    return c.json({
      success: true,
      discovered: result.discovered,
      stored: result.stored,
      message: `Discovered and stored ${result.stored} sheets`,
    });
  } catch (error) {
    logger.error('Error in POST /api/sheets/discover', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to discover sheets',
      code: 'DISCOVER_SHEETS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * POST /api/sheets/workspace/discover
 * Discover workspace users via Google Admin API
 */
sheetsRouter.post('/workspace/discover', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user || !user.hasServiceAccount || !user.serviceAccount) {
      return c.json({
        error: true,
        message: 'No service account configured. Please upload a service account JSON.',
        code: 'NO_SERVICE_ACCOUNT',
      }, 400);
    }

    logger.info('POST /api/sheets/workspace/discover', { userId });

    const { adminEmail } = await c.req.json();
    const serviceAccountJson = decrypt(user.serviceAccount);

    const workspaceUsers = await WorkspaceService.discoverWorkspaceUsers(
      serviceAccountJson,
      adminEmail
    );

    // Store workspace users in database
    const users = await WorkspaceUserRepository.bulkUpsert(
      userId,
      workspaceUsers.map(u => ({
        email: u.email,
        fullName: u.fullName,
        isAdmin: u.isAdmin,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        lastSyncedAt: new Date(),
      }))
    );

    return c.json({
      success: true,
      count: users.length,
      message: `Discovered ${users.length} workspace users`,
    });
  } catch (error) {
    logger.error('Error in POST /api/sheets/workspace/discover', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to discover workspace users',
      code: 'DISCOVER_WORKSPACE_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /api/sheets/:id
 * Get detailed information about a specific sheet (from database)
 */
sheetsRouter.get('/:id', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const sheetId = c.req.param('id');

    logger.info('GET /api/sheets/:id', { userId, sheetId });

    const sheet = await SheetRepository.findBySheetId(userId, sheetId);

    if (!sheet) {
      return c.json({
        error: true,
        message: 'Sheet not found',
        code: 'SHEET_NOT_FOUND',
      }, 404);
    }

    const permissions = await PermissionRepository.findAllBySheet(sheet.id);

    return c.json({
      sheet: {
        id: sheet.sheetId,
        name: sheet.name,
        url: sheet.url,
        owner: sheet.ownerEmail,
        createdTime: sheet.createdAt ? sheet.createdAt.toISOString() : new Date().toISOString(),
        modifiedTime: sheet.lastModifiedAt ? sheet.lastModifiedAt.toISOString() : new Date().toISOString(),
        permissionCount: sheet.permissionCount,
        riskScore: sheet.riskScore,
        isOrphaned: sheet.isOrphaned,
        isInactive: sheet.isInactive,
      },
      permissions: permissions.map(p => ({
        id: p.permissionId,
        sheetId: sheet.sheetId,
        email: p.email,
        role: p.role,
        type: p.type,
        displayName: p.displayName,
        grantedTime: p.snapshotDate.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Error in GET /api/sheets/:id', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to fetch sheet details',
      code: 'FETCH_SHEET_DETAILS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});
