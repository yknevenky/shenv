/**
 * Action Suggestions Component
 * Displays contextual action suggestions for an asset
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface SuggestedAction {
  type: 'make_private' | 'review_access' | 'transfer_ownership' | 'delete';
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  icon?: string;
}

interface ActionSuggestionsProps {
  assetId: number;
  assetName: string;
  riskScore: number;
  onActionClick?: (action: SuggestedAction) => void;
}

export default function ActionSuggestions({
  assetId,
  assetName,
  riskScore,
  onActionClick,
}: ActionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [priorityMessage, setPriorityMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await apiClient.get(`/api/assets/${assetId}/suggestions`);
        setSuggestions(response.data.suggestions);
        setPriorityMessage(response.data.priorityMessage);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [assetId]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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

  if (suggestions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-green-700 font-medium">No immediate action needed</p>
        </div>
        <p className="text-green-600 text-sm mt-1 ml-7">This asset is properly configured</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700';
      case 'medium': return 'text-yellow-700';
      case 'low': return 'text-gray-700';
      default: return 'text-gray-700';
    }
  };

  const getActionButtonStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'medium': return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'low': return 'bg-gray-600 hover:bg-gray-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">💡 Suggested Actions</h3>
        <p className="text-sm text-gray-600">{priorityMessage}</p>
      </div>

      <div className="space-y-3">
        {suggestions.map((action, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 transition-colors ${getPriorityColor(action.priority)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start flex-1">
                {action.icon && (
                  <span className="text-2xl mr-3 mt-0.5">{action.icon}</span>
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className={`font-semibold ${getPriorityTextColor(action.priority)}`}>
                      {action.label}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      action.priority === 'high' ? 'bg-red-200 text-red-800' :
                      action.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {action.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{action.description}</p>
                  <p className="text-xs text-gray-600 italic">
                    <strong>Why:</strong> {action.reason}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onActionClick?.(action)}
              className={`w-full mt-3 px-4 py-2 rounded text-sm font-medium transition-colors ${getActionButtonStyle(action.priority)}`}
            >
              {action.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
