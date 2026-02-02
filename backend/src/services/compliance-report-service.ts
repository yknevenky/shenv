/**
 * Compliance Report Service
 * Business-tier compliance report generation
 */

import { logger } from '../utils/logger.js';
import { OrganizationService } from './organization-service.js';
import { db } from '../db/connection.js';
import { assets, scanHistory, governanceActions } from '../db/schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

/**
 * Compliance report data structure
 */
export interface ComplianceReport {
  metadata: {
    organizationEmail: string;
    reportPeriod: {
      startDate: string;
      endDate: string;
    };
    generatedAt: string;
  };
  executiveSummary: {
    totalAssets: number;
    totalUsers: number;
    complianceScore: number; // 0-100 (inverse of risk)
    previousComplianceScore: number | null;
    changePercent: number | null;
    highRiskCount: number;
    securedThisMonth: number;
  };
  riskBreakdown: {
    high: number;
    medium: number;
    low: number;
    highPercent: number;
    mediumPercent: number;
    lowPercent: number;
  };
  departmentBreakdown: Array<{
    department: string;
    totalAssets: number;
    highRiskCount: number;
    complianceScore: number;
  }>;
  topRisks: Array<{
    name: string;
    type: string;
    ownerEmail: string;
    department: string | null;
    riskScore: number;
    riskFactors: string[];
  }>;
  remediationActivity: {
    actionsCreated: number;
    actionsExecuted: number;
    actionsFailed: number;
    assetsSecured: number;
  };
  monthOverMonth: {
    assetsChange: number;
    highRiskChange: number;
    complianceScoreChange: number;
  } | null;
}

export class ComplianceReportService {
  /**
   * Generate compliance report for a specific month
   */
  static async generateReport(
    userId: number,
    startDate: Date,
    endDate: Date,
    userEmail: string
  ): Promise<ComplianceReport> {
    logger.info('Generating compliance report', { userId, startDate, endDate });

    // Get organization overview
    const overview = await OrganizationService.getOrganizationOverview(userId);

    // Get department breakdown
    const departments = await OrganizationService.getDepartmentStats(userId);

    // Calculate compliance score (inverse of risk, 0-100 scale)
    const complianceScore = overview.totalAssets > 0
      ? Math.round(((overview.totalAssets - overview.riskBreakdown.high) / overview.totalAssets) * 100)
      : 100;

    // Get previous month's compliance score for comparison
    const previousMonthStart = new Date(startDate);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    const previousMonthEnd = new Date(endDate);
    previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1);

    let previousComplianceScore: number | null = null;
    let changePercent: number | null = null;

    try {
      const previousScan = await db
        .select({
          highRiskCount: scanHistory.highRiskCount,
          assetsFound: scanHistory.assetsFound,
        })
        .from(scanHistory)
        .where(
          and(
            eq(scanHistory.userId, userId),
            gte(scanHistory.completedAt, previousMonthStart),
            lte(scanHistory.completedAt, previousMonthEnd)
          )
        )
        .orderBy(desc(scanHistory.completedAt))
        .limit(1);

      if (previousScan.length > 0 && previousScan[0].assetsFound > 0) {
        previousComplianceScore = Math.round(
          ((previousScan[0].assetsFound - previousScan[0].highRiskCount) / previousScan[0].assetsFound) * 100
        );
        changePercent = complianceScore - previousComplianceScore;
      }
    } catch (err) {
      logger.warn('Could not fetch previous compliance score', err);
    }

    // Get remediation activity for the period
    const actionsInPeriod = await db
      .select()
      .from(governanceActions)
      .where(
        and(
          eq(governanceActions.userId, userId),
          gte(governanceActions.createdAt, startDate),
          lte(governanceActions.createdAt, endDate)
        )
      );

    const remediationActivity = {
      actionsCreated: actionsInPeriod.length,
      actionsExecuted: actionsInPeriod.filter(a => a.status === 'executed').length,
      actionsFailed: actionsInPeriod.filter(a => a.status === 'failed').length,
      assetsSecured: actionsInPeriod.filter(a => a.status === 'executed').length, // Approximation
    };

