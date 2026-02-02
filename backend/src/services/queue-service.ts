/**
 * Queue Service - Manages FIFO job queue with priority support
 */

import { ScanJobRepository } from '../db/repositories/scan-job';
import { ScanHistoryRepository } from '../db/repositories/scan-history';
import { apiQuotaRepository } from '../db/repositories/api-quota';
import { UserRepository } from '../db/repositories/user';
import { logger } from '../utils/logger';

const AVG_JOB_TIME_MINUTES = 5; // Average time per scan job

export interface QueueScanInput {
  userId: number;
  scope: 'quick' | 'full' | 'organization';
  platforms: string[];
}

export interface QueueStatusResponse {
  jobId: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition: number | null;
  estimatedWaitMinutes: number | null;
  canSkipQueue: boolean;
  upgradeOptions: {
    oneTimeSkip: { price: number; currency: string };
    monthlyUnlimited: { price: number; currency: string };
  };
}

export const queueService = {
  /**
   * Queue a new scan job
   */
  async queueScan(input: QueueScanInput): Promise<QueueStatusResponse> {
    try {
      // Get user to check tier
      const user = await UserRepository.findById(input.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check quota availability
      const hasQuota = await apiQuotaRepository.hasQuotaAvailable(user.tier);
      if (!hasQuota) {
        throw new Error('Daily API quota exceeded. Please try again tomorrow or upgrade to paid tier.');
      }

      // Determine priority based on tier
      let priority = 0;
      if (user.tier === 'individual_paid' || user.tier === 'business') {
        priority = 100; // Paid users skip the queue
      }

      // Create the job
      const job = await ScanJobRepository.create({
        userId: input.userId,
        scope: input.scope,
        platforms: input.platforms,
        priority,
      });

      // Update queue positions
      await ScanJobRepository.updateQueuePositions();

      if (!job) {
        throw new Error('Failed to create scan job');
      }

      // Get queue status
      return await this.getQueueStatus(job.id);
    } catch (error) {
      logger.error('Error queueing scan:', error);
      throw error;
    }
  },

  /**
   * Get queue status for a job
   */
  async getQueueStatus(jobId: number): Promise<QueueStatusResponse> {
    try {
      const job = await ScanJobRepository.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      let queuePosition: number | null = null;
      let estimatedWaitMinutes: number | null = null;

      if (job.status === 'queued') {
        queuePosition = await ScanJobRepository.getQueuePosition(jobId);
        if (queuePosition) {
          estimatedWaitMinutes = (queuePosition - 1) * AVG_JOB_TIME_MINUTES;
        }
      }

      return {
        jobId: job.id,
        status: job.status,
        queuePosition,
        estimatedWaitMinutes,
        canSkipQueue: job.status === 'queued' && job.priority < 100,
        upgradeOptions: {
          oneTimeSkip: { price: 5, currency: 'USD' },
          monthlyUnlimited: { price: 29, currency: 'USD' },
        },
      };
    } catch (error) {
      logger.error(`Error getting queue status for job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Skip queue with one-time payment
   */
  async skipQueue(jobId: number): Promise<void> {
    try {
      // Update job priority to skip queue
      await ScanJobRepository.update(jobId, {
        priority: 100,
      });

      // Update queue positions
      await ScanJobRepository.updateQueuePositions();

      logger.info(`Job ${jobId} upgraded to skip queue`);
    } catch (error) {
      logger.error(`Error skipping queue for job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Get next job to process
   */
  async getNextJob() {
    try {
      return await ScanJobRepository.getNextJob();
    } catch (error) {
      logger.error('Error getting next job:', error);
      throw error;
    }
  },

  /**
   * Mark job as processing
   */
  async startJob(jobId: number) {
    try {
      await ScanJobRepository.update(jobId, {
        status: 'processing',
        startedAt: new Date(),
      });

      // Update queue positions for remaining jobs
      await ScanJobRepository.updateQueuePositions();

      logger.info(`Job ${jobId} started processing`);
    } catch (error) {
      logger.error(`Error starting job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Mark job as completed with results
   */
  async completeJob(
    jobId: number,
    results: {
      assetsFound: number;
      riskScore: number;
      highRiskCount: number;
      mediumRiskCount: number;
      lowRiskCount: number;
    }
  ) {
    try {
      const job = await ScanJobRepository.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Calculate scan duration
      const scanDuration = job.startedAt
        ? Math.floor((Date.now() - job.startedAt.getTime()) / 1000)
        : 0;

      // Update job status
      await ScanJobRepository.update(jobId, {
        status: 'completed',
        completedAt: new Date(),
        results: {
          assetsFound: results.assetsFound,
          riskScore: results.riskScore,
          highRiskCount: results.highRiskCount,
        },
      });

      // Create history entry
      await ScanHistoryRepository.create({
        userId: job.userId,
        jobId: job.id,
        scope: job.scope,
        platforms: job.platforms as string[],
        assetsFound: results.assetsFound,
        riskScore: results.riskScore,
        highRiskCount: results.highRiskCount,
        mediumRiskCount: results.mediumRiskCount,
        lowRiskCount: results.lowRiskCount,
        scanDuration,
      });

      logger.info(`Job ${jobId} completed successfully`);
    } catch (error) {
      logger.error(`Error completing job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Mark job as failed
   */
  async failJob(jobId: number, errorMessage: string) {
    try {
      await ScanJobRepository.update(jobId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage,
      });

      logger.error(`Job ${jobId} failed: ${errorMessage}`);
    } catch (error) {
      logger.error(`Error failing job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Get user's scan history
   */
  async getScanHistory(userId: number, limit: number = 10) {
    try {
      return await ScanHistoryRepository.findByUserId(userId, limit);
    } catch (error) {
      logger.error(`Error getting scan history for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get improvement metrics
   */
  async getImprovementMetrics(userId: number) {
    try {
      return await ScanHistoryRepository.getImprovementMetrics(userId);
    } catch (error) {
      logger.error(`Error getting improvement metrics for user ${userId}:`, error);
      throw error;
    }
  },
};
