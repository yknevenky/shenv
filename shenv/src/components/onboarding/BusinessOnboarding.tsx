/**
 * Business Onboarding Wizard
 * Multi-step wizard for business users to set up service account
 */

import { useState, useRef } from 'react';
import {
  Building2, ChevronRight, ChevronLeft, Check, Upload,
  ExternalLink, AlertCircle, Copy, CheckCircle2
} from 'lucide-react';
import { apiClient } from '../../services/api';

interface BusinessOnboardingProps {
  email?: string;
  domain: string;
  onComplete: () => void;
  onSkip?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const TOTAL_STEPS = 6;

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
];

export default function BusinessOnboarding({ domain, onComplete, onSkip }: BusinessOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedScope, setCopiedScope] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((currentStep + 1) as Step);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
      setError(null);
    }
  };

  const handleCopyScope = async (scope: string) => {
    try {
      await navigator.clipboard.writeText(scope);
      setCopiedScope(scope);
      setTimeout(() => setCopiedScope(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = scope;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedScope(scope);
      setTimeout(() => setCopiedScope(null), 2000);
    }
  };

  const handleCopyAllScopes = async () => {
    const allScopes = REQUIRED_SCOPES.join(',');
    await handleCopyScope(allScopes);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const text = await file.text();
      let credentials: any;

      try {
        credentials = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file. Please upload a valid service account key file.');
      }

      if (credentials.type !== 'service_account') {
        throw new Error('Invalid file type. Please upload a Google service account key JSON file.');
      }

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Service account file is missing required fields.');
      }

      const response = await apiClient.post('/api/platforms/credentials', {
        platform: 'google_workspace',
        credentials: credentials,
        credentialType: 'service_account',
      });

      if (response.data.success) {
        // Save onboarding completion
        localStorage.setItem('drive_onboarding_complete', 'true');
        // Move to final step
        setCurrentStep(6);
      } else {
        throw new Error(response.data.message || 'Failed to upload service account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload service account');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step < currentStep
                ? 'bg-green-500 text-white'
                : step === currentStep
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < TOTAL_STEPS && (
            <div
              className={`w-12 h-1 mx-1 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Building2 className="w-10 h-10 text-purple-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Welcome to Shenv for Business
      </h2>
      <p className="text-gray-600 mb-6">
        We detected you're using a <span className="font-medium text-purple-600">@{domain}</span> email.
        Let's set up workspace-wide access to analyze all Google Drive files across your organization.
      </p>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-purple-800 mb-2">What you'll be able to do:</h3>
        <ul className="text-sm text-purple-700 space-y-2">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Discover all Google Drive files across your workspace</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Analyze permissions and identify security risks</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Take governance actions (delete, change visibility, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Generate compliance reports</span>
          </li>
        </ul>
      </div>
      <p className="text-sm text-gray-500">
        This setup requires Google Workspace admin access.
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Step 1: Create a Google Cloud Project
      </h2>
      <p className="text-gray-600 mb-6">
        You'll need a Google Cloud Project to create a service account. If you already have one, you can skip to the next step.
      </p>

      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Instructions:</h3>
          <ol className="text-sm text-gray-700 space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
              <span>Go to the Google Cloud Console</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
              <span>Click "Select a project" → "New Project"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
              <span>Enter a project name (e.g., "Shenv Governance")</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
              <span>Click "Create" and wait for the project to be created</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">5</span>
              <span>Enable the following APIs: <strong>Google Drive API</strong>, <strong>Admin SDK API</strong></span>
            </li>
          </ol>
        </div>

        <a
          href="https://console.cloud.google.com/projectcreate"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Google Cloud Console
        </a>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Step 2: Create a Service Account
      </h2>
      <p className="text-gray-600 mb-6">
        A service account allows Shenv to access your Google Workspace on behalf of your organization.
      </p>

      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Instructions:</h3>
          <ol className="text-sm text-gray-700 space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
              <span>In your Google Cloud project, go to "IAM & Admin" → "Service Accounts"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
              <span>Click "Create Service Account"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
              <span>Enter a name (e.g., "shenv-governance") and description</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
              <span>Click "Create and Continue" (skip optional steps)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">5</span>
              <span>Click the service account → "Keys" tab → "Add Key" → "Create new key" → JSON</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">6</span>
              <span>Download and save the JSON key file securely</span>
            </li>
          </ol>
        </div>

        <a
          href="https://console.cloud.google.com/iam-admin/serviceaccounts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Service Accounts Page
        </a>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Step 3: Enable Domain-Wide Delegation
      </h2>
      <p className="text-gray-600 mb-6">
        Domain-Wide Delegation allows the service account to access data across your entire workspace.
      </p>

      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">In Google Cloud Console:</h3>
          <ol className="text-sm text-gray-700 space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
              <span>Go to your service account → Click the email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
              <span>Click "Show advanced settings" at the bottom</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
              <span>Check "Enable Google Workspace Domain-wide Delegation"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
              <span>Copy the <strong>Client ID</strong> (you'll need it next)</span>
            </li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-3">In Google Admin Console:</h3>
          <ol className="text-sm text-yellow-700 space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-yellow-200 text-yellow-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
              <span>Go to Security → Access and data control → API controls</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-yellow-200 text-yellow-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
              <span>Click "Manage Domain Wide Delegation"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-yellow-200 text-yellow-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
              <span>Click "Add new"</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-yellow-200 text-yellow-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
              <span>Paste the Client ID and add the scopes below:</span>
            </li>
          </ol>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Required OAuth Scopes</span>
            <button
              onClick={handleCopyAllScopes}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              {copiedScope === REQUIRED_SCOPES.join(',') ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy all
                </>
              )}
            </button>
          </div>
          <div className="space-y-2">
            {REQUIRED_SCOPES.map((scope) => (
              <div key={scope} className="flex items-center justify-between group">
                <code className="text-xs text-green-400 break-all">{scope}</code>
                <button
                  onClick={() => handleCopyScope(scope)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                >
                  {copiedScope === scope ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href="https://console.cloud.google.com/iam-admin/serviceaccounts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Google Cloud
          </a>
          <a
            href="https://admin.google.com/ac/owl/domainwidedelegation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Google Admin
          </a>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Step 4: Upload Service Account Key
      </h2>
      <p className="text-gray-600 mb-6">
        Upload the JSON key file you downloaded in Step 2. This file will be encrypted and stored securely.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">
          Drag and drop your service account JSON file here, or
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Accepts .json files only
        </p>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Security Note</h4>
        <p className="text-xs text-blue-700">
          Your service account key is encrypted using AES-256 before storage.
          We never store the key in plain text and never share it with third parties.
        </p>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Setup Complete!
      </h2>
      <p className="text-gray-600 mb-6">
        Your Google Workspace is now connected. You can start discovering and analyzing Drive files across your organization.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-green-800 mb-2">What's next?</h3>
        <ul className="text-sm text-green-700 space-y-2">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Click "Discover Files" to scan your workspace</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Review high-risk files and permissions</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Take governance actions to secure your data</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-2xl mx-auto">
      {renderStepIndicator()}
      {renderCurrentStep()}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <div>
          {currentStep > 1 && currentStep < 6 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSkip && currentStep === 1 && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip for now
            </button>
          )}

          {currentStep < 5 && (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {currentStep === 1 ? "Let's Get Started" : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 6 && (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
