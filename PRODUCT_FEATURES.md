# Shenv: Product Features Specification
## For Development Team (Product Features & Experience Only)

---

## PRODUCT OVERVIEW

**What we're building:**
A workspace visibility and control platform that works across Google Workspace, Microsoft 365, and Zoho Workplace.

**Core concept:**
Everything in a workspace is an "asset" (email, file, sheet, doc, folder) that has:
- Owner
- Permissions (who can access it)
- Risk score (0-100) with plain English explanation
- Action suggestions ("Make Private", "Review Access", etc.)

**Two user tiers:**
1. **Individual Users** - Freemium with queue system
2. **Business Users** - Admin-provisioned for entire organization

**Platform approach:**
Build once, works everywhere (Google → Microsoft → Zoho)

---

## CORE PRINCIPLE: UNIVERSAL ASSET MODEL

### The Challenge
Different platforms use different terminology:
- Google: "Google Sheet", "Drive File", "Gmail"
- Microsoft: "Excel Online", "OneDrive", "Outlook"
- Zoho: "Zoho Sheet", "WorkDrive", "Zoho Mail"

### Our Solution
Treat everything as universal asset types:

**Asset Types (platform-agnostic):**
- **Message** - Any email (Gmail/Outlook/Zoho Mail)
- **Sender** - Email sender (across all platforms)
- **Spreadsheet** - Sheets/Excel/Zoho Sheet
- **Document** - Docs/Word/Zoho Writer
- **Presentation** - Slides/PowerPoint/Zoho Show
- **File** - Generic file from any platform
- **Folder** - Folder from any platform
- **Team Space** - Shared Drive/SharePoint/Zoho Team Folder

**Every asset has:**
- Name
- Owner email
- Permissions list (who can access + their role)
- Dates (created, modified, last accessed)
- Size
- Risk score (0-100)
- Risk factors (list of plain English reasons why risky)
- Quick flags: isPublic, hasExternalAccess, isOrphaned, isInactive

**Why this matters:**
- Same UI works for all platforms
- Add new platforms without redesigning
- Consistent user experience everywhere

---

## FEATURE 1: FIFO QUEUE SYSTEM

### What It Does
Free users wait in line for scans. Paid users skip the line.

### User Experience

**Free User Flow:**
```
1. User clicks "Scan My Workspace"
   ↓
2. "Your scan is queued!"
   
   Queue Status:
   - Your position: #45
   - Currently processing: Job #13
   - Estimated wait: ~2 hours
   - We'll email you when ready
   
   💡 Skip the wait:
   [$5 One-Time Skip] or [$29/mo Unlimited Scans]
   
   ✉️ You can close this page. We'll email you.
   ↓
3. Email arrives: "Your scan is complete! View results"
   ↓
4. User sees their assets and risk scores
```

**Paid User Flow:**
```
1. User clicks "Scan My Workspace"
   ↓
2. "Scanning now..." (immediate, no queue)
   ↓
3. Results appear in 2-5 minutes
```

### Queue Behavior

**FIFO = First In, First Out:**
- Free users processed in order they signed up
- EXCEPT: Paid users always jump to front
- Queue position updates in real-time: #45 → #44 → #43

**Estimated wait time:**
- Based on: (queue position) × (average job time)
- Average job = ~5 minutes
- Example: Position #20 = ~100 minutes wait

**Upgrade options:**
- **One-time $5:** This scan jumps queue immediately
- **Monthly $29:** All future scans skip queue forever

### Quota Protection

**Daily limits (protect API costs):**
- Free tier: 10,000 total API calls shared across ALL free users
- Paid tier: 50,000 total calls for all paid users
- Resets at midnight UTC daily

**When quota exceeded:**
- Free queue pauses ("Try again tomorrow or upgrade")
- Paid scans continue normally

### What We Track

**Job Queue Data:**
- Which user requested
- What type: Gmail only, Drive only, or Full workspace scan
- Status: queued, processing, completed, failed
- Priority: free or paid
- Position in queue (recalculated as jobs complete)
- Estimated start time
- Timestamps: created, started, completed
- Results: how many assets found, what risk score
- Error message if failed

**Scan History:**
- Past scans user ran
- When completed
- How many assets each time
- Risk score trend over time

---

## FEATURE 2: UNIVERSAL RISK SCORING

### What It Does
Every asset gets 0-100 risk score + plain English why it's risky. Same logic works for Google, Microsoft, Zoho.

