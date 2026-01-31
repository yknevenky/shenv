import { eq, and, desc, like, or, count, sql, gte } from 'drizzle-orm';
import { db } from '../connection.js';
import { assets } from '../schema.js';

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export class AssetRepository {
  /**
   * Create or update an asset (upsert by platform + externalId)
   */
  static async upsert(userId: number, assetData: Omit<NewAsset, 'userId'>): Promise<Asset> {
    const existingAsset = await this.findByExternalId(userId, assetData.platform, assetData.externalId);

    if (existingAsset) {
      const [updated] = await db
        .update(assets)
        .set({
          ...assetData,
          lastSyncedAt: new Date(),
        })
        .where(and(
          eq(assets.userId, userId),
          eq(assets.platform, assetData.platform),
          eq(assets.externalId, assetData.externalId)
        ))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update asset: ${assetData.externalId}`);
      }
      return updated;
    }

    const [created] = await db
      .insert(assets)
      .values({
        userId,
        ...assetData,
      })
      .returning();

    if (!created) {
      throw new Error(`Failed to create asset: ${assetData.externalId}`);
    }
    return created;
  }

  /**
   * Bulk upsert assets for a given user
   */
  static async bulkUpsert(userId: number, assetsData: Omit<NewAsset, 'userId'>[]): Promise<Asset[]> {
    const results: Asset[] = [];

    for (const assetData of assetsData) {
      const result = await this.upsert(userId, assetData);
      results.push(result);
    }

    return results;
  }

  /**
   * Find asset by external ID (platform's asset ID) for a specific user and platform
   */
  static async findByExternalId(
    userId: number,
    platform: string,
    externalId: string
  ): Promise<Asset | undefined> {
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.platform, platform as any),
        eq(assets.externalId, externalId)
      ))
      .limit(1);
    return asset;
  }

  /**
   * Find asset by internal database ID
   */
  static async findById(id: number): Promise<Asset | undefined> {
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);
    return asset;
  }

  /**
   * Get all assets for a specific user with optional filters
   */
  static async findAllByUser(
    userId: number,
    options: {
      platform?: string;
      assetType?: string;
      search?: string;
      isOrphaned?: boolean;
      isInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ assets: Asset[]; total: number }> {
    const { platform, assetType, search, isOrphaned, isInactive, limit = 20, offset = 0 } = options;

    let conditions: any[] = [eq(assets.userId, userId)];

    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    if (assetType) {
      conditions.push(eq(assets.assetType, assetType as any));
    }

    if (search) {
      conditions.push(
        or(
          like(assets.name, `%${search}%`),
          like(assets.ownerEmail, `%${search}%`)
        )
      );
    }

    if (isOrphaned !== undefined) {
      conditions.push(eq(assets.isOrphaned, isOrphaned));
    }

    if (isInactive !== undefined) {
      conditions.push(eq(assets.isInactive, isInactive));
    }

    const allAssets = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.lastModifiedAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select()
      .from(assets)
      .where(and(...conditions));

    return {
      assets: allAssets,
      total: totalResult.length,
    };
  }

  /**
   * Get assets by platform
   */
  static async findByPlatform(userId: number, platform: string): Promise<Asset[]> {
    return db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.platform, platform as any)
      ))
      .orderBy(desc(assets.lastModifiedAt));
  }

  /**
   * Get assets by asset type
   */
  static async findByAssetType(userId: number, assetType: string): Promise<Asset[]> {
    return db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.assetType, assetType as any)
      ))
      .orderBy(desc(assets.lastModifiedAt));
  }

  /**
   * Get orphaned assets for a user (with optional platform filter)
   */
  static async findOrphanedAssets(userId: number, platform?: string): Promise<Asset[]> {
    const conditions = [
      eq(assets.userId, userId),
      eq(assets.isOrphaned, true),
    ];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    return db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.lastModifiedAt));
  }

  /**
   * Get inactive assets for a user (with optional platform filter)
   */
  static async findInactiveAssets(userId: number, platform?: string): Promise<Asset[]> {
    const conditions = [
      eq(assets.userId, userId),
      eq(assets.isInactive, true),
    ];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    return db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.lastModifiedAt));
  }

  /**
   * Get assets with high risk score (with optional platform filter)
   */
  static async findHighRiskAssets(userId: number, minRiskScore: number = 70, platform?: string): Promise<Asset[]> {
    const conditions = [
      eq(assets.userId, userId),
      gte(assets.riskScore, minRiskScore),
    ];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    return db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.riskScore));
  }

  /**
   * Update risk score for an asset
   */
  static async updateRiskScore(id: number, riskScore: number): Promise<Asset> {
    const [updated] = await db
      .update(assets)
      .set({ riskScore })
      .where(eq(assets.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update risk score for asset ID: ${id}`);
    }
    return updated;
  }

  /**
   * Mark asset as orphaned
   */
  static async markAsOrphaned(id: number): Promise<Asset> {
    const [updated] = await db
      .update(assets)
      .set({ isOrphaned: true })
      .where(eq(assets.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to mark asset as orphaned, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Mark asset as inactive
   */
  static async markAsInactive(id: number): Promise<Asset> {
    const [updated] = await db
      .update(assets)
      .set({ isInactive: true })
      .where(eq(assets.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to mark asset as inactive, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Delete all assets for a specific user
   */
  static async deleteAllByUser(userId: number): Promise<void> {
    await db
      .delete(assets)
      .where(eq(assets.userId, userId));
  }

  /**
   * Delete all assets for a specific user and platform
   */
  static async deleteAllByUserAndPlatform(userId: number, platform: string): Promise<void> {
    await db
      .delete(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.platform, platform as any)
      ));
  }

  /**
   * Get count of assets for a specific user (with optional platform filter)
   */
  static async countByUser(userId: number, platform?: string): Promise<number> {
    const conditions = [eq(assets.userId, userId)];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    const [result] = await db
      .select({ count: count() })
      .from(assets)
      .where(and(...conditions));

    return Number(result?.count) || 0;
  }

  /**
   * Get count of assets by platform
   */
  static async countByPlatform(userId: number, platform: string): Promise<number> {
    const result = await db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.platform, platform as any)
      ));
    return result.length;
  }

  /**
   * Get count of assets by asset type
   */
  static async countByAssetType(userId: number, assetType: string): Promise<number> {
    const result = await db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.assetType, assetType as any)
      ));
    return result.length;
  }

  /**
   * Get asset type distribution with counts
   */
  static async getTypeDistribution(userId: number, platform?: string): Promise<{ assetType: string; count: number }[]> {
    const conditions = [eq(assets.userId, userId)];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    const result = await db
      .select({
        assetType: assets.assetType,
        count: count(),
      })
      .from(assets)
      .where(and(...conditions))
      .groupBy(assets.assetType)
      .orderBy(desc(count()));

    return result.map(r => ({
      assetType: r.assetType,
      count: Number(r.count),
    }));
  }

  /**
   * Get platform distribution with counts
   */
  static async getPlatformDistribution(userId: number): Promise<{ platform: string; count: number }[]> {
    const result = await db
      .select({
        platform: assets.platform,
        count: count(),
      })
      .from(assets)
      .where(eq(assets.userId, userId))
      .groupBy(assets.platform)
      .orderBy(desc(count()));

    return result.map(r => ({
      platform: r.platform,
      count: Number(r.count),
    }));
  }

  /**
   * Get permission statistics
   */
  static async getPermissionStats(userId: number, platform?: string): Promise<{
    avgPermissions: number;
    maxPermissions: number;
    assetsWithPublicAccess: number;
    assetsWithExternalAccess: number;
  }> {
    const conditions = [eq(assets.userId, userId)];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    const [stats] = await db
      .select({
        avgPermissions: sql<number>`AVG(${assets.permissionCount})`,
        maxPermissions: sql<number>`MAX(${assets.permissionCount})`,
        totalAssets: count(),
      })
      .from(assets)
      .where(and(...conditions));

    // For now, return basic stats
    // In future, we can query permissions table for more detailed stats
    return {
      avgPermissions: Math.round(Number(stats?.avgPermissions) || 0),
      maxPermissions: Number(stats?.maxPermissions) || 0,
      assetsWithPublicAccess: 0, // TODO: Implement with permissions table join
      assetsWithExternalAccess: 0, // TODO: Implement with permissions table join
    };
  }

  /**
   * Get risk distribution (Low: 0-30, Medium: 31-60, High: 61-100)
   */
  static async getRiskDistribution(userId: number, platform?: string): Promise<{ riskLevel: string; count: number }[]> {
    const conditions = [eq(assets.userId, userId)];
    if (platform) {
      conditions.push(eq(assets.platform, platform as any));
    }

    const allAssets = await db
      .select({
        riskScore: assets.riskScore,
      })
      .from(assets)
      .where(and(...conditions));

    // Group by risk level
    const low = allAssets.filter(a => (a.riskScore ?? 0) >= 0 && (a.riskScore ?? 0) <= 30).length;
    const medium = allAssets.filter(a => (a.riskScore ?? 0) >= 31 && (a.riskScore ?? 0) <= 60).length;
    const high = allAssets.filter(a => (a.riskScore ?? 0) >= 61 && (a.riskScore ?? 0) <= 100).length;

    return [
      { riskLevel: 'Low (0-30)', count: low },
      { riskLevel: 'Medium (31-60)', count: medium },
      { riskLevel: 'High (61-100)', count: high },
    ];
  }

}
