# Shenv - Workspace Governance Platform

## Project Overview

**Shenv** is an enterprise-grade B2B SaaS platform for multi-platform workspace governance. It provides centralized visibility, risk detection, automated scanning, and compliance reporting across Google Workspace, Microsoft 365, and Zoho Workplace.

### Current Implementation Status

**Overall Progress:** 90% Complete
- ✅ Core Platform: 100%
- ✅ Business Features: 100%
- ✅ Automation: 100%
- ⚠️ Integration: 20% (email + payment pending)
- ❌ Testing: 0%

---

## Tech Stack

### Backend
- **Framework**: Hono.js
- **Runtime**: Node.js 18+ with TypeScript (ES Modules)
- **Database**: PostgreSQL 16 with Drizzle ORM (14 tables)
- **Authentication**: JWT tokens with tier-based access control
- **Encryption**: AES-256-CBC for credentials
- **Background Jobs**: 3 workers (scan, schedule, reports)
- **APIs**: Google Drive, Gmail, Admin SDK
- **Container**: Docker Compose for PostgreSQL

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4
- **Routing**: React Router v7 (18 routes)
- **State Management**: React Query
- **Components**: 40+ reusable components

---

## Architecture

### High-Level Flow
```
User Browser (React)
    ↓ JWT Auth
Backend API (Hono.js) + 3 Background Workers
    ↓
PostgreSQL (14 tables)
    ↓
Google APIs (Drive, Gmail, Admin)
```

### Database Schema (14 Tables)

**Core Tables:**
- `users` - User accounts with tier (free/paid/business)
- `workspace_users` - Organization members with departments
- `platform_credentials` - Encrypted OAuth/service account credentials
- `user_subscriptions` - Payment and subscription tracking

**Asset Management:**
- `assets` - Universal asset model (files, emails, sheets)
- `permissions` - Permission snapshots
- `governance_actions` - Governance workflow
- `action_approvals` - Multi-approver workflow
- `audit_logs` - Immutable audit trail
- `monthly_reports` - Legacy Sheets reports

**Gmail Management:**
- `gmail_oauth_tokens` - Gmail OAuth tokens
- `email_senders` - Sender metadata (volume, verification, unsubscribe)
- `emails` - Email messages

**Queue System:**
- `scan_jobs` - FIFO queue with priority
- `scan_history` - Historical scan tracking
- `api_quota_usage` - Daily API quota tracking

---

## Key Features (Implemented)

### 1. Multi-Tier System ✅
- **Individual Free**: Queue-based scans, 10k API quota/day
- **Individual Paid**: Skip queue, full scans, 100k quota ($29/mo)
- **Business**: Organization features, instant scans, unlimited

### 2. Queue System ✅
- FIFO with priority (business=200, paid=100, free=0)
- Real-time queue position tracking
- Background worker processing (polls every 5s)
- Status: queued → processing → completed/failed

### 3. Risk Management ✅
- 7-factor risk scoring (0-100)
- Action suggestions (Make Private, Delete, Transfer, Review)
- Batch operations for multiple assets
- Risk levels: High (61-100), Medium (31-60), Low (0-30)

### 4. Progress Tracking ✅
- Before/after comparison
- Activity timeline with scan history
- 3 key metrics (risk score, high-risk count, secured assets)
- Improvement percentage calculations

### 5. Organization Features ✅ (Business Tier)
- Organization dashboard (users, assets, risk breakdown)
- Department analytics and filtering
- User detail views with activity tracking
- Compliance reporting with month-over-month comparison

### 6. Automation ✅
- **Scan Worker**: Background job processor
- **Scheduled Scans**: Daily (business) / Weekly (individual)
- **Monthly Reports**: Auto-generated on 1st of month
- **Email Notifications**: 5 templates (scan complete, alerts, digest, reports)

---

## API Endpoints (60+ total)

### Authentication (2)
- `POST /auth/signup` - With tier selection
- `POST /auth/signin` - JWT-based

