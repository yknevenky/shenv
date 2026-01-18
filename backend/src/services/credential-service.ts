/**
 * Credential Service
 *
 * Manages platform credentials for users, including validation and retrieval
 */

import { PlatformCredentialRepository } from '../db/repositories/platform-credential.js';
import { PlatformAdapterFactory, createValidatedAdapter } from './platform-adapters/platform-factory.js';
import { Platform, CredentialType } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class CredentialService {
  /**
   * Add or update platform credentials for a user
   */
  static async addCredentials(
    userId: number,
    platform: Platform,
    credentialsJson: string,
    credentialType: CredentialType
  ): Promise<{ success: boolean; credentialId?: number; error?: string }> {
    try {
      // Check if platform is supported
      if (!PlatformAdapterFactory.isPlatformSupported(platform)) {
        return {
          success: false,
          error: `Platform not supported: ${platform}`,
        };
      }

      // Parse and validate credentials
      let credentialsData;
      try {
        credentialsData = JSON.parse(credentialsJson);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid JSON format for credentials',
        };
      }

      // Validate credentials with platform adapter
      try {
        await createValidatedAdapter(platform, credentialsData);
      } catch (error) {
        logger.error('Credential validation failed', { platform, error });
        return {
          success: false,
          error: `Invalid credentials for ${platform}: ${error}`,
        };
      }

      // Check if user already has credentials for this platform
      const existing = await PlatformCredentialRepository.findByUserAndPlatform(userId, platform);

      if (existing) {
        // Deactivate old credential
        await PlatformCredentialRepository.deactivate(existing.id);
      }

      // Create new credential
      const credential = await PlatformCredentialRepository.create(
        userId,
        platform,
        credentialsJson,
        credentialType
      );

      logger.info('Platform credentials added successfully', {
        userId,
        platform,
        credentialType,
        credentialId: credential.id,
      });

      return {
        success: true,
        credentialId: credential.id,
      };
    } catch (error) {
      logger.error('Failed to add platform credentials', { userId, platform, error });
      return {
        success: false,
        error: `Failed to add credentials: ${error}`,
      };
    }
  }

  /**
   * Get all platforms a user has credentials for
   */
  static async getUserPlatforms(userId: number): Promise<{
    platforms: Array<{
      platform: Platform;
      credentialType: CredentialType;
      isActive: boolean;
      createdAt: Date;
      lastUsedAt?: Date;
    }>;
  }> {
    try {
      const credentials = await PlatformCredentialRepository.findAllByUser(userId);

      return {
        platforms: credentials.map(c => {
          const platformInfo: {
            platform: Platform;
            credentialType: CredentialType;
            isActive: boolean;
            createdAt: Date;
            lastUsedAt?: Date;
          } = {
            platform: c.platform as Platform,
            credentialType: c.credentialType as CredentialType,
            isActive: c.isActive,
            createdAt: c.createdAt,
          };

          // Add optional field only if it exists
          if (c.lastUsedAt !== null) {
            platformInfo.lastUsedAt = c.lastUsedAt;
          }

          return platformInfo;
        }),
      };
    } catch (error) {
      logger.error('Failed to get user platforms', { userId, error });
      return { platforms: [] };
    }
  }

  /**
   * Get decrypted credentials for a platform
   */
  static async getCredentials(
    userId: number,
    platform: Platform
  ): Promise<any | null> {
    try {
      const credentials = await PlatformCredentialRepository.getDecryptedCredentials(userId, platform);

      if (credentials) {
        // Update last used timestamp
        const credential = await PlatformCredentialRepository.findByUserAndPlatform(userId, platform);
        if (credential) {
          await PlatformCredentialRepository.updateLastUsed(credential.id);
        }
      }

      return credentials;
    } catch (error) {
      logger.error('Failed to get credentials', { userId, platform, error });
      return null;
    }
  }

  /**
   * Check if user has active credentials for a platform
   */
  static async hasCredentials(userId: number, platform: Platform): Promise<boolean> {
    try {
      return await PlatformCredentialRepository.hasCredentials(userId, platform);
    } catch (error) {
      logger.error('Failed to check credentials', { userId, platform, error });
      return false;
    }
  }

  /**
   * Remove credentials for a platform
   */
  static async removeCredentials(
    userId: number,
    platform: Platform
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credential = await PlatformCredentialRepository.findByUserAndPlatform(userId, platform);

      if (!credential) {
        return {
          success: false,
          error: 'Credentials not found',
        };
      }

      await PlatformCredentialRepository.delete(credential.id);

      logger.info('Platform credentials removed', { userId, platform });

      return { success: true };
    } catch (error) {
      logger.error('Failed to remove credentials', { userId, platform, error });
      return {
        success: false,
        error: `Failed to remove credentials: ${error}`,
      };
    }
  }

  /**
   * Get supported platforms
   */
  static getSupportedPlatforms(): Array<{
    platform: Platform;
    displayName: string;
    capabilities: {
      supportsWorkspaceUsers: boolean;
      supportsAssetDiscovery: boolean;
      supportsGovernance: boolean;
      credentialTypes: string[];
    };
  }> {
    const supported = PlatformAdapterFactory.getSupportedPlatforms();

    return supported.map(platform => ({
      platform,
      displayName: PlatformAdapterFactory.getPlatformDisplayName(platform),
      capabilities: PlatformAdapterFactory.getPlatformCapabilities(platform),
    }));
  }
}
