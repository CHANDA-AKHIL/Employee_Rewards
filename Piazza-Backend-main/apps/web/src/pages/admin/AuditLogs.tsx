import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';

interface AuditLog {
    id: string;
    action: string;
    targetTable: string;
    targetId?: string | null;
    metadata?: string | null;
    createdAt: string;
    admin: { name: string; email: string };
}

function actionColor(action: string) {
    if (action === 'CREATE') return { color: '#43e97b', bg: 'rgba(67,233,123,0.1)' };
    if (action === 'UPDATE') return { color: '#f7b731', bg: 'rgba(247,183,49,0.1)' };
    if (action === 'DELETE') return { color: '#ff6584', bg: 'rgba(255,101,132,0.1)' };
    return { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
}

export const AdminAuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'>('ALL');
    const LIMIT = 20;

    const fetchLogs = useCallback(async (p = 1) => {
        try {
            setLoading(true);
            setError('');
            // GET /audit → sendPaginated → { success, data: AuditLog[], pagination }
            const payload = await api.get(`/audit?page=${p}&limit=${LIMIT}`) as any;
            const list: AuditLog[] = Array.isArray(payload?.data) ? payload.data : [];
            const pagination = payload?.pagination ?? {};
            setLogs(list);
            setTotalPages(Math.ceil((pagination.total ?? list.length) / LIMIT));
        } catch {
            setError('Failed to load audit logs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(page); }, [fetchLogs, page]);

    const filtered = logs.filter(log => {
        const matchesSearch =
            search === '' ||
            log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.targetTable.toLowerCase().includes(search.toLowerCase()) ||
            log.admin.name.toLowerCase().includes(search.toLowerCase());
        const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    const counts = {
        CREATE: logs.filter(l => l.action === 'CREATE').length,
        UPDATE: logs.filter(l => l.action === 'UPDATE').length,
        DELETE: logs.filter(l => l.action === 'DELETE').length,
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Audit Logs</h1>
                    <p className="text-gray-500 text-sm mt-1">Track all admin actions across the platform.</p>
                </div>
                <button
                    onClick={() => fetchLogs(page)}
                    className="w-9 h-9 rounded-lg bg-[#111420] border border-[#1f2540] text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                >
                    <i className={`fa-solid fa-rotate-right text-sm ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={() => fetchLogs(page)} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Summary ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { key: 'CREATE', label: 'Creates', icon: 'fa-plus-circle', color: '#43e97b' },
                    { key: 'UPDATE', label: 'Updates', icon: 'fa-pen-to-square', color: '#f7b731' },
                    { key: 'DELETE', label: 'Deletes', icon: 'fa-trash-can', color: '#ff6584' },
                ].map(s => (
                    <div key={s.key} className="glass-panel p-4 flex items-center gap-3 cursor-pointer hover:border-[#6c63ff]/30 transition-all"
                        onClick={() => setActionFilter(actionFilter === s.key as any ? 'ALL' : s.key as any)}>
                        <i className={`fa-solid ${s.icon} text-lg`} style={{ color: s.color }}></i>
                        <div>
                            <div className="text-xl font-syne font-bold text-[#e8eaf6]">
                                {loading ? <span className="inline-block w-6 h-5 bg-[#1f2540] rounded animate-pulse" /> : counts[s.key as keyof typeof counts]}
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                    {(['ALL', 'CREATE', 'UPDATE', 'DELETE'] as const).map(f => (
                        <button key={f} onClick={() => setActionFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${actionFilter === f ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}>
                            {f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 group">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs group-focus-within:text-[#6c63ff] transition-colors"></i>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search action, table or admin…"
                        className="w-full bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-9 pr-4 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none" />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#171b2e] border-b border-[#1f2540]">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Table</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:table-cell">Admin</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:table-cell">Target ID</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2540]">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-4">
                                        <div className="h-8 bg-[#1f2540] rounded-xl animate-pulse" />
                                    </td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                                    <i className="fa-solid fa-shield-halved text-2xl mb-3 block opacity-30"></i>
                                    No audit logs found.
                                </td></tr>
                            ) : filtered.map(log => {
                                const { color, bg } = actionColor(log.action);
                                return (
                                    <tr key={log.id} className="hover:bg-[#171b2e]/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg" style={{ color, backgroundColor: bg }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm text-[#e8eaf6] font-medium">{log.targetTable}</span>
                                        </td>
                                        <td className="px-6 py-3 hidden sm:table-cell">
                                            <div className="text-sm text-gray-300">{log.admin?.name ?? 'System'}</div>
                                            <div className="text-[10px] text-gray-600">{log.admin?.email}</div>
                                        </td>
                                        <td className="px-6 py-3 hidden md:table-cell">
                                            <span className="text-xs text-gray-600 font-mono">
                                                {log.targetId ? log.targetId.slice(0, 8) + '…' : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-xs text-gray-400">
                                                {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-gray-600">
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-[#1f2540] flex items-center justify-between">
                        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white disabled:opacity-40 transition-all">
                                ← Prev
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white disabled:opacity-40 transition-all">
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};