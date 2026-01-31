feat(assets): unified assets page with Drive + Gmail integration

Implements a unified Assets page that consolidates Drive files and Gmail senders
into a single interface, replacing the fragmented Drive/Gmail/Sheets experience.
Users now have a centralized view of all workspace assets with unified risk scoring,
search, filtering, and analytics.

NEW FILES:

**Unified Asset Types (`shenv/src/types/assets.ts`)**
- UnifiedAsset type supporting multiple asset types (drive_file, email_sender, email_message)
- BaseAsset interface with common properties (id, name, owner, riskScore, etc.)
- DriveFileAsset with Drive-specific metadata (permissions, fileType, isPublic, etc.)
- EmailSenderAsset with Gmail-specific metadata (emailCount, attachments, verification)
- Type guards: isDriveFileAsset, isEmailSenderAsset, isEmailMessageAsset
- ASSET_TYPE_INFO and RISK_LEVEL_INFO constants for UI rendering
- getRiskLevel helper function (0-100 score → low/medium/high)

**Unified Asset Service (`shenv/src/services/unified-assets.ts`)**
- Aggregates data from Drive and Gmail APIs into unified asset model
- unifiedAssetApi with 6 methods:
  - getConnectionStatus(): Check Drive/Gmail connection status
  - getAssets(): Paginated asset list with filters and sorting
  - getStats(): Asset statistics (total, by type, by risk level)
  - discoverAssets(): Trigger discovery for Drive files and Gmail senders
  - getAssetDetails(): Get full details for specific asset
  - performAction(): Execute actions (delete, refresh, unsubscribe)
- Transforms Drive and Gmail data into unified format
- Platform connection detection (OAuth vs Service Account)

**Unified Asset List (`shenv/src/components/assets/UnifiedAssetList.tsx`)**
- Displays all asset types in unified table view
- Search across all assets
- Filter by type (Drive files, Email senders), risk level
- Sort by risk score, last activity, created date, name, owner
- Extended filters: verification status, sharing status, activity status
- Pagination with "Load More" (50 items per page)
- Asset type icons and risk score badges
- Status badges: Public, Orphaned, Inactive, Unverified, Subscribable, Unsubscribed
- Quick actions menu: View details, Refresh, Unsubscribe, Delete
- Type-specific subtitles (permission count for Drive, email count for Gmail)

**Unified Asset Details Modal (`shenv/src/components/assets/UnifiedAssetDetails.tsx`)**
- Modal showing full details for any asset type
- Common info section: Owner, created date, last activity, last synced
- Drive-specific sections:
  - File info: File type, MIME type, permission count, external ID
  - Status indicators: Public, Domain shared, Orphaned, Inactive
  - Permissions list with role badges (owner/writer/commenter/reader)
- Gmail-specific sections:
  - Sender info: Email address, display name, email count, attachment count
  - Activity timeline: First email date, last email date
  - Verification status: SPF/DKIM verification badge
  - Unsubscribe option with link if available
- Action buttons: Open in new tab, Refresh, Unsubscribe (Gmail), Delete

**Unified Analytics Dashboard (`shenv/src/components/assets/UnifiedAnalytics.tsx`)**
- Combined analytics for all asset types
- Connection status card (OAuth/Service Account, email, capabilities)
- 4 main stat cards: Total assets, Drive files, Email senders, High risk
- Risk distribution bar chart (high/medium/low with percentages)
- Quick action cards:
  - Discover Assets (scan Drive + Gmail)
  - Review High Risk (filter high-risk assets)
  - View Recent Activity (7-day activity count)
- Asset type breakdown with icons and descriptions

**Assets Page (`shenv/src/pages/AssetsPage.tsx`)**
- Main unified assets page
- Smart onboarding integration with mode detection (Personal vs Business)
- Connection status checking on mount
- View toggle: Overview (Analytics) vs All Assets (List)
- Discover Assets button with confirmation dialog
- Asset detail modal integration
- Mode badge showing Personal (OAuth) or Business (Service Account)
- Onboarding flow:
  - Auto-show for new users (not connected)
  - Mode toggle (Individual/Business)
  - LocalStorage persistence (assets_onboarding_complete, assets_onboarding_skipped)

UPDATED FILES:

**App Routing (`shenv/src/App.tsx`)**
- Added /assets route with AssetsPage component
- Changed default route from /dashboard to /assets
- Unified Assets is now the primary landing page

**Navigation Header (`shenv/src/components/Header.tsx`)**
- Redesigned navigation with Assets as primary
- Assets highlighted with blue badge when active
- Separated legacy pages (Sheets/Drive/Gmail) as secondary nav
- Added Logout button
- Active route highlighting
- Icons for all nav items (Package, FileText, HardDrive, Mail, LogOut)

**Drive Auth Callback (`shenv/src/pages/DriveAuthCallback.tsx`)**
- Updated redirect from /drive to /assets after OAuth success
- Updated button text from "Go to Drive Dashboard" to "Go to Assets"
- Updated loading message to "Redirecting to your Assets..."

