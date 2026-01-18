import { eq, and, desc, like, or } from 'drizzle-orm';
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
   * Get orphaned assets for a user
   */
  static async findOrphanedAssets(userId: number): Promise<Asset[]> {
    return db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.isOrphaned, true)
      ))
      .orderBy(desc(assets.lastModifiedAt));
  }

  /**
   * Get inactive assets for a user
   */
  static async findInactiveAssets(userId: number): Promise<Asset[]> {
    return db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.isInactive, true)
      ))
      .orderBy(desc(assets.lastModifiedAt));
  }

  /**
   * Get assets with high risk score
   */
  static async findHighRiskAssets(userId: number, minRiskScore: number = 70): Promise<Asset[]> {
    const allAssets = await db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.riskScore));

    return allAssets.filter(asset => (asset.riskScore || 0) >= minRiskScore);
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
   * Get count of assets for a specific user
   */
  static async countByUser(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId));
    return result.length;
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
}
