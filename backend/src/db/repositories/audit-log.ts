import { eq, and, desc } from 'drizzle-orm';
import { db } from '../connection.js';
import { auditLogs } from '../schema.js';

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

/**
 * Repository for immutable audit logs
 * Note: This repository does not have update or delete methods
 * Audit logs should never be modified or deleted
 */
export class AuditLogRepository {
  /**
   * Create a new audit log entry (immutable)
   */
  static async create(logData: NewAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(logData)
      .returning();

    if (!log) {
      throw new Error('Failed to create audit log');
    }
    return log;
  }

  /**
   * Find audit log by ID
   */
  static async findById(id: number): Promise<AuditLog | undefined> {
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);
    return log;
  }

  /**
   * Get all audit logs for a user
   */
  static async findAllByUser(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const allLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));

    const logs = allLogs.slice(offset, offset + limit);

    return {
      logs,
      total: allLogs.length,
    };
  }

  /**
   * Get audit logs for a specific action
   */
  static async findByAction(actionId: number): Promise<AuditLog[]> {
    const allLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp));

    return allLogs.filter(log =>
      log.metadata &&
      typeof log.metadata === 'object' &&
      'actionId' in log.metadata &&
      log.metadata.actionId === actionId
    );
  }

  /**
   * Get audit logs for a specific sheet
   */
  static async findBySheet(sheetId: number): Promise<AuditLog[]> {
    const allLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp));

    return allLogs.filter(log =>
      log.metadata &&
      typeof log.metadata === 'object' &&
      'sheetId' in log.metadata &&
      log.metadata.sheetId === sheetId
    );
  }

  /**
   * Get audit logs by event type
   */
  static async findByEventType(
    userId: number,
    eventType: string
  ): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.eventType, eventType)
      ))
      .orderBy(desc(auditLogs.timestamp));
  }

  /**
   * Get audit logs within a date range
   */
  static async findByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AuditLog[]> {
    const allLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));

    return allLogs.filter(log => {
      const timestamp = new Date(log.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
  }

  /**
   * Get audit logs by actor
   */
  static async findByActor(
    userId: number,
    actorEmail: string
  ): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.actorEmail, actorEmail)
      ))
      .orderBy(desc(auditLogs.timestamp));
  }

  /**
   * Count audit logs for a user
   */
  static async countByUser(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId));
    return result.length;
  }

  /**
   * Get recent audit logs (last N entries)
   */
  static async findRecent(userId: number, limit: number = 20): Promise<AuditLog[]> {
    const allLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));

    return allLogs.slice(0, limit);
  }

  /**
   * Search audit logs by metadata
   */
  static async searchByMetadata(
    userId: number,
    metadataKey: string,
    metadataValue: any
  ): Promise<AuditLog[]> {
    const allLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));

    return allLogs.filter(log => {
      if (!log.metadata || typeof log.metadata !== 'object') {
        return false;
      }
      const metadata = log.metadata as Record<string, any>;
      return metadataKey in metadata && metadata[metadataKey] === metadataValue;
    });
  }

  // Note: No update() or delete() methods
  // Audit logs are immutable for compliance
}
