# Google Workspace Onboarding Guide for Shenv

**Complete setup guide for governing your Google Workspace assets with Shenv**

This guide will walk you through the complete onboarding process, from setting up Google Cloud to executing your first governance action in Shenv. All steps are mandatory.

---

## Table of Contents

- [Part A: Google Cloud Setup](#part-a-google-cloud-setup)
  - [Step 1: Create Google Cloud Project](#step-1-create-google-cloud-project)
  - [Step 2: Enable Required APIs](#step-2-enable-required-apis)
  - [Step 3: Create Service Account](#step-3-create-service-account)
  - [Step 4: Download Service Account JSON Key](#step-4-download-service-account-json-key)
  - [Step 5: Enable Domain-Wide Delegation](#step-5-enable-domain-wide-delegation)
  - [Step 6: Authorize in Google Workspace Admin Console](#step-6-authorize-in-google-workspace-admin-console)
- [Part B: Shenv Platform Onboarding](#part-b-shenv-platform-onboarding)
  - [Step 1: Create Shenv Account](#step-1-create-shenv-account)
  - [Step 2: Upload Service Account Credentials](#step-2-upload-service-account-credentials)
  - [Step 3: Discover Workspace Users](#step-3-discover-workspace-users)
  - [Step 4: Discover Assets](#step-4-discover-assets)
  - [Step 5: Review Your Assets](#step-5-review-your-assets)
  - [Step 6: First Governance Action](#step-6-first-governance-action)

---

## Prerequisites

Before you begin, ensure you have:

1. **Google Workspace Account** with **Super Admin** privileges
2. **Google Cloud Console** access
3. **Permission** to create service accounts and enable APIs
4. **Organizational authority** to govern workspace assets

**Time Required**: Approximately 30-45 minutes for complete setup

---

# Part A: Google Cloud Setup

This section covers setting up the Google Cloud infrastructure required for Shenv to access your Google Workspace data.

---

## Step 1: Create Google Cloud Project

A Google Cloud Project is required to host your service account and enable APIs.

### Instructions

1. **Navigate to Google Cloud Console**
   - Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google Workspace admin account

2. **Create New Project**
   - Click on the **project dropdown** at the top of the page (next to "Google Cloud")
   - Click **"NEW PROJECT"** button in the top-right of the modal

3. **Configure Project**
   - **Project name**: Enter a descriptive name (e.g., `Shenv Governance Platform`)
   - **Organization**: Select your Google Workspace organization
   - **Location**: Select your organization (should auto-populate)
   - Click **"CREATE"**

4. **Wait for Project Creation**
   - Project creation takes 10-30 seconds
   - You'll see a notification when complete

5. **Select Your Project**
   - Click on the **project dropdown** again
   - Select your newly created project
   - Verify the project name appears at the top

**What You've Accomplished**: Created a dedicated Google Cloud Project that will host your Shenv service account.

---

## Step 2: Enable Required APIs

Shenv requires three Google APIs to function: Admin SDK (for workspace users), Drive API (for files), and Sheets API (for spreadsheets).

### Instructions

You need to enable **all three APIs** listed below:

#### API 1: Google Admin SDK API

1. **Navigate to APIs & Services**
   - In the left sidebar, click **"APIs & Services"**
   - Click **"Library"**

2. **Search for Admin SDK**
   - In the search bar, type: `Admin SDK API`
   - Click on **"Admin SDK API"** from the results

3. **Enable the API**
   - Click the blue **"ENABLE"** button
   - Wait for confirmation (5-10 seconds)
   - You'll see "API enabled" message

#### API 2: Google Drive API

1. **Return to API Library**
   - Click **"Library"** in the left sidebar (or use browser back button)

2. **Search for Drive API**
   - In the search bar, type: `Google Drive API`
   - Click on **"Google Drive API"** from the results

3. **Enable the API**
   - Click the blue **"ENABLE"** button
   - Wait for confirmation

#### API 3: Google Sheets API

1. **Return to API Library**
   - Click **"Library"** in the left sidebar

2. **Search for Sheets API**
   - In the search bar, type: `Google Sheets API`
   - Click on **"Google Sheets API"** from the results

3. **Enable the API**
   - Click the blue **"ENABLE"** button
   - Wait for confirmation

### Verification

To verify all three APIs are enabled:

1. In the left sidebar, click **"APIs & Services"** > **"Enabled APIs & services"**
2. You should see all three APIs listed:
   - Admin SDK API
   - Google Drive API
   - Google Sheets API

**What You've Accomplished**: Enabled the three Google APIs that Shenv needs to discover and govern your workspace assets.

---

## Step 3: Create Service Account

A Service Account is a special Google account that represents your application (Shenv) rather than a human user.

### Instructions

1. **Navigate to Service Accounts**
   - In the left sidebar, click **"IAM & Admin"**
   - Click **"Service Accounts"**

2. **Create Service Account**
   - Click **"+ CREATE SERVICE ACCOUNT"** button at the top

3. **Service Account Details**
   - **Service account name**: Enter `shenv-service-account` (or your preferred name)
   - **Service account ID**: Auto-generated (e.g., `shenv-service-account@project-id.iam.gserviceaccount.com`)
   - **Description**: Enter `Service account for Shenv governance platform`
   - Click **"CREATE AND CONTINUE"**

4. **Grant Service Account Access (Optional)**
   - **Skip this step** - Click **"CONTINUE"** without selecting any roles
   - Shenv uses Domain-Wide Delegation instead of project-level roles

5. **Grant Users Access (Optional)**
   - **Skip this step** - Click **"DONE"**

6. **Verify Creation**
   - You should now see your service account listed
   - Note the email address (e.g., `shenv-service-account@project-id.iam.gserviceaccount.com`)

**What You've Accomplished**: Created a service account that will authenticate Shenv to access Google Workspace data.

---

## Step 4: Download Service Account JSON Key

The JSON key file contains the private credentials that Shenv will use to authenticate as the service account.

### Instructions

1. **Locate Your Service Account**
   - In the Service Accounts list, find `shenv-service-account`
   - Click on the **service account email** to open details

2. **Navigate to Keys Tab**
   - Click on the **"KEYS"** tab at the top

3. **Create New Key**
   - Click **"ADD KEY"** dropdown button
   - Select **"Create new key"**

4. **Select Key Type**
   - A modal will appear
   - **Key type**: Select **"JSON"** (should be pre-selected)
   - Click **"CREATE"**

5. **Download and Secure the Key**
   - A JSON file will automatically download to your computer
   - **File name**: `project-id-xxxxx.json` (random suffix for uniqueness)
   - **CRITICAL**: This file contains sensitive credentials
   - Move the file to a secure location
   - **NEVER** commit this file to version control
   - **NEVER** share this file publicly

### JSON Key File Structure

Your downloaded file will look like this (example):

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "shenv-service-account@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
  "universe_domain": "googleapis.com"
}
```

**What You've Accomplished**: Downloaded the service account credentials that Shenv will use. Keep this file secure - you'll upload it to Shenv in Part B.

---

## Step 5: Enable Domain-Wide Delegation

Domain-Wide Delegation (DWD) allows the service account to access data across your entire Google Workspace organization on behalf of users.

**Why This Is Required**: Without DWD, the service account can only access files explicitly shared with it. DWD enables Shenv to discover all workspace users and assets organization-wide.

### Instructions

1. **Navigate to Service Account Details**
   - Go to **"IAM & Admin"** > **"Service Accounts"**
   - Click on your `shenv-service-account` email

2. **Enable Domain-Wide Delegation**
   - Click **"SHOW ADVANCED SETTINGS"** or **"EDIT"** button (depends on UI version)
   - Scroll to **"Domain-wide delegation"** section
   - Check the box: **"Enable Google Workspace Domain-wide Delegation"**

3. **Enter Product Name**
   - **Product name for the consent screen**: Enter `Shenv Governance Platform`
   - This is what users will see if they need to grant permissions

4. **Save Changes**
   - Click **"SAVE"**

5. **Note the Client ID**
   - After saving, you'll see a **Client ID** displayed (numeric, e.g., `123456789012345678901`)
   - **IMPORTANT**: Copy this Client ID - you'll need it in Step 6
   - You can also find it later in the service account details

**What You've Accomplished**: Enabled Domain-Wide Delegation on your service account. Next, you'll authorize it in the Google Workspace Admin Console.

---

## Step 6: Authorize in Google Workspace Admin Console

This is the final step in Google Cloud setup. You'll authorize your service account to access workspace data by adding it to the trusted applications list.

**Critical**: You must be a **Google Workspace Super Admin** to complete this step.

### Instructions

1. **Open Google Workspace Admin Console**
   - Go to [https://admin.google.com/](https://admin.google.com/)
   - Sign in with your Google Workspace Super Admin account
   - **Note**: This is different from Google Cloud Console

2. **Navigate to API Controls**
   - In the left sidebar, click **"Security"**
   - Click **"Access and data control"**
   - Click **"API controls"**

3. **Open Domain-Wide Delegation Settings**
   - Scroll down to **"Domain-wide delegation"** section
   - Click **"MANAGE DOMAIN-WIDE DELEGATION"**

4. **Add New API Client**
   - Click **"Add new"** button

5. **Configure OAuth Scopes**
   - A form will appear with two fields:

   **Field 1: Client ID**
   - Paste the **Client ID** from Step 5 (the numeric ID, e.g., `123456789012345678901`)

   **Field 2: OAuth Scopes**
   - Add the following scopes **exactly as written** (comma-separated, no spaces):
   ```
   https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive
   ```

   **Scope Explanation**:
   - `admin.directory.user.readonly` - Read workspace users (for orphaned asset detection)
   - `drive.readonly` - Read Drive files (for asset discovery)
   - `drive` - Modify Drive files (for governance actions like delete, change permissions)

6. **Authorize the Client**
   - Click **"AUTHORIZE"**
   - You'll see your Client ID appear in the list with the scopes

### Verification

To verify Domain-Wide Delegation is working:

1. In the Domain-wide delegation list, find your Client ID
2. Verify all three scopes are listed
3. Status should show as "Authorized"

**What You've Accomplished**: Successfully authorized your service account to access Google Workspace data organization-wide. Your Google Cloud setup is now complete!

---

# Part B: Shenv Platform Onboarding

Now that Google Cloud is configured, you'll onboard to the Shenv platform and start governing your assets.

**Prerequisites**:
- Completed Part A (all 6 steps)
- Have your service account JSON file ready
- Shenv backend running at `http://localhost:3000`

---

## Step 1: Create Shenv Account

Create your Shenv user account to start using the platform.

### Using the API

**Endpoint**: `POST /auth/signup`

**Request**:
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourSecurePassword123"
  }'
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@yourdomain.com",
    "hasPlatformCredentials": false
  }
}
```

**What to Save**:
- **token**: Save this JWT token - you'll need it for all subsequent requests
- **user.id**: Your user ID in the Shenv system
- **hasPlatformCredentials**: Currently `false` - will be `true` after Step 2

**Common Errors**:

- `Email and password are required` - Missing email or password in request
- `Password must be at least 6 characters` - Password too short
- `User with this email already exists` - Email already registered, use signin instead

### Using the Frontend (If Available)

1. Navigate to `http://localhost:5173/signup`
2. Enter your email address
3. Create a password (minimum 6 characters)
4. Click **"Sign Up"**
5. You'll be redirected to the dashboard
6. Your JWT token is automatically stored in browser

**What You've Accomplished**: Created your Shenv account. You're now ready to connect your Google Workspace.

---

## Step 2: Upload Service Account Credentials

Upload the service account JSON file from Part A, Step 4. Shenv will encrypt and securely store these credentials.

### Using the API

**Endpoint**: `POST /api/platforms/credentials`

**Headers**:
- `Authorization: Bearer YOUR_JWT_TOKEN` (from Step 1)
- `Content-Type: application/json`

**Request**:
```bash
curl -X POST http://localhost:3000/api/platforms/credentials \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "google_workspace",
    "credentials": {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "abc123...",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "shenv-service-account@your-project-id.iam.gserviceaccount.com",
      "client_id": "123456789012345678901",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
      "universe_domain": "googleapis.com"
    },
    "credentialType": "service_account"
  }'
```

**Alternative (Load from File)**:
```bash
# Read JSON file and send it
CREDENTIALS=$(cat /path/to/your-service-account.json)
curl -X POST http://localhost:3000/api/platforms/credentials \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "google_workspace",
    "credentials": '"$CREDENTIALS"',
    "credentialType": "service_account"
  }'
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "credentialId": 1,
    "platform": "google_workspace",
    "credentialType": "service_account"
  }
}
```

**Security Note**:
- Credentials are encrypted using **AES-256-CBC** before storage
- Only decrypted when needed for API calls
- Stored in `platform_credentials` table

**Common Errors**:

- `Unauthorized` (401) - Invalid or missing JWT token
- `Missing required fields: platform, credentials, credentialType` (400) - Incomplete request
- `google_workspace is currently under development` - If trying to use non-Google Workspace platform
- `Failed to add credentials` (400) - Invalid service account JSON format

### Using the Frontend (If Available)

1. Navigate to dashboard after login
2. Click **"Upload Service Account"** or **"Add Credentials"** button
3. Select **"Google Workspace"** as platform
4. Upload your JSON file or paste the JSON content
5. Click **"Upload"**
6. Wait for confirmation message

**What You've Accomplished**: Successfully connected your Google Workspace to Shenv. The platform can now access your workspace data.

---

## Step 3: Discover Workspace Users

Discover all users in your Google Workspace organization. This is required for accurate risk detection (orphaned assets, external users, etc.).

**Why This Is Mandatory**:
- Enables orphaned asset detection (assets owned by users no longer in workspace)
- Identifies external collaborators
- Provides organizational context for governance decisions

### Using the API

**Endpoint**: `POST /api/assets/workspace/discover?platform=google_workspace`

**Headers**:
- `Authorization: Bearer YOUR_JWT_TOKEN`

**Request**:
```bash
curl -X POST "http://localhost:3000/api/assets/workspace/discover?platform=google_workspace" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "platform": "google_workspace",
    "discovered": 247,
    "stored": 247
  },
  "message": "Discovered 247 workspace users"
}
```

**Response Fields**:
- `discovered`: Number of users found in Google Workspace
- `stored`: Number of users saved to Shenv database
- Numbers match if all users were successfully stored

**What Gets Discovered**:
For each workspace user, Shenv captures:
- Email address
- Full name
- Admin status (is workspace admin)
- Suspended status
- Account creation date
- Last login date

**Time Required**:
- Small workspaces (< 100 users): 5-15 seconds
- Medium workspaces (100-1000 users): 15-60 seconds
- Large workspaces (1000+ users): 1-3 minutes

**Common Errors**:

- `Unauthorized` (401) - Invalid or missing JWT token
- `Missing required query parameter: platform` (400) - Forgot `?platform=google_workspace`
- `Insufficient permissions. Ensure Domain-Wide Delegation is enabled` - DWD not configured (see Part A, Steps 5-6)
- `Authentication failed. Check service account credentials` - Invalid service account

### Verification

To verify workspace users were discovered:

**Endpoint**: `GET /api/assets/stats/summary`

```bash
curl -X GET http://localhost:3000/api/assets/stats/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Check that the response includes workspace user data in your database.

**What You've Accomplished**: Populated Shenv with your complete workspace user directory. Risk analysis will now accurately identify orphaned and external assets.

---

## Step 4: Discover Assets

Discover all cloud assets (spreadsheets, documents, presentations, etc.) in your Google Workspace Drive.

**What Gets Discovered**:
- Google Sheets
- Google Docs
- Google Slides
- Google Forms
- PDFs
- Folders
- Other file types

For each asset, Shenv captures:
- Name, owner, URL
- Creation and modification dates
- All permissions (users, groups, domain, anyone)
- File size and MIME type

### Using the API

**Endpoint**: `POST /api/assets/discover?platform=google_workspace`

**Headers**:
- `Authorization: Bearer YOUR_JWT_TOKEN`

**Request**:
```bash
curl -X POST "http://localhost:3000/api/assets/discover?platform=google_workspace" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "platform": "google_workspace",
    "discovered": 1523,
    "stored": 1523
  },
  "message": "Discovered 1523 assets, stored 1523"
}
```

**Response Fields**:
- `discovered`: Number of assets found in Google Drive
- `stored`: Number of assets saved to Shenv database

**What Happens During Discovery**:

1. **Fetch Assets**: Queries Google Drive API for all accessible files
2. **Fetch Permissions**: For each asset, retrieves all permission entries
3. **Calculate Risk**: Applies 7-factor risk scoring algorithm
4. **Detect Orphaned**: Compares asset owner to workspace users
5. **Detect Inactive**: Checks if last modified > 6 months ago
6. **Store Data**: Saves asset + permissions to database

**Risk Scoring (7 Factors, Score: 0-100)**:
- Anyone with link access: +40 points
- Domain-wide access: +25 points
- External users: +20 points
- Orphaned (owner not in workspace): +20 points
- External editors/owners: +15 points
- High permission count (50+ users): +10 points
- Inactive (6+ months): +10 points

**Risk Levels**:
- **Low**: 0-30 points (green)
- **Medium**: 31-60 points (yellow)
- **High**: 61-100 points (red)

**Time Required**:
- Small workspace (< 1,000 assets): 1-3 minutes
- Medium workspace (1,000-10,000 assets): 3-10 minutes
- Large workspace (10,000+ assets): 10-30 minutes

**Progress Monitoring**:
Discovery runs synchronously. The request will complete when all assets are discovered. Watch backend logs for progress:

```
[INFO] Discovered 500 assets from google_workspace
[INFO] Stored 500 assets in database
```

**Common Errors**:

- `Unauthorized` (401) - Invalid or missing JWT token
- `No credentials found for platform: google_workspace` (500) - Service account not uploaded (Step 2)
- `Missing required query parameter: platform` (400) - Forgot `?platform=google_workspace`
- `Failed to discover assets` (500) - API access issue, check service account permissions

### Verification

Check asset discovery statistics:

**Endpoint**: `GET /api/assets/stats/summary`

```bash
curl -X GET http://localhost:3000/api/assets/stats/summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalAssets": 1523,
    "orphanedCount": 12,
    "inactiveCount": 87,
    "highRiskCount": 34
  }
}
```

**What You've Accomplished**: Discovered and analyzed all assets in your Google Workspace. Risk scores, orphaned status, and inactive status are now calculated for each asset.

---

## Step 5: Review Your Assets

View and filter your discovered assets to understand your risk landscape.

### View All Assets

**Endpoint**: `GET /api/assets`

**Headers**:
- `Authorization: Bearer YOUR_JWT_TOKEN`

**Basic Request**:
```bash
curl -X GET "http://localhost:3000/api/assets?limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": 1,
        "platform": "google_workspace",
        "externalId": "1abc...xyz",
        "assetType": "spreadsheet",
        "mimeType": "application/vnd.google-apps.spreadsheet",
        "name": "Q4 Financial Report",
        "ownerEmail": "cfo@company.com",
        "url": "https://docs.google.com/spreadsheets/d/1abc...xyz",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "lastModifiedAt": "2025-01-10T14:22:00.000Z",
        "permissionCount": 12,
        "isOrphaned": false,
        "isInactive": false,
        "riskScore": 45,
        "lastSyncedAt": "2026-01-20T18:55:00.000Z"
      }
    ],
    "total": 1523,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Filter by Risk Level

**High-Risk Assets Only** (riskScore >= 61):
```bash
curl -X GET "http://localhost:3000/api/assets?limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq '.data.assets[] | select(.riskScore >= 61)'
```

### Filter by Orphaned Status

**Orphaned Assets Only**:
```bash
curl -X GET "http://localhost:3000/api/assets?isOrphaned=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": 42,
        "name": "Old Marketing Plan",
        "ownerEmail": "former-employee@company.com",
        "isOrphaned": true,
        "riskScore": 75
      }
    ],
    "total": 12
  }
}
```

### Filter by Inactive Status

**Inactive Assets Only** (not modified in 6+ months):
```bash
curl -X GET "http://localhost:3000/api/assets?isInactive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Asset Type

**Spreadsheets Only**:
```bash
curl -X GET "http://localhost:3000/api/assets?assetType=spreadsheet" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Available Asset Types**:
- `spreadsheet` - Google Sheets
- `document` - Google Docs
- `presentation` - Google Slides
- `form` - Google Forms
- `pdf` - PDF files
- `folder` - Folders
- `other` - Other file types

### Search Assets by Name

```bash
curl -X GET "http://localhost:3000/api/assets?search=financial" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Asset Details with Permissions

**Endpoint**: `GET /api/assets/:id`

```bash
curl -X GET "http://localhost:3000/api/assets/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "asset": {
      "id": 1,
      "name": "Q4 Financial Report",
      "ownerEmail": "cfo@company.com",
      "riskScore": 45,
      "permissions": [
        {
          "id": 1,
          "email": "cfo@company.com",
          "role": "owner",
          "type": "user",
          "displayName": "CFO Name"
        },
        {
          "id": 2,
          "email": "finance-team@company.com",
          "role": "writer",
          "type": "group",
          "displayName": "Finance Team"
        },
        {
          "id": 3,
          "email": null,
          "role": "reader",
          "type": "anyone",
          "displayName": "Anyone with the link"
        }
      ]
    }
  }
}
```

**Understanding Risk Factors**:

Looking at the example above (riskScore: 45):
- ✅ Has owner in workspace (not orphaned)
- ✅ Recently modified (not inactive)
- ❌ **Anyone with link** can view (+40 points) - HIGH RISK FACTOR
- ✅ Only 3 permissions (low count)
- ✅ No external users

**Action**: Should remove "anyone" permission and make private.

**What You've Accomplished**: You can now view, filter, and analyze your assets to identify governance priorities. You understand which assets pose the highest risk to your organization.

---

## Step 6: First Governance Action

Create and execute your first governance action to reduce risk in your workspace.

**Available Actions**:
1. **Delete** - Permanently delete an asset
2. **Change Visibility** - Remove 'anyone' and 'domain' permissions (make private)
3. **Remove Permission** - Remove a specific user/group's access
4. **Transfer Ownership** - Transfer asset to a new owner

### Scenario: Remove Public Access from High-Risk Sheet

Let's fix the "Anyone with link" issue from Step 5.

#### Create Governance Action

**Endpoint**: `POST /api/governance/actions`

**Headers**:
- `Authorization: Bearer YOUR_JWT_TOKEN`
- `Content-Type: application/json`

**Request**:
```bash
curl -X POST http://localhost:3000/api/governance/actions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": 1,
    "actionType": "change_visibility",
    "reason": "Asset has public access (anyone with link). Removing to reduce security risk.",
    "approvers": ["security-admin@company.com", "cfo@company.com"]
  }'
