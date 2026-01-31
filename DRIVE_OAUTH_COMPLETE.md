# Google Drive OAuth Integration - Complete Implementation

## Overview

This document describes the complete implementation of Google Drive OAuth 2.0 for **individual users** who want to analyze their personal Google Drive assets without needing Domain-Wide Delegation (DWD).

**Dual-Mode Architecture:**
- **Business Users**: Use Service Account with DWD → Can access all workspace data including Admin API
- **Individual Users**: Use Google OAuth 2.0 → Access only their own Drive files

---

## Backend Implementation

### Phase 1: OAuth Service (COMPLETED)

**File:** `backend/src/services/drive-oauth-service.ts`

**Key Features:**
- Authorization URL generation with state parameter
- Token exchange (authorization code → access/refresh tokens)
- Token refresh (automatic when expired)
- Token verification and user info retrieval
- Token revocation on disconnect
- AES-256 encrypted token storage

**OAuth Scopes:**
```typescript
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',           // Read Drive files
  'https://www.googleapis.com/auth/drive.metadata.readonly',  // Read metadata
  'https://www.googleapis.com/auth/userinfo.email',           // Get user email
  'https://www.googleapis.com/auth/userinfo.profile',         // Get user name
];
```

**Key Methods:**
- `getAuthorizationUrl(userId: number): string` - Generate OAuth URL with state
- `exchangeCodeForTokens(code: string): Promise<DriveOAuthTokens>` - Exchange code for tokens
- `refreshAccessToken(refreshToken: string)` - Refresh expired token
- `getDriveClient(accessToken: string)` - Get authenticated Drive client
- `verifyToken(accessToken: string)` - Verify token and get user info
- `revokeToken(accessToken: string)` - Revoke token on disconnect

---

### Phase 2: OAuth Endpoints (COMPLETED)

**File:** `backend/src/routes/platforms.ts`

#### 1. GET /api/platforms/google/oauth/url
**Purpose:** Generate OAuth authorization URL

**Request:** (authenticated with JWT)
```bash
GET /api/platforms/google/oauth/url
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "message": "Please visit this URL to authorize Drive access"
  }
}
```

**Flow:**
1. User clicks "Connect Google Drive" in frontend
2. Frontend calls this endpoint
3. Backend generates OAuth URL with state parameter (userId)
4. Frontend redirects user to authUrl
5. User logs in to Google and grants permissions
6. Google redirects to callback URL with authorization code

---

#### 2. POST /api/platforms/google/oauth/callback
**Purpose:** Handle OAuth callback and store tokens

**Request:** (authenticated with JWT)
```bash
POST /api/platforms/google/oauth/callback
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "code": "4/0AfgeXvs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "email": "user@gmail.com",
    "name": "John Doe",
    "platform": "google_workspace"
  },
  "message": "Google Drive connected successfully"
}
```

**Flow:**
1. Google redirects user to frontend callback page with `?code=...`
2. Frontend extracts code and calls this endpoint
3. Backend exchanges code for access/refresh tokens
4. Backend verifies token and gets user info
5. Backend encrypts and stores tokens in `platform_credentials` table
6. Returns success with user email/name

**Token Storage:**
```typescript
const oauthCredentials = {
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  expiresAt: tokens.expiresAt.toISOString(),
  scope: tokens.scope,
  email: userInfo.email,
  name: userInfo.name,
};

// Encrypt and store in platform_credentials
await CredentialService.addCredentials(
  user.id,
  'google_workspace',
  encrypt(JSON.stringify(oauthCredentials)),
  'oauth'
);
```

---

#### 3. DELETE /api/platforms/google/oauth/disconnect
**Purpose:** Disconnect OAuth and revoke tokens

**Request:** (authenticated with JWT)
```bash
DELETE /api/platforms/google/oauth/disconnect
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Google Drive disconnected successfully"
}
```

