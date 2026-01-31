# Shenv - Google Workspace Governance Platform

A comprehensive B2B SaaS platform for monitoring and governing Google Workspace (Sheets, Drive, Gmail) with support for both business (Domain-Wide Delegation) and individual (OAuth 2.0) users. Built with React, TypeScript, Hono.js, and PostgreSQL.

## Problem Statement

Organizations and individuals lack visibility into:
- **Google Sheets**: Who has access to which sheets and what permission levels they have
- **Google Drive**: File permissions, sharing patterns, and security risks
- **Gmail**: High-volume senders cluttering inboxes without easy bulk management
- Overall workspace access patterns and governance controls

## Solution

Shenv provides a unified platform with **dual-mode authentication**:

### Business Users (Service Account + Domain-Wide Delegation)
- **Google Sheets**: Discover all sheets across organization, analyze permissions, manage governance actions
- **Google Drive**: Full workspace file discovery, risk scoring, permission analytics
- **Gmail**: Organizational email management (requires OAuth for individuals)

### Individual Users (OAuth 2.0)
- **Google Drive**: Personal file discovery, risk analysis, permission insights
- **Gmail**: Inbox sender analytics, bulk cleanup, unsubscribe management
- Automatic token refresh with 5-minute expiry buffer
- Secure encrypted token storage

## Tech Stack

### Backend
- **Hono.js** - Lightweight web framework
- **TypeScript** - Type-safe development with ES Modules
- **PostgreSQL 16** - Database with Drizzle ORM
- **Google APIs** - Admin Directory, Drive API, Sheets API, Gmail API
- **Authentication** - JWT tokens + bcrypt password hashing
- **Security** - AES-256-CBC encryption for credentials
- **OAuth 2.0** - Google OAuth for individual users
- **Node.js 18+** - Runtime environment
- **Docker Compose** - PostgreSQL containerization

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **TailwindCSS v4** - Utility-first CSS
- **React Router v7** - Client-side routing
- **React Query** - Server state management
- **Axios** - HTTP client with JWT interceptors

## Project Structure

```
Shenv/
├── backend/              # Hono.js API server
│   ├── src/
│   │   ├── index.ts     # Server entry point
│   │   ├── server.ts    # Hono app setup
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic & Google API integration
│   │   ├── types/       # TypeScript definitions
│   │   └── utils/       # Helper functions
│   ├── .env.example
│   └── package.json
│
├── shenv/               # React frontend
│   ├── src/
│   │   ├── App.tsx      # Root component
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API client
│   │   └── types/       # TypeScript definitions
│   ├── .env.example
│   └── package.json
│
├── CLAUDE.MD           # AI assistant instructions
├── LAST COMMIT.md      # Summary of the most recent changes
├── RECENT CHANGES.md   # Historical log of recent feature additions
└── README.md           # This file
```

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** package manager
3. **Google Cloud Project** with:
   - Google Sheets API enabled
   - Google Drive API enabled
   - **Gmail API enabled**
   - Service Account created
   - Domain-Wide Delegation configured

## Google Cloud Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

### 2. Enable Required APIs

1. Navigate to **APIs & Services** > **Library**
2. Search for and enable:
   - **Google Sheets API**
   - **Google Drive API**
   - **Gmail API**

### 3. Create a Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Enter a name (e.g., "shenv-service-account")
4. Click **Create and Continue**
5. Skip granting access (click **Continue**)
6. Click **Done**

### 4. Create Service Account Key

1. Click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create**
6. Save the downloaded JSON file securely

### 5. Enable Domain-Wide Delegation

