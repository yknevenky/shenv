/**
 * Type definitions for Shenv Multi-Platform Governance Platform
 */

/**
 * Platform providers
 */
export type Platform =
  | 'google_workspace'
  | 'microsoft_365'
  | 'zoho'
  | 'dropbox'
  | 'box'
  | 'other';

/**
 * Asset types (platform-agnostic)
 */
export type AssetType =
  | 'spreadsheet'
  | 'document'
  | 'presentation'
  | 'form'
  | 'pdf'
  | 'folder'
  | 'database'
  | 'whiteboard'
  | 'other';

/**
 * Credential types
 */
export type CredentialType =
  | 'service_account'
  | 'oauth'
  | 'api_key'
  | 'other';

/**
 * Represents an asset (file/document) with basic metadata
 */
export interface Asset {
  /** Platform's file/asset ID */
  id: string;
  /** Which platform this asset belongs to */
  platform: Platform;
  /** Type of asset */
  assetType: AssetType;
  /** Platform-specific MIME type */
  mimeType?: string;
  /** Asset name/title */
  name: string;
  /** Direct URL to the asset */
  url: string;
  /** Email of the asset owner */
  owner: string;
  /** ISO timestamp when asset was created */
  createdTime: string;
  /** ISO timestamp when asset was last modified */
  modifiedTime: string;
  /** Total number of permissions on this asset */
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
 * Represents a single permission on an asset
 */
export interface Permission {
  /** Permission ID from the platform */
  id: string;
  /** Associated asset ID */
  assetId: string;
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
 * Detailed asset information including permissions
 */
export interface AssetDetails extends Asset {
  /** All permissions on this asset */
  permissions: Permission[];
}

/**
 * Paginated response for assets list
 */
export interface AssetsListResponse {
  /** Array of assets */
  assets: Asset[];
  /** Total number of assets available */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Response for single asset details
 */
export interface AssetDetailsResponse {
  /** Asset metadata */
  asset: Asset;
  /** All permissions on the asset */
  permissions: Permission[];
}

/**
 * Platform credential information
 */
export interface PlatformCredential {
  /** Internal credential ID */
  id: number;
  /** User ID */
  userId: number;
  /** Platform identifier */
  platform: Platform;
  /** Credential type */
  credentialType: CredentialType;
  /** Whether credential is active */
  isActive: boolean;
  /** When credential was created */
  createdAt: string;
  /** When credential was last used */
  lastUsedAt?: string;
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
 * Query parameters for assets list endpoint
 */
export interface AssetsQueryParams {
  /** Platform filter */
  platform?: Platform;
  /** Asset type filter */
  assetType?: AssetType;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Search query for asset name */
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
