/**
 * Google Sheets Service
 * Handles all operations related to fetching and processing Google Sheets data
 */

import { getDriveClient } from './google-auth.js';
import { logger } from '../utils/logger.js';
import type {
  Sheet,
  Permission,
  SheetDetails,
  SheetsListResponse,
  SheetsQueryParams,
  PermissionRole,
  PermissionType,
} from '../types/index.js';

/**
 * Fetch all Google Sheets from the organization
 */
export async function listSheets(
  serviceAccountJson: any,
  params: SheetsQueryParams = {}
): Promise<SheetsListResponse> {
  const {
    page = 1,
    limit = 20,
    search = '',
    sortBy = 'modifiedTime',
    sortOrder = 'desc',
  } = params;

  try {
    const drive = getDriveClient(serviceAccountJson);

    logger.info('Fetching sheets from Google Drive', { page, limit, search });

    // Build query for Google Sheets only
    let query = "mimeType='application/vnd.google-apps.spreadsheet'";

    if (search) {
      query += ` and name contains '${search.replace(/'/g, "\\'")}'`;
    }

    // Fetch files with permissions
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink, owners, createdTime, modifiedTime, permissions)',
      pageSize: 1000, // Get all sheets, we'll paginate in-memory
      orderBy: `${sortBy} ${sortOrder}`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];

    logger.info(`Found ${files.length} sheets`);

    // Convert to our Sheet type
    const allSheets: Sheet[] = files.map((file: any) => ({
      id: file.id || '',
      name: file.name || 'Untitled',
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
      owner: file.owners?.[0]?.emailAddress || 'Unknown',
      createdTime: file.createdTime || new Date().toISOString(),
      modifiedTime: file.modifiedTime || new Date().toISOString(),
      permissionCount: file.permissions?.length || 0,
    }));

    // Implement in-memory pagination
    const total = allSheets.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSheets = allSheets.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    return {
      sheets: paginatedSheets,
      total,
      page,
      limit,
      hasMore,
    };
  } catch (error) {
    logger.error('Failed to fetch sheets', error);
    throw new Error('Failed to fetch sheets from Google Drive');
  }
}

/**
 * Fetch detailed information about a specific sheet including all permissions
 */
export async function getSheetDetails(serviceAccountJson: any, sheetId: string): Promise<SheetDetails> {
  try {
    const drive = getDriveClient(serviceAccountJson);

    logger.info('Fetching sheet details', { sheetId });

    // Fetch file metadata with permissions
    const response = await drive.files.get({
      fileId: sheetId,
      fields: 'id, name, webViewLink, owners, createdTime, modifiedTime, permissions',
      supportsAllDrives: true,
    });

    const file = response.data as any;

    if (!file) {
      throw new Error('Sheet not found');
    }

    const fileId = file.id || '';

    // Convert to Sheet type
    const sheet: Sheet = {
      id: fileId,
      name: file.name || 'Untitled',
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}`,
      owner: file.owners?.[0]?.emailAddress || 'Unknown',
      createdTime: file.createdTime || new Date().toISOString(),
      modifiedTime: file.modifiedTime || new Date().toISOString(),
      permissionCount: file.permissions?.length || 0,
    };

    // Convert permissions to our Permission type
    const permissions: Permission[] = (file.permissions || []).map(
      (perm: any) => ({
        id: perm.id || '',
        sheetId: fileId,
        email: perm.emailAddress || null,
        role: (perm.role || 'reader') as PermissionRole,
        type: (perm.type || 'user') as PermissionType,
        displayName: perm.displayName || '',
        grantedTime: new Date().toISOString(), // Google API doesn't provide this easily
      })
    );

    logger.info(`Found ${permissions.length} permissions for sheet ${sheetId}`);

    return {
      ...sheet,
      permissions,
    };
  } catch (error) {
    logger.error('Failed to fetch sheet details', { sheetId, error });
    throw new Error('Failed to fetch sheet details');
  }
}

/**
 * Get permissions for a specific sheet
 */
export async function getSheetPermissions(serviceAccountJson: any, sheetId: string): Promise<Permission[]> {
  try {
    const drive = getDriveClient(serviceAccountJson);

    logger.info('Fetching permissions for sheet', { sheetId });

    const response = await drive.permissions.list({
      fileId: sheetId,
      fields: 'permissions(id, emailAddress, role, type, displayName)',
      supportsAllDrives: true,
    });

    const permissions: Permission[] = (response.data.permissions || []).map(
      (perm: any) => ({
        id: perm.id || '',
        sheetId,
        email: perm.emailAddress || null,
        role: (perm.role || 'reader') as PermissionRole,
        type: (perm.type || 'user') as PermissionType,
        displayName: perm.displayName || '',
        grantedTime: new Date().toISOString(),
      })
    );

    logger.info(`Found ${permissions.length} permissions`);
    return permissions;
  } catch (error) {
    logger.error('Failed to fetch permissions', { sheetId, error });
    throw new Error('Failed to fetch permissions');
  }
}
