import { pgTable, serial, text, boolean, timestamp, integer, jsonb, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== ENUMS ====================
// Platform providers (cloud storage platforms)
export const platformEnum = pgEnum('platform', [
  'google_workspace',
  'microsoft_365',
  'zoho',
  'dropbox',
  'box',
  'other'
]);

// Asset types (platform-agnostic file types)
export const assetTypeEnum = pgEnum('asset_type', [
  'spreadsheet',    // Google Sheets, Excel, Zoho Sheet
  'document',       // Google Docs, Word, Zoho Writer
  'presentation',   // Google Slides, PowerPoint, Zoho Show
  'form',           // Google Forms, Microsoft Forms
  'pdf',            // PDF files
  'folder',         // Folders/directories
  'database',       // Airtable, Notion, etc.
  'whiteboard',     // Miro, FigJam, etc.
  'other'           // Other file types
]);

// Credential types
export const credentialTypeEnum = pgEnum('credential_type', [
  'service_account',  // Service account JSON (Google, etc.)
  'oauth',            // OAuth tokens
  'api_key',          // API keys
  'other'             // Other authentication methods
]);

// ==================== USERS TABLE ====================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== PLATFORM CREDENTIALS TABLE ====================
// Stores encrypted credentials for multiple platforms per user
export const platformCredentials = pgTable('platform_credentials', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: platformEnum('platform').notNull(),
  credentials: text('credentials').notNull(), // AES-256 encrypted JSON
  credentialType: credentialTypeEnum('credential_type').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
});

// ==================== WORKSPACE USERS TABLE ====================
export const workspaceUsers = pgTable('workspace_users', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  platform: platformEnum('platform').notNull(), // Which platform this user belongs to
  email: text('email').notNull(),
  fullName: text('full_name'),
  isAdmin: boolean('is_admin').default(false),
  isSuspended: boolean('is_suspended').default(false),
  createdAt: timestamp('created_at'),
  lastLoginAt: timestamp('last_login_at'),
  lastSyncedAt: timestamp('last_synced_at'),
});

// ==================== ASSETS TABLE ====================
// Platform-agnostic storage for all cloud assets (sheets, docs, files, etc.)
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  platform: platformEnum('platform').notNull(),
  externalId: text('external_id').notNull(), // Platform's file/asset ID (Google Drive ID, OneDrive ID, etc.)
  assetType: assetTypeEnum('asset_type').notNull(),
  mimeType: text('mime_type'), // Platform-specific MIME type
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
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  externalPermissionId: text('external_permission_id').notNull(), // Platform's permission ID
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
  assetId: integer('asset_id').notNull().references(() => assets.id),
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
export const usersRelations = relations(users, ({ many }) => ({
  assets: many(assets),
  platformCredentials: many(platformCredentials),
  workspaceUsers: many(workspaceUsers),
  governanceActions: many(governanceActions),
  auditLogs: many(auditLogs),
  monthlyReports: many(monthlyReports),
}));

export const platformCredentialsRelations = relations(platformCredentials, ({ one }) => ({
  user: one(users, {
    fields: [platformCredentials.userId],
    references: [users.id],
  }),
}));

export const assetsRelations = relations(assets, ({ many, one }) => ({
  permissions: many(permissions),
  actions: many(governanceActions),
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  asset: one(assets, {
    fields: [permissions.assetId],
    references: [assets.id],
  }),
}));

export const governanceActionsRelations = relations(governanceActions, ({ one, many }) => ({
  asset: one(assets, {
    fields: [governanceActions.assetId],
    references: [assets.id],
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