### Platform Credentials (4)
- `POST /api/platforms/credentials` - Upload credentials
- `GET /api/platforms/credentials` - List credentials
- `GET /api/platforms/credentials/:id` - Get credential
- `DELETE /api/platforms/credentials/:id` - Remove credential

### Assets (8+)
- `GET /api/assets` - List all assets (paginated, filtered)
- `GET /api/assets/:id` - Asset details
- `GET /api/assets/suggestions/batch` - Batch suggestions
- `POST /api/assets/discover` - Trigger discovery
- + Asset management endpoints

### Gmail (15+)
- OAuth flow (3 endpoints)
- Discovery (5 endpoints)
- Sender management (7+ endpoints)

### Queue System (6) **NEW**
- `POST /api/scans/queue` - Queue scan
- `GET /api/scans/queue/:id/status` - Get status
- `POST /api/scans/queue/:id/skip` - Skip queue (paid)
- `GET /api/scans/history` - Scan history
- `GET /api/scans/improvement` - Improvement metrics
- `GET /api/scans/quota` - API quota usage

### Organization (8) **NEW** (Business Tier)
- `GET /api/organization/overview` - Org stats
- `GET /api/organization/departments` - Department breakdown
- `GET /api/organization/departments/list` - Department names
- `GET /api/organization/risk-contributors` - Top risk users
- `GET /api/organization/users/:email` - User detail
- `GET /api/organization/departments/:dept/users` - Dept users
- `GET /api/organization/compliance/current` - Current report
- `GET /api/organization/compliance/:year/:month` - Specific report

### Legacy Governance (12)
- Governance actions (5 endpoints)
- Approval workflow (5 endpoints)
- Monthly Sheets reports (7 endpoints)

---

## Frontend Routes (18 total)

**Primary Routes:**
- `/` → Redirect to /assets
- `/assets` → Unified asset dashboard **MAIN**
- `/progress` → Progress tracking
- `/organization` → Org dashboard (business tier)

**Authentication:**
- `/signin` → Login
- `/signup` → Registration with tier selection

**Organization (Business Tier):**
- `/organization/users/:email` → User detail
- `/organization/departments/:dept` → Department detail
- `/organization/compliance` → Compliance reports

**Queue & Automation:**
- `/scans/queue` → Queue status and history

**Legacy Features:**
- `/dashboard` → Sheets dashboard
- `/sheets/:id` → Sheet details
- `/drive` → Drive management
- `/gmail` → Gmail management
- + OAuth callback routes

---

## Background Workers (3)

All start automatically with server:

**1. Scan Worker** (`scan-worker.ts`)
- Polls queue every 5 seconds
- Processes scan jobs
- Calculates risk scores
- Sends email notifications
- Updates queue positions

**2. Scheduled Scan Checker** (`scheduled-scans.ts`)
- Runs every hour
- Checks for due scans (daily/weekly based on tier)
- Auto-queues scans with priority
- Respects subscription status

**3. Monthly Report Generator** (`report-generator.ts`)
- Runs daily at 3 AM
- Generates reports on 1st of month (business tier)
- Emails compliance reports
- Previous month data

---

## Environment Variables

### Backend (.env)
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shenv
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-super-secret-encryption-key-64-chars
NODE_ENV=development

# Optional (not yet integrated):
EMAIL_ENABLED=false
EMAIL_FROM=noreply@shenv.com
SENDGRID_API_KEY=your_key
STRIPE_SECRET_KEY=your_key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

---

## Development Workflow

### Setup
```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
cd backend && npm install
cd ../shenv && npm install

# 3. Run database migration
cd backend && npm run db:push

# 4. Start backend (includes 3 workers)
npm run dev

# 5. Start frontend (new terminal)
cd ../shenv && npm run dev
```

### Testing Queue System
```bash
# Queue a scan via API
curl -X POST http://localhost:3000/api/scans/queue \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"scope":"quick","platforms":["google_workspace"]}'

# Watch backend logs for:
# - "Found job to process { jobId: 1 }"
# - "Scan job completed { duration: 3, assetsFound: 85 }"
# - "EMAIL (disabled) { to: 'user@example.com' }"
```