**Flow:**
1. User clicks "Disconnect" in frontend
2. Backend retrieves stored credentials
3. Backend revokes access token with Google
4. Backend deletes credentials from database
5. Returns success

---

#### 4. GET /api/platforms/google/oauth/status
**Purpose:** Check OAuth connection status

**Request:** (authenticated with JWT)
```bash
GET /api/platforms/google/oauth/status
Authorization: Bearer <jwt-token>
```

**Response (Connected):**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "platform": "google_workspace",
    "authType": "oauth",
    "email": "user@gmail.com"
  }
}
```

**Response (Not Connected):**
```json
{
  "success": true,
  "data": {
    "isConnected": false,
    "platform": "google_workspace",
    "authType": null,
    "email": null
  }
}
```

---

### Phase 3: Platform Adapter OAuth Support (COMPLETED)

**File:** `backend/src/services/platform-adapters/google-workspace-adapter.ts`

**Key Changes:**

#### 1. Credential Type Detection
```typescript
private detectCredentialType(credentials: any): 'service_account' | 'oauth' | 'unknown' {
  if (credentials.type === 'service_account') {
    return 'service_account';
  }
  if (credentials.accessToken || credentials.refreshToken) {
    return 'oauth';
  }
  return 'unknown';
}
```

#### 2. OAuth Client Creation
```typescript
private createOAuthClient(credentials: any): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const tokenData: any = {
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
  };

  if (credentials.expiresAt) {
    tokenData.expiry_date = new Date(credentials.expiresAt).getTime();
  }

  oauth2Client.setCredentials(tokenData);
  return oauth2Client;
}
```

#### 3. Unified Auth Client Factory
```typescript
private async createAuthClient(credentials: any): Promise<any> {
  const credType = this.detectCredentialType(credentials);

  if (credType === 'service_account') {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    return auth;
  } else if (credType === 'oauth') {
    return this.createOAuthClient(credentials);
  } else {
    throw new Error('Unknown credential type');
  }
}
```

#### 4. Updated Methods
All methods now use `createAuthClient()`:
- `discoverAssets()` - Discovers Drive files (works with OAuth)
- `getAssetDetails()` - Gets file details (works with OAuth)
- `getAssetPermissions()` - Gets file permissions (works with OAuth)
- `deleteAsset()` - Deletes file (works with OAuth if user has write scope)
- `changeVisibility()` - Changes sharing (works with OAuth if user has write scope)
- `removePermission()` - Removes permission (works with OAuth if user has write scope)
- `transferOwnership()` - Transfers ownership (works with OAuth if user has write scope)

#### 5. Workspace User Discovery (DWD Only)
```typescript
async discoverWorkspaceUsers(credentials: any, userId: number): Promise<DiscoveredWorkspaceUser[]> {
  const credType = this.detectCredentialType(credentials);
  if (credType === 'oauth') {
    logger.warn('Workspace user discovery not available with OAuth credentials (requires DWD)');
    return []; // Return empty array for OAuth users
  }
  // ... service account logic
}
```

**Important Note:** OAuth users cannot use Google Admin API to discover workspace users. This feature is only available with Service Account + DWD.

---

## Google Cloud Project Setup

### 1. Create OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **Create Credentials** > **OAuth client ID**
4. Select **Web application**
5. Enter name: "Shenv Drive OAuth"
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/platforms/google/oauth/callback` (development)
   - `https://yourdomain.com/api/platforms/google/oauth/callback` (production)
7. Click **Create**
8. **Copy Client ID and Client Secret** to `.env`

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (for individual users)
3. Enter:
   - App name: "Shenv"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Click **Save and Continue**

### 3. Add Scopes

1. Click **Add or Remove Scopes**
2. Add the following scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Click **Update**
4. Click **Save and Continue**

### 4. Add Test Users (During Development)

1. Click **Add Users**
2. Enter your Gmail address
3. Click **Save**