```

**Request Fields**:
- `assetId`: The ID of the asset to govern (from Step 5)
- `actionType`: Type of action (one of: delete, change_visibility, remove_permission, transfer_ownership)
- `reason`: Business justification for the action (mandatory)
- `approvers`: List of email addresses who must approve (at least 1 required)

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "action": {
      "id": 1,
      "assetId": 1,
      "actionType": "change_visibility",
      "status": "pending",
      "requestedBy": "admin@company.com",
      "reason": "Asset has public access (anyone with link). Removing to reduce security risk.",
      "createdAt": "2026-01-20T19:00:00.000Z"
    },
    "approvals": [
      {
        "id": 1,
        "actionId": 1,
        "approverEmail": "security-admin@company.com",
        "isApproved": null,
        "respondedAt": null
      },
      {
        "id": 2,
        "actionId": 1,
        "approverEmail": "cfo@company.com",
        "isApproved": null,
        "respondedAt": null
      }
    ]
  },
  "message": "Governance action created successfully. Awaiting approvals from 2 approvers."
}
```

**Action Status Flow**:
- `pending` → Waiting for all approvers to approve
- `approved` → All approvers approved, ready to execute
- `rejected` → At least one approver rejected
- `executed` → Action successfully completed
- `failed` → Execution failed (see errorMessage)

