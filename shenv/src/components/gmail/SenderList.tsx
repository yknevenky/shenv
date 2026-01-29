import { useState } from 'react';
import {
    Trash2, Eye, CheckSquare, Square, Search,
    ArrowUp, ArrowDown, Inbox, Paperclip, ShieldAlert,
    ShieldCheck, Mail, MailX
} from 'lucide-react';
import type { GmailSender } from '../../services/gmail';
import { ExportButton } from './ExportButton';

interface SenderListProps {
    senders: GmailSender[];
    onViewEmails: (sender: GmailSender) => void;
    onDeleteSender: (sender: GmailSender) => void;
    onBulkDelete: (senderIds: number[]) => void;
    onUnsubscribe: (sender: GmailSender) => void;
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    search: string;
    onSearchChange: (value: string) => void;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    totalCount: number;
    onScanInbox?: () => void;
}

const SORT_OPTIONS = [
    { value: 'emailCount', label: 'Email Count' },
    { value: 'lastEmailDate', label: 'Last Email' },
    { value: 'firstEmailDate', label: 'First Email' },
    { value: 'senderName', label: 'Name' },
    { value: 'senderEmail', label: 'Email Address' },
];

type QuickFilter = 'all' | 'high_volume' | 'recent' | 'verified' | 'unverified' | 'has_attachments' | 'can_unsubscribe';

