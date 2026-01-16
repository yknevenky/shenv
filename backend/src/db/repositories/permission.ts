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
    const existing = await this.findBySheetAndPermissionId(
      permissionData.sheetId,
      permissionData.permissionId
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
        throw new Error(`Failed to update permission: ${permissionData.permissionId}`);
      }
      return updated;
    }

    const [created] = await db
      .insert(permissions)
      .values(permissionData)
      .returning();

    if (!created) {
      throw new Error(`Failed to create permission: ${permissionData.permissionId}`);
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
   * Find permission by sheet ID and permission ID
   */
  static async findBySheetAndPermissionId(
    sheetId: number,
    permissionId: string
  ): Promise<Permission | undefined> {
    const [permission] = await db
      .select()
      .from(permissions)
      .where(and(
        eq(permissions.sheetId, sheetId),
        eq(permissions.permissionId, permissionId)
      ))
      .limit(1);
    return permission;
  }

  /**
   * Get all permissions for a specific sheet
   */
  static async findAllBySheet(sheetId: number): Promise<Permission[]> {
    return db
      .select()
      .from(permissions)
      .where(eq(permissions.sheetId, sheetId))
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
   * Get permissions by role for a sheet
   */
  static async findBySheetAndRole(sheetId: number, role: string): Promise<Permission[]> {
    return db
      .select()
      .from(permissions)
      .where(and(
        eq(permissions.sheetId, sheetId),
        eq(permissions.role, role)
      ));
  }

  /**
   * Count permissions for a sheet
   */
  static async countBySheet(sheetId: number): Promise<number> {
    const result = await db
      .select()
      .from(permissions)
      .where(eq(permissions.sheetId, sheetId));
    return result.length;
  }

  /**
   * Delete all permissions for a sheet
   */
  static async deleteAllBySheet(sheetId: number): Promise<void> {
    await db
      .delete(permissions)
      .where(eq(permissions.sheetId, sheetId));
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
