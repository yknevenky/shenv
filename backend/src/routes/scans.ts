/**
 * Scan queue routes
 */

import { Hono } from 'hono';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { queueService } from '../services/queue-service.js';
import { apiQuotaRepository } from '../db/repositories/api-quota.js';
import { logger } from '../utils/logger.js';

const scans = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
scans.use('*', async (c, next) => {
  return jwtMiddleware(c, async () => {
    await attachUser(c, next);
  });
});

/**
 * POST /api/scans/queue
 * Queue a new scan job
 */
scans.post('/queue', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const { scope, platforms } = body;

    if (!scope || !platforms || !Array.isArray(platforms)) {
      return c.json({ error: 'Missing required fields: scope, platforms' }, 400);
    }

    if (!['quick', 'full', 'organization'].includes(scope)) {
      return c.json({ error: 'Invalid scope. Must be: quick, full, or organization' }, 400);
    }

    const queueStatus = await queueService.queueScan({
      userId: user.id,
      scope,
      platforms,
    });

    return c.json({
      message: 'Scan queued successfully',
      job: queueStatus,
    });
  } catch (error: any) {
    logger.error('Error queueing scan:', error);
    return c.json({ error: error.message || 'Failed to queue scan' }, 500);
  }
});

/**
 * GET /api/scans/queue/:jobId/status
 * Get queue status for a specific job
 */
scans.get('/queue/:jobId/status', async (c) => {
  try {
    const jobId = parseInt(c.req.param('jobId'));

    if (isNaN(jobId)) {
      return c.json({ error: 'Invalid job ID' }, 400);
    }

    const status = await queueService.getQueueStatus(jobId);

    return c.json(status);
  } catch (error: any) {
    logger.error('Error getting queue status:', error);
    return c.json({ error: error.message || 'Failed to get queue status' }, 500);
  }
});

/**
 * POST /api/scans/queue/:jobId/skip
 * Skip the queue with one-time payment (placeholder for payment integration)
 */
scans.post('/queue/:jobId/skip', async (c) => {
  try {
    const user = c.get('user');
    const jobId = parseInt(c.req.param('jobId'));

    if (isNaN(jobId)) {
      return c.json({ error: 'Invalid job ID' }, 400);
    }

    // TODO: Integrate with payment provider (Stripe)
    // For now, just skip the queue
    await queueService.skipQueue(jobId);

    return c.json({
      message: 'Queue skipped successfully',
      jobId,
    });
  } catch (error: any) {
    logger.error('Error skipping queue:', error);
    return c.json({ error: error.message || 'Failed to skip queue' }, 500);
  }
});

/**
 * GET /api/scans/history
 * Get scan history for current user
 */
scans.get('/history', async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '10');

    const history = await queueService.getScanHistory(user.id, limit);

    return c.json({
      history,
      total: history.length,
    });
  } catch (error: any) {
    logger.error('Error getting scan history:', error);
    return c.json({ error: error.message || 'Failed to get scan history' }, 500);
  }
});

/**
 * GET /api/scans/improvement
 * Get improvement metrics (before/after comparison)
 */
scans.get('/improvement', async (c) => {
  try {
    const user = c.get('user');

    const metrics = await queueService.getImprovementMetrics(user.id);

    if (!metrics) {
      return c.json({
        message: 'No scan history available yet',
        metrics: null,
      });
    }

    return c.json(metrics);
  } catch (error: any) {
    logger.error('Error getting improvement metrics:', error);
    return c.json({ error: error.message || 'Failed to get improvement metrics' }, 500);
  }
});

/**
 * GET /api/scans/quota
 * Get current API quota usage
 */
scans.get('/quota', async (c) => {
  try {
    const user = c.get('user');

    const stats = await apiQuotaRepository.getQuotaStats(user.tier);

    return c.json(stats);
  } catch (error: any) {
    logger.error('Error getting quota stats:', error);
    return c.json({ error: error.message || 'Failed to get quota stats' }, 500);
  }
});

export default scans;
