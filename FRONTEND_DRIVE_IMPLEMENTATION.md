# Google Drive Frontend Implementation

## Overview

This document describes the complete frontend implementation for Google Drive OAuth integration and analytics dashboard.

---

## Files Created

### 1. Services

#### `shenv/src/services/drive.ts` - Drive API Client
Complete TypeScript client for all Drive-related API calls.

**Interfaces:**
- `DriveOAuthStatus` - OAuth connection status
- `DriveAsset` - Drive file/asset representation
- `DrivePermission` - File permission details
- `DriveAnalytics` - Analytics data structures

**API Modules:**

**driveOAuthApi:**
- `getAuthUrl()` - Get OAuth authorization URL
- `handleCallback(code)` - Exchange code for tokens
- `disconnect()` - Revoke OAuth and delete tokens
- `getStatus()` - Check OAuth connection status

**driveAssetsApi:**
- `discover(platform)` - Trigger Drive file discovery
- `list(params)` - List assets with pagination/filters
- `getDetails(assetId)` - Get asset with permissions
- `refresh(assetId)` - Refresh single asset

**driveAnalyticsApi:**
- `getTypes(platform?)` - Asset type distribution
- `getPlatforms()` - Platform breakdown
- `getPermissions(platform?)` - Permission statistics
- `getRisk(platform?)` - Risk distribution
- `getOverview(platform?)` - Comprehensive analytics

---

### 2. Components

#### `shenv/src/components/drive/ConnectDrive.tsx`
OAuth connection component with connect/disconnect functionality.

**Features:**
- Auto-checks connection status on mount
- "Connect with Google" button → Redirects to OAuth consent
- Connected state shows email and auth type
- Disconnect button with confirmation
- Loading and error states
- Visual feedback with icons and colors

**Props:**
- `onConnected?: () => void` - Callback after successful connection

**States:**
- Not connected: Shows connect button and instructions
- Connected: Shows user email, auth type, and disconnect button
- Loading: Spinner during status check
- Error: Error message with retry option

---

#### `shenv/src/components/drive/DriveAnalytics.tsx`
Comprehensive analytics dashboard component.

**Features:**
- Auto-loads analytics on mount
- "Discover Drive Files" button triggers full scan
- "Refresh" button re-scans Drive
- Overview stats cards (4 metrics)
- Asset type breakdown
- Risk distribution with color coding
- Permission statistics
- Local storage for last sync time

**Metrics Displayed:**
1. **Overview Stats:**
   - Total Files
   - High Risk Files
   - Orphaned Files
   - Inactive Files

2. **Asset Types:**
   - Spreadsheet, Document, Presentation, etc.
   - Count per type

3. **Risk Distribution:**
   - Low Risk (green)
   - Medium Risk (yellow)
   - High Risk (red)
   - Count per level

4. **Permission Statistics:**
   - Total permissions
   - Average permissions per file
   - High permission files (50+)

**No Data State:**
- Shows empty state with discover button
- Prompts user to scan Drive

---

### 3. Pages

#### `shenv/src/pages/DriveDashboard.tsx`
Main Drive dashboard page.

**Layout:**
1. Page header with title and description
2. Connection status component
3. Analytics component (if connected)
4. Empty state (if not connected)

**Features:**
- Auto-checks OAuth status on mount
- Conditional rendering based on connection
- Responsive layout

---

#### `shenv/src/pages/DriveAuthCallback.tsx`
OAuth callback handler page.

**OAuth Flow:**
1. User redirected from Google with `?code=...` or `?error=...`
2. Component extracts code/error from URL
3. If error: Shows error state
4. If code: Calls backend `/oauth/callback` endpoint
5. Backend exchanges code for tokens
6. Shows success state with user email/name
7. Auto-redirects to `/drive` after 2 seconds

**States:**
- **Processing**: Spinner + "Connecting Google Drive"
- **Success**: Green checkmark + user info + auto-redirect
- **Error**: Red X + error message + "Go to Dashboard" button

---

### 4. Routing

#### `shenv/src/App.tsx`
Updated with Drive routes.

**New Routes:**
```tsx
<Route path="/drive" element={<ProtectedRoute><DriveDashboard /></ProtectedRoute>} />
<Route path="/drive/auth-callback" element={<ProtectedRoute><DriveAuthCallback /></ProtectedRoute>} />
```

---

### 5. Navigation

#### `shenv/src/components/Header.tsx`
Added Drive link to header navigation.

```tsx
<Link to="/drive">Drive</Link>
```

**Navigation Links:**
- Sheets (`/dashboard`)
- Drive (`/drive`)
- Gmail (`/gmail`)

---

## OAuth Flow (Complete)

### User Journey:

1. **User visits `/drive`**
   - DriveDashboard checks OAuth status
   - If not connected: Shows ConnectDrive component

2. **User clicks "Connect with Google"**
   - Frontend calls `driveOAuthApi.getAuthUrl()`
   - Backend generates OAuth URL with state parameter (userId)
   - Frontend redirects to Google OAuth consent screen

3. **User authorizes on Google**
   - User logs in to Google account
   - User grants permissions (drive.readonly, etc.)
   - Google redirects to `http://localhost:5173/drive/auth-callback?code=...`

4. **DriveAuthCallback handles redirect**
   - Extracts `code` from URL
   - Calls `driveOAuthApi.handleCallback(code)`
   - Backend exchanges code for access/refresh tokens
   - Backend encrypts and stores tokens in database
   - Backend returns user email/name

