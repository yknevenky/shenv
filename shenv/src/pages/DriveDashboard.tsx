/**
 * Drive Dashboard Page
 * Main page for Drive analytics and asset management with smart onboarding
 */

import { useState, useEffect, useCallback } from 'react';
import { driveOAuthApi, driveAssetsApi, type DriveOAuthStatus, type DriveAsset } from '../services/drive';
import { apiClient } from '../services/api';
import ConnectDrive from '../components/drive/ConnectDrive';
import DriveAnalytics from '../components/drive/DriveAnalytics';
import DriveAssetList from '../components/drive/DriveAssetList';
import AssetDetailsModal from '../components/drive/AssetDetailsModal';
import { BusinessOnboarding, IndividualOnboarding } from '../components/onboarding';
import { useUserType } from '../hooks/useUserType';
import { Building2, User } from 'lucide-react';

const PAGE_SIZE = 20;

type OnboardingMode = 'auto' | 'individual' | 'business';

export default function DriveDashboard() {
  // User type detection
  const { email, domain, isIndividual } = useUserType();

  // Connection state
  const [status, setStatus] = useState<DriveOAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('auto');

  // Asset list state
  const [assets, setAssets] = useState<DriveAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Search/filter/sort state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<DriveAsset | null>(null);

  // Discovery state
  const [discovering, setDiscovering] = useState(false);

  // View toggle state
  const [view, setView] = useState<'analytics' | 'files'>('analytics');

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Check connection status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Load assets when filter/sort/search changes
  useEffect(() => {
    if (status?.isConnected && view === 'files') {
      loadAssets(true);
    }
  }, [status?.isConnected, debouncedSearch, sortBy, sortOrder, activeFilter, view]);

  const checkStatus = async () => {
    try {
      setLoading(true);

      // Check OAuth status first
      const oauthStatus = await driveOAuthApi.getStatus();

      if (oauthStatus.isConnected) {
        setStatus(oauthStatus);
        setShowOnboarding(false);
      } else {
        // Check for service account credentials
        try {
          const saResponse = await apiClient.get('/api/platforms/google_workspace/status');
          if (saResponse.data?.data?.hasCredentials) {
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
              setShowOnboarding(false);
              return;
            }
          }
        } catch {
          // Ignore errors, fall through to show onboarding
        }

        // Not connected - check if onboarding was completed/skipped
        const onboardingComplete = localStorage.getItem('drive_onboarding_complete');
        const onboardingSkipped = localStorage.getItem('drive_onboarding_skipped');

        if (!onboardingComplete && !onboardingSkipped) {
          setShowOnboarding(true);
        }

        setStatus(oauthStatus);
      }
    } catch (err) {
      console.error('Failed to check Drive status:', err);
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async (reset: boolean = false) => {
    try {
      setAssetsLoading(true);
      const newOffset = reset ? 0 : offset;

      const params: any = {
        limit: PAGE_SIZE,
        offset: newOffset,
        platform: 'google_workspace',
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      switch (activeFilter) {
        case 'high_risk':
          params.highRisk = true;
          break;
        case 'orphaned':
          params.orphaned = true;
          break;
        case 'inactive':
          params.inactive = true;
          break;
      }

      const result = await driveAssetsApi.list(params);

      let filteredAssets = result.assets;
      if (activeFilter === 'medium_risk') {
        filteredAssets = result.assets.filter(a => a.riskScore >= 31 && a.riskScore < 61);
      } else if (activeFilter === 'low_risk') {
        filteredAssets = result.assets.filter(a => a.riskScore < 31);
      }

      filteredAssets.sort((a, b) => {
        let aVal: any = a[sortBy as keyof DriveAsset];
        let bVal: any = b[sortBy as keyof DriveAsset];

        if (sortBy === 'lastModifiedAt' || sortBy === 'createdAt') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });

      if (reset) {
        setAssets(filteredAssets);
        setOffset(PAGE_SIZE);
      } else {
        setAssets(prev => [...prev, ...filteredAssets]);
        setOffset(prev => prev + PAGE_SIZE);
      }

      setTotalAssets(result.total);
      setHasMore(newOffset + filteredAssets.length < result.total);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const handleLoadMore = () => {
    if (!assetsLoading && hasMore) {
      loadAssets(false);
    }
  };

  const handleViewAsset = (asset: DriveAsset) => {
    setSelectedAsset(asset);
  };

  const handleRefreshAsset = async (asset: DriveAsset) => {
    try {
      await driveAssetsApi.refresh(asset.id);
      loadAssets(true);
    } catch (err) {
      console.error('Failed to refresh asset:', err);
    }
  };

  const handleDiscover = async () => {
    if (!confirm('This will scan your entire Google Drive. Continue?')) {
      return;
    }

    try {
      setDiscovering(true);
      const result = await driveAssetsApi.discover('google_workspace');
      alert(`Discovery complete! Found ${result.discovered} files.`);
      localStorage.setItem('drive_last_sync', new Date().toISOString());
      loadAssets(true);
    } catch (err: any) {
      console.error('Failed to discover:', err);
      alert(err.response?.data?.message || 'Failed to discover files');
    } finally {
      setDiscovering(false);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('drive_onboarding_complete', 'true');
    setShowOnboarding(false);
    checkStatus();
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('drive_onboarding_skipped', 'true');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding && !status?.isConnected) {
    const effectiveMode = getEffectiveOnboardingMode();

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Google Drive</h1>
          <p className="mt-2 text-sm text-gray-600">
            Analyze your Drive files, permissions, and security risks
          </p>
        </div>

        {/* Mode toggle for manual override */}
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
            <h1 className="text-3xl font-bold text-gray-900">Google Drive</h1>
            <p className="mt-2 text-sm text-gray-600">
              Analyze your Drive files, permissions, and security risks
            </p>
          </div>

          {/* Auth type badge */}
          {status?.isConnected && (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                status.authType === 'service_account'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {status.authType === 'service_account' ? (
                  <>
                    <Building2 className="w-3 h-3" />
                    Business Mode
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3" />
                    Personal Mode
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-8">
        <ConnectDrive onConnected={checkStatus} />
      </div>

      {/* Main Content - Only show if connected */}
      {status?.isConnected && (
        <>
          {/* View Toggle */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setView('files')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === 'files'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Files
            </button>

            {view === 'files' && (
              <button
                onClick={handleDiscover}
                disabled={discovering}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {discovering ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Discovering...
                  </>
                ) : (
                  <>Discover Files</>
                )}
              </button>
            )}
          </div>

          {/* Analytics View */}
          {view === 'analytics' && <DriveAnalytics />}

          {/* Files View */}
          {view === 'files' && (
            <DriveAssetList
              assets={assets}
              onViewAsset={handleViewAsset}
              onRefreshAsset={handleRefreshAsset}
              loading={assetsLoading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              search={search}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
              totalCount={totalAssets}
              onDiscover={handleDiscover}
            />
          )}
        </>
      )}

      {/* Not Connected State */}
      {!status?.isConnected && !showOnboarding && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Google Drive to start analyzing your files.
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
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onRefresh={handleRefreshAsset}
        />
      )}
    </div>
  );
}
