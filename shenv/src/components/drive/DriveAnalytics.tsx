/**
 * Drive Analytics Component
 * Displays comprehensive Drive analytics and metrics
 */

import { useState, useEffect } from 'react';
import { driveAnalyticsApi, driveAssetsApi } from '../../services/drive';

export default function DriveAnalytics() {
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDiscovery, setLastDiscovery] = useState<Date | null>(null);

  useEffect(() => {
    loadAnalytics();
    // Check localStorage for last discovery time
    const lastSync = localStorage.getItem('drive_last_sync');
    if (lastSync) {
      setLastDiscovery(new Date(lastSync));
    }
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await driveAnalyticsApi.getOverview('google_workspace');
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    if (!confirm('This will scan your entire Google Drive. This may take a few minutes for large Drive accounts. Continue?')) {
      return;
    }

    try {
      setDiscovering(true);
      setError(null);
      const result = await driveAssetsApi.discover('google_workspace');

      // Update last discovery time
      const now = new Date();
      setLastDiscovery(now);
      localStorage.setItem('drive_last_sync', now.toISOString());

      // Reload analytics
      await loadAnalytics();

      alert(`Discovery complete! Found ${result.discovered} files, stored ${result.stored} in database.`);
    } catch (err: any) {
      console.error('Failed to discover Drive:', err);
      setError(err.response?.data?.message || 'Failed to discover Drive files');
    } finally {
      setDiscovering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No data state
  if (!overview || overview.totalAssets === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Files Found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start by discovering your Drive files to see analytics.
        </p>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {discovering ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Discovering...
            </>
          ) : (
            <>Discover Drive Files</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Discover Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Drive Analytics</h2>
          {lastDiscovery && (
            <p className="text-sm text-gray-500">
              Last synced: {lastDiscovery.toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {discovering ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Discovering...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Files"
          value={overview.totalAssets.toLocaleString()}
          icon={<FileIcon />}
          color="blue"
        />
        <StatCard
          title="High Risk Files"
          value={overview.highRiskAssets.toLocaleString()}
          icon={<AlertIcon />}
          color="red"
        />
        <StatCard
          title="Orphaned Files"
          value={overview.orphanedAssets.toLocaleString()}
          icon={<OrphanIcon />}
          color="yellow"
        />
        <StatCard
          title="Inactive Files"
          value={overview.inactiveAssets.toLocaleString()}
          icon={<InactiveIcon />}
          color="gray"
        />
      </div>

      {/* Asset Types */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">File Types</h3>
        <div className="space-y-3">
          {overview.assetTypes.map((type: any) => (
            <div key={type.assetType} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{type.assetType}</span>
              <span className="text-sm font-medium text-gray-900">{type.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Risk Distribution</h3>
        <div className="space-y-3">
          {overview.riskDistribution.map((risk: any) => {
            const color = risk.riskLevel === 'high' ? 'red' : risk.riskLevel === 'medium' ? 'yellow' : 'green';
            return (
              <div key={risk.riskLevel} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full bg-${color}-500 mr-2`}></div>
                  <span className="text-sm text-gray-600 capitalize">{risk.riskLevel} Risk</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{risk.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Permission Statistics</h3>
        <dl className="space-y-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-600">Total Permissions</dt>
            <dd className="text-sm font-medium text-gray-900">{overview.permissionStats.totalPermissions.toLocaleString()}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-600">Avg. Permissions/File</dt>
            <dd className="text-sm font-medium text-gray-900">{overview.permissionStats.avgPermissionsPerAsset.toFixed(1)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-gray-600">High Permission Files (50+)</dt>
            <dd className="text-sm font-medium text-gray-900">{overview.permissionStats.highPermissionAssets.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 rounded-md p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-semibold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function OrphanIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function InactiveIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
