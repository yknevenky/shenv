/**
 * Platform Adapter Factory
 *
 * Factory pattern for creating platform adapters based on platform type.
 * This allows the application to dynamically work with different cloud platforms
 * without knowing the specific implementation details.
 */

import { IPlatformAdapter, Platform } from './adapter.interface.js';
import { GoogleWorkspaceAdapter } from './google-workspace-adapter.js';
import { logger } from '../../utils/logger.js';

// ==================== PLATFORM FACTORY ====================

export class PlatformAdapterFactory {
  /**
   * Get the appropriate platform adapter for the given platform
   *
   * @param platform - The platform identifier
   * @returns Platform adapter instance
   * @throws Error if platform is not supported
   */
  static getAdapter(platform: Platform): IPlatformAdapter {
    switch (platform) {
      case 'google_workspace':
        return new GoogleWorkspaceAdapter();

      case 'microsoft_365':
        // TODO: Implement Microsoft365Adapter
        throw new Error('Microsoft 365 adapter not yet implemented');

      case 'zoho':
        // TODO: Implement ZohoAdapter
        throw new Error('Zoho adapter not yet implemented');

      case 'dropbox':
        // TODO: Implement DropboxAdapter
        throw new Error('Dropbox adapter not yet implemented');

      case 'box':
        // TODO: Implement BoxAdapter
        throw new Error('Box adapter not yet implemented');

      case 'other':
        throw new Error('Generic platform adapter not supported');

      default:
        logger.error('Unsupported platform requested', { platform });
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get all supported platforms
   *
   * @returns Array of platform identifiers that are currently implemented
   */
  static getSupportedPlatforms(): Platform[] {
    return ['google_workspace'];
    // Add more platforms as they are implemented:
    // return ['google_workspace', 'microsoft_365', 'zoho'];
  }

  /**
   * Check if a platform is supported
   *
   * @param platform - Platform to check
   * @returns true if platform is supported
   */
  static isPlatformSupported(platform: Platform): boolean {
    const supported = this.getSupportedPlatforms();
    return supported.includes(platform);
  }

  /**
   * Get platform display name
   *
   * @param platform - Platform identifier
   * @returns Human-readable platform name
   */
  static getPlatformDisplayName(platform: Platform): string {
    const displayNames: Record<Platform, string> = {
      google_workspace: 'Google Workspace',
      microsoft_365: 'Microsoft 365',
      zoho: 'Zoho',
      dropbox: 'Dropbox',
      box: 'Box',
      other: 'Other',
    };

    return displayNames[platform] || platform;
  }

  /**
   * Get platform capabilities
   *
   * @param platform - Platform identifier
   * @returns Object describing platform capabilities
   */
  static getPlatformCapabilities(platform: Platform): {
    supportsWorkspaceUsers: boolean;
    supportsAssetDiscovery: boolean;
    supportsGovernance: boolean;
    credentialTypes: string[];
  } {
    switch (platform) {
      case 'google_workspace':
        return {
          supportsWorkspaceUsers: true,
          supportsAssetDiscovery: true,
          supportsGovernance: true,
          credentialTypes: ['service_account'],
        };

      case 'microsoft_365':
        return {
          supportsWorkspaceUsers: true,
          supportsAssetDiscovery: true,
          supportsGovernance: true,
          credentialTypes: ['oauth', 'service_account'],
        };

      case 'zoho':
        return {
          supportsWorkspaceUsers: true,
          supportsAssetDiscovery: true,
          supportsGovernance: true,
          credentialTypes: ['oauth', 'api_key'],
        };

      case 'dropbox':
        return {
          supportsWorkspaceUsers: false,
          supportsAssetDiscovery: true,
          supportsGovernance: true,
          credentialTypes: ['oauth', 'api_key'],
        };

      case 'box':
        return {
          supportsWorkspaceUsers: true,
          supportsAssetDiscovery: true,
          supportsGovernance: true,
          credentialTypes: ['oauth', 'service_account'],
        };

      default:
        return {
          supportsWorkspaceUsers: false,
          supportsAssetDiscovery: false,
          supportsGovernance: false,
          credentialTypes: [],
        };
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create and validate a platform adapter
 *
 * @param platform - Platform to create adapter for
 * @param credentials - Platform credentials
 * @returns Validated adapter instance
 * @throws Error if platform not supported or credentials invalid
 */
export async function createValidatedAdapter(
  platform: Platform,
  credentials: any
): Promise<IPlatformAdapter> {
  // Check if platform is supported
  if (!PlatformAdapterFactory.isPlatformSupported(platform)) {
    throw new Error(`Platform not supported: ${platform}`);
  }

  // Get adapter instance
  const adapter = PlatformAdapterFactory.getAdapter(platform);

  // Validate credentials
  const isValid = await adapter.validateCredentials(credentials);
  if (!isValid) {
    throw new Error(`Invalid credentials for platform: ${platform}`);
  }

  logger.info('Platform adapter created and validated', { platform });
  return adapter;
}

/**
 * Get adapter for user's platform credential
 *
 * @param platformCredential - Database platform credential object
 * @returns Platform adapter instance
 */
export function getAdapterForCredential(
  platformCredential: { platform: Platform }
): IPlatformAdapter {
  return PlatformAdapterFactory.getAdapter(platformCredential.platform);
}
