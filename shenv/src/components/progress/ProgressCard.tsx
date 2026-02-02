/**
 * Progress Card Component
 * Shows improvement metrics (before/after comparison)
 */

import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { apiClient } from '../../services/api';

interface ImprovementMetrics {
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
  improvement: {
    riskScoreChange: number;
    riskScorePercentChange: number;
    highRiskReduction: number;
    securedAssets: number;
  };
}

export default function ProgressCard() {
  const [metrics, setMetrics] = useState<ImprovementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiClient.get('/api/scans/improvement');
        setMetrics(response.data.metrics || response.data);
        setError('');
      } catch (err: any) {
        if (err.response?.data?.message?.includes('No scan history')) {
          setMetrics(null);
        } else {
          setError(err.response?.data?.message || 'Failed to load progress metrics');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
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

  if (!metrics) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-blue-900">No progress data yet</h3>
          <p className="mt-2 text-sm text-blue-700">
            Run at least one scan to start tracking your workspace improvements
          </p>
        </div>
      </div>
    );
  }

  const getTrendIcon = (change: number) => {
    if (change < 0) return <TrendingDown className="h-5 w-5 text-green-600" />;
    if (change > 0) return <TrendingUp className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-400" />;
  };

  const getChangeColor = (change: number, inverse = false) => {
    if (inverse) {
      // For metrics where decrease is good (risk score)
      if (change < 0) return 'text-green-600';
      if (change > 0) return 'text-red-600';
    } else {
      // For metrics where increase is good (secured assets)
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const formatChange = (change: number, inverse = false) => {
    const prefix = change > 0 ? '+' : '';
    const display = inverse ? -change : change;
    return `${prefix}${display}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📈 Your Progress</h3>
          <p className="text-sm text-gray-600">Workspace security improvements</p>
        </div>
        {metrics.improvement.riskScoreChange < 0 && (
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Improving!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Risk Score</span>
            {getTrendIcon(metrics.improvement.riskScoreChange)}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">
              {metrics.current.riskScore}
            </span>
            <span className="text-sm text-gray-500">/ 100</span>
          </div>
          <div className="mt-2 flex items-center space-x-1">
            {metrics.improvement.riskScoreChange < 0 ? (
              <ArrowDown className="h-4 w-4 text-green-600" />
            ) : metrics.improvement.riskScoreChange > 0 ? (
              <ArrowUp className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-gray-400" />
            )}
            <span className={`text-sm font-medium ${getChangeColor(metrics.improvement.riskScoreChange, true)}`}>
              {formatChange(metrics.improvement.riskScoreChange, true)} from baseline
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Baseline: {metrics.baseline.riskScore}
          </div>
        </div>

        {/* High-Risk Assets */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">High-Risk Assets</span>
            {getTrendIcon(metrics.improvement.highRiskReduction)}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">
              {metrics.current.highRiskCount}
            </span>
            <span className="text-sm text-gray-500">assets</span>
          </div>
          <div className="mt-2 flex items-center space-x-1">
            {metrics.improvement.highRiskReduction > 0 ? (
              <ArrowDown className="h-4 w-4 text-green-600" />
            ) : metrics.improvement.highRiskReduction < 0 ? (
              <ArrowUp className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-gray-400" />
            )}
            <span className={`text-sm font-medium ${
              metrics.improvement.highRiskReduction > 0 ? 'text-green-600' :
              metrics.improvement.highRiskReduction < 0 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {metrics.improvement.highRiskReduction > 0 ? '-' : '+'}
              {Math.abs(metrics.improvement.highRiskReduction)} from baseline
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Baseline: {metrics.baseline.highRiskCount}
          </div>
        </div>

        {/* Secured Assets */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">Secured Assets</span>
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-green-900">
              {metrics.improvement.securedAssets}
            </span>
            <span className="text-sm text-green-700">assets</span>
          </div>
          <div className="mt-2 text-sm text-green-700 font-medium">
            {metrics.improvement.riskScorePercentChange < 0
              ? `${Math.abs(Math.round(metrics.improvement.riskScorePercentChange))}% improvement!`
              : 'Keep going!'}
          </div>
          <div className="mt-1 text-xs text-green-600">
            You're making progress!
          </div>
        </div>
      </div>

      {/* Summary message */}
      {metrics.improvement.riskScoreChange < 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900">
            <strong>Great work!</strong> You've reduced your risk score by{' '}
            <strong>{Math.abs(metrics.improvement.riskScoreChange)} points</strong> ({Math.abs(Math.round(metrics.improvement.riskScorePercentChange))}%) and
            secured <strong>{metrics.improvement.securedAssets} assets</strong> since your first scan.
          </p>
        </div>
      )}
    </div>
  );
}
