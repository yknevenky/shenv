import { Mail, MailOpen, MessageSquare, ShieldAlert, Users } from 'lucide-react';
import type { InboxStats } from '../../services/gmail';

interface InboxOverviewProps {
    inboxStats: InboxStats | null;
    senderStats: { totalSenders: number; totalEmails: number } | null;
    loading: boolean;
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    loading,
}: {
    icon: React.ElementType;
    label: string;
    value: number | null;
    color: string;
    loading: boolean;
}) {
    const colorMap: Record<string, { bg: string; text: string }> = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
        red: { bg: 'bg-red-50', text: 'text-red-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`p-2 ${c.bg} rounded-lg flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                    {loading ? (
                        <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mt-0.5" />
                    ) : (
                        <p className="text-xl font-bold text-gray-900">
                            {value !== null ? value.toLocaleString() : '--'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function getSystemLabelCount(labels: InboxStats['systemLabels'], name: string, field: 'messagesTotal' | 'messagesUnread'): number | null {
    const label = labels.find(l => l.name === name);
    return label ? label[field] : null;
}

export function InboxOverview({ inboxStats, senderStats, loading }: InboxOverviewProps) {
    const systemLabels = inboxStats?.systemLabels || [];

    const totalMessages = inboxStats?.totalMessages ?? null;
    const unreadCount = getSystemLabelCount(systemLabels, 'INBOX', 'messagesUnread');
    const threadCount = inboxStats?.totalThreads ?? null;
    const spamCount = getSystemLabelCount(systemLabels, 'SPAM', 'messagesTotal');
    const senderCount = senderStats?.totalSenders ?? null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard icon={Mail} label="Total Messages" value={totalMessages} color="blue" loading={loading} />
            <StatCard icon={MailOpen} label="Unread" value={unreadCount} color="amber" loading={loading} />
            <StatCard icon={MessageSquare} label="Threads" value={threadCount} color="indigo" loading={loading} />
            <StatCard icon={ShieldAlert} label="Spam" value={spamCount} color="red" loading={loading} />
            <StatCard icon={Users} label="Unique Senders" value={senderCount} color="purple" loading={loading} />
        </div>
    );
}