**Note:** In test mode, only whitelisted users can authenticate. Publish the app for production.

---

## Environment Variables

**File:** `backend/.env`

```env
# Google OAuth Configuration (for individual users)
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/platforms/google/oauth/callback
```

---

## Database Schema

**Table:** `platform_credentials`

OAuth credentials are stored with `credentialType: 'oauth'`:

```sql
{
  id: serial,
  userId: integer,
  platform: 'google_workspace',
  credentials: text (encrypted JSON),
  credentialType: 'oauth',
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastUsedAt: timestamp
}
```

**Encrypted Credentials Structure:**
```json
{
  "accessToken": "ya29.a0AfH6SMB...",
  "refreshToken": "1//0gPnUkQ...",
  "expiresAt": "2026-01-30T12:00:00.000Z",
  "scope": "https://www.googleapis.com/auth/drive.readonly ...",
  "email": "user@gmail.com",
  "name": "John Doe"
}
```

---

## API Testing

### 1. Get OAuth URL
```bash
curl -X GET http://localhost:3000/api/platforms/google/oauth/url \
  -H "Authorization: Bearer <jwt-token>"
```

### 2. Manually Visit URL and Authorize
Copy the `authUrl` from response and visit it in browser. After authorizing, Google will redirect to callback URL with code.

### 3. Exchange Code for Tokens
```bash
curl -X POST http://localhost:3000/api/platforms/google/oauth/callback \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "4/0AfgeXvs..."}'
```

### 4. Check Connection Status
```bash
curl -X GET http://localhost:3000/api/platforms/google/oauth/status \
  -H "Authorization: Bearer <jwt-token>"
```

### 5. Discover Drive Assets
```bash
curl -X POST http://localhost:3000/api/assets/discover \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"platform": "google_workspace"}'
```

### 6. Disconnect
```bash
curl -X DELETE http://localhost:3000/api/platforms/google/oauth/disconnect \
  -H "Authorization: Bearer <jwt-token>"
```

---

## Security Considerations

### 1. Token Storage
- Tokens are encrypted with AES-256-CBC before storage
- Encryption key stored in environment variable (`ENCRYPTION_KEY`)
- Never log or expose tokens in responses

### 2. State Parameter
- OAuth flow uses `state` parameter containing userId
- Prevents CSRF attacks during authorization

### 3. Refresh Token Handling
- Access tokens expire after ~1 hour
- Backend automatically refreshes using refresh token
- Refresh tokens are long-lived (typically 6 months)

### 4. Scope Limitations
- Individual users only get readonly scopes by default
- Write scopes (delete, modify permissions) require explicit user consent
- Admin API scopes are NOT available to OAuth users (DWD only)

---

## Limitations

### OAuth Users Cannot:
1. **Discover Workspace Users** - Requires Admin API + DWD
2. **Access Other Users' Files** - Only sees their own Drive files
3. **Domain-Wide Actions** - Cannot perform governance on organization level

### OAuth Users CAN:
1. **Discover Their Own Drive Files** - Full read access to personal files
2. **View Permissions** - See who has access to their files
3. **Analyze Risk** - Get risk scores based on sharing patterns
4. **Delete Files** - If granted write scope
5. **Modify Permissions** - If granted write scope

---

## Frontend Implementation (Pending)

### Required Components

#### 1. Drive Connection Page
```tsx
// src/pages/DriveConnect.tsx
- Show "Connect with Google" button
- On click: Call GET /api/platforms/google/oauth/url
- Redirect to authUrl
- Handle callback: Extract code from URL
- Call POST /api/platforms/google/oauth/callback
- Redirect to Drive dashboard on success
```

#### 2. Drive Dashboard
```tsx
// src/pages/DriveDashboard.tsx
- Check connection status on mount
- Show analytics if connected (using existing analytics endpoints)
- Show "Connect Drive" CTA if not connected
- Disconnect button
```

#### 3. Mode Selector
```tsx
// src/components/ModeSelector.tsx
- Toggle: "Business" vs "Individual"
- Business: Show service account upload
- Individual: Show OAuth connect button
```

---

## Next Steps

### Phase 4: Token Refresh Middleware (COMPLETED ✅)

**File:** `backend/src/middleware/token-refresh.ts`

Automatic token refresh middleware that refreshes expired OAuth tokens before API calls.

**Key Functions:**

#### 1. refreshTokenIfNeeded(userId, platform)
Main middleware function:

```typescript
await refreshTokenIfNeeded(userId, 'google_workspace');
```

**How it works:**
1. Retrieves stored credentials
2. Checks if OAuth type
3. Checks if expiring within 5 minutes
4. Calls DriveOAuthService.refreshAccessToken()
5. Updates credentials in database
6. Deactivates old credential

#### 2. withTokenRefresh(userId, platform)
Convenient wrapper for route handlers:

```typescript
app.post('/api/assets/discover', authMiddleware, async (c) => {
  await withTokenRefresh(user.id, platform);
  const result = await AssetDiscoveryService.discoverAssets(user.id, platform);
  return c.json({ success: true, data: result });
});
```

#### 3. checkTokenStatus(userId, platform)
Check validity without refreshing (UI warnings):

```typescript
const status = await checkTokenStatus(userId, 'google_workspace');
// { isValid: boolean, expiresAt?: string, needsRefresh: boolean }
```

**Integration Points:**
- AssetDiscoveryService.discoverAssets() → Auto-refreshes before discovery
- AssetDiscoveryService.discoverWorkspaceUsers() → Auto-refreshes before fetch
- AssetDiscoveryService.refreshAsset() → Auto-refreshes before refresh

**Security:**
- Automatic deactivation of old credentials
- No token logging
- Encrypted storage of new tokens
- Error handling for revoked refresh tokens

**Token Lifecycle:**
1. Initial OAuth: Access token (1h) + Refresh token (6 months)
2. API call at 55 min: Auto-refresh detected
3. New access token: Valid for 1h more
4. Refresh token: Unchanged (long-lived)
5. If refresh token expires: User must re-authorize

---

### Phase 5: Frontend UI (TODO)
1. Drive connection page with OAuth flow
2. Drive dashboard with analytics visualizations
3. Mode selector (Business vs Individual)
4. Asset list with filtering and search
5. Permission viewer for individual files

### Phase 6: Testing (TODO)
1. End-to-end OAuth flow test
2. Token refresh testing
3. Permission discovery testing
4. Error handling (invalid tokens, revoked access)

---

## Summary

**Completed:**
✅ OAuth service with token management
✅ 4 OAuth endpoints (auth URL, callback, disconnect, status)
✅ Platform adapter OAuth support
✅ Dual-mode credential detection
✅ Token encryption and secure storage
✅ Google Cloud setup instructions
✅ Environment variable configuration
✅ **Token refresh middleware (NEW)**
✅ **AssetDiscoveryService integration (NEW)**

**Remaining:**
⏳ Frontend OAuth flow UI
⏳ Drive dashboard frontend
⏳ Mode selector UI
⏳ End-to-end testing

**Total Implementation:** ~70% complete (Backend fully done, frontend pending)

---

## Testing Checklist

- [ ] Generate OAuth URL successfully
- [ ] Complete OAuth flow and store tokens
- [ ] Verify tokens are encrypted in database
- [ ] Check connection status shows correct email
- [ ] Discover Drive assets with OAuth credentials
- [ ] Refresh expired token automatically
- [ ] Disconnect and verify token revocation
- [ ] Test error handling (invalid code, expired token)
- [ ] Verify service account still works (DWD)
- [ ] Confirm workspace users only work with service account

---

**Implementation Date:** January 30, 2026
**Author:** Claude (Sonnet 4.5)
**Status:** Backend Complete, Frontend Pending
