/**
 * Email Sender Repository
 *
 * Database operations for email senders
 */

import { eq, desc, and, asc, ilike, or, count, sum } from 'drizzle-orm';
import { db } from '../connection.js';
import { emailSenders } from '../schema.js';
import { logger } from '../../utils/logger.js';

export type SortField = 'emailCount' | 'lastEmailDate' | 'firstEmailDate' | 'senderEmail' | 'senderName';
export type SortOrder = 'asc' | 'desc';

export interface FindAllOptions {
  limit?: number;
  offset?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  search?: string;
}

export class EmailSenderRepository {
  /**
   * Upsert email sender with new metadata fields
   */
  static async upsert(
    userId: number,
    senderEmail: string,
    senderName: string | null,
    emailCount: number,
    firstEmailDate: Date | null,
    lastEmailDate: Date | null,
    attachmentCount?: number,
    unsubscribeLink?: string | null,
    hasUnsubscribe?: boolean,
    isVerified?: boolean
  ) {
    try {
      const existing = await this.findBySenderEmail(userId, senderEmail);

      if (existing) {
        // Update existing sender
        const [updated] = await db
          .update(emailSenders)
          .set({
            senderName,
            emailCount,
            firstEmailDate,
            lastEmailDate,
            ...(attachmentCount !== undefined && { attachmentCount }),
            ...(unsubscribeLink !== undefined && { unsubscribeLink }),
            ...(hasUnsubscribe !== undefined && { hasUnsubscribe }),
            ...(isVerified !== undefined && { isVerified }),
            lastSyncedAt: new Date(),
          })
          .where(eq(emailSenders.id, existing.id))
          .returning();

        return updated;
      } else {
        // Insert new sender
        const [created] = await db
          .insert(emailSenders)
          .values({
            userId,
            senderEmail,
            senderName,
            emailCount,
            firstEmailDate,
            lastEmailDate,
            attachmentCount: attachmentCount || 0,
            unsubscribeLink: unsubscribeLink || null,
            hasUnsubscribe: hasUnsubscribe || false,
            isVerified: isVerified ?? true,
          })
          .returning();

        return created;
      }
    } catch (error) {
      logger.error('Failed to upsert email sender', { userId, senderEmail, error });
      throw error;
    }
  }

  /**
   * Mark sender as unsubscribed
   */
  static async markAsUnsubscribed(senderId: number) {
    try {
      const [updated] = await db
        .update(emailSenders)
        .set({
          isUnsubscribed: true,
          unsubscribedAt: new Date(),
        })
        .where(eq(emailSenders.id, senderId))
        .returning();

      logger.info('Marked sender as unsubscribed', { senderId });
      return updated;
    } catch (error) {
      logger.error('Failed to mark sender as unsubscribed', { senderId, error });
      throw error;
    }
  }

  /**
   * Find sender by email for a user
   */
  static async findBySenderEmail(userId: number, senderEmail: string) {
    try {
      const [sender] = await db
        .select()
        .from(emailSenders)
        .where(and(eq(emailSenders.userId, userId), eq(emailSenders.senderEmail, senderEmail)));

      return sender || null;
    } catch (error) {
      logger.error('Failed to find email sender', { userId, senderEmail, error });
      throw error;
    }
  }

  /**
   * Get all senders for a user with sorting and filtering
   */
  static async findAllByUser(userId: number, options: FindAllOptions = {}) {
    const {
      limit = 100,
      offset = 0,
      sortBy = 'emailCount',
      sortOrder = 'desc',
      search,
    } = options;

    try {
      // Build where conditions
      const conditions = [eq(emailSenders.userId, userId)];

      if (search) {
        conditions.push(
          or(
            ilike(emailSenders.senderEmail, `%${search}%`),
            ilike(emailSenders.senderName, `%${search}%`)
          )!
        );
      }

      // Build order by
      const sortColumn = {
        emailCount: emailSenders.emailCount,
        lastEmailDate: emailSenders.lastEmailDate,
        firstEmailDate: emailSenders.firstEmailDate,
        senderEmail: emailSenders.senderEmail,
        senderName: emailSenders.senderName,
      }[sortBy];

      const orderFn = sortOrder === 'asc' ? asc : desc;

      const senders = await db
        .select()
        .from(emailSenders)
        .where(and(...conditions))
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset);

      return senders;
    } catch (error) {
      logger.error('Failed to find senders by user', { userId, error });
      throw error;
    }
  }

  /**
   * Get sender by ID
   */
  static async findById(senderId: number) {
    try {
      const [sender] = await db
        .select()
        .from(emailSenders)
        .where(eq(emailSenders.id, senderId));

      return sender || null;
    } catch (error) {
      logger.error('Failed to find sender by ID', { senderId, error });
      throw error;
    }
  }

  /**
   * Delete sender and all associated emails
   */
  static async deleteById(senderId: number) {
    try {
      await db.delete(emailSenders).where(eq(emailSenders.id, senderId));
      logger.info('Email sender deleted', { senderId });
    } catch (error) {
      logger.error('Failed to delete sender', { senderId, error });
      throw error;
    }
  }

  /**
   * Delete all senders for a user
   */
  static async deleteAllByUser(userId: number) {
    try {
      await db.delete(emailSenders).where(eq(emailSenders.userId, userId));
      logger.info('All email senders deleted for user', { userId });
    } catch (error) {
      logger.error('Failed to delete all senders', { userId, error });
      throw error;
    }
  }

  /**
   * Get total count of senders for a user (with optional search)
   */
  static async countByUser(userId: number, search?: string): Promise<number> {
    try {
      const conditions = [eq(emailSenders.userId, userId)];

      if (search) {
        conditions.push(
          or(
            ilike(emailSenders.senderEmail, `%${search}%`),
            ilike(emailSenders.senderName, `%${search}%`)
          )!
        );
      }

      const [result] = await db
        .select({ count: count() })
        .from(emailSenders)
        .where(and(...conditions));

      return result?.count || 0;
    } catch (error) {
      logger.error('Failed to count senders', { userId, error });
      throw error;
    }
  }

  /**
   * Get aggregated stats for all senders of a user
   */
  static async getStats(userId: number) {
    try {
      const [result] = await db
        .select({
          totalSenders: count(),
          totalEmails: sum(emailSenders.emailCount),
        })
        .from(emailSenders)
        .where(eq(emailSenders.userId, userId));

      return {
        totalSenders: result?.totalSenders || 0,
        totalEmails: Number(result?.totalEmails) || 0,
      };
    } catch (error) {
      logger.error('Failed to get sender stats', { userId, error });
      throw error;
    }
  }
}
