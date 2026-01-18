import { eq, and } from 'drizzle-orm';
import { db } from '../connection.js';
import { workspaceUsers } from '../schema.js';

export type WorkspaceUser = typeof workspaceUsers.$inferSelect;
export type NewWorkspaceUser = typeof workspaceUsers.$inferInsert;

export class WorkspaceUserRepository {
  /**
   * Create or update a workspace user (upsert)
   */
  static async upsert(userId: number, userData: Omit<NewWorkspaceUser, 'userId'>): Promise<WorkspaceUser> {
    const existingUser = await this.findByEmail(userId, userData.email);

    if (existingUser) {
      const [updated] = await db
        .update(workspaceUsers)
        .set({
          ...userData,
          lastSyncedAt: new Date(),
        })
        .where(and(
          eq(workspaceUsers.userId, userId),
          eq(workspaceUsers.email, userData.email)
        ))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update workspace user: ${userData.email}`);
      }
      return updated;
    }

    const [created] = await db
      .insert(workspaceUsers)
      .values({
        userId,
        ...userData,
      })
      .returning();

    if (!created) {
      throw new Error(`Failed to create workspace user: ${userData.email}`);
    }
    return created;
  }

  /**
   * Bulk upsert workspace users for a given user
   */
  static async bulkUpsert(userId: number, users: Omit<NewWorkspaceUser, 'userId'>[]): Promise<WorkspaceUser[]> {
    const results: WorkspaceUser[] = [];

    for (const userData of users) {
      const result = await this.upsert(userId, userData);
      results.push(result);
    }

    return results;
  }

  /**
   * Find workspace user by email and platform for a specific user
   */
  static async findByEmail(userId: number, email: string, platform?: string): Promise<WorkspaceUser | undefined> {
    const conditions = [
      eq(workspaceUsers.userId, userId),
      eq(workspaceUsers.email, email)
    ];

    if (platform) {
      conditions.push(eq(workspaceUsers.platform, platform as any));
    }

    const [user] = await db
      .select()
      .from(workspaceUsers)
      .where(and(...conditions))
      .limit(1);
    return user;
  }

  /**
   * Get all workspace users for a specific user
   */
  static async findAllByUser(userId: number, platform?: string): Promise<WorkspaceUser[]> {
    if (platform) {
      return db
        .select()
        .from(workspaceUsers)
        .where(and(
          eq(workspaceUsers.userId, userId),
          eq(workspaceUsers.platform, platform as any)
        ));
    }

    return db
      .select()
      .from(workspaceUsers)
      .where(eq(workspaceUsers.userId, userId));
  }

  /**
   * Get workspace users by platform
   */
  static async findByPlatform(userId: number, platform: string): Promise<WorkspaceUser[]> {
    return db
      .select()
      .from(workspaceUsers)
      .where(and(
        eq(workspaceUsers.userId, userId),
        eq(workspaceUsers.platform, platform as any)
      ));
  }

  /**
   * Get count of workspace users for a specific user
   */
  static async countByUser(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(workspaceUsers)
      .where(eq(workspaceUsers.userId, userId));
    return result.length;
  }

  /**
   * Delete all workspace users for a specific user
   */
  static async deleteAllByUser(userId: number): Promise<void> {
    await db
      .delete(workspaceUsers)
      .where(eq(workspaceUsers.userId, userId));
  }
}
