/**
 * Drive Dashboard Page
 * Main page for Drive analytics and asset management
 */

import { useState, useEffect } from 'react';
import { driveOAuthApi, driveAnalyticsApi, type DriveOAuthStatus } from '../services/drive';
import ConnectDrive from '../components/drive/ConnectDrive';
import DriveAnalytics from '../components/drive/DriveAnalytics';

export default function DriveDashboard() {
  const [status, setStatus] = useState<DriveOAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const statusData = await driveOAuthApi.getStatus();
      setStatus(statusData);
    } catch (err) {
      console.error('Failed to check Drive status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Google Drive</h1>
        <p className="mt-2 text-sm text-gray-600">
          Analyze your Drive files, permissions, and security risks
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-8">
        <ConnectDrive onConnected={checkStatus} />
      </div>

      {/* Analytics - Only show if connected */}
      {status?.isConnected && (
        <DriveAnalytics />
      )}

      {/* Not Connected State */}
      {!status?.isConnected && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Google Drive to start analyzing your files.
          </p>
        </div>
      )}
    </div>
  );
}
