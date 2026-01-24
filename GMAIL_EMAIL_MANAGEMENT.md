# Gmail Email Management Feature

**Clean up your inbox by grouping and bulk deleting emails by sender**

This feature allows users to authenticate with their Google account, discover all emails in their inbox, group them by sender email address, and bulk delete unwanted emails.

---

## Table of Contents

- [Overview](#overview)
- [Setup Instructions](#setup-instructions)
  - [Google Cloud Console Setup](#google-cloud-console-setup)
  - [Configure Environment Variables](#configure-environment-variables)
  - [Run Database Migrations](#run-database-migrations)
- [User Flow](#user-flow)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Security](#security)

---

## Overview

### What This Feature Does

1. **OAuth Authentication** - Users authenticate with Google to grant Gmail access
2. **Email Discovery** - Fetches all emails from user's inbox using Gmail API
3. **Grouping by Sender** - Automatically groups emails by sender email address with counts
4. **Bulk Deletion** - Delete all emails from specific sender(s) with one click
5. **Secure Storage** - OAuth tokens encrypted with AES-256-CBC

### Key Features

- ✅ Secure OAuth 2.0 authentication flow
- ✅ Automatic token refresh when expired
- ✅ Group emails by sender with statistics
- ✅ View individual emails per sender
- ✅ Bulk delete from single or multiple senders
- ✅ Delete from both Gmail and local database
- ✅ Encrypted token storage
- ✅ Revoke access and delete all data

---

## Setup Instructions

### Google Cloud Console Setup

#### Step 1: Create OAuth 2.0 Credentials

1. **Go to Google Cloud Console**
   - Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Select your project (or create a new one)

2. **Enable Gmail API**
   - Go to **APIs & Services** > **Library**
   - Search for "Gmail API"
   - Click **Enable**

3. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** > **OAuth consent screen**
   - Select **External** user type (or Internal if you have Google Workspace)
   - Click **Create**

   **App Information:**
   - App name: `Shenv Email Manager` (or your preferred name)
   - User support email: Your email
   - Developer contact email: Your email
   - Click **Save and Continue**

   **Scopes:**
   - Click **Add or Remove Scopes**
   - Search and add these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Click **Update** then **Save and Continue**

   **Test Users (for External apps in testing):**
   - Add your test user emails
   - Click **Save and Continue**

4. **Create OAuth 2.0 Client ID**
   - Go to **APIs & Services** > **Credentials**
   - Click **+ Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Name: `Shenv Backend`

   **Authorized redirect URIs:**
   - Add: `http://localhost:3000/api/gmail/oauth/callback`
   - For production, add: `https://yourdomain.com/api/gmail/oauth/callback`

   - Click **Create**

5. **Save Your Credentials**
   - Copy the **Client ID** (looks like: `xxx.apps.googleusercontent.com`)
   - Copy the **Client Secret** (random string)
   - You'll need these for environment variables

---

### Configure Environment Variables

Add these variables to `backend/.env`:

```env
# Gmail OAuth Credentials
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/gmail/oauth/callback
```

Replace `your-client-id` and `your-client-secret` with the values from Step 5 above.

---

### Run Database Migrations

The feature adds 3 new tables to the database:

```bash
cd backend
npm run db:push
```

**New Tables:**
- `gmail_oauth_tokens` - Stores encrypted OAuth tokens
- `email_senders` - Groups emails by sender
- `emails` - Individual email metadata

---

## User Flow

### Complete User Journey

#### 1. Sign In to Shenv
```bash
POST /auth/signin
{
  "email": "user@example.com",
  "password": "password"
}
```

Save the JWT token from response.

#### 2. Connect Gmail Account
```bash
POST /api/gmail/oauth/authorize
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  },
  "message": "Please visit the authorization URL to grant Gmail access"
}
```

**Action:** User opens the `authorizationUrl` in browser, logs into Google, and authorizes access.

**Callback:** User is redirected to `http://localhost:3000/api/gmail/oauth/callback?code=...` and then to frontend success page.

#### 3. Verify Connection
```bash
GET /api/gmail/oauth/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true
  }
}
```

#### 4. Discover Emails
```bash
POST /api/gmail/emails/discover
Authorization: Bearer YOUR_JWT_TOKEN
```

This fetches all inbox emails and groups them by sender.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEmails": 1523,
    "uniqueSenders": 247
  },
  "message": "Discovered 1523 emails from 247 senders"
}
```

**Time:** Can take 1-5 minutes for large inboxes.

#### 5. View Senders
```bash
GET /api/gmail/senders?limit=20&offset=0
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "senders": [
      {
        "id": 1,
        "userId": 1,
        "senderEmail": "newsletter@company.com",
        "senderName": "Company Newsletter",
        "emailCount": 156,
        "firstEmailDate": "2024-01-15T10:00:00.000Z",
        "lastEmailDate": "2026-01-20T14:30:00.000Z",
        "lastSyncedAt": "2026-01-20T19:00:00.000Z"
      },
      {
        "id": 2,
        "senderEmail": "notifications@service.com",
        "senderName": "Service Notifications",
        "emailCount": 89,
        "firstEmailDate": "2024-03-10T08:00:00.000Z",
        "lastEmailDate": "2026-01-18T11:20:00.000Z",
        "lastSyncedAt": "2026-01-20T19:00:00.000Z"
      }
    ],
    "total": 247,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

Senders are sorted by email count (descending) - most emails first.

#### 6. View Emails from Specific Sender
```bash
GET /api/gmail/senders/1/emails?limit=10&offset=0
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sender": {
      "id": 1,
      "senderEmail": "newsletter@company.com",
      "senderName": "Company Newsletter",
      "emailCount": 156
    },
    "emails": [
      {
        "id": 1,
        "gmailMessageId": "abc123xyz",
        "threadId": "thread123",
        "subject": "Weekly Newsletter - January 2026",
        "snippet": "Check out our latest updates and features...",
        "receivedAt": "2026-01-20T14:30:00.000Z",
        "isRead": false,
        "hasAttachment": false,
        "labels": ["INBOX", "UNREAD"]
      }
    ],
    "total": 156,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 7. Delete All Emails from Sender
```bash
DELETE /api/gmail/senders/1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 156,
    "failed": 0
  },
  "message": "Deleted 156 emails from newsletter@company.com"
}
```

**What Happens:**
1. Deletes all 156 emails from Gmail using Gmail API
2. Deletes all email records from database
3. Deletes the sender record from database

#### 8. Bulk Delete Multiple Senders
```bash
POST /api/gmail/senders/bulk-delete
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "senderIds": [1, 2, 5, 12]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 432,
    "failed": 0
  },
  "message": "Deleted 432 emails from 4 senders"
}
```

#### 9. Revoke Gmail Access (Optional)
```bash
DELETE /api/gmail/oauth/revoke
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Gmail access revoked successfully"
}
```

**What Happens:**
1. Revokes OAuth tokens with Google
2. Deletes tokens from database
3. Deletes all emails from database
4. Deletes all senders from database

---

## API Endpoints

### OAuth Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/gmail/oauth/authorize` | Get OAuth authorization URL | ✅ JWT |
| GET | `/api/gmail/oauth/callback` | OAuth callback (called by Google) | ❌ |
| GET | `/api/gmail/oauth/status` | Check if Gmail is connected | ✅ JWT |
| DELETE | `/api/gmail/oauth/revoke` | Revoke access and delete data | ✅ JWT |

