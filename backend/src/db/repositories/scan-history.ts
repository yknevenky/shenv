/**
 * Repository for scan history tracking
 */

import { db } from '../connection';
import { scanHistory } from '../schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export interface CreateScanHistoryInput {
  userId: number;
  jobId?: number;
  scope: 'quick' | 'full' | 'organization';
  platforms: string[];
  assetsFound: number;
  riskScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  scanDuration?: number;
}

export const ScanHistoryRepository = {
  /**
   * Create a scan history entry
   */
  async create(input: CreateScanHistoryInput) {
    try {
      const [history] = await db
        .insert(scanHistory)
        .values(input)
        .returning();

      if (!history) {
        throw new Error('Failed to create scan history');
      }

      logger.info(`Scan history created: ${history.id} for user ${input.userId}`);
      return history;
    } catch (error) {
      logger.error('Error creating scan history:', error);
      throw error;
    }
  },

  /**
   * Get scan history by user ID
   */
  async findByUserId(userId: number, limit: number = 10) {
    try {
      const history = await db
        .select()
        .from(scanHistory)
        .where(eq(scanHistory.userId, userId))
        .orderBy(desc(scanHistory.completedAt))
        .limit(limit);

      return history;
    } catch (error) {
      logger.error(`Error finding scan history for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get latest scan for user
   */
  async getLatest(userId: number) {
    try {
      const [latest] = await db
        .select()
        .from(scanHistory)
        .where(eq(scanHistory.userId, userId))
        .orderBy(desc(scanHistory.completedAt))
        .limit(1);

      return latest;
    } catch (error) {
      logger.error(`Error getting latest scan for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get first scan for user (baseline)
   */
  async getFirstScan(userId: number) {
    try {
      const [first] = await db
        .select()
        .from(scanHistory)
        .where(eq(scanHistory.userId, userId))
        .orderBy(scanHistory.completedAt) // Ascending for first
        .limit(1);

      return first;
    } catch (error) {
      logger.error(`Error getting first scan for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get scans within date range
   */
  async findByDateRange(userId: number, startDate: Date, endDate: Date) {
    try {
      const scans = await db
        .select()
        .from(scanHistory)
        .where(
          and(
            eq(scanHistory.userId, userId),
            gte(scanHistory.completedAt, startDate)
          )
        )
        .orderBy(desc(scanHistory.completedAt));

      return scans.filter(scan => scan.completedAt <= endDate);
    } catch (error) {
      logger.error(`Error finding scans by date range for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Calculate improvement metrics (current vs baseline)
   */
  async getImprovementMetrics(userId: number) {
    try {
      const latest = await this.getLatest(userId);
      const first = await this.getFirstScan(userId);

      if (!latest || !first) {
        return null;
      }

      return {
        current: {
          riskScore: latest.riskScore,
          highRiskCount: latest.highRiskCount,
          assetsFound: latest.assetsFound,
        },
        baseline: {
          riskScore: first.riskScore,
          highRiskCount: first.highRiskCount,
          assetsFound: first.assetsFound,
        },
        improvement: {
          riskScoreChange: first.riskScore - latest.riskScore,
          riskScorePercentChange: ((first.riskScore - latest.riskScore) / first.riskScore) * 100,
          highRiskReduction: first.highRiskCount - latest.highRiskCount,
          securedAssets: first.highRiskCount - latest.highRiskCount,
        },
      };
    } catch (error) {
      logger.error(`Error calculating improvement metrics for user ${userId}:`, error);
      throw error;
    }
  },
};
