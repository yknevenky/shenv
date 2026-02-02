/**
 * Batch Actions Panel Component
 * Shows suggested batch actions for multiple high-risk assets
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface BatchSuggestion {
  makeAllPrivate?: { count: number; assets: number[] };
  transferAllOrphaned?: { count: number; assets: number[] };
  reviewAllExternal?: { count: number; assets: number[] };
}

interface BatchActionsPanelProps {
  onActionClick?: (actionType: string, assetIds: number[]) => void;
}

export default function BatchActionsPanel({ onActionClick }: BatchActionsPanelProps) {
  const [suggestions, setSuggestions] = useState<BatchSuggestion>({});
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBatchSuggestions = async () => {
      try {
        const response = await apiClient.get('/api/assets/suggestions/batch');
        setSuggestions(response.data.batchSuggestions);
        setHighRiskCount(response.data.highRiskCount);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load batch suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchSuggestions();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  const hasSuggestions =
    suggestions.makeAllPrivate ||
    suggestions.transferAllOrphaned ||
    suggestions.reviewAllExternal;

  if (!hasSuggestions || highRiskCount === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-green-700 font-medium">Great job! No high-risk assets found</p>
            <p className="text-green-600 text-sm mt-0.5">Your workspace is well-secured</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">💡 Suggested Fixes</h3>
        <p className="text-sm text-gray-600">
          Quick actions to secure {highRiskCount} high-risk asset{highRiskCount > 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {suggestions.makeAllPrivate && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">🔴</span>
                  <h4 className="font-semibold text-red-900">
                    {suggestions.makeAllPrivate.count} files are publicly accessible
                  </h4>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  These files can be accessed by anyone with the link. Consider making them private.
                </p>
                <button
                  onClick={() =>
                    onActionClick?.('makeAllPrivate', suggestions.makeAllPrivate!.assets)
                  }
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Make All Private
                </button>
              </div>
            </div>
          </div>
        )}

        {suggestions.transferAllOrphaned && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">⚠️</span>
                  <h4 className="font-semibold text-yellow-900">
                    {suggestions.transferAllOrphaned.count} files owned by ex-employees
                  </h4>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  These files have no active owner. Transfer ownership to someone in your team.
                </p>
                <button
                  onClick={() =>
                    onActionClick?.('transferAllOrphaned', suggestions.transferAllOrphaned!.assets)
                  }
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Transfer All to Manager
                </button>
              </div>
            </div>
          </div>
        )}

        {suggestions.reviewAllExternal && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">💬</span>
                  <h4 className="font-semibold text-blue-900">
                    {suggestions.reviewAllExternal.count} files shared with external users
                  </h4>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  These files are shared with people outside your organization. Review who has access.
                </p>
                <button
                  onClick={() =>
                    onActionClick?.('reviewAllExternal', suggestions.reviewAllExternal!.assets)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Review All External Access
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
