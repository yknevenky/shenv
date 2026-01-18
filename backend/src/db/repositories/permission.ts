import { eq, and, desc } from 'drizzle-orm';
import { db } from '../connection.js';
import { permissions } from '../schema.js';

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export class PermissionRepository {
  /**
   * Create or update a permission (upsert)
   */
  static async upsert(permissionData: NewPermission): Promise<Permission> {
    const existing = await this.findByAssetAndPermissionId(
      permissionData.assetId,
      permissionData.externalPermissionId
    );

    if (existing) {
      const [updated] = await db
        .update(permissions)
        .set({
          ...permissionData,
          snapshotDate: new Date(),
        })
        .where(eq(permissions.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update permission: ${permissionData.externalPermissionId}`);
      }
      return updated;
    }

    const [created] = await db
      .insert(permissions)
      .values(permissionData)
      .returning();

    if (!created) {
      throw new Error(`Failed to create permission: ${permissionData.externalPermissionId}`);
    }
    return created;
  }

  /**
   * Bulk upsert permissions
   */
  static async bulkUpsert(permissionsData: NewPermission[]): Promise<Permission[]> {
    const results: Permission[] = [];

    for (const permData of permissionsData) {
      const result = await this.upsert(permData);
      results.push(result);
    }

    return results;
  }

  /**
   * Find permission by asset ID and external permission ID
   */
  static async findByAssetAndPermissionId(
    assetId: number,
    externalPermissionId: string
  ): Promise<Permission | undefined> {
    const [permission] = await db
      .select()
      .from(permissions)
      .where(and(
        eq(permissions.assetId, assetId),
        eq(permissions.externalPermissionId, externalPermissionId)
      ))
      .limit(1);
    return permission;
  }

  /**
   * Get all permissions for a specific asset
   */
  static async findAllByAsset(assetId: number): Promise<Permission[]> {
    return db
      .select()
      .from(permissions)
      .where(eq(permissions.assetId, assetId))
      .orderBy(desc(permissions.snapshotDate));
  }

  /**
   * Get all permissions for a specific email
   */
  static async findAllByEmail(email: string): Promise<Permission[]> {
    return db
      .select()
      .from(permissions)
      .where(eq(permissions.email, email))
      .orderBy(desc(permissions.snapshotDate));
  }

  /**
   * Get permissions by role for an asset
   */
  static async findByAssetAndRole(assetId: number, role: string): Promise<Permission[]> {
    return db
      .select()
      .from(permissions)
      .where(and(
        eq(permissions.assetId, assetId),
        eq(permissions.role, role)
      ));
  }

  /**
   * Count permissions for an asset
   */
  static async countByAsset(assetId: number): Promise<number> {
    const result = await db
      .select()
      .from(permissions)
      .where(eq(permissions.assetId, assetId));
    return result.length;
  }

  /**
   * Delete all permissions for an asset
   */
  static async deleteAllByAsset(assetId: number): Promise<void> {
    await db
      .delete(permissions)
      .where(eq(permissions.assetId, assetId));
  }

  /**
   * Find permission by ID
   */
  static async findById(id: number): Promise<Permission | undefined> {
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);
    return permission;
  }
}
