import { eq, and, desc } from 'drizzle-orm';
import { db } from '../connection.js';
import { monthlyReports } from '../schema.js';

export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type NewMonthlyReport = typeof monthlyReports.$inferInsert;

export class MonthlyReportRepository {
  /**
   * Create a new monthly report
   */
  static async create(reportData: NewMonthlyReport): Promise<MonthlyReport> {
    const [report] = await db
      .insert(monthlyReports)
      .values(reportData)
      .returning();

    if (!report) {
      throw new Error('Failed to create monthly report');
    }
    return report;
  }

  /**
   * Find report by ID
   */
  static async findById(id: number): Promise<MonthlyReport | undefined> {
    const [report] = await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.id, id))
      .limit(1);
    return report;
  }

  /**
   * Get all reports for a user
   */
  static async findAllByUser(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: MonthlyReport[]; total: number }> {
    const { limit = 12, offset = 0 } = options;

    const allReports = await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.userId, userId))
      .orderBy(desc(monthlyReports.reportMonth));

    const reports = allReports.slice(offset, offset + limit);

    return {
      reports,
      total: allReports.length,
    };
  }

  /**
   * Get report for a specific user and month
   */
  static async findByUserAndMonth(
    userId: number,
    reportMonth: string
  ): Promise<MonthlyReport | undefined> {
    const [report] = await db
      .select()
      .from(monthlyReports)
      .where(and(
        eq(monthlyReports.userId, userId),
        eq(monthlyReports.reportMonth, reportMonth)
      ))
      .limit(1);
    return report;
  }

  /**
   * Get reports for a specific month (all users)
   */
  static async findByMonth(reportMonth: string): Promise<MonthlyReport[]> {
    return db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.reportMonth, reportMonth))
      .orderBy(desc(monthlyReports.generatedAt));
  }

  /**
   * Get latest report for a user
   */
  static async findLatestByUser(userId: number): Promise<MonthlyReport | undefined> {
    const [report] = await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.userId, userId))
      .orderBy(desc(monthlyReports.reportMonth))
      .limit(1);
    return report;
  }

  /**
   * Get reports within a date range
   */
  static async findByDateRange(
    userId: number,
    startMonth: Date,
    endMonth: Date
  ): Promise<MonthlyReport[]> {
    const allReports = await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.userId, userId))
      .orderBy(desc(monthlyReports.reportMonth));

    return allReports.filter(report => {
      const reportDate = new Date(report.reportMonth);
      return reportDate >= startMonth && reportDate <= endMonth;
    });
  }

  /**
   * Check if report exists for user and month
   */
  static async exists(userId: number, reportMonth: string): Promise<boolean> {
    const report = await this.findByUserAndMonth(userId, reportMonth);
    return report !== undefined;
  }

  /**
   * Update report data
   */
  static async update(
    id: number,
    reportData: Partial<NewMonthlyReport>
  ): Promise<MonthlyReport> {
    const [updated] = await db
      .update(monthlyReports)
      .set(reportData)
      .where(eq(monthlyReports.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update monthly report, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Delete report by ID
   */
  static async delete(id: number): Promise<void> {
    await db
      .delete(monthlyReports)
      .where(eq(monthlyReports.id, id));
  }

  /**
   * Count reports for a user
   */
  static async countByUser(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.userId, userId));
    return result.length;
  }

  /**
   * Get summary statistics across all reports for a user
   */
  static async getUserSummary(userId: number): Promise<{
    totalReports: number;
    latestReport: MonthlyReport | undefined;
    averageSheetsPerMonth: number;
    averageRiskScore: number;
  }> {
    const allReports = await db
      .select()
      .from(monthlyReports)
      .where(eq(monthlyReports.userId, userId));

    if (allReports.length === 0) {
      return {
        totalReports: 0,
        latestReport: undefined,
        averageSheetsPerMonth: 0,
        averageRiskScore: 0,
      };
    }

    const latestReport = allReports.reduce((latest, current) => {
      return new Date(current.reportMonth) > new Date(latest.reportMonth)
        ? current
        : latest;
    });

    const totalSheets = allReports.reduce((sum, report) => {
      const data = report.reportData as any;
      return sum + (data?.totalSheets || 0);
    }, 0);

    const totalRiskScore = allReports.reduce((sum, report) => {
      const data = report.reportData as any;
      return sum + (data?.averageRiskScore || 0);
    }, 0);

    return {
      totalReports: allReports.length,
      latestReport,
      averageSheetsPerMonth: totalSheets / allReports.length,
      averageRiskScore: totalRiskScore / allReports.length,
    };
  }
}
