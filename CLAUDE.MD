# Shenv - Google Workspace Governance Platform

## Project Overview

**Shenv** is a comprehensive B2B SaaS platform for Google Workspace governance, focusing on **Google Sheets** compliance and **Gmail** management. It provides centralized visibility, risk detection, governance actions, and intelligent inbox management across an organization.

### Problem Statement
Organizations lack:

**Google Sheets:**
- **Visibility**: Who has access to which Google Sheets
- **Risk Management**: Detection of over-shared or orphaned sheets
- **Governance**: Controlled processes for sheet lifecycle management
- **Compliance**: Audit trails and monthly governance reports
- **Control**: Approval-driven governance actions

**Gmail:**
- **Inbox Overhead**: High-volume senders cluttering institutional inboxes
- **Email Verification**: No tracking of SPF/DKIM authentication failures
- **Unsubscribe Management**: No centralized way to identify and manage subscriptions
- **Attachment Analytics**: No visibility into attachment-heavy senders
- **Sender Intelligence**: Limited metadata about email sources

### Solution

**Google Sheets Governance:**
1. **Discovers** all Google Sheets and workspace users via Google APIs
2. **Analyzes** permissions and calculates risk scores (0-100)
3. **Governs** with approval-driven actions (delete, change visibility, etc.)
4. **Reports** comprehensive monthly governance metrics
5. **Audits** all actions in an immutable audit trail

**Gmail Management:**
1. **Discovers** all email senders with smart rate-limited full inbox scanning
2. **Analyzes** sender metadata (volume, attachments, verification, unsubscribe links)
3. **Tracks** email authentication (SPF/DKIM) to identify unverified senders
4. **Manages** bulk cleanup with type-to-confirm safety checks
5. **Extracts** unsubscribe links for one-click unsubscribe workflow

---

## Tech Stack

