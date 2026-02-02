/**
 * Organization Routes
 * Business-tier endpoints for organization-wide analytics
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { OrganizationService } from '../services/organization-service.js';
import { ComplianceReportService } from '../services/compliance-report-service.js';
import { requireTier } from '../middleware/tier-validator.js';

const organization = new Hono();

/**
 * GET /api/organization/overview
 * Get organization-wide overview statistics
 * @tier business
 */
organization.get('/overview', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const overview = await OrganizationService.getOrganizationOverview(user.id);

    return c.json({
      success: true,
      overview,
    });
  } catch (error: any) {
    console.error('Error fetching organization overview:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to fetch organization overview',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/departments
 * Get risk breakdown by department
 * @tier business
 */
organization.get('/departments', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const departments = await OrganizationService.getDepartmentStats(user.id);

    return c.json({
      success: true,
      departments,
      total: departments.length,
    });
  } catch (error: any) {
    console.error('Error fetching department stats:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to fetch department statistics',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/departments/list
 * Get list of all departments
 * @tier business
 */
organization.get('/departments/list', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const departments = await OrganizationService.getDepartments(user.id);

    return c.json({
      success: true,
      departments,
    });
  } catch (error: any) {
    console.error('Error fetching departments list:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to fetch departments',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/risk-contributors
 * Get top users with most high-risk assets
 * @tier business
 */
organization.get('/risk-contributors', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const limit = Number(c.req.query('limit')) || 10;
    const contributors = await OrganizationService.getTopRiskContributors(user.id, limit);

    return c.json({
      success: true,
      contributors,
      total: contributors.length,
    });
  } catch (error: any) {
    console.error('Error fetching risk contributors:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to fetch risk contributors',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/users/:email
 * Get detailed statistics for a specific user
 * @tier business
 */
organization.get('/users/:email', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const userEmail = c.req.param('email');

    const userDetail = await OrganizationService.getUserDetail(user.id, userEmail);

    if (!userDetail) {
      return c.json(
        {
          error: true,
          message: 'User not found in organization',
        },
        404
      );
    }

    return c.json({
      success: true,
      user: userDetail,
    });
  } catch (error: any) {
    console.error('Error fetching user detail:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to fetch user details',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/departments/:department/users
 * Get users in a specific department
 * @tier business
 */
organization.get('/departments/:department/users', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const department = c.req.param('department');

    const users = await OrganizationService.getUsersByDepartment(user.id, department);

    return c.json({
      success: true,
      department,
      users,
      total: users.length,
    });
  } catch (error: any) {
    console.error('Error fetching department users:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to fetch department users',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/compliance/current
 * Generate compliance report for current month
 * @tier business
 */
organization.get('/compliance/current', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const report = await ComplianceReportService.generateCurrentMonthReport(user.id, user.email);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating compliance report:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to generate compliance report',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/organization/compliance/:year/:month
 * Generate compliance report for specific month
 * @tier business
 */
organization.get('/compliance/:year/:month', requireTier('business'), async (c: Context) => {
  try {
    const user = c.get('user');
    const year = parseInt(c.req.param('year'));
    const month = parseInt(c.req.param('month'));

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return c.json(
        {
          error: true,
          message: 'Invalid year or month parameter',
        },
        400
      );
    }

    const report = await ComplianceReportService.generateMonthReport(user.id, user.email, year, month);

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating compliance report:', error);
    return c.json(
      {
        error: true,
        message: 'Failed to generate compliance report',
        details: error.message,
      },
      500
    );
  }
});

export { organization };
