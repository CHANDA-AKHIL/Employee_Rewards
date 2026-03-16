import React, { useEffect, useState, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
    totalPoints: number;
    streakCount: number;
    rank: number;
    kpisCompleted: number;
    badgesEarned: number;
    rewardsRedeemed: number;
    level: number;
}

interface TrendPoint {
    date: string;
    points: number;
}

interface ActivityItem {
    id: string;
    message: string;
    type: string;
    createdAt: string;
    isRead: boolean;
}

// ─── Envelope unwrap helper ───────────────────────────────────────────────────
// api.ts interceptor returns { success, message, data: T }
// sendPaginated returns { success, message, data: T[], pagination }
function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmployeeDashboard: React.FC = () => {
    const user = useAuthStore((state) => state.user);

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        totalPoints: 0, streakCount: 0, rank: 0,
        kpisCompleted: 0, badgesEarned: 0, rewardsRedeemed: 0, level: 1,
    });
    const [trendData, setTrendData] = useState<TrendPoint[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [redemptionCount, setRedemptionCount] = useState(0);

    const fetchDashboard = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);

            const [statsEnv, notifEnv, redemptionEnv, trendsEnv] = await Promise.allSettled([
                // GET /employees/:id/stats → { totalPoints, level, streakCount, badgesEarned, kpisCompleted, rank }
                api.get(`/employees/${user.id}/stats`),
                // GET /notifications?limit=6
                api.get('/notifications?limit=6'),
                // GET /redemptions — employee sees their own
                api.get('/redemptions'),
                // GET /analytics/kpi-trends — admin only, catch gracefully
                api.get('/analytics/kpi-trends').catch(() => null),
            ]);

            // ── Stats ─────────────────────────────────────────────────────────
            if (statsEnv.status === 'fulfilled') {
                const s = unwrap<Stats>(statsEnv.value, stats);
                setStats({
                    totalPoints: s.totalPoints ?? 0,
                    streakCount: s.streakCount ?? 0,
                    rank: s.rank ?? 0,
                    kpisCompleted: s.kpisCompleted ?? 0,
                    badgesEarned: s.badgesEarned ?? 0,
                    rewardsRedeemed: s.rewardsRedeemed ?? 0,
                    level: s.level ?? 1,
                });
            }

            // ── Notifications / activity feed ────────────────────────────────
            if (notifEnv.status === 'fulfilled') {
                // sendPaginated → envelope.data is the array
                const inner = unwrap<any>(notifEnv.value, { data: [] });
                const list: ActivityItem[] = Array.isArray(inner)
                    ? inner
                    : (inner?.data ?? []);
                setActivity(list.slice(0, 6));
            }

            // ── Redemption count ─────────────────────────────────────────────
            if (redemptionEnv.status === 'fulfilled') {
                const inner = unwrap<any>(redemptionEnv.value, { data: [] });
                const list = Array.isArray(inner) ? inner : (inner?.data ?? []);
                setRedemptionCount(list.length);
            }

            // ── KPI trend (points over time from pointsLedger) ───────────────
            // Falls back to empty array if endpoint is admin-only and returns 403
            if (trendsEnv.status === 'fulfilled' && trendsEnv.value) {
                const raw = unwrap<any>(trendsEnv.value, {});
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    const shaped: TrendPoint[] = Object.entries(raw).map(([k, v]) => ({
                        date: k,
                        points: typeof v === 'number' ? v : 0,
                    }));
                    setTrendData(shaped);
                }
            }

        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    // ─── Skeleton ─────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="h-10 w-64 bg-[#111420] rounded-xl border border-[#1f2540]" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-[#111420] rounded-2xl border border-[#1f2540]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-64 bg-[#111420] rounded-2xl border border-[#1f2540]" />
                    <div className="h-64 bg-[#111420] rounded-2xl border border-[#1f2540]" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── Greeting ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">
                        Welcome back,{' '}
                        <span className="text-[#6c63ff]">{user?.name?.split(' ')[0]}</span>!
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Here is your performance snapshot for today.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111420] border border-[#1f2540]">
                    <i className="fa-solid fa-layer-group text-[#6c63ff] text-sm"></i>
                    <span className="text-xs text-gray-400 font-bold">Level</span>
                    <span className="text-sm font-syne font-bold text-[#e8eaf6]">{stats.level}</span>
                </div>
            </div>

            {/* ── Top 3 stat cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Points */}
                <div className="glass-panel p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 blur-2xl w-32 h-32 bg-[#6c63ff] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center text-[#6c63ff] shadow-[0_0_15px_rgba(108,99,255,0.2)]">
                            <i className="fa-solid fa-trophy text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Points</p>
                            <p className="text-4xl font-syne font-extrabold text-[#e8eaf6]">
                                {stats.totalPoints.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Streak */}
                <div className="glass-panel p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 blur-2xl w-32 h-32 bg-[#f59e0b] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/10 flex items-center justify-center text-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            <i className="fa-solid fa-fire text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Current Streak</p>
                            <p className="text-4xl font-syne font-extrabold text-[#e8eaf6]">
                                {stats.streakCount}{' '}
                                <span className="text-xl text-gray-600 font-bold">days</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rank */}
                <div className="glass-panel p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 blur-2xl w-32 h-32 bg-[#43e97b] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#43e97b]/10 flex items-center justify-center text-[#43e97b] shadow-[0_0_15px_rgba(67,233,123,0.2)]">
                            <i className="fa-solid fa-ranking-star text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">My Rank</p>
                            <p className="text-4xl font-syne font-extrabold text-[#e8eaf6]">
                                {stats.rank > 0 ? `#${stats.rank}` : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 lg:col-span-2 space-y-6">

                    {/* Secondary stats */}
                    <div className="glass-panel p-0 overflow-hidden divide-y divide-[#1f2540] sm:divide-y-0 sm:divide-x flex flex-col sm:flex-row">
                        <div className="flex-1 p-6 text-center hover:bg-[#171b2e] transition-colors">
                            <span className="block text-3xl font-syne font-bold text-[#e8eaf6] mb-1">
                                {stats.kpisCompleted}
                            </span>
                            <span className="text-[10px] font-bold text-[#6c63ff] uppercase tracking-wider">KPIs Completed</span>
                        </div>
                        <div className="flex-1 p-6 text-center hover:bg-[#171b2e] transition-colors">
                            <span className="block text-3xl font-syne font-bold text-[#f59e0b] mb-1">
                                {stats.badgesEarned}
                            </span>
                            <span className="text-[10px] font-bold text-[#06b6d4] uppercase tracking-wider">Badges Earned</span>
                        </div>
                        <div className="flex-1 p-6 text-center hover:bg-[#171b2e] transition-colors">
                            <span className="block text-3xl font-syne font-bold text-[#43e97b] mb-1">
                                {redemptionCount}
                            </span>
                            <span className="text-[10px] font-bold text-[#ff6584] uppercase tracking-wider">Rewards Claimed</span>
                        </div>
                    </div>

                    {/* Points trend chart */}
                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-syne font-bold text-[#e8eaf6]">Points Over Time</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Your points accumulation history</p>
                            </div>
                            <span className="text-xs text-gray-600 bg-[#171b2e] border border-[#1f2540] px-3 py-1.5 rounded-lg">
                                All time
                            </span>
                        </div>
                        <div className="h-[220px] w-full">
                            {trendData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                    <i className="fa-solid fa-chart-area text-3xl opacity-30"></i>
                                    <p className="text-sm">No trend data yet — complete KPIs to see your chart.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#43e97b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#4b5563', fontSize: 10 }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#111420',
                                                border: '1px solid #1f2540',
                                                borderRadius: '12px',
                                            }}
                                            itemStyle={{ color: '#43e97b', fontSize: '12px', fontWeight: 'bold' }}
                                            cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }}
                                            formatter={(v: any) => [`${v} pts`, 'Points']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="points"
                                            stroke="#43e97b"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPoints)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Activity feed */}
                <div className="col-span-1">
                    <div className="glass-panel h-full overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-[#1f2540] flex items-center gap-2">
                            <i className="fa-solid fa-bolt text-[#f7b731]"></i>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Recent Activity</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1f2540]">
                            {activity.length === 0 ? (
                                <div className="p-8 text-center text-gray-600 flex flex-col items-center justify-center h-48">
                                    <i className="fa-solid fa-ghost text-3xl mb-3 opacity-50"></i>
                                    <p className="text-sm">No recent activity yet.</p>
                                </div>
                            ) : (
                                activity.map((item, i) => (
                                    <div
                                        key={item.id ?? i}
                                        className={`p-5 hover:bg-[#171b2e] transition-colors group flex items-start gap-3 ${!item.isRead ? 'border-l-2 border-l-[#6c63ff]' : ''}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === 'KPI_APPROVED' ? 'bg-[#43e97b]' :
                                            item.type === 'KPI_REJECTED' ? 'bg-[#ff6584]' :
                                                item.type === 'BADGE_UNLOCKED' ? 'bg-[#f7b731]' :
                                                    item.type === 'REWARD_APPROVED' ? 'bg-[#06b6d4]' :
                                                        'bg-[#6c63ff]'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                                                {item.message}
                                            </p>
                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-1.5">
                                                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};