### Risk Calculation

**7 Risk Factors (add up to 100 max):**

1. **Public Access** = +40 points
   - Asset is "Anyone with link" or "Public on web"
   - Shows: "Public on web - anyone can access"

2. **Domain-Wide** = +25 points
   - Shared with entire company (@company.com)
   - Shows: "Shared with entire organization"

3. **External Users** = +20 points
   - Shared with emails outside company
   - Shows: "Shared with 3 external users"

4. **Orphaned** = +20 points
   - Owner account deleted (person left company)
   - Shows: "Owner left company 6 months ago"

5. **External Editors** = +15 points
   - External users can edit (not just view)
   - Shows: "External user has edit access"

6. **High Share Count** = +10 points
   - Shared with 50+ people
   - Shows: "Shared with 67 people"

7. **Inactive** = +10 points
   - Not accessed in 6+ months
   - Shows: "Not accessed in 8 months"

**Risk Levels:**
- 🟢 Low (0-30): You're fine
- 🟡 Medium (31-60): Review this
- 🔴 High (61-100): Fix immediately

### Display to User

**Individual asset:**
```
📄 Q4_Financials.xlsx
🔴 Risk Score: 85 (High)

Why this is risky:
• Public on web - anyone can access
• Shared with 3 external users
• Owner left company 6 months ago

What you can do:
[Make Private] [Review Access] [Delete]
```

**Dashboard summary:**
```
📊 Your Risk Overview

Total Assets: 2,341

🔴 High Risk: 47 (fix these first!)
🟡 Medium Risk: 234 (review soon)
🟢 Low Risk: 2,060 (you're good)

Top 3 Urgent:
1. Q4_Financials.xlsx (Risk: 95)
2. Client_Database.csv (Risk: 88)  
3. HR_Salaries.doc (Risk: 85)

[Fix All High-Risk Items]
```

### Platform Independence