export function SenderList({
    senders,
    onViewEmails,
    onDeleteSender,
    onBulkDelete,
    onUnsubscribe,
    loading,
    hasMore,
    onLoadMore,
    search,
    onSearchChange,
    sortBy,
    sortOrder,
    onSortChange,
    totalCount,
    onScanInbox,
}: SenderListProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        const filteredSendersList = getFilteredSenders();
        if (selectedIds.size === filteredSendersList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredSendersList.map(s => s.id)));
        }
    };

    const handleQuickFilter = (filter: QuickFilter) => {
        setActiveFilter(filter);
        if (filter === 'all') {
            onSearchChange('');
            onSortChange('emailCount', 'desc');
        } else if (filter === 'high_volume') {
            onSearchChange('');
            onSortChange('emailCount', 'desc');
        } else if (filter === 'recent') {
            onSearchChange('');
            onSortChange('lastEmailDate', 'desc');
        } else if (filter === 'verified') {
            onSearchChange('');
            onSortChange('emailCount', 'desc');
        } else if (filter === 'unverified') {
            onSearchChange('');
            onSortChange('emailCount', 'desc');
        } else if (filter === 'has_attachments') {
            onSearchChange('');
            onSortChange('emailCount', 'desc');
        } else if (filter === 'can_unsubscribe') {
            onSearchChange('');
            onSortChange('emailCount', 'desc');
        }
    };

    // Apply client-side filters
    const getFilteredSenders = () => {
        if (activeFilter === 'all') return senders;

        return senders.filter(sender => {
            switch (activeFilter) {
                case 'high_volume':
                    return sender.emailCount >= 50;
                case 'recent':
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return new Date(sender.lastEmailDate) >= sevenDaysAgo;
                case 'verified':
                    return sender.isVerified === true;
                case 'unverified':
                    return sender.isVerified === false;
                case 'has_attachments':
                    return sender.attachmentCount > 0;
                case 'can_unsubscribe':
                    return sender.hasUnsubscribe && !sender.isUnsubscribed;
                default:
                    return true;
            }
        });
    };

    const filteredSenders = getFilteredSenders();

    const selectedSenders = filteredSenders.filter(s => selectedIds.has(s.id));
    const estimatedEmails = selectedSenders.reduce((acc, s) => acc + s.emailCount, 0);

    // Empty state
    if (filteredSenders.length === 0 && !loading && !search && activeFilter === 'all') {
        return (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No senders found</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    Scan your inbox to discover who sends you the most emails and start cleaning up.
                </p>
                {onScanInbox && (
                    <button
                        onClick={onScanInbox}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Scan Inbox
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Search bar */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search senders..."
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Sort & Filters row */}
            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3 bg-gray-50">
                <div className="flex items-center gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value, sortOrder)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-gray-600" />
                        ) : (
                            <ArrowDown className="w-4 h-4 text-gray-600" />
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                    {(['all', 'high_volume', 'recent', 'verified', 'unverified', 'has_attachments', 'can_unsubscribe'] as QuickFilter[]).map(f => {
                        const labels: Record<QuickFilter, string> = {
                            all: 'All',
                            high_volume: 'High Volume (50+)',
                            recent: 'Recent (7d)',
                            verified: '✓ Verified',
                            unverified: '⚠ Unverified',
                            has_attachments: '📎 Attachments',
                            can_unsubscribe: '📬 Can Unsubscribe',
                        };

                        return (
                            <button
                                key={f}
                                onClick={() => handleQuickFilter(f)}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    activeFilter === f
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                        {filteredSenders.length} {activeFilter !== 'all' ? 'filtered' : ''} of {totalCount} senders
                    </span>
                    <ExportButton senders={filteredSenders} />
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                        {selectedIds.size === filteredSenders.length && filteredSenders.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                        )}
                        Select All
                    </button>

                    {selectedIds.size > 0 && (
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {selectedIds.size} selected
                        </span>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100">
                {filteredSenders.map((sender) => (
                    <div
                        key={sender.id}
                        className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                            selectedIds.has(sender.id) ? 'bg-blue-50/50' : ''
                        }`}
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <button
                                onClick={() => toggleSelect(sender.id)}
                                className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                            >
                                {selectedIds.has(sender.id) ? (
                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <Square className="w-5 h-5" />
                                )}
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium text-gray-900 truncate">
                                        {sender.senderName || sender.senderEmail}
                                    </h3>

                                    {/* Email count badge */}
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                                        <Mail className="w-3 h-3 mr-1" />
                                        {sender.emailCount}
                                    </span>

                                    {/* Attachment count badge */}
                                    {sender.attachmentCount > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 flex-shrink-0">
                                            <Paperclip className="w-3 h-3 mr-1" />
                                            {sender.attachmentCount}
                                        </span>
                                    )}

                                    {/* Unverified badge */}
                                    {!sender.isVerified && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 flex-shrink-0" title="Failed SPF/DKIM verification">
                                            <ShieldAlert className="w-3 h-3 mr-1" />
                                            Unverified
                                        </span>
                                    )}

                                    {/* Verified badge */}
                                    {sender.isVerified && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 flex-shrink-0" title="Passed SPF/DKIM verification">
                                            <ShieldCheck className="w-3 h-3 mr-1" />
                                            Verified
                                        </span>
                                    )}

                                    {/* Unsubscribed badge */}
                                    {sender.isUnsubscribed && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 flex-shrink-0">
                                            <MailX className="w-3 h-3 mr-1" />
                                            Unsubscribed
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                    {sender.senderEmail}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Last email: {new Date(sender.lastEmailDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => onViewEmails(sender)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Emails"
                            >
                                <Eye className="w-5 h-5" />
                            </button>

                            {/* Unsubscribe button - only show if sender has unsubscribe capability and not already unsubscribed */}
                            {sender.hasUnsubscribe && !sender.isUnsubscribed && (
                                <button
                                    onClick={() => onUnsubscribe(sender)}
                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Unsubscribe from this sender"
                                >
                                    <MailX className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={() => onDeleteSender(sender)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete All Emails From Sender"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty states for filters */}
                {filteredSenders.length === 0 && !loading && activeFilter !== 'all' && (
                    <div className="p-12 text-center text-gray-500">
                        No senders match the selected filter
                    </div>
                )}

                {filteredSenders.length === 0 && !loading && search && activeFilter === 'all' && (
                    <div className="p-12 text-center text-gray-500">
                        No senders match "{search}"
                    </div>
                )}

                {hasMore && (
                    <div className="p-4 text-center">
                        <button
                            onClick={onLoadMore}
                            disabled={loading}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Load more senders'}
                        </button>
                    </div>
                )}
            </div>

            {/* Sticky action bar when items selected */}
            {selectedIds.size > 0 && (
                <div className="sticky bottom-0 bg-white border-t-2 border-blue-200 p-4 flex items-center justify-between shadow-lg">
                    <div className="text-sm text-gray-700">
                        <span className="font-semibold">{selectedIds.size} senders</span> selected
                        <span className="text-gray-400 ml-2">
                            (~{estimatedEmails.toLocaleString()} emails)
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Deselect All
                        </button>
                        <button
                            onClick={() => onBulkDelete(Array.from(selectedIds))}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
