/**
 * Individual Onboarding Component
 * Simple OAuth flow for individual/personal users (Gmail, etc.)
 */

import { useState } from 'react';
import { User, Check, Shield, FileText, AlertCircle } from 'lucide-react';
import { driveOAuthApi } from '../../services/drive';

interface IndividualOnboardingProps {
  email: string;
  onComplete?: () => void;
  onSwitchToBusinessMode?: () => void;
}

export default function IndividualOnboarding({
  email,
  onSwitchToBusinessMode,
}: IndividualOnboardingProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      const { authUrl } = await driveOAuthApi.getAuthUrl();

      // Save that onboarding was initiated
      localStorage.setItem('drive_onboarding_initiated', 'true');

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Failed to initiate OAuth:', err);
      setError(err.response?.data?.message || 'Failed to connect. Please try again.');
      setConnecting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Google Drive
        </h2>
        <p className="text-gray-600">
          Signed in as <span className="font-medium text-blue-600">{email}</span>
        </p>
      </div>

      {/* Features */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-3">What you'll be able to do:</h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Discover all your Google Drive files</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Analyze file permissions and sharing settings</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Identify security risks (over-shared files, public access)</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Get recommendations to secure your files</span>
          </li>
        </ul>
      </div>

      {/* Permissions info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900 text-sm">Read Access</span>
          </div>
          <p className="text-xs text-gray-600">
            We can view your files and their permissions
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900 text-sm">Secure</span>
          </div>
          <p className="text-xs text-gray-600">
            Your data is encrypted and never shared
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {connecting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Connecting...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            Connect with Google
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        You'll be redirected to Google to authorize access.
        <br />
        We only request read access to your Drive files.
      </p>

      {/* Switch to business mode */}
      {onSwitchToBusinessMode && (
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Are you a Google Workspace admin?
          </p>
          <button
            onClick={onSwitchToBusinessMode}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Switch to Business Mode →
          </button>
        </div>
      )}
    </div>
  );
}
