# Shenv - Google Sheets Governance Platform

A minimal B2B SaaS tool for monitoring and governing Google Sheets access across your organization. Built with React, TypeScript, and Hono.js.

## Problem Statement

Organizations often lack visibility into:
- Who has access to which Google Sheets
- What permission levels users have across sheets
- When access was granted or modified
- Overall sheets access patterns

## Solution

Shenv uses Google Service Accounts with Domain-Wide Delegation to:
- Discover all Google Sheets in your organization
- List sheets with permission details
- Show who has access to each sheet
- Provide search and filtering capabilities
- Enable basic access auditing

## Tech Stack

### Backend
- **Hono.js** - Lightweight web framework
- **TypeScript** - Type-safe development
- **Google APIs** - Sheets API, Drive API
- **Node.js** - Runtime environment

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Axios** - HTTP client

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
└── README.md           # This file
```

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** package manager
3. **Google Cloud Project** with:
   - Google Sheets API enabled
   - Google Drive API enabled
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
   https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/spreadsheets.readonly
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
3. If configured correctly, sheets will load automatically

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

### Backend API

- `GET /health` - Health check endpoint
- `GET /api/sheets` - List all sheets
  - Query params: `page`, `limit`, `search`, `sortBy`, `sortOrder`
- `GET /api/sheets/:id` - Get sheet details with permissions

## Features (V1)

- ✅ List all Google Sheets in the organization
- ✅ View sheet metadata (owner, last modified, permission count)
- ✅ Search sheets by name
- ✅ View detailed permissions for each sheet
- ✅ Pagination for large datasets
- ✅ Clean, modern B2B SaaS UI
- ✅ Responsive design

## Limitations (V1)

- **Read-only**: Cannot modify permissions
- **No authentication**: Uses service account only
- **No database**: Fetches from Google APIs on demand
- **No caching**: Every request hits Google APIs
- **No history tracking**: Only current state

## Future Enhancements

- User authentication
- Permission change tracking
- Alerts for unusual access patterns
- Bulk permission reports
- Advanced filtering and sorting
- Sheet categorization
- Access request workflow
- Slack/email notifications
- Database layer for caching
- Permission modification capabilities

## Troubleshooting

### Backend fails to start

**Error:** `Failed to load service account credentials`

**Solution:**
- Verify `GOOGLE_SERVICE_ACCOUNT_PATH` points to your JSON file
- Ensure the JSON file is valid
- Check file permissions

### No sheets appear

**Error:** Sheets list is empty

**Possible causes:**
1. **Domain-Wide Delegation not configured**
   - Verify step 6 in Google Cloud Setup
   - Ensure correct Client ID and scopes

2. **Wrong admin email**
   - Update `GOOGLE_ADMIN_EMAIL` in `.env`
   - Must be a super admin in your workspace

3. **API not enabled**
   - Verify Google Sheets API and Drive API are enabled
   - Check in Google Cloud Console

4. **Service account permissions**
   - Ensure the service account has domain-wide delegation
   - Verify the OAuth scopes are correct

### CORS errors

**Error:** CORS policy blocking requests

**Solution:**
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Default is `http://localhost:5173`
- Restart backend after changing `.env`

## Security Notes

- **Never commit** `.env` files or `credentials/` folder
- Service account JSON contains sensitive keys
- Store credentials securely
- Use environment variables for production
- Implement rate limiting for production use
- Consider using Google Secret Manager in production

## Development

### Type Checking

Backend:
```bash
cd backend
npm run lint
```

Frontend:
```bash
cd shenv
npm run build
```

### Building for Production

Backend:
```bash
cd backend
npm run build
```

Frontend:
```bash
cd shenv
npm run build
```

## License

ISC

## Support

For issues or questions:
1. Check [CLAUDE.MD](./CLAUDE.MD) for detailed architecture
2. Review Google Cloud setup steps
3. Verify environment variables
4. Check backend logs for errors

---

Built with focus on functionality and clean code structure.
