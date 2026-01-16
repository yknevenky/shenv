/**
 * Google Service Account Authentication
 * Handles authentication with Google APIs using per-user service account credentials
 */

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { logger } from '../utils/logger.js';

// Required scopes for Google Sheets, Drive, and Admin APIs
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive', // For governance actions (delete, modify permissions)
];

const ADMIN_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
];

/**
 * Create a JWT client from service account credentials object for Drive/Sheets APIs
 */
export function createAuthClient(serviceAccountJson: any): JWT {
  try {
    const jwtClient = new JWT({
      email: serviceAccountJson.client_email,
      key: serviceAccountJson.private_key,
      scopes: DRIVE_SCOPES,
    });

    return jwtClient;
  } catch (error) {
    logger.error('Failed to create auth client from service account', error);
    throw new Error('Failed to create authentication client');
  }
}

/**
 * Create a JWT client with Domain-Wide Delegation for Admin SDK APIs
 * @param serviceAccountJson - Service account credentials
 * @param adminEmail - Admin email to impersonate (required for DWD)
 */
export function createAdminAuthClient(serviceAccountJson: any, adminEmail?: string): JWT {
  try {
    const config: any = {
      email: serviceAccountJson.client_email,
      key: serviceAccountJson.private_key,
      scopes: ADMIN_SCOPES,
    };

    // Only add subject if adminEmail is provided (for Domain-Wide Delegation)
    if (adminEmail) {
      config.subject = adminEmail;
    }

    const jwtClient = new JWT(config);

    return jwtClient;
  } catch (error) {
    logger.error('Failed to create admin auth client from service account', error);
    throw new Error('Failed to create admin authentication client');
  }
}

/**
 * Get an authenticated Google Drive client for a specific user
 */
export function getDriveClient(serviceAccountJson: any) {
  const auth = createAuthClient(serviceAccountJson);
  return google.drive({ version: 'v3', auth });
}

/**
 * Get an authenticated Google Sheets client for a specific user
 */
export function getSheetsClient(serviceAccountJson: any) {
  const auth = createAuthClient(serviceAccountJson);
  return google.sheets({ version: 'v4', auth });
}

/**
 * Get an authenticated Google Admin SDK client for workspace operations
 * @param serviceAccountJson - Service account credentials
 * @param adminEmail - Admin email to impersonate (optional, but required for DWD)
 */
export function getAdminClient(serviceAccountJson: any, adminEmail?: string) {
  const auth = createAdminAuthClient(serviceAccountJson, adminEmail);
  return google.admin({ version: 'directory_v1', auth });
}
