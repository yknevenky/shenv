import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DangerConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmWord?: string;
    itemCount: number;
    itemDescription: string;
    loading?: boolean;
}

export function DangerConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmWord = 'DELETE',
    itemCount,
    itemDescription,
    loading = false,
}: DangerConfirmDialogProps) {
    const [inputValue, setInputValue] = useState('');
    const isConfirmEnabled = inputValue === confirmWord && !loading;

    useEffect(() => {
        if (!isOpen) setInputValue('');
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, loading]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) onClose();
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{message}</p>

                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                            <p className="text-sm font-medium text-red-800">
                                This will affect {itemCount.toLocaleString()} {itemDescription}
                            </p>
                            <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Type <span className="font-bold text-red-600">{confirmWord}</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={confirmWord}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={!isConfirmEnabled}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Deleting...
                                    </span>
                                ) : (
                                    `Delete ${itemCount.toLocaleString()} ${itemDescription}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
