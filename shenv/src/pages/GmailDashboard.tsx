import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LogOut, Eye, EyeOff, X } from 'lucide-react';
import { gmailApi } from '../services/gmail';
import type { GmailSender, GmailEmail, InboxStats } from '../services/gmail';
import { ConnectGmail } from '../components/gmail/ConnectGmail';
import { InboxOverview } from '../components/gmail/InboxOverview';
import { DataFreshness } from '../components/gmail/DataFreshness';
import { CleanupSuggestions } from '../components/gmail/CleanupSuggestions';
import { SenderList } from '../components/gmail/SenderList';
import { EmailViewer } from '../components/gmail/EmailViewer';
import { LabelsBreakdown } from '../components/gmail/LabelsBreakdown';
import { ActivityLog, addActivity } from '../components/gmail/ActivityLog';
import { DiscoveryWizard } from '../components/gmail/DiscoveryWizard';
import { ConfirmDialog } from '../components/gmail/ConfirmDialog';
import { DangerConfirmDialog } from '../components/gmail/DangerConfirmDialog';
import { DeleteResults } from '../components/gmail/DeleteResults';

export function GmailDashboard() {
    const navigate = useNavigate();

    // Connection state
    const [initLoading, setInitLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Inbox stats
    const [inboxStats, setInboxStats] = useState<InboxStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // Senders list
    const [senders, setSenders] = useState<GmailSender[]>([]);
    const [sendersLoading, setSendersLoading] = useState(false);
    const [sendersPage, setSendersPage] = useState(0);
    const [hasMoreSenders, setHasMoreSenders] = useState(true);
    const [senderStats, setSenderStats] = useState<{ totalSenders: number; totalEmails: number } | null>(null);

    // Search / Sort / Filter
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('emailCount');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Focus mode
    const [focusMode, setFocusMode] = useState(false);

    // Discovery wizard
    const [discoveryWizardOpen, setDiscoveryWizardOpen] = useState(false);

    // Email viewer
    const [selectedSender, setSelectedSender] = useState<GmailSender | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [emails, setEmails] = useState<GmailEmail[]>([]);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [emailsPage, setEmailsPage] = useState(0);
    const [hasMoreEmails, setHasMoreEmails] = useState(true);

    // Confirm dialogs
    const [confirmState, setConfirmState] = useState<{
        type: 'single_delete' | 'disconnect' | null;
        sender?: GmailSender;
    }>({ type: null });
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Bulk delete dialog
    const [bulkDeleteIds, setBulkDeleteIds] = useState<number[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

    // Delete results
    const [deleteResults, setDeleteResults] = useState<{ deleted: number; failed: number; errors?: string[] } | null>(null);
    const [deleteResultsOpen, setDeleteResultsOpen] = useState(false);

    // Data freshness
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

    // Error
    const [error, setError] = useState('');

    // Sync flag
    const [refreshing, setRefreshing] = useState(false);

    // Debounce search
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    // Reload senders when search/sort changes
    useEffect(() => {
        if (isConnected) {
            loadSenders(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, sortBy, sortOrder]);

    // Initial check
    useEffect(() => {
        checkStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkStatus = async () => {
        try {
            const { data } = await gmailApi.getStatus();
            setIsConnected(data.isConnected);
            if (data.isConnected) {
                await loadAllData();
            }
        } catch (err) {
            console.error('Failed to check status', err);
        } finally {
            setInitLoading(false);
        }
    };

    const loadAllData = async () => {
        await Promise.all([
            loadInboxStats(),
            loadSenders(true),
        ]);
    };

    const loadInboxStats = async () => {
        setStatsLoading(true);
        try {
            const result = await gmailApi.getInboxStats();
            setInboxStats(result.data);
        } catch (err) {
            // Stats might not be available, non-critical
            console.error('Failed to load inbox stats', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const loadSenders = async (reset: boolean) => {
        setSendersLoading(true);
        try {
            const offset = reset ? 0 : (sendersPage + 1) * 20;
            const response = await gmailApi.getSenders(20, offset, sortBy, sortOrder, debouncedSearch || undefined);

            if (reset) {
                setSenders(response.data.senders);
                setSendersPage(0);
            } else {
                setSenders(prev => [...prev, ...response.data.senders]);
                setSendersPage(prev => prev + 1);
            }
            setHasMoreSenders(response.data.pagination.hasMore);
            setSenderStats(response.data.stats);

            // Track last synced from first sender's data
            if (response.data.senders.length > 0) {
                setLastSyncedAt(new Date(response.data.senders[0].lastSyncedAt));
            }
        } catch (err) {
            // If the new response shape fails, fallback to old shape
            try {
                const response = await gmailApi.getSenders(20, reset ? 0 : (sendersPage + 1) * 20);
                const data = response.data as any;
                const sendersList = data.senders || [];
                if (reset) {
                    setSenders(sendersList);
                    setSendersPage(0);
                } else {
                    setSenders(prev => [...prev, ...sendersList]);
                    setSendersPage(prev => prev + 1);
                }
                setHasMoreSenders(data.hasMore ?? data.pagination?.hasMore ?? false);
                const total = data.total ?? data.pagination?.total ?? sendersList.length;
                const totalEmails = sendersList.reduce((acc: number, s: GmailSender) => acc + s.emailCount, 0);
                setSenderStats({ totalSenders: total, totalEmails });
                if (sendersList.length > 0) {
                    setLastSyncedAt(new Date(sendersList[0].lastSyncedAt));
                }
            } catch (err2) {
                setError('Failed to load senders');
            }
        } finally {
            setSendersLoading(false);
        }
    };

    const handleSyncNow = async () => {
        setRefreshing(true);
        setError('');
        try {
            await gmailApi.discover();
            await loadAllData();
            addActivity('scan', 'Synced inbox data');
        } catch (err) {
            setError('Sync failed. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleRefreshSenders = async () => {
        setRefreshing(true);
        try {
            await loadAllData();
        } finally {
            setRefreshing(false);
        }
    };

    // Sort/Search handlers
    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
    };

    // Email viewer
    const handleViewEmails = async (sender: GmailSender) => {
        setSelectedSender(sender);
        setViewerOpen(true);
        setEmails([]);
        setEmailsPage(0);
        setHasMoreEmails(true);
        await loadSenderEmails(sender.id, 0);
    };

    const loadSenderEmails = async (senderId: number, page: number) => {
        setEmailsLoading(true);
        try {
            const response = await gmailApi.getSenderEmails(senderId, 10, page * 10);
            if (page === 0) {
                setEmails(response.data.emails);
            } else {
                setEmails(prev => [...prev, ...response.data.emails]);
            }
            setHasMoreEmails(response.data.hasMore);
            setEmailsPage(page);
        } catch (err) {
            console.error('Failed to load emails', err);
        } finally {
            setEmailsLoading(false);
        }
    };

    // Single delete (via ConfirmDialog)
    const handleDeleteSender = (sender: GmailSender) => {
        setConfirmState({ type: 'single_delete', sender });
    };

    const executeSingleDelete = async () => {
        if (!confirmState.sender) return;
        setConfirmLoading(true);
        try {
            const result = await gmailApi.deleteSender(confirmState.sender.id);
            setSenders(prev => prev.filter(s => s.id !== confirmState.sender!.id));
            setSenderStats(prev => prev ? {
                totalSenders: prev.totalSenders - 1,
                totalEmails: prev.totalEmails - confirmState.sender!.emailCount,
            } : null);
            addActivity('delete', `Deleted emails from ${confirmState.sender.senderEmail}`);
            setConfirmState({ type: null });
            if (result.data) {
                setDeleteResults(result.data);
                setDeleteResultsOpen(true);
            }
        } catch (err) {
            setError('Failed to delete sender');
        } finally {
            setConfirmLoading(false);
        }
    };

    // Bulk delete (via DangerConfirmDialog)
    const handleBulkDelete = (senderIds: number[]) => {
        setBulkDeleteIds(senderIds);
        setBulkDeleteOpen(true);
    };

    const executeBulkDelete = async () => {
        setBulkDeleteLoading(true);
        try {
            const result = await gmailApi.bulkDeleteSenders(bulkDeleteIds);
            const deletedCount = bulkDeleteIds.length;
            setSenders(prev => prev.filter(s => !bulkDeleteIds.includes(s.id)));
            addActivity('bulk_delete', `Bulk deleted ${deletedCount} senders`);
            setBulkDeleteOpen(false);
            setBulkDeleteIds([]);
            if (result.data) {
                setDeleteResults(result.data);
                setDeleteResultsOpen(true);
            }
            // Reload to get accurate stats
            await loadSenders(true);
        } catch (err) {
            setError('Failed to bulk delete');
        } finally {
            setBulkDeleteLoading(false);
        }
    };

    // Unsubscribe
    const handleUnsubscribe = async (sender: GmailSender) => {
        try {
            const result = await gmailApi.unsubscribe(sender.id);

            // Update sender in local state to mark as unsubscribed
            setSenders(prev => prev.map(s =>
                s.id === sender.id
                    ? { ...s, isUnsubscribed: true, unsubscribedAt: new Date().toISOString() }
                    : s
            ));

            addActivity('unsubscribe', `Unsubscribed from ${sender.senderEmail}`);

            // Open unsubscribe link in new tab
            if (result.data?.unsubscribeLink) {
                window.open(result.data.unsubscribeLink, '_blank');
            }

            setError(''); // Clear any previous errors
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to unsubscribe');
        }
    };

    // Disconnect
    const handleDisconnect = () => {
        setConfirmState({ type: 'disconnect' });
    };

    const executeDisconnect = async () => {
        setConfirmLoading(true);
        try {
            await gmailApi.revoke();
            setIsConnected(false);
            setSenders([]);
            setSenderStats(null);
            setInboxStats(null);
            addActivity('revoke', 'Disconnected Gmail account');
            setConfirmState({ type: null });
        } catch (err) {
            setError('Failed to revoke access');
        } finally {
            setConfirmLoading(false);
        }
    };

    // Discovery complete
    const handleDiscoveryComplete = useCallback(async () => {
        addActivity('scan', 'Completed inbox scan');
        await loadAllData();
    }, []);

    // Cleanup suggestion delete
    const handleSuggestionDelete = (sender: GmailSender) => {
        handleDeleteSender(sender);
    };

    // Estimated emails for bulk
    const bulkEstimatedEmails = bulkDeleteIds.reduce((acc, id) => {
        const sender = senders.find(s => s.id === id);
        return acc + (sender?.emailCount || 0);
    }, 0);

    if (initLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900">Gmail Manager</h1>
                        {isConnected && (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Connected
                            </span>
                        )}
                    </div>

                    {isConnected && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSyncNow}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                Sync
                            </button>
                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    focusMode
                                        ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                                        : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                }`}
                                title={focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
                            >
                                {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {focusMode ? 'Exit Focus' : 'Focus'}
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {!isConnected ? (
                    <div className="mt-12">
                        <ConnectGmail />
                    </div>
                ) : (
                    <>
                        {/* Error banner */}
                        {error && (
                            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                <span className="text-sm">{error}</span>
                                <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Data freshness */}
                        <DataFreshness
                            lastSyncedAt={lastSyncedAt}
                            isLive={refreshing}
                            onRefresh={handleRefreshSenders}
                            refreshing={refreshing}
                        />

                        {/* Inbox overview - hidden in focus mode */}
                        {!focusMode && (
                            <InboxOverview
                                inboxStats={inboxStats}
                                senderStats={senderStats}
                                loading={statsLoading}
                            />
                        )}

                        {/* Cleanup suggestions - hidden in focus mode */}
                        {!focusMode && senders.length > 0 && (
                            <CleanupSuggestions
                                senders={senders}
                                onReview={handleViewEmails}
                                onDelete={handleSuggestionDelete}
                            />
                        )}

                        {/* Sender list (main workbench) */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold text-gray-900">Senders</h2>
                            </div>
                            <SenderList
                                senders={senders}
                                onViewEmails={handleViewEmails}
                                onDeleteSender={handleDeleteSender}
                                onBulkDelete={handleBulkDelete}
                                onUnsubscribe={handleUnsubscribe}
                                loading={sendersLoading}
                                hasMore={hasMoreSenders}
                                onLoadMore={() => loadSenders(false)}
                                search={search}
                                onSearchChange={handleSearchChange}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                                totalCount={senderStats?.totalSenders || 0}
                                onScanInbox={() => setDiscoveryWizardOpen(true)}
                            />
                        </div>

                        {/* Labels breakdown - hidden in focus mode */}
                        {!focusMode && inboxStats && (
                            <LabelsBreakdown
                                labels={[...inboxStats.systemLabels, ...inboxStats.userLabels]}
                                loading={statsLoading}
                            />
                        )}

                        {/* Activity log - hidden in focus mode */}
                        {!focusMode && (
                            <ActivityLog />
                        )}
                    </>
                )}
            </main>

            {/* Discovery wizard modal */}
            <DiscoveryWizard
                isOpen={discoveryWizardOpen}
                onClose={() => setDiscoveryWizardOpen(false)}
                onComplete={handleDiscoveryComplete}
            />

            {/* Email viewer slide-over */}
            <EmailViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                sender={selectedSender}
                emails={emails}
                loading={emailsLoading}
                hasMore={hasMoreEmails}
                onLoadMore={() => selectedSender && loadSenderEmails(selectedSender.id, emailsPage + 1)}
            />

            {/* Single delete confirm */}
            <ConfirmDialog
                isOpen={confirmState.type === 'single_delete'}
                onClose={() => setConfirmState({ type: null })}
                onConfirm={executeSingleDelete}
                title="Delete Sender Emails"
                message={`Are you sure you want to delete all ${confirmState.sender?.emailCount || 0} emails from ${confirmState.sender?.senderEmail || 'this sender'}? This cannot be undone.`}
                confirmLabel="Delete All"
                confirmVariant="danger"
                loading={confirmLoading}
            />

            {/* Disconnect confirm */}
            <ConfirmDialog
                isOpen={confirmState.type === 'disconnect'}
                onClose={() => setConfirmState({ type: null })}
                onConfirm={executeDisconnect}
                title="Disconnect Gmail"
                message="Are you sure? This will delete all your email data from Shenv and revoke access."
                confirmLabel="Disconnect"
                confirmVariant="danger"
                loading={confirmLoading}
            />

            {/* Bulk delete confirm */}
            <DangerConfirmDialog
                isOpen={bulkDeleteOpen}
                onClose={() => { setBulkDeleteOpen(false); setBulkDeleteIds([]); }}
                onConfirm={executeBulkDelete}
                title="Bulk Delete Emails"
                message={`This will permanently delete emails from ${bulkDeleteIds.length} senders (~${bulkEstimatedEmails.toLocaleString()} emails) from Gmail and local database.`}
                confirmWord="DELETE"
                itemCount={bulkEstimatedEmails}
                itemDescription="emails"
                loading={bulkDeleteLoading}
            />

            {/* Delete results */}
            <DeleteResults
                isOpen={deleteResultsOpen}
                onClose={() => { setDeleteResultsOpen(false); setDeleteResults(null); }}
                results={deleteResults}
            />
        </div>
    );
}
