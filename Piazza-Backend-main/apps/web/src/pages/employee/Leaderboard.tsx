import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { getSocket } from '../../socket/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
// GET /gamification/leaderboard returns sendPaginated:
// envelope → { success, data: LeaderboardEntry[], pagination }
// Each entry: { id, employeeId, rank, monthlyPoints, employee: { id, name, department, level } }

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

interface MyRank {
    rank: number;
    monthlyPoints: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

function medalColor(rank: number) {
    if (rank === 1) return '#f59e0b';
    if (rank === 2) return '#cbd5e1';
    if (rank === 3) return '#b45309';
    return null;
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmployeeLeaderboard: React.FC = () => {
    const user = useAuthStore(state => state.user);

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState<MyRank | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 20;

    const fetchLeaderboard = useCallback(async (p = 1) => {
        try {
            setLoading(true);
            setError('');

            const [boardEnv, rankEnv] = await Promise.allSettled([
                // GET /gamification/leaderboard?page=1&limit=20
                // sendPaginated → envelope.data = array, envelope.pagination = { page, limit, total }
                api.get(`/gamification/leaderboard?page=${p}&limit=${LIMIT}`),
                // GET /gamification/leaderboard/me → { rank, monthlyPoints }
                api.get('/gamification/leaderboard/me'),
            ]);

            if (boardEnv.status === 'fulfilled') {
                // sendPaginated wraps as { success, data: [], pagination }
                // api.ts interceptor strips axios wrapper → payload = { success, data: [], pagination }
                const payload = boardEnv.value as any;
                const list: LeaderboardEntry[] = Array.isArray(payload?.data)
                    ? payload.data
                    : [];
                const pagination = payload?.pagination ?? {};
                setEntries(list);
                setTotalPages(Math.ceil((pagination.total ?? list.length) / LIMIT));
            }

            if (rankEnv.status === 'fulfilled') {
                const r = unwrap<MyRank>(rankEnv.value, { rank: 0, monthlyPoints: 0 });
                setMyRank(r);
            }

        } catch (err: any) {
            setError('Failed to load leaderboard. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard(page);

        // Real-time update via socket
        const socket = getSocket();
        if (socket) {
            socket.on('leaderboard:update', () => fetchLeaderboard(page));
        }
        return () => {
            if (socket) socket.off('leaderboard:update');
        };
    }, [fetchLeaderboard, page]);

    const topThree = entries.slice(0, 3);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6] flex items-center justify-center gap-3">
                    <i className="fa-solid fa-ranking-star text-[#f7b731]"></i>
                    Global Leaderboard
                </h1>
                <p className="text-gray-500 text-sm">
                    Compete with your peers, earn points, and climb the ranks. Updates in real-time.
                </p>
            </div>

            {/* ── My rank banner ── */}
            {myRank && myRank.rank > 0 && (
                <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-[#6c63ff]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {user?.name ? initials(user.name) : 'ME'}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-[#e8eaf6]">
                                {user?.name} <span className="text-[#6c63ff]">(You)</span>
                            </div>
                            <div className="text-xs text-gray-500">{user?.department ?? 'No department'}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-syne font-bold text-[#6c63ff]">#{myRank.rank}</div>
                        <div className="text-xs text-gray-500">{myRank.monthlyPoints.toLocaleString()} pts this month</div>
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                    <button onClick={() => fetchLeaderboard(page)} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    <div className="flex justify-center gap-6 h-48">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-28 bg-[#111420] rounded-t-xl border border-[#1f2540] animate-pulse" />
                        ))}
                    </div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 bg-[#111420] rounded-xl border border-[#1f2540] animate-pulse" />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#f7b731]/10 flex items-center justify-center text-3xl text-[#f7b731] mx-auto mb-4">
                        <i className="fa-solid fa-ranking-star"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">No leaderboard data yet</h3>
                    <p className="text-gray-500 text-sm">Complete KPIs to earn points and appear on the leaderboard.</p>
                </div>
            ) : (
                <>
                    {/* ── Podium (top 3) ── */}
                    {topThree.length > 0 && (
                        <div className="flex justify-center items-end gap-3 sm:gap-6 h-56 mt-4">

                            {/* 2nd place */}
                            {topThree[1] && (
                                <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-100">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white font-bold text-sm border-4 border-[#cbd5e1] shadow-[0_0_20px_rgba(203,213,225,0.4)] -mb-5 relative z-10">
                                        {initials(topThree[1].employee.name)}
                                    </div>
                                    <div className="w-24 sm:w-28 h-28 bg-gradient-to-t from-[#111420] to-[#cbd5e1]/10 rounded-t-xl border border-[#cbd5e1]/20 flex flex-col items-center justify-end pb-4 gap-0.5">
                                        <span className="text-[#cbd5e1] font-syne font-bold text-xl">2nd</span>
                                        <span className="text-white text-xs font-medium truncate w-full text-center px-2">
                                            {topThree[1].employee.name.split(' ')[0]}
                                        </span>
                                        <span className="text-[#6c63ff] text-xs font-bold">
                                            {topThree[1].monthlyPoints.toLocaleString()} pts
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 1st place */}
                            {topThree[0] && (
                                <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 z-10">
                                    <span className="text-3xl mb-1 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">👑</span>
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white font-bold text-base border-4 border-[#f59e0b] shadow-[0_0_30px_rgba(245,158,11,0.5)] -mb-5 relative z-10">
                                        {initials(topThree[0].employee.name)}
                                    </div>
                                    <div className="w-28 sm:w-32 h-40 bg-gradient-to-t from-[#111420] to-[#f59e0b]/10 rounded-t-xl border border-[#f59e0b]/30 shadow-[0_-8px_20px_rgba(245,158,11,0.1)] flex flex-col items-center justify-end pb-4 gap-0.5">
                                        <span className="text-[#f59e0b] font-syne font-bold text-2xl">1st</span>
                                        <span className="text-white text-sm font-bold truncate w-full text-center px-2">
                                            {topThree[0].employee.name.split(' ')[0]}
                                        </span>
                                        <span className="text-[#f59e0b] text-xs font-bold">
                                            {topThree[0].monthlyPoints.toLocaleString()} pts
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 3rd place */}
                            {topThree[2] && (
                                <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-200">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white font-bold text-sm border-4 border-[#b45309] shadow-[0_0_16px_rgba(180,83,9,0.4)] -mb-4 relative z-10">
                                        {initials(topThree[2].employee.name)}
                                    </div>
                                    <div className="w-24 sm:w-28 h-24 bg-gradient-to-t from-[#111420] to-[#b45309]/10 rounded-t-xl border border-[#b45309]/20 flex flex-col items-center justify-end pb-3 gap-0.5">
                                        <span className="text-[#d97706] font-syne font-bold text-lg">3rd</span>
                                        <span className="text-white text-xs font-medium truncate w-full text-center px-1">
                                            {topThree[2].employee.name.split(' ')[0]}
                                        </span>
                                        <span className="text-[#6c63ff] text-xs font-bold">
                                            {topThree[2].monthlyPoints.toLocaleString()} pts
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Full table ── */}
                    <div className="glass-panel overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#1f2540] flex items-center justify-between">
                            <h3 className="font-syne font-bold text-[#e8eaf6]">All Rankings</h3>
                            <span className="text-xs text-gray-500">Monthly points</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0a0c14] sticky top-0 z-10 border-b border-[#1f2540]">
                                    <tr>
                                        <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider w-16 text-center">Rank</th>
                                        <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Department</th>
                                        <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Level</th>
                                        <th className="px-6 py-4 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f2540]">
                                    {entries.map((item) => {
                                        const isMe = item.employee.id === user?.id;
                                        const mc = medalColor(item.rank);

                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition-colors hover:bg-[#171b2e] ${isMe
                                                    ? 'bg-[#6c63ff]/10 border-l-4 border-l-[#6c63ff]'
                                                    : 'border-l-4 border-l-transparent'
                                                    }`}
                                            >
                                                {/* Rank */}
                                                <td className="px-6 py-4 text-center">
                                                    {mc ? (
                                                        <span className="font-syne font-bold text-base" style={{ color: mc }}>
                                                            {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-gray-500">#{item.rank}</span>
                                                    )}
                                                </td>

                                                {/* Name */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                            {initials(item.employee.name)}
                                                        </div>
                                                        <span className={`font-medium ${isMe ? 'text-[#6c63ff]' : 'text-[#e8eaf6]'}`}>
                                                            {item.employee.name}
                                                            {isMe && (
                                                                <span className="ml-2 text-[10px] bg-[#6c63ff]/20 text-[#6c63ff] px-1.5 py-0.5 rounded-full font-bold">
                                                                    You
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Department */}
                                                <td className="px-6 py-4 text-gray-500 text-sm hidden sm:table-cell">
                                                    {item.employee.department ?? '—'}
                                                </td>

                                                {/* Level */}
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">
                                                        Lvl {item.employee.level}
                                                    </span>
                                                </td>

                                                {/* Points */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-syne font-bold text-[#43e97b]">
                                                        {item.monthlyPoints.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-[#1f2540] flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    Page {page} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        ← Prev
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};