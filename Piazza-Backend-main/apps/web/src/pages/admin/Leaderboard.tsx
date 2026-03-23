import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { getSocket } from '../../socket/socket';

interface LeaderboardEntry {
    id: string;
    employeeId: string;
    rank: number;
    monthlyPoints: number;
    employee: {
        id: string;
        name: string;
        department?: string | null;
        level: number;
    };
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export const AdminLeaderboard: React.FC = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const LIMIT = 20;

    const fetchLeaderboard = useCallback(async (p = 1) => {
        try {
            setLoading(true);
            setError('');
            const payload = await api.get(`/gamification/leaderboard?page=${p}&limit=${LIMIT}`) as any;
            const list: LeaderboardEntry[] = Array.isArray(payload?.data) ? payload.data : [];
            const pagination = payload?.pagination ?? {};
            setEntries(list);
            setTotalPages(Math.ceil((pagination.total ?? list.length) / LIMIT));
        } catch {
            setError('Failed to load leaderboard.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard(page);
        const socket = getSocket();
        if (socket) socket.on('leaderboard:update', () => fetchLeaderboard(page));
        return () => { if (socket) socket.off('leaderboard:update'); };
    }, [fetchLeaderboard, page]);

    const filtered = search
        ? entries.filter(e =>
            e.employee.name.toLowerCase().includes(search.toLowerCase()) ||
            (e.employee.department ?? '').toLowerCase().includes(search.toLowerCase())
        )
        : entries;

    const topThree = entries.slice(0, 3);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Leaderboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Monthly points ranking across all employees.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs group-focus-within:text-[#6c63ff] transition-colors"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search employee…"
                            className="w-56 bg-[#111420] border border-[#1f2540] rounded-xl py-2 pl-9 pr-4 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                        />
                    </div>
                    <button
                        onClick={() => fetchLeaderboard(page)}
                        className="w-9 h-9 rounded-lg bg-[#111420] border border-[#1f2540] text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <i className={`fa-solid fa-rotate-right text-sm ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={() => fetchLeaderboard(page)} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Podium ── */}
            {!loading && topThree.length >= 3 && (
                <div className="flex justify-center items-end gap-4 h-44">
                    {[topThree[1], topThree[0], topThree[2]].map((item, i) => {
                        const colors = ['#cbd5e1', '#f59e0b', '#b45309'];
                        const heights = ['h-28', 'h-40', 'h-24'];
                        const labels = ['2nd', '1st', '3rd'];
                        if (!item) return null;
                        return (
                            <div key={item.id} className="flex flex-col items-center gap-1">
                                <div
                                    className={`w-12 h-12 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white font-bold text-sm border-4 flex-shrink-0 -mb-4 relative z-10`}
                                    style={{ borderColor: colors[i] }}
                                >
                                    {initials(item.employee.name)}
                                </div>
                                <div
                                    className={`w-28 ${heights[i]} rounded-t-xl flex flex-col items-center justify-end pb-3 gap-0.5`}
                                    style={{ background: `linear-gradient(to top, #111420, ${colors[i]}18)`, border: `1px solid ${colors[i]}30` }}
                                >
                                    <span className="font-syne font-bold text-lg" style={{ color: colors[i] }}>{labels[i]}</span>
                                    <span className="text-white text-xs font-bold truncate w-full text-center px-2">{item.employee.name.split(' ')[0]}</span>
                                    <span className="text-[10px] font-bold" style={{ color: colors[i] }}>{item.monthlyPoints.toLocaleString()} pts</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Table ── */}
            <div className="glass-panel overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2540] flex items-center justify-between">
                    <h3 className="font-syne font-bold text-[#e8eaf6]">Full Rankings</h3>
                    <span className="text-xs text-gray-500">
                        {loading ? '…' : `${entries.length} employees ranked`}
                    </span>
                </div>
                {loading ? (
                    <div className="divide-y divide-[#1f2540]">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="px-6 py-4">
                                <div className="h-8 bg-[#1f2540] rounded-xl animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-600">
                        <i className="fa-solid fa-ranking-star text-3xl mb-3 block opacity-30"></i>
                        <p className="text-sm">No leaderboard data yet. Approve KPIs to generate rankings.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#171b2e] border-b border-[#1f2540]">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest w-16 text-center">Rank</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:table-cell">Department</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:table-cell">Level</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Monthly Pts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f2540]">
                                    {filtered.map(item => (
                                        <tr key={item.id} className="hover:bg-[#171b2e]/50 transition-colors">
                                            <td className="px-6 py-3 text-center">
                                                {item.rank <= 3 ? (
                                                    <span className="text-base">{item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}</span>
                                                ) : (
                                                    <span className="font-bold text-gray-500 text-sm">#{item.rank}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {initials(item.employee.name)}
                                                    </div>
                                                    <span className="font-bold text-[#e8eaf6]">{item.employee.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 hidden sm:table-cell">{item.employee.department ?? '—'}</td>
                                            <td className="px-6 py-3 hidden md:table-cell">
                                                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">Lv {item.employee.level}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="font-syne font-bold text-[#43e97b]">{item.monthlyPoints.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))}
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
                    </>
                )}
            </div>
        </div>
    );
};