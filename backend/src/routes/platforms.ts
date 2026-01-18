/**
 * Platform Credentials Routes
 *
 * Endpoints for managing multi-platform credentials
 */

import { Hono } from 'hono';
import { CredentialService } from '../services/credential-service.js';
import { logger } from '../utils/logger.js';
import { Platform, CredentialType } from '../types/index.js';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
app.use('*', jwtMiddleware, attachUser);

/**
 * POST /api/platforms/credentials
 * Add or update platform credentials
 */
app.post('/credentials', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { platform, credentials, credentialType } = body;

    // Validate required fields
    if (!platform || !credentials || !credentialType) {
      return c.json({
        error: true,
        message: 'Missing required fields: platform, credentials, credentialType',
      }, 400);
    }

    // Validate platform
    const validPlatforms: Platform[] = ['google_workspace', 'microsoft_365', 'zoho', 'dropbox', 'box', 'other'];
    if (!validPlatforms.includes(platform)) {
      return c.json({
        error: true,
        message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      }, 400);
    }

    // Validate credential type
    const validTypes: CredentialType[] = ['service_account', 'oauth', 'api_key', 'other'];
    if (!validTypes.includes(credentialType)) {
      return c.json({
        error: true,
        message: `Invalid credentialType. Must be one of: ${validTypes.join(', ')}`,
      }, 400);
    }

    // Convert credentials object to JSON string if it's an object
    let credentialsJson: string;
    if (typeof credentials === 'string') {
      credentialsJson = credentials;
    } else {
      credentialsJson = JSON.stringify(credentials);
    }

    const result = await CredentialService.addCredentials(
      user.id,
      platform,
      credentialsJson,
      credentialType
    );

    if (!result.success) {
      return c.json({
        error: true,
        message: result.error || 'Failed to add credentials',
      }, 400);
    }

    logger.info('Platform credentials added via API', {
      userId: user.id,
      platform,
      credentialType,
    });

    return c.json({
      success: true,
      data: {
        credentialId: result.credentialId,
        platform,
        credentialType,
      },
    });
  } catch (error) {
    logger.error('Error adding platform credentials', { error });
    return c.json({
      error: true,
      message: 'Internal server error',
    }, 500);
  }
});

/**
 * GET /api/platforms/credentials
 * Get all platform credentials for the user
 */
app.get('/credentials', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const result = await CredentialService.getUserPlatforms(user.id);

    return c.json({
      success: true,
      data: {
        platforms: result.platforms,
        count: result.platforms.length,
      },
    });
  } catch (error) {
    logger.error('Error getting platform credentials', { error });
    return c.json({
      error: true,
      message: 'Internal server error',
    }, 500);
  }
});

/**
 * DELETE /api/platforms/credentials/:platform
 * Remove credentials for a specific platform
 */
app.delete('/credentials/:platform', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const platform = c.req.param('platform') as Platform;

    const result = await CredentialService.removeCredentials(user.id, platform);

    if (!result.success) {
      return c.json({
        error: true,
        message: result.error || 'Failed to remove credentials',
      }, 404);
    }

    logger.info('Platform credentials removed via API', {
      userId: user.id,
      platform,
    });

    return c.json({
      success: true,
      message: `Credentials for ${platform} removed successfully`,
    });
  } catch (error) {
    logger.error('Error removing platform credentials', { error });
    return c.json({
      error: true,
      message: 'Internal server error',
    }, 500);
  }
});

/**
 * GET /api/platforms/supported
 * Get list of supported platforms
 */
app.get('/supported', async (c) => {
  try {
    const platforms = CredentialService.getSupportedPlatforms();

    return c.json({
      success: true,
      data: {
        platforms,
        count: platforms.length,
      },
    });
  } catch (error) {
    logger.error('Error getting supported platforms', { error });
    return c.json({
      error: true,
      message: 'Internal server error',
    }, 500);
  }
});

/**
 * GET /api/platforms/:platform/status
 * Check if user has active credentials for a platform
 */
app.get('/:platform/status', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const platform = c.req.param('platform') as Platform;

    const hasCredentials = await CredentialService.hasCredentials(user.id, platform);

    return c.json({
      success: true,
      data: {
        platform,
        hasCredentials,
        isActive: hasCredentials,
      },
    });
  } catch (error) {
    logger.error('Error checking platform status', { error });
    return c.json({
      error: true,
      message: 'Internal server error',
    }, 500);
  }
});

export default app;
