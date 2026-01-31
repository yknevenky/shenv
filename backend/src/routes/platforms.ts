/**
 * Platform Credentials Routes
 *
 * Endpoints for managing multi-platform credentials
 */

import { Hono } from 'hono';
import { CredentialService } from '../services/credential-service.js';
import { DriveOAuthService } from '../services/drive-oauth-service.js';
import { logger } from '../utils/logger.js';
import { Platform, CredentialType } from '../types/index.js';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { validatePlatform, getAllPlatformsWithStatus } from '../middleware/platform-validator.js';
import { encrypt } from '../utils/encryption.js';

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

    // Validate platform using centralized validator
    const platformValidation = validatePlatform(platform);
    if (!platformValidation.isValid || !platformValidation.isSupported) {
      return c.json({
        error: true,
        message: platformValidation.message || platformValidation.error,
        supportedPlatforms: platformValidation.supportedPlatforms,
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
 * Get list of supported platforms with their status
 */
app.get('/supported', async (c) => {
  try {
    const platformsWithStatus = getAllPlatformsWithStatus();

    return c.json({
      success: true,
      data: {
        platforms: platformsWithStatus,
        count: platformsWithStatus.length,
        supportedCount: platformsWithStatus.filter(p => p.isSupported).length,
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

// ==================== GOOGLE DRIVE OAUTH ENDPOINTS ====================

/**
 * GET /api/platforms/google/oauth/url
 * Get Google Drive OAuth authorization URL
 */
app.get('/google/oauth/url', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const authUrl = DriveOAuthService.getAuthorizationUrl(user.id);

    logger.info('Generated Google Drive OAuth URL', { userId: user.id });

    return c.json({
      success: true,
      data: {
        authUrl,
        message: 'Please visit this URL to authorize Drive access',
      },
    });
  } catch (error: any) {
    logger.error('Failed to generate Drive OAuth URL', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to generate authorization URL',
    }, 500);
  }
});

/**
 * POST /api/platforms/google/oauth/callback
 * Handle Google Drive OAuth callback
 */
app.post('/google/oauth/callback', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { code } = body;

    if (!code) {
      return c.json({
        error: true,
        message: 'Missing authorization code',
      }, 400);
    }

    // Exchange code for tokens
    const tokens = await DriveOAuthService.exchangeCodeForTokens(code);

    // Verify token and get user info
    const userInfo = await DriveOAuthService.verifyToken(tokens.accessToken);

    // Store encrypted OAuth tokens in platform_credentials
    const oauthCredentials = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      scope: tokens.scope,
      email: userInfo.email,
      name: userInfo.name,
    };

    const encryptedCredentials = encrypt(JSON.stringify(oauthCredentials));

    const result = await CredentialService.addCredentials(
      user.id,
      'google_workspace',
      encryptedCredentials,
      'oauth'
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to store OAuth credentials');
    }

    logger.info('Google Drive OAuth connected successfully', {
      userId: user.id,
      email: userInfo.email,
    });

    return c.json({
      success: true,
      data: {
        connected: true,
        email: userInfo.email,
        name: userInfo.name,
        platform: 'google_workspace',
      },
      message: 'Google Drive connected successfully',
    });
  } catch (error: any) {
    logger.error('Google Drive OAuth callback failed', { error });
    return c.json({
      error: true,
      message: error.message || 'OAuth callback failed',
    }, 500);
  }
});

/**
 * DELETE /api/platforms/google/oauth/disconnect
 * Disconnect Google Drive OAuth
 */
app.delete('/google/oauth/disconnect', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    // Get credentials to revoke token
    const credential = await CredentialService.getCredentials(user.id, 'google_workspace');

    if (credential && credential.credentialType === 'oauth') {
      try {
        const decrypted = JSON.parse(credential.credentials);
        await DriveOAuthService.revokeToken(decrypted.accessToken);
      } catch (revokeError) {
        logger.warn('Failed to revoke Drive OAuth token', { error: revokeError });
        // Continue with deletion even if revoke fails
      }
    }

    // Remove credentials from database
    const result = await CredentialService.removeCredentials(user.id, 'google_workspace');

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove credentials');
    }

    logger.info('Google Drive OAuth disconnected', { userId: user.id });

    return c.json({
      success: true,
      message: 'Google Drive disconnected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to disconnect Drive OAuth', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to disconnect',
    }, 500);
  }
});

/**
 * GET /api/platforms/google/oauth/status
 * Get Google Drive OAuth connection status
 */
app.get('/google/oauth/status', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const credential = await CredentialService.getCredentials(user.id, 'google_workspace');

    const isConnected = credential !== null && credential.credentialType === 'oauth';

    let email = null;
    if (isConnected && credential) {
      try {
        const decrypted = JSON.parse(credential.credentials);
        email = decrypted.email;
      } catch (err) {
        logger.warn('Failed to parse OAuth credentials', { error: err });
      }
    }

    return c.json({
      success: true,
      data: {
        isConnected,
        platform: 'google_workspace',
        authType: isConnected ? 'oauth' : null,
        email,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get Drive OAuth status', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to get status',
    }, 500);
  }
});

export default app;
