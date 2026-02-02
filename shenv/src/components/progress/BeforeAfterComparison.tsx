/**
 * Before/After Comparison Component
 * Visual comparison of workspace health before and after cleanup
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface ComparisonData {
  current: {
    riskScore: number;
    highRiskCount: number;
    assetsFound: number;
  };
  baseline: {
    riskScore: number;
    highRiskCount: number;
    assetsFound: number;
  };
}

export default function BeforeAfterComparison() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/api/scans/improvement');
        const metrics = response.data.metrics || response.data;
        if (metrics) {
          setData({
            current: metrics.current,
            baseline: metrics.baseline,
          });
        }
      } catch (err) {
        console.error('Failed to load comparison data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Run multiple scans to see before/after comparison</p>
      </div>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 61) return 'text-red-600';
    if (score >= 31) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBgColor = (score: number) => {
    if (score >= 61) return 'bg-red-50 border-red-200';
    if (score >= 31) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 61) return 'High Risk';
    if (score >= 31) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Before / After Comparison</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before (Baseline) */}
        <div className={`border rounded-lg p-6 ${getRiskBgColor(data.baseline.riskScore)}`}>
          <div className="text-center mb-4">
            <div className="inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium mb-2">
              Before (First Scan)
            </div>
          </div>

          <div className="space-y-4">
            {/* Risk Score */}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Risk Score</div>
              <div className={`text-5xl font-bold ${getRiskColor(data.baseline.riskScore)}`}>
                {data.baseline.riskScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">{getRiskLabel(data.baseline.riskScore)}</div>
            </div>

            {/* Stats */}
            <div className="pt-4 border-t border-gray-300 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">High-Risk Assets:</span>
                <span className="text-lg font-semibold text-red-600">{data.baseline.highRiskCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Total Assets:</span>
                <span className="text-lg font-semibold text-gray-900">{data.baseline.assetsFound}</span>
              </div>
            </div>
          </div>
        </div>

        {/* After (Current) */}
        <div className={`border rounded-lg p-6 ${getRiskBgColor(data.current.riskScore)}`}>
          <div className="text-center mb-4">
            <div className="inline-block px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium mb-2">
              After Cleanup
            </div>
          </div>

          <div className="space-y-4">
            {/* Risk Score */}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Risk Score</div>
              <div className={`text-5xl font-bold ${getRiskColor(data.current.riskScore)}`}>
                {data.current.riskScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">{getRiskLabel(data.current.riskScore)}</div>
            </div>

            {/* Stats */}
            <div className="pt-4 border-t border-gray-300 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">High-Risk Assets:</span>
                <span className="text-lg font-semibold text-green-600">{data.current.highRiskCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Total Assets:</span>
                <span className="text-lg font-semibold text-gray-900">{data.current.assetsFound}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change indicator */}
      {data.baseline.riskScore !== data.current.riskScore && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2">
            {data.current.riskScore < data.baseline.riskScore ? (
              <>
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-lg font-semibold text-green-600">
                  {data.baseline.riskScore - data.current.riskScore} point improvement!
                </span>
              </>
            ) : (
              <>
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span className="text-lg font-semibold text-red-600">
                  Risk increased by {data.current.riskScore - data.baseline.riskScore} points
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