### Backend
- **Framework**: Hono.js (modern, lightweight web framework)
- **Runtime**: Node.js 18+ with TypeScript (ES Modules)
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Authentication**: JWT tokens (Hono's built-in middleware)
- **Password Security**: bcrypt (10 rounds)
- **Encryption**: AES-256-CBC for service account storage
- **Google APIs**: Admin Directory, Drive API, Sheets API, Gmail API
- **Service Account**: Per-user service accounts with DWD support
- **Logging**: Winston logger with timestamps
- **Container**: Docker Compose for PostgreSQL

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Compiler**: React Compiler (experimental optimizations)
- **Styling**: TailwindCSS v4 (modern, utility-first)
- **Routing**: React Router v7
- **State Management**: React Query for server state
- **HTTP Client**: Axios with JWT interceptors

### Development Tools
- **TypeScript**: Strict mode enabled
- **Hot Reload**: tsx watch (backend), Vite HMR (frontend)
- **Database Migrations**: Drizzle Kit
- **API Documentation**: Markdown with examples

---

## Architecture

### High-Level Architecture
```
User Browser
    ↓
Frontend (React + Vite) - Port 5173
    ↓ (HTTP/REST + JWT Auth)
Backend API (Hono.js) - Port 3000
    ↓                           ↓
PostgreSQL (Docker)     Google APIs
(11 tables:             (Admin, Drive, Sheets, Gmail)
 - users                via OAuth 2.0 (Gmail) or
 - workspace_users      service account (Sheets)
 - sheets
 - permissions
 - governance_actions
 - action_approvals
 - audit_logs
 - monthly_reports
 - gmail_oauth_tokens
 - email_senders
 - emails)
```

### Backend Structure (Complete)
```
backend/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── server.ts                   # Hono app with all routes
│   ├── db/
│   │   ├── connection.ts           # PostgreSQL connection
│   │   ├── schema.ts               # Complete database schema (11 tables)
│   │   └── repositories/           # Repository pattern (11 repositories)
│   │       ├── user.ts             # User CRUD
│   │       ├── workspace-user.ts   # Workspace users
│   │       ├── sheet.ts            # Sheets with risk filtering
│   │       ├── permission.ts       # Permission snapshots
│   │       ├── governance-action.ts # Governance actions
│   │       ├── action-approval.ts  # Approval workflow
│   │       ├── audit-log.ts        # Immutable audit trail
│   │       ├── monthly-report.ts   # Monthly reports
│   │       ├── gmail-oauth-token.ts # Gmail OAuth tokens
│   │       ├── email-sender.ts     # Email sender metadata
│   │       └── email.ts            # Email messages
│   ├── services/                   # Business logic (8 services)
│   │   ├── google-auth.ts          # Google API client creation
│   │   ├── workspace-service.ts    # Admin API user discovery
│   │   ├── sheets-discovery-service.ts # Sheet discovery + risk analysis
│   │   ├── governance-service.ts   # Execute governance actions
│   │   ├── approval-workflow-service.ts # Approval logic
│   │   ├── report-generation-service.ts # Monthly report generation
│   │   ├── gmail-oauth-service.ts  # Gmail OAuth 2.0 flow
│   │   └── gmail-email-service.ts  # Gmail discovery + sender analysis
│   ├── routes/                     # API routes (7 modules)
│   │   ├── auth.ts                 # Authentication (signup/signin)
│   │   ├── service-account.ts      # Service account management
│   │   ├── sheets.ts               # Sheet discovery endpoints
│   │   ├── governance.ts           # Governance actions (5 endpoints)
│   │   ├── approvals.ts            # Approval workflow (5 endpoints)
│   │   ├── reports.ts              # Monthly reports (7 endpoints)
│   │   └── gmail.ts                # Gmail management (15+ endpoints)
│   ├── middleware/
│   │   └── auth.ts                 # JWT + user attachment
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── utils/
│       └── logger.ts               # Winston logger
├── drizzle.config.ts               # Drizzle ORM configuration
├── package.json                    # Scripts: dev, db:push, db:studio
├── tsconfig.json                   # TypeScript ES modules config
├── .env                            # Environment variables
└── API_ENDPOINTS.md                # Complete API documentation (27 endpoints)

Root:
├── docker-compose.yml              # PostgreSQL setup
├── CLAUDE.MD                       # This file
├── NEXT STEPS.MD                   # Original PRD
└── IMPLEMENTATION_SUMMARY.md       # Detailed implementation guide
```

---

## Database Schema (PostgreSQL)

### 11 Tables (All Implemented)

**Sheets Governance (8 tables):**

#### 1. users
```typescript
{
  id: serial (PK)
  email: text (unique)
  passwordHash: text (bcrypt)
  serviceAccount: text (AES-256 encrypted)
  hasServiceAccount: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 2. workspace_users
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  email: text
  fullName: text
  isAdmin: boolean
  isSuspended: boolean
  createdAt: timestamp
  lastLoginAt: timestamp
  lastSyncedAt: timestamp
}
```

#### 3. sheets
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  sheetId: text (Google Sheet ID)
  name: text
  ownerEmail: text
  url: text
  createdAt: timestamp
  lastModifiedAt: timestamp
  permissionCount: integer
  isOrphaned: boolean
  isInactive: boolean
  riskScore: integer (0-100)
  lastSyncedAt: timestamp
}
```

#### 4. permissions
```typescript
{
  id: serial (PK)
  sheetId: integer (FK -> sheets)
  permissionId: text (Google permission ID)
  email: text
  role: text (owner/writer/commenter/reader)
  type: text (user/group/domain/anyone)
  displayName: text
  snapshotDate: timestamp
}
```

#### 5. governance_actions
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  sheetId: integer (FK -> sheets)
  actionType: enum (delete/change_visibility/remove_permission/transfer_ownership)
  status: enum (pending/approved/rejected/executed/failed)
  requestedBy: text (email)
  reason: text
  metadata: jsonb
  createdAt: timestamp
  executedAt: timestamp
  errorMessage: text
}
```

#### 6. action_approvals
```typescript
{
  id: serial (PK)
  actionId: integer (FK -> governance_actions)
  approverEmail: text
  isApproved: boolean (null = pending)
  comment: text
  respondedAt: timestamp
}
```

#### 7. audit_logs (Immutable)
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  eventType: text
  actorEmail: text
  targetResource: text
  timestamp: timestamp
  metadata: jsonb
}
```

#### 8. monthly_reports
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  reportMonth: date
  reportData: jsonb (15+ metrics)
  generatedAt: timestamp
}
```

**Gmail Management (3 tables):**

