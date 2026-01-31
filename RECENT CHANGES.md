# Recent Changes

## Jan 30, 2026 - Google Drive OAuth Integration & Drive Analytics

### Backend Changes

**Drive OAuth Service (`backend/src/services/drive-oauth-service.ts`)** - NEW FILE
- Complete OAuth 2.0 flow for individual users (without Domain-Wide Delegation)
- Key methods:
  - `getAuthorizationUrl(userId)` - Generate OAuth URL with state parameter for CSRF protection
  - `exchangeCodeForTokens(code)` - Exchange authorization code for access/refresh tokens
  - `refreshAccessToken(refreshToken)` - Automatic token refresh when expired
  - `getDriveClient(accessToken)` - Create authenticated Drive client
  - `verifyToken(accessToken)` - Verify token and retrieve user info (email, name)
  - `revokeToken(accessToken)` - Revoke token on disconnect
- OAuth Scopes: `drive.readonly`, `drive.metadata.readonly`, `userinfo.email`, `userinfo.profile`
- AES-256 encrypted token storage in `platform_credentials` table

**Platform OAuth Endpoints (`backend/src/routes/platforms.ts`)** - 4 NEW ENDPOINTS
1. `GET /api/platforms/google/oauth/url` - Generate OAuth authorization URL
2. `POST /api/platforms/google/oauth/callback` - Handle OAuth callback, exchange code for tokens, store encrypted credentials
3. `DELETE /api/platforms/google/oauth/disconnect` - Disconnect OAuth, revoke tokens, delete credentials
4. `GET /api/platforms/google/oauth/status` - Check OAuth connection status (isConnected, email, authType)

**Google Workspace Adapter (`backend/src/services/platform-adapters/google-workspace-adapter.ts`)** - MAJOR REFACTOR
- **Dual-Mode Credential Support**: Now detects and handles both service account (DWD) and OAuth credentials
- New methods:
  - `detectCredentialType(credentials)` - Detect 'service_account' | 'oauth' | 'unknown'
  - `createOAuthClient(credentials)` - Create OAuth2Client from stored OAuth tokens
  - `createAuthClient(credentials)` - Factory method to create appropriate auth client based on credential type
- Updated all methods to use `createAuthClient()`:
  - `discoverAssets()` - Works with both credential types
  - `getAssetDetails()` - Works with both credential types
  - `getAssetPermissions()` - Works with both credential types
  - `deleteAsset()` - Works with both (requires write scope for OAuth)
  - `changeVisibility()` - Works with both (requires write scope for OAuth)
  - `removePermission()` - Works with both (requires write scope for OAuth)
  - `transferOwnership()` - Works with both (requires write scope for OAuth)
- `discoverWorkspaceUsers()` - Returns empty array for OAuth users (DWD only)

**Asset Analytics Endpoints (`backend/src/routes/assets.ts`)** - 5 NEW ENDPOINTS
1. `GET /api/assets/analytics/types` - Asset type distribution (spreadsheet, document, presentation, etc.)
2. `GET /api/assets/analytics/platforms` - Platform breakdown (google_workspace, microsoft_365, etc.)
3. `GET /api/assets/analytics/permissions` - Permission statistics (total, avg per asset, high permission count)
4. `GET /api/assets/analytics/risk` - Risk distribution (low, medium, high)
5. `GET /api/assets/analytics/overview` - Comprehensive analytics (all metrics in one call)
- All endpoints support optional `platform` query parameter for filtering

**Asset Repository (`backend/src/db/repositories/asset.ts`)** - 4 NEW METHODS
- `getTypeDistribution(userId, platform?)` - SQL GROUP BY assetType with COUNT
- `getPlatformDistribution(userId)` - SQL GROUP BY platform with COUNT
- `getPermissionStats(userId, platform?)` - Aggregate permission data (total, avg, max)
- `getRiskDistribution(userId, platform?)` - SQL risk level breakdown (0-30 low, 31-60 medium, 61-100 high)
- Updated 4 existing methods to accept optional `platform` parameter:
  - `findOrphanedAssets(userId, platform?)`
  - `findInactiveAssets(userId, platform?)`
  - `findHighRiskAssets(userId, platform?)`
  - `countByUser(userId, platform?)`

**Environment Variables (`backend/.env.example`)** - UPDATED
- Added `GOOGLE_CLIENT_ID` - OAuth client ID from Google Cloud Console
- Added `GOOGLE_CLIENT_SECRET` - OAuth client secret
- Added `GOOGLE_REDIRECT_URI` - OAuth callback URL (default: `http://localhost:3000/api/platforms/google/oauth/callback`)

