import { eq, and, desc, like, or } from 'drizzle-orm';
import { db } from '../connection.js';
import { sheets } from '../schema.js';

export type Sheet = typeof sheets.$inferSelect;
export type NewSheet = typeof sheets.$inferInsert;

export class SheetRepository {
  /**
   * Create or update a sheet (upsert by sheetId)
   */
  static async upsert(userId: number, sheetData: Omit<NewSheet, 'userId'>): Promise<Sheet> {
    const existingSheet = await this.findBySheetId(userId, sheetData.sheetId);

    if (existingSheet) {
      const [updated] = await db
        .update(sheets)
        .set({
          ...sheetData,
          lastSyncedAt: new Date(),
        })
        .where(and(
          eq(sheets.userId, userId),
          eq(sheets.sheetId, sheetData.sheetId)
        ))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update sheet: ${sheetData.sheetId}`);
      }
      return updated;
    }

    const [created] = await db
      .insert(sheets)
      .values({
        userId,
        ...sheetData,
      })
      .returning();

    if (!created) {
      throw new Error(`Failed to create sheet: ${sheetData.sheetId}`);
    }
    return created;
  }

  /**
   * Bulk upsert sheets for a given user
   */
  static async bulkUpsert(userId: number, sheetsData: Omit<NewSheet, 'userId'>[]): Promise<Sheet[]> {
    const results: Sheet[] = [];

    for (const sheetData of sheetsData) {
      const result = await this.upsert(userId, sheetData);
      results.push(result);
    }

    return results;
  }

  /**
   * Find sheet by Google Sheet ID for a specific user
   */
  static async findBySheetId(userId: number, sheetId: string): Promise<Sheet | undefined> {
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(and(
        eq(sheets.userId, userId),
        eq(sheets.sheetId, sheetId)
      ))
      .limit(1);
    return sheet;
  }

  /**
   * Find sheet by internal database ID
   */
  static async findById(id: number): Promise<Sheet | undefined> {
    const [sheet] = await db
      .select()
      .from(sheets)
      .where(eq(sheets.id, id))
      .limit(1);
    return sheet;
  }

  /**
   * Get all sheets for a specific user with optional filters
   */
  static async findAllByUser(
    userId: number,
    options: {
      search?: string;
      isOrphaned?: boolean;
      isInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ sheets: Sheet[]; total: number }> {
    const { search, isOrphaned, isInactive, limit = 20, offset = 0 } = options;

    let conditions: any[] = [eq(sheets.userId, userId)];

    if (search) {
      conditions.push(
        or(
          like(sheets.name, `%${search}%`),
          like(sheets.ownerEmail, `%${search}%`)
        )
      );
    }

    if (isOrphaned !== undefined) {
      conditions.push(eq(sheets.isOrphaned, isOrphaned));
    }

    if (isInactive !== undefined) {
      conditions.push(eq(sheets.isInactive, isInactive));
    }

    const allSheets = await db
      .select()
      .from(sheets)
      .where(and(...conditions))
      .orderBy(desc(sheets.lastModifiedAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select()
      .from(sheets)
      .where(and(...conditions));

    return {
      sheets: allSheets,
      total: totalResult.length,
    };
  }

  /**
   * Get orphaned sheets for a user
   */
  static async findOrphanedSheets(userId: number): Promise<Sheet[]> {
    return db
      .select()
      .from(sheets)
      .where(and(
        eq(sheets.userId, userId),
        eq(sheets.isOrphaned, true)
      ))
      .orderBy(desc(sheets.lastModifiedAt));
  }

  /**
   * Get inactive sheets for a user
   */
  static async findInactiveSheets(userId: number): Promise<Sheet[]> {
    return db
      .select()
      .from(sheets)
      .where(and(
        eq(sheets.userId, userId),
        eq(sheets.isInactive, true)
      ))
      .orderBy(desc(sheets.lastModifiedAt));
  }

  /**
   * Get sheets with high risk score
   */
  static async findHighRiskSheets(userId: number, minRiskScore: number = 70): Promise<Sheet[]> {
    const allSheets = await db
      .select()
      .from(sheets)
      .where(eq(sheets.userId, userId))
      .orderBy(desc(sheets.riskScore));

    return allSheets.filter(sheet => (sheet.riskScore || 0) >= minRiskScore);
  }

  /**
   * Update risk score for a sheet
   */
  static async updateRiskScore(id: number, riskScore: number): Promise<Sheet> {
    const [updated] = await db
      .update(sheets)
      .set({ riskScore })
      .where(eq(sheets.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update risk score for sheet ID: ${id}`);
    }
    return updated;
  }

  /**
   * Mark sheet as orphaned
   */
  static async markAsOrphaned(id: number): Promise<Sheet> {
    const [updated] = await db
      .update(sheets)
      .set({ isOrphaned: true })
      .where(eq(sheets.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to mark sheet as orphaned, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Mark sheet as inactive
   */
  static async markAsInactive(id: number): Promise<Sheet> {
    const [updated] = await db
      .update(sheets)
      .set({ isInactive: true })
      .where(eq(sheets.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to mark sheet as inactive, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Delete all sheets for a specific user
   */
  static async deleteAllByUser(userId: number): Promise<void> {
    await db
      .delete(sheets)
      .where(eq(sheets.userId, userId));
  }

  /**
   * Get count of sheets for a specific user
   */
  static async countByUser(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(sheets)
      .where(eq(sheets.userId, userId));
    return result.length;
  }
}
