import { logger } from '../utils/logger.js';
import { MonthlyReportRepository } from '../db/repositories/monthly-report.js';
import { AssetRepository } from '../db/repositories/asset.js';
import { WorkspaceUserRepository } from '../db/repositories/workspace-user.js';
import { GovernanceActionRepository } from '../db/repositories/governance-action.js';

interface ReportData {
  // Overview
  totalAssets: number;
  totalWorkspaceUsers: number;
  averageRiskScore: number;

  // Asset Categories
  orphanedAssets: number;
  inactiveAssets: number;
  highRiskAssets: number;

  // Risk Breakdown
  assetsWithAnyoneAccess: number;
  assetsWithDomainAccess: number;
  assetsWithExternalUsers: number;

  // Activity
  governanceActionsCreated: number;
  governanceActionsExecuted: number;
  governanceActionsFailed: number;

  // Top Risks
  topRiskyAssets: Array<{
    assetId: string;
    name: string;
    owner: string;
    riskScore: number;
    reasons: string[];
  }>;

  // Asset Distribution
  assetsByRiskLevel: {
    low: number;      // 0-30
    medium: number;   // 31-60
    high: number;     // 61-100
  };

  // Ownership
  assetsOwnedByUser: number;
  totalUniqueOwners: number;
}

/**
 * Service for generating monthly governance reports
 */
export class ReportGenerationService {
  /**
   * Generate a comprehensive monthly report for a user
   */
  static async generateMonthlyReport(
    userId: number,
    reportMonth: Date
  ): Promise<{ reportId: number; reportData: ReportData }> {
    try {
      logger.info('Generating monthly report', { userId, reportMonth });

      // Format report month as YYYY-MM-DD string
      const reportMonthStr = reportMonth.toISOString().split('T')[0] || reportMonth.toISOString();

      // Check if report already exists for this month
      const existingReport = await MonthlyReportRepository.findByUserAndMonth(
        userId,
        reportMonthStr
      );

      if (existingReport) {
        logger.info('Report already exists for this month', {
          userId,
          reportMonth,
          reportId: existingReport.id,
        });
        return {
          reportId: existingReport.id,
          reportData: existingReport.reportData as ReportData,
        };
      }

      // Gather data
      const { assets: allAssets } = await AssetRepository.findAllByUser(userId, {
        limit: 10000,
      });

      const workspaceUsers = await WorkspaceUserRepository.findAllByUser(userId);

      // Calculate start and end of the month for activity tracking
      const startOfMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth(), 1);
      const endOfMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 0, 23, 59, 59);

      const allActions = await GovernanceActionRepository.findAllByUser(userId);
      const monthActions = allActions.filter(action => {
        const actionDate = new Date(action.createdAt);
        return actionDate >= startOfMonth && actionDate <= endOfMonth;
      });

      // Calculate metrics
      const totalAssets = allAssets.length;
      const totalWorkspaceUsers = workspaceUsers.length;

      const totalRiskScore = allAssets.reduce((sum, asset) => sum + (asset.riskScore || 0), 0);
      const averageRiskScore = totalAssets > 0 ? Math.round(totalRiskScore / totalAssets) : 0;

      const orphanedAssets = allAssets.filter(s => s.isOrphaned).length;
      const inactiveAssets = allAssets.filter(s => s.isInactive).length;
      const highRiskAssets = allAssets.filter(s => (s.riskScore || 0) >= 70).length;

      // Risk breakdown (simplified - in production, fetch actual permission data)
      const assetsWithAnyoneAccess = allAssets.filter(s => (s.riskScore || 0) >= 40).length;
      const assetsWithDomainAccess = allAssets.filter(s => (s.riskScore || 0) >= 25).length;
      const assetsWithExternalUsers = allAssets.filter(s => (s.riskScore || 0) >= 20).length;

      // Governance activity
      const governanceActionsCreated = monthActions.length;
      const governanceActionsExecuted = monthActions.filter(a => a.status === 'executed').length;
      const governanceActionsFailed = monthActions.filter(a => a.status === 'failed').length;