#### 9. gmail_oauth_tokens
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  accessToken: text (AES-256 encrypted)
  refreshToken: text (AES-256 encrypted)
  expiresAt: timestamp
  scope: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 10. email_senders
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  senderEmail: text
  senderName: text
  emailCount: integer
  attachmentCount: integer         // NEW: Total attachments from sender
  firstEmailDate: timestamp
  lastEmailDate: timestamp
  unsubscribeLink: text            // NEW: Extracted from List-Unsubscribe header
  hasUnsubscribe: boolean          // NEW: Whether sender provides unsubscribe
  isVerified: boolean              // NEW: SPF/DKIM verification status
  isUnsubscribed: boolean          // NEW: User has unsubscribed
  unsubscribedAt: timestamp        // NEW: When user unsubscribed
  lastSyncedAt: timestamp
}
```

#### 11. emails
```typescript
{
  id: serial (PK)
  userId: integer (FK -> users)
  senderId: integer (FK -> email_senders)
  messageId: text (Gmail message ID)
  threadId: text (Gmail thread ID)
  subject: text
  snippet: text
  isRead: boolean
  hasAttachment: boolean
  labelIds: jsonb (array of label IDs)
  receivedAt: timestamp
  lastSyncedAt: timestamp
}
```

---

## API Endpoints (42+ Total)

**Sheets Governance (27 endpoints):**

### Authentication (2)
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login with JWT

### Service Account (3)
- `POST /service-account/upload` - Upload encrypted service account
- `GET /service-account/status` - Check service account
- `DELETE /service-account` - Remove service account

### Sheet Discovery (4)
- `POST /api/sheets/discover` - Discover sheets + analyze risks
- `POST /api/sheets/workspace/discover` - Discover workspace users (Admin API)
- `GET /api/sheets` - List sheets with filters (orphaned, inactive, risk)
- `GET /api/sheets/:id` - Get sheet details with permissions

### Governance Actions (5)
- `POST /governance/actions` - Create governance action
- `GET /governance/actions` - List all actions (filterable)
- `GET /governance/actions/:id` - Get action details
- `POST /governance/actions/:id/execute` - Execute approved action
- `GET /governance/audit-logs` - View audit trail

### Approval Workflow (5)
- `GET /approvals/pending` - Get pending approvals for user
- `POST /approvals/:id/approve` - Approve an action
- `POST /approvals/:id/reject` - Reject an action
- `GET /approvals/history` - Get approval history
- `POST /approvals/webhooks/approval` - External approval webhook

### Monthly Reports (7)
- `POST /reports/monthly/generate` - Generate monthly report
- `GET /reports/monthly` - List all reports
- `GET /reports/monthly/latest` - Get latest report with analysis
- `GET /reports/monthly/:id` - Get specific report
- `GET /reports/monthly/compare` - Compare two months
- `GET /reports/summary` - Get overall statistics
- `DELETE /reports/monthly/:id` - Delete report

### Health (1)
- `GET /health` - Health check (no auth)

**Gmail Management (15+ endpoints):**

### Gmail OAuth (3)
- `GET /api/gmail/auth/url` - Get OAuth authorization URL
- `POST /api/gmail/auth/callback` - Handle OAuth callback
- `DELETE /api/gmail/disconnect` - Disconnect Gmail and delete tokens

### Gmail Discovery (5)
- `GET /api/gmail/inbox/stats` - Get inbox statistics (total, unread, labels)
- `POST /api/gmail/emails/discover` - Discover emails (paginated scan)
- `POST /api/gmail/senders/fetch` - Fetch senders with metadata (paginated)
- `POST /api/gmail/senders/fetch-all` - Fetch ALL senders from entire inbox (auto-paginated) **NEW**
- `GET /api/gmail/labels` - List all Gmail labels

### Gmail Sender Management (7+)
- `GET /api/gmail/senders` - List senders with pagination/search/sort
- `GET /api/gmail/senders/:id` - Get sender details
- `GET /api/gmail/senders/unverified` - List unverified senders (failed SPF/DKIM) **NEW**
- `GET /api/gmail/senders/:id/emails` - List emails from specific sender
- `POST /api/gmail/senders/:id/unsubscribe` - Mark sender as unsubscribed **NEW**
- `DELETE /api/gmail/senders/:id` - Delete all messages from sender
- `POST /api/gmail/senders/bulk-delete` - Bulk delete messages from multiple senders

**See [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) for complete Sheets API documentation**

---

## Key Features

### Google Sheets Governance

#### 1. Risk Detection System
**7-Factor Risk Scoring (0-100)**:
- Anyone with link: 40 points
- Domain-wide access: 25 points
- External users: 20 points
- Orphaned sheets: 20 points
- External editors/owners: 15 points
- High user count (50+): 10 points
- Inactive (6+ months): 10 points

Risk levels: Low (0-30), Medium (31-60), High (61-100)

#### 2. Governance Actions
**4 Action Types** (via Google APIs):
- **Delete**: Permanently delete sheet
- **Change Visibility**: Remove 'anyone' and 'domain' permissions
- **Remove Permission**: Remove specific user/group access
- **Transfer Ownership**: Transfer to new owner

#### 3. Approval Workflow
- Multi-approver support
- Auto-approve when all approve
- Auto-reject on any rejection
- Webhook support for external systems

#### 4. Monthly Reports
**15+ Governance Metrics**:
- Total sheets, workspace users, avg risk score
- Orphaned, inactive, high-risk counts
- Sheets with public/domain/external access
- Governance actions (created/executed/failed)
- Top 10 risky sheets with reasons
- Risk distribution breakdown
- Month-over-month comparisons

#### 5. Audit Trail
- Immutable logs (no updates/deletes)
- Every governance action logged
- Actor and timestamp tracking
- Full metadata capture

### Gmail Management

#### 1. Smart Inbox Discovery
**Full Inbox Scanning**:
- Process entire inbox (35k+ emails) in one API call
- Automatic pagination (500 messages per page)
- Batch processing (40 messages concurrently)
- Rate limiting: 1-second delays between batches
- Respects Gmail API quota limits (50 calls/sec)
- Exponential backoff retry on rate limit errors (2s, 4s, 8s)

#### 2. Sender Intelligence
**Rich Metadata Extraction**:
- Email volume tracking per sender
- Attachment count analytics
- Email verification (SPF/DKIM authentication)
- Unsubscribe link extraction from headers
- First/last email date tracking
- Sender name extraction

#### 3. Email Verification Tracking
**Security & Authenticity**:
- Parse `Authentication-Results` header
- Verify SPF (Sender Policy Framework)
- Verify DKIM (DomainKeys Identified Mail)
- Flag unverified senders (failed auth checks)
- Filter by verification status in UI

#### 4. Unsubscribe Management
**One-Click Unsubscribe Workflow**:
- Extract `List-Unsubscribe` header from emails
- Parse HTTP and mailto unsubscribe URLs
- Mark sender as unsubscribed in database
- Return unsubscribe link for user completion
- Track unsubscribe timestamp

#### 5. Attachment Analytics
**Attachment Tracking**:
- Count total attachments per sender
- Use Gmail's `HAS_ATTACHMENT` label
- Filter senders by attachment presence
- Identify heavy attachment senders

#### 6. Bulk Email Cleanup
**Safe Deletion Workflow**:
- Type-to-confirm safety checks (type "DELETE")
- Bulk delete messages from multiple senders
- Delete all messages from specific sender
- Track deletion results (success/failed counts)
- Activity logging for all deletions

#### 7. Advanced Filtering
**Sender Workbench Filters**:
- Search by email or name
- Sort by volume, date, email address
- Filter by verification status (verified/unverified)
- Filter by attachment presence
- Filter by unsubscribe capability
- Quick filters: High Volume (50+), Recent (7 days)

---

## Environment Variables

### Backend (.env)
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shenv
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
ENCRYPTION_KEY=your-super-secret-encryption-key-change-in-production-64-chars
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

---

## Development Workflow

### Getting Started

1. **Start PostgreSQL**:
   ```bash
   docker compose up -d
   # Verify: docker ps
   ```

2. **Install Dependencies**:
   ```bash
   cd backend && npm install
   cd ../shenv && npm install
   ```

3. **Run Database Migrations**:
   ```bash
   cd backend
   npm run db:push
   # Verify: docker exec shenv-postgres psql -U postgres -d shenv -c "\dt"
   ```

4. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   # Server runs on http://localhost:3000
   ```

