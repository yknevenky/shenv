/**
 * Scheduled Scans Worker
 * Automatically triggers scans based on user preferences
 */

import { logger } from '../utils/logger';
import { db } from '../db/connection';
import { users, userSubscriptions, scanHistory } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { queueService } from '../services/queue-service';

/**
 * Scheduled scan configuration
 */
interface ScanSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  platforms: string[];
  scope: 'quick' | 'full' | 'organization';
}

/**
 * Check if user needs scheduled scan
 */
async function shouldRunScheduledScan(
  userId: number,
  schedule: ScanSchedule
): Promise<boolean> {
  try {
    // Get last scan
    const lastScan = await db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId))
      .orderBy(desc(scanHistory.completedAt))
      .limit(1);

    if (lastScan.length === 0) {
      // No previous scan, run it
      return true;
    }

    const firstScan = lastScan[0];
    if (!firstScan) {
      return true;
    }
    const lastScanDate = new Date(firstScan.completedAt);
    const now = new Date();
    const hoursSinceLastScan = (now.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60);

    // Check based on frequency
    switch (schedule.frequency) {
      case 'daily':
        return hoursSinceLastScan >= 24;
      case 'weekly':
        return hoursSinceLastScan >= 24 * 7;
      case 'monthly':
        return hoursSinceLastScan >= 24 * 30;
      default:
        return false;
    }
  } catch (error: any) {
    logger.error('Error checking scheduled scan', { userId, error: error.message });
    return false;
  }
}

/**
 * Run scheduled scans for all users
 */
export async function runScheduledScans(): Promise<void> {
  logger.info('Running scheduled scans check...');

  try {
    // Get all users with active subscriptions
    const activeUsers = await db
      .select({
        userId: users.id,
        email: users.email,
        tier: users.tier,
        subscriptionStatus: userSubscriptions.status,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
      .where(
        and(
          // Active subscription or free tier
          eq(userSubscriptions.status, 'active')
        )
      );

    logger.info(`Found ${activeUsers.length} active users`);

    for (const user of activeUsers) {
      // Determine scan configuration based on tier
      const schedule: ScanSchedule = {
        frequency: user.tier === 'business' ? 'daily' : 'weekly',
        time: '02:00', // 2 AM
        platforms: ['google_workspace', 'gmail'],
        scope: user.tier === 'business' ? 'organization' : user.tier === 'individual_paid' ? 'full' : 'quick',
      };

      // Check if scan is due
      const shouldScan = await shouldRunScheduledScan(user.userId, schedule);

      if (shouldScan) {
        logger.info('Queuing scheduled scan', { userId: user.userId, email: user.email });

        // Queue the scan
        await queueService.queueScan({
          userId: user.userId,
          scope: schedule.scope,
          platforms: schedule.platforms,
        });

        logger.info('Scheduled scan queued', { userId: user.userId });
      }
    }
  } catch (error: any) {
    logger.error('Error running scheduled scans', { error: error.message });
  }
}

/**
 * Start scheduled scan checker (runs hourly)
 */
export function startScheduledScanChecker(): void {
  logger.info('Starting scheduled scan checker (runs every hour)');

  // Run immediately on startup
  runScheduledScans();

  // Run every hour
  const intervalId = setInterval(
    () => {
      runScheduledScans();
    },
    60 * 60 * 1000 // 1 hour
  );

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Stopping scheduled scan checker...');
    clearInterval(intervalId);
  });

  process.on('SIGTERM', () => {
    logger.info('Stopping scheduled scan checker...');
    clearInterval(intervalId);
  });
}
