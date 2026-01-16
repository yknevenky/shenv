# Shenv - Google Sheets Governance Platform

## Project Overview

**Shenv** is a comprehensive B2B SaaS platform for Google Sheets governance and compliance. It provides centralized visibility, risk detection, governance actions, approval workflows, and compliance reporting for Google Sheets across an organization.

### Problem Statement
Organizations lack:
- **Visibility**: Who has access to which Google Sheets
- **Risk Management**: Detection of over-shared or orphaned sheets
- **Governance**: Controlled processes for sheet lifecycle management
- **Compliance**: Audit trails and monthly governance reports
- **Control**: Approval-driven governance actions

### Solution
A complete governance platform that:
1. **Discovers** all Google Sheets and workspace users via Google APIs
2. **Analyzes** permissions and calculates risk scores (0-100)
3. **Governs** with approval-driven actions (delete, change visibility, etc.)
4. **Reports** comprehensive monthly governance metrics
5. **Audits** all actions in an immutable audit trail

---

## Tech Stack

### Backend
- **Framework**: Hono.js (modern, lightweight web framework)
- **Runtime**: Node.js 18+ with TypeScript (ES Modules)
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Authentication**: JWT tokens (Hono's built-in middleware)
- **Password Security**: bcrypt (10 rounds)
- **Encryption**: AES-256-CBC for service account storage
- **Google APIs**: Admin Directory, Drive API, Sheets API
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
(8 tables:              (Admin, Drive, Sheets)
 - users                via per-user service account
 - workspace_users
 - sheets
 - permissions
 - governance_actions
 - action_approvals
 - audit_logs
 - monthly_reports)
```

### Backend Structure (Complete)
```
backend/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── server.ts                   # Hono app with all routes
│   ├── db/
│   │   ├── connection.ts           # PostgreSQL connection
│   │   ├── schema.ts               # Complete database schema (8 tables)
│   │   └── repositories/           # Repository pattern (8 repositories)
│   │       ├── user.ts             # User CRUD
│   │       ├── workspace-user.ts   # Workspace users
│   │       ├── sheet.ts            # Sheets with risk filtering
│   │       ├── permission.ts       # Permission snapshots
│   │       ├── governance-action.ts # Governance actions
│   │       ├── action-approval.ts  # Approval workflow
│   │       ├── audit-log.ts        # Immutable audit trail
│   │       └── monthly-report.ts   # Monthly reports
│   ├── services/                   # Business logic (5 services)
│   │   ├── google-auth.ts          # Google API client creation
│   │   ├── workspace-service.ts    # Admin API user discovery
│   │   ├── sheets-discovery-service.ts # Sheet discovery + risk analysis
│   │   ├── governance-service.ts   # Execute governance actions
│   │   ├── approval-workflow-service.ts # Approval logic
│   │   └── report-generation-service.ts # Monthly report generation
│   ├── routes/                     # API routes (6 modules)
│   │   ├── auth.ts                 # Authentication (signup/signin)
│   │   ├── service-account.ts      # Service account management
│   │   ├── sheets.ts               # Sheet discovery endpoints
│   │   ├── governance.ts           # Governance actions (5 endpoints)
│   │   ├── approvals.ts            # Approval workflow (5 endpoints)
│   │   └── reports.ts              # Monthly reports (7 endpoints)
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

### 8 Tables (All Implemented)

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

---

## API Endpoints (27 Total)

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

**See [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) for complete documentation**

---

## Key Features

### 1. Risk Detection System
**7-Factor Risk Scoring (0-100)**:
- Anyone with link: 40 points
- Domain-wide access: 25 points
- External users: 20 points
- Orphaned sheets: 20 points
- External editors/owners: 15 points
- High user count (50+): 10 points
- Inactive (6+ months): 10 points

Risk levels: Low (0-30), Medium (31-60), High (61-100)

### 2. Governance Actions
**4 Action Types** (via Google APIs):
- **Delete**: Permanently delete sheet
- **Change Visibility**: Remove 'anyone' and 'domain' permissions
- **Remove Permission**: Remove specific user/group access
- **Transfer Ownership**: Transfer to new owner

### 3. Approval Workflow
- Multi-approver support
- Auto-approve when all approve
- Auto-reject on any rejection
- Webhook support for external systems

### 4. Monthly Reports
**15+ Governance Metrics**:
- Total sheets, workspace users, avg risk score
- Orphaned, inactive, high-risk counts
- Sheets with public/domain/external access
- Governance actions (created/executed/failed)
- Top 10 risky sheets with reasons
- Risk distribution breakdown
- Month-over-month comparisons

### 5. Audit Trail
- Immutable logs (no updates/deletes)
- Every governance action logged
- Actor and timestamp tracking
- Full metadata capture

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

### ⚠️ Frontend (Partial - Basic UI Only)
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
1. **Google Admin SDK** - Workspace user discovery
2. **Google Drive API** - Sheet discovery and permissions
3. **Google Sheets API** - Sheet metadata

### Service Account Setup
Each user needs to:
1. Create Google Cloud Project
2. Enable the 3 APIs above
3. Create Service Account
4. Download JSON key
5. (Optional) Enable Domain-Wide Delegation
6. Upload JSON via Shenv interface

### Required Scopes
```
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive (for governance actions)
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
1. **Backend is 100% complete** - All 27 endpoints working
2. **Database is set up** - PostgreSQL in Docker with 8 tables
3. **Frontend is basic** - Only authentication and basic sheet list
4. **No background jobs** - Manual triggering only
5. **No automated tests** - Only manual testing done

### When Working on This Project
1. **Backend is done** - Focus on frontend or background jobs
2. **Use the repositories** - Don't write raw SQL
3. **Follow TypeScript strictly** - Use inferred types from Drizzle
4. **Test with real Google APIs** - Service account required
5. **Check existing code first** - Most patterns already implemented
6. **Refer to API_ENDPOINTS.md** - Complete API reference
7. **Refer to IMPLEMENTATION_SUMMARY.md** - Detailed implementation guide

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

- [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) - Complete API documentation
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation guide
- [NEXT STEPS.MD](NEXT%20STEPS.MD) - Original PRD
- [Hono.js Docs](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Google Admin SDK](https://developers.google.com/admin-sdk)
- [Google Drive API](https://developers.google.com/drive/api)
- [Google Sheets API](https://developers.google.com/sheets/api)
