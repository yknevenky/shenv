/**
 * Organization Service
 * Provides business-tier organization-wide analytics and reporting
 */

import { eq, and, sql, desc, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { assets, workspaceUsers, scanHistory } from '../db/schema.js';

/**
 * Organization overview statistics
 */
export interface OrganizationOverview {
  totalUsers: number;
  totalAssets: number;
  lastScanDate: Date | null;
  riskBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  riskPercentages: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Department statistics
 */
export interface DepartmentStats {
  department: string;
  userCount: number;
  assetCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
}

/**
 * Top risk contributor
 */
export interface RiskContributor {
  email: string;
  fullName: string | null;
  department: string | null;
  totalAssets: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
}

/**
 * User detail with asset statistics
 */
export interface UserDetail {
  email: string;
  fullName: string | null;
  department: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  totalAssets: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
  recentActivity: {
    filesCreatedThisWeek: number;
    publicFiles: number;
    externalShares: number;
  };
}

export class OrganizationService {
  /**
   * Get organization overview for business admin
   */
  static async getOrganizationOverview(userId: number): Promise<OrganizationOverview> {
    // Get total users
    const usersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.userId, userId));
    const totalUsers = Number(usersResult[0]?.count || 0);

    // Get total assets
    const assetsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(eq(assets.userId, userId));
    const totalAssets = Number(assetsResult[0]?.count || 0);

    // Get risk breakdown
    const riskBreakdown = await db
      .select({
        high: sql<number>`count(*) filter (where ${assets.riskScore} >= 61)`,
        medium: sql<number>`count(*) filter (where ${assets.riskScore} >= 31 and ${assets.riskScore} < 61)`,
        low: sql<number>`count(*) filter (where ${assets.riskScore} < 31)`,
      })
      .from(assets)
      .where(eq(assets.userId, userId));

    const high = Number(riskBreakdown[0]?.high || 0);
    const medium = Number(riskBreakdown[0]?.medium || 0);
    const low = Number(riskBreakdown[0]?.low || 0);

    // Get last scan date
    const lastScanResult = await db
      .select({ completedAt: scanHistory.completedAt })
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId))
      .orderBy(desc(scanHistory.completedAt))
      .limit(1);
    const lastScanDate = lastScanResult[0]?.completedAt || null;

    return {
      totalUsers,
      totalAssets,
      lastScanDate,
      riskBreakdown: { high, medium, low },
      riskPercentages: {
        high: totalAssets > 0 ? Math.round((high / totalAssets) * 100) : 0,
        medium: totalAssets > 0 ? Math.round((medium / totalAssets) * 100) : 0,
        low: totalAssets > 0 ? Math.round((low / totalAssets) * 100) : 0,
      },
    };
  }

  /**
   * Get risk breakdown by department
   */
  static async getDepartmentStats(userId: number): Promise<DepartmentStats[]> {
    // Group workspace users by department
    const departmentUsers = await db
      .select({
        department: workspaceUsers.department,
        userCount: sql<number>`count(distinct ${workspaceUsers.email})`,
      })
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.userId, userId),
          sql`${workspaceUsers.department} is not null`
        )
      )
      .groupBy(workspaceUsers.department);

    const stats: DepartmentStats[] = [];

    for (const dept of departmentUsers) {
      if (!dept.department) continue;

      // Get all users in this department
      const deptUsersEmails = await db
        .select({ email: workspaceUsers.email })
        .from(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.userId, userId),
            eq(workspaceUsers.department, dept.department)
          )
        );

      const emails = deptUsersEmails.map(u => u.email);

      if (emails.length === 0) continue;

      // Get asset statistics for department users
      const assetStats = await db
        .select({
          total: sql<number>`count(*)`,
          high: sql<number>`count(*) filter (where ${assets.riskScore} >= 61)`,
          medium: sql<number>`count(*) filter (where ${assets.riskScore} >= 31 and ${assets.riskScore} < 61)`,
          low: sql<number>`count(*) filter (where ${assets.riskScore} < 31)`,
          avgRisk: sql<number>`avg(${assets.riskScore})`,
        })
        .from(assets)
        .where(
          and(
            eq(assets.userId, userId),
            sql`${assets.ownerEmail} = ANY(${emails})`
          )
        );

      stats.push({
        department: dept.department,
        userCount: Number(dept.userCount),
        assetCount: Number(assetStats[0]?.total || 0),
        highRiskCount: Number(assetStats[0]?.high || 0),
        mediumRiskCount: Number(assetStats[0]?.medium || 0),
        lowRiskCount: Number(assetStats[0]?.low || 0),
        averageRiskScore: Math.round(Number(assetStats[0]?.avgRisk || 0)),
      });
    }

    // Sort by high risk count descending
    return stats.sort((a, b) => b.highRiskCount - a.highRiskCount);
  }

  /**
   * Get top risk contributors (users with most high-risk assets)
   */
  static async getTopRiskContributors(userId: number, limit: number = 10): Promise<RiskContributor[]> {
    // Get all workspace users
    const users = await db
      .select()
      .from(workspaceUsers)
      .where(eq(workspaceUsers.userId, userId));

    const contributors: RiskContributor[] = [];

    for (const user of users) {
      // Get asset statistics for this user
      const assetStats = await db
        .select({
          total: sql<number>`count(*)`,
          high: sql<number>`count(*) filter (where ${assets.riskScore} >= 61)`,
          medium: sql<number>`count(*) filter (where ${assets.riskScore} >= 31 and ${assets.riskScore} < 61)`,
          low: sql<number>`count(*) filter (where ${assets.riskScore} < 31)`,
          avgRisk: sql<number>`avg(${assets.riskScore})`,
        })
        .from(assets)
        .where(
          and(
            eq(assets.userId, userId),
            eq(assets.ownerEmail, user.email)
          )
        );

      const highRiskCount = Number(assetStats[0]?.high || 0);

      // Only include users with assets
      if (Number(assetStats[0]?.total || 0) > 0) {
        contributors.push({
          email: user.email,
          fullName: user.fullName,
          department: user.department,
          totalAssets: Number(assetStats[0]?.total || 0),
          highRiskCount,
          mediumRiskCount: Number(assetStats[0]?.medium || 0),
          lowRiskCount: Number(assetStats[0]?.low || 0),
          averageRiskScore: Math.round(Number(assetStats[0]?.avgRisk || 0)),
        });
      }
    }

    // Sort by high risk count descending and return top N
    return contributors
      .sort((a, b) => b.highRiskCount - a.highRiskCount)
      .slice(0, limit);
  }

  /**
   * Get detailed statistics for a specific user
   */
  static async getUserDetail(userId: number, userEmail: string): Promise<UserDetail | null> {
    // Get workspace user
    const [workspaceUser] = await db
      .select()
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.userId, userId),
          eq(workspaceUsers.email, userEmail)
        )
      )
      .limit(1);

    if (!workspaceUser) {
      return null;
    }

    // Get asset statistics
    const assetStats = await db
      .select({
        total: sql<number>`count(*)`,
        high: sql<number>`count(*) filter (where ${assets.riskScore} >= 61)`,
        medium: sql<number>`count(*) filter (where ${assets.riskScore} >= 31 and ${assets.riskScore} < 61)`,
        low: sql<number>`count(*) filter (where ${assets.riskScore} < 31)`,
        avgRisk: sql<number>`avg(${assets.riskScore})`,
      })
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          eq(assets.ownerEmail, userEmail)
        )
      );

    // Get recent activity (files created this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentFiles = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          eq(assets.ownerEmail, userEmail),
          sql`${assets.createdAt} >= ${oneWeekAgo}`
        )
      );

    // Get public files count
    const publicFiles = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          eq(assets.ownerEmail, userEmail),
          sql`${assets.riskScore} >= 40` // Public access adds 40 points
        )
      );

    // Get external shares (approximation based on risk score)
    const externalShares = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          eq(assets.ownerEmail, userEmail),
          sql`${assets.riskScore} >= 20 and ${assets.riskScore} < 40` // External users add 20 points
        )
      );

    return {
      email: workspaceUser.email,
      fullName: workspaceUser.fullName,
      department: workspaceUser.department,
      isAdmin: workspaceUser.isAdmin || false,
      isSuspended: workspaceUser.isSuspended || false,
      totalAssets: Number(assetStats[0]?.total || 0),
      highRiskCount: Number(assetStats[0]?.high || 0),
      mediumRiskCount: Number(assetStats[0]?.medium || 0),
      lowRiskCount: Number(assetStats[0]?.low || 0),
      averageRiskScore: Math.round(Number(assetStats[0]?.avgRisk || 0)),
      recentActivity: {
        filesCreatedThisWeek: Number(recentFiles[0]?.count || 0),
        publicFiles: Number(publicFiles[0]?.count || 0),
        externalShares: Number(externalShares[0]?.count || 0),
      },
    };
  }

  /**
   * Get list of all departments
   */
  static async getDepartments(userId: number): Promise<string[]> {
    const result = await db
      .select({ department: workspaceUsers.department })
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.userId, userId),
          sql`${workspaceUsers.department} is not null`
        )
      )
      .groupBy(workspaceUsers.department);

    return result
      .map(r => r.department)
      .filter((d): d is string => d !== null)
      .sort();
  }

  /**
   * Get users in a specific department
   */
  static async getUsersByDepartment(userId: number, department: string): Promise<string[]> {
    const result = await db
      .select({ email: workspaceUsers.email })
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.userId, userId),
          eq(workspaceUsers.department, department)
        )
      );

    return result.map(r => r.email);
  }
}
