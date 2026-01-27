import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Zap, Database, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { gmailApi } from '../../services/gmail';

interface DiscoveryWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

type Phase = 'MODE_SELECT' | 'SCANNING' | 'RESULTS';
type ScanMode = 'quick' | 'deep';

interface ScanProgress {
    messagesProcessed: number;
    uniqueSenders: number;
    pagesCompleted: number;
    hasMore: boolean;
    nextPageToken?: string;
}

const AUTO_CONTINUE_LIMITS = [500, 1000, 2000, 5000];

export function DiscoveryWizard({ isOpen, onClose, onComplete }: DiscoveryWizardProps) {
    const [phase, setPhase] = useState<Phase>('MODE_SELECT');
    const [scanMode, setScanMode] = useState<ScanMode>('quick');
    const [autoContinue, setAutoContinue] = useState(true);
    const [autoContinueLimit, setAutoContinueLimit] = useState(1000);
    const [progress, setProgress] = useState<ScanProgress>({
        messagesProcessed: 0,
        uniqueSenders: 0,
        pagesCompleted: 0,
        hasMore: false,
    });
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const stopRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            setPhase('MODE_SELECT');
            setProgress({ messagesProcessed: 0, uniqueSenders: 0, pagesCompleted: 0, hasMore: false });
            setError('');
            setScanning(false);
            stopRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && phase !== 'SCANNING') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, phase, onClose]);

    const runScan = useCallback(async (mode: ScanMode) => {
        setScanMode(mode);
        setPhase('SCANNING');
        setScanning(true);
        setError('');
        stopRef.current = false;

        let pageToken: string | undefined;
        let totalProcessed = 0;
        let totalSenders = 0;
        let pages = 0;
        let hasMore = false;

        try {
            do {
                if (stopRef.current) break;

                let result;
                if (mode === 'quick') {
                    result = await gmailApi.fetchSenders(200, pageToken);
                    totalProcessed += result.data.messagesProcessed;
                    totalSenders = result.data.uniqueSendersFound;
                    pageToken = result.data.nextPageToken;
                    hasMore = result.data.hasMore;
                } else {
                    result = await gmailApi.discover(200, pageToken);
                    totalProcessed += result.data.fetchedEmails;
                    totalSenders = result.data.uniqueSenders;
                    pageToken = result.data.nextPageToken;
                    hasMore = result.data.hasMore;
                }

                pages++;
                setProgress({
                    messagesProcessed: totalProcessed,
                    uniqueSenders: totalSenders,
                    pagesCompleted: pages,
                    hasMore,
                    nextPageToken: pageToken,
                });

                // Auto-continue check
                if (!autoContinue || totalProcessed >= autoContinueLimit) {
                    break;
                }
            } while (hasMore && pageToken);
        } catch (err) {
            setError('Scan failed. You can retry or close.');
        } finally {
            setScanning(false);
            setPhase('RESULTS');
        }
    }, [autoContinue, autoContinueLimit]);

    const handleContinue = useCallback(async () => {
        if (!progress.nextPageToken) return;
        setPhase('SCANNING');
        setScanning(true);
        setError('');
        stopRef.current = false;

        let pageToken: string | undefined = progress.nextPageToken;
        let totalProcessed = progress.messagesProcessed;
        let totalSenders = progress.uniqueSenders;
        let pages = progress.pagesCompleted;
        let hasMore = false;

        try {
            do {
                if (stopRef.current) break;

                let result;
                if (scanMode === 'quick') {
                    result = await gmailApi.fetchSenders(200, pageToken);
                    totalProcessed += result.data.messagesProcessed;
                    totalSenders = result.data.uniqueSendersFound;
                    pageToken = result.data.nextPageToken;
                    hasMore = result.data.hasMore;
                } else {
                    result = await gmailApi.discover(200, pageToken);
                    totalProcessed += result.data.fetchedEmails;
                    totalSenders = result.data.uniqueSenders;
                    pageToken = result.data.nextPageToken;
                    hasMore = result.data.hasMore;
                }

                pages++;
                setProgress({
                    messagesProcessed: totalProcessed,
                    uniqueSenders: totalSenders,
                    pagesCompleted: pages,
                    hasMore,
                    nextPageToken: pageToken,
                });

                if (!autoContinue || totalProcessed >= autoContinueLimit) {
                    break;
                }
            } while (hasMore && pageToken);
        } catch (err) {
            setError('Scan failed. You can retry or close.');
        } finally {
            setScanning(false);
            setPhase('RESULTS');
        }
    }, [scanMode, autoContinue, autoContinueLimit, progress]);

    const handleStop = () => {
        stopRef.current = true;
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
                        {phase === 'MODE_SELECT' && 'Scan Your Inbox'}
                        {phase === 'SCANNING' && 'Scanning...'}
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
                    {/* MODE_SELECT */}
                    {phase === 'MODE_SELECT' && (
                        <>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button
                                    onClick={() => runScan('quick')}
                                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                                >
                                    <div className="p-2 bg-blue-50 rounded-lg w-fit mb-3 group-hover:bg-blue-100">
                                        <Zap className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Quick Scan</h3>
                                    <p className="text-xs text-gray-500">Discover senders only (fast)</p>
                                </button>
                                <button
                                    onClick={() => runScan('deep')}
                                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                                >
                                    <div className="p-2 bg-indigo-50 rounded-lg w-fit mb-3 group-hover:bg-indigo-100">
                                        <Database className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Deep Scan</h3>
                                    <p className="text-xs text-gray-500">Senders + store emails</p>
                                </button>
                            </div>

                            {/* Auto-continue settings */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoContinue}
                                            onChange={(e) => setAutoContinue(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        Auto-continue scanning
                                    </label>
                                </div>
                                {autoContinue && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-500">Up to</span>
                                        <select
                                            value={autoContinueLimit}
                                            onChange={(e) => setAutoContinueLimit(Number(e.target.value))}
                                            className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {AUTO_CONTINUE_LIMITS.map(limit => (
                                                <option key={limit} value={limit}>{limit.toLocaleString()} messages</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-2xl font-bold text-gray-900">{progress.messagesProcessed.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Messages</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-2xl font-bold text-gray-900">{progress.uniqueSenders.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Senders</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-2xl font-bold text-gray-900">{progress.pagesCompleted}</p>
                                    <p className="text-xs text-gray-500">Pages</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                                <Loader className="w-4 h-4 animate-spin" />
                                Scanning {scanMode === 'quick' ? 'senders' : 'emails'}...
                            </div>

                            <button
                                onClick={handleStop}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Stop Scanning
                            </button>
                        </div>
                    )}

                    {/* RESULTS */}
                    {phase === 'RESULTS' && (
                        <div>
                            {error ? (
                                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg p-4 mb-4">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <p className="text-sm text-green-700">Scan completed successfully</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-3xl font-bold text-gray-900">{progress.messagesProcessed.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500">Messages processed</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-3xl font-bold text-gray-900">{progress.uniqueSenders.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500">Senders found</p>
                                </div>
                            </div>

                            {progress.hasMore && (
                                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-4 text-center">
                                    More emails available. You can scan again later or continue now.
                                </p>
                            )}

                            <div className="flex gap-3 justify-end">
                                {progress.hasMore && progress.nextPageToken && (
                                    <button
                                        onClick={handleContinue}
                                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        Continue Scanning
                                    </button>
                                )}
                                <button
                                    onClick={handleDone}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