Same factors work across all platforms:
- Check if public? (permission type = "anyone")
- Check external access? (email domain doesn't match org)
- Check if orphaned? (owner not in org user list)
- Check if inactive? (last access > 6 months)

Works identically for:
- Google Sheets = Microsoft Excel = Zoho Sheet
- Gmail = Outlook = Zoho Mail
- Drive = OneDrive = WorkDrive

---

## FEATURE 3: BUSINESS ADMIN SETUP

### What It Does
Admin sets up once for entire organization. No individual employee setup needed.

### Why This Matters

**Bad way (individual OAuth):**
- Admin signs up
- Must ask 500 employees to each authorize
- 50% never do it
- People leaving = access breaks
- Onboarding nightmare

**Good way (admin provisioning):**
- Admin does one 5-10 minute setup
- Works for ALL employees (current + future)
- No employee involvement
- Centralized control

### Setup Experience Per Platform

#### Google Workspace Setup

**Wizard steps:**
```
Step 1: Create Service Account
- Go to Google Cloud Console
- Create new project
- Enable these APIs:
  * Admin SDK
  * Google Drive API
  * Gmail API
- Create service account
- Download JSON key file

[Watch Video Tutorial] [Next]

Step 2: Enable Domain-Wide Delegation
- Go to Google Workspace Admin Console  
- Security → API Controls → Domain-Wide Delegation
- Add service account Client ID
- Grant these scopes: [list shown]
- Wait 5-10 minutes

[Watch Video Tutorial] [Next]

Step 3: Upload & Test
Paste your service account JSON here:
[Large text box]

[Test Connection]

Testing...
✅ Service account valid
✅ Can authenticate
✅ Domain-Wide Delegation enabled
✅ Found 127 users in organization

[Complete Setup & Start Scanning]
```

#### Microsoft 365 Setup

**Similar wizard but different steps:**
```
Step 1: Register App in Azure
- Go to Azure Portal
- App Registrations → New
- Copy: Tenant ID, Application ID

Step 2: Configure Permissions
- Add Microsoft Graph API permissions:
  * User.Read.All
  * Files.Read.All
  * Mail.Read
  * Sites.Read.All
- Grant admin consent for organization

Step 3: Create Client Secret
- Certificates & Secrets
- New client secret
- Copy secret value (shows only once!)

Step 4: Provide Credentials
Tenant ID: [paste]
Application ID: [paste]
Client Secret: [paste]

[Test Connection]

✅ All good! Found 127 users.

[Complete Setup]
```

#### Zoho Workplace Setup

```
Step 1: Create OAuth App
- Go to Zoho API Console
- Create new app
- Copy: Client ID, Client Secret

Step 2: Generate Organization Token
- Authorize with admin account
- Generate refresh token
- Copy token

Step 3: Provide Credentials
Client ID: [paste]
Client Secret: [paste]
Refresh Token: [paste]

[Test Connection]

✅ Connected! Found 127 users.

[Complete Setup]
```

### Validation Requirements

**What we must verify:**
- Credentials are in correct format
- Can authenticate successfully
- Has required permissions/scopes
- Can actually access organization users (try to list 1 user)

**Success looks like:**
```
✅ Setup Complete!

Workspace: Google Workspace
Organization: company.com
Users: 127 discovered
Status: Ready to scan

[Start Full Organization Scan]
```

**Failure states:**
```
❌ Invalid JSON format
Please check file and try again

❌ Domain-Wide Delegation not enabled
Go back to Step 2

❌ Missing required scopes
Add these scopes: [list]

❌ Cannot access users
Check admin permissions
```

### Security Requirements

- Store credentials ENCRYPTED (never plain text)
- Never show credentials in UI after upload
- Decrypt only when making API calls
- Regular validation (test monthly if still working)

---

## FEATURE 4: ASSET DISCOVERY

### What It Does
Scan workspace and find all assets. Different per platform but same output format.

### Discovery Scope

**Individuals:**
- Their own emails and senders
- Their own files
- Their own sheets/docs/slides
- Their own folders
- What they own or have access to

**Businesses:**
- ALL users' assets
- Organization-wide shared drives/spaces
- Team folders and SharePoint sites
- Complete organization inventory

### Scan Types

**Quick Scan** (free tier):
- Public assets only (fastest)
- High-risk items
- External shares
- Time: ~1-2 minutes

**Full Scan** (paid tier):
- All assets including private
- Complete permission analysis
- Detailed metadata
- Time: ~5-10 minutes

**Organization Scan** (business):
- All users
- All assets
- All team/shared spaces
- Time: ~30-60 minutes for 50-user org

### What Gets Discovered

**From Google Workspace:**
- Gmail messages and sender analysis
- Drive files, folders, Shared Drives
- Sheets, Docs, Slides metadata
- All permissions on each item
- Organization user list (for orphan detection)

**From Microsoft 365:**
- Outlook messages and senders
- OneDrive files and folders
- SharePoint sites and documents
- Excel, Word, PowerPoint metadata
- All permissions
- Organization users

**From Zoho Workplace:**
- Zoho Mail messages and senders
- WorkDrive files and folders
- Zoho Sheet, Writer, Show metadata
- Team folders
- All permissions
- Organization users

### Universal Output Format

**Every discovered asset, regardless of platform:**
```
Asset {
  name: "Q4_Financials.xlsx"
  type: "spreadsheet"
  platform: "google" | "microsoft" | "zoho"
  owner: "john@company.com"
  url: "https://..."
  size: "2.4 MB"
  
  dates: {
    created: "2024-01-15"
    modified: "2024-06-20"
    lastAccessed: "2024-12-01"
  }
  
  permissions: [
    { email: "anyone", role: "reader" },
    { email: "sarah@company.com", role: "editor" },
    { email: "external@gmail.com", role: "commenter" }
  ]
  
  risk: {
    score: 85
    level: "high"
    factors: [
      "Public on web - anyone can access",
      "Shared with 1 external user",
      "Owner left company 6 months ago"
    ]
  }
  
  flags: {
    isPublic: true
    hasExternalAccess: true
    isOrphaned: true
    isInactive: false
  }
}
```

### Progress Indicators

**During scan, show:**
```
Scanning your workspace...

Progress:
✅ Discovered organization users (127 found)
⏳ Scanning emails... (2,341 messages processed)
⏳ Scanning files... (1,892 files processed)
⏳ Analyzing permissions... (45% complete)
⏳ Calculating risk scores...

Estimated time remaining: ~3 minutes
```

**Completion:**
```
✅ Scan Complete!

Discovered:
- 4,233 total assets
- 127 workspace users
- 47 high-risk items need attention

[View Results]
```

---

## FEATURE 5: SUGGESTED ACTIONS

### What It Does
Don't just show problems. Tell users what to do and make it easy.

### Action Types

**1. Make Private**
- Removes "anyone" and "domain" access
- Keeps individual user shares
- One-click action
```
📄 Tax_Returns.xlsx is public

[Make Private] → Removes public access in 1 second
```

**2. Review Access**
- Shows who has access
- Let user remove specific people
- Multi-select for bulk removal
```
📄 Client_List.xlsx shared with 12 people

Who has access:
☑ john@company.com (Owner)
☑ sarah@company.com (Editor)
☑ external@gmail.com (Viewer) ← External!
☐ ...9 more

[Remove Selected Access]
```

**3. Transfer Ownership**
- For orphaned assets (owner left)
- Assign to new owner
```
📄 Old_Project.doc owned by departed employee

Transfer ownership to:
[Select user ▼] sarah@company.com

[Transfer]
```

**4. Delete**
- Permanently delete asset
- Requires confirmation
```
📄 Temp_Test_File.xlsx

⚠️ This will permanently delete the file

Type DELETE to confirm: [____]

[Delete Permanently]
```

**5. Bulk Actions**
- Act on multiple assets at once
- Checkbox selection
```
You have 23 public files selected

[Make All Private] [Delete All] [Cancel]

⚠️ This will affect 23 files. Continue?
```

### Suggested Actions Display

**On individual asset:**
```
📄 Q4_Financials.xlsx
🔴 Risk: 95 (High)

Problems:
• Public on web - anyone can access
• Shared with 3 external users
• Contains keyword: confidential

Suggested actions:
1. [Make Private] (recommended)
   Removes public access, keeps team shares
   
2. [Review Access]
   See who can access, remove specific people
   
3. [Delete]
   Permanently remove this file
```

**On dashboard (batch suggestions):**
```
💡 Suggested Fixes

High Priority:
🔴 23 files are publicly accessible
   [Make All Private] ← One click fixes all

⚠️ 12 files owned by ex-employees
   [Transfer All to Manager]

💬 67 files shared with external users
   [Review All External Access]
```

### Action Feedback

**Success:**
```
✅ Made 23 files private

Risk reduced:
Before: 85 → After: 32

[Undo] [View Changes]
```

**Failure:**
```
❌ Failed to make private

Reason: You don't have owner permission

Try: Ask john@company.com (owner) to make it private
```

---

## FEATURE 6: DASHBOARD & VIEWS

### Main Dashboard

**Overview section:**
```
📊 Your Workspace

Total Assets: 2,341
Last scan: 2 hours ago [Scan Again]

Risk Breakdown:
🔴 High: 47 assets (fix now!)
🟡 Medium: 234 assets (review soon)
🟢 Low: 2,060 assets (all good)

Your risk score: 42/100 (Medium)
↓ Down 12 points from last week!
```

**Quick actions:**
```
💡 What to do next:

1. Make 23 public files private [Fix Now]
2. Review 12 files from ex-employees [Review]
3. Check 67 external shares [Review]

[Fix All High-Risk Items]
```

**Top risky assets:**
```
🔥 Most Urgent:

1. Q4_Financials.xlsx
   Risk: 95 | Public + External access
   [Make Private]

2. Client_Database.csv
   Risk: 88 | Owner left company
   [Transfer Ownership]

3. HR_Salaries.doc
   Risk: 85 | Public + Sensitive content
   [Make Private]

[View All 47 High-Risk Items →]
```

### Asset List View

**Filters:**
```
Show: [All Assets ▼]
- All (2,341)
- High Risk (47)
- Medium Risk (234)
- Public (23)
- External Shares (67)
- Orphaned (12)
- Inactive (89)

Type: [All Types ▼]
- Spreadsheets (423)
- Documents (892)
- Files (891)
- Emails (135)

Sort by: [Risk Score ▼]
- Risk (High to Low)
- Name (A-Z)
- Modified (Newest)
- Owner (A-Z)
```

**List display:**
```
☑ [Select All 47]

☑ 📄 Q4_Financials.xlsx
   🔴 95 | john@company.com | Public | 2.4 MB
   [Make Private] [Review] [Delete]

☑ 📄 Client_Database.csv
   🔴 88 | sarah@company.com | External shares | 890 KB
   [Review Access] [Delete]

☑ 📄 HR_Salaries.doc
   🔴 85 | departed@company.com | Orphaned | 1.2 MB
   [Transfer] [Delete]

Showing 1-20 of 47
[Load More]

Actions for selected (3):
[Make Private] [Delete] [Export List]
```

### Asset Detail View

**When user clicks an asset:**
```
📄 Q4_Financials.xlsx
🔴 Risk Score: 95 (High)

Owner: john@company.com
Size: 2.4 MB
Created: Jan 15, 2024
Modified: Jun 20, 2024
Last accessed: Dec 1, 2024

[Open in Google Sheets ↗]

━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Risk Factors:
• Public on web - anyone can access (+40)
• Shared with 3 external users (+20)
• Owner left company 6 months ago (+20)
• Contains keyword: financial (+15)

━━━━━━━━━━━━━━━━━━━━━━━━━

👥 Who Has Access (5 people):

anyone@public
  Role: Viewer
  Type: Public link
  [Remove Public Access]

john@company.com (You)
  Role: Owner

sarah@company.com
  Role: Editor
  [Change to Viewer] [Remove]

external@gmail.com ⚠️ External
  Role: Commenter
  [Remove Access]

mike@otherdomain.com ⚠️ External
  Role: Viewer
  [Remove Access]

━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Suggested Actions:

1. Make Private (Recommended)
   Removes public access
   Keeps internal team shares
   [Make Private]

2. Remove External Users
   Remove 2 external people
   [Remove External Access]

3. Transfer Ownership
   Owner account inactive
   [Transfer to New Owner]

4. Delete File
   If no longer needed
   [Delete Permanently]
```

---

## FEATURE 7: PROGRESS & HISTORY

### Progress Tracking

**Show improvement over time:**
```
📈 Your Progress

This Week:
✅ Secured 32 assets
✅ Risk score: 65 → 42 (down 35%!)
✅ Made 23 files private
✅ Removed 15 external shares

This Month:
- 89 assets secured
- 156 → 42 risk score (down 73%)
- 0 high-risk assets remaining 🎉

[View Full History]
```

**Before/After comparison:**
```
Your Workspace Health

Before first scan:
🔴 Risk: 156
- 89 high-risk assets
- 45 public files
- 34 orphaned files

After cleanup:
🟢 Risk: 42
- 0 high-risk assets
- 0 public files  
- 0 orphaned files

You're doing great! 🎉
```

### Scan History

**Past scans:**
```
Scan History

Dec 10, 2024 - Full Scan
  2,341 assets | Risk: 42 | 0 high-risk
  [View Details]

Dec 3, 2024 - Full Scan
  2,356 assets | Risk: 58 | 12 high-risk
  ↑ Fixed 12 issues since last scan

Nov 26, 2024 - Full Scan
  2,401 assets | Risk: 65 | 32 high-risk
  ↑ Fixed 20 issues since last scan

[View All Scans]
```

### Activity Log

**What user has done:**
```
Recent Activity

Dec 10, 2024 3:45 PM
Made Q4_Financials.xlsx private

Dec 10, 2024 3:42 PM
Removed external access from Client_List.xlsx

Dec 10, 2024 3:40 PM
Deleted Temp_Test_File.doc

Dec 9, 2024 2:15 PM
Transferred ownership of Old_Project.doc to sarah@company.com

[View Full Activity Log]
```

---

## FEATURE 8: NOTIFICATIONS & ALERTS

### Email Notifications

**Scan complete:**
```
Subject: Your Shenv scan is complete!

Hi John,

Your workspace scan finished:
- 2,341 assets discovered
- 47 need your attention

Top issues:
• 23 public files
• 12 orphaned files
• 67 external shares

[View Results]
```

**New risks detected:**
```
Subject: 3 new high-risk items detected

Hi John,

We found 3 new risky files since your last scan:

1. Budget_2025.xlsx - Public on web
2. Passwords.doc - Shared externally
3. Confidential_Notes.pdf - Owner left company

[Fix These Issues]
```

**Weekly digest:**
```
Subject: Your weekly workspace security digest

Hi John,

This week:
✅ You secured 12 assets
⚠️ 5 new risks detected
📊 Risk score: 45 → 42

[View Full Report]
```

### In-App Notifications

**When user logs in:**
```
🔔 You have 3 notifications

⚠️ 5 new high-risk files detected
   [View Files]

✅ Your scan from yesterday is complete
   [View Results]

📊 Monthly report ready
   [Download Report]
```

---

## FEATURE 9: BUSINESS-SPECIFIC FEATURES

### Organization Dashboard

**For business admins:**
```
🏢 Organization Overview

company.com
127 users | 12,453 assets | Last scan: 1 hour ago

Risk Breakdown:
🔴 High: 842 assets (7%)
🟡 Medium: 2,431 assets (20%)
🟢 Low: 9,180 assets (73%)

By Department:
Sales: 234 high-risk
HR: 89 high-risk
Finance: 67 high-risk
Engineering: 145 high-risk

Top Risk Contributors:
1. john@company.com (47 high-risk assets)
2. sarah@company.com (34 high-risk assets)
3. mike@company.com (29 high-risk assets)

[View Full Report] [Export Data]
```

### Department View

**Filter by department:**
```
Department: Sales ▼

Users: 23
Assets: 2,341
High-Risk: 234

Top Issues:
• 45 public client presentations
• 23 shared proposals with external
• 12 orphaned sales decks

[Assign to Sales Manager] [Fix All]
```

### User Detail View

**Drill down to individual user:**
```
User: john@company.com
Department: Sales
Assets: 234
High-Risk: 47

Recent Activity:
- Created 5 new files this week
- Shared 3 files externally
- Has 12 public files

[Contact User] [View Assets] [Generate Report]
```

### Compliance Reports

**Monthly report generation:**
```
Generate Compliance Report

Period: November 2024
Format: PDF

Include:
☑ Executive summary
☑ Risk breakdown by department
☑ Top 10 risky assets
☑ Remediation activity
☑ Month-over-month comparison
☑ Compliance score

[Generate Report]
```

**Report preview:**
```
November 2024 Workspace Governance Report

Executive Summary:
- 12,453 total assets
- 94% compliant (up from 87% last month)
- 842 high-risk (down from 1,247)
- 1,456 assets secured this month

By Department: [charts]
Top Risks: [list]
Activity: [metrics]

[Download PDF] [Email to Board]
```

---

## FEATURE 10: SETTINGS & PREFERENCES

### Scan Settings

```
⚙️ Scan Settings

Scheduled Scans:
○ Off
● Daily at 2:00 AM
○ Weekly on Mondays
○ Monthly on 1st

What to scan:
☑ Emails
☑ Files
☑ Spreadsheets
☑ Documents
☑ Presentations
☑ Folders

Risk thresholds:
High risk: [61] and above
Medium risk: [31] to [60]
Low risk: [0] to [30]

[Save Settings]
```

### Notification Preferences

```
📧 Notifications

Email me when:
☑ Scan completes
☑ New high-risk items detected
☐ Weekly digest
☐ Monthly report available
☑ Risk score changes significantly

Notification frequency:
● Real-time
○ Daily digest
○ Weekly digest

[Save Preferences]
```

### Workspace Settings

```
🔧 Workspace Settings

Connected workspace:
Google Workspace - company.com
127 users discovered
Status: ✅ Active

[Disconnect] [Refresh Connection] [Test Connection]

Add another workspace:
[+ Connect Microsoft 365]
[+ Connect Zoho Workplace]
```

---

## MVP FEATURE PRIORITY

### Phase 1: Launch (Must-Have)

1. ✅ Universal asset model (Google only first)
2. ✅ FIFO queue system
3. ✅ Risk scoring (0-100)
4. ✅ Asset discovery (Gmail + Drive)
5. ✅ Basic dashboard (overview + list)
6. ✅ ONE action type: "Make Private"
7. ✅ Business admin setup (service account)

### Phase 2: Post-Launch (High Priority)

8. Progress tracking
9. Email notifications
10. All action types (delete, transfer, review)
11. Asset detail view
12. Scan history
13. Activity log

### Phase 3: Growth (Medium Priority)

14. Microsoft 365 support
15. Scheduled scans
16. Department filtering (business)
17. Compliance reports (business)
18. Bulk actions UI
19. User management (business)

### Phase 4: Scale (Low Priority)

20. Zoho Workplace support
21. Advanced filters
22. Custom risk thresholds
23. API access
24. Webhook integrations
25. White-label option

---

## KEY PRODUCT PRINCIPLES

1. **Platform-agnostic:** Build once, works for Google/Microsoft/Zoho
2. **Plain English:** No jargon, no technical explanations
3. **Action-oriented:** Don't just show problems, suggest fixes
4. **Progressive disclosure:** Simple first, details on demand
5. **Fair pricing:** Free tier works, paid tier worth upgrading to
6. **Instant value:** Users see risky assets immediately
7. **No manual work:** One-click actions, bulk operations
8. **Universal experience:** Same UI regardless of platform

---

This is what developers need to build. Focus on user experience and flows, not implementation details.