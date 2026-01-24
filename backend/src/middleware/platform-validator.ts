/**
 * Platform Validation Middleware
 *
 * Centralized platform validation and routing logic.
 * Currently only Google Workspace is supported.
 */

import { Platform } from '../types/index.js';

export interface PlatformValidationResult {
  isValid: boolean;
  isSupported: boolean;
  platform?: Platform;
  error?: string;
  message?: string;
  supportedPlatforms?: Platform[];
}

/**
 * List of all valid platform identifiers
 */
const VALID_PLATFORMS: Platform[] = [
  'google_workspace',
  'microsoft_365',
  'zoho',
  'dropbox',
  'box',
  'other'
];

/**
 * List of currently supported platforms (in production)
 */
const SUPPORTED_PLATFORMS: Platform[] = [
  'google_workspace'
];

/**
 * Platforms under development
 */
const UNDER_DEVELOPMENT_PLATFORMS: Platform[] = [
  'microsoft_365',
  'zoho',
  'dropbox',
  'box',
  'other'
];

/**
 * Validate if a platform string is valid and supported
 */
export function validatePlatform(platform: string): PlatformValidationResult {
  // Check if platform is provided
  if (!platform) {
    return {
      isValid: false,
      isSupported: false,
      error: 'Platform is required',
      message: 'Please specify a platform',
      supportedPlatforms: SUPPORTED_PLATFORMS,
    };
  }

  // Check if platform is in valid platforms list
  if (!VALID_PLATFORMS.includes(platform as Platform)) {
    return {
      isValid: false,
      isSupported: false,
      error: 'Invalid platform',
      message: `Invalid platform: ${platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      supportedPlatforms: SUPPORTED_PLATFORMS,
    };
  }

  // Check if platform is currently supported
  if (!SUPPORTED_PLATFORMS.includes(platform as Platform)) {
    return {
      isValid: true,
      isSupported: false,
      platform: platform as Platform,
      error: 'Platform under development',
      message: `${platform} is currently under development. Only Google Workspace is fully supported at this time.`,
      supportedPlatforms: SUPPORTED_PLATFORMS,
    };
  }

  // Platform is valid and supported
  return {
    isValid: true,
    isSupported: true,
    platform: platform as Platform,
  };
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): Platform[] {
  return [...SUPPORTED_PLATFORMS];
}

/**
 * Get list of platforms under development
 */
export function getUnderDevelopmentPlatforms(): Platform[] {
  return [...UNDER_DEVELOPMENT_PLATFORMS];
}

/**
 * Get all valid platforms with their status
 */
export function getAllPlatformsWithStatus(): Array<{
  platform: Platform;
  isSupported: boolean;
  status: 'supported' | 'under_development';
}> {
  return VALID_PLATFORMS.map(platform => ({
    platform,
    isSupported: SUPPORTED_PLATFORMS.includes(platform),
    status: SUPPORTED_PLATFORMS.includes(platform) ? 'supported' : 'under_development',
  }));
}

/**
 * Check if a platform is supported
 */
export function isPlatformSupported(platform: Platform): boolean {
  return SUPPORTED_PLATFORMS.includes(platform);
}

/**
 * Check if a platform is under development
 */
export function isPlatformUnderDevelopment(platform: Platform): boolean {
  return UNDER_DEVELOPMENT_PLATFORMS.includes(platform);
}
