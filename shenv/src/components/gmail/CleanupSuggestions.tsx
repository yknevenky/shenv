import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Eye, Trash2 } from 'lucide-react';
import type { GmailSender } from '../../services/gmail';

interface CleanupSuggestionsProps {
    senders: GmailSender[];
    onReview: (sender: GmailSender) => void;
    onDelete: (sender: GmailSender) => void;
}

export function CleanupSuggestions({ senders, onReview, onDelete }: CleanupSuggestionsProps) {
    const [isOpen, setIsOpen] = useState(true);

    const top5 = [...senders]
        .sort((a, b) => b.emailCount - a.emailCount)
        .slice(0, 5);

    if (top5.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Inbox Cleanup Suggestions</h3>
                    <span className="text-xs text-gray-400">Top senders by volume</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {isOpen && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {top5.map((sender) => (
                        <div key={sender.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {sender.senderName || sender.senderEmail}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{sender.senderEmail}</p>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 flex-shrink-0">
                                    {sender.emailCount.toLocaleString()} emails
                                </span>
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                                <button
                                    onClick={() => onReview(sender)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Review emails"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(sender)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete all emails"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
