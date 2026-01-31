/**
 * Connect Google Drive Component
 * Displays OAuth connection button and status
 */

import { useState, useEffect } from 'react';
import { driveOAuthApi, type DriveOAuthStatus } from '../../services/drive';

interface ConnectDriveProps {
  onConnected?: () => void;
}

export default function ConnectDrive({ onConnected }: ConnectDriveProps) {
  const [status, setStatus] = useState<DriveOAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const statusData = await driveOAuthApi.getStatus();
      setStatus(statusData);
    } catch (err: any) {
      console.error('Failed to check Drive status:', err);
      setError(err.response?.data?.message || 'Failed to check connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Get OAuth authorization URL
      const { authUrl } = await driveOAuthApi.getAuthUrl();

      // Redirect to Google OAuth consent screen
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Failed to connect Drive:', err);
      setError(err.response?.data?.message || 'Failed to initiate OAuth flow');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? This will remove access to your Drive files.')) {
      return;
    }

    try {
      setLoading(true);
      await driveOAuthApi.disconnect();
      setStatus({
        isConnected: false,
        platform: 'google_workspace',
        authType: null,
        email: null,
      });
      setError(null);
    } catch (err: any) {
      console.error('Failed to disconnect Drive:', err);
      setError(err.response?.data?.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status?.isConnected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Google Drive Connected</h3>
              <div className="mt-2 text-sm text-green-700">
                <p><span className="font-medium">Email:</span> {status.email}</p>
                <p><span className="font-medium">Auth Type:</span> {status.authType === 'oauth' ? 'OAuth 2.0 (Individual)' : 'Service Account (Business)'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Drive Connected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Connect your Google Drive to analyze your files and permissions.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Connect with Google
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          You'll be redirected to Google to authorize access to your Drive files.
          <br />
          We only request read-only access to your files.
        </p>
      </div>
    </div>
  );
}
