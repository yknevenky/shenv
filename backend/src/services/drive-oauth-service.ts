/**
 * Google Drive OAuth Service
 *
 * Handles OAuth 2.0 authentication flow for Google Drive API access (Individual Users)
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger.js';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly', // Read-only access to Drive
  'https://www.googleapis.com/auth/drive.metadata.readonly', // File metadata
  'https://www.googleapis.com/auth/userinfo.email', // User email for verification
  'https://www.googleapis.com/auth/userinfo.profile', // User profile
];

export interface DriveOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export class DriveOAuthService {
  private static oauth2Client: any = null;

  /**
   * Initialize OAuth2 client with credentials from environment
   */
  private static getOAuth2Client() {
    if (!this.oauth2Client) {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/platforms/google/oauth/callback';

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in environment.');
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
    }

    return this.oauth2Client;
  }

  /**
   * Generate authorization URL for user to grant Drive access
   */
  static getAuthorizationUrl(userId: number): string {
    const oauth2Client = this.getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: DRIVE_SCOPES,
      state: userId.toString(), // Pass user ID in state for callback
      prompt: 'consent', // Force consent screen to get refresh token
    });

    logger.info('Generated Drive authorization URL', { userId });
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<DriveOAuthTokens> {
    try {
      const oauth2Client = this.getOAuth2Client();

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to retrieve tokens from Google');
      }

      const expiresIn = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      logger.info('Successfully exchanged code for Drive OAuth tokens');

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiresIn,
        scope: tokens.scope || DRIVE_SCOPES.join(' '),
      };
    } catch (error: any) {
      logger.error('Failed to exchange code for tokens', { error: error.message });
      throw new Error(`OAuth token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      logger.info('Successfully refreshed Drive OAuth access token');

      return {
        accessToken: credentials.access_token,
        expiresAt,
      };
    } catch (error: any) {
      logger.error('Failed to refresh access token', { error: error.message });
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get Drive API client with OAuth credentials
   */
  static getDriveClient(accessToken: string) {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Verify token and get user info
   */
  static async verifyToken(accessToken: string): Promise<{ email: string; name: string }> {
    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ access_token: accessToken });

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();

      if (!data.email) {
        throw new Error('Failed to retrieve user email from token');
      }

      return {
        email: data.email,
        name: data.name || '',
      };
    } catch (error: any) {
      logger.error('Failed to verify token', { error: error.message });
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Revoke OAuth tokens
   */
  static async revokeToken(accessToken: string): Promise<void> {
    try {
      const oauth2Client = this.getOAuth2Client();
      await oauth2Client.revokeToken(accessToken);
      logger.info('Successfully revoked Drive OAuth token');
    } catch (error: any) {
      logger.error('Failed to revoke token', { error: error.message });
      throw new Error(`Token revocation failed: ${error.message}`);
    }
  }
}
