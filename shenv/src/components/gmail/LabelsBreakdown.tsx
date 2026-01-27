import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Tag } from 'lucide-react';
import type { LabelStats } from '../../services/gmail';

interface LabelsBreakdownProps {
    labels: LabelStats[];
    loading: boolean;
}

type SortField = 'name' | 'messagesTotal' | 'messagesUnread' | 'threadsTotal';

export function LabelsBreakdown({ labels, loading }: LabelsBreakdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('messagesTotal');
    const [sortAsc, setSortAsc] = useState(false);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const filtered = labels
        .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            // System labels first
            if (a.type !== b.type) return a.type === 'system' ? -1 : 1;
            const aVal = sortField === 'name' ? a.name.toLowerCase() : a[sortField];
            const bVal = sortField === 'name' ? b.name.toLowerCase() : b[sortField];
            if (aVal < bVal) return sortAsc ? -1 : 1;
            if (aVal > bVal) return sortAsc ? 1 : -1;
            return 0;
        });

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Labels Breakdown</h3>
                    <span className="text-xs text-gray-400">({labels.length})</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {isOpen && (
                <div className="border-t border-gray-200">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search labels..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Loading labels...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No labels found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th
                                            onClick={() => handleSort('name')}
                                            className="px-4 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                                        >
                                            <span className="flex items-center gap-1">
                                                Label Name <SortIcon field="name" />
                                            </span>
                                        </th>
                                        <th
                                            onClick={() => handleSort('messagesTotal')}
                                            className="px-4 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 text-right"
                                        >
                                            <span className="flex items-center justify-end gap-1">
                                                Total <SortIcon field="messagesTotal" />
                                            </span>
                                        </th>
                                        <th
                                            onClick={() => handleSort('messagesUnread')}
                                            className="px-4 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 text-right"
                                        >
                                            <span className="flex items-center justify-end gap-1">
                                                Unread <SortIcon field="messagesUnread" />
                                            </span>
                                        </th>
                                        <th
                                            onClick={() => handleSort('threadsTotal')}
                                            className="px-4 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 text-right"
                                        >
                                            <span className="flex items-center justify-end gap-1">
                                                Threads <SortIcon field="threadsTotal" />
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((label) => (
                                        <tr key={label.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    {label.type === 'user' && label.color?.backgroundColor && (
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: label.color.backgroundColor }}
                                                        />
                                                    )}
                                                    <span className={`${label.type === 'system' ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                                        {label.name}
                                                    </span>
                                                    {label.type === 'system' && (
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">system</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                                {label.messagesTotal.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">
                                                {label.messagesUnread > 0 ? (
                                                    <span className="text-amber-600 font-medium">{label.messagesUnread.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-gray-400">0</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                                {label.threadsTotal.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
