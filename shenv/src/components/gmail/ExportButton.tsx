import { Download } from 'lucide-react';
import type { GmailSender } from '../../services/gmail';

interface ExportButtonProps {
    senders: GmailSender[];
    disabled?: boolean;
}

export function ExportButton({ senders, disabled }: ExportButtonProps) {
    const handleExport = () => {
        const headers = ['senderEmail', 'senderName', 'emailCount', 'firstEmailDate', 'lastEmailDate', 'lastSyncedAt'];
        const rows = senders.map(s => [
            `"${s.senderEmail}"`,
            `"${s.senderName || ''}"`,
            s.emailCount,
            s.firstEmailDate,
            s.lastEmailDate,
            s.lastSyncedAt,
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];

        const link = document.createElement('a');
        link.href = url;
        link.download = `gmail-senders-${date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleExport}
            disabled={disabled || senders.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export senders to CSV"
        >
            <Download className="w-4 h-4" />
            Export CSV
        </button>
    );
}
