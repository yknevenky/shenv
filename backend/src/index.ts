import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from "./server.js";
import { logger } from "./utils/logger.js";
import { startScanWorker } from "./workers/scan-worker.js";
import { startScheduledScanChecker } from "./workers/scheduled-scans.js";
import { startMonthlyReportGenerator } from "./workers/report-generator.js";

const port = Number(process.env.PORT ?? 3000);

logger.info(`Starting Shenv Backend API on http://localhost:${port}`);

// Start background workers
logger.info("Starting background scan worker...");
startScanWorker();

logger.info("Starting scheduled scan checker...");
startScheduledScanChecker();

logger.info("Starting monthly report generator...");
startMonthlyReportGenerator();

serve({
  fetch: app.fetch,
  port,
});