# Shenv Backend API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints

### POST /auth/signup
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "hasServiceAccount": false
  }
}
```

### POST /auth/signin
Sign in an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "hasServiceAccount": true
  }
}
```

---

## 2. Service Account Endpoints

### POST /service-account/upload
Upload Google service account JSON.

**Request:** Raw service account JSON object

**Response:**
```json
{
  "success": true,
  "message": "Service account uploaded successfully"
}
```

### GET /service-account/status
Check service account status.

**Response:**
```json
{
  "hasServiceAccount": true,
  "email": "service-account@project.iam.gserviceaccount.com"
}
```

### DELETE /service-account
Remove service account.

**Response:**
```json
{
  "success": true,
  "message": "Service account deleted successfully"
}
```

---

## 3. Sheet Discovery & Management Endpoints

### POST /api/sheets/discover
Discover all Google Sheets and analyze risks.

**Response:**
```json
{
  "success": true,
  "discovered": 150,
  "stored": 150,
  "message": "Discovered and stored 150 sheets"
}
```

### POST /api/sheets/workspace/discover
Discover workspace users via Google Admin API.

**Request:**
```json
{
  "adminEmail": "admin@example.com"  // Optional, for DWD
}
```

**Response:**
```json
{
  "success": true,
  "count": 245,
  "message": "Discovered 245 workspace users"
}
```

### GET /api/sheets
List all discovered sheets with filters.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional)
- `isOrphaned` (true/false)
- `isInactive` (true/false)

**Response:**
```json
{
  "sheets": [
    {
      "id": "sheet_google_id",
      "name": "Q4 Budget 2024",
      "url": "https://docs.google.com/spreadsheets/d/...",
      "owner": "owner@example.com",
      "createdTime": "2024-01-15T10:30:00Z",
      "modifiedTime": "2024-12-20T15:45:00Z",
      "permissionCount": 12,
      "riskScore": 65,
      "isOrphaned": false,
      "isInactive": false
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### GET /api/sheets/:id
Get detailed sheet information with permissions.

**Response:**
```json
{
  "sheet": {
    "id": "sheet_google_id",
    "name": "Q4 Budget 2024",
    "url": "https://docs.google.com/spreadsheets/d/...",
    "owner": "owner@example.com",
    "createdTime": "2024-01-15T10:30:00Z",
    "modifiedTime": "2024-12-20T15:45:00Z",
    "permissionCount": 12,
    "riskScore": 65,
    "isOrphaned": false,
    "isInactive": false
  },
  "permissions": [
    {
      "id": "permission_id",
      "sheetId": "sheet_google_id",
      "email": "user@example.com",
      "role": "writer",
      "type": "user",
      "displayName": "John Doe",
      "grantedTime": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 4. Governance Action Endpoints

### POST /governance/actions
Create a new governance action request.

**Request:**
```json
{
  "sheetId": "sheet_google_id",
  "actionType": "delete",  // or "change_visibility", "remove_permission", "transfer_ownership"
  "reason": "Sheet contains outdated data and is no longer needed",
  "approvers": ["manager@example.com", "admin@example.com"],  // Optional
  "metadata": {  // Optional, depends on actionType
    "visibility": "private",  // for change_visibility
    "permissionId": "perm_id",  // for remove_permission
    "newOwnerEmail": "newowner@example.com"  // for transfer_ownership
  }
}
```

**Response:**
```json
{
  "success": true,
  "actionId": 42,
  "approvalIds": [101, 102],
  "message": "Action created and sent for approval"
}
```

### GET /governance/actions
List all governance actions for the user.

**Query Parameters:**
- `status` (optional): pending, approved, rejected, executed, failed

**Response:**
```json
{
  "actions": [
    {
      "id": 42,
      "sheetId": "sheet_google_id",
      "sheetName": "Q4 Budget 2024",
      "actionType": "delete",
      "status": "pending",
      "reason": "Sheet contains outdated data",
      "requestedBy": "user@example.com",
      "createdAt": "2024-12-20T15:00:00Z",
      "executedAt": null,
      "errorMessage": null,
      "metadata": {},
      "approvals": [
        {
          "id": 101,
          "approverEmail": "manager@example.com",
          "isApproved": null,
          "comment": null,
          "respondedAt": null
        }
      ]
    }
  ],
  "total": 5
}
```

### GET /governance/actions/:id
Get details of a specific governance action.

**Response:**
```json
{
  "action": {
    "id": 42,
    "sheetId": "sheet_google_id",
    "sheetName": "Q4 Budget 2024",
    "actionType": "delete",
    "status": "approved",
    "reason": "Sheet contains outdated data",
    "requestedBy": "user@example.com",
    "createdAt": "2024-12-20T15:00:00Z",
    "executedAt": null,
    "errorMessage": null,
    "metadata": {}
  },
  "approvalStatus": {
    "actionStatus": "approved",
    "approvals": {
      "total": 2,
      "approved": 2,
      "rejected": 0,
      "pending": 0
    },
    "approvers": [
      {
        "email": "manager@example.com",
        "status": "approved",
        "comment": "Approved for deletion",
        "respondedAt": "2024-12-20T16:00:00Z"
      }
    ]
  }
}
```

### POST /governance/actions/:id/execute
Execute an approved governance action.

**Response:**
```json
{
  "success": true,
  "message": "Action executed successfully"
}
```

Or if failed:
```json
{
  "success": false,
  "error": "Permission denied",
  "message": "Action execution failed"
}
```

---

## 5. Approval Workflow Endpoints

### GET /approvals/pending
Get pending approvals for the current user.

**Response:**
```json
{
  "approvals": [
    {
      "approvalId": 101,
      "actionId": 42,
      "actionType": "delete",
      "reason": "Sheet contains outdated data",
      "requestedBy": "user@example.com",
      "createdAt": "2024-12-20T15:00:00Z"
    }
  ],
  "total": 3
}
```

### POST /approvals/:id/approve
Approve a governance action.

**Request:**
```json
{
  "comment": "Approved. This sheet is no longer needed."  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "approved": true,
  "actionStatus": "approved",
  "message": "Action fully approved and ready for execution"
}
```

### POST /approvals/:id/reject
Reject a governance action.

**Request:**
```json
{
  "comment": "This sheet is still being used by the finance team."  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "approved": false,
  "actionStatus": "rejected",
  "message": "Action rejected"
}
```

### GET /approvals/history
Get approval history for the current user.

**Response:**
```json
{
  "approvals": [
    {
      "id": 101,
      "actionId": 42,
      "approverEmail": "manager@example.com",
      "isApproved": true,
      "comment": "Approved",
      "respondedAt": "2024-12-20T16:00:00Z"
    }
  ],
  "total": 15
}
```

### POST /approvals/webhooks/approval
Webhook endpoint for external approval systems.

**Request:**
```json
{
  "approvalId": 101,
  "isApproved": true,
  "approverEmail": "manager@example.com",
  "comment": "Approved via external system"
}
```

**Response:**
```json
{
  "success": true,
  "actionStatus": "approved",
  "message": "Approval decision recorded"
}
```

---

## 6. Audit Log Endpoints

### GET /governance/audit-logs
Get audit logs for the user.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": 1234,
      "eventType": "sheet.deleted",
      "actorEmail": "user@example.com",
      "targetResource": "sheet:sheet_google_id",
      "timestamp": "2024-12-20T17:00:00Z",
      "metadata": {
        "actionId": 42,
        "sheetId": "sheet_google_id",
        "actionType": "delete"
      }
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

## 7. Monthly Reports Endpoints

### POST /reports/monthly/generate
Generate a monthly governance report.

**Request:**
```json
{
  "month": 12,  // 1-12
  "year": 2024
}
```

**Response:**
```json
{
  "success": true,
  "reportId": 101,
  "reportMonth": "2024-12-01T00:00:00Z",
  "message": "Report generated successfully",
  "data": {
    "totalSheets": 150,
    "totalWorkspaceUsers": 245,
    "averageRiskScore": 45,
    "orphanedSheets": 8,
    "inactiveSheets": 23,
    "highRiskSheets": 12,
    "sheetsWithAnyoneAccess": 5,
    "sheetsWithDomainAccess": 15,
    "sheetsWithExternalUsers": 20,
    "governanceActionsCreated": 10,
    "governanceActionsExecuted": 8,
    "governanceActionsFailed": 1,
    "topRiskySheets": [
      {
        "sheetId": "sheet_id",
        "name": "Sensitive Data Sheet",
        "owner": "owner@example.com",
        "riskScore": 85,
        "reasons": ["Public access (anyone with link)", "External editors or owners"]
      }
    ],
    "sheetsByRiskLevel": {
      "low": 100,
      "medium": 38,
      "high": 12
    },
    "sheetsOwnedByUser": 25,
    "totalUniqueOwners": 45
  }
}
```

### GET /reports/monthly
List all monthly reports.

**Query Parameters:**
- `limit` (default: 12)
- `offset` (default: 0)

**Response:**
```json
{
  "reports": [
    {
      "id": 101,
      "reportMonth": "2024-12-01T00:00:00Z",
      "generatedAt": "2024-12-20T10:00:00Z",
      "summary": {
        "totalSheets": 150,
        "averageRiskScore": 45,
        "highRiskSheets": 12,
        "governanceActionsExecuted": 8
      }
    }
  ],
  "total": 6,
  "limit": 12,
  "offset": 0
}
```

### GET /reports/monthly/latest
Get the latest monthly report with analysis.

**Response:**
```json
{
  "report": {
    "id": 101,
    "userId": 1,
    "reportMonth": "2024-12-01T00:00:00Z",
    "generatedAt": "2024-12-20T10:00:00Z",
    "data": { /* full report data */ }
  },
  "highlights": [
    "12 high-risk sheets identified",
    "8 orphaned sheets found",
    "8 governance actions executed"
  ],
  "recommendations": [
    "Review 5 sheets with public access",
    "Transfer ownership of 8 orphaned sheets",
    "Consider archiving 23 inactive sheets"
  ]
}
```

### GET /reports/monthly/:id
Get a specific monthly report.

**Response:**
Same as `/reports/monthly/latest` but for a specific report ID.

### GET /reports/monthly/compare
Compare two monthly reports.

**Query Parameters:**
- `month1` (format: YYYY-MM)
- `month2` (format: YYYY-MM)

**Response:**
```json
{
  "month1": "2024-11",
  "month2": "2024-12",
  "comparison": {
    "month1Data": { /* report data */ },
    "month2Data": { /* report data */ },
    "changes": {
      "totalSheetsDelta": 5,
      "riskScoreDelta": -3,
      "orphanedSheetsDelta": 2,
      "highRiskSheetsDelta": -1,
      "actionsDelta": 3
    }
  }
}
```

### GET /reports/summary
Get overall report summary statistics.

**Response:**
```json
{
  "totalReports": 6,
  "latestReportMonth": "2024-12-01T00:00:00Z",
  "averageSheetsPerMonth": 148,
  "averageRiskScore": 42
}
```

### DELETE /reports/monthly/:id
Delete a monthly report.

**Response:**
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

---

## 8. Health Check

### GET /health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-12-20T17:00:00Z",
  "service": "shenv-backend"
}
```

---

## Action Types and Metadata

### delete
No metadata required.

### change_visibility
**Metadata:**
```json
{
  "visibility": "private"  // or "restricted"
}
```

### remove_permission
**Metadata:**
```json
{
  "permissionId": "permission_google_id"
}
```

### transfer_ownership
**Metadata:**
```json
{
  "newOwnerEmail": "newowner@example.com"
}
```

---

## Risk Score Calculation

The system calculates risk scores (0-100) based on:

| Factor | Points |
|--------|--------|
| Anyone with link access | 40 |
| Domain-wide access | 25 |
| External users outside workspace | 20 |
| Orphaned sheets (owner not in workspace) | 20 |
| External editors/owners | 15 |
| High number of users (50+) | 10 |
| Inactive sheets (6+ months) | 10 |

Maximum risk score is capped at 100.

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": true,
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
