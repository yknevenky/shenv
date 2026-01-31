import { useState, useRef, useEffect } from 'react';
import { X, Inbox, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { gmailApi } from '../../services/gmail';

interface DiscoveryWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

type Phase = 'CONFIRM' | 'SCANNING' | 'RESULTS';

interface ScanProgress {
    messagesProcessed: number;
    uniqueSenders: number;
}

export function DiscoveryWizard({ isOpen, onClose, onComplete }: DiscoveryWizardProps) {
    const [phase, setPhase] = useState<Phase>('CONFIRM');
    const [progress, setProgress] = useState<ScanProgress>({
        messagesProcessed: 0,
        uniqueSenders: 0,
    });
    const [error, setError] = useState('');
    const estimatedTime = '3-5 minutes';
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setPhase('CONFIRM');
            setProgress({ messagesProcessed: 0, uniqueSenders: 0 });
            setError('');
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && phase !== 'SCANNING') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, phase, onClose]);

    const runFullScan = async () => {
        setPhase('SCANNING');
        setError('');
        abortControllerRef.current = new AbortController();

        try {
            // Call the fetch-all endpoint which auto-paginates through entire inbox
            const result = await gmailApi.fetchAllSenders();

            setProgress({
                messagesProcessed: result.data.totalMessagesProcessed,
                uniqueSenders: result.data.uniqueSendersFound,
            });

            setPhase('RESULTS');
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setError('Scan was cancelled.');
            } else {
                setError('Scan failed. Please try again.');
            }
            setPhase('RESULTS');
        } finally {
            abortControllerRef.current = null;
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleDone = () => {
        onComplete();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {phase === 'CONFIRM' && 'Scan Full Inbox'}
                        {phase === 'SCANNING' && 'Scanning Full Inbox...'}
                        {phase === 'RESULTS' && 'Scan Complete'}
                    </h2>
                    {phase !== 'SCANNING' && (
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* CONFIRM */}
                    {phase === 'CONFIRM' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                                    <Inbox className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Scan Your Entire Inbox
                                </h3>
                                <p className="text-sm text-gray-600">
                                    This will process all emails in your inbox to discover unique senders with metadata including volume, attachments, verification status, and unsubscribe links.
                                </p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-800">
                                        <p className="font-medium mb-1">This may take {estimatedTime}</p>
                                        <p className="text-xs">
                                            Processing time depends on inbox size (35,000+ emails). The scan will automatically paginate through all messages with smart rate limiting.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={runFullScan}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    Start Full Scan
                                </button>
                            </div>
                        </>
                    )}

                    {/* SCANNING */}
                    {phase === 'SCANNING' && (
                        <div className="text-center">
                            {/* Indeterminate progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
                                <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-3xl font-bold text-gray-900">{progress.messagesProcessed.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Messages Processed</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-3xl font-bold text-gray-900">{progress.uniqueSenders.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Unique Senders</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
                                <Loader className="w-4 h-4 animate-spin" />
                                Processing entire inbox with automatic pagination...
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-xs text-blue-700">
                                    This may take 3-5 minutes for large inboxes. Please keep this window open.
                                </p>
                            </div>

                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel Scan
                            </button>
                        </div>
                    )}

                    {/* RESULTS */}
                    {phase === 'RESULTS' && (
                        <div>
                            {error ? (
                                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-red-700 mb-1">{error}</p>
                                        <button
                                            onClick={runFullScan}
                                            className="text-xs text-red-600 hover:text-red-700 underline"
                                        >
                                            Retry scan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <p className="text-sm text-green-700">Full inbox scan completed successfully!</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-3xl font-bold text-gray-900">{progress.messagesProcessed.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500">Total Messages</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-3xl font-bold text-gray-900">{progress.uniqueSenders.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500">Unique Senders</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <p className="text-xs text-blue-700 text-center">
                                    All senders have been discovered with full metadata including verification status, attachments, and unsubscribe links.
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleDone}
                                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