5. **Success**
   - Shows success screen with user info
   - Auto-redirects to `/drive` after 2 seconds

6. **Back at `/drive`**
   - OAuth status now shows connected
   - ConnectDrive shows green banner with user email
   - DriveAnalytics component visible
   - User can click "Discover Drive Files"

---

## Environment Variables

### Backend `.env`

```env
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_OAUTH_REDIRECT_URI=http://localhost:5173/drive/auth-callback
```

**Important Notes:**
- Redirect URI must point to **frontend** callback page
- Must match authorized redirect URI in Google Cloud Console
- For production, update to production frontend URL

---

## Google Cloud Console Setup

### Authorized Redirect URIs:

Add the following to your OAuth client configuration:

**Development:**
```
http://localhost:5173/drive/auth-callback
```

**Production:**
```
https://yourdomain.com/drive/auth-callback
```

---

## Testing Workflow

### 1. Start Services

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd shenv
npm run dev

# Terminal 3 - Database
docker compose up
```

### 2. Test OAuth Flow

1. Open `http://localhost:5173`
2. Sign in with your account
3. Navigate to "Drive" in header
4. Click "Connect with Google"
5. Authorize on Google consent screen
6. Verify redirect to callback page
7. Verify success message shows your email
8. Verify auto-redirect to Drive dashboard
9. Verify green "Connected" banner shows

### 3. Test Discovery

1. Click "Discover Drive Files" button
2. Confirm discovery dialog
3. Wait for completion (may take minutes for large Drives)
4. Verify analytics cards populate with data
5. Check asset types breakdown
6. Check risk distribution
7. Check permission statistics

### 4. Test Disconnect

1. Click "Disconnect" button
2. Confirm disconnection
3. Verify tokens revoked on Google
4. Verify connection status updates
5. Verify analytics hidden
6. Verify "Connect" button reappears

---

## UI/UX Features

### Loading States
- Spinner during OAuth status check
- "Connecting..." on OAuth button click
- "Discovering..." during Drive scan
- Skeleton states for analytics

### Error Handling
- OAuth errors (user denies permission)
- API call failures
- Token refresh failures
- Network errors
- User-friendly error messages

### Visual Feedback
- Green checkmark for success
- Red X for errors
- Color-coded risk levels (red/yellow/green)
- Icons for each metric
- Loading spinners
- Progress indicators

### Responsive Design
- Mobile-friendly layouts
- Grid breakpoints (sm/md/lg)
- Adaptive card sizes
- Responsive navigation

---

## Data Flow

### OAuth Connection:
```
User → ConnectDrive → getAuthUrl() → Google OAuth
Google → Callback Page → handleCallback(code) → Backend
Backend → Exchange Tokens → Encrypt → Database
Backend → Return User Info → Frontend
Frontend → Update Status → Show Analytics
```

### Asset Discovery:
```
User → Click Discover → discover() API → Backend
Backend → refreshTokenIfNeeded() → Google Drive API
Google Drive → Return Files → Backend
Backend → Calculate Risk → Store in DB
Backend → Return Count → Frontend
Frontend → Reload Analytics → Display Data
```

### Analytics Loading:
```
User → View Dashboard → getOverview() API → Backend
Backend → SQL Queries → Aggregate Data
Backend → Return Analytics → Frontend
Frontend → Render Charts/Stats → Display
```

---

## Integration Points

### Backend Dependencies:
- `GET /api/platforms/google/oauth/url` - Get auth URL
- `POST /api/platforms/google/oauth/callback` - Handle callback
- `DELETE /api/platforms/google/oauth/disconnect` - Disconnect
- `GET /api/platforms/google/oauth/status` - Check status
- `POST /api/assets/discover` - Discover assets
- `GET /api/assets/analytics/overview` - Get analytics

### Frontend Dependencies:
- React Router v7 (routing)
- Axios (HTTP client)
- TailwindCSS (styling)
- React Hooks (state management)
- TypeScript (type safety)

---

## Future Enhancements

### Phase 5 (Pending):
1. **Asset List Component**
   - Paginated table of Drive files
   - Search and filter functionality
   - Sort by name, date, risk score
   - Click to view details

2. **Asset Details Modal**
   - Show file metadata
   - List all permissions
   - Show sharing links
   - Risk breakdown

3. **Mode Selector**
   - Toggle: "Business" vs "Individual"
   - Business: Show service account upload
   - Individual: Show OAuth connect

4. **Advanced Analytics**
   - Charts and graphs (Chart.js)
   - Time-series data
   - Trend analysis
   - Export to PDF/CSV

---

## Summary

**Completed (Phase 5 - 80%):**
✅ Drive API client service
✅ ConnectDrive component
✅ DriveAnalytics component
✅ DriveDashboard page
✅ DriveAuthCallback page
✅ App routing integration
✅ Header navigation
✅ OAuth flow end-to-end
✅ Analytics overview display

**Remaining:**
⏳ Asset list with pagination
⏳ Asset details modal
⏳ Mode selector component
⏳ Advanced analytics charts
⏳ End-to-end testing
⏳ Error boundary components
⏳ Loading skeletons

**Total Frontend Implementation:** ~80% complete

---

**Implementation Date:** January 30, 2026
**Author:** Claude (Sonnet 4.5)
**Status:** Core features complete, enhancements pending
