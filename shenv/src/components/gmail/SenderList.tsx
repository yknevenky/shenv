import { useState } from 'react';
import { Trash2, Eye, CheckSquare, Square } from 'lucide-react';
import type { GmailSender } from '../../services/gmail';

interface SenderListProps {
    senders: GmailSender[];
    onViewEmails: (sender: GmailSender) => void;
    onDeleteSender: (sender: GmailSender) => void;
    onBulkDelete: (senderIds: number[]) => void;
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
}

export function SenderList({
    senders,
    onViewEmails,
    onDeleteSender,
    onBulkDelete,
    loading,
    hasMore,
    onLoadMore
}: SenderListProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
        if (selectedIds.size === senders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(senders.map(s => s.id)));
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (confirm(`Are you sure you want to delete all emails from ${selectedIds.size} senders? This cannot be undone.`)) {
            onBulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                        {selectedIds.size === senders.length && senders.length > 0 ? (
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

                {selectedIds.size > 0 && (
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                    </button>
                )}
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100">
                {senders.map((sender) => (
                    <div
                        key={sender.id}
                        className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${selectedIds.has(sender.id) ? 'bg-blue-50/50' : ''
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
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-gray-900 truncate">
                                        {sender.senderName || sender.senderEmail}
                                    </h3>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        {sender.emailCount} emails
                                    </span>
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
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                                title="View Emails"
                            >
                                <Eye className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm(`Delete ALL ${sender.emailCount} emails from ${sender.senderEmail}?`)) {
                                        onDeleteSender(sender);
                                    }
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete All Emails From Sender"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {senders.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-500">
                        No senders found. Try discovering emails first.
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
        </div>
    );
}
