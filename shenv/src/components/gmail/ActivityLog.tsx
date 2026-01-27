import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Clock, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'shenv_gmail_activity';
const MAX_ENTRIES = 20;

export interface ActivityEntry {
    id: string;
    timestamp: string;
    action: 'scan' | 'delete' | 'bulk_delete' | 'revoke' | 'connect';
    details: string;
}

function getStoredActivities(): ActivityEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function storeActivities(entries: ActivityEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function addActivity(action: ActivityEntry['action'], details: string) {
    const entries = getStoredActivities();
    entries.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action,
        details,
    });
    storeActivities(entries);
}

function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const ACTION_LABELS: Record<ActivityEntry['action'], string> = {
    scan: 'Scan',
    delete: 'Delete',
    bulk_delete: 'Bulk Delete',
    revoke: 'Revoke',
    connect: 'Connect',
};

const ACTION_COLORS: Record<ActivityEntry['action'], string> = {
    scan: 'bg-blue-50 text-blue-700',
    delete: 'bg-red-50 text-red-700',
    bulk_delete: 'bg-red-50 text-red-700',
    revoke: 'bg-amber-50 text-amber-700',
    connect: 'bg-green-50 text-green-700',
};

export function ActivityLog() {
    const [isOpen, setIsOpen] = useState(false);
    const [entries, setEntries] = useState<ActivityEntry[]>(getStoredActivities);

    const refresh = useCallback(() => {
        setEntries(getStoredActivities());
    }, []);

    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY);
        setEntries([]);
    };

    // Refresh when opening
    const handleToggle = () => {
        if (!isOpen) refresh();
        setIsOpen(!isOpen);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
                    {entries.length > 0 && (
                        <span className="text-xs text-gray-400">({entries.length})</span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {isOpen && (
                <div className="border-t border-gray-200">
                    {entries.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500">
                            No activity yet
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {entries.map((entry) => (
                                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[entry.action]}`}>
                                            {ACTION_LABELS[entry.action]}
                                        </span>
                                        <span className="text-sm text-gray-700 flex-1 truncate">{entry.details}</span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(entry.timestamp)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Clear Log
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
