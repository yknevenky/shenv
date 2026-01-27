import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Calendar, Tag, Paperclip, Search, MoreHorizontal, Copy } from 'lucide-react';
import type { GmailEmail, GmailSender } from '../../services/gmail';

interface EmailViewerProps {
    isOpen: boolean;
    onClose: () => void;
    sender: GmailSender | null;
    emails: GmailEmail[];
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
}

function CopyMenu({ email, onClose }: { email: GmailEmail; onClose: () => void }) {
    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback: no-op
        }
        onClose();
    };

    return (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-48">
            <button
                onClick={() => handleCopy(email.gmailMessageId)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
            >
                <Copy className="w-3 h-3" />
                Copy Message ID
            </button>
            <button
                onClick={() => handleCopy(email.threadId)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
            >
                <Copy className="w-3 h-3" />
                Copy Thread ID
            </button>
        </div>
    );
}

export function EmailViewer({
    isOpen,
    onClose,
    sender,
    emails,
    loading,
    hasMore,
    onLoadMore
}: EmailViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setSearchQuery('');
            setOpenMenuId(null);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    onLoadMore();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore]);

    // Close copy menu on outside click
    useEffect(() => {
        const handleClick = () => setOpenMenuId(null);
        if (openMenuId !== null) {
            document.addEventListener('click', handleClick);
        }
        return () => document.removeEventListener('click', handleClick);
    }, [openMenuId]);

    const filteredEmails = useMemo(() => {
        if (!searchQuery.trim()) return emails;
        const q = searchQuery.toLowerCase();
        return emails.filter(
            e => e.subject?.toLowerCase().includes(q) || e.snippet?.toLowerCase().includes(q)
        );
    }, [emails, searchQuery]);

    const unreadCount = useMemo(() => emails.filter(e => !e.isRead).length, [emails]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-1">
                                {sender?.senderName || sender?.senderEmail}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {sender?.emailCount} emails
                                {unreadCount > 0 && (
                                    <span className="text-amber-600 ml-1">({unreadCount} unread)</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search emails..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
                >
                    {filteredEmails.map((email) => (
                        <div
                            key={email.id}
                            className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${
                                !email.isRead ? 'border-l-4 border-l-blue-500' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {!email.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                    )}
                                    <h4 className={`leading-snug truncate ${
                                        !email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                                    }`}>
                                        {email.subject || '(No Subject)'}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {email.hasAttachment && (
                                        <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                    <span className="text-xs text-gray-500 whitespace-nowrap flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(email.receivedAt).toLocaleDateString()}
                                    </span>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === email.id ? null : email.id);
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                        {openMenuId === email.id && (
                                            <CopyMenu
                                                email={email}
                                                onClose={() => setOpenMenuId(null)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {email.snippet}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {email.labels?.map((label) => (
                                    <span
                                        key={label}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                        <Tag className="w-3 h-3 mr-1 opacity-50" />
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="py-8 text-center text-gray-500">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Loading emails...
                        </div>
                    )}

                    {!loading && filteredEmails.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            {searchQuery ? `No emails match "${searchQuery}"` : 'No emails found'}
                        </div>
                    )}

                    <div ref={observerTarget} className="h-4" />
                </div>
            </div>
        </div>
    );
}
