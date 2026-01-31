# Drive Analytics Implementation - Phase 1

## Overview

This document describes the implementation of comprehensive Drive/Assets analytics endpoints for the Shenv platform. The system is designed to support both **Business users (via Service Account with DWD)** and **Individual users (via OAuth 2.0)** through a unified, platform-agnostic architecture.

---

## Implementation Status

### ✅ **Phase 1 Complete: Backend Analytics API**

Added 5 new analytics endpoints to provide comprehensive insights into user assets (Drive files, Sheets, Docs, etc.).

---

## New API Endpoints

### **1. GET /api/assets/analytics/types**
Get asset type distribution across the user's cloud storage.

**Query Parameters:**
- `platform` (optional) - Filter by specific platform (e.g., `google_workspace`)

**Response:**
```json
{
  "success": true,
  "data": {
    "types": [
      { "assetType": "spreadsheet", "count": 1523 },
      { "assetType": "document", "count": 892 },
      { "assetType": "presentation", "count": 345 },
      { "assetType": "pdf", "count": 234 },
      { "assetType": "folder", "count": 156 }
    ],
    "total": 3150
  }
}
```

**Use Cases:**
- Visualize file type distribution in pie/bar charts
- Identify which file types dominate storage
- Compare file types across platforms

---

### **2. GET /api/assets/analytics/platforms**
Get platform distribution showing assets across different cloud providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "platforms": [
      { "platform": "google_workspace", "count": 2850 },
      { "platform": "microsoft_365", "count": 300 }
    ],
    "total": 3150
  }
}
```

**Use Cases:**
- Multi-platform dashboard overview
- Platform comparison
- Migration planning

---

### **3. GET /api/assets/analytics/permissions**
Get permission-related statistics and analytics.

**Query Parameters:**
- `platform` (optional) - Filter by platform

**Response:**
```json
{
  "success": true,
  "data": {
    "avgPermissions": 8,
    "maxPermissions": 247,
    "assetsWithPublicAccess": 23,
    "assetsWithExternalAccess": 142
  }
}
```

**Metrics:**
- `avgPermissions` - Average number of permissions per asset
- `maxPermissions` - Maximum permissions on any single asset
- `assetsWithPublicAccess` - Count of publicly shared assets (anyone with link)
- `assetsWithExternalAccess` - Count with external domain access

**Use Cases:**
- Identify over-shared assets
- Security audit dashboard
- Permission governance

---

### **4. GET /api/assets/analytics/risk**
Get risk distribution across all assets.

**Query Parameters:**
- `platform` (optional) - Filter by platform

**Response:**
```json
{
  "success": true,
  "data": {
    "distribution": [
      { "riskLevel": "Low (0-30)", "count": 2100 },
      { "riskLevel": "Medium (31-60)", "count": 800 },
      { "riskLevel": "High (61-100)", "count": 250 }
    ],
    "total": 3150
  }
}
```

**Risk Scoring:**
- **Low (0-30)**: Minimal risk, proper permissions
- **Medium (31-60)**: Moderate sharing, some external access
- **High (61-100)**: Public/anyone links, orphaned, or excessive permissions

**Use Cases:**
- Security dashboard with risk breakdown
- Prioritize governance actions
- Track risk reduction over time

---

### **5. GET /api/assets/analytics/overview**
Get comprehensive analytics overview in a single API call (most efficient).

**Query Parameters:**
- `platform` (optional) - Filter by platform

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAssets": 3150,
      "orphanedCount": 45,
      "inactiveCount": 320,
      "highRiskCount": 250
    },
    "typeDistribution": [...],
    "platformDistribution": [...],
    "permissionStats": {...},
    "riskDistribution": [...]
  }
}
```

**Use Cases:**
- Dashboard initialization (single API call)
- Overview screens
- Executive summaries

---

## Database Schema Updates

### **Updated AssetRepository Methods**

All query methods now support optional `platform` parameter for filtering:

```typescript
// Before
findOrphanedAssets(userId: number): Promise<Asset[]>
findInactiveAssets(userId: number): Promise<Asset[]>
findHighRiskAssets(userId: number, minRiskScore: number): Promise<Asset[]>
countByUser(userId: number): Promise<number>

// After
findOrphanedAssets(userId: number, platform?: string): Promise<Asset[]>
findInactiveAssets(userId: number, platform?: string): Promise<Asset[]>
findHighRiskAssets(userId: number, minRiskScore: number, platform?: string): Promise<Asset[]>
countByUser(userId: number, platform?: string): Promise<number>
```

### **New Repository Methods**

```typescript
getTypeDistribution(userId: number, platform?: string): Promise<{assetType: string; count: number}[]>
getPlatformDistribution(userId: number): Promise<{platform: string; count: number}[]>
getPermissionStats(userId: number, platform?: string): Promise<PermissionStats>
getRiskDistribution(userId: number, platform?: string): Promise<{riskLevel: string; count: number}[]>
```

---

## Architecture: Business vs Individual Mode

### **Current Architecture (Platform-Agnostic)**

The system is already built with a dual-mode architecture:

#### **1. Credential Storage**
```typescript
// platform_credentials table
{
  platform: 'google_workspace' | 'microsoft_365' | 'zoho' | ...
  credentialType: 'service_account' | 'oauth' | 'api_key'
  credentials: text (AES-256 encrypted)
  isActive: boolean
}
```