**Token Refresh Middleware (`backend/src/middleware/token-refresh.ts`)** - NEW FILE
- Automatic OAuth token refresh before API calls (5-minute buffer before expiry)
- Three exported functions:
  - `refreshTokenIfNeeded(userId, platform)` - Main refresh logic with credential update
  - `withTokenRefresh(userId, platform)` - Convenient wrapper for route handlers
  - `checkTokenStatus(userId, platform)` - Check validity without refreshing (for UI warnings)
- Security features:
  - Automatic deactivation of old credentials after refresh
  - No token logging
  - Encrypted storage of refreshed tokens
  - Error handling for revoked refresh tokens
- Token lifecycle management:
  - Access token: 1 hour expiry → Auto-refresh at 55 minutes
  - Refresh token: 6 months expiry → User must re-authorize when expired

**Asset Discovery Service (`backend/src/services/asset-discovery-service.ts`)** - UPDATED
- Integrated token refresh middleware in 3 methods:
  - `discoverAssets()` - Auto-refreshes before discovering Drive files
  - `discoverWorkspaceUsers()` - Auto-refreshes before fetching workspace users
  - `refreshAsset()` - Auto-refreshes before refreshing individual asset
- Ensures fresh tokens for all Google API calls

### Documentation

**Drive OAuth Complete (`DRIVE_OAUTH_COMPLETE.md`)** - NEW FILE
- Comprehensive documentation of entire OAuth implementation
- Google Cloud Project setup instructions (OAuth client creation, consent screen, scopes, test users)
- API endpoint documentation with curl examples
- Security considerations (token encryption, state parameter, refresh token handling, scope limitations)
- OAuth vs Service Account comparison
- Testing checklist
- Frontend implementation guide (pending)

**Drive Analytics Implementation (`DRIVE_ANALYTICS_IMPLEMENTATION.md`)** - EXISTING FILE
- Phase 1 documentation for analytics endpoints
- API examples and response formats

### Key Features Added

1. **Dual-Mode Architecture** - System now supports two authentication modes:
   - **Business Users**: Service Account with Domain-Wide Delegation → Full workspace access including Admin API
   - **Individual Users**: Google OAuth 2.0 → Personal Drive access only

2. **Google Drive OAuth Flow** - Complete OAuth 2.0 implementation:
   - Authorization URL generation with CSRF protection
   - Token exchange and secure storage
   - Automatic token refresh
   - Token revocation on disconnect
   - User info retrieval (email, name)

3. **Drive Analytics** - 5 comprehensive analytics endpoints:
   - Asset type distribution
   - Platform breakdown
   - Permission statistics
   - Risk distribution
   - All-in-one overview

4. **Platform Filtering** - All asset queries now support platform filtering for multi-cloud environments

5. **Security** - AES-256 encrypted OAuth token storage, state parameter for CSRF protection, automatic token refresh

### Technical Improvements

- **Platform-Agnostic Design**: GoogleWorkspaceAdapter now handles both credential types transparently
- **Automatic Token Refresh**: OAuth tokens auto-refresh when expired (using refresh token)
- **Credential Type Detection**: Smart detection of service account vs OAuth credentials
- **Unified Auth Factory**: Single `createAuthClient()` method creates appropriate client for any credential type
- **Error Handling**: OAuth users gracefully handled for DWD-only features (workspace user discovery)

### Limitations

**OAuth Users Cannot:**
- Discover workspace users (requires Admin API + DWD)
- Access other users' files (only personal Drive)
- Perform domain-wide governance actions

**OAuth Users CAN:**
- Discover their own Drive files (full read access)
- View file permissions
- Analyze risk scores
- Delete files (with write scope)
- Modify permissions (with write scope)

### Next Steps (Pending)

**Phase 4:** Token refresh middleware to auto-refresh before API calls
**Phase 5:** Frontend UI implementation
- Drive connection page with OAuth flow
- Drive dashboard with analytics visualizations
- Mode selector (Business vs Individual)
- Asset list with filtering and search
- Permission viewer for individual files

**Phase 6:** End-to-end testing

---

## Jan 27, 2026 - Enhanced Gmail Sender Metadata & Unsubscribe Feature

### Backend Changes

**Database Schema (`backend/src/db/schema.ts`)**
- Added 6 new columns to `email_senders` table:
  - `attachmentCount` - Track total attachments from each sender
  - `unsubscribeLink` - Store extracted unsubscribe URL from email headers
  - `hasUnsubscribe` - Boolean flag for unsubscribe capability
  - `isVerified` - SPF/DKIM email authentication status
  - `isUnsubscribed` - User unsubscribe status
  - `unsubscribedAt` - Timestamp of unsubscribe action

**Email Sender Repository (`backend/src/db/repositories/email-sender.ts`)**
- Updated `upsert()` to accept 4 optional metadata parameters
- Added `markAsUnsubscribed(senderId)` method for tracking unsubscribe actions

