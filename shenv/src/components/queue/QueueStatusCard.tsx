/**
 * Queue Status Card Component
 * Shows current queue position, estimated wait time, and upgrade options
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface QueueStatus {
  jobId: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition: number | null;
  estimatedWaitMinutes: number | null;
  canSkipQueue: boolean;
  upgradeOptions: {
    oneTimeSkip: { price: number; currency: string };
    monthlyUnlimited: { price: number; currency: string };
  };
}

interface QueueStatusCardProps {
  jobId: number;
  onComplete?: () => void;
}

export default function QueueStatusCard({ jobId, onComplete }: QueueStatusCardProps) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await apiClient.get(`/api/scans/queue/${jobId}/status`);
      setStatus(response.data);
      setError('');

      // If completed, notify parent
      if (response.data.status === 'completed' && onComplete) {
        onComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch queue status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll every 10 seconds if job is queued or processing
    const interval = setInterval(() => {
      if (status?.status === 'queued' || status?.status === 'processing') {
        fetchStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [jobId, status?.status]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg">
      {status.status === 'queued' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your scan is queued!</h3>
              <p className="text-sm text-gray-600 mt-1">We'll process your request shortly</p>
            </div>
            <div className="animate-pulse">
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Your Position</p>
                <p className="text-2xl font-bold text-gray-900">
                  #{status.queuePosition || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Estimated Wait</p>
                <p className="text-2xl font-bold text-gray-900">
                  {status.estimatedWaitMinutes !== null
                    ? `~${status.estimatedWaitMinutes} min`
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            ✉️ You can close this page. We'll email you when your scan is complete.
          </p>

          {status.canSkipQueue && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-900 mb-3">💡 Skip the wait:</p>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  ${status.upgradeOptions.oneTimeSkip.price} One-Time Skip
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                  ${status.upgradeOptions.monthlyUnlimited.price}/mo Unlimited Scans
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {status.status === 'processing' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scanning now...</h3>
              <p className="text-sm text-gray-600 mt-1">This usually takes 2-5 minutes</p>
            </div>
            <div className="flex space-x-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full animate-pulse w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {status.status === 'completed' && (
        <>
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">✅ Scan Complete!</h3>
              <p className="text-sm text-gray-600 mt-1">Your results are ready</p>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/assets'}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            View Results
          </button>
        </>
      )}

      {status.status === 'failed' && (
        <>
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">❌ Scan Failed</h3>
              <p className="text-sm text-gray-600 mt-1">Something went wrong</p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