      // Top risky assets
      const topRiskyAssets = allAssets
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, 10)
        .map(asset => ({
          assetId: asset.externalId,
          name: asset.name,
          owner: asset.ownerEmail,
          riskScore: asset.riskScore || 0,
          reasons: this.getRiskReasons(asset.riskScore || 0, asset.isOrphaned || false, asset.isInactive || false),
        }));

      // Asset distribution by risk level
      const assetsByRiskLevel = {
        low: allAssets.filter(s => (s.riskScore || 0) <= 30).length,
        medium: allAssets.filter(s => (s.riskScore || 0) > 30 && (s.riskScore || 0) <= 60).length,
        high: allAssets.filter(s => (s.riskScore || 0) > 60).length,
      };

      // Ownership (simplified - would need to fetch user email to match properly)
      const uniqueOwners = new Set(allAssets.map(s => s.ownerEmail)).size;

      const reportData: ReportData = {
        totalAssets,
        totalWorkspaceUsers,
        averageRiskScore,
        orphanedAssets,
        inactiveAssets,
        highRiskAssets,
        assetsWithAnyoneAccess,
        assetsWithDomainAccess,
        assetsWithExternalUsers,
        governanceActionsCreated,
        governanceActionsExecuted,
        governanceActionsFailed,
        topRiskyAssets,
        assetsByRiskLevel,
        assetsOwnedByUser: 0, // Would need user email to calculate
        totalUniqueOwners: uniqueOwners,
      };

      // Create report
      const report = await MonthlyReportRepository.create({
        userId,
        reportMonth: reportMonthStr,
        reportData: reportData as any,
      });

      logger.info('Monthly report generated successfully', {
        userId,
        reportMonth,
        reportId: report.id,
        totalAssets,
      });

      return {
        reportId: report.id,
        reportData,
      };
    } catch (error: any) {
      logger.error('Failed to generate monthly report', { userId, reportMonth, error });
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate reports for all users for a specific month
   */
  static async generateReportsForAllUsers(_reportMonth: Date): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ userId: number; error: string }>;
  }> {
    // This would need a way to get all user IDs
    // For now, just return structure
    logger.info('Batch report generation not yet implemented');
    return {
      successful: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Get risk reasons based on score and flags
   */
  private static getRiskReasons(
    riskScore: number,
    isOrphaned: boolean,
    isInactive: boolean
  ): string[] {
    const reasons: string[] = [];

    if (riskScore >= 40) {
      reasons.push('Public access (anyone with link)');
    }
    if (riskScore >= 25) {
      reasons.push('Domain-wide access');
    }
    if (riskScore >= 20) {
      reasons.push('External users outside workspace');
    }
    if (isOrphaned) {
      reasons.push('Orphaned (owner not in workspace)');
    }
    if (isInactive) {
      reasons.push('Inactive (6+ months)');
    }
    if (riskScore >= 15) {
      reasons.push('External editors or owners');
    }
    if (riskScore >= 10) {
      reasons.push('High number of users');
    }

    return reasons.length > 0 ? reasons : ['Low risk'];
  }

  /**
   * Compare two months' reports
   */
  static async compareReports(
    userId: number,
    month1: Date,
    month2: Date
  ): Promise<{
    month1Data: ReportData | null;
    month2Data: ReportData | null;
    changes: {
      totalSheetsDelta: number;
      riskScoreDelta: number;
      orphanedSheetsDelta: number;
      highRiskSheetsDelta: number;
      actionsDelta: number;
    };
  }> {
    const report1 = await MonthlyReportRepository.findByUserAndMonth(userId, month1.toISOString().split('T')[0] || month1.toISOString());
    const report2 = await MonthlyReportRepository.findByUserAndMonth(userId, month2.toISOString().split('T')[0] || month2.toISOString());

    const data1 = report1?.reportData as ReportData | null;
    const data2 = report2?.reportData as ReportData | null;

    if (!data1 || !data2) {
      return {
        month1Data: data1,
        month2Data: data2,
        changes: {
          totalSheetsDelta: 0,
          riskScoreDelta: 0,
          orphanedSheetsDelta: 0,
          highRiskSheetsDelta: 0,
          actionsDelta: 0,
        },
      };
    }

    return {
      month1Data: data1,
      month2Data: data2,
      changes: {
        totalSheetsDelta: data2.totalAssets - data1.totalAssets,
        riskScoreDelta: data2.averageRiskScore - data1.averageRiskScore,
        orphanedSheetsDelta: data2.orphanedAssets - data1.orphanedAssets,
        highRiskSheetsDelta: data2.highRiskAssets - data1.highRiskAssets,
        actionsDelta: data2.governanceActionsExecuted - data1.governanceActionsExecuted,
      },
    };
  }

  /**
   * Get report summary for display
   */
  static async getReportSummary(reportId: number): Promise<{
    report: any;
    highlights: string[];
    recommendations: string[];
  }> {
    const report = await MonthlyReportRepository.findById(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    const data = report.reportData as ReportData;

    // Generate highlights
    const highlights: string[] = [];
    if (data.highRiskAssets > 0) {
      highlights.push(`${data.highRiskAssets} high-risk assets identified`);
    }
    if (data.orphanedAssets > 0) {
      highlights.push(`${data.orphanedAssets} orphaned assets found`);
    }
    if (data.governanceActionsExecuted > 0) {
      highlights.push(`${data.governanceActionsExecuted} governance actions executed`);
    }
    if (data.averageRiskScore < 30) {
      highlights.push('Overall low risk profile');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (data.assetsWithAnyoneAccess > 0) {
      recommendations.push(
        `Review ${data.assetsWithAnyoneAccess} assets with public access`
      );
    }
    if (data.orphanedAssets > 0) {
      recommendations.push(
        `Transfer ownership of ${data.orphanedAssets} orphaned assets`
      );
    }
    if (data.inactiveAssets > 10) {
      recommendations.push(
        `Consider archiving ${data.inactiveAssets} inactive assets`
      );
    }
    if (data.highRiskAssets > 5) {
      recommendations.push('Prioritize governance actions for high-risk assets');
    }

    return {
      report: {
        id: report.id,
        userId: report.userId,
        reportMonth: report.reportMonth,
        generatedAt: report.generatedAt,
        data,
      },
      highlights,
      recommendations,
    };
  }
}