**Gmail Email Service (`backend/src/services/gmail-email-service.ts`)**
- **Major Refactor** - Complete rewrite of sender fetching logic:
  - New `fetchAllSenders()` - Processes entire inbox with auto-pagination (handles 35k+ emails)
  - Enhanced `fetchSendersPaginated()` - Now extracts 4 email headers: `From`, `Date`, `List-Unsubscribe`, `Authentication-Results`
  - New `batchGetMessages()` - Processes 40 messages concurrently with 1-second delays (respects 50 calls/sec Gmail API quota)
  - New `fetchMessageWithRetry()` - Exponential backoff retry logic (2s, 4s, 8s) for rate limit errors
  - New `extractUnsubscribeLink()` - Parses HTTP/mailto URLs from `List-Unsubscribe` header
  - New `checkEmailVerification()` - Validates SPF/DKIM from `Authentication-Results` header
- **Rate Limiting Strategy**:
  - Chunks of 40 messages per batch
  - 1-second delay between batches
  - Automatic retry on 429/quota errors
  - Continues processing if individual messages fail
- **Attachment Detection**: Uses Gmail's `HAS_ATTACHMENT` label from message metadata
- Updated `SenderInfo` interface with 4 new fields

**Gmail API Routes (`backend/src/routes/gmail.ts`)**
- New endpoint `POST /api/gmail/senders/fetch-all` - One-shot full inbox scan (auto-paginated)
  - Processes all messages in batches
  - Logs progress per page
  - Returns unique senders with full metadata
  - Optional `saveToDb` parameter (default: true)
- New endpoint `POST /api/gmail/senders/:senderId/unsubscribe` - Unsubscribe from sender
  - Validates sender ownership
  - Checks `hasUnsubscribe` flag
  - Marks as unsubscribed in DB
  - Returns unsubscribe link for user to complete
- New endpoint `GET /api/gmail/senders/unverified` - List unverified senders (failed SPF/DKIM)
  - Pagination support (limit/offset)
  - Filters where `isVerified = false`
- Updated `POST /api/gmail/senders/fetch` to save new metadata fields

### Frontend Changes

**Sender List Component (`shenv/src/components/gmail/SenderList.tsx`)**
- Added 4 new quick filter options:
  - `verified` - Senders with passing SPF/DKIM
  - `unverified` - Senders with failed authentication
  - `has_attachments` - Senders who sent attachments
  - `can_unsubscribe` - Senders with unsubscribe capability
- New icons imported: `Paperclip`, `ShieldAlert`, `ShieldCheck`, `Mail`, `MailX`
- Added `onUnsubscribe` prop for unsubscribe callback
- Fixed select-all checkbox to work with filtered results (was selecting all unfiltered senders)

**Gmail Dashboard (`shenv/src/pages/GmailDashboard.tsx`)**
- Connected `onUnsubscribe` handler to call backend API
- Displays unsubscribe link in confirmation modal

**Gmail Service (`shenv/src/services/gmail.ts`)**
- Updated `GmailSender` interface with new metadata fields

### Key Features Added

1. **Full Inbox Discovery** - Process 35k+ emails in one API call with automatic pagination
2. **Email Verification** - Track SPF/DKIM authentication status per sender
3. **Unsubscribe Management** - Extract and track unsubscribe links from email headers
4. **Attachment Analytics** - Count and filter senders by attachment volume
5. **Smart Rate Limiting** - Respects Gmail API quotas with batching and retry logic

### Technical Improvements

- **Performance**: Concurrent batch processing (40 messages at once) reduces total API calls
- **Resilience**: Exponential backoff retry on rate limits prevents quota exhaustion
- **Data Quality**: Parses 4 email headers for richer sender metadata
- **User Experience**: New filtering options in UI for verification, attachments, unsubscribe

---

## Jan 27, 2026 - Gmail Management Frontend — Complete Implementation

### New Components (12 files)

**Pages:**
- `src/pages/GmailAuthSuccess.tsx` — OAuth success page with 3-second auto-redirect to `/gmail`
- `src/pages/GmailAuthError.tsx` — OAuth error page showing `?error=` param with retry/back buttons

