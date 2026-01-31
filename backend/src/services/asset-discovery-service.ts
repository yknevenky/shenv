/**
 * Asset Discovery Service
 *
 * Platform-agnostic service for discovering assets and workspace users
 * Uses platform adapters to work with any cloud storage provider
 */

import { logger } from '../utils/logger.js';
import { AssetRepository } from '../db/repositories/asset.js';
import { PermissionRepository } from '../db/repositories/permission.js';
import { WorkspaceUserRepository } from '../db/repositories/workspace-user.js';
import { PlatformCredentialRepository } from '../db/repositories/platform-credential.js';
import { PlatformAdapterFactory } from './platform-adapters/platform-factory.js';
import { Platform } from '../types/index.js';
import { refreshTokenIfNeeded } from '../middleware/token-refresh.js';

export class AssetDiscoveryService {
  /**
   * Discover all assets for a user from a specific platform
   */
  static async discoverAssets(
    userId: number,
    platform: Platform
  ): Promise<{ discovered: number; stored: number }> {
    try {
      logger.info('Starting asset discovery', { userId, platform });

      // Refresh OAuth token if needed before making API calls
      await refreshTokenIfNeeded(userId, platform);

      // Get credentials for platform
      const credentials = await PlatformCredentialRepository.getDecryptedCredentials(userId, platform);
      if (!credentials) {
        throw new Error(`No credentials found for platform: ${platform}`);
      }

      // Get platform adapter
      const adapter = PlatformAdapterFactory.getAdapter(platform);

      // Discover assets
      const discoveredAssets = await adapter.discoverAssets(credentials, userId);
      logger.info(`Discovered ${discoveredAssets.length} assets from ${platform}`, { userId });

      // Get workspace users for risk calculation
      let workspaceUsers: any[] = [];
      try {
        workspaceUsers = await adapter.discoverWorkspaceUsers(credentials, userId);
      } catch (error) {
        logger.warn('Failed to discover workspace users, continuing without them', { error });
      }

      // Store assets in database with risk calculation
      let storedCount = 0;
      for (const asset of discoveredAssets) {
        // Calculate risk score
        const riskScore = adapter.calculateRiskScore(asset, workspaceUsers);

        // Check if orphaned
        const workspaceEmails = new Set(workspaceUsers.map(u => u.email.toLowerCase()));
        const isOrphaned = !workspaceEmails.has(asset.ownerEmail.toLowerCase());

        // Check if inactive (6+ months)
        let isInactive = false;
        if (asset.lastModifiedAt) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          isInactive = asset.lastModifiedAt < sixMonthsAgo;
        }

        // Upsert asset
        const storedAsset = await AssetRepository.upsert(userId, {
          platform,
          externalId: asset.externalId,
          assetType: asset.assetType,
          mimeType: asset.mimeType,
          name: asset.name,
          ownerEmail: asset.ownerEmail,
          url: asset.url,
          createdAt: asset.createdAt,
          lastModifiedAt: asset.lastModifiedAt,
          permissionCount: asset.permissions.length,
          isOrphaned,
          isInactive,
          riskScore,
        });

        // Store permissions
        for (const perm of asset.permissions) {
          await PermissionRepository.upsert({
            assetId: storedAsset.id,
            externalPermissionId: perm.externalPermissionId,
            email: perm.email || null,
            role: perm.role,
            type: perm.type,
            displayName: perm.displayName || null,
          });
        }

        storedCount++;
      }

      logger.info(`Stored ${storedCount} assets in database`, { userId, platform });

      return {
        discovered: discoveredAssets.length,
        stored: storedCount,
      };
    } catch (error) {
      logger.error('Asset discovery failed', { userId, platform, error });
      throw error;
    }
  }

  /**
   * Discover workspace users for a platform
   */
  static async discoverWorkspaceUsers(
    userId: number,
    platform: Platform
  ): Promise<{ discovered: number; stored: number }> {
    try {
      logger.info('Starting workspace user discovery', { userId, platform });

      // Refresh OAuth token if needed before making API calls
      await refreshTokenIfNeeded(userId, platform);

      // Get credentials
      const credentials = await PlatformCredentialRepository.getDecryptedCredentials(userId, platform);
      if (!credentials) {
        throw new Error(`No credentials found for platform: ${platform}`);
      }

      // Get platform adapter
      const adapter = PlatformAdapterFactory.getAdapter(platform);

      // Discover users
      const discoveredUsers = await adapter.discoverWorkspaceUsers(credentials, userId);
      logger.info(`Discovered ${discoveredUsers.length} workspace users from ${platform}`, { userId });

      // Store users in database
      let storedCount = 0;
      for (const user of discoveredUsers) {
        await WorkspaceUserRepository.upsert(userId, {
          platform,
          email: user.email,
          fullName: user.fullName || null,
          isAdmin: user.isAdmin,
          isSuspended: user.isSuspended,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        });
        storedCount++;
      }

      logger.info(`Stored ${storedCount} workspace users in database`, { userId, platform });

      return {
        discovered: discoveredUsers.length,
        stored: storedCount,
      };
    } catch (error) {
      logger.error('Workspace user discovery failed', { userId, platform, error });
      throw error;
    }
  }

  /**
   * Discover all assets across all platforms for a user
   */
  static async discoverAllPlatforms(userId: number): Promise<{
    platforms: Record<string, { discovered: number; stored: number }>;
    totalDiscovered: number;
    totalStored: number;
  }> {
    try {
      logger.info('Starting multi-platform asset discovery', { userId });

      const userPlatforms = await PlatformCredentialRepository.getUserPlatforms(userId);
      const results: Record<string, { discovered: number; stored: number }> = {};
      let totalDiscovered = 0;
      let totalStored = 0;

      for (const platform of userPlatforms) {
        try {
          const result = await this.discoverAssets(userId, platform as Platform);
          results[platform] = result;
          totalDiscovered += result.discovered;
          totalStored += result.stored;
        } catch (error) {
          logger.error(`Failed to discover assets for platform ${platform}`, { userId, error });
          results[platform] = { discovered: 0, stored: 0 };
        }
      }

      logger.info('Multi-platform discovery completed', {
        userId,
        platforms: userPlatforms.length,
        totalDiscovered,
        totalStored,
      });

      return {
        platforms: results,
        totalDiscovered,
        totalStored,
      };
    } catch (error) {
      logger.error('Multi-platform discovery failed', { userId, error });
      throw error;
    }
  }

  /**
   * Get asset details by ID
   */
  static async getAssetDetails(
    userId: number,
    assetId: number
  ): Promise<any | null> {
    try {
      const asset = await AssetRepository.findById(assetId);
      if (!asset || asset.userId !== userId) {
        return null;
      }

      const permissions = await PermissionRepository.findAllByAsset(assetId);

      return {
        ...asset,
        permissions,
      };
    } catch (error) {
      logger.error('Failed to get asset details', { userId, assetId, error });
      return null;
    }
  }

  /**
   * Refresh a single asset (re-fetch from platform)
   */
  static async refreshAsset(
    userId: number,
    assetId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const asset = await AssetRepository.findById(assetId);
      if (!asset || asset.userId !== userId) {
        return { success: false, error: 'Asset not found' };
      }

      // Refresh OAuth token if needed before making API calls
      await refreshTokenIfNeeded(userId, asset.platform as Platform);

      // Get credentials
      const credentials = await PlatformCredentialRepository.getDecryptedCredentials(
        userId,
        asset.platform as Platform
      );
      if (!credentials) {
        return { success: false, error: 'No credentials found' };
      }

      // Get adapter
      const adapter = PlatformAdapterFactory.getAdapter(asset.platform as Platform);

      // Fetch latest asset details
      const latestAsset = await adapter.getAssetDetails(credentials, asset.externalId);

      // Get workspace users for risk calculation
      let workspaceUsers: any[] = [];
      try {
        workspaceUsers = await adapter.discoverWorkspaceUsers(credentials, userId);
      } catch (error) {
        logger.warn('Failed to get workspace users', { error });
      }

      // Calculate new risk score
      const riskScore = adapter.calculateRiskScore(latestAsset, workspaceUsers);

      // Check if orphaned
      const workspaceEmails = new Set(workspaceUsers.map(u => u.email.toLowerCase()));
      const isOrphaned = !workspaceEmails.has(latestAsset.ownerEmail.toLowerCase());

      // Check if inactive
      let isInactive = false;
      if (latestAsset.lastModifiedAt) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        isInactive = latestAsset.lastModifiedAt < sixMonthsAgo;
      }

      // Update asset
      await AssetRepository.upsert(userId, {
        platform: asset.platform,
        externalId: asset.externalId,
        assetType: latestAsset.assetType,
        mimeType: latestAsset.mimeType,
        name: latestAsset.name,
        ownerEmail: latestAsset.ownerEmail,
        url: latestAsset.url,
        createdAt: latestAsset.createdAt,
        lastModifiedAt: latestAsset.lastModifiedAt,
        permissionCount: latestAsset.permissions.length,
        isOrphaned,
        isInactive,
        riskScore,
      });

      // Clear and re-add permissions
      await PermissionRepository.deleteAllByAsset(assetId);
      for (const perm of latestAsset.permissions) {
        await PermissionRepository.upsert({
          assetId,
          externalPermissionId: perm.externalPermissionId,
          email: perm.email || null,
          role: perm.role,
          type: perm.type,
          displayName: perm.displayName || null,
        });
      }

      logger.info('Asset refreshed successfully', { userId, assetId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to refresh asset', { userId, assetId, error });
      return { success: false, error: `Failed to refresh: ${error}` };
    }
  }
}
