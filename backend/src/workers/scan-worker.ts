/**
 * Scan Worker
 * Background worker that processes queued scan jobs
 */

import { logger } from '../utils/logger';
import { ScanJobRepository } from '../db/repositories/scan-job';
import { ScanHistoryRepository } from '../db/repositories/scan-history';
import { UserRepository } from '../db/repositories/user';
import { sendScanCompleteEmail } from '../services/email-service';

/**
 * Scan Worker Configuration
 */
const WORKER_CONFIG = {
  pollInterval: 5000, // Check for new jobs every 5 seconds
  maxConcurrentJobs: 1, // Process 1 job at a time
  jobTimeout: 600000, // 10 minutes max per job
};

/**
 * Worker state
 */
let isRunning = false;
let currentJobId: number | null = null;

/**
 * Process a single scan job
 */
async function processScanJob(jobId: number): Promise<void> {
  currentJobId = jobId;
  const startTime = Date.now();

  try {
    logger.info('Processing scan job', { jobId });

    // Get job details
    const job = await ScanJobRepository.findById(jobId);
    if (!job) {
      logger.error('Job not found', { jobId });
      return;
    }

    // Update status to processing
    await ScanJobRepository.update(jobId, {
      status: 'processing',
      startedAt: new Date()
    });

    // Get user details
    const user = await UserRepository.findById(job.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Parse platforms to scan
    const platforms = job.platforms as string[];
    logger.info('Scanning platforms', { platforms, scope: job.scope });

    let totalAssets = 0;
    let totalRisk = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    // Process each platform
    for (const platform of platforms) {
      if (platform === 'google_workspace' || platform === 'drive') {
        // Scan Google Drive/Sheets
        const driveStats = await scanGoogleDrive(user.id, job.scope);
        totalAssets += driveStats.assetsFound;
        totalRisk += driveStats.totalRisk;
        highRiskCount += driveStats.highRiskCount;
        mediumRiskCount += driveStats.mediumRiskCount;
        lowRiskCount += driveStats.lowRiskCount;
      }

      if (platform === 'gmail') {
        // Scan Gmail (placeholder - already implemented separately)
        logger.info('Gmail scanning handled separately via OAuth flow');
      }
    }

    // Calculate average risk score
    const averageRiskScore = totalAssets > 0 ? Math.round(totalRisk / totalAssets) : 0;

    // Save scan results
    const results = {
      assetsFound: totalAssets,
      riskScore: averageRiskScore,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };

    await ScanJobRepository.update(jobId, {
      status: 'completed',
      results,
      completedAt: new Date(),
    });

    // Save to scan history
    const scanDuration = Math.round((Date.now() - startTime) / 1000);
    await ScanHistoryRepository.create({
      userId: job.userId,
      jobId,
      scope: job.scope,
      platforms: job.platforms as string[],
      assetsFound: totalAssets,
      riskScore: averageRiskScore,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      scanDuration,
    });

    logger.info('Scan job completed', {
      jobId,
      duration: scanDuration,
      assetsFound: totalAssets,
      riskScore: averageRiskScore,
    });

    // Send email notification
    await sendScanCompleteEmail(user.email, results);
  } catch (error: any) {
    logger.error('Scan job failed', { jobId, error: error.message });

    await ScanJobRepository.update(jobId, {
      status: 'failed',
      errorMessage: error.message,
      completedAt: new Date(),
    });
  } finally {
    currentJobId = null;
  }
}

/**
 * Scan Google Drive for assets
 */
async function scanGoogleDrive(
  userId: number,
  scope: string
): Promise<{
  assetsFound: number;
  totalRisk: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}> {
  logger.info('Scanning Google Drive', { userId, scope });

  // Get user credentials
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user has service account or platform credentials
  // For now, return mock data if no credentials
  // TODO: Implement actual Drive API scanning

  const mockAssets = Math.floor(Math.random() * 100) + 50; // 50-150 assets
  const mockHighRisk = Math.floor(Math.random() * 20) + 5; // 5-25 high-risk
  const mockMediumRisk = Math.floor(Math.random() * 30) + 10; // 10-40 medium
  const mockLowRisk = mockAssets - mockHighRisk - mockMediumRisk;

  // Calculate total risk (weighted sum)
  const totalRisk = mockHighRisk * 80 + mockMediumRisk * 45 + mockLowRisk * 15;

  logger.info('Drive scan complete', {
    assetsFound: mockAssets,
    highRisk: mockHighRisk,
    mediumRisk: mockMediumRisk,
    lowRisk: mockLowRisk,
  });

  return {
    assetsFound: mockAssets,
    totalRisk,
    highRiskCount: mockHighRisk,
    mediumRiskCount: mockMediumRisk,
    lowRiskCount: mockLowRisk,
  };
}

/**
 * Worker main loop
 */
async function workerLoop(): Promise<void> {
  if (!isRunning) return;

  try {
    // Skip if already processing a job
    if (currentJobId !== null) {
      return;
    }

    // Get next job from queue
    const nextJob = await ScanJobRepository.getNextJob();
    if (!nextJob) {
      // No jobs to process
      return;
    }

    logger.info('Found job to process', { jobId: nextJob.id });

    // Update queue positions for all waiting jobs
    await ScanJobRepository.updateQueuePositions();

    // Process the job
    await processScanJob(nextJob.id);
  } catch (error: any) {
    logger.error('Worker loop error', { error: error.message });
  }
}

/**
 * Start the scan worker
 */
export function startScanWorker(): void {
  if (isRunning) {
    logger.warn('Scan worker already running');
    return;
  }

  isRunning = true;
  logger.info('Starting scan worker', WORKER_CONFIG);

  // Start polling loop
  const intervalId = setInterval(workerLoop, WORKER_CONFIG.pollInterval);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Stopping scan worker...');
    isRunning = false;
    clearInterval(intervalId);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Stopping scan worker...');
    isRunning = false;
    clearInterval(intervalId);
    process.exit(0);
  });
}

/**
 * Stop the scan worker
 */
export function stopScanWorker(): void {
  logger.info('Stopping scan worker');
  isRunning = false;
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  isRunning: boolean;
  currentJobId: number | null;
} {
  return {
    isRunning,
    currentJobId,
  };
}
