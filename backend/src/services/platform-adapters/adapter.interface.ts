/**
 * Platform Adapter Interface
 *
 * This interface defines the contract that all platform adapters must implement.
 * Each cloud storage platform (Google Workspace, Microsoft 365, Zoho, etc.)
 * will have its own adapter implementation.
 */

// ==================== TYPES ====================

export type Platform =
  | 'google_workspace'
  | 'microsoft_365'
  | 'zoho'
  | 'dropbox'
  | 'box'
  | 'other';

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

export type PermissionRole = 'owner' | 'editor' | 'writer' | 'commenter' | 'reader' | 'viewer';
export type PermissionType = 'user' | 'group' | 'domain' | 'anyone';

// ==================== INTERFACES ====================

/**
 * Represents a discovered asset from any platform
 */
export interface DiscoveredAsset {
  externalId: string;           // Platform's file/asset ID
  assetType: AssetType;         // Type of asset
  mimeType?: string;            // Platform-specific MIME type
  name: string;                 // Asset name/title
  ownerEmail: string;           // Owner's email
  url: string;                  // Direct URL to asset
  createdAt?: Date;             // Creation timestamp
  lastModifiedAt?: Date;        // Last modification timestamp
  permissions: DiscoveredPermission[]; // All permissions on this asset
}

/**
 * Represents a permission on an asset
 */
export interface DiscoveredPermission {
  externalPermissionId: string; // Platform's permission ID
  email?: string;               // User/group email (if applicable)
  role: string;                 // Permission role (owner/editor/viewer/etc)
  type: string;                 // Type (user/group/domain/anyone)
  displayName?: string;         // Display name
}

/**
 * Represents a workspace user from any platform
 */
export interface DiscoveredWorkspaceUser {
  email: string;                // User's email
  fullName?: string;            // Full name
  isAdmin: boolean;             // Is admin/superadmin
  isSuspended: boolean;         // Is suspended/deleted
  createdAt?: Date;             // Account creation date
  lastLoginAt?: Date;           // Last login timestamp
}

/**
 * Credentials structure (platform-specific, stored encrypted)
 */
export interface PlatformCredentials {
  type: 'service_account' | 'oauth' | 'api_key' | 'other';
  data: any; // Platform-specific credential data
}

// ==================== ADAPTER INTERFACE ====================

/**
 * Abstract interface for platform adapters
 *
 * Each platform (Google Workspace, Microsoft 365, etc.) must implement this interface
 * to provide unified governance capabilities across all platforms.
 */
export interface IPlatformAdapter {
  /**
   * Get the platform identifier
   */
  getPlatform(): Platform;

  /**
   * Validate credentials for this platform
   * @param credentials - Encrypted credentials object
   * @returns true if credentials are valid
   */
  validateCredentials(credentials: any): Promise<boolean>;

  // ==================== DISCOVERY ====================

  /**
   * Discover all assets (files) in the user's workspace
   * @param credentials - Decrypted platform credentials
   * @param userId - Internal user ID
   * @returns Array of discovered assets with permissions
   */
  discoverAssets(credentials: any, userId: number): Promise<DiscoveredAsset[]>;

  /**
   * Discover all users in the workspace/organization
   * @param credentials - Decrypted platform credentials (must have admin permissions)
   * @param userId - Internal user ID
   * @returns Array of workspace users
   */
  discoverWorkspaceUsers(credentials: any, userId: number): Promise<DiscoveredWorkspaceUser[]>;

  // ==================== PERMISSIONS ====================

  /**
   * Get all permissions for a specific asset
   * @param credentials - Decrypted platform credentials
   * @param externalAssetId - Platform's asset ID
   * @returns Array of permissions
   */
  getAssetPermissions(credentials: any, externalAssetId: string): Promise<DiscoveredPermission[]>;

  /**
   * Get detailed information about a specific asset
   * @param credentials - Decrypted platform credentials
   * @param externalAssetId - Platform's asset ID
   * @returns Asset with full details
   */
  getAssetDetails(credentials: any, externalAssetId: string): Promise<DiscoveredAsset>;

  // ==================== GOVERNANCE ACTIONS ====================

  /**
   * Delete an asset permanently
   * @param credentials - Decrypted platform credentials
   * @param externalAssetId - Platform's asset ID
   * @returns Success status
   */
  deleteAsset(credentials: any, externalAssetId: string): Promise<void>;

  /**
   * Change asset visibility (remove public/domain-wide sharing)
   * @param credentials - Decrypted platform credentials
   * @param externalAssetId - Platform's asset ID
   * @param visibility - Target visibility ('private' | 'restricted')
   * @returns Success status
   */
  changeVisibility(credentials: any, externalAssetId: string, visibility: string): Promise<void>;

  /**
   * Remove a specific permission from an asset
   * @param credentials - Decrypted platform credentials
   * @param externalAssetId - Platform's asset ID
   * @param externalPermissionId - Platform's permission ID to remove
   * @returns Success status
   */
  removePermission(credentials: any, externalAssetId: string, externalPermissionId: string): Promise<void>;

  /**
   * Transfer ownership of an asset to another user
   * @param credentials - Decrypted platform credentials
   * @param externalAssetId - Platform's asset ID
   * @param newOwnerEmail - Email of new owner
   * @returns Success status
   */
  transferOwnership(credentials: any, externalAssetId: string, newOwnerEmail: string): Promise<void>;

  // ==================== UTILITY ====================

  /**
   * Map platform-specific MIME type to generic asset type
   * @param mimeType - Platform's MIME type
   * @returns Generic asset type
   */
  mapMimeTypeToAssetType(mimeType: string): AssetType;

  /**
   * Calculate risk score for an asset based on its permissions
   * @param asset - The asset with permissions
   * @param workspaceUsers - List of workspace users (to detect external users)
   * @returns Risk score (0-100)
   */
  calculateRiskScore(asset: DiscoveredAsset, workspaceUsers: DiscoveredWorkspaceUser[]): number;
}

// ==================== HELPER TYPES ====================

/**
 * Result of a governance action execution
 */
export interface GovernanceActionResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Asset with risk analysis
 */
export interface AssetWithRisk extends DiscoveredAsset {
  riskScore: number;
  riskFactors: string[];
  isOrphaned: boolean;
  isInactive: boolean;
}
