# Recent Changes

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