### Email Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/gmail/emails/discover` | Fetch and store all emails | ✅ JWT |
| GET | `/api/gmail/senders` | List all senders (grouped) | ✅ JWT |
| GET | `/api/gmail/senders/:id/emails` | Get emails from specific sender | ✅ JWT |
| DELETE | `/api/gmail/senders/:id` | Delete all emails from sender | ✅ JWT |
| POST | `/api/gmail/senders/bulk-delete` | Delete from multiple senders | ✅ JWT |

**Query Parameters:**
- `limit` (number, default: 100) - Results per page
- `offset` (number, default: 0) - Pagination offset

---

## Database Schema

### gmail_oauth_tokens

```sql
CREATE TABLE gmail_oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,      -- Encrypted with AES-256
  refresh_token TEXT NOT NULL,     -- Encrypted with AES-256
  expires_at TIMESTAMP NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### email_senders

```sql
CREATE TABLE email_senders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  email_count INTEGER DEFAULT 0,
  first_email_date TIMESTAMP,
  last_email_date TIMESTAMP,
  last_synced_at TIMESTAMP DEFAULT NOW()
);
```

### emails

```sql
CREATE TABLE emails (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES email_senders(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMP NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  has_attachment BOOLEAN DEFAULT FALSE,
  labels JSONB,
  fetched_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security

### OAuth Token Security

- **Encryption**: All OAuth tokens (access + refresh) are encrypted using AES-256-CBC before storage
- **Encryption Key**: Uses `ENCRYPTION_KEY` from environment (must be 64 characters)
- **Token Refresh**: Automatically refreshes expired access tokens using refresh token
- **Revocation**: Users can revoke access, which deletes all tokens and data

### Gmail API Scopes

- `gmail.readonly` - Read emails and metadata
- `gmail.modify` - Delete emails (required for cleanup)

**Note:** Users are shown exactly what permissions they grant during OAuth consent.

### Data Protection

- **JWT Authentication**: All endpoints require valid JWT token
- **User Isolation**: Users can only access their own emails
- **Cascading Deletes**: Deleting user deletes all associated tokens and emails
- **No Password Storage**: Only OAuth tokens, never Gmail password

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "error": true,
  "message": "Unauthorized"
}
```
**Solution:** Ensure JWT token is included in `Authorization: Bearer <token>` header.

**400 Gmail Not Connected**
```json
{
  "error": true,
  "message": "Gmail not connected. Please authorize first."
}
```
**Solution:** Call `POST /api/gmail/oauth/authorize` first to connect Gmail.

**403 Insufficient Permissions**
```json
{
  "error": true,
  "message": "Insufficient permissions. Please re-authorize with required scopes."
}
```
**Solution:** OAuth consent screen must include both `gmail.readonly` and `gmail.modify` scopes.

**404 Sender Not Found**
```json
{
  "error": true,
  "message": "Sender not found"
}
```
**Solution:** Verify sender ID exists and belongs to authenticated user.

**500 Token Expired**
- System automatically refreshes tokens
- If refresh fails, user must re-authorize

---

## Example Usage

### Complete Node.js Example

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3000';
let jwtToken = '';

// 1. Sign in
async function signin() {
  const response = await axios.post(`${API_URL}/auth/signin`, {
    email: 'user@example.com',
    password: 'password'
  });
  jwtToken = response.data.token;
  console.log('Signed in successfully');
}

// 2. Connect Gmail
async function connectGmail() {
  const response = await axios.post(
    `${API_URL}/api/gmail/oauth/authorize`,
    {},
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  );
  console.log('Visit this URL to authorize:', response.data.data.authorizationUrl);
  console.log('After authorizing, proceed to next step');
}

// 3. Discover emails
async function discoverEmails() {
  const response = await axios.post(
    `${API_URL}/api/gmail/emails/discover`,
    {},
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  );
  console.log(`Discovered ${response.data.data.totalEmails} emails from ${response.data.data.uniqueSenders} senders`);
}

// 4. Get senders
async function getSenders() {
  const response = await axios.get(
    `${API_URL}/api/gmail/senders?limit=10`,
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  );
  console.log('Top 10 senders:');
  response.data.data.senders.forEach(sender => {
    console.log(`  ${sender.senderEmail}: ${sender.emailCount} emails`);
  });
  return response.data.data.senders;
}

// 5. Delete emails from top sender
async function deleteTopSender(senders) {
  const topSender = senders[0];
  console.log(`Deleting all emails from ${topSender.senderEmail}...`);

  const response = await axios.delete(
    `${API_URL}/api/gmail/senders/${topSender.id}`,
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  );
  console.log(`Deleted ${response.data.data.deleted} emails`);
}

// Run
(async () => {
  await signin();
  await connectGmail();
  // User must authorize in browser here
  // await discoverEmails();
  // const senders = await getSenders();
  // await deleteTopSender(senders);
})();
```

---

## Troubleshooting

### Email Discovery is Slow

- **Cause:** Large inbox (1000+ emails)
- **Solution:** Normal - discovery can take 1-5 minutes for large inboxes
- **Optimization:** API fetches emails in batches of 500

### Token Refresh Failed

- **Cause:** Refresh token expired or revoked
- **Solution:** User must re-authorize via OAuth flow
- **Prevention:** Ensure `access_type: 'offline'` in OAuth config (already set)

### Emails Not Deleting from Gmail

- **Cause:** Missing `gmail.modify` scope
- **Solution:** Re-create OAuth consent screen with both scopes
- **Verify:** Check scope in database: `SELECT scope FROM gmail_oauth_tokens;`

### "App is not verified" Warning

- **Cause:** OAuth consent screen is in testing mode
- **Solution:**
  - For testing: Add test users in consent screen
  - For production: Submit app for verification with Google

---

## Production Considerations

### 1. Update Redirect URI
```env
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/api/gmail/oauth/callback
```

Add to Google Cloud Console > OAuth Client > Authorized redirect URIs.

### 2. Enable HTTPS
Gmail OAuth requires HTTPS in production. Update frontend URL:
```env
FRONTEND_URL=https://yourdomain.com
```

### 3. Rate Limiting
Gmail API has quotas:
- 1 billion quota units/day
- 250 quota units/user/second

Batch operations (like discovery) count more units. Monitor usage in Google Cloud Console.

### 4. Background Jobs
For large inboxes, consider moving email discovery to background job queue (Bull/Agenda).

### 5. Webhook Notifications
Gmail API supports push notifications. Can be added to detect new emails without polling.

---

## Feature Status

- ✅ OAuth 2.0 authentication flow
- ✅ Token encryption and storage
- ✅ Automatic token refresh
- ✅ Email discovery and grouping
- ✅ Bulk delete functionality
- ✅ User data isolation
- ✅ Revoke access
- ⚠️ Frontend UI (pending)
- ⚠️ Background job processing (pending)
- ⚠️ Gmail push notifications (pending)

---

## Support

For issues or questions about the Gmail email management feature:
1. Check Google Cloud Console OAuth setup
2. Verify environment variables are set correctly
3. Check backend logs for detailed error messages
4. Ensure Gmail API is enabled in Google Cloud Console

**Built with Gmail API v1 and OAuth 2.0**
