import { useRef, useEffect } from 'react';
import { X, Calendar, Tag } from 'lucide-react';
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

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity">
            <div
                className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
            >
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
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                >
                    {emails.map((email) => (
                        <div
                            key={email.id}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <h4 className="font-medium text-gray-900 leading-snug">
                                    {email.subject || '(No Subject)'}
                                </h4>
                                <span className="text-xs text-gray-500 whitespace-nowrap flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {new Date(email.receivedAt).toLocaleDateString()}
                                </span>
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

                    {!loading && emails.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No emails found
                        </div>
                    )}

                    <div ref={observerTarget} className="h-4" />
                </div>
            </div>
        </div>
    );
}
