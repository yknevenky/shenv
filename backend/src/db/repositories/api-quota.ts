/**
 * Repository for API quota tracking
 */

import { db } from '../connection';
import { apiQuotaUsage } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

const QUOTA_LIMITS = {
  individual_free: 10000,   // 10k API calls per day (shared across all free users)
  individual_paid: 50000,   // 50k API calls per day (shared across all paid users)
  business: 100000,         // 100k API calls per day per business org
};

export const apiQuotaRepository = {
  /**
   * Get today's quota usage for a tier
   */
  async getTodayUsage(tier: 'individual_free' | 'individual_paid' | 'business') {
    try {
      const today: string = new Date().toISOString().split('T')[0]!; // YYYY-MM-DD

      const [usage] = await db
        .select()
        .from(apiQuotaUsage)
        .where(
          and(
            eq(apiQuotaUsage.tier, tier),
            sql`${apiQuotaUsage.date}::text = ${today}`
          )
        );

      if (!usage) {
        // Create today's entry
        const [newUsage] = await db
          .insert(apiQuotaUsage)
          .values({
            tier,
            date: today,
            apiCalls: 0,
            quota: QUOTA_LIMITS[tier],
          })
          .returning();

        if (!newUsage) {
          throw new Error('Failed to create quota usage entry');
        }
        return newUsage;
      }

      return usage;
    } catch (error) {
      logger.error(`Error getting quota usage for ${tier}:`, error);
      throw error;
    }
  },

  /**
   * Increment API call count for a tier
   */
  async incrementUsage(tier: 'individual_free' | 'individual_paid' | 'business', calls: number = 1) {
    try {
      // Get or create today's usage
      const usage = await this.getTodayUsage(tier);

      if (!usage) {
        throw new Error('Failed to get or create quota usage');
      }

      // Update the count
      const [updated] = await db
        .update(apiQuotaUsage)
        .set({
          apiCalls: usage.apiCalls + calls,
          updatedAt: new Date(),
        })
        .where(eq(apiQuotaUsage.id, usage.id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update quota usage');
      }

      return updated;
    } catch (error) {
      logger.error(`Error incrementing usage for ${tier}:`, error);
      throw error;
    }
  },

  /**
   * Check if quota is available
   */
  async hasQuotaAvailable(tier: 'individual_free' | 'individual_paid' | 'business'): Promise<boolean> {
    try {
      const usage = await this.getTodayUsage(tier);
      if (!usage) {
        return false;
      }
      return usage.apiCalls < usage.quota;
    } catch (error) {
      logger.error(`Error checking quota for ${tier}:`, error);
      return false;
    }
  },

  /**
   * Get remaining quota
   */
  async getRemainingQuota(tier: 'individual_free' | 'individual_paid' | 'business'): Promise<number> {
    try {
      const usage = await this.getTodayUsage(tier);
      if (!usage) {
        return 0;
      }
      return Math.max(0, usage.quota - usage.apiCalls);
    } catch (error) {
      logger.error(`Error getting remaining quota for ${tier}:`, error);
      return 0;
    }
  },

  /**
   * Get quota statistics
   */
  async getQuotaStats(tier: 'individual_free' | 'individual_paid' | 'business') {
    try {
      const usage = await this.getTodayUsage(tier);
      if (!usage) {
        throw new Error('Failed to get quota usage');
      }
      const remaining = usage.quota - usage.apiCalls;
      const percentUsed = (usage.apiCalls / usage.quota) * 100;

      return {
        tier,
        used: usage.apiCalls,
        quota: usage.quota,
        remaining,
        percentUsed: Math.round(percentUsed * 100) / 100,
        isExceeded: usage.apiCalls >= usage.quota,
      };
    } catch (error) {
      logger.error(`Error getting quota stats for ${tier}:`, error);
      throw error;
    }
  },
};
