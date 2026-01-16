/**
 * Monthly Reports API Routes
 * Handles HTTP endpoints for report generation and retrieval
 */

import { Hono } from 'hono';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { MonthlyReportRepository } from '../db/repositories/monthly-report.js';
import { ReportGenerationService } from '../services/report-generation-service.js';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/index.js';

export const reportsRouter = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes
reportsRouter.use('*', jwtMiddleware, attachUser);

/**
 * POST /reports/monthly/generate
 * Generate a monthly report for a specific month
 */
reportsRouter.post('/monthly/generate', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const body = await c.req.json();
    const { month, year } = body;

    if (!month || !year) {
      return c.json({
        error: true,
        message: 'Missing required fields: month (1-12), year',
      }, 400);
    }

    // Validate month
    if (month < 1 || month > 12) {
      return c.json({
        error: true,
        message: 'Invalid month. Must be between 1 and 12',
      }, 400);
    }

    // Create report month date (first day of the month)
    const reportMonth = new Date(year, month - 1, 1);

    logger.info('Generating monthly report', { userId, reportMonth });

    const { reportId, reportData } = await ReportGenerationService.generateMonthlyReport(
      userId,
      reportMonth
    );

    return c.json({
      success: true,
      reportId,
      reportMonth: reportMonth.toISOString(),
      message: 'Report generated successfully',
      data: reportData,
    }, 201);
  } catch (error: any) {
    logger.error('Error generating monthly report', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to generate monthly report',
      code: 'GENERATE_REPORT_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /reports/monthly
 * List all monthly reports for the user
 */
reportsRouter.get('/monthly', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const limit = parseInt(c.req.query('limit') || '12');
    const offset = parseInt(c.req.query('offset') || '0');

    logger.info('GET /reports/monthly', { userId, limit, offset });

    const { reports, total } = await MonthlyReportRepository.findAllByUser(userId, {
      limit,
      offset,
    });

    return c.json({
      reports: reports.map(r => ({
        id: r.id,
        reportMonth: r.reportMonth,
        generatedAt: r.generatedAt,
        summary: {
          totalSheets: (r.reportData as any)?.totalSheets || 0,
          averageRiskScore: (r.reportData as any)?.averageRiskScore || 0,
          highRiskSheets: (r.reportData as any)?.highRiskSheets || 0,
          governanceActionsExecuted: (r.reportData as any)?.governanceActionsExecuted || 0,
        },
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('Error listing monthly reports', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to list monthly reports',
      code: 'LIST_REPORTS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /reports/monthly/latest
 * Get the latest monthly report for the user
 */
reportsRouter.get('/monthly/latest', async (c) => {
  try {
    const userId = c.get('userId') as number;

    logger.info('GET /reports/monthly/latest', { userId });

    const report = await MonthlyReportRepository.findLatestByUser(userId);

    if (!report) {
      return c.json({
        error: true,
        message: 'No reports found. Generate your first report.',
        code: 'NO_REPORTS_FOUND',
      }, 404);
    }

    const summary = await ReportGenerationService.getReportSummary(report.id);

    return c.json(summary);
  } catch (error: any) {
    logger.error('Error getting latest report', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get latest report',
      code: 'GET_LATEST_REPORT_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /reports/monthly/:id
 * Get a specific monthly report with full details
 */
reportsRouter.get('/monthly/:id', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const reportId = parseInt(c.req.param('id'));

    logger.info('GET /reports/monthly/:id', { userId, reportId });

    const report = await MonthlyReportRepository.findById(reportId);

    if (!report) {
      return c.json({
        error: true,
        message: 'Report not found',
        code: 'REPORT_NOT_FOUND',
      }, 404);
    }

    if (report.userId !== userId) {
      return c.json({
        error: true,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }, 403);
    }

    const summary = await ReportGenerationService.getReportSummary(reportId);

    return c.json(summary);
  } catch (error: any) {
    logger.error('Error getting monthly report', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get monthly report',
      code: 'GET_REPORT_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /reports/monthly/compare
 * Compare two monthly reports
 */
reportsRouter.get('/monthly/compare', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const month1 = c.req.query('month1'); // Format: YYYY-MM
    const month2 = c.req.query('month2'); // Format: YYYY-MM

    if (!month1 || !month2) {
      return c.json({
        error: true,
        message: 'Missing required query parameters: month1, month2 (format: YYYY-MM)',
      }, 400);
    }

    // Parse dates
    const parts1 = month1.split('-').map(Number);
    const parts2 = month2.split('-').map(Number);

    if (parts1.length !== 2 || parts2.length !== 2) {
      return c.json({
        error: true,
        message: 'Invalid date format. Expected format: YYYY-MM',
      }, 400);
    }

    const [year1, m1] = parts1 as [number, number];
    const [year2, m2] = parts2 as [number, number];

    const date1 = new Date(year1, m1 - 1, 1);
    const date2 = new Date(year2, m2 - 1, 1);

    logger.info('Comparing monthly reports', { userId, month1, month2 });

    const comparison = await ReportGenerationService.compareReports(userId, date1, date2);

    return c.json({
      month1: month1,
      month2: month2,
      comparison,
    });
  } catch (error: any) {
    logger.error('Error comparing monthly reports', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to compare monthly reports',
      code: 'COMPARE_REPORTS_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * GET /reports/summary
 * Get overall report summary for the user
 */
reportsRouter.get('/summary', async (c) => {
  try {
    const userId = c.get('userId') as number;

    logger.info('GET /reports/summary', { userId });

    const summary = await MonthlyReportRepository.getUserSummary(userId);

    return c.json({
      totalReports: summary.totalReports,
      latestReportMonth: summary.latestReport?.reportMonth || null,
      averageSheetsPerMonth: Math.round(summary.averageSheetsPerMonth),
      averageRiskScore: Math.round(summary.averageRiskScore),
    });
  } catch (error: any) {
    logger.error('Error getting report summary', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to get report summary',
      code: 'GET_SUMMARY_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});

/**
 * DELETE /reports/monthly/:id
 * Delete a monthly report
 */
reportsRouter.delete('/monthly/:id', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const reportId = parseInt(c.req.param('id'));

    logger.info('DELETE /reports/monthly/:id', { userId, reportId });

    const report = await MonthlyReportRepository.findById(reportId);

    if (!report) {
      return c.json({
        error: true,
        message: 'Report not found',
        code: 'REPORT_NOT_FOUND',
      }, 404);
    }

    if (report.userId !== userId) {
      return c.json({
        error: true,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }, 403);
    }

    await MonthlyReportRepository.delete(reportId);

    return c.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting monthly report', error);

    const errorResponse: ErrorResponse = {
      error: true,
      message: error.message || 'Failed to delete monthly report',
      code: 'DELETE_REPORT_ERROR',
    };

    return c.json(errorResponse, 500);
  }
});
