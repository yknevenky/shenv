# Recent Changes

## Gmail Management Frontend — Complete Implementation

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
