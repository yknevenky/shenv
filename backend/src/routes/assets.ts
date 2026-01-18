/**
 * Assets Routes
 *
 * Platform-agnostic endpoints for managing cloud assets
 * (replaces sheets.ts)
 */

import { Hono } from 'hono';
import { AssetDiscoveryService } from '../services/asset-discovery-service.js';
import { AssetRepository } from '../db/repositories/asset.js';
import { logger } from '../utils/logger.js';
import { Platform } from '../types/index.js';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
app.use('*', jwtMiddleware, attachUser);

/**
 * POST /api/assets/discover
 * Discover assets from a specific platform
 * Query params: platform (required)
 */
app.post('/discover', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const platform = c.req.query('platform') as Platform;

    if (!platform) {
      return c.json({
        error: true,
        message: 'Missing required query parameter: platform',
      }, 400);
    }

    logger.info('Starting asset discovery via API', {
      userId: user.id,
      platform,
    });

    const result = await AssetDiscoveryService.discoverAssets(user.id, platform);

    return c.json({
      success: true,
      data: {
        platform,
        discovered: result.discovered,
        stored: result.stored,
      },
      message: `Discovered ${result.discovered} assets, stored ${result.stored}`,
    });
  } catch (error: any) {
    logger.error('Asset discovery failed via API', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to discover assets',
    }, 500);
  }
});

/**
 * POST /api/assets/discover/all
 * Discover assets from all connected platforms
 */
app.post('/discover/all', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    logger.info('Starting multi-platform asset discovery via API', {
      userId: user.id,
    });

    const result = await AssetDiscoveryService.discoverAllPlatforms(user.id);

    return c.json({
      success: true,
      data: {
        platforms: result.platforms,
        totalDiscovered: result.totalDiscovered,
        totalStored: result.totalStored,
      },
      message: `Discovered ${result.totalDiscovered} assets across ${Object.keys(result.platforms).length} platforms`,
    });
  } catch (error: any) {
    logger.error('Multi-platform discovery failed via API', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to discover assets',
    }, 500);
  }
});

/**
 * POST /api/assets/workspace/discover
 * Discover workspace users from a specific platform
 * Query params: platform (required)
 */
app.post('/workspace/discover', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const platform = c.req.query('platform') as Platform;

    if (!platform) {
      return c.json({
        error: true,
        message: 'Missing required query parameter: platform',
      }, 400);
    }

    logger.info('Starting workspace user discovery via API', {
      userId: user.id,
      platform,
    });

    const result = await AssetDiscoveryService.discoverWorkspaceUsers(user.id, platform);

    return c.json({
      success: true,
      data: {
        platform,
        discovered: result.discovered,
        stored: result.stored,
      },
      message: `Discovered ${result.discovered} workspace users`,
    });
  } catch (error: any) {
    logger.error('Workspace user discovery failed via API', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to discover workspace users',
    }, 500);
  }
});

/**
 * GET /api/assets
 * Get all assets for the user with optional filters
 * Query params: platform, assetType, search, isOrphaned, isInactive, limit, offset
 */
app.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const platformQuery = c.req.query('platform');
    const assetTypeQuery = c.req.query('assetType');
    const searchQuery = c.req.query('search');
    const isOrphanedQuery = c.req.query('isOrphaned');
    const isInactiveQuery = c.req.query('isInactive');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    // Build filter object with only defined properties
    const filters: {
      platform?: string;
      assetType?: string;
      search?: string;
      isOrphaned?: boolean;
      isInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {
      limit,
      offset,
    };

    if (platformQuery) {
      filters.platform = platformQuery;
    }
    if (assetTypeQuery) {
      filters.assetType = assetTypeQuery;
    }
    if (searchQuery) {
      filters.search = searchQuery;
    }
    if (isOrphanedQuery !== undefined) {
      filters.isOrphaned = isOrphanedQuery === 'true';
    }
    if (isInactiveQuery !== undefined) {
      filters.isInactive = isInactiveQuery === 'true';
    }

    const result = await AssetRepository.findAllByUser(user.id, filters);

    return c.json({
      success: true,
      data: {
        assets: result.assets,
        total: result.total,
        limit,
        offset,
        hasMore: result.total > offset + limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching assets', { error });
    return c.json({
      error: true,
      message: 'Failed to fetch assets',
    }, 500);
  }
});

/**
 * GET /api/assets/:id
 * Get asset details by ID
 */
app.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const assetId = parseInt(c.req.param('id'));

    const asset = await AssetDiscoveryService.getAssetDetails(user.id, assetId);

    if (!asset) {
      return c.json({
        error: true,
        message: 'Asset not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        asset,
      },
    });
  } catch (error) {
    logger.error('Error fetching asset details', { error });
    return c.json({
      error: true,
      message: 'Failed to fetch asset details',
    }, 500);
  }
});

/**
 * POST /api/assets/:id/refresh
 * Refresh a single asset (re-fetch from platform)
 */
app.post('/:id/refresh', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const assetId = parseInt(c.req.param('id'));

    logger.info('Refreshing asset via API', { userId: user.id, assetId });

    const result = await AssetDiscoveryService.refreshAsset(user.id, assetId);

    if (!result.success) {
      return c.json({
        error: true,
        message: result.error || 'Failed to refresh asset',
      }, 400);
    }

    return c.json({
      success: true,
      message: 'Asset refreshed successfully',
    });
  } catch (error) {
    logger.error('Error refreshing asset', { error });
    return c.json({
      error: true,
      message: 'Failed to refresh asset',
    }, 500);
  }
});

/**
 * GET /api/assets/stats/summary
 * Get asset statistics summary
 */
app.get('/stats/summary', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const totalAssets = await AssetRepository.countByUser(user.id);
    const orphanedAssets = await AssetRepository.findOrphanedAssets(user.id);
    const inactiveAssets = await AssetRepository.findInactiveAssets(user.id);
    const highRiskAssets = await AssetRepository.findHighRiskAssets(user.id, 70);

    return c.json({
      success: true,
      data: {
        totalAssets,
        orphanedCount: orphanedAssets.length,
        inactiveCount: inactiveAssets.length,
        highRiskCount: highRiskAssets.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching asset stats', { error });
    return c.json({
      error: true,
      message: 'Failed to fetch asset statistics',
    }, 500);
  }
});

export default app;
