/**
 * Gmail OAuth Service
 *
 * Handles OAuth 2.0 authentication flow for Gmail API access
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify', // Required for delete operations
];

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export class GmailOAuthService {
  private static oauth2Client: any = null;

  /**
   * Initialize OAuth2 client with credentials from environment
   */
  private static getOAuth2Client() {
    if (!this.oauth2Client) {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/gmail/oauth/callback';

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
   * Generate authorization URL for user to grant Gmail access
   */
  static getAuthorizationUrl(userId: number): string {
    const oauth2Client = this.getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: GMAIL_SCOPES,
      state: userId.toString(), // Pass user ID in state for callback
      prompt: 'consent', // Force consent screen to get refresh token
    });

    logger.info('Generated Gmail authorization URL', { userId });
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const oauth2Client = this.getOAuth2Client();

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to retrieve tokens from Google');
      }

      const expiresIn = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

      logger.info('Successfully exchanged code for Gmail tokens');

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiresIn,
        scope: tokens.scope || GMAIL_SCOPES.join(' '),
      };
    } catch (error) {
      logger.error('Failed to exchange code for tokens', { error });
      throw new Error(`OAuth token exchange failed: ${error}`);
    }
  }

  /**
   * Encrypt OAuth tokens for secure storage
   */
  static encryptTokens(tokens: OAuthTokens): { encryptedAccessToken: string; encryptedRefreshToken: string } {
    return {
      encryptedAccessToken: encrypt(tokens.accessToken),
      encryptedRefreshToken: encrypt(tokens.refreshToken),
    };
  }

  /**
   * Decrypt OAuth tokens from storage
   */
  static decryptTokens(
    encryptedAccessToken: string,
    encryptedRefreshToken: string
  ): { accessToken: string; refreshToken: string } {
    return {
      accessToken: decrypt(encryptedAccessToken),
      refreshToken: decrypt(encryptedRefreshToken),
    };
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
        : new Date(Date.now() + (credentials.expires_in || 3600) * 1000);

      logger.info('Successfully refreshed Gmail access token');

      return {
        accessToken: credentials.access_token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to refresh access token', { error });
      throw new Error(`Token refresh failed: ${error}`);
    }
  }

  /**
   * Get authenticated Gmail client
   */
  static getGmailClient(accessToken: string) {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Validate if tokens are still valid
   */
  static async validateTokens(accessToken: string): Promise<boolean> {
    try {
      const gmail = this.getGmailClient(accessToken);

      // Try to get user profile as a validation check
      await gmail.users.getProfile({ userId: 'me' });

      return true;
    } catch (error) {
      logger.warn('Token validation failed', { error });
      return false;
    }
  }

  /**
   * Revoke OAuth tokens
   */
  static async revokeTokens(accessToken: string): Promise<void> {
    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      await oauth2Client.revokeCredentials();
      logger.info('Successfully revoked Gmail OAuth tokens');
    } catch (error) {
      logger.error('Failed to revoke tokens', { error });
      throw new Error(`Token revocation failed: ${error}`);
    }
  }
}
