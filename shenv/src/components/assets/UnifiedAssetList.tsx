/**
 * Unified Asset List Component
 * Displays all asset types (Drive files, Email senders) in a unified view
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  FileText,
  Mail,
  Shield,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  Eye,
  Trash2,
  Bell,
  BellOff,
  Loader2,
} from 'lucide-react';
import { unifiedAssetApi } from '../../services/unified-assets';
import {
  type UnifiedAsset,
  type AssetType,
  type RiskLevel,
  type AssetFilters,
  type AssetSort,
  type AssetSortField,
  ASSET_TYPE_INFO,
  RISK_LEVEL_INFO,
  isDriveFileAsset,
  isEmailSenderAsset,
} from '../../types/assets';

interface UnifiedAssetListProps {
  onViewAsset?: (asset: UnifiedAsset) => void;
  onActionComplete?: () => void;
}

const SORT_OPTIONS: { value: AssetSortField; label: string }[] = [
  { value: 'riskScore', label: 'Risk Score' },
  { value: 'lastActivityAt', label: 'Last Activity' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'name', label: 'Name' },
  { value: 'owner', label: 'Owner' },
];

const TYPE_FILTERS: { value: AssetType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Assets' },
  { value: 'drive_file', label: 'Drive Files' },
  { value: 'email_sender', label: 'Email Senders' },
];

const RISK_FILTERS: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Risks' },
  { value: 'high', label: 'High Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'low', label: 'Low Risk' },
];

export default function UnifiedAssetList({
  onViewAsset,
  onActionComplete,
}: UnifiedAssetListProps) {
  // State
  const [assets, setAssets] = useState<UnifiedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<AssetSortField>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Action state
  const [actionMenuAsset, setActionMenuAsset] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build filters object
  const buildFilters = useCallback((): AssetFilters => {
    const filters: AssetFilters = {};

    if (typeFilter !== 'all') {
      filters.types = [typeFilter];
    }

    if (riskFilter !== 'all') {
      filters.riskLevels = [riskFilter];
    }

    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }

    return filters;
  }, [typeFilter, riskFilter, debouncedSearch]);

  // Build sort object
  const buildSort = useCallback((): AssetSort => {
    return { field: sortField, order: sortOrder };
  }, [sortField, sortOrder]);

  // Load assets
  const loadAssets = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const newOffset = reset ? 0 : offset;
      const result = await unifiedAssetApi.getAssets(
        buildFilters(),
        buildSort(),
        50,
        newOffset
      );

      if (reset) {
        setAssets(result.assets);
      } else {
        setAssets(prev => [...prev, ...result.assets]);
      }

      setTotal(result.total);
      setHasMore(result.hasMore);
      setOffset(newOffset + result.assets.length);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, buildFilters, buildSort]);

  // Initial load and reload on filter/sort change
  useEffect(() => {
    loadAssets(true);
  }, [debouncedSearch, typeFilter, riskFilter, sortField, sortOrder]);

  // Handle sort toggle
  const handleSortChange = (field: AssetSortField) => {
    if (field === sortField) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle asset action
  const handleAction = async (
    asset: UnifiedAsset,
    action: 'delete' | 'unsubscribe' | 'refresh'
  ) => {
    if (!confirm(`Are you sure you want to ${action} this asset?`)) {
      return;
    }

    try {
      setActionLoading(asset.id);
      const result = await unifiedAssetApi.performAction(asset.id, action);

      if (result.success) {
        loadAssets(true);
        onActionComplete?.();
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert('Action failed');
    } finally {
      setActionLoading(null);
      setActionMenuAsset(null);
    }
  };

  // Get asset icon
  const getAssetIcon = (asset: UnifiedAsset) => {
    if (isDriveFileAsset(asset)) {
      return <FileText className="w-5 h-5" />;
    }
    if (isEmailSenderAsset(asset)) {
      return <Mail className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  // Get asset subtitle
  const getAssetSubtitle = (asset: UnifiedAsset): string => {
    if (isDriveFileAsset(asset)) {
      return `${asset.metadata.fileType} • ${asset.metadata.permissionCount} permissions`;
    }
    if (isEmailSenderAsset(asset)) {
      return `${asset.metadata.emailCount} emails • ${asset.metadata.attachmentCount} attachments`;
    }
    return '';
  };

  // Get asset badges
  const getAssetBadges = (asset: UnifiedAsset): React.ReactNode[] => {
    const badges: React.ReactNode[] = [];

    if (isDriveFileAsset(asset)) {
      if (asset.metadata.isPublic) {
        badges.push(
          <span key="public" className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
            Public
          </span>
        );
      }
      if (asset.metadata.isOrphaned) {
        badges.push(
          <span key="orphaned" className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
            Orphaned
          </span>
        );
      }
      if (asset.metadata.isInactive) {
        badges.push(
          <span key="inactive" className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
            Inactive
          </span>
        );
      }
    }

    if (isEmailSenderAsset(asset)) {
      if (!asset.metadata.isVerified) {
        badges.push(
          <span key="unverified" className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Unverified
          </span>
        );
      }
      if (asset.metadata.hasUnsubscribe && !asset.metadata.isUnsubscribed) {
        badges.push(
          <span key="unsubscribe" className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
            <Bell className="w-3 h-3" />
            Subscribable
          </span>
        );
      }
      if (asset.metadata.isUnsubscribed) {
        badges.push(
          <span key="unsubscribed" className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <BellOff className="w-3 h-3" />
            Unsubscribed
          </span>
        );
      }
    }

    return badges;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as AssetType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPE_FILTERS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value as RiskLevel | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RISK_FILTERS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <select
                value={sortField}
                onChange={e => handleSortChange(e.target.value as AssetSortField)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4 text-gray-600" />
                ) : (
                  <SortDesc className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>

            {/* More Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                showFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Refresh */}
            <button
              onClick={() => loadAssets(true)}
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Verification Status
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sharing Status
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All</option>
                  <option value="public">Public</option>
                  <option value="domain">Domain Shared</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Activity Status
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="orphaned">Orphaned</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Has Unsubscribe
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {assets.length} of {total} assets
        </div>
      </div>

      {/* Asset List */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || typeFilter !== 'all' || riskFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Connect your Google account to discover assets'}
            </p>
          </div>
        ) : (
          assets.map(asset => (
            <div
              key={asset.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div
                  className={`p-2 rounded-lg ${ASSET_TYPE_INFO[asset.type].bgColor} ${ASSET_TYPE_INFO[asset.type].color}`}
                >
                  {getAssetIcon(asset)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name & Type Badge */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {asset.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${ASSET_TYPE_INFO[asset.type].bgColor} ${ASSET_TYPE_INFO[asset.type].color}`}
                        >
                          {ASSET_TYPE_INFO[asset.type].label}
                        </span>
                      </div>

                      {/* Subtitle */}
                      <p className="mt-0.5 text-sm text-gray-500 truncate">
                        {getAssetSubtitle(asset)}
                      </p>

                      {/* Owner & Date */}
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span>Owner: {asset.owner}</span>
                        <span>•</span>
                        <span>Last activity: {formatDate(asset.lastActivityAt)}</span>
                      </div>

                      {/* Badges */}
                      {getAssetBadges(asset).length > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {getAssetBadges(asset)}
                        </div>
                      )}
                    </div>

                    {/* Risk Score & Actions */}
                    <div className="flex items-center gap-3">
                      {/* Risk Score */}
                      <div
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${RISK_LEVEL_INFO[asset.riskLevel].bgColor} ${RISK_LEVEL_INFO[asset.riskLevel].color}`}
                      >
                        <div className="flex items-center gap-1">
                          {asset.riskLevel === 'high' && (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          <span>{asset.riskScore}</span>
                        </div>
                      </div>

                      {/* External Link */}
                      {asset.url && (
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* View Button */}
                      <button
                        onClick={() => onViewAsset?.(asset)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Action Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuAsset(actionMenuAsset === asset.id ? null : asset.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          {actionLoading === asset.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </button>

                        {actionMenuAsset === asset.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => handleAction(asset, 'refresh')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Refresh
                            </button>
                            {isEmailSenderAsset(asset) && asset.metadata.hasUnsubscribe && (
                              <button
                                onClick={() => handleAction(asset, 'unsubscribe')}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <BellOff className="w-4 h-4" />
                                Unsubscribe
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(asset, 'delete')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => loadAssets(false)}
            disabled={loadingMore}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              `Load more (${total - assets.length} remaining)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
