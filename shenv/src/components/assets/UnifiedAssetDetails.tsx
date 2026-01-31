/**
 * Unified Asset Details Modal
 * Shows detailed information for any asset type (Drive files, Email senders)
 */

import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Mail,
  Shield,
  ShieldOff,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  Trash2,
  BellOff,
  Bell,
  Eye,
  Edit,
  MessageSquare,
  Paperclip,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { unifiedAssetApi } from '../../services/unified-assets';
import {
  type UnifiedAsset,
  type DriveFileAsset,
  type EmailSenderAsset,
  ASSET_TYPE_INFO,
  RISK_LEVEL_INFO,
  isDriveFileAsset,
  isEmailSenderAsset,
} from '../../types/assets';

interface UnifiedAssetDetailsProps {
  asset: UnifiedAsset;
  onClose: () => void;
  onRefresh?: () => void;
  onActionComplete?: () => void;
}

export default function UnifiedAssetDetails({
  asset: initialAsset,
  onClose,
  onRefresh,
  onActionComplete,
}: UnifiedAssetDetailsProps) {
  const [asset, setAsset] = useState<UnifiedAsset>(initialAsset);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load full asset details
  useEffect(() => {
    loadAssetDetails();
  }, [initialAsset.id]);

  const loadAssetDetails = async () => {
    try {
      setLoading(true);
      const details = await unifiedAssetApi.getAssetDetails(initialAsset.id);
      if (details) {
        setAsset(details);
      }
    } catch (err) {
      console.error('Failed to load asset details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle action
  const handleAction = async (action: 'delete' | 'unsubscribe' | 'refresh') => {
    const confirmMessages: Record<string, string> = {
      delete: 'Are you sure you want to delete this asset? This action cannot be undone.',
      unsubscribe: 'Are you sure you want to unsubscribe from this sender?',
      refresh: 'Refresh asset data from source?',
    };

    if (!confirm(confirmMessages[action])) {
      return;
    }

    try {
      setActionLoading(action);
      const result = await unifiedAssetApi.performAction(asset.id, action);

      if (result.success) {
        if (action === 'delete') {
          onClose();
        } else {
          loadAssetDetails();
        }
        onRefresh?.();
        onActionComplete?.();
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render Drive File specific details
  const renderDriveFileDetails = (driveAsset: DriveFileAsset) => (
    <>
      {/* File Info */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">File Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">File Type</p>
            <p className="text-sm font-medium text-gray-900 capitalize">
              {driveAsset.metadata.fileType}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">MIME Type</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {driveAsset.metadata.mimeType || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Permission Count</p>
            <p className="text-sm font-medium text-gray-900">
              {driveAsset.metadata.permissionCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">External ID</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {driveAsset.metadata.externalId || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Status</h4>
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            driveAsset.metadata.isPublic ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {driveAsset.metadata.isPublic ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {driveAsset.metadata.isPublic ? 'Publicly Accessible' : 'Not Public'}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            driveAsset.metadata.isDomainShared ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}>
            {driveAsset.metadata.isDomainShared ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {driveAsset.metadata.isDomainShared ? 'Domain Shared' : 'Not Domain Shared'}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            driveAsset.metadata.isOrphaned ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {driveAsset.metadata.isOrphaned ? 'Orphaned' : 'Has Owner'}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            driveAsset.metadata.isInactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
          }`}>
            {driveAsset.metadata.isInactive ? 'Inactive' : 'Active'}
          </div>
        </div>
      </div>

      {/* Permissions */}
      {driveAsset.metadata.permissions && driveAsset.metadata.permissions.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Permissions ({driveAsset.metadata.permissions.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {driveAsset.metadata.permissions.map((perm, idx) => (
              <div
                key={perm.id || idx}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  {perm.type === 'anyone' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : perm.type === 'domain' ? (
                    <Shield className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Users className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {perm.displayName || perm.email || perm.type}
                    </p>
                    {perm.email && (
                      <p className="text-xs text-gray-500">{perm.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    perm.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                    perm.role === 'writer' ? 'bg-blue-100 text-blue-700' :
                    perm.role === 'commenter' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {perm.role === 'owner' && <Edit className="w-3 h-3 inline mr-1" />}
                    {perm.role === 'writer' && <Edit className="w-3 h-3 inline mr-1" />}
                    {perm.role === 'commenter' && <MessageSquare className="w-3 h-3 inline mr-1" />}
                    {perm.role === 'reader' && <Eye className="w-3 h-3 inline mr-1" />}
                    {perm.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // Render Email Sender specific details
  const renderEmailSenderDetails = (senderAsset: EmailSenderAsset) => (
    <>
      {/* Sender Info */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Sender Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Email Address</p>
            <p className="text-sm font-medium text-gray-900">
              {senderAsset.metadata.senderEmail}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Display Name</p>
            <p className="text-sm font-medium text-gray-900">
              {senderAsset.metadata.senderName || 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email Count</p>
            <p className="text-sm font-medium text-gray-900">
              {senderAsset.metadata.emailCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Attachments</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {senderAsset.metadata.attachmentCount}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Activity Timeline
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">First Email</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(senderAsset.metadata.firstEmailDate)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Email</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(senderAsset.metadata.lastEmailDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Verification & Status */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Status</h4>
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            senderAsset.metadata.isVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {senderAsset.metadata.isVerified ? (
              <>
                <Shield className="w-4 h-4" />
                Verified (SPF/DKIM)
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4" />
                Unverified
              </>
            )}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            senderAsset.metadata.hasUnsubscribe ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {senderAsset.metadata.hasUnsubscribe ? (
              <>
                <Bell className="w-4 h-4" />
                Has Unsubscribe
              </>
            ) : (
              'No Unsubscribe Option'
            )}
          </div>
          {senderAsset.metadata.isUnsubscribed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700">
              <BellOff className="w-4 h-4" />
              Unsubscribed {senderAsset.metadata.unsubscribedAt && `on ${formatDate(senderAsset.metadata.unsubscribedAt)}`}
            </div>
          )}
        </div>
      </div>

      {/* Unsubscribe Link */}
      {senderAsset.metadata.unsubscribeLink && !senderAsset.metadata.isUnsubscribed && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Unsubscribe Option Available</h4>
          <p className="text-sm text-blue-700 mb-3">
            This sender provides an unsubscribe option. Click below to unsubscribe.
          </p>
          <a
            href={senderAsset.metadata.unsubscribeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <BellOff className="w-4 h-4" />
            Open Unsubscribe Link
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${ASSET_TYPE_INFO[asset.type].bgColor} ${ASSET_TYPE_INFO[asset.type].color}`}
            >
              {isDriveFileAsset(asset) ? (
                <FileText className="w-6 h-6" />
              ) : (
                <Mail className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{asset.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${ASSET_TYPE_INFO[asset.type].bgColor} ${ASSET_TYPE_INFO[asset.type].color}`}
                >
                  {ASSET_TYPE_INFO[asset.type].label}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${RISK_LEVEL_INFO[asset.riskLevel].bgColor} ${RISK_LEVEL_INFO[asset.riskLevel].color}`}
                >
                  Risk: {asset.riskScore}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Common Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">General Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Owner</p>
                    <p className="text-sm font-medium text-gray-900">{asset.owner}</p>
                  </div>
                  {asset.ownerEmail && asset.ownerEmail !== asset.owner && (
                    <div>
                      <p className="text-xs text-gray-500">Owner Email</p>
                      <p className="text-sm font-medium text-gray-900">{asset.ownerEmail}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(asset.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Activity</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(asset.lastActivityAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Synced</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(asset.lastSyncedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Type-specific details */}
              {isDriveFileAsset(asset) && renderDriveFileDetails(asset)}
              {isEmailSenderAsset(asset) && renderEmailSenderDetails(asset)}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {asset.url && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            )}
            <button
              onClick={() => handleAction('refresh')}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === 'refresh' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isEmailSenderAsset(asset) && asset.metadata.hasUnsubscribe && !asset.metadata.isUnsubscribed && (
              <button
                onClick={() => handleAction('unsubscribe')}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'unsubscribe' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                Unsubscribe
              </button>
            )}
            <button
              onClick={() => handleAction('delete')}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === 'delete' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
