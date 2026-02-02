/**
 * Organization Overview Component
 * Shows organization-wide statistics
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { Building2, Users, FolderOpen, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface OrganizationOverview {
  totalUsers: number;
  totalAssets: number;
  lastScanDate: string | null;
  riskBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  riskPercentages: {
    high: number;
    medium: number;
    low: number;
  };
}

export default function OrganizationOverview() {
  const [overview, setOverview] = useState<OrganizationOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await apiClient.get('/api/organization/overview');
        setOverview(response.data.overview);
      } catch (err) {
        console.error('Failed to load organization overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">Failed to load organization overview</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Building2 className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Organization Overview</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview.totalUsers}</p>
          <p className="text-sm text-gray-600">Workspace Users</p>
        </div>

        {/* Total Assets */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <FolderOpen className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview.totalAssets.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Assets</p>
        </div>

        {/* Last Scan */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDate(overview.lastScanDate)}</p>
          <p className="text-sm text-gray-600">Last Scan</p>
        </div>

        {/* High Risk Count */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview.riskBreakdown.high}</p>
          <p className="text-sm text-gray-600">High-Risk Assets</p>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>

        {/* Risk Bars */}
        <div className="space-y-3">
          {/* High Risk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">High Risk</span>
              <span className="text-sm text-gray-600">
                {overview.riskBreakdown.high} ({overview.riskPercentages.high}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${overview.riskPercentages.high}%` }}
              ></div>
            </div>
          </div>

          {/* Medium Risk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Medium Risk</span>
              <span className="text-sm text-gray-600">
                {overview.riskBreakdown.medium} ({overview.riskPercentages.medium}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${overview.riskPercentages.medium}%` }}
              ></div>
            </div>
          </div>

          {/* Low Risk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Low Risk</span>
              <span className="text-sm text-gray-600">
                {overview.riskBreakdown.low} ({overview.riskPercentages.low}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${overview.riskPercentages.low}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
