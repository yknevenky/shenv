/**
 * Activity Timeline Component
 * Shows chronological timeline of governance actions
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { Lock, Users, UserX, Trash2, Clock } from 'lucide-react';

interface ScanHistoryItem {
  id: number;
  scope: string;
  assetsFound: number;
  riskScore: number;
  highRiskCount: number;
  completedAt: string;
}

export default function ActivityTimeline() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiClient.get('/api/scans/history?limit=10');
        setHistory(response.data.history);
      } catch (err) {
        console.error('Failed to load activity timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">No activity yet</p>
          <p className="text-sm text-gray-500 mt-1">Your scan history will appear here</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'quick':
        return '⚡';
      case 'full':
        return '🔍';
      case 'organization':
        return '🏢';
      default:
        return '📊';
    }
  };

  const getRiskChangeColor = (index: number) => {
    if (index === history.length - 1) return 'text-gray-600'; // No previous scan

    const current = history[index].riskScore;
    const previous = history[index + 1].riskScore;

    if (current < previous) return 'text-green-600';
    if (current > previous) return 'text-red-600';
    return 'text-gray-600';
  };

  const getRiskChange = (index: number) => {
    if (index === history.length - 1) return null;

    const current = history[index].riskScore;
    const previous = history[index + 1].riskScore;
    const change = current - previous;

    if (change === 0) return null;
    return change > 0 ? `+${change}` : change;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>

      <div className="space-y-6">
        {history.map((item, index) => {
          const riskChange = getRiskChange(index);
          const isLatest = index === 0;

          return (
            <div key={item.id} className="flex space-x-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                  isLatest ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <span className="text-lg">{getScopeIcon(item.scope)}</span>
                </div>
                {index < history.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {item.scope.charAt(0).toUpperCase() + item.scope.slice(1)} Scan
                      </h4>
                      {isLatest && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(item.completedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-4 text-sm">
                  {/* Assets Found */}
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Assets:</span>
                    <span className="font-medium text-gray-900">{item.assetsFound}</span>
                  </div>

                  {/* Risk Score */}
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Risk:</span>
                    <span className={`font-medium ${
                      item.riskScore >= 61 ? 'text-red-600' :
                      item.riskScore >= 31 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {item.riskScore}
                    </span>
                    {riskChange && (
                      <span className={`text-xs ${getRiskChangeColor(index)}`}>
                        ({riskChange})
                      </span>
                    )}
                  </div>

                  {/* High Risk Count */}
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">High-Risk:</span>
                    <span className="font-medium text-red-600">{item.highRiskCount}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {history.length >= 10 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">Showing last 10 scans</p>
        </div>
      )}
    </div>
  );
}
