import { pgTable, serial, text, boolean, timestamp, integer, jsonb, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== USERS TABLE ====================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  serviceAccount: text('service_account'), // Encrypted JSON
  hasServiceAccount: boolean('has_service_account').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== WORKSPACE USERS TABLE ====================
export const workspaceUsers = pgTable('workspace_users', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  email: text('email').notNull(),
  fullName: text('full_name'),
  isAdmin: boolean('is_admin').default(false),
  isSuspended: boolean('is_suspended').default(false),
  createdAt: timestamp('created_at'),
  lastLoginAt: timestamp('last_login_at'),
  lastSyncedAt: timestamp('last_synced_at'),
});

// ==================== SHEETS TABLE ====================
export const sheets = pgTable('sheets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  sheetId: text('sheet_id').notNull().unique(),
  name: text('name').notNull(),
  ownerEmail: text('owner_email').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at'),
  lastModifiedAt: timestamp('last_modified_at'),
  permissionCount: integer('permission_count').default(0),
  isOrphaned: boolean('is_orphaned').default(false),
  isInactive: boolean('is_inactive').default(false),
  riskScore: integer('risk_score').default(0),
  lastSyncedAt: timestamp('last_synced_at'),
});

// ==================== PERMISSIONS TABLE ====================
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  sheetId: integer('sheet_id').notNull().references(() => sheets.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull(),
  email: text('email'),
  role: text('role').notNull(),
  type: text('type').notNull(),
  displayName: text('display_name'),
  snapshotDate: timestamp('snapshot_date').defaultNow().notNull(),
});

// ==================== GOVERNANCE ACTIONS TABLE ====================
export const actionTypeEnum = pgEnum('action_type', ['delete', 'change_visibility', 'remove_permission', 'transfer_ownership']);
export const actionStatusEnum = pgEnum('action_status', ['pending', 'approved', 'rejected', 'executed', 'failed']);

export const governanceActions = pgTable('governance_actions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  sheetId: integer('sheet_id').notNull().references(() => sheets.id),
  actionType: actionTypeEnum('action_type').notNull(),
  status: actionStatusEnum('status').default('pending').notNull(),
  requestedBy: text('requested_by').notNull(), // email
  reason: text('reason').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  executedAt: timestamp('executed_at'),
  errorMessage: text('error_message'),
});

// ==================== ACTION APPROVALS TABLE ====================
export const actionApprovals = pgTable('action_approvals', {
  id: serial('id').primaryKey(),
  actionId: integer('action_id').notNull().references(() => governanceActions.id, { onDelete: 'cascade' }),
  approverEmail: text('approver_email').notNull(),
  isApproved: boolean('is_approved'), // null = pending, true = approved, false = rejected
  comment: text('comment'),
  respondedAt: timestamp('responded_at'),
});

// ==================== AUDIT LOGS TABLE ====================
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  eventType: text('event_type').notNull(),
  actorEmail: text('actor_email').notNull(),
  targetResource: text('target_resource'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

// ==================== MONTHLY REPORTS TABLE ====================
export const monthlyReports = pgTable('monthly_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  reportMonth: date('report_month').notNull(),
  reportData: jsonb('report_data').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

// ==================== RELATIONS ====================
export const sheetsRelations = relations(sheets, ({ many, one }) => ({
  permissions: many(permissions),
  actions: many(governanceActions),
  user: one(users, {
    fields: [sheets.userId],
    references: [users.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  sheet: one(sheets, {
    fields: [permissions.sheetId],
    references: [sheets.id],
  }),
}));

export const governanceActionsRelations = relations(governanceActions, ({ one, many }) => ({
  sheet: one(sheets, {
    fields: [governanceActions.sheetId],
    references: [sheets.id],
  }),
  user: one(users, {
    fields: [governanceActions.userId],
    references: [users.id],
  }),
  approvals: many(actionApprovals),
}));

export const actionApprovalsRelations = relations(actionApprovals, ({ one }) => ({
  action: one(governanceActions, {
    fields: [actionApprovals.actionId],
    references: [governanceActions.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const monthlyReportsRelations = relations(monthlyReports, ({ one }) => ({
  user: one(users, {
    fields: [monthlyReports.userId],
    references: [users.id],
  }),
}));

export const workspaceUsersRelations = relations(workspaceUsers, ({ one }) => ({
  user: one(users, {
    fields: [workspaceUsers.userId],
    references: [users.id],
  }),
}));