**Backend OAuth Routes (`backend/src/routes/platforms.ts`)**
- Added public GET endpoint for Google OAuth callback (no auth required)
- GET /api/platforms/google/oauth/callback:
  - Receives OAuth code from Google
  - Redirects to frontend with code in query params
  - Bridges backend OAuth URL to frontend callback
- Existing POST endpoint remains for token exchange (requires JWT auth)
- Moved GET callback before auth middleware to allow public access

**Backend Environment (`backend/.env`)**
- Added GOOGLE_DRIVE_OAUTH_REDIRECT_URI for Drive OAuth
- Points to backend: http://localhost:3000/api/platforms/google/oauth/callback
- Google redirects here, then backend redirects to frontend

**Component Index Files**
- shenv/src/components/assets/index.ts - Exports unified components
- shenv/src/components/onboarding/index.ts - Exports onboarding components

UNIFIED ASSETS FEATURES:

**Unified Data Model:**
- Single UnifiedAsset type supporting multiple platforms
- Consistent risk scoring (0-100) across all asset types
- Platform abstraction (google_workspace, google_drive, gmail)
- Type-specific metadata in nested objects

**Search & Filtering:**
- Full-text search across asset names
- Filter by asset type (Drive files, Email senders)
- Filter by risk level (High, Medium, Low)
- Extended filters: verification, sharing status, activity, unsubscribe capability
- Sort by 5 fields: risk score, last activity, created date, name, owner
- Ascending/descending sort toggle

**Risk Scoring:**
- Unified risk calculation across platforms
- Drive risk factors: public access, domain sharing, orphaned, external permissions
- Gmail risk factors: unverified sender, high volume, attachment count
- Visual risk badges with color coding (red/yellow/green)

**Analytics:**
- Total asset count across all types
- Breakdown by type (Drive files, Email senders, Email messages)
- Risk distribution with percentages
- High-risk asset count
- Recent activity tracking (7 days)
- Connection status monitoring

**Actions:**
- View asset details (modal)
- Refresh asset data from source
- Delete asset (Drive: delete file, Gmail: delete all messages from sender)
- Unsubscribe from email sender (if unsubscribe link available)
- Open asset in new tab (Google Drive or Gmail)

**Onboarding Integration:**
- Smart mode detection based on email domain
- Individual mode (Gmail users): OAuth flow
- Business mode (custom domain): Service Account wizard
- Mode toggle for manual switching
- Progress persistence in localStorage

OAUTH FLOW (FIXED):

1. Frontend requests OAuth URL from backend
2. User clicks "Sign in with Google" → Opens Google consent screen
3. User grants permissions
4. Google redirects to backend: http://localhost:3000/api/platforms/google/oauth/callback?code=...
5. Backend GET endpoint (no auth) receives code
6. Backend redirects to frontend: http://localhost:5173/drive/auth-callback?code=...
7. Frontend DriveAuthCallback component receives code
8. Frontend calls backend POST /api/platforms/google/oauth/callback with code (JWT auth)
9. Backend exchanges code for tokens, stores encrypted in database
10. Frontend redirects to /assets page

**Why This Flow Works:**
- Google Cloud Console only needs backend URL configured
- Backend acts as bridge between Google and frontend
- No CORS issues (backend handles redirect)
- Frontend maintains JWT authentication for token storage

FILES CHANGED:

New (7 files):
- shenv/src/types/assets.ts
- shenv/src/services/unified-assets.ts
- shenv/src/components/assets/UnifiedAssetList.tsx
- shenv/src/components/assets/UnifiedAssetDetails.tsx
- shenv/src/components/assets/UnifiedAnalytics.tsx
- shenv/src/components/assets/index.ts
- shenv/src/pages/AssetsPage.tsx

Updated (5 files):
- shenv/src/App.tsx
- shenv/src/components/Header.tsx
- shenv/src/pages/DriveAuthCallback.tsx
- backend/src/routes/platforms.ts
- backend/.env

BUILD STATUS:
- Frontend TypeScript compilation: PASSED
- Frontend Vite build: PASSED (536.40 kB)
- Backend TypeScript compilation: PASSED

BREAKING CHANGES:
- Default route changed from /dashboard to /assets
- Navigation structure redesigned (Assets primary, legacy pages secondary)

TODO:
- Add Google Cloud Console redirect URI: http://localhost:3000/api/platforms/google/oauth/callback
- Restart backend server to pick up .env changes

NEXT STEPS:
- Backend API endpoints for unified asset operations
- Asset discovery backend integration
- Real-time asset updates
- Bulk operations (select multiple assets for actions)
- Advanced filters (date ranges, custom risk thresholds)
- Export to CSV/PDF reports
- Asset sharing workflows
- Scheduled discovery jobs

Refs: Jan 31, 2026 - Unified Assets Implementation + OAuth Flow Fix
