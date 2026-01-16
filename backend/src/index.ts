import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from "./server.js";
import { logger } from "./utils/logger.js";

const port = Number(process.env.PORT ?? 3000);

logger.info(`Starting Shenv Backend API on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});