#### **2. Asset Storage**
```typescript
// assets table
{
  platform: enum
  externalId: text (platform-specific ID)
  assetType: enum (spreadsheet, document, presentation, ...)
  mimeType: text (platform-specific)
  ownerEmail: text
  permissionCount: integer
  riskScore: integer
  isOrphaned: boolean
  isInactive: boolean
}
```

---

## Existing Discovery Flow

### **Business Users (Service Account + DWD)**

✅ **Already Implemented:**
```typescript
POST /api/assets/discover?platform=google_workspace
```

Uses `AssetDiscoveryService` which:
1. Loads service account credentials from `platform_credentials`
2. Uses Google Drive API with Domain-Wide Delegation
3. Discovers all files across organization
4. Stores in `assets` table with risk scoring

### **Individual Users (OAuth)**

⚠️ **Partially Implemented:**
- Database schema supports OAuth tokens (`credentialType: 'oauth'`)
- Service layer exists but not wired to OAuth flow
- **Missing:** OAuth callback endpoints, token refresh logic

---

## What's Next: Remaining Tasks

### **Backend Tasks:**

1. **✅ DONE:** Analytics endpoints (`GET /api/assets/analytics/*`)
2. **TODO:** Google OAuth flow for individuals
   - `GET /api/platforms/google/oauth/url` - Get authorization URL
   - `POST /api/platforms/google/oauth/callback` - Handle callback
   - Token refresh logic
3. **TODO:** Update `platforms.ts` routes to support both modes
4. **TODO:** Implement mode detection (check if DWD or OAuth)

### **Frontend Tasks:**

1. **TODO:** Create Drive Dashboard UI
   - Analytics overview cards
   - Charts for type/platform/risk distribution
   - Asset list with filters
2. **TODO:** Add mode selector (Business vs Individual)
3. **TODO:** OAuth connection flow
4. **TODO:** Service account upload flow (reuse Gmail pattern)

---

## Technical Details

### **Performance Optimizations**

1. **Parallel Queries:** `/analytics/overview` fetches all data concurrently using `Promise.all()`
2. **Database Aggregation:** Uses SQL `GROUP BY` and `COUNT()` for efficiency
3. **Optional Filtering:** All queries support platform filtering without code duplication

### **Security Considerations**

1. **JWT Authentication:** All endpoints require valid JWT token
2. **User Isolation:** All queries filtered by `userId` to prevent data leakage
3. **Encrypted Credentials:** Service accounts and OAuth tokens stored with AES-256

### **Future Enhancements**

1. **Permission Analytics:**
   - Currently returns `assetsWithPublicAccess: 0` (placeholder)
   - TODO: Join with `permissions` table for accurate counts
   - Track external domain access
2. **Real-time Updates:**
   - WebSocket notifications for asset changes
   - Background sync workers
3. **Multi-Platform Support:**
   - Microsoft 365 adapter
   - Dropbox adapter
   - Box adapter

---

## Example Usage

### **Dashboard Initialization (Recommended)**
```typescript
// Single API call for complete overview
const response = await fetch('/api/assets/analytics/overview?platform=google_workspace', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { summary, typeDistribution, permissionStats, riskDistribution } = response.data;

// Render dashboard with all data
```

### **Individual Charts**
```typescript
// If you only need specific analytics
const types = await fetch('/api/assets/analytics/types');
const risk = await fetch('/api/assets/analytics/risk?platform=google_workspace');
```

---

## Files Modified

### **Backend (2 files):**
1. **[backend/src/routes/assets.ts](backend/src/routes/assets.ts)** - Added 5 analytics endpoints
2. **[backend/src/db/repositories/asset.ts](backend/src/db/repositories/asset.ts)** - Added 4 analytics methods, updated 4 existing methods with platform filters

### **Database:**
No schema changes required - all analytics use existing tables

---

## Testing Checklist

- [ ] Test `/analytics/overview` with no platform filter
- [ ] Test `/analytics/overview` with `platform=google_workspace`
- [ ] Test each individual analytics endpoint
- [ ] Verify response formats match documentation
- [ ] Test with users who have no assets (empty state)
- [ ] Test with users who have assets across multiple platforms
- [ ] Verify JWT authentication works
- [ ] Test platform filtering accuracy

---

## Next Steps

### **Priority 1: Complete OAuth Flow for Individuals**
1. Add Google OAuth routes to `platforms.ts`
2. Implement token refresh middleware
3. Store OAuth tokens in `platform_credentials`
4. Update `AssetDiscoveryService` to use OAuth when `credentialType === 'oauth'`

### **Priority 2: Build Frontend Dashboard**
1. Create `DriveDashboard.tsx` component
2. Add chart visualizations (type, risk, platform)
3. Implement asset list with filters
4. Add platform selector dropdown

### **Priority 3: Add Mode Selector**
1. Create onboarding flow to choose Business vs Individual
2. Store user preference
3. Show appropriate connection UI based on mode

---

## References

- [Gmail OAuth Implementation](backend/src/routes/gmail.ts) - Reference for OAuth flow pattern
- [Asset Discovery Service](backend/src/services/asset-discovery-service.ts) - Platform-agnostic discovery
- [CLAUDE.md](CLAUDE.MD) - Complete project documentation
