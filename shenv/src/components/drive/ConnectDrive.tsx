/**
 * Connect Google Drive Component
 * Displays mode selector and handles both OAuth and Service Account connections
 */

import { useState, useEffect, useRef } from 'react';
import { driveOAuthApi, type DriveOAuthStatus } from '../../services/drive';
import { apiClient } from '../../services/api';
import { Upload, User, Building2, Check, AlertCircle } from 'lucide-react';

interface ConnectDriveProps {
  onConnected?: () => void;
}

type ConnectionMode = 'oauth' | 'service_account';

export default function ConnectDrive({ onConnected }: ConnectDriveProps) {
  const [status, setStatus] = useState<DriveOAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ConnectionMode | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);

      // First check OAuth status
      const oauthStatus = await driveOAuthApi.getStatus();

      if (oauthStatus.isConnected) {
        setStatus(oauthStatus);
      } else {
        // Check for service account credentials
        try {
          const saResponse = await apiClient.get('/api/platforms/google_workspace/status');
          if (saResponse.data?.data?.hasCredentials) {
            // Get more details from credentials list
            const credResponse = await apiClient.get('/api/platforms/credentials');
            const googleCred = credResponse.data?.data?.platforms?.find(
              (p: any) => p.platform === 'google_workspace'
            );

            if (googleCred) {
              setStatus({
                isConnected: true,
                platform: 'google_workspace',
                authType: googleCred.credentialType as 'oauth' | 'service_account',
                email: googleCred.email || null,
              });
            }
          } else {
            setStatus(oauthStatus);
          }
        } catch {
          setStatus(oauthStatus);
        }
      }
    } catch (err: any) {
      console.error('Failed to check Drive status:', err);
      setError(err.response?.data?.message || 'Failed to check connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      const { authUrl } = await driveOAuthApi.getAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Failed to connect Drive:', err);
      setError(err.response?.data?.message || 'Failed to initiate OAuth flow');
      setConnecting(false);
    }
  };

  const handleServiceAccountUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setError(null);

      // Read and parse the JSON file
      const text = await file.text();
      let credentials: any;

      try {
        credentials = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file. Please upload a valid service account key file.');
      }

      // Validate it's a service account file
      if (credentials.type !== 'service_account') {
        throw new Error('Invalid service account file. Please upload a Google service account key JSON file.');
      }

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Service account file is missing required fields (client_email or private_key).');
      }

      // Upload to backend
      const response = await apiClient.post('/api/platforms/credentials', {
        platform: 'google_workspace',
        credentials: credentials,
        credentialType: 'service_account',
      });

      if (response.data.success) {
        // Update status
        setStatus({
          isConnected: true,
          platform: 'google_workspace',
          authType: 'service_account',
          email: credentials.client_email,
        });

        setSelectedMode(null);

        if (onConnected) {
          onConnected();
        }
      } else {
        throw new Error(response.data.message || 'Failed to upload service account');
      }
    } catch (err: any) {
      console.error('Failed to upload service account:', err);
      setError(err.message || 'Failed to upload service account');
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? This will remove access to your Drive files.')) {
      return;
    }

    try {
      setLoading(true);

      if (status?.authType === 'oauth') {
        await driveOAuthApi.disconnect();
      } else {
        await apiClient.delete('/api/platforms/credentials/google_workspace');
      }

      setStatus({
        isConnected: false,
        platform: 'google_workspace',
        authType: null,
        email: null,
      });
      setError(null);
      setSelectedMode(null);
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

  // Connected state
  if (status?.isConnected) {
    return (
      <div className={`border rounded-lg p-6 ${
        status.authType === 'service_account'
          ? 'bg-purple-50 border-purple-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {status.authType === 'service_account' ? (
                <Building2 className="h-6 w-6 text-purple-600" />
              ) : (
                <Check className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-medium ${
                status.authType === 'service_account' ? 'text-purple-800' : 'text-green-800'
              }`}>
                Google Drive Connected
              </h3>
              <div className={`mt-2 text-sm ${
                status.authType === 'service_account' ? 'text-purple-700' : 'text-green-700'
              }`}>
                <p><span className="font-medium">Email:</span> {status.email || 'N/A'}</p>
                <p>
                  <span className="font-medium">Mode:</span>{' '}
                  {status.authType === 'service_account' ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Business (Service Account)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" /> Personal (OAuth 2.0)
                    </span>
                  )}
                </p>
              </div>

              {status.authType === 'service_account' && (
                <p className="mt-2 text-xs text-purple-600">
                  Full workspace access with Domain-Wide Delegation
                </p>
              )}
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

  // Not connected - Show mode selector
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!selectedMode ? (
        // Mode selection
        <div>
          <div className="text-center mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Connect Google Drive</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose how you want to connect your Drive
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Mode */}
            <button
              onClick={() => setSelectedMode('oauth')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900">Personal</h4>
              </div>
              <p className="text-sm text-gray-500">
                Connect your personal Google Drive using OAuth 2.0. Access your own files only.
              </p>
              <div className="mt-3 text-xs text-blue-600 font-medium">
                Recommended for individuals
              </div>
            </button>

            {/* Business Mode */}
            <button
              onClick={() => setSelectedMode('service_account')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900">Business</h4>
              </div>
              <p className="text-sm text-gray-500">
                Upload a service account key with Domain-Wide Delegation for workspace-wide access.
              </p>
              <div className="mt-3 text-xs text-purple-600 font-medium">
                For Google Workspace admins
              </div>
            </button>
          </div>
        </div>
      ) : selectedMode === 'oauth' ? (
        // OAuth flow
        <div className="text-center">
          <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Personal Mode</h3>
          <p className="text-sm text-gray-500 mb-6">
            Sign in with your Google account to access your personal Drive files.
          </p>

          <button
            onClick={handleOAuthConnect}
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
                Sign in with Google
              </>
            )}
          </button>

          <button
            onClick={() => setSelectedMode(null)}
            className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Back to mode selection
          </button>
        </div>
      ) : (
        // Service account upload
        <div className="text-center">
          <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
            <Building2 className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Business Mode</h3>
          <p className="text-sm text-gray-500 mb-6">
            Upload your Google service account key JSON file with Domain-Wide Delegation enabled.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleServiceAccountUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {uploadingFile ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload Service Account Key
              </>
            )}
          </button>

          <button
            onClick={() => setSelectedMode(null)}
            className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Back to mode selection
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>1. Create a service account in Google Cloud Console</li>
              <li>2. Enable Domain-Wide Delegation for the service account</li>
              <li>3. Download the JSON key file</li>
              <li>4. Configure the required scopes in Google Admin Console</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
