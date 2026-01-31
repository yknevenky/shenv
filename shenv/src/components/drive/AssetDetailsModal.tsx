/**
 * Asset Details Modal Component
 * Displays detailed asset information and permissions
 */

import { useState, useEffect } from 'react';
import {
  X, FileText, FileSpreadsheet, Image, File,
  Users, AlertTriangle, Clock, ExternalLink, RefreshCw,
  User, Globe, Building2, Link2
} from 'lucide-react';
import { driveAssetsApi, type DriveAsset, type DrivePermission } from '../../services/drive';

interface AssetDetailsModalProps {
  asset: DriveAsset;
  onClose: () => void;
  onRefresh?: (asset: DriveAsset) => void;
}

function getAssetIcon(assetType: string) {
  const iconClass = "w-8 h-8";
  switch (assetType.toLowerCase()) {
    case 'spreadsheet':
      return <FileSpreadsheet className={`${iconClass} text-green-600`} />;
    case 'document':
      return <FileText className={`${iconClass} text-blue-600`} />;
    case 'image':
      return <Image className={`${iconClass} text-purple-600`} />;
    default:
      return <File className={`${iconClass} text-gray-500`} />;
  }
}

function getRiskColor(riskScore: number): string {
  if (riskScore >= 61) return 'red';
  if (riskScore >= 31) return 'yellow';
  return 'green';
}

function getRiskLabel(riskScore: number): string {
  if (riskScore >= 61) return 'High Risk';
  if (riskScore >= 31) return 'Medium Risk';
  return 'Low Risk';
}

function getPermissionIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'user':
      return <User className="w-4 h-4 text-blue-500" />;
    case 'group':
      return <Users className="w-4 h-4 text-purple-500" />;
    case 'domain':
      return <Building2 className="w-4 h-4 text-orange-500" />;
    case 'anyone':
      return <Globe className="w-4 h-4 text-red-500" />;
    default:
      return <Link2 className="w-4 h-4 text-gray-500" />;
  }
}

function getRoleBadge(role: string) {
  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    writer: 'bg-blue-100 text-blue-700',
    commenter: 'bg-green-100 text-green-700',
    reader: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}

export default function AssetDetailsModal({ asset, onClose, onRefresh }: AssetDetailsModalProps) {
  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [asset.id]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await driveAssetsApi.getDetails(asset.id);
      setPermissions(data.permissions || []);
    } catch (err: any) {
      console.error('Failed to load permissions:', err);
      setError(err.response?.data?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await driveAssetsApi.refresh(asset.id);
      await loadPermissions();
      if (onRefresh) {
        onRefresh(asset);
      }
    } catch (err: any) {
      console.error('Failed to refresh asset:', err);
      setError(err.response?.data?.message || 'Failed to refresh asset');
    } finally {
      setRefreshing(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const riskColor = getRiskColor(asset.riskScore);
  const riskColorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-700 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    green: 'bg-green-100 text-green-700 border-green-200',
  };

  // Group permissions by type for analysis
  const permissionsByType = permissions.reduce((acc, p) => {
    const type = p.type.toLowerCase();
    if (!acc[type]) acc[type] = [];
    acc[type].push(p);
    return acc;
  }, {} as Record<string, DrivePermission[]>);

  const hasPublicAccess = permissionsByType['anyone']?.length > 0;
  const hasDomainAccess = permissionsByType['domain']?.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex items-start gap-4">
              {getAssetIcon(asset.assetType)}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 pr-8">
                  {asset.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {asset.assetType} by {asset.ownerEmail}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Risk Score Card */}
            <div className={`p-4 rounded-lg border ${riskColorClasses[riskColor]} mb-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">{getRiskLabel(asset.riskScore)}</span>
                </div>
                <span className="text-2xl font-bold">{asset.riskScore}</span>
              </div>
              <p className="text-sm mt-2 opacity-80">
                Risk score based on sharing settings, access patterns, and file status.
              </p>
            </div>

            {/* Warnings */}
            {(hasPublicAccess || hasDomainAccess || asset.isOrphaned || asset.isInactive) && (
              <div className="space-y-2 mb-6">
                {hasPublicAccess && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span>This file is accessible to anyone with the link</span>
                  </div>
                )}
                {hasDomainAccess && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span>This file is shared with your entire domain</span>
                  </div>
                )}
                {asset.isOrphaned && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span>Owner no longer exists in workspace (orphaned file)</span>
                  </div>
                )}
                {asset.isInactive && (
                  <div className="flex items-center gap-2 p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>No activity in the last 6 months</span>
                  </div>
                )}
              </div>
            )}

            {/* File Details */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">File Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900 capitalize">{asset.assetType}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Owner</dt>
                  <dd className="font-medium text-gray-900 truncate">{asset.ownerEmail}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Modified</dt>
                  <dd className="font-medium text-gray-900">
                    {asset.lastModifiedAt ? new Date(asset.lastModifiedAt).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Synced</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(asset.lastSyncedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Permissions</dt>
                  <dd className="font-medium text-gray-900">{asset.permissionCount}</dd>
                </div>
              </dl>
            </div>

            {/* Permissions List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Permissions ({permissions.length})
                </h3>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              ) : permissions.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 text-center">
                  No permissions found
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        {getPermissionIcon(permission.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {permission.displayName || permission.email || permission.type}
                          </p>
                          {permission.email && permission.displayName && (
                            <p className="text-xs text-gray-500">{permission.email}</p>
                          )}
                          {permission.type.toLowerCase() === 'anyone' && (
                            <p className="text-xs text-red-500">Anyone with link</p>
                          )}
                          {permission.type.toLowerCase() === 'domain' && (
                            <p className="text-xs text-orange-500">Domain-wide access</p>
                          )}
                        </div>
                      </div>
                      {getRoleBadge(permission.role)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              ID: {asset.externalId}
            </div>
            <div className="flex items-center gap-3">
              {asset.url && (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Drive
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
