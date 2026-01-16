/**
 * Type definitions for Shenv Frontend
 * These should match the backend types
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
 * Query parameters for sheets list
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
