/**
 * Email Notification Service
 * Sends email notifications for scans, alerts, and reports
 */

import { logger } from '../utils/logger.js';
import type { ComplianceReport } from './compliance-report-service.js';

/**
 * Email service configuration
 */
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@shenv.com',
  enabled: process.env.EMAIL_ENABLED === 'true',
  // TODO: Add SendGrid/Postmark API key
};

/**
 * Scan complete notification
 */
export async function sendScanCompleteEmail(
  userEmail: string,
  scanResults: {
    assetsFound: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    riskScore: number;
  }
): Promise<void> {
  logger.info('Sending scan complete email', { userEmail });

  const emailBody = `
Hi there,

Your workspace scan is complete!

Results:
- ${scanResults.assetsFound} assets discovered
- ${scanResults.highRiskCount} high-risk items need attention
- ${scanResults.mediumRiskCount} medium-risk items
- ${scanResults.lowRiskCount} low-risk items
- Overall risk score: ${scanResults.riskScore}/100

${scanResults.highRiskCount > 0 ? `
⚠️ You have ${scanResults.highRiskCount} high-risk items that need immediate attention.
` : ''}

View your results: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets

Best regards,
Shenv Team
  `;

  if (EMAIL_CONFIG.enabled) {
    // TODO: Send actual email via SendGrid/Postmark
    logger.info('Email sent', { to: userEmail, subject: 'Scan Complete' });
  } else {
    // Log email instead of sending
    logger.info('EMAIL (disabled)', {
      to: userEmail,
      subject: 'Your Shenv scan is complete!',
      body: emailBody,
    });
  }
}

/**
 * New high-risk items alert
 */
export async function sendHighRiskAlert(
  userEmail: string,
  highRiskAssets: Array<{
    name: string;
    riskScore: number;
    reason: string;
  }>
): Promise<void> {
  logger.info('Sending high-risk alert', { userEmail, count: highRiskAssets.length });

  const assetList = highRiskAssets
    .slice(0, 5) // Top 5
    .map((asset, i) => `${i + 1}. ${asset.name} (Risk: ${asset.riskScore}) - ${asset.reason}`)
    .join('\n');

  const emailBody = `
Hi there,

⚠️ We detected ${highRiskAssets.length} new high-risk items in your workspace:

${assetList}

${highRiskAssets.length > 5 ? `\n...and ${highRiskAssets.length - 5} more.\n` : ''}

These items need immediate attention to secure your workspace.

Review and fix: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets?filter=high-risk

Best regards,
Shenv Team
  `;

  if (EMAIL_CONFIG.enabled) {
    // TODO: Send actual email
    logger.info('Email sent', { to: userEmail, subject: 'High-Risk Alert' });
  } else {
    logger.info('EMAIL (disabled)', {
      to: userEmail,
      subject: `⚠️ ${highRiskAssets.length} new high-risk items detected`,
      body: emailBody,
    });
  }
}

/**
 * Weekly digest email
 */
export async function sendWeeklyDigest(
  userEmail: string,
  weekStats: {
    assetsSecured: number;
    newRisks: number;
    riskScoreChange: number;
    previousScore: number;
    currentScore: number;
  }
): Promise<void> {
  logger.info('Sending weekly digest', { userEmail });

  const trend =
    weekStats.riskScoreChange < 0
      ? `📈 Great job! Your risk score improved by ${Math.abs(weekStats.riskScoreChange)} points.`
      : weekStats.riskScoreChange > 0
      ? `⚠️ Your risk score increased by ${weekStats.riskScoreChange} points.`
      : '➡️ Your risk score stayed the same.';

  const emailBody = `
Hi there,

Here's your weekly workspace security digest:

This week:
✅ ${weekStats.assetsSecured} assets secured
${weekStats.newRisks > 0 ? `⚠️ ${weekStats.newRisks} new risks detected` : '✅ No new risks detected'}
📊 Risk score: ${weekStats.previousScore} → ${weekStats.currentScore}

${trend}

${weekStats.newRisks > 0 ? `
Action needed: Review your ${weekStats.newRisks} new high-risk items
` : ''}

View full report: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/progress

Best regards,
Shenv Team
  `;

  if (EMAIL_CONFIG.enabled) {
    // TODO: Send actual email
    logger.info('Email sent', { to: userEmail, subject: 'Weekly Digest' });
  } else {
    logger.info('EMAIL (disabled)', {
      to: userEmail,
      subject: 'Your weekly workspace security digest',
      body: emailBody,
    });
  }
}

/**
 * Compliance report email (business tier)
 */
export async function sendComplianceReport(
  userEmail: string,
  report: ComplianceReport
): Promise<void> {
  logger.info('Sending compliance report', { userEmail });

  const emailBody = `
Hi there,

Your monthly compliance report is ready!

Executive Summary:
- Compliance Score: ${report.executiveSummary.complianceScore}% ${
    report.executiveSummary.changePercent !== null
      ? `(${report.executiveSummary.changePercent > 0 ? '+' : ''}${report.executiveSummary.changePercent}% from last month)`
      : ''
  }
- Total Assets: ${report.executiveSummary.totalAssets.toLocaleString()}
- High-Risk Items: ${report.executiveSummary.highRiskCount}
- Assets Secured: ${report.executiveSummary.securedThisMonth} this month

${report.executiveSummary.highRiskCount > 0 ? `
⚠️ ${report.executiveSummary.highRiskCount} high-risk items still need attention.
` : '✅ No high-risk items remaining!'}

View full report: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/organization/compliance

Best regards,
Shenv Team
  `;

  if (EMAIL_CONFIG.enabled) {
    // TODO: Send actual email with PDF attachment
    logger.info('Email sent', { to: userEmail, subject: 'Compliance Report' });
  } else {
    logger.info('EMAIL (disabled)', {
      to: userEmail,
      subject: `Monthly Compliance Report - ${report.metadata.reportPeriod.startDate}`,
      body: emailBody,
    });
  }
}

/**
 * Queue position update (for free tier users)
 */
export async function sendQueuePositionUpdate(
  userEmail: string,
  queuePosition: number,
  estimatedWait: number
): Promise<void> {
  logger.info('Sending queue position update', { userEmail, queuePosition });

  const emailBody = `
Hi there,

Your scan is in the queue!

Position: #${queuePosition}
Estimated wait time: ~${estimatedWait} minutes

Want to skip the queue? Upgrade to a paid plan:
${process.env.FRONTEND_URL || 'http://localhost:5173'}/upgrade

Track your position: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/scans/queue

Best regards,
Shenv Team
  `;

  if (EMAIL_CONFIG.enabled) {
    // TODO: Send actual email
    logger.info('Email sent', { to: userEmail, subject: 'Queue Position Update' });
  } else {
    logger.info('EMAIL (disabled)', {
      to: userEmail,
      subject: `Your scan is #${queuePosition} in queue`,
      body: emailBody,
    });
  }
}
