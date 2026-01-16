/**
 * Type definitions for Shenv Google Sheets Governance Platform
 */

/**
 * Represents a Google Sheet with basic metadata
 */
export interface Sheet {
  /** Google Drive file ID */
  id: string;
  /** Sheet name/title */
  name: string;
  /** Direct URL to the sheet */
  url: string;
  /** Email of the sheet owner */
  owner: string;
  /** ISO timestamp when sheet was created */
  createdTime: string;
  /** ISO timestamp when sheet was last modified */
  modifiedTime: string;
  /** Total number of permissions on this sheet */
  permissionCount: number;
}

/**
 * Permission types as defined by Google Drive API
 */
export type PermissionRole = 'owner' | 'writer' | 'commenter' | 'reader';

/**
 * Permission target types
 */
export type PermissionType = 'user' | 'group' | 'domain' | 'anyone';

/**
 * Represents a single permission on a Google Sheet
 */
export interface Permission {
  /** Permission ID from Google Drive */
  id: string;
  /** Associated sheet ID */
  sheetId: string;
  /** Email of the user/group (if applicable) */
  email: string | null;
  /** Permission role/level */
  role: PermissionRole;
  /** Type of permission target */
  type: PermissionType;
  /** Display name of the user/group */
  displayName?: string;
  /** ISO timestamp when permission was granted */
  grantedTime: string;
}

/**
 * Detailed sheet information including permissions
 */
export interface SheetDetails extends Sheet {
  /** All permissions on this sheet */
  permissions: Permission[];
}

/**
 * Paginated response for sheets list
 */
export interface SheetsListResponse {
  /** Array of sheets */
  sheets: Sheet[];
  /** Total number of sheets available */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Response for single sheet details
 */
export interface SheetDetailsResponse {
  /** Sheet metadata */
  sheet: Sheet;
  /** All permissions on the sheet */
  permissions: Permission[];
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error flag */
  error: true;
  /** Error message */
  message: string;
  /** Optional error code */
  code?: string;
  /** Optional additional details */
  details?: unknown;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = unknown> {
  /** Success flag */
  success: true;
  /** Response data */
  data: T;
}

/**
 * Health check response
 */
export interface HealthResponse {
  /** Health status */
  ok: boolean;
  /** Timestamp of the check */
  timestamp: string;
  /** Service name */
  service: string;
}

/**
 * Query parameters for sheets list endpoint
 */
export interface SheetsQueryParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Search query for sheet name */
  search?: string;
  /** Sort field */
  sortBy?: 'name' | 'owner' | 'modifiedTime' | 'createdTime';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Google API file resource (simplified)
 */
export interface GoogleDriveFile {
  id: string | null;
  name: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  owners?: Array<{ emailAddress?: string | null; displayName?: string | null }>;
  createdTime?: string | null;
  modifiedTime?: string | null;
  permissions?: GoogleDrivePermission[];
}

/**
 * Google API permission resource (simplified)
 */
export interface GoogleDrivePermission {
  id: string | null;
  type?: string | null;
  role?: string | null;
  emailAddress?: string | null;
  displayName?: string | null;
  domain?: string | null;
}
