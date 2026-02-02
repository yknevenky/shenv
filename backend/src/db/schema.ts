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

// User tier (individual vs business)
export const userTierEnum = pgEnum('user_tier', [
  'individual_free',   // Free tier with queue
  'individual_paid',   // Paid individual ($29/mo)
  'business'           // Business admin
]);

// Scan job status
export const scanJobStatusEnum = pgEnum('scan_job_status', [
  'queued',      // Waiting in queue
  'processing',  // Currently scanning
  'completed',   // Successfully completed
  'failed',      // Failed with error
  'cancelled'    // Cancelled by user
]);

// Scan scope
export const scanScopeEnum = pgEnum('scan_scope', [
  'quick',        // Public assets only (free tier)
  'full',         // All assets (paid tier)
  'organization'  // Full org scan (business tier)
]);

// ==================== USERS TABLE ====================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  tier: userTierEnum('tier').default('individual_free').notNull(),
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
  department: text('department'), // Department/team name for business tier filtering
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

// ==================== GMAIL OAUTH TOKENS TABLE ====================
// Stores OAuth 2.0 tokens for Gmail access
export const gmailOAuthTokens = pgTable('gmail_oauth_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(), // Encrypted
  refreshToken: text('refresh_token').notNull(), // Encrypted
  expiresAt: timestamp('expires_at').notNull(),
  scope: text('scope').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== EMAIL SENDERS TABLE ====================
// Groups emails by sender for bulk operations
export const emailSenders = pgTable('email_senders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderEmail: text('sender_email').notNull(),
  senderName: text('sender_name'),
  emailCount: integer('email_count').default(0).notNull(),
  attachmentCount: integer('attachment_count').default(0).notNull(), // Total attachments from this sender
  firstEmailDate: timestamp('first_email_date'),
  lastEmailDate: timestamp('last_email_date'),
  unsubscribeLink: text('unsubscribe_link'), // Unsubscribe URL from List-Unsubscribe header
  hasUnsubscribe: boolean('has_unsubscribe').default(false), // Whether sender has unsubscribe capability
  isVerified: boolean('is_verified').default(true), // SPF/DKIM verification status
  isUnsubscribed: boolean('is_unsubscribed').default(false), // User has unsubscribed
  unsubscribedAt: timestamp('unsubscribed_at'), // When user unsubscribed
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
});

// ==================== EMAILS TABLE ====================
// Stores individual email metadata
export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').notNull().references(() => emailSenders.id, { onDelete: 'cascade' }),
  gmailMessageId: text('gmail_message_id').notNull().unique(), // Gmail's message ID
  threadId: text('thread_id').notNull(),
  subject: text('subject'),
  snippet: text('snippet'), // Email preview
  receivedAt: timestamp('received_at').notNull(),
  isRead: boolean('is_read').default(false),
  hasAttachment: boolean('has_attachment').default(false),
  labels: jsonb('labels'), // Gmail labels
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
});

// ==================== SCAN JOBS TABLE ====================
// FIFO queue for scan jobs
export const scanJobs = pgTable('scan_jobs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: scanJobStatusEnum('status').default('queued').notNull(),
  scope: scanScopeEnum('scope').notNull(),
  priority: integer('priority').default(0).notNull(), // Higher = more priority (paid users)
  queuePosition: integer('queue_position'), // Current position in queue
  estimatedStartTime: timestamp('estimated_start_time'),
  platforms: jsonb('platforms').notNull(), // Array of platforms to scan ['google_workspace', 'gmail']
  results: jsonb('results'), // Scan results: { assetsFound: 123, riskScore: 45, highRiskCount: 12 }
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

// ==================== SCAN HISTORY TABLE ====================
// Historical tracking of all scans
export const scanHistory = pgTable('scan_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: integer('job_id').references(() => scanJobs.id, { onDelete: 'set null' }),
  scope: scanScopeEnum('scope').notNull(),
  platforms: jsonb('platforms').notNull(),
  assetsFound: integer('assets_found').default(0).notNull(),
  riskScore: integer('risk_score').default(0).notNull(),
  highRiskCount: integer('high_risk_count').default(0).notNull(),
  mediumRiskCount: integer('medium_risk_count').default(0).notNull(),
  lowRiskCount: integer('low_risk_count').default(0).notNull(),
  scanDuration: integer('scan_duration'), // Duration in seconds
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

// ==================== API QUOTA USAGE TABLE ====================
// Track daily API quota usage
export const apiQuotaUsage = pgTable('api_quota_usage', {
  id: serial('id').primaryKey(),
  tier: userTierEnum('tier').notNull(),
  date: date('date').notNull(),
  apiCalls: integer('api_calls').default(0).notNull(),
  quota: integer('quota').notNull(), // Daily quota limit
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== USER SUBSCRIPTIONS TABLE ====================
// Track user payments and subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  tier: userTierEnum('tier').notNull(),
  status: text('status').notNull(), // active, cancelled, expired
  paymentMethod: text('payment_method'), // stripe, one_time
  subscriptionId: text('subscription_id'), // Stripe subscription ID
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== RELATIONS ====================
export const usersRelations = relations(users, ({ many, one }) => ({
  assets: many(assets),
  platformCredentials: many(platformCredentials),
  workspaceUsers: many(workspaceUsers),
  governanceActions: many(governanceActions),
  auditLogs: many(auditLogs),
  monthlyReports: many(monthlyReports),
  gmailOAuthToken: one(gmailOAuthTokens),
  emailSenders: many(emailSenders),
  emails: many(emails),
  scanJobs: many(scanJobs),
  scanHistory: many(scanHistory),
  subscription: one(userSubscriptions),
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

export const gmailOAuthTokensRelations = relations(gmailOAuthTokens, ({ one }) => ({
  user: one(users, {
    fields: [gmailOAuthTokens.userId],
    references: [users.id],
  }),
}));

export const emailSendersRelations = relations(emailSenders, ({ one, many }) => ({
  user: one(users, {
    fields: [emailSenders.userId],
    references: [users.id],
  }),
  emails: many(emails),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  user: one(users, {
    fields: [emails.userId],
    references: [users.id],
  }),
  sender: one(emailSenders, {
    fields: [emails.senderId],
    references: [emailSenders.id],
  }),
}));

export const scanJobsRelations = relations(scanJobs, ({ one }) => ({
  user: one(users, {
    fields: [scanJobs.userId],
    references: [users.id],
  }),
  historyEntry: one(scanHistory),
}));

export const scanHistoryRelations = relations(scanHistory, ({ one }) => ({
  user: one(users, {
    fields: [scanHistory.userId],
    references: [users.id],
  }),
  job: one(scanJobs, {
    fields: [scanHistory.jobId],
    references: [scanJobs.id],
  }),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
}));
