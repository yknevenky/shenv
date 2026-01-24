import { Mail, Users, RefreshCw } from 'lucide-react';

interface StatsProps {
    totalEmails: number;
    uniqueSenders: number;
    onRefresh?: () => void;
    refreshing?: boolean;
}

export function StatsOverview({ totalEmails, uniqueSenders, onRefresh, refreshing }: StatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={refreshing}
                            className={`p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-600">Total Emails Scanned</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">
                        {totalEmails.toLocaleString()}
                    </h3>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-600">Unique Senders</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">
                        {uniqueSenders.toLocaleString()}
                    </h3>
                </div>
            </div>
        </div>
    );
}