    // Get top 10 risky assets with details
    const topRiskyAssets = await db
      .select({
        name: assets.name,
        type: assets.assetType,
        ownerEmail: assets.ownerEmail,
        riskScore: assets.riskScore,
        isOrphaned: assets.isOrphaned,
        isInactive: assets.isInactive,
        permissionCount: assets.permissionCount,
      })
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.riskScore))
      .limit(10);

    // Get department for each asset owner
    const topRisks = await Promise.all(
      topRiskyAssets.map(async (asset) => {
        const dept = departments.find(d =>
          d.department === asset.ownerEmail.split('@')[0] // Simple heuristic
        );

        // Determine risk factors
        const riskFactors: string[] = [];
        if (asset.riskScore >= 40) riskFactors.push('Public access');
        if (asset.isOrphaned) riskFactors.push('Owner left company');
        if (asset.isInactive) riskFactors.push('Inactive for 6+ months');
        if (asset.permissionCount && asset.permissionCount >= 50) riskFactors.push('Shared with 50+ users');

        return {
          name: asset.name,
          type: asset.type || 'unknown',
          ownerEmail: asset.ownerEmail,
          department: dept?.department || null,
          riskScore: asset.riskScore || 0,
          riskFactors,
        };
      })
    );

    // Calculate month-over-month changes
    let monthOverMonth: ComplianceReport['monthOverMonth'] = null;
    if (previousComplianceScore !== null) {
      // Get previous month's stats
      const prevScan = await db
        .select({
          assetsFound: scanHistory.assetsFound,
          highRiskCount: scanHistory.highRiskCount,
        })
        .from(scanHistory)
        .where(
          and(
            eq(scanHistory.userId, userId),
            gte(scanHistory.completedAt, previousMonthStart),
            lte(scanHistory.completedAt, previousMonthEnd)
          )
        )
        .orderBy(desc(scanHistory.completedAt))
        .limit(1);

      if (prevScan.length > 0) {
        monthOverMonth = {
          assetsChange: overview.totalAssets - prevScan[0].assetsFound,
          highRiskChange: overview.riskBreakdown.high - prevScan[0].highRiskCount,
          complianceScoreChange: changePercent || 0,
        };
      }
    }

    return {
      metadata: {
        organizationEmail: userEmail,
        reportPeriod: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        generatedAt: new Date().toISOString(),
      },
      executiveSummary: {
        totalAssets: overview.totalAssets,
        totalUsers: overview.totalUsers,
        complianceScore,
        previousComplianceScore,
        changePercent,
        highRiskCount: overview.riskBreakdown.high,
        securedThisMonth: remediationActivity.assetsSecured,
      },
      riskBreakdown: {
        high: overview.riskBreakdown.high,
        medium: overview.riskBreakdown.medium,
        low: overview.riskBreakdown.low,
        highPercent: overview.riskPercentages.high,
        mediumPercent: overview.riskPercentages.medium,
        lowPercent: overview.riskPercentages.low,
      },
      departmentBreakdown: departments.map(d => ({
        department: d.department,
        totalAssets: d.assetCount,
        highRiskCount: d.highRiskCount,
        complianceScore: d.assetCount > 0
          ? Math.round(((d.assetCount - d.highRiskCount) / d.assetCount) * 100)
          : 100,
      })),
      topRisks,
      remediationActivity,
      monthOverMonth,
    };
  }

  /**
   * Generate report for current month
   */
  static async generateCurrentMonthReport(userId: number, userEmail: string): Promise<ComplianceReport> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.generateReport(userId, startDate, endDate, userEmail);
  }

  /**
   * Generate report for a specific month
   */
  static async generateMonthReport(
    userId: number,
    userEmail: string,
    year: number,
    month: number // 1-12
  ): Promise<ComplianceReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return this.generateReport(userId, startDate, endDate, userEmail);
  }
}
