import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export function GmailAuthError() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const error = searchParams.get('error') || 'An unknown error occurred';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md mx-auto text-center shadow-sm">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Connection Failed</h2>
                <p className="text-gray-600 mb-2">
                    We couldn't connect your Gmail account.
                </p>
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-6">
                    {error}
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => navigate('/gmail', { replace: true })}
                        className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate('/dashboard', { replace: true })}
                        className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
