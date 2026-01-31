/**
 * Drive OAuth Callback Page
 * Handles the OAuth redirect from Google and exchanges code for tokens
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { driveOAuthApi } from '../services/drive';

export default function DriveAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      // Check for OAuth error
      if (error) {
        setStatus('error');
        setError(`OAuth authorization failed: ${error}`);
        return;
      }

      // Check for authorization code
      if (!code) {
        setStatus('error');
        setError('No authorization code received from Google');
        return;
      }

      try {
        // Exchange code for tokens
        const result = await driveOAuthApi.handleCallback(code);

        setStatus('success');
        setUserInfo({ email: result.email, name: result.name });

        // Redirect to Assets page after 2 seconds
        setTimeout(() => {
          navigate('/assets');
        }, 2000);
      } catch (err: any) {
        console.error('OAuth callback failed:', err);
        setStatus('error');
        setError(err.response?.data?.message || 'Failed to complete OAuth authorization');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
                Connecting Google Drive
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Please wait while we complete the authorization...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
                Successfully Connected!
              </h2>
              <div className="mt-4 text-center text-sm text-gray-600">
                <p className="font-medium">{userInfo?.name}</p>
                <p className="text-gray-500">{userInfo?.email}</p>
              </div>
              <p className="mt-4 text-center text-sm text-gray-600">
                Redirecting to your Assets...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
              Connection Failed
            </h2>
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate('/assets')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Assets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
