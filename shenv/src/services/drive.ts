/**
 * Google Drive API Client
 * Handles OAuth flow and Drive asset management
 */

import { apiClient } from './api';

export interface DriveOAuthStatus {
  isConnected: boolean;
  platform: string;
  authType: 'oauth' | 'service_account' | null;
  email: string | null;
}

export interface DriveAsset {
  id: number;
  platform: string;
  externalId: string;
  assetType: string;
  mimeType?: string;
  name: string;
  ownerEmail: string;
  url: string;
  createdAt: string;
  lastModifiedAt?: string;
  permissionCount: number;
  isOrphaned: boolean;
  isInactive: boolean;
  riskScore: number;
  lastSyncedAt: string;
}

export interface DrivePermission {
  id: number;
  assetId: number;
  externalPermissionId: string;
  email?: string;
  role: string;
  type: string;
  displayName?: string;
  snapshotDate: string;
}

export interface DriveAnalytics {
  types?: Array<{ assetType: string; count: number }>;
  platforms?: Array<{ platform: string; count: number }>;
  permissions?: {
    totalPermissions: number;
    avgPermissionsPerAsset: number;
    highPermissionAssets: number;
  };
  risk?: Array<{ riskLevel: string; count: number }>;
  overview?: {
    totalAssets: number;
    assetTypes: Array<{ assetType: string; count: number }>;
    riskDistribution: Array<{ riskLevel: string; count: number }>;
    permissionStats: {
      totalPermissions: number;
      avgPermissionsPerAsset: number;
      highPermissionAssets: number;
    };
    orphanedAssets: number;
    inactiveAssets: number;
    highRiskAssets: number;
  };
}

/**
 * Drive OAuth API
 */
export const driveOAuthApi = {
  /**
   * Get OAuth authorization URL
   */
  getAuthUrl: async (): Promise<{ authUrl: string; message: string }> => {
    const response = await apiClient.get('/api/platforms/google/oauth/url');
    return response.data.data;
  },

  /**
   * Handle OAuth callback (exchange code for tokens)
   */
  handleCallback: async (code: string): Promise<{
    connected: boolean;
    email: string;
    name: string;
    platform: string;
  }> => {
    const response = await apiClient.post('/api/platforms/google/oauth/callback', { code });
    return response.data.data;
  },

  /**
   * Disconnect OAuth
   */
  disconnect: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete('/api/platforms/google/oauth/disconnect');
    return response.data;
  },

  /**
   * Get OAuth connection status
   */
  getStatus: async (): Promise<DriveOAuthStatus> => {
    const response = await apiClient.get('/api/platforms/google/oauth/status');
    return response.data.data;
  },
};

/**
 * Drive Assets API
 */
export const driveAssetsApi = {
  /**
   * Discover Drive assets
   */
  discover: async (platform: string = 'google_workspace'): Promise<{
    discovered: number;
    stored: number;
  }> => {
    const response = await apiClient.post('/api/assets/discover', { platform });
    return response.data.data;
  },

  /**
   * List all assets with pagination
   */
  list: async (params: {
    limit?: number;
    offset?: number;
    platform?: string;
    assetType?: string;
    search?: string;
    orphaned?: boolean;
    inactive?: boolean;
    highRisk?: boolean;
  } = {}): Promise<{
    assets: DriveAsset[];
    total: number;
    limit: number;
    offset: number;
  }> => {
    const response = await apiClient.get('/api/assets', { params });
    return response.data.data;
  },

  /**
   * Get asset details with permissions
   */
  getDetails: async (assetId: number): Promise<{
    asset: DriveAsset;
    permissions: DrivePermission[];
  }> => {
    const response = await apiClient.get(`/api/assets/${assetId}`);
    return response.data.data;
  },

  /**
   * Refresh a single asset
   */
  refresh: async (assetId: number): Promise<{ success: boolean; error?: string }> => {
    const response = await apiClient.post(`/api/assets/${assetId}/refresh`);
    return response.data.data;
  },
};

/**
 * Drive Analytics API
 */
export const driveAnalyticsApi = {
  /**
   * Get asset type distribution
   */
  getTypes: async (platform?: string): Promise<Array<{ assetType: string; count: number }>> => {
    const params = platform ? { platform } : {};
    const response = await apiClient.get('/api/assets/analytics/types', { params });
    return response.data.data.types;
  },

  /**
   * Get platform distribution
   */
  getPlatforms: async (): Promise<Array<{ platform: string; count: number }>> => {
    const response = await apiClient.get('/api/assets/analytics/platforms');
    return response.data.data.platforms;
  },

  /**
   * Get permission statistics
   */
  getPermissions: async (platform?: string): Promise<{
    totalPermissions: number;
    avgPermissionsPerAsset: number;
    highPermissionAssets: number;
  }> => {
    const params = platform ? { platform } : {};
    const response = await apiClient.get('/api/assets/analytics/permissions', { params });
    return response.data.data;
  },

  /**
   * Get risk distribution
   */
  getRisk: async (platform?: string): Promise<Array<{ riskLevel: string; count: number }>> => {
    const params = platform ? { platform } : {};
    const response = await apiClient.get('/api/assets/analytics/risk', { params });
    return response.data.data.distribution;
  },

  /**
   * Get comprehensive overview
   */
  getOverview: async (platform?: string): Promise<{
    totalAssets: number;
    assetTypes: Array<{ assetType: string; count: number }>;
    riskDistribution: Array<{ riskLevel: string; count: number }>;
    permissionStats: {
      totalPermissions: number;
      avgPermissionsPerAsset: number;
      highPermissionAssets: number;
    };
    orphanedAssets: number;
    inactiveAssets: number;
    highRiskAssets: number;
  }> => {
    const params = platform ? { platform } : {};
    const response = await apiClient.get('/api/assets/analytics/overview', { params });
    return response.data.data;
  },
};