1. Click on your service account
2. Click **Show Advanced Settings** or **Edit**
3. Check **Enable G Suite Domain-wide Delegation**
4. Enter a product name (e.g., "Shenv")
5. Click **Save**
6. Note the **Client ID** (you'll need this for the next step)

### 6. Authorize in Google Workspace Admin

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Security** > **API Controls** > **Domain-wide Delegation**
3. Click **Add new**
4. Enter the **Client ID** from step 5
5. Add the following OAuth scopes (comma-separated):
   ```
   https://www.googleapis.com/auth/drive.readonly,
   https://www.googleapis.com/auth/spreadsheets.readonly,
   https://www.googleapis.com/auth/gmail.readonly,
   https://www.googleapis.com/auth/gmail.modify
   ```
6. Click **Authorize**

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Shenv
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../shenv
npm install
```

### 4. Configure Backend Environment

```bash
cd ../backend
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Path to your service account JSON file
GOOGLE_SERVICE_ACCOUNT_PATH=./credentials/service-account.json

# Admin email for domain-wide delegation (impersonation)
GOOGLE_ADMIN_EMAIL=admin@yourdomain.com
```

### 5. Add Service Account Credentials

```bash
mkdir credentials
# Copy your downloaded service account JSON file to:
# backend/credentials/service-account.json
```

**IMPORTANT:** Never commit the `credentials/` folder or `.env` file to version control!

### 6. Configure Frontend Environment

```bash
cd ../shenv
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000
```

## Running the Application

### Development Mode

You'll need two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend will start on [http://localhost:3000](http://localhost:3000)

**Terminal 2 - Frontend:**
```bash
cd shenv
npm run dev
```

Frontend will start on [http://localhost:5173](http://localhost:5173)

### Verify Setup

1. Open [http://localhost:5173](http://localhost:5173) in your browser
2. You should see the Shenv dashboard
3. If configured correctly, sheets and Gmail stats will load automatically

### Health Check

To verify the backend is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2026-01-10T...",
  "service": "shenv-backend"
}
```

## API Endpoints

### Sheets API
- `GET /api/sheets` - List all sheets
  - Query params: `page`, `limit`, `search`, `sortBy`, `sortOrder`
- `GET /api/sheets/:id` - Get sheet details with permissions

### Gmail API
- `GET /api/gmail/inbox/stats` - Overall inbox statistics (total messages, unread, labels)
- `POST /api/gmail/emails/discover` - Perform email discovery/scanning
- `POST /api/gmail/senders/fetch` - Fetch high-volume senders with metadata (paginated)
- `POST /api/gmail/senders/fetch-all` - Fetch ALL unique senders from entire inbox (auto-paginated)
- `GET /api/gmail/senders` - List analyzed senders with pagination/search/sort/filters
- `GET /api/gmail/senders/unverified` - List senders with failed SPF/DKIM verification
- `POST /api/gmail/senders/:id/unsubscribe` - Mark sender as unsubscribed and return unsubscribe link
- `DELETE /api/gmail/senders/:id` - Delete messages from a specific sender
- `POST /api/gmail/senders/bulk-delete` - Bulk delete messages from multiple senders

## Features

### Google Sheets
- ✅ List all Google Sheets in the organization
- ✅ View sheet metadata (owner, last modified, permission count)
- ✅ Search sheets by name
- ✅ View detailed permissions for each sheet
- ✅ Pagination for large datasets

### Gmail Management
- ✅ **Discovery Wizard**: 3-phase scan (Mode Select → Scanning → Results) with Quick/Deep scan modes.
- ✅ **Full Inbox Discovery**: Process entire inbox (35k+ emails) with automatic pagination and rate limiting.
- ✅ **Inbox Overview**: Live statistics for Total Messages, Unread, Threads, Spam, and Unique Senders.
- ✅ **Sender Workbench**: Searchable, sortable, and filterable list of senders with volume analysis.
- ✅ **Advanced Filtering**: Filter by email verification (SPF/DKIM), attachment presence, and unsubscribe capability.
- ✅ **Email Verification Tracking**: SPF/DKIM authentication status for each sender with visual indicators.
- ✅ **Unsubscribe Management**: Extract and track unsubscribe links from email headers; one-click unsubscribe workflow.
- ✅ **Attachment Analytics**: Track total attachments per sender; filter by attachment volume.
- ✅ **Bulk Cleanup**: Type-to-confirm "DELETE" safeguards for bulk message removal.
- ✅ **Activity Log**: Persistent log of scanned and deleted actions.
- ✅ **Data Freshness**: Status indicators for last sync time.
- ✅ **Focus Mode**: UI toggle to concentrate on the sender workbench.
- ✅ **Smart Rate Limiting**: Batch processing (40 messages/sec) with exponential backoff retry logic.

### General
- ✅ Clean, modern B2B SaaS UI with TailwindCSS.
- ✅ Improved auth error handling with field-level validation.
- ✅ Optimized CORS configuration for preflight requests.

## Limitations

- **No authentication**: Currently focused on organization-wide management.
- **Database for Gmail only**: Gmail sender data is persisted; Sheets data fetched on demand.
- **Rate limiting**: Gmail API has quota limits (50 calls/sec); full inbox scans of 35k+ emails may take 3-5 minutes.
- **Unsubscribe completion**: System provides unsubscribe link but user must complete unsubscribe manually via sender's website.

## Future Enhancements

### Sheets
- Full user authentication & RBAC
- Advanced permission change tracking
- Automated periodic scans and reports

### Gmail
- Automated unsubscribe (click unsubscribe link via API)
- Scheduled background sender discovery
- Email retention policy enforcement
- Spam/phishing detection using verification metadata
- Sender reputation scoring based on verification + volume + engagement

## Troubleshooting

### CORS errors
**Error:** Browser sends OPTIONS preflight but actual request is blocked.
**Solution:** Backend now explicitly sets `allowHeaders: ["Content-Type", "Authorization"]`. Ensure your `FRONTEND_URL` in `.env` is correct.

### Auth Error Redirect Swallowing
**Error:** Signin/Signup errors redirect immediately to `/signin`.
**Solution:** The Axios interceptor now skips redirects for `/auth/signin` and `/auth/signup` to allow field-level error display.

## Security Notes

- **Never commit** `.env` files or `credentials/` folder.
- Service account JSON contains sensitive keys; store it securely.
- Domain-wide delegation is powerful—restrict scopes to readonly where possible unless cleanup features are needed.

## License

ISC
