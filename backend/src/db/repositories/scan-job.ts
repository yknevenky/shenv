/**
 * Repository for scan jobs (FIFO queue)
 */

import { db } from '../connection';
import { scanJobs } from '../schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export interface CreateScanJobInput {
  userId: number;
  scope: 'quick' | 'full' | 'organization';
  platforms: string[]; // e.g., ['google_workspace', 'gmail']
  priority?: number;
}

export interface UpdateScanJobInput {
  status?: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  queuePosition?: number;
  priority?: number;
  estimatedStartTime?: Date;
  results?: {
    assetsFound: number;
    riskScore: number;
    highRiskCount: number;
  };
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export const ScanJobRepository = {
  /**
   * Create a new scan job and add to queue
   */
  async create(input: CreateScanJobInput) {
    try {
      const [job] = await db
        .insert(scanJobs)
        .values({
          userId: input.userId,
          scope: input.scope,
          platforms: input.platforms,
          priority: input.priority || 0,
          status: 'queued',
        })
        .returning();

      if (!job) {
        throw new Error('Failed to create scan job');
      }

      logger.info(`Scan job created: ${job.id} for user ${input.userId}`);
      return job;
    } catch (error) {
      logger.error('Error creating scan job:', error);
      throw error;
    }
  },

  /**
   * Get scan job by ID
   */
  async findById(jobId: number) {
    try {
      const job = await db.query.scanJobs.findFirst({
        where: eq(scanJobs.id, jobId),
      });
      return job;
    } catch (error) {
      logger.error(`Error finding scan job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Get all queued jobs ordered by priority and creation time (FIFO)
   */
  async getQueuedJobs() {
    try {
      const jobs = await db
        .select()
        .from(scanJobs)
        .where(eq(scanJobs.status, 'queued'))
        .orderBy(desc(scanJobs.priority), asc(scanJobs.createdAt));

      return jobs;
    } catch (error) {
      logger.error('Error fetching queued jobs:', error);
      throw error;
    }
  },

  /**
   * Get queue position for a specific job
   */
  async getQueuePosition(jobId: number): Promise<number | null> {
    try {
      const job = await this.findById(jobId);
      if (!job || job.status !== 'queued') {
        return null;
      }

      // Count jobs with higher priority or earlier creation time
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(scanJobs)
        .where(
          and(
            eq(scanJobs.status, 'queued'),
            sql`(${scanJobs.priority} > ${job.priority} OR
                 (${scanJobs.priority} = ${job.priority} AND ${scanJobs.createdAt} < ${job.createdAt}))`
          )
        );

      return (result?.count || 0) + 1; // Position is count + 1
    } catch (error) {
      logger.error(`Error calculating queue position for job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Get user's recent jobs
   */
  async findByUserId(userId: number, limit: number = 10) {
    try {
      const jobs = await db
        .select()
        .from(scanJobs)
        .where(eq(scanJobs.userId, userId))
        .orderBy(desc(scanJobs.createdAt))
        .limit(limit);

      return jobs;
    } catch (error) {
      logger.error(`Error finding scan jobs for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update scan job
   */
  async update(jobId: number, input: UpdateScanJobInput) {
    try {
      const [updated] = await db
        .update(scanJobs)
        .set(input)
        .where(eq(scanJobs.id, jobId))
        .returning();

      logger.info(`Scan job updated: ${jobId}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating scan job ${jobId}:`, error);
      throw error;
    }
  },

  /**
   * Get next job to process (highest priority, oldest first)
   */
  async getNextJob() {
    try {
      const [job] = await db
        .select()
        .from(scanJobs)
        .where(eq(scanJobs.status, 'queued'))
        .orderBy(desc(scanJobs.priority), asc(scanJobs.createdAt))
        .limit(1);

      return job;
    } catch (error) {
      logger.error('Error getting next job:', error);
      throw error;
    }
  },

  /**
   * Update queue positions for all queued jobs
   */
  async updateQueuePositions() {
    try {
      const queuedJobs = await this.getQueuedJobs();

      for (let i = 0; i < queuedJobs.length; i++) {
        const job = queuedJobs[i];
        if (job) {
          await db
            .update(scanJobs)
            .set({ queuePosition: i + 1 })
            .where(eq(scanJobs.id, job.id));
        }
      }

      logger.info(`Updated queue positions for ${queuedJobs.length} jobs`);
    } catch (error) {
      logger.error('Error updating queue positions:', error);
      throw error;
    }
  },

  /**
   * Cancel a job
   */
  async cancel(jobId: number) {
    try {
      const [cancelled] = await db
        .update(scanJobs)
        .set({ status: 'cancelled' })
        .where(eq(scanJobs.id, jobId))
        .returning();

      logger.info(`Scan job cancelled: ${jobId}`);
      return cancelled;
    } catch (error) {
      logger.error(`Error cancelling scan job ${jobId}:`, error);
      throw error;
    }
  },
};