---

## Critical Gaps (10% Remaining)

### Blocking Production
1. **Database Migration** ❌ Run `npm run db:push`
2. **Email Provider** ❌ Integrate SendGrid/Postmark (2-3 hours)
3. **Payment Integration** ❌ Stripe checkout + webhooks (4-6 hours)
4. **Action Execution** ❌ Make Private, Delete, Transfer (6-8 hours)
5. **Real Drive Scanning** ❌ Replace mock data with Drive API (4-6 hours)

### Post-MVP
6. **Testing Suite** ❌ Unit + integration tests (16-24 hours)
7. **Error Monitoring** ❌ Sentry integration (2 hours)
8. **Worker Dashboard** (Optional) Monitor background jobs
9. **PDF Reports** (Optional) Compliance report export
10. **Weekly Digest** (Optional) Auto-send emails

---

## File Structure

### Backend (45+ files)
```
backend/src/
├── services/          # 16 services (queue, org, email, etc.)
├── workers/           # 3 workers (scan, schedule, reports)
├── repositories/      # 16 repositories (one per table)
├── routes/            # 9 route files (60+ endpoints)
├── middleware/        # 2 middleware (auth, tier)
├── db/
│   ├── schema.ts      # 14 tables
│   └── connection.ts
├── utils/
│   └── logger.ts
└── index.ts           # Server + worker startup
```

### Frontend (50+ files)
```
shenv/src/
├── pages/             # 16 pages
├── components/
│   ├── assets/        # 6 components (unified assets)
│   ├── drive/         # 4 components
│   ├── gmail/         # 12+ components
│   ├── organization/  # 3 components
│   ├── progress/      # 3 components
│   ├── queue/         # 1 component
│   └── Header.tsx, Layout.tsx
├── services/
│   └── api.ts         # Axios client
└── App.tsx            # 18 routes
```

---

## Documentation

**Essential Docs (6 files):**
1. `README.md` - Project overview
2. `CLAUDE.md` - This file (AI instructions)
3. `PRODUCT_FEATURES.md` - Product requirements
4. `ROUTES_REFERENCE.md` - Route documentation
5. `REFACTORING_COMPLETE.md` - Implementation summary
6. `COMPLETE_AUDIT.md` - Gap analysis
7. `QUICK_START.md` - Getting started

---

## Important Notes for AI

### Current State
- **90% complete** - Core platform fully implemented
- **Database NOT migrated** - Schema exists but not pushed
- **Workers auto-start** - No manual trigger needed
- **Email disabled** - Console logging only
- **Mock scanning** - Drive API uses placeholder data
- **No payments** - Stripe not integrated
- **No tests** - Manual testing only

### When Working on This Project
1. **Check COMPLETE_AUDIT.md** for gap analysis
2. **All new features are implemented** - Focus on integration
3. **3 workers run automatically** - Don't create new ones
4. **Queue system is complete** - Just needs testing
5. **Email templates exist** - Need provider integration
6. **Action buttons are placeholders** - Need execution logic
7. **Database migration required** - Run before testing

### Code Style
- TypeScript strict mode
- Repository pattern for DB
- Service layer for business logic
- Async/await (no promise chains)
- Descriptive variable names
- JWT in Authorization header

---

## Quick Reference

**Database:** 14 tables, 4 new in refactoring
**Backend:** 60+ API endpoints, 3 background workers
**Frontend:** 18 routes, 40+ components
**Workers:** Scan (5s), Schedule (1h), Reports (daily)
**Queue:** FIFO + priority (business > paid > free)
**Tiers:** free/paid/business
**Status:** 90% complete, needs integration + testing

---

**Last Updated:** February 1, 2026
**Version:** 2.0 (Post-Refactoring)
**Next Step:** Database migration → Testing → Email integration → Payment integration
