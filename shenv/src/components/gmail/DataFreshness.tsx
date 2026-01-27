import { Clock, RefreshCw } from 'lucide-react';

interface DataFreshnessProps {
    lastSyncedAt: Date | null;
    isLive: boolean;
    onRefresh?: () => void;
    refreshing?: boolean;
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function DataFreshness({ lastSyncedAt, isLive, onRefresh, refreshing }: DataFreshnessProps) {
    return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <Clock className="w-3.5 h-3.5" />
            {lastSyncedAt ? (
                <span>Last synced {timeAgo(lastSyncedAt)}</span>
            ) : (
                <span>Database snapshot from last scan</span>
            )}
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="text-blue-600 hover:text-blue-700 font-medium ml-1 disabled:opacity-50"
                >
                    {refreshing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        'Refresh'
                    )}
                </button>
            )}
        </div>
    );
}
