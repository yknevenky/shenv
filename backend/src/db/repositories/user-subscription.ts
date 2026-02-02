/**
 * Repository for user subscriptions
 */

import { db } from '../connection';
import { userSubscriptions } from '../schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export interface CreateSubscriptionInput {
  userId: number;
  tier: 'individual_free' | 'individual_paid' | 'business';
  status: string;
  paymentMethod?: string;
  subscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface UpdateSubscriptionInput {
  tier?: 'individual_free' | 'individual_paid' | 'business';
  status?: string;
  subscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export const userSubscriptionRepository = {
  /**
   * Create a subscription
   */
  async create(input: CreateSubscriptionInput) {
    try {
      const [subscription] = await db
        .insert(userSubscriptions)
        .values(input)
        .returning();

      logger.info(`Subscription created for user ${input.userId}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  },

  /**
   * Get subscription by user ID
   */
  async findByUserId(userId: number) {
    try {
      const subscription = await db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, userId),
      });
      return subscription;
    } catch (error) {
      logger.error(`Error finding subscription for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update subscription
   */
  async update(userId: number, input: UpdateSubscriptionInput) {
    try {
      const [updated] = await db
        .update(userSubscriptions)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(userSubscriptions.userId, userId))
        .returning();

      logger.info(`Subscription updated for user ${userId}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating subscription for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancel(userId: number) {
    try {
      const [cancelled] = await db
        .update(userSubscriptions)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(userSubscriptions.userId, userId))
        .returning();

      logger.info(`Subscription cancelled for user ${userId}`);
      return cancelled;
    } catch (error) {
      logger.error(`Error cancelling subscription for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Check if subscription is active
   */
  async isActive(userId: number): Promise<boolean> {
    try {
      const subscription = await this.findByUserId(userId);
      if (!subscription) return false;

      if (subscription.status !== 'active') return false;

      // Check if current period is valid
      if (subscription.currentPeriodEnd) {
        return new Date() < subscription.currentPeriodEnd;
      }

      return true;
    } catch (error) {
      logger.error(`Error checking subscription status for user ${userId}:`, error);
      return false;
    }
  },
};
