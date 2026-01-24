/**
 * Gmail OAuth Token Repository
 *
 * Database operations for Gmail OAuth tokens
 */

import { eq } from 'drizzle-orm';
import { db } from '../connection.js';
import { gmailOAuthTokens } from '../schema.js';
import { logger } from '../../utils/logger.js';

export class GmailOAuthTokenRepository {
  /**
   * Store OAuth tokens for a user
   */
  static async upsert(
    userId: number,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    expiresAt: Date,
    scope: string
  ) {
    try {
      const existing = await this.findByUserId(userId);

      if (existing) {
        // Update existing tokens
        const [updated] = await db
          .update(gmailOAuthTokens)
          .set({
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            scope,
            updatedAt: new Date(),
          })
          .where(eq(gmailOAuthTokens.userId, userId))
          .returning();

        logger.info('Gmail OAuth tokens updated', { userId });
        return updated;
      } else {
        // Insert new tokens
        const [created] = await db
          .insert(gmailOAuthTokens)
          .values({
            userId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
            scope,
          })
          .returning();

        logger.info('Gmail OAuth tokens created', { userId });
        return created;
      }
    } catch (error) {
      logger.error('Failed to upsert Gmail OAuth tokens', { userId, error });
      throw error;
    }
  }

  /**
   * Find tokens by user ID
   */
  static async findByUserId(userId: number) {
    try {
      const [tokens] = await db
        .select()
        .from(gmailOAuthTokens)
        .where(eq(gmailOAuthTokens.userId, userId));

      return tokens || null;
    } catch (error) {
      logger.error('Failed to find Gmail OAuth tokens', { userId, error });
      throw error;
    }
  }

  /**
   * Delete tokens for a user
   */
  static async deleteByUserId(userId: number) {
    try {
      await db.delete(gmailOAuthTokens).where(eq(gmailOAuthTokens.userId, userId));

      logger.info('Gmail OAuth tokens deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete Gmail OAuth tokens', { userId, error });
      throw error;
    }
  }

  /**
   * Check if user has Gmail tokens
   */
  static async hasTokens(userId: number): Promise<boolean> {
    const tokens = await this.findByUserId(userId);
    return tokens !== null;
  }
}