5. **Start Frontend** (separate terminal):
   ```bash
   cd shenv
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

### Database Commands
```bash
npm run db:push         # Push schema to database
npm run db:studio       # Open Drizzle Studio (DB GUI)
npm run db:generate     # Generate migrations
```

### Docker Commands
```bash
docker compose up -d    # Start PostgreSQL
docker compose down     # Stop PostgreSQL
docker compose logs     # View logs
```

---

## Implementation Status

### ✅ Phase 1: Discovery & Analysis (100%)
- [x] User authentication with JWT
- [x] Service account management (encrypted)
- [x] Workspace user discovery (Google Admin API)
- [x] Sheet discovery (Google Drive API)
- [x] Permission analysis with snapshots
- [x] Risk score calculation (7 factors)
- [x] Orphaned sheet detection
- [x] Inactive sheet detection (6+ months)

### ✅ Phase 2: Governance Actions (100%)
- [x] Create governance action requests
- [x] Multi-approver workflow
- [x] Approve/reject actions
- [x] Execute via Google APIs:
  - [x] Delete sheet
  - [x] Change visibility
  - [x] Remove permission
  - [x] Transfer ownership
- [x] Immutable audit logging
- [x] Webhook support

### ✅ Phase 3: Reporting & Compliance (100%)
- [x] Generate monthly reports (15+ metrics)
- [x] Risk breakdown analysis
- [x] Top risky sheets identification
- [x] Month-over-month comparison
- [x] Highlights and recommendations
- [x] Report summary statistics

### ⚠️ Phase 4: Automation (0%)
- [ ] Background job scheduler (bull/agenda)
- [ ] Automated daily workspace sync
- [ ] Automated monthly report generation
- [ ] Scheduled sheet discovery

### ✅ Phase 5: Gmail Management (100%)
- [x] Gmail OAuth 2.0 flow (authorization + token refresh)
- [x] Full inbox discovery with automatic pagination
- [x] Sender metadata extraction (6 new fields)
- [x] Email verification tracking (SPF/DKIM)
- [x] Unsubscribe link extraction and management
- [x] Attachment analytics per sender
- [x] Bulk email deletion with safety checks
- [x] Smart rate limiting (batching + exponential backoff)
- [x] Advanced filtering (verification, attachments, unsubscribe)

### ✅ Frontend - Gmail Management (100%)
- [x] Gmail OAuth success/error pages
- [x] Inbox overview dashboard (5 stat cards)
- [x] Discovery wizard (Quick/Deep scan modes)
- [x] Sender workbench (search, sort, 7 filters)
- [x] Email viewer with unread indicators
- [x] Bulk delete with type-to-confirm dialog
- [x] Cleanup suggestions panel
- [x] Labels breakdown viewer
- [x] Activity log with localStorage persistence
- [x] CSV export for senders
- [x] Focus mode toggle
- [x] Data freshness indicators

### ✅ Frontend - Drive Management (100%)
- [x] Drive OAuth callback page
- [x] ConnectDrive component with dual-mode selector
- [x] Personal Mode (OAuth 2.0) authentication flow
- [x] Business Mode (Service Account) upload flow
- [x] DriveAnalytics dashboard (4 stat cards, type distribution, risk distribution)
- [x] DriveAssetList (search, sort, 7 filters, pagination)
- [x] AssetDetailsModal (permissions, risk warnings, file metadata)
- [x] View toggle (Analytics vs Files)

### ✅ Unified Assets Page (100%)
- [x] Unified asset types and data model (BaseAsset, type guards)
- [x] Unified asset service aggregating Drive + Gmail APIs
- [x] UnifiedAssetList component (search, filter, sort, pagination)
- [x] UnifiedAssetDetails modal for all asset types
- [x] UnifiedAnalytics dashboard with combined stats
- [x] AssetsPage with smart onboarding integration
- [x] Navigation redesign (Assets primary, legacy secondary)
- [x] OAuth flow fix (public GET callback endpoint)
- [x] Default route changed to /assets
- [x] Risk scoring unified across platforms (0-100 scale)
- [x] Type-specific badges and status indicators
- [x] Quick actions (View, Refresh, Delete, Unsubscribe)
- [x] Connection status monitoring (OAuth/Service Account)

### ⚠️ Frontend - Sheets Governance (Partial)
- [x] Authentication pages (Signin/Signup)
- [x] Dashboard with service account upload
- [x] Basic sheets list
- [ ] Governance actions UI
- [ ] Approval workflow UI
- [ ] Monthly reports viewer
- [ ] Audit log viewer

---

## Google API Setup

### Required APIs

**For Sheets Governance:**
1. **Google Admin SDK** - Workspace user discovery
2. **Google Drive API** - Sheet discovery and permissions
3. **Google Sheets API** - Sheet metadata

**For Gmail Management:**
4. **Gmail API** - Email discovery and sender analysis

### Service Account Setup
Each user needs to:
1. Create Google Cloud Project
2. Enable the 3 APIs above
3. Create Service Account
4. Download JSON key
5. (Optional) Enable Domain-Wide Delegation
6. Upload JSON via Shenv interface

### Required Scopes

**Sheets (via Service Account with DWD):**
```
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive (for governance actions)
```

**Gmail (via OAuth 2.0):**
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify (for deletions)
https://www.googleapis.com/auth/gmail.metadata (for sender analysis)
```