**Gmail Components:**
- `src/components/gmail/InboxOverview.tsx` — 5 stat cards (Total Messages, Unread, Threads, Spam, Unique Senders) with skeleton loading
- `src/components/gmail/DataFreshness.tsx` — "Synced X ago" indicator with live/snapshot status dot and refresh link
- `src/components/gmail/DiscoveryWizard.tsx` — 3-phase modal (Mode Select → Scanning → Results) with Quick/Deep scan, auto-continue with configurable limits (500–5000 messages), stop/continue, live counters
- `src/components/gmail/CleanupSuggestions.tsx` — Collapsible panel showing top 5 senders by volume with one-click Review/Delete
- `src/components/gmail/ConfirmDialog.tsx` — Reusable confirmation modal with danger/primary variants, backdrop close, Escape key
- `src/components/gmail/DangerConfirmDialog.tsx` — Type-to-confirm modal (type "DELETE") for bulk operations with affected item count
- `src/components/gmail/DeleteResults.tsx` — Post-delete results modal showing deleted/failed counts with retry option
- `src/components/gmail/LabelsBreakdown.tsx` — Collapsible searchable labels table with sortable columns, system/user label distinction, color dots
- `src/components/gmail/ActivityLog.tsx` — localStorage-backed collapsible log (last 20 actions) with timestamps and clear button; exports `addActivity()` helper
- `src/components/gmail/ExportButton.tsx` — Client-side CSV export of senders list

### Modified Files

**`src/services/gmail.ts`**
- Added interfaces: `LabelStats`, `InboxStats`, `DiscoverResponse`, `FetchSendersResponse`, `DeleteResult`
- Updated `SendersListResponse` to match backend shape (nested `pagination`, `stats`, `filters`)
- Added methods: `getInboxStats()`, `fetchSenders(maxMessages?, pageToken?)`
- Updated `getSenders()` with `sortBy`, `sortOrder`, `search` params
- Updated `discover()` with `maxResults` and `pageToken` pagination support

**`src/App.tsx`**
- Added `/gmail/auth-success` and `/gmail/auth-error` protected routes

**`src/components/gmail/SenderList.tsx`**
- Added search bar with parent-controlled value
- Added sort dropdown (Email Count, Last Email, First Email, Name, Email Address) with asc/desc toggle
- Added quick filter chips (All, High Volume 50+, Recent 7 days)
- Added sticky bottom action bar when items selected showing sender count and estimated email count
- Added empty state with Inbox icon and "Scan Inbox" button
- Added CSV export button in toolbar
- Added `search`, `onSearchChange`, `sortBy`, `sortOrder`, `onSortChange`, `totalCount`, `onScanInbox` props

**`src/components/gmail/EmailViewer.tsx`**
- Added unread indicator (blue left border + blue dot + bold subject)
- Added paperclip icon for emails with attachments
- Added unread count in header ("X emails (Y unread)")
- Added client-side search input filtering emails by subject/snippet
- Added copy menu (three-dot button) with "Copy Message ID" and "Copy Thread ID" using clipboard API

**`src/pages/GmailDashboard.tsx`**
- Complete rewrite orchestrating all new components
- State: debounced search (300ms), sort/filter, focus mode, discovery wizard, confirm dialogs, delete results, inbox stats, data freshness
- Parallel data loading (`Promise.all` for inbox stats + senders)
- Focus Mode toggle: hides InboxOverview, CleanupSuggestions, LabelsBreakdown, ActivityLog — shows only SenderList
- All deletes go through ConfirmDialog (single) or DangerConfirmDialog (bulk) instead of `window.confirm()`
- Delete results shown in DeleteResults modal
- Activity logging via `addActivity()` for scan, delete, bulk delete, disconnect
- Fallback handling for old backend response shape
- Connection status badge in header
- Dismissible error banner

---

## Auth Error Messages Fix

**Problem:** Signup and signin showed generic/misleading error messages. The main issue was the axios 401 interceptor redirecting to `/signin` on signin's own "Invalid email or password" 401 response, so the user never saw the actual error.

**`src/services/api.ts`**
- Updated 401 response interceptor to skip redirect for `/auth/signin` and `/auth/signup` endpoints so their error messages reach the UI

**`src/pages/Signin.tsx`**
- Added client-side validation with field-level errors (email required/format, password required/length) shown inline with red border
- Field errors auto-clear on typing
- Added `extractErrorMessage()` mapping: backend messages surfaced directly, plus fallbacks for 401 ("Invalid email or password"), 404 ("No account found"), 429, 5xx, timeout, and network errors
- Added `noValidate` to prevent browser validation conflicts

**`src/pages/Signup.tsx`**
- Same field-level validation (email, password, confirm password) with inline errors
- Same `extractErrorMessage()` with fallbacks for 400, 409/422, 429, 5xx, timeout, network errors
- Password hint text swaps to error text on validation failure

---

## CORS Fix

**Problem:** Browser sent OPTIONS preflight (returned 204) but never followed with the actual POST. Hono's CORS middleware wasn't explicitly declaring allowed headers, so the browser blocked the request after preflight. Axios surfaced this as a network error with no response object.

**`backend/src/server.ts`**
- Added explicit `allowMethods` and `allowHeaders: ["Content-Type", "Authorization"]` to the CORS configuration