#### Approve the Action

Each approver must approve the action. Let's approve as both approvers:

**Endpoint**: `POST /api/approvals/:id/approve`

**Approve as Security Admin**:
```bash
curl -X POST http://localhost:3000/api/approvals/1/approve \
  -H "Authorization: Bearer SECURITY_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Approved. Public access should be removed immediately."
  }'
```

**Approve as CFO**:
```bash
curl -X POST http://localhost:3000/api/approvals/2/approve \
  -H "Authorization: Bearer CFO_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Approved. Finance data should not be publicly accessible."
  }'
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "approval": {
      "id": 2,
      "actionId": 1,
      "approverEmail": "cfo@company.com",
      "isApproved": true,
      "comment": "Approved. Finance data should not be publicly accessible.",
      "respondedAt": "2026-01-20T19:05:00.000Z"
    }
  },
  "message": "Action approved successfully"
}
```

After the second approval, the action status automatically changes to `approved`.

#### Execute the Action

Now that the action is approved, execute it:

**Endpoint**: `POST /api/governance/actions/:id/execute`

```bash
curl -X POST http://localhost:3000/api/governance/actions/1/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "action": {
      "id": 1,
      "assetId": 1,
      "actionType": "change_visibility",
      "status": "executed",
      "executedAt": "2026-01-20T19:10:00.000Z",
      "errorMessage": null
    }
  },
  "message": "Governance action executed successfully"
}
```

