/**
 * Automated Report Generator
 * Generates monthly compliance reports automatically
 */

import { logger } from '../utils/logger.js';
import { db } from '../db/connection.js';
import { users, userSubscriptions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ComplianceReportService } from '../services/compliance-report-service.js';

/**
 * Generate monthly reports for all business tier users
 */
export async function generateMonthlyReports(): Promise<void> {
  logger.info('Generating monthly compliance reports...');

  try {
    // Get all business tier users
    const businessUsers = await db
      .select({
        userId: users.id,
        email: users.email,
        tier: users.tier,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
      .where(
        and(
          eq(users.tier, 'business'),
          eq(userSubscriptions.status, 'active')
        )
      );

    logger.info(`Found ${businessUsers.length} business tier users`);

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1; // 1-12

    for (const user of businessUsers) {
      try {
        logger.info('Generating report', {
          userId: user.userId,
          email: user.email,
          year,
          month,
        });

        // Generate compliance report
        const report = await ComplianceReportService.generateMonthReport(
          user.userId,
          user.email,
          year,
          month
        );

        logger.info('Report generated', {
          userId: user.userId,
          complianceScore: report.executiveSummary.complianceScore,
        });

        // TODO: Email the report to the user
        // await sendReportEmail(user.email, report);
      } catch (error: any) {
        logger.error('Failed to generate report for user', {
          userId: user.userId,
          error: error.message,
        });
      }
    }

    logger.info('Monthly report generation complete');
  } catch (error: any) {
    logger.error('Error generating monthly reports', { error: error.message });
  }
}

/**
 * Start monthly report generator (runs on 1st of each month)
 */
export function startMonthlyReportGenerator(): void {
  logger.info('Starting monthly report generator');

  // Check if it's the 1st of the month and run
  const checkAndRun = () => {
    const now = new Date();
    if (now.getDate() === 1) {
      // First day of month
      generateMonthlyReports();
    }
  };

  // Run check daily at 3 AM
  const checkDaily = () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour === 3) {
      // 3 AM
      checkAndRun();
    }
  };

  // Check every hour
  const intervalId = setInterval(checkDaily, 60 * 60 * 1000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Stopping monthly report generator...');
    clearInterval(intervalId);
  });

  process.on('SIGTERM', () => {
    logger.info('Stopping monthly report generator...');
    clearInterval(intervalId);
  });
}
