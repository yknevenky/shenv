/**
 * Unified Assets Page
 * Main page for all workspace assets - Drive files, Gmail senders, etc.
 */

import { useState, useEffect } from 'react';
import { Building2, User, LayoutGrid, List, RefreshCw, Loader2 } from 'lucide-react';
import { UnifiedAssetList, UnifiedAssetDetails, UnifiedAnalytics } from '../components/assets';
import { BusinessOnboarding, IndividualOnboarding } from '../components/onboarding';
import { unifiedAssetApi } from '../services/unified-assets';
import { useUserType } from '../hooks/useUserType';
import type { UnifiedAsset, PlatformConnection } from '../types/assets';

type ViewMode = 'analytics' | 'list';
type OnboardingMode = 'auto' | 'individual' | 'business';

export default function AssetsPage() {
  // User type detection
  const { email, domain, isIndividual } = useUserType();

  // Connection state
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('auto');

  // Asset detail modal
  const [selectedAsset, setSelectedAsset] = useState<UnifiedAsset | null>(null);

  // Discovery state
  const [discovering, setDiscovering] = useState(false);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const status = await unifiedAssetApi.getConnectionStatus();
      setConnection(status);

      // Show onboarding if not connected and hasn't been completed/skipped
      if (!status.isConnected) {
        const onboardingComplete = localStorage.getItem('assets_onboarding_complete');
        const onboardingSkipped = localStorage.getItem('assets_onboarding_skipped');

        if (!onboardingComplete && !onboardingSkipped) {
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      console.error('Failed to check connection:', err);
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverAssets = async () => {
    if (!confirm('This will scan your Google Drive and Gmail. Continue?')) {
      return;
    }

    try {
      setDiscovering(true);
      const result = await unifiedAssetApi.discoverAssets(['drive_file', 'email_sender']);

      const message = [];
      if (result.drive) {
        message.push(`Drive: ${result.drive.discovered} files found`);
      }
      if (result.gmail) {
        message.push(`Gmail: ${result.gmail.senders} senders from ${result.gmail.emails} emails`);
      }

      alert(`Discovery complete!\n${message.join('\n')}`);

      // Refresh the view
      checkConnection();
    } catch (err: any) {
      console.error('Discovery failed:', err);
      alert(err.response?.data?.message || 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('assets_onboarding_complete', 'true');
    setShowOnboarding(false);
    checkConnection();
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('assets_onboarding_skipped', 'true');
    setShowOnboarding(false);
  };

  const handleSwitchToBusinessMode = () => {
    setOnboardingMode('business');
  };

  const handleSwitchToIndividualMode = () => {
    setOnboardingMode('individual');
  };

  // Determine which onboarding to show
  const getEffectiveOnboardingMode = (): 'individual' | 'business' => {
    if (onboardingMode !== 'auto') {
      return onboardingMode;
    }
    return isIndividual ? 'individual' : 'business';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding && !connection?.isConnected) {
    const effectiveMode = getEffectiveOnboardingMode();

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Workspace Assets</h1>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Google account to discover and manage your workspace assets
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={handleSwitchToIndividualMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              effectiveMode === 'individual'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            Personal
          </button>
          <button
            onClick={handleSwitchToBusinessMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              effectiveMode === 'business'
                ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Business
          </button>
        </div>

        {/* Onboarding component */}
        {effectiveMode === 'individual' ? (
          <IndividualOnboarding
            email={email || ''}
            onComplete={handleOnboardingComplete}
            onSwitchToBusinessMode={handleSwitchToBusinessMode}
          />
        ) : (
          <BusinessOnboarding
            email={email || ''}
            domain={domain || ''}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage and secure all your workspace assets in one place
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Auth type badge */}
            {connection?.isConnected && (
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                  connection.authType === 'service_account'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {connection.authType === 'service_account' ? (
                  <>
                    <Building2 className="w-3 h-3" />
                    Business
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3" />
                    Personal
                  </>
                )}
              </span>
            )}

            {/* Discover Button */}
            <button
              onClick={handleDiscoverAssets}
              disabled={discovering}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {discovering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Discover Assets
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('analytics')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'analytics'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <List className="w-4 h-4" />
          All Assets
        </button>
      </div>

      {/* Connected State */}
      {connection?.isConnected ? (
        <>
          {/* Analytics View */}
          {viewMode === 'analytics' && (
            <UnifiedAnalytics onDiscoverAssets={handleDiscoverAssets} />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <UnifiedAssetList
              onViewAsset={setSelectedAsset}
              onActionComplete={() => checkConnection()}
            />
          )}
        </>
      ) : (
        /* Not Connected State */
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Assets Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Google account to start discovering assets.
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Get Started
          </button>
        </div>
      )}

      {/* Asset Details Modal */}
      {selectedAsset && (
        <UnifiedAssetDetails
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onRefresh={() => checkConnection()}
          onActionComplete={() => checkConnection()}
        />
      )}
    </div>
  );
}
