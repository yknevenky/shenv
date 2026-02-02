/**
 * Scan Queue Page
 * Shows queue status and scan history
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import QueueStatusCard from '../components/queue/QueueStatusCard';
import { apiClient } from '../services/api';

interface ScanHistoryItem {
  id: number;
  scope: string;
  assetsFound: number;
  riskScore: number;
  highRiskCount: number;
  completedAt: string;
}

export default function ScanQueuePage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/api/scans/history?limit=5');
      setHistory(response.data.history);
    } catch (err) {
      console.error('Failed to fetch scan history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleScanComplete = () => {
    // Refresh history when scan completes
    fetchHistory();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan Queue</h1>
          <p className="text-gray-600">Track your scan progress and view history</p>
        </div>

        {jobId && (
          <div className="mb-8">
            <QueueStatusCard jobId={parseInt(jobId)} onComplete={handleScanComplete} />
          </div>
        )}

        {/* Scan History */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Scan History</h2>
          </div>

          {loadingHistory ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scan history</h3>
              <p className="mt-1 text-sm text-gray-500">Queue your first scan to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {history.map((scan) => (
                <div key={scan.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {scan.scope.charAt(0).toUpperCase() + scan.scope.slice(1)} Scan
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(scan.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-500">Assets:</span>
                          <span className="ml-1 font-medium text-gray-900">{scan.assetsFound}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Risk Score:</span>
                          <span className={`ml-1 font-medium ${
                            scan.riskScore >= 61 ? 'text-red-600' :
                            scan.riskScore >= 31 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {scan.riskScore}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">High Risk:</span>
                          <span className="ml-1 font-medium text-red-600">{scan.highRiskCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