---

## Design Principles

### Code Quality
- **Type Safety**: Strict TypeScript, no `any` types
- **Clean Architecture**: Repository pattern, service layer, routes
- **Error Handling**: Try/catch blocks, meaningful error messages
- **Security**: JWT + bcrypt + AES-256 + immutable audits
- **Documentation**: Inline comments + API docs + implementation guide

### API Design
- RESTful endpoints
- Consistent response formats
- Pagination on all list endpoints
- Proper HTTP status codes
- JWT authentication required (except health check)

### Database Design
- Normalized schema
- Foreign key relationships
- Indexed queries
- Type-safe operations with Drizzle ORM
- Immutable audit logs (no update/delete)

---

## Important Notes for Claude

### Current System State
1. **Sheets Backend is 100% complete** - All 27 Sheets endpoints working
2. **Gmail Backend is 100% complete** - All 15+ Gmail endpoints working
3. **Drive Backend is 100% complete** - OAuth + Service Account dual-mode, analytics, asset management
4. **Unified Assets is 100% complete** - Frontend aggregates Drive + Gmail, unified UI at /assets
5. **Database is set up** - PostgreSQL in Docker with 11+ tables
6. **Gmail Frontend is 100% complete** - Full sender management UI with 12 components
7. **Drive Frontend is 100% complete** - Asset list, details modal, dual-mode auth selector
8. **Unified Assets Frontend is 100% complete** - Asset list, details modal, analytics, smart onboarding
9. **Sheets Frontend is basic** - Only authentication and basic sheet list
10. **No background jobs** - Manual triggering only
11. **No automated tests** - Only manual testing done

