# Shenv - Routes Reference

Quick reference for all available routes in the application.

---

## 🔐 Authentication Routes

### `/signin`
- **Purpose:** User login
- **Features:** Email/password authentication, JWT token generation
- **Redirects to:** `/assets` on success

### `/signup`
- **Purpose:** User registration
- **Features:**
  - Email/password registration
  - **Tier selection** (Free/Pro/Business)
  - Visual tier benefits display
- **Redirects to:** `/assets` on success

---

## 📊 Main Application Routes

### `/` (Home)
- **Purpose:** Root route
- **Behavior:** Redirects to `/assets`

### `/assets` ⭐ **PRIMARY ROUTE**
- **Purpose:** Unified assets dashboard
- **Features:**
  - Analytics view (default)
  - Asset list view (toggle)
  - **Batch Actions Panel** (top of analytics view)
  - Drive files + Gmail senders in one view
  - Connection status monitoring
  - Smart onboarding integration
- **Components:**
  - UnifiedAnalytics
  - UnifiedAssetList
  - BatchActionsPanel
  - UnifiedAssetDetails (modal)

### `/progress` ✨
- **Purpose:** Progress tracking and improvement metrics
- **Features:**
  - **ProgressCard** - 3 key metrics with trends
  - **BeforeAfterComparison** - Visual before/after
  - **ActivityTimeline** - Last 10 scans
  - Percentage improvement calculations
- **Use Case:** "How much have I improved?"

### `/organization` 🆕 **BUSINESS TIER**
- **Purpose:** Organization-wide analytics dashboard
- **Features:**
  - **OrganizationOverview** - Org stats (users, assets, risk breakdown)
  - **DepartmentBreakdown** - Risk by department
  - **RiskContributors** - Top 10 users with high-risk assets
  - Real-time metrics and navigation
- **Tier Required:** Business
- **Use Case:** "How is my organization doing overall?"

### `/organization/users/:email` 🆕 **BUSINESS TIER**
- **Purpose:** User detail and activity tracking
- **Features:**
  - User profile with department
  - Asset statistics (total, high/medium/low risk)
  - Recent activity (files created, public files, external shares)
  - Contact user and view assets actions
- **Tier Required:** Business
- **Use Case:** "What is this user's risk profile?"

### `/organization/departments/:department` 🆕 **BUSINESS TIER**
- **Purpose:** Department detail view
- **Features:**
  - Department user listing
  - Link to view department assets
  - Navigation to user details
- **Tier Required:** Business
- **Use Case:** "Who is in the Sales department?"

### `/organization/compliance` 🆕 **BUSINESS TIER**
- **Purpose:** Compliance reporting
- **Features:**
  - Executive summary with compliance score
  - Month-over-month comparison
  - Department breakdown
  - Top 10 risky assets
  - Remediation activity metrics
  - PDF download (coming soon)
- **Tier Required:** Business
- **Use Case:** "Generate monthly compliance report for board"

### `/scans/queue` 🆕
- **Purpose:** Queue status and scan history
- **Features:**
  - Real-time queue status (if `?jobId=X` provided)
  - Queue position and estimated wait
  - Scan history (last 5 scans)
  - Auto-polling every 10 seconds
- **Use Case:** "Where is my scan in the queue?"
- **Example:** `/scans/queue?jobId=123`

---

## 🗂️ Legacy Routes (Still Active)

### `/dashboard`
- **Purpose:** Original Sheets dashboard
- **Features:** Service account upload, basic sheets list
- **Status:** Legacy, `/assets` is preferred

### `/sheets/:id`
- **Purpose:** Sheet details page
- **Features:** Individual sheet metadata and permissions
- **Status:** Legacy

### `/drive`
- **Purpose:** Drive-only dashboard
- **Features:**
  - Dual-mode authentication (OAuth/Service Account)
  - Drive file analytics
  - Asset list with filters
- **Status:** Legacy, `/assets` combines Drive + Gmail

### `/gmail`
- **Purpose:** Gmail-only dashboard
- **Features:**
  - OAuth authentication
  - Sender management
  - Email discovery
  - Bulk operations
