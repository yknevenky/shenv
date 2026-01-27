import { CheckCircle, XCircle, X } from 'lucide-react';

interface DeleteResultsProps {
    isOpen: boolean;
    onClose: () => void;
    results: { deleted: number; failed: number; errors?: string[] } | null;
    onRetry?: () => void;
}

export function DeleteResults({ isOpen, onClose, results, onRetry }: DeleteResultsProps) {
    if (!isOpen || !results) return null;

    const hasFailures = results.failed > 0;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Delete Results</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg p-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-700">
                            <span className="font-semibold">{results.deleted.toLocaleString()}</span> emails deleted successfully
                        </p>
                    </div>

                    {hasFailures && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-3">
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-red-700">
                                    <span className="font-semibold">{results.failed.toLocaleString()}</span> emails failed to delete
                                </p>
                                {results.errors && results.errors.length > 0 && (
                                    <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                                        {results.errors.slice(0, 3).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {results.errors.length > 3 && (
                                            <li>...and {results.errors.length - 3} more</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    {hasFailures && onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            Retry Failed
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
