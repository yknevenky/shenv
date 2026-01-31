/**
 * Drive Asset List Component
 * Displays list of Drive files with search, filter, sort, and pagination
 */

import { useState } from 'react';
import {
  Search, ArrowUp, ArrowDown, CheckSquare, Square,
  Eye, RefreshCw, FileText, FileSpreadsheet, Image,
  File, AlertTriangle, Users, Clock, ExternalLink
} from 'lucide-react';
import type { DriveAsset } from '../../services/drive';

interface DriveAssetListProps {
  assets: DriveAsset[];
  onViewAsset: (asset: DriveAsset) => void;
  onRefreshAsset: (asset: DriveAsset) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  totalCount: number;
  onDiscover?: () => void;
}

const SORT_OPTIONS = [
  { value: 'riskScore', label: 'Risk Score' },
  { value: 'permissionCount', label: 'Permissions' },
  { value: 'lastModifiedAt', label: 'Last Modified' },
  { value: 'createdAt', label: 'Created' },
  { value: 'name', label: 'Name' },
];

type QuickFilter = 'all' | 'high_risk' | 'medium_risk' | 'low_risk' | 'orphaned' | 'inactive' | 'public';

const FILTER_LABELS: Record<QuickFilter, string> = {
  all: 'All',
  high_risk: 'High Risk',
  medium_risk: 'Medium Risk',
  low_risk: 'Low Risk',
  orphaned: 'Orphaned',
  inactive: 'Inactive',
  public: 'Public Access',
};

function getAssetIcon(assetType: string) {
  switch (assetType.toLowerCase()) {
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    case 'document':
      return <FileText className="w-5 h-5 text-blue-600" />;
    case 'image':
      return <Image className="w-5 h-5 text-purple-600" />;
    default:
      return <File className="w-5 h-5 text-gray-500" />;
  }
}

function getRiskBadge(riskScore: number) {
  if (riskScore >= 61) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3 mr-1" />
        High ({riskScore})
      </span>
    );
  }
  if (riskScore >= 31) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
        Medium ({riskScore})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
      Low ({riskScore})
    </span>
  );
}

export default function DriveAssetList({
  assets,
  onViewAsset,
  onRefreshAsset,
  loading,
  hasMore,
  onLoadMore,
  search,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  activeFilter,
  onFilterChange,
  totalCount,
  onDiscover,
}: DriveAssetListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assets.length && assets.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map(a => a.id)));
    }
  };

  const handleQuickFilter = (filter: QuickFilter) => {
    onFilterChange(filter);
    if (filter === 'all') {
      onSearchChange('');
      onSortChange('riskScore', 'desc');
    } else if (filter === 'high_risk' || filter === 'medium_risk' || filter === 'low_risk') {
      onSearchChange('');
      onSortChange('riskScore', 'desc');
    } else {
      onSearchChange('');
      onSortChange('lastModifiedAt', 'desc');
    }
  };

  // Empty state - no assets at all
  if (assets.length === 0 && !loading && !search && activeFilter === 'all') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <File className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No files found</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Discover your Drive files to analyze permissions and identify security risks.
        </p>
        {onDiscover && (
          <button
            onClick={onDiscover}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Discover Files
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files by name or owner..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sort & Filters row */}
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortOrder)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? (
              <ArrowUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ArrowDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(Object.keys(FILTER_LABELS) as QuickFilter[]).map(f => (
            <button
              key={f}
              onClick={() => handleQuickFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeFilter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {assets.length} {activeFilter !== 'all' ? 'filtered' : ''} of {totalCount} files
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {selectedIds.size === assets.length && assets.length > 0 ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
            Select All
          </button>

          {selectedIds.size > 0 && (
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
              selectedIds.has(asset.id) ? 'bg-blue-50/50' : ''
            }`}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => toggleSelect(asset.id)}
                className="text-gray-400 hover:text-blue-600 flex-shrink-0"
              >
                {selectedIds.has(asset.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>

              <div className="flex-shrink-0">
                {getAssetIcon(asset.assetType)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900 truncate max-w-md">
                    {asset.name}
                  </h3>

                  {/* Risk badge */}
                  {getRiskBadge(asset.riskScore)}

                  {/* Permission count badge */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                    <Users className="w-3 h-3 mr-1" />
                    {asset.permissionCount} users
                  </span>

                  {/* Orphaned badge */}
                  {asset.isOrphaned && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 flex-shrink-0">
                      Orphaned
                    </span>
                  )}

                  {/* Inactive badge */}
                  {asset.isInactive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600 flex-shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 truncate">
                  Owner: {asset.ownerEmail}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Modified: {asset.lastModifiedAt ? new Date(asset.lastModifiedAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onViewAsset(asset)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>

              <button
                onClick={() => onRefreshAsset(asset)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Refresh Asset"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {asset.url && (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Open in Google Drive"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Empty states for filters */}
        {assets.length === 0 && !loading && activeFilter !== 'all' && (
          <div className="p-12 text-center text-gray-500">
            No files match the selected filter
          </div>
        )}

        {assets.length === 0 && !loading && search && activeFilter === 'all' && (
          <div className="p-12 text-center text-gray-500">
            No files match "{search}"
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading files...</p>
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="p-4 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Load more files
            </button>
          </div>
        )}
      </div>

      {/* Sticky action bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-white border-t-2 border-blue-200 p-4 flex items-center justify-between shadow-lg">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{selectedIds.size} files</span> selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Deselect All
            </button>
            {/* Future: Add bulk governance actions here */}
          </div>
        </div>
      )}
    </div>
  );
}