- **Status:** Legacy, `/assets` combines Drive + Gmail

### `/gmail/auth-success`
- **Purpose:** Gmail OAuth callback (success)
- **Behavior:** Shows success message, redirects to `/gmail`

### `/gmail/auth-error`
- **Purpose:** Gmail OAuth callback (error)
- **Behavior:** Shows error message

### `/drive/auth-callback`
- **Purpose:** Drive OAuth callback
- **Behavior:** Handles OAuth flow, redirects to `/drive`

---

## 🎯 Recommended User Flow

### For New Users:
1. `/signup` → Select tier → Create account
2. `/assets` → See onboarding modal
3. Connect Google (OAuth or Service Account)
4. Discover assets
5. View **Batch Actions Panel** suggestions
6. Click "View Progress" → `/progress`

### For Returning Users:
1. `/signin` → Login
2. `/assets` → View all assets
3. Check **Batch Actions Panel** for new risks
4. `/progress` → Track improvements
5. `/scans/queue` → Monitor active scans

---

## 🔗 Navigation Structure

```
Shenv App
│
├── Public Routes
│   ├── /signin
│   └── /signup
│
└── Protected Routes (require auth)
    │
    ├── Primary Routes ⭐
    │   ├── /assets (main dashboard)
    │   ├── /progress (improvement metrics)
    │   └── /scans/queue (queue status)
    │
    └── Legacy Routes
        ├── /dashboard (sheets)
        ├── /sheets/:id
        ├── /drive
        ├── /gmail
        ├── /gmail/auth-success
        ├── /gmail/auth-error
        └── /drive/auth-callback
```

---

## 🚦 Route Protection

All routes except `/signin` and `/signup` are protected with JWT authentication:

```typescript
// Protected Route Wrapper
if (!localStorage.getItem('token')) {
  redirect('/signin')
}
```

**Tier-based Protection (Backend):**
Some API endpoints require specific tiers:
- Free tier: All routes accessible (with queue)
- Paid tier: Skip queue feature
- Business tier: Organization features (Phase 3)

---

## 📱 Deep Links

### Queue Status
```
/scans/queue?jobId=123
```
Shows real-time status for job #123

### Asset Details
Currently opens in modal, no deep link yet
*Future:* `/assets/:id`

### Filter Presets
*Future:* `/assets?filter=high-risk` or `/assets?type=spreadsheet`

---

## 🎨 UI Views

### Analytics View (Default)
- `/assets` → Toggle: Analytics
- Shows: Statistics, batch actions, charts

### List View
- `/assets` → Toggle: Files
- Shows: Paginated asset list with filters

---

## 🔄 Redirects

| From | To | Condition |
|------|-----|-----------|
| `/` | `/assets` | Always |
| `/signin` | `/assets` | After successful login |
| `/signup` | `/assets` | After registration |
| `/gmail/auth-success` | `/gmail` | After OAuth |
| `/drive/auth-callback` | `/drive` | After OAuth |

---

## 📊 Route Usage Priority

**Primary Routes (70% of traffic):**
1. `/assets` - Main dashboard
2. `/progress` - Improvement tracking
3. `/organization` - Organization dashboard (business tier)
4. `/signin` / `/signup` - Authentication

**Secondary Routes (30% of traffic):**
4. `/scans/queue` - Queue monitoring
5. `/drive` - Drive-specific features
6. `/gmail` - Gmail-specific features

**Legacy Routes (10% of traffic):**
7. `/dashboard` - Old sheets dashboard
8. `/sheets/:id` - Sheet details

---

## 🎯 Quick Links for Testing

```bash
# Start fresh
http://localhost:5173/signup

# Main dashboard
http://localhost:5173/assets

# Progress tracking
http://localhost:5173/progress

# Queue status (replace jobId)
http://localhost:5173/scans/queue?jobId=1

# Legacy drive
http://localhost:5173/drive

# Legacy gmail
http://localhost:5173/gmail
```

---

**Last Updated:** February 1, 2026
**Total Routes:** 18 (4 primary business, 3 primary individual, 11 legacy/auth)
