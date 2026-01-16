import { eq, and, desc } from 'drizzle-orm';
import { db } from '../connection.js';
import { actionApprovals } from '../schema.js';

export type ActionApproval = typeof actionApprovals.$inferSelect;
export type NewActionApproval = typeof actionApprovals.$inferInsert;

export class ActionApprovalRepository {
  /**
   * Create a new approval record
   */
  static async create(approvalData: NewActionApproval): Promise<ActionApproval> {
    const [approval] = await db
      .insert(actionApprovals)
      .values(approvalData)
      .returning();

    if (!approval) {
      throw new Error('Failed to create action approval');
    }
    return approval;
  }

  /**
   * Find approval by ID
   */
  static async findById(id: number): Promise<ActionApproval | undefined> {
    const [approval] = await db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.id, id))
      .limit(1);
    return approval;
  }

  /**
   * Get all approvals for a specific action
   */
  static async findAllByAction(actionId: number): Promise<ActionApproval[]> {
    return db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.actionId, actionId))
      .orderBy(desc(actionApprovals.respondedAt));
  }

  /**
   * Get approvals by approver email
   */
  static async findByApprover(approverEmail: string): Promise<ActionApproval[]> {
    return db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.approverEmail, approverEmail))
      .orderBy(desc(actionApprovals.respondedAt));
  }

  /**
   * Get pending approvals for a specific action
   */
  static async findPendingByAction(actionId: number): Promise<ActionApproval[]> {
    const allApprovals = await db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.actionId, actionId));

    return allApprovals.filter(a => a.isApproved === null);
  }

  /**
   * Get approved approvals for a specific action
   */
  static async findApprovedByAction(actionId: number): Promise<ActionApproval[]> {
    const allApprovals = await db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.actionId, actionId));

    return allApprovals.filter(a => a.isApproved === true);
  }

  /**
   * Get rejected approvals for a specific action
   */
  static async findRejectedByAction(actionId: number): Promise<ActionApproval[]> {
    const allApprovals = await db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.actionId, actionId));

    return allApprovals.filter(a => a.isApproved === false);
  }

  /**
   * Record approval decision
   */
  static async recordDecision(
    id: number,
    isApproved: boolean,
    comment?: string
  ): Promise<ActionApproval> {
    const [updated] = await db
      .update(actionApprovals)
      .set({
        isApproved,
        comment: comment || null,
        respondedAt: new Date(),
      })
      .where(eq(actionApprovals.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to record approval decision, ID: ${id}`);
    }
    return updated;
  }

  /**
   * Check if action has all required approvals
   */
  static async hasAllApprovals(actionId: number): Promise<boolean> {
    const allApprovals = await this.findAllByAction(actionId);

    if (allApprovals.length === 0) {
      return false;
    }

    // Check if all approvals are responded to and approved
    return allApprovals.every(a => a.isApproved === true);
  }

  /**
   * Check if action has any rejections
   */
  static async hasAnyRejection(actionId: number): Promise<boolean> {
    const rejections = await this.findRejectedByAction(actionId);
    return rejections.length > 0;
  }

  /**
   * Count approvals by status for an action
   */
  static async countApprovalsByStatus(
    actionId: number
  ): Promise<{ approved: number; rejected: number; pending: number }> {
    const allApprovals = await this.findAllByAction(actionId);

    return {
      approved: allApprovals.filter(a => a.isApproved === true).length,
      rejected: allApprovals.filter(a => a.isApproved === false).length,
      pending: allApprovals.filter(a => a.isApproved === null).length,
    };
  }

  /**
   * Find approval by action and approver
   */
  static async findByActionAndApprover(
    actionId: number,
    approverEmail: string
  ): Promise<ActionApproval | undefined> {
    const [approval] = await db
      .select()
      .from(actionApprovals)
      .where(and(
        eq(actionApprovals.actionId, actionId),
        eq(actionApprovals.approverEmail, approverEmail)
      ))
      .limit(1);
    return approval;
  }

  /**
   * Delete approval by ID
   */
  static async delete(id: number): Promise<void> {
    await db
      .delete(actionApprovals)
      .where(eq(actionApprovals.id, id));
  }
}
