/**
 * Email Sender Repository
 *
 * Database operations for email senders
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '../connection.js';
import { emailSenders } from '../schema.js';
import { logger } from '../../utils/logger.js';

export class EmailSenderRepository {
  /**
   * Upsert email sender
   */
  static async upsert(
    userId: number,
    senderEmail: string,
    senderName: string | null,
    emailCount: number,
    firstEmailDate: Date | null,
    lastEmailDate: Date | null
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
   * Find sender by email for a user
   */
  static async findBySenderEmail(userId: number, senderEmail: string) {
    try {
      const [sender] = await db
        .select()
        .from(emailSenders)
        .where(eq(emailSenders.userId, userId))
        .where(eq(emailSenders.senderEmail, senderEmail));

      return sender || null;
    } catch (error) {
      logger.error('Failed to find email sender', { userId, senderEmail, error });
      throw error;
    }
  }

  /**
   * Get all senders for a user
   */
  static async findAllByUser(userId: number, limit = 100, offset = 0) {
    try {
      const senders = await db
        .select()
        .from(emailSenders)
        .where(eq(emailSenders.userId, userId))
        .orderBy(desc(emailSenders.emailCount))
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
   * Get total count of senders for a user
   */
  static async countByUser(userId: number): Promise<number> {
    try {
      const senders = await db
        .select()
        .from(emailSenders)
        .where(eq(emailSenders.userId, userId));

      return senders.length;
    } catch (error) {
      logger.error('Failed to count senders', { userId, error });
      throw error;
    }
  }
}
