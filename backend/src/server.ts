import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import assetsRouter from "./routes/assets.js";
import platformsRouter from "./routes/platforms.js";
import { authRouter } from "./routes/auth.js";
import { governanceRouter } from "./routes/governance.js";
import { approvalsRouter } from "./routes/approvals.js";
import { reportsRouter } from "./routes/reports.js";
import gmailRouter from "./routes/gmail.js";
import { connectToDatabase } from "./db/connection.js";
import { logger } from "./utils/logger.js";
import type { HealthResponse, ErrorResponse } from "./types/index.js";

const app = new Hono();

// Middleware
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect to PostgreSQL on startup
try {
  await connectToDatabase();
  logger.info("PostgreSQL connected successfully");
} catch (error) {
  logger.error("Failed to connect to PostgreSQL", error);
  logger.warn("Server starting without database connection");
}

// Health check
app.get("/health", (c) => {
  const response: HealthResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
    service: "shenv-backend",
  };
  return c.json(response);
});

// API Routes
app.route("/auth", authRouter);

// Platform-agnostic routes (authentication middleware applied in route files)
app.route("/api/platforms", platformsRouter);
app.route("/api/assets", assetsRouter);

app.route("/governance", governanceRouter);
app.route("/approvals", approvalsRouter);
app.route("/reports", reportsRouter);

// Gmail email management routes
app.route("/api/gmail", gmailRouter);

// 404 handler
app.notFound((c) => {
  const errorResponse: ErrorResponse = {
    error: true,
    message: "Route not found",
    code: "NOT_FOUND",
  };
  return c.json(errorResponse, 404);
});

// Global error handler
app.onError((err, c) => {
  logger.error("Unhandled error", err);

  const errorResponse: ErrorResponse = {
    error: true,
    message: err.message || "Internal Server Error",
    code: "INTERNAL_SERVER_ERROR",
  };

  return c.json(errorResponse, 500);
});

export default app;
