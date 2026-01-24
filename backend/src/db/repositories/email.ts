/**
 * Email Repository
 *
 * Database operations for emails
 */

import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../connection.js';
import { emails } from '../schema.js';
import { logger } from '../../utils/logger.js';

export interface EmailInsert {
  userId: number;
  senderId: number;
  gmailMessageId: string;
  threadId: string;
  subject: string | null;
  snippet: string | null;
  receivedAt: Date;
  isRead: boolean;
  hasAttachment: boolean;
  labels: string[];
}

export class EmailRepository {
  /**
   * Insert email (skip if already exists)
   */
  static async upsert(emailData: EmailInsert) {
    try {
      // Check if email already exists
      const existing = await this.findByGmailMessageId(emailData.gmailMessageId);

      if (existing) {
        return existing;
      }

      // Insert new email
      const [created] = await db
        .insert(emails)
        .values({
          ...emailData,
          labels: emailData.labels as any, // Cast to JSONB
        })
        .returning();

      return created;
    } catch (error) {
      logger.error('Failed to upsert email', { gmailMessageId: emailData.gmailMessageId, error });
      throw error;
    }
  }

  /**
   * Bulk insert emails
   */
  static async bulkInsert(emailDataList: EmailInsert[]) {
    try {
      if (emailDataList.length === 0) {
        return [];
      }

      // Filter out emails that already exist
      const existingMessageIds = await this.findExistingMessageIds(
        emailDataList.map((e) => e.gmailMessageId)
      );

      const newEmails = emailDataList.filter((e) => !existingMessageIds.has(e.gmailMessageId));

      if (newEmails.length === 0) {
        logger.info('No new emails to insert');
        return [];
      }

      const inserted = await db
        .insert(emails)
        .values(
          newEmails.map((e) => ({
            ...e,
            labels: e.labels as any, // Cast to JSONB
          }))
        )
        .returning();

      logger.info(`Bulk inserted ${inserted.length} emails`);
      return inserted;
    } catch (error) {
      logger.error('Failed to bulk insert emails', { count: emailDataList.length, error });
      throw error;
    }
  }

  /**
   * Find existing message IDs from a list
   */
  private static async findExistingMessageIds(gmailMessageIds: string[]): Promise<Set<string>> {
    try {
      if (gmailMessageIds.length === 0) {
        return new Set();
      }

      const existingEmails = await db
        .select({ gmailMessageId: emails.gmailMessageId })
        .from(emails)
        .where(inArray(emails.gmailMessageId, gmailMessageIds));

      return new Set(existingEmails.map((e) => e.gmailMessageId));
    } catch (error) {
      logger.error('Failed to find existing message IDs', { error });
      return new Set();
    }
  }

  /**
   * Find email by Gmail message ID
   */
  static async findByGmailMessageId(gmailMessageId: string) {
    try {
      const [email] = await db
        .select()
        .from(emails)
        .where(eq(emails.gmailMessageId, gmailMessageId));

      return email || null;
    } catch (error) {
      logger.error('Failed to find email by message ID', { gmailMessageId, error });
      throw error;
    }
  }

  /**
   * Get all emails for a sender
   */
  static async findAllBySender(senderId: number, limit = 100, offset = 0) {
    try {
      const emailList = await db
        .select()
        .from(emails)
        .where(eq(emails.senderId, senderId))
        .orderBy(desc(emails.receivedAt))
        .limit(limit)
        .offset(offset);

      return emailList;
    } catch (error) {
      logger.error('Failed to find emails by sender', { senderId, error });
      throw error;
    }
  }

  /**
   * Get all emails for a user
   */
  static async findAllByUser(userId: number, limit = 100, offset = 0) {
    try {
      const emailList = await db
        .select()
        .from(emails)
        .where(eq(emails.userId, userId))
        .orderBy(desc(emails.receivedAt))
        .limit(limit)
        .offset(offset);

      return emailList;
    } catch (error) {
      logger.error('Failed to find emails by user', { userId, error });
      throw error;
    }
  }

  /**
   * Delete emails by sender ID
   */
  static async deleteBySender(senderId: number) {
    try {
      await db.delete(emails).where(eq(emails.senderId, senderId));
      logger.info('Emails deleted for sender', { senderId });
    } catch (error) {
      logger.error('Failed to delete emails by sender', { senderId, error });
      throw error;
    }
  }

  /**
   * Delete all emails for a user
   */
  static async deleteAllByUser(userId: number) {
    try {
      await db.delete(emails).where(eq(emails.userId, userId));
      logger.info('All emails deleted for user', { userId });
    } catch (error) {
      logger.error('Failed to delete all emails', { userId, error });
      throw error;
    }
  }

  /**
   * Get email count for a sender
   */
  static async countBySender(senderId: number): Promise<number> {
    try {
      const emailList = await db
        .select()
        .from(emails)
        .where(eq(emails.senderId, senderId));

      return emailList.length;
    } catch (error) {
      logger.error('Failed to count emails by sender', { senderId, error });
      throw error;
    }
  }

  /**
   * Get total email count for a user
   */
  static async countByUser(userId: number): Promise<number> {
    try {
      const emailList = await db
        .select()
        .from(emails)
        .where(eq(emails.userId, userId));

      return emailList.length;
    } catch (error) {
      logger.error('Failed to count emails by user', { userId, error });
      throw error;
    }
  }
}
