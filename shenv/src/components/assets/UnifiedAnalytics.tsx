/**
 * Unified Analytics Dashboard
 * Shows combined analytics for all asset types (Drive, Gmail)
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  AlertTriangle,
  Shield,
  TrendingUp,
  Activity,
  RefreshCw,
  Loader2,
  PieChart,
  BarChart3,
  ArrowUp,
} from 'lucide-react';
import { unifiedAssetApi } from '../../services/unified-assets';
import {
  type AssetStats,
  type PlatformConnection,
  ASSET_TYPE_INFO,
  RISK_LEVEL_INFO,
} from '../../types/assets';

interface UnifiedAnalyticsProps {
  onDiscoverAssets?: () => void;
}

export default function UnifiedAnalytics({ onDiscoverAssets }: UnifiedAnalyticsProps) {
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, connectionData] = await Promise.all([
        unifiedAssetApi.getStats(),
        unifiedAssetApi.getConnectionStatus(),
      ]);
      setStats(statsData);
      setConnection(connectionData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate percentages for risk distribution
  const getRiskPercentage = (level: 'low' | 'medium' | 'high'): number => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.byRiskLevel[level] / stats.total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Asset Overview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Unified view of all your workspace assets
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Connection Status */}
      {connection && (
        <div className={`p-4 rounded-lg border ${
          connection.isConnected
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                connection.isConnected ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <Shield className={`w-5 h-5 ${
                  connection.isConnected ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-sm font-medium ${
                  connection.isConnected ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {connection.isConnected ? 'Connected' : 'Not Connected'}
                </h3>
                <p className={`text-xs ${
                  connection.isConnected ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {connection.isConnected
                    ? `${connection.authType === 'service_account' ? 'Service Account' : 'OAuth'} • ${connection.email || 'No email'}`
                    : 'Connect your Google account to discover assets'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connection.capabilities.canReadDrive && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  Drive
                </span>
              )}
              {connection.capabilities.canReadGmail && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  Gmail
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-gray-100 rounded-lg">
              <PieChart className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-sm text-gray-600">Total Assets</p>
          </div>
        </div>

        {/* Drive Files */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${ASSET_TYPE_INFO.drive_file.bgColor}`}>
              <FileText className={`w-5 h-5 ${ASSET_TYPE_INFO.drive_file.color}`} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{stats?.byType.drive_file || 0}</p>
            <p className="text-sm text-gray-600">Drive Files</p>
          </div>
        </div>

        {/* Email Senders */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${ASSET_TYPE_INFO.email_sender.bgColor}`}>
              <Mail className={`w-5 h-5 ${ASSET_TYPE_INFO.email_sender.color}`} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{stats?.byType.email_sender || 0}</p>
            <p className="text-sm text-gray-600">Email Senders</p>
          </div>
        </div>

        {/* High Risk */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${RISK_LEVEL_INFO.high.bgColor}`}>
              <AlertTriangle className={`w-5 h-5 ${RISK_LEVEL_INFO.high.color}`} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{stats?.highRiskCount || 0}</p>
            <p className="text-sm text-gray-600">High Risk Assets</p>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              Risk Distribution
            </h3>
          </div>

          <div className="space-y-4">
            {/* High Risk */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">High Risk</span>
                <span className="text-sm text-gray-500">
                  {stats?.byRiskLevel.high || 0} ({getRiskPercentage('high')}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${RISK_LEVEL_INFO.high.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`}
                  style={{ width: `${getRiskPercentage('high')}%`, backgroundColor: '#ef4444' }}
                />
              </div>
            </div>

            {/* Medium Risk */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Medium Risk</span>
                <span className="text-sm text-gray-500">
                  {stats?.byRiskLevel.medium || 0} ({getRiskPercentage('medium')}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${getRiskPercentage('medium')}%`, backgroundColor: '#f59e0b' }}
                />
              </div>
            </div>

            {/* Low Risk */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Low Risk</span>
                <span className="text-sm text-gray-500">
                  {stats?.byRiskLevel.low || 0} ({getRiskPercentage('low')}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${getRiskPercentage('low')}%`, backgroundColor: '#22c55e' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-gray-500" />
            Quick Actions
          </h3>

          <div className="space-y-3">
            <button
              onClick={onDiscoverAssets}
              className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900">Discover Assets</p>
                  <p className="text-xs text-blue-700">Scan for new Drive files and Gmail senders</p>
                </div>
              </div>
              <ArrowUp className="w-4 h-4 text-blue-600 rotate-45" />
            </button>

            <button
              className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-red-900">Review High Risk</p>
                  <p className="text-xs text-red-700">{stats?.highRiskCount || 0} assets need attention</p>
                </div>
              </div>
              <ArrowUp className="w-4 h-4 text-red-600 rotate-45" />
            </button>

            <button
              className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-green-900">View Recent Activity</p>
                  <p className="text-xs text-green-700">{stats?.recentActivityCount || 0} assets active this week</p>
                </div>
              </div>
              <ArrowUp className="w-4 h-4 text-green-600 rotate-45" />
            </button>
          </div>
        </div>
      </div>

      {/* Asset Type Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-6">Asset Types Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Drive Files */}
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${ASSET_TYPE_INFO.drive_file.bgColor}`}>
              <FileText className={`w-6 h-6 ${ASSET_TYPE_INFO.drive_file.color}`} />
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900">{stats?.byType.drive_file || 0}</p>
            <p className="text-sm text-gray-600">Drive Files</p>
            <p className="mt-2 text-xs text-gray-500">
              Documents, Spreadsheets, Presentations
            </p>
          </div>

          {/* Email Senders */}
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${ASSET_TYPE_INFO.email_sender.bgColor}`}>
              <Mail className={`w-6 h-6 ${ASSET_TYPE_INFO.email_sender.color}`} />
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900">{stats?.byType.email_sender || 0}</p>
            <p className="text-sm text-gray-600">Email Senders</p>
            <p className="mt-2 text-xs text-gray-500">
              Unique senders in your inbox
            </p>
          </div>

          {/* Email Messages (Future) */}
          <div className="text-center p-6 bg-green-50 rounded-lg opacity-50">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${ASSET_TYPE_INFO.email_message.bgColor}`}>
              <Mail className={`w-6 h-6 ${ASSET_TYPE_INFO.email_message.color}`} />
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900">{stats?.byType.email_message || 0}</p>
            <p className="text-sm text-gray-600">Email Messages</p>
            <p className="mt-2 text-xs text-gray-500">
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