**What Happened**:
1. Shenv connected to Google Drive API
2. Retrieved all permissions for the asset
3. Identified "anyone" and "domain" permissions
4. Removed those permissions via Google Drive API
5. Updated action status to `executed`
6. Created an **audit log entry** (immutable record)

#### Verify the Change

Check the asset permissions again:

```bash
curl -X GET "http://localhost:3000/api/assets/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Updated Permissions**:
```json
{
  "success": true,
  "data": {
    "asset": {
      "id": 1,
      "name": "Q4 Financial Report",
      "riskScore": 5,
      "permissions": [
        {
          "email": "cfo@company.com",
          "role": "owner",
          "type": "user"
        },
        {
          "email": "finance-team@company.com",
          "role": "writer",
          "type": "group"
        }
      ]
    }
  }
}
```

**Notice**:
- "Anyone with link" permission is **removed**
- Risk score dropped from **45 → 5** (only +5 for 2 permissions)
- Asset is now private to specific users/groups only

#### View Audit Log

All governance actions are logged in an immutable audit trail:

**Endpoint**: `GET /api/governance/audit-logs`

```bash
curl -X GET "http://localhost:3000/api/governance/audit-logs?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "eventType": "governance_action_executed",
        "actorEmail": "admin@company.com",
        "targetResource": "Asset ID: 1 (Q4 Financial Report)",
        "timestamp": "2026-01-20T19:10:00.000Z",
        "metadata": {
          "actionId": 1,
          "actionType": "change_visibility",
          "assetId": 1,
          "assetName": "Q4 Financial Report",
          "removedPermissions": 1
        }
      }
    ],
    "total": 1
  }
}
```

**Audit Log Features**:
- **Immutable**: Cannot be modified or deleted
- **Complete**: Captures actor, action, timestamp, and full metadata
- **Compliance-ready**: Provides complete audit trail for governance activities

**What You've Accomplished**: Successfully completed your first governance action! You:
1. Identified a high-risk asset
2. Created a governance action with business justification
3. Got multi-approver approval
4. Executed the action via Google APIs
5. Verified the risk reduction
6. Reviewed the audit trail

---

## Congratulations!

You've completed the full Google Workspace onboarding for Shenv. You can now:

✅ Discover all assets in your Google Workspace
✅ Identify high-risk, orphaned, and inactive assets
✅ Create governance actions with approval workflows
✅ Execute actions to reduce security risks
✅ Maintain complete audit trails for compliance

### Next Steps

1. **Monthly Reports**: Generate monthly governance reports
   - `POST /api/reports/monthly/generate`

2. **Automate Discovery**: Set up scheduled asset discovery
   - Re-run discovery weekly/monthly to catch new assets

3. **Bulk Governance**: Create actions for multiple high-risk assets
   - Filter by `riskScore >= 70` and create bulk actions

4. **Monitor Approvals**: Check pending approvals regularly
   - `GET /api/approvals/pending`

5. **Review Audit Logs**: Periodically review governance activities
   - `GET /api/governance/audit-logs`

### Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify Google Cloud setup (Part A, Steps 1-6)
3. Confirm service account credentials are valid
4. Review API endpoint documentation

---

**Platform Status**: Google Workspace is fully supported. Other platforms (Microsoft 365, Zoho, Dropbox, Box) are currently under development.
