import { eq, and, desc } from 'drizzle-orm';
import { db } from '../connection.js';
import { governanceActions } from '../schema.js';

export type GovernanceAction = typeof governanceActions.$inferSelect;
export type NewGovernanceAction = typeof governanceActions.$inferInsert;

export class GovernanceActionRepository {
  /**
   * Create a new governance action request
   */
  static async create(actionData: NewGovernanceAction): Promise<GovernanceAction> {
    const [action] = await db
      .insert(governanceActions)
      .values(actionData)
      .returning();

    if (!action) {
      throw new Error('Failed to create governance action');
    }
    return action;
  }

  /**
   * Find action by ID
   */
  static async findById(id: number): Promise<GovernanceAction | undefined> {
    const [action] = await db
      .select()
      .from(governanceActions)
      .where(eq(governanceActions.id, id))
      .limit(1);
    return action;
  }

  /**
   * Get all actions for a user
   */
  static async findAllByUser(userId: number): Promise<GovernanceAction[]> {
    return db
      .select()
      .from(governanceActions)
      .where(eq(governanceActions.userId, userId))
      .orderBy(desc(governanceActions.createdAt));
  }

  /**
   * Get all actions for a specific sheet
   */
  static async findAllBySheet(sheetId: number): Promise<GovernanceAction[]> {
    return db
      .select()
      .from(governanceActions)
      .where(eq(governanceActions.sheetId, sheetId))
      .orderBy(desc(governanceActions.createdAt));
  }

  /**
   * Get actions by status
   */
  static async findByStatus(
    userId: number,
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
  ): Promise<GovernanceAction[]> {
    return db
      .select()
      .from(governanceActions)
      .where(and(
        eq(governanceActions.userId, userId),
        eq(governanceActions.status, status)
      ))
      .orderBy(desc(governanceActions.createdAt));
  }

  /**
   * Get pending actions (awaiting approval)
   */
  static async findPendingActions(userId: number): Promise<GovernanceAction[]> {
    return this.findByStatus(userId, 'pending');
  }

  /**
   * Update action status
   */
  static async updateStatus(
    id: number,
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed',
    executedAt?: Date,
    errorMessage?: string
  ): Promise<GovernanceAction> {
    const [updated] = await db
      .update(governanceActions)
      .set({
        status,
        executedAt: executedAt || null,
        errorMessage: errorMessage || null,
      })
      .where(eq(governanceActions.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update governance action status, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Mark action as approved
   */
  static async markAsApproved(id: number): Promise<GovernanceAction> {
    return this.updateStatus(id, 'approved');
  }

  /**
   * Mark action as rejected
   */
  static async markAsRejected(id: number): Promise<GovernanceAction> {
    return this.updateStatus(id, 'rejected');
  }

  /**
   * Mark action as executed
   */
  static async markAsExecuted(id: number): Promise<GovernanceAction> {
    return this.updateStatus(id, 'executed', new Date());
  }

  /**
   * Mark action as failed with error message
   */
  static async markAsFailed(id: number, errorMessage: string): Promise<GovernanceAction> {
    return this.updateStatus(id, 'failed', new Date(), errorMessage);
  }

  /**
   * Get actions by type
   */
  static async findByActionType(
    userId: number,
    actionType: 'delete' | 'change_visibility' | 'remove_permission' | 'transfer_ownership'
  ): Promise<GovernanceAction[]> {
    return db
      .select()
      .from(governanceActions)
      .where(and(
        eq(governanceActions.userId, userId),
        eq(governanceActions.actionType, actionType)
      ))
      .orderBy(desc(governanceActions.createdAt));
  }

  /**
   * Get actions requiring approval (approved but not executed)
   */
  static async findApprovedPendingExecution(userId: number): Promise<GovernanceAction[]> {
    return db
      .select()
      .from(governanceActions)
      .where(and(
        eq(governanceActions.userId, userId),
        eq(governanceActions.status, 'approved')
      ))
      .orderBy(desc(governanceActions.createdAt));
  }

  /**
   * Delete action by ID (should be rare, prefer status updates)
   */
  static async delete(id: number): Promise<void> {
    await db
      .delete(governanceActions)
      .where(eq(governanceActions.id, id));
  }

  /**
   * Count actions by status for a user
   */
  static async countByStatus(
    userId: number,
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
  ): Promise<number> {
    const result = await db
      .select()
      .from(governanceActions)
      .where(and(
        eq(governanceActions.userId, userId),
        eq(governanceActions.status, status)
      ));
    return result.length;
  }
}
