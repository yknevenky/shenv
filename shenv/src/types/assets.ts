/**
 * Unified Asset Types
 * Common data model for all workspace assets (Drive files, Emails, Senders, etc.)
 */

// Asset type enum
export type AssetType =
  | 'drive_file'      // Google Drive files (docs, sheets, slides, etc.)
  | 'email_sender'    // Email senders (aggregated)
  | 'email_message';  // Individual email messages

// Risk levels
export type RiskLevel = 'low' | 'medium' | 'high';

// Platform types
export type Platform = 'google_workspace';

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'partial';

// Auth types
export type AuthType = 'oauth' | 'service_account';

/**
 * Base asset interface - common properties across all asset types
 */
export interface BaseAsset {
  id: string;
  type: AssetType;
  platform: Platform;
  name: string;
  description?: string;
  owner: string;
  ownerEmail?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  createdAt: string;
  lastActivityAt: string;
  lastSyncedAt: string;
  url?: string;
  tags?: string[];
}

/**
 * Drive File Asset
 */
export interface DriveFileAsset extends BaseAsset {
  type: 'drive_file';
  metadata: {
    mimeType: string;
    fileType: 'spreadsheet' | 'document' | 'presentation' | 'form' | 'folder' | 'image' | 'pdf' | 'other';
    externalId: string;
    permissionCount: number;
    isOrphaned: boolean;
    isInactive: boolean;
    isPublic: boolean;
    isDomainShared: boolean;
    permissions?: DrivePermission[];
  };
}

export interface DrivePermission {
  id: string;
  email?: string;
  displayName?: string;
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  type: 'user' | 'group' | 'domain' | 'anyone';
}

/**
 * Email Sender Asset
 */
export interface EmailSenderAsset extends BaseAsset {
  type: 'email_sender';
  metadata: {
    senderEmail: string;
    senderName?: string;
    emailCount: number;
    attachmentCount: number;
    unreadCount?: number;
    firstEmailDate: string;
    lastEmailDate: string;
    hasUnsubscribe: boolean;
    unsubscribeLink?: string;
    isVerified: boolean;
    isUnsubscribed: boolean;
    unsubscribedAt?: string;
  };
}

/**
 * Email Message Asset
 */
export interface EmailMessageAsset extends BaseAsset {
  type: 'email_message';
  metadata: {
    messageId: string;
    threadId: string;
    senderId: number;
    senderEmail: string;
    senderName?: string;
    subject: string;
    snippet: string;
    isRead: boolean;
    hasAttachment: boolean;
    labelIds: string[];
    receivedAt: string;
  };
}

/**
 * Union type for all assets
 */
export type UnifiedAsset = DriveFileAsset | EmailSenderAsset | EmailMessageAsset;

/**
 * Asset type display info
 */
export const ASSET_TYPE_INFO: Record<AssetType, {
  label: string;
  pluralLabel: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  drive_file: {
    label: 'Drive File',
    pluralLabel: 'Drive Files',
    icon: 'file',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  email_sender: {
    label: 'Email Sender',
    pluralLabel: 'Email Senders',
    icon: 'mail',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  email_message: {
    label: 'Email',
    pluralLabel: 'Emails',
    icon: 'inbox',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

/**
 * Risk level display info
 */
export const RISK_LEVEL_INFO: Record<RiskLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  low: {
    label: 'Low Risk',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  medium: {
    label: 'Medium Risk',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
  },
  high: {
    label: 'High Risk',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
};

/**
 * Helper to calculate risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 61) return 'high';
  if (score >= 31) return 'medium';
  return 'low';
}

/**
 * Asset filter options
 */
export interface AssetFilters {
  types?: AssetType[];
  riskLevels?: RiskLevel[];
  search?: string;
  isOrphaned?: boolean;
  isInactive?: boolean;
  isPublic?: boolean;
  isVerified?: boolean;
  hasUnsubscribe?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Asset sort options
 */
export type AssetSortField =
  | 'name'
  | 'riskScore'
  | 'createdAt'
  | 'lastActivityAt'
  | 'owner';

export interface AssetSort {
  field: AssetSortField;
  order: 'asc' | 'desc';
}

/**
 * Paginated asset response
 */
export interface AssetListResponse {
  assets: UnifiedAsset[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Asset statistics
 */
export interface AssetStats {
  total: number;
  byType: Record<AssetType, number>;
  byRiskLevel: Record<RiskLevel, number>;
  highRiskCount: number;
  recentActivityCount: number; // Last 7 days
}

/**
 * Connection info for a platform
 */
export interface PlatformConnection {
  platform: Platform;
  isConnected: boolean;
  authType: AuthType | null;
  email: string | null;
  connectedAt?: string;
  lastSyncedAt?: string;
  capabilities: {
    canReadDrive: boolean;
    canWriteDrive: boolean;
    canReadGmail: boolean;
    canWriteGmail: boolean;
    canReadWorkspaceUsers: boolean;
  };
}

/**
 * Type guards
 */
export function isDriveFileAsset(asset: UnifiedAsset): asset is DriveFileAsset {
  return asset.type === 'drive_file';
}

export function isEmailSenderAsset(asset: UnifiedAsset): asset is EmailSenderAsset {
  return asset.type === 'email_sender';
}

export function isEmailMessageAsset(asset: UnifiedAsset): asset is EmailMessageAsset {
  return asset.type === 'email_message';
}
