/**
 * Token Refresh Middleware
 *
 * Automatically refreshes expired OAuth tokens before API calls
 * Works with any platform that uses OAuth credentials
 */

import { PlatformCredentialRepository } from '../db/repositories/platform-credential.js';
import { DriveOAuthService } from '../services/drive-oauth-service.js';
import { logger } from '../utils/logger.js';
import { Platform } from '../types/index.js';

/**
 * Check if OAuth token is expired or expiring soon
 */
function isTokenExpiringSoon(expiresAt: string | Date, bufferMinutes: number = 5): boolean {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const bufferMs = bufferMinutes * 60 * 1000;

  // Token is expiring if it expires within buffer period
  return expiryDate.getTime() - now.getTime() < bufferMs;
}

/**
 * Refresh OAuth token if needed for Google Workspace platform
 */
async function refreshGoogleToken(userId: number, credentials: any): Promise<boolean> {
  try {
    logger.info('Checking if Google OAuth token needs refresh', { userId });

    // Check if token is expiring soon (within 5 minutes)
    if (!isTokenExpiringSoon(credentials.expiresAt)) {
      logger.debug('Token is still valid, no refresh needed', { userId, expiresAt: credentials.expiresAt });
      return false;
    }

    logger.info('Token is expiring soon, refreshing...', { userId, expiresAt: credentials.expiresAt });

    // Refresh the token
    const newTokens = await DriveOAuthService.refreshAccessToken(credentials.refreshToken);

    // Update credentials in database (keep existing refresh token, only update access token)
    const updatedCredentials = {
      ...credentials,
      accessToken: newTokens.accessToken,
      expiresAt: newTokens.expiresAt.toISOString(),
    };

    // Get credential record
    const credentialRecord = await PlatformCredentialRepository.findByUserAndPlatform(userId, 'google_workspace');
    if (!credentialRecord) {
      throw new Error('Credential record not found');
    }

    // Update the encrypted credentials
    await PlatformCredentialRepository.create(
      userId,
      'google_workspace',
      JSON.stringify(updatedCredentials),
      'oauth'
    );

    // Deactivate old credential
    await PlatformCredentialRepository.deactivate(credentialRecord.id);

    logger.info('Token refreshed successfully', { userId, newExpiresAt: updatedCredentials.expiresAt });

    return true;
  } catch (error) {
    logger.error('Failed to refresh OAuth token', { userId, error });
    throw new Error(`Token refresh failed: ${error}`);
  }
}

/**
 * Main middleware function to refresh tokens if needed
 *
 * @param userId - User ID
 * @param platform - Platform to check (e.g., 'google_workspace')
 * @returns Promise<void>
 *
 * @throws Error if token refresh fails
 */
export async function refreshTokenIfNeeded(userId: number, platform: Platform): Promise<void> {
  try {
    // Get decrypted credentials
    const credentials = await PlatformCredentialRepository.getDecryptedCredentials(userId, platform);

    if (!credentials) {
      logger.debug('No credentials found, skipping token refresh', { userId, platform });
      return;
    }

    // Check if credentials are OAuth type (only OAuth tokens need refresh)
    const isOAuth = credentials.accessToken && credentials.refreshToken && credentials.expiresAt;
    if (!isOAuth) {
      logger.debug('Not OAuth credentials, skipping token refresh', { userId, platform });
      return;
    }

    // Refresh based on platform
    if (platform === 'google_workspace') {
      await refreshGoogleToken(userId, credentials);
    } else {
      logger.warn('Token refresh not implemented for platform', { platform });
    }
  } catch (error) {
    logger.error('Token refresh middleware failed', { userId, platform, error });
    // Re-throw to let caller handle the error
    throw error;
  }
}

/**
 * Express/Hono middleware wrapper for automatic token refresh
 *
 * Usage in routes:
 * ```typescript
 * app.post('/api/assets/discover', authMiddleware, async (c) => {
 *   const user = c.get('user');
 *   const { platform } = await c.req.json();
 *
 *   // Refresh token if needed before making API calls
 *   await withTokenRefresh(user.id, platform);
 *
 *   // Now safe to make API calls with fresh token
 *   const result = await AssetDiscoveryService.discoverAssets(user.id, platform);
 *   return c.json({ success: true, data: result });
 * });
 * ```
 */
export async function withTokenRefresh(userId: number, platform: Platform): Promise<void> {
  await refreshTokenIfNeeded(userId, platform);
}

/**
 * Check if credentials need refresh (without actually refreshing)
 * Useful for showing UI warnings
 */
export async function checkTokenStatus(userId: number, platform: Platform): Promise<{
  isValid: boolean;
  expiresAt?: string;
  needsRefresh: boolean;
}> {
  try {
    const credentials = await PlatformCredentialRepository.getDecryptedCredentials(userId, platform);

    if (!credentials) {
      return { isValid: false, needsRefresh: false };
    }

    const isOAuth = credentials.accessToken && credentials.refreshToken && credentials.expiresAt;
    if (!isOAuth) {
      return { isValid: true, needsRefresh: false }; // Service account doesn't expire
    }

    const needsRefresh = isTokenExpiringSoon(credentials.expiresAt);
    const isExpired = new Date(credentials.expiresAt) < new Date();

    return {
      isValid: !isExpired,
      expiresAt: credentials.expiresAt,
      needsRefresh,
    };
  } catch (error) {
    logger.error('Failed to check token status', { userId, platform, error });
    return { isValid: false, needsRefresh: false };
  }
}
