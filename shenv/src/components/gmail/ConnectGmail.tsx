import { useState } from 'react';
import { Mail, Loader } from 'lucide-react';
import { gmailApi } from '../../services/gmail';

export function ConnectGmail() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnect = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await gmailApi.authorize();
            if (response.success && response.data.authorizationUrl) {
                window.location.href = response.data.authorizationUrl;
            } else {
                setError('Failed to get authorization URL');
                setLoading(false);
            }
        } catch (err) {
            setError('Failed to initiate connection');
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-2xl mx-auto text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Gmail</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Allow access to your Gmail account to scan for newsletters, notifications, and clutter.
                We'll help you organize and clean up your inbox.
            </p>

            {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? (
                    <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            className="w-5 h-5 mr-3 bg-white rounded-full p-0.5"
                            alt=""
                        />
                        Connect with Gmail
                    </>
                )}
            </button>

            <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                    We only ask for read and modify permissions to help you manage your emails.
                    You can revoke access at any time.
                </p>
            </div>
        </div>
    );
}
