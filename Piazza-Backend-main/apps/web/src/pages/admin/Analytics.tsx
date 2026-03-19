import React, { useEffect, useState, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrendPoint { date: string; points: number; }
interface Performer { id: string; name: string; department?: string; totalPoints: number; level: number; }
interface DeptStat { department: string; points: number; employeeCount: number; }
interface RedemptionSt { rewardName: string; category?: string; pointCost: number; redemptionCount: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
// api.ts interceptor returns raw JSON body:
// sendSuccess   → { success, data: T }
// All analytics endpoints are ADMIN only (roleGuard)

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

// kpiTrends returns { "2025-03": 450, "2025-04": 200 }
// Reshape to [{ date, points }] for Recharts
function reshapeTrends(raw: Record<string, number> | any[]): TrendPoint[] {
    if (Array.isArray(raw)) {
        return raw.map((item: any) => ({
            date: item.date ?? item.week ?? item.month ?? item.key ?? '',
            points: item.points ?? item.count ?? item.value ?? 0,
        }));
    }
    return Object.entries(raw).map(([k, v]) => ({
        date: k,
        points: typeof v === 'number' ? v : 0,
    }));
}

// departmentStats returns [{ department, totalPoints, employeeCount }]
// Rename totalPoints → points for BarChart dataKey
function reshapeDepts(raw: any[]): DeptStat[] {
    return raw.map(d => ({
        department: d.department ?? 'Unknown',
        points: d.totalPoints ?? d.points ?? 0,
        employeeCount: d.employeeCount ?? 0,
    }));
}

const COLORS = ['#6c63ff', '#43e97b', '#f7b731', '#ff6584', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#111420] border border-[#1f2540] px-4 py-3 rounded-xl shadow-2xl text-sm">
            {label && <p className="text-gray-400 font-bold mb-1">{label}</p>}
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color ?? '#6c63ff' }} className="font-bold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                    {p.dataKey === 'points' || p.dataKey === 'totalPoints' ? ' pts' : ''}
                </p>
            ))}
        </div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminAnalytics: React.FC = () => {
    const [trends, setTrends] = useState<TrendPoint[]>([]);
    const [performers, setPerformers] = useState<Performer[]>([]);
    const [depts, setDepts] = useState<DeptStat[]>([]);
    const [redemptions, setRedemptions] = useState<RedemptionSt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState<'week' | 'month'>('month');

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const [trendsEnv, perfEnv, deptEnv, redemptionEnv] = await Promise.allSettled([
                // GET /analytics/kpi-trends?period=month|week
                api.get(`/analytics/kpi-trends?period=${period}`),
                // GET /analytics/top-performers → [{ id, name, department, totalPoints, level }]
                api.get('/analytics/top-performers'),
                // GET /analytics/department-stats → [{ department, totalPoints, employeeCount }]
                api.get('/analytics/department-stats'),
                // GET /analytics/redemption-stats → [{ rewardName, category, pointCost, redemptionCount }]
                api.get('/analytics/redemption-stats'),
            ]);

            if (trendsEnv.status === 'fulfilled') {
                const raw = unwrap<any>(trendsEnv.value, {});
                setTrends(reshapeTrends(raw));
            }
            if (perfEnv.status === 'fulfilled') {
                const raw = unwrap<Performer[]>(perfEnv.value, []);
                setPerformers(Array.isArray(raw) ? raw.slice(0, 5) : []);
            }
            if (deptEnv.status === 'fulfilled') {
                const raw = unwrap<any[]>(deptEnv.value, []);
                setDepts(reshapeDepts(Array.isArray(raw) ? raw : []));
            }
            if (redemptionEnv.status === 'fulfilled') {
                const raw = unwrap<RedemptionSt[]>(redemptionEnv.value, []);
                setRedemptions(Array.isArray(raw) ? raw.slice(0, 8) : []);
            }

        } catch (err: any) {
            setError('Failed to load analytics. Please retry.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    // ── Summary stats ─────────────────────────────────────────────────────────
    const totalPoints = trends.reduce((s, t) => s + t.points, 0);
    const topScore = performers[0]?.totalPoints ?? 0;
    const topDeptPoints = depts[0]?.points ?? 0;
    const totalRedemptions = redemptions.reduce((s, r) => s + r.redemptionCount, 0);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Real-time performance and engagement insights.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                        {(['month', 'week'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Last 12 {p === 'month' ? 'Months' : 'Weeks'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        className="w-9 h-9 rounded-lg bg-[#111420] border border-[#1f2540] text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Refresh"
                    >
                        <i className={`fa-solid fa-rotate-right text-sm ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={fetchAnalytics} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Points Awarded', value: totalPoints.toLocaleString(), icon: 'fa-coins', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
                    { label: 'Top Performer Score', value: topScore.toLocaleString(), icon: 'fa-trophy', color: '#f7b731', bg: 'rgba(247,183,49,0.1)' },
                    { label: 'Best Dept Points', value: topDeptPoints.toLocaleString(), icon: 'fa-building', color: '#43e97b', bg: 'rgba(67,233,123,0.1)' },
                    { label: 'Total Redemptions', value: totalRedemptions.toLocaleString(), icon: 'fa-gift', color: '#ff6584', bg: 'rgba(255,101,132,0.1)' },
                ].map((s, i) => (
                    <div key={i} className="glass-panel p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
                            <i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i>
                        </div>
                        <div>
                            <div className="text-xl font-syne font-bold text-[#e8eaf6]">
                                {loading ? <span className="inline-block w-12 h-6 bg-[#1f2540] rounded animate-pulse" /> : s.value}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts row 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* KPI Points Trend */}
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Points Awarded Over Time</h3>
                            <p className="text-xs text-gray-500 mt-0.5">From KPI approvals and activities</p>
                        </div>
                    </div>
                    <div className="h-64">
                        {loading ? (
                            <div className="h-full bg-[#171b2e] rounded-xl animate-pulse" />
                        ) : trends.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-sm flex-col gap-2">
                                <i className="fa-solid fa-chart-area text-3xl opacity-30"></i>
                                No trend data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="points" name="Points" stroke="#6c63ff" strokeWidth={2.5} fill="url(#gradTrend)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Top 5 Performers</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Ranked by total points</p>
                        </div>
                    </div>
                    <div className="h-64">
                        {loading ? (
                            <div className="h-full bg-[#171b2e] rounded-xl animate-pulse" />
                        ) : performers.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-sm flex-col gap-2">
                                <i className="fa-solid fa-trophy text-3xl opacity-30"></i>
                                No performers data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performers} layout="vertical" margin={{ left: 16, right: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#e8eaf6', fontSize: 12 }}
                                        width={80}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar dataKey="totalPoints" name="Points" fill="#6c63ff" radius={[0, 6, 6, 0]} barSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Charts row 2 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Department Points */}
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Department Performance</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Total points per department</p>
                        </div>
                    </div>
                    <div className="h-64">
                        {loading ? (
                            <div className="h-full bg-[#171b2e] rounded-xl animate-pulse" />
                        ) : depts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-sm flex-col gap-2">
                                <i className="fa-solid fa-building text-3xl opacity-30"></i>
                                No department data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={depts}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" vertical={false} />
                                    <XAxis
                                        dataKey="department"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#4b5563', fontSize: 10 }}
                                        dy={8}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    />
                                    {/* dataKey="points" matches reshapeDepts output */}
                                    <Bar dataKey="points" name="Points" radius={[6, 6, 0, 0]} barSize={32}>
                                        {depts.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Redemption breakdown */}
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Reward Redemptions</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Most redeemed rewards</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-64 bg-[#171b2e] rounded-xl animate-pulse" />
                    ) : redemptions.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-600 text-sm flex-col gap-2">
                            <i className="fa-solid fa-gift text-3xl opacity-30"></i>
                            No redemptions yet
                        </div>
                    ) : redemptions.length <= 4 ? (
                        // Pie chart for small datasets
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={redemptions}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="redemptionCount"
                                        nameKey="rewardName"
                                        stroke="none"
                                    >
                                        {redemptions.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111420', border: '1px solid #1f2540', borderRadius: '12px' }}
                                        itemStyle={{ color: '#e8eaf6', fontSize: '12px' }}
                                        formatter={(v: any, _: any, props: any) => [`${v} redemptions`, props.payload?.rewardName ?? '']}
                                    />
                                    <Legend
                                        formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        // Bar chart for larger datasets
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={redemptions} layout="vertical" margin={{ left: 8, right: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                                    <YAxis
                                        dataKey="rewardName"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#e8eaf6', fontSize: 11 }}
                                        width={110}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar dataKey="redemptionCount" name="Redemptions" radius={[0, 4, 4, 0]} barSize={16}>
                                        {redemptions.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Performers table ── */}
            {!loading && performers.length > 0 && (
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f2540]">
                        <h3 className="font-syne font-bold text-[#e8eaf6]">Top Performers Detail</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#171b2e] border-b border-[#1f2540]">
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest w-10 text-center">Rank</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:table-cell">Department</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:table-cell">Level</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Total Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2540]">
                            {performers.map((p, i) => (
                                <tr key={p.id} className="hover:bg-[#171b2e]/50 transition-colors">
                                    <td className="px-6 py-3 text-center">
                                        <span className="font-bold text-sm" style={{ color: i === 0 ? '#f7b731' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : '#4b5563' }}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {p.name[0].toUpperCase()}
                                            </div>
                                            <span className="font-bold text-[#e8eaf6] text-sm">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-gray-500 text-sm hidden sm:table-cell">{p.department ?? '—'}</td>
                                    <td className="px-6 py-3 hidden md:table-cell">
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">Lv {p.level}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="font-syne font-bold text-[#43e97b]">{p.totalPoints.toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};