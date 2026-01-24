import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LogOut } from 'lucide-react';
import { gmailApi } from '../services/gmail';
import type { GmailSender, GmailEmail } from '../services/gmail';
import { ConnectGmail } from '../components/gmail/ConnectGmail';
import { StatsOverview } from '../components/gmail/StatsOverview';
import { SenderList } from '../components/gmail/SenderList';
import { EmailViewer } from '../components/gmail/EmailViewer';

export function GmailDashboard() {
    const navigate = useNavigate();
    const [initLoading, setInitLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Stats
    const [stats, setStats] = useState({ totalEmails: 0, uniqueSenders: 0 });

    // Senders list
    const [senders, setSenders] = useState<GmailSender[]>([]);
    const [sendersLoading, setSendersLoading] = useState(false);
    const [sendersPage, setSendersPage] = useState(0);
    const [hasMoreSenders, setHasMoreSenders] = useState(true);

    // Email Viewer
    const [selectedSender, setSelectedSender] = useState<GmailSender | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [emails, setEmails] = useState<GmailEmail[]>([]);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [emailsPage, setEmailsPage] = useState(0);
    const [hasMoreEmails, setHasMoreEmails] = useState(true);

    const [error, setError] = useState('');

    // Initial check
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const { data } = await gmailApi.getStatus();
            setIsConnected(data.isConnected);
            if (data.isConnected) {
                await loadInitialData();
            }
        } catch (err) {
            console.error('Failed to check status', err);
        } finally {
            setInitLoading(false);
        }
    };

    const loadInitialData = async () => {
        setRefreshing(true);
        try {
            // Reset lists
            setSendersPage(0);
            setHasMoreSenders(true);

            const response = await gmailApi.getSenders(20, 0);
            setSenders(response.data.senders);
            setHasMoreSenders(response.data.hasMore);

            // Calculate basic stats from first page for now (or improve backend to return totals)
            // In a real app, backend should return stats in metadata
            setStats({
                totalEmails: response.data.senders.reduce((acc, s) => acc + s.emailCount, 0), // Approximation
                uniqueSenders: response.data.total
            });

        } catch (err) {
            setError('Failed to load data');
        } finally {
            setRefreshing(false);
        }
    };

    const handleDiscover = async () => {
        setRefreshing(true);
        setError('');
        try {
            await gmailApi.discover();
            await loadInitialData();
        } catch (err) {
            setError('Discovery failed. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    const loadMoreSenders = async () => {
        if (sendersLoading || !hasMoreSenders) return;
        setSendersLoading(true);
        try {
            const nextPage = sendersPage + 1;
            const response = await gmailApi.getSenders(20, nextPage * 20);
            setSenders(prev => [...prev, ...response.data.senders]);
            setHasMoreSenders(response.data.hasMore);
            setSendersPage(nextPage);
        } catch (err) {
            console.error('Failed to load more senders', err);
        } finally {
            setSendersLoading(false);
        }
    };

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

    const handleDeleteSender = async (sender: GmailSender) => {
        setRefreshing(true);
        try {
            await gmailApi.deleteSender(sender.id);
            setSenders(prev => prev.filter(s => s.id !== sender.id));
            // Update stats
            setStats(prev => ({
                ...prev,
                uniqueSenders: prev.uniqueSenders - 1,
                totalEmails: prev.totalEmails - sender.emailCount
            }));
        } catch (err) {
            setError('Failed to delete sender');
        } finally {
            setRefreshing(false);
        }
    };

    const handleBulkDelete = async (senderIds: number[]) => {
        setRefreshing(true);
        try {
            await gmailApi.bulkDeleteSenders(senderIds);
            setSenders(prev => prev.filter(s => !senderIds.includes(s.id)));
            // Note: updating stats accurately here is complex without refetching
            await loadInitialData();
        } catch (err) {
            setError('Failed to bulk delete');
        } finally {
            setRefreshing(false);
        }
    };

    const handleRevoke = async () => {
        if (!confirm('Are you sure? This will delete all your email data from Shenv.')) return;
        try {
            await gmailApi.revoke();
            setIsConnected(false);
            setSenders([]);
            setStats({ totalEmails: 0, uniqueSenders: 0 });
        } catch (err) {
            setError('Failed to revoke access');
        }
    };

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
                        <h1 className="text-xl font-semibold text-gray-900">Gmail Clean Up</h1>
                    </div>

                    {isConnected && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDiscover}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                Sync Now
                            </button>
                            <button
                                onClick={handleRevoke}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {!isConnected ? (
                    <div className="mt-12">
                        <ConnectGmail />
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                {error}
                            </div>
                        )}

                        <StatsOverview
                            totalEmails={stats.totalEmails}
                            uniqueSenders={stats.uniqueSenders}
                            refreshing={refreshing}
                        />

                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Your Senders</h2>
                                <span className="text-sm text-gray-500">
                                    {stats.uniqueSenders} found
                                </span>
                            </div>

                            <SenderList
                                senders={senders}
                                onViewEmails={handleViewEmails}
                                onDeleteSender={handleDeleteSender}
                                onBulkDelete={handleBulkDelete}
                                loading={sendersLoading}
                                hasMore={hasMoreSenders}
                                onLoadMore={loadMoreSenders}
                            />
                        </div>
                    </>
                )}
            </main>

            {/* Slide-over / Modal for emails */}
            <EmailViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                sender={selectedSender}
                emails={emails}
                loading={emailsLoading}
                hasMore={hasMoreEmails}
                onLoadMore={() => selectedSender && loadSenderEmails(selectedSender.id, emailsPage + 1)}
            />
        </div>
    );
}