### When Working on This Project
1. **Unified Assets is the primary landing page** - Default route is /assets, not /dashboard
2. **Drive is fully complete** - Backend + Frontend with dual auth modes
3. **Gmail is fully complete** - Backend + Frontend with sender management
4. **Unified Assets is fully complete** - Frontend-only, aggregates existing Drive + Gmail APIs
5. **Sheets backend is done** - Focus on Sheets frontend or background jobs
6. **Use the repositories** - Don't write raw SQL
7. **Follow TypeScript strictly** - Use inferred types from Drizzle
8. **Test with real Google APIs** - Service account or OAuth required
9. **Check existing code first** - Most patterns already implemented
10. **Refer to API_ENDPOINTS.md** - Complete API reference
11. **Drive supports dual-mode** - OAuth for personal, Service Account for business
12. **Rate limiting is critical** - Gmail API has strict quota limits (50 calls/sec)
13. **OAuth flow uses backend bridge** - GET callback (no auth) redirects to frontend

### Code Style (Already Established)
- Functional components with hooks
- Async/await (no promise chains)
- Repository pattern for database
- Service layer for business logic
- Routes for HTTP handling
- Descriptive variable names
- Single responsibility functions

---

## Useful References

- [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) - Complete Sheets API documentation
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Sheets implementation guide
- [LAST COMMIT.md](LAST%20COMMIT.md) - Latest commit summary (Unified Assets + OAuth Flow Fix)
- [RECENT CHANGES.md](RECENT%20CHANGES.md) - Historical changelog
- [README.md](README.md) - Project overview and setup instructions
- [NEXT STEPS.MD](NEXT%20STEPS.MD) - Original Sheets PRD
- [Hono.js Docs](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Google Admin SDK](https://developers.google.com/admin-sdk)
- [Google Drive API](https://developers.google.com/drive/api)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Gmail API](https://developers.google.com/gmail/api)
- [Gmail API Quotas](https://developers.google.com/gmail/api/reference/quota) - Important for rate limiting
