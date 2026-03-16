import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
    employees: number;
    kpisSubmitted: number;
    pendingApprovals: number;
    rewardsRedeemed: number;
    pointsDistributed: number;
    activeChallenges: number;
}

interface KpiTrendPoint {
    date: string;   // label shown on X axis
    count: number;  // value shown on Y axis
}

interface DeptStat {
    department: string;
    points: number;        // renamed from totalPoints to match BarChart dataKey
    employeeCount: number;
}

interface ActivityLog {
    action: string;
    targetTable: string;
    createdAt: string;
    admin?: { name: string };
}

interface TopPerformer {
    id: string;
    name: string;
    department?: string;
    totalPoints: number;
    level: number;
}

// ─── Envelope helper ──────────────────────────────────────────────────────────
// api.ts interceptor returns response.data (the raw JSON body):
//   { success: true, message: '...', data: T }
// So every api.get() call resolves to that envelope object.
// This helper safely pulls out the inner .data field.
function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    // In case some endpoint returns the data directly (no envelope)
    return (envelope as T) ?? fallback;
}

// ─── Data reshaping helpers ───────────────────────────────────────────────────

// kpiTrends endpoint returns: { "2025-03": 450, "2025-04": 320, ... }
// Recharts AreaChart needs:   [{ date: "2025-03", count: 450 }, ...]
function reshapeKpiTrends(raw: Record<string, number> | any[]): KpiTrendPoint[] {
    if (Array.isArray(raw)) {
        // Already array-shaped — just normalise key names
        return raw.map((item: any) => ({
            date: item.date ?? item.week ?? item.month ?? item.key ?? '',
            count: item.count ?? item.points ?? item.value ?? 0,
        }));
    }
    // Object shape: { "2025-03": 450 }
    return Object.entries(raw).map(([key, value]) => ({
        date: key,
        count: typeof value === 'number' ? value : 0,
    }));
}

// departmentStats endpoint returns: { department, totalPoints, employeeCount }
// Recharts BarChart uses dataKey="points" so rename totalPoints → points
function reshapeDeptStats(raw: any[]): DeptStat[] {
    return raw.map((d: any) => ({
        department: d.department ?? 'Unknown',
        points: d.totalPoints ?? d.points ?? 0,
        employeeCount: d.employeeCount ?? d._count ?? 0,
    }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();

    const [stats, setStats] = useState<DashboardStats>({
        employees: 0,
        kpisSubmitted: 0,
        pendingApprovals: 0,
        rewardsRedeemed: 0,
        pointsDistributed: 0,
        activeChallenges: 0,
    });
    const [kpiTrends, setKpiTrends] = useState<KpiTrendPoint[]>([]);
    const [deptStats, setDeptStats] = useState<DeptStat[]>([]);
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fire all requests in parallel for speed
            const [
                empEnv,
                kpiApprovedEnv,
                kpiPendingEnv,
                redeemEnv,
                performersEnv,
                challengesEnv,
                trendsEnv,
                deptsEnv,
                auditEnv,
            ] = await Promise.allSettled([
                api.get('/employees'),
                api.get('/kpis?status=APPROVED'),
                api.get('/kpis?status=PENDING'),
                api.get('/redemptions?status=APPROVED'),
                api.get('/analytics/top-performers'),
                api.get('/gamification/challenges?status=ACTIVE'),
                api.get('/analytics/kpi-trends'),
                api.get('/analytics/department-stats'),
                api.get('/audit?limit=6'),
            ]);

            // ── Safely extract each result ────────────────────────────────────
            // Promise.allSettled never throws — we get { status, value/reason }
            // so one failing endpoint won't crash the whole dashboard.

            const empData = empEnv.status === 'fulfilled' ? empEnv.value : null;
            const kpiApprData = kpiApprovedEnv.status === 'fulfilled' ? kpiApprovedEnv.value : null;
            const kpiPendData = kpiPendingEnv.status === 'fulfilled' ? kpiPendingEnv.value : null;
            const redeemData = redeemEnv.status === 'fulfilled' ? redeemEnv.value : null;
            const perfData = performersEnv.status === 'fulfilled' ? performersEnv.value : null;
            const challData = challengesEnv.status === 'fulfilled' ? challengesEnv.value : null;
            const trendsData = trendsEnv.status === 'fulfilled' ? trendsEnv.value : null;
            const deptsData = deptsEnv.status === 'fulfilled' ? deptsEnv.value : null;
            const auditData = auditEnv.status === 'fulfilled' ? auditEnv.value : null;

            // ── Unwrap envelopes: { success, message, data: T } ───────────────
            // employees endpoint may return paginated: { data: [], pagination: {} }
            const empInner = unwrap<any>(empData, {});
            const employees = empInner?.pagination?.total
                ?? (Array.isArray(empInner) ? empInner.length : 0);

            const kpisApproved = unwrap<any[]>(kpiApprData, []);
            const kpisPending = unwrap<any[]>(kpiPendData, []);
            const redemptions = unwrap<any[]>(redeemData, []);
            const performers = unwrap<TopPerformer[]>(perfData, []);
            const challenges = unwrap<any[]>(challData, []);
            const trendsRaw = unwrap<any>(trendsData, {});
            const deptsRaw = unwrap<any[]>(deptsData, []);

            // audit endpoint returns { data: { data: [], pagination: {} } }
            // because sendPaginated wraps differently — handle both shapes
            const auditInner = unwrap<any>(auditData, { data: [] });
            const auditLogs: ActivityLog[] = Array.isArray(auditInner)
                ? auditInner
                : auditInner?.data ?? [];

            // ── Compute stats ─────────────────────────────────────────────────
            const totalPoints = performers.reduce(
                (sum, p) => sum + (p.totalPoints || 0), 0
            );

            setStats({
                employees,
                kpisSubmitted: Array.isArray(kpisApproved) ? kpisApproved.length : 0,
                pendingApprovals: Array.isArray(kpisPending) ? kpisPending.length : 0,
                rewardsRedeemed: Array.isArray(redemptions) ? redemptions.length : 0,
                pointsDistributed: totalPoints,
                activeChallenges: Array.isArray(challenges) ? challenges.length : 0,
            });

            // ── Reshape for charts ────────────────────────────────────────────
            setKpiTrends(reshapeKpiTrends(trendsRaw));
            setDeptStats(reshapeDeptStats(Array.isArray(deptsRaw) ? deptsRaw : []));
            setActivity(auditLogs.slice(0, 6));
            setTopPerformers(performers.slice(0, 5));

        } catch (err: any) {
            console.error('Dashboard load failed:', err);
            setError('Failed to load dashboard data. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // ── Stat cards config ─────────────────────────────────────────────────────
    const statCards = [
        {
            label: 'Total Employees',
            value: stats.employees,
            icon: 'fa-users',
            color: '--accent',
            bg: 'rgba(108,99,255,0.1)',
            onClick: () => navigate('/admin/employees'),
        },
        {
            label: 'KPIs Submitted',
            value: stats.kpisSubmitted,
            icon: 'fa-bullseye',
            color: '--accent3',
            bg: 'rgba(67,233,123,0.1)',
            onClick: () => navigate('/admin/kpis'),
        },
        {
            label: 'Pending Approvals',
            value: stats.pendingApprovals,
            icon: 'fa-clock',
            color: '--accent4',
            bg: 'rgba(247,183,49,0.1)',
            onClick: () => navigate('/admin/approvals'),
        },
        {
            label: 'Rewards Redeemed',
            value: stats.rewardsRedeemed,
            icon: 'fa-gift',
            color: '--accent2',
            bg: 'rgba(255,101,132,0.1)',
            onClick: () => navigate('/admin/rewards'),
        },
        {
            label: 'Points Distributed',
            value: stats.pointsDistributed.toLocaleString(),
            icon: 'fa-coins',
            color: '--accent',
            bg: 'rgba(108,99,255,0.1)',
            onClick: () => navigate('/admin/analytics'),
        },
        {
            label: 'Active Challenges',
            value: stats.activeChallenges,
            icon: 'fa-trophy',
            color: '--accent3',
            bg: 'rgba(67,233,123,0.1)',
            onClick: () => navigate('/admin/challenges'),
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">
                        Dashboard Overview
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Welcome back, Admin. Here's what's happening today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="bg-[#171b2e] border-[#1f2540] text-gray-400 hover:text-white"
                        onClick={() => navigate('/admin/audit')}
                    >
                        <i className="fa-solid fa-clock-rotate-left mr-2"></i> Audit Logs
                    </Button>
                    <Button
                        variant="primary"
                        className="bg-[#6c63ff] hover:bg-[#5b54d6] shadow-lg shadow-[#6c63ff]/20"
                        onClick={() => navigate('/admin/kpis')}
                    >
                        <i className="fa-solid fa-plus mr-2"></i> Add Entry
                    </Button>
                    <button
                        onClick={loadDashboard}
                        className="w-9 h-9 rounded-lg bg-[#171b2e] border border-[#1f2540] text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Refresh dashboard"
                    >
                        <i className={`fa-solid fa-rotate-right text-sm ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm flex items-center gap-3">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                    <button onClick={loadDashboard} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                {statCards.map((card, i) => (
                    <div
                        key={i}
                        className="stat-card cursor-pointer hover:scale-[1.02] transition-transform"
                        style={{ '--card-accent': `var(${card.color})` } as React.CSSProperties}
                        onClick={card.onClick}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                style={{ backgroundColor: card.bg }}
                            >
                                <i
                                    className={`fa-solid ${card.icon}`}
                                    style={{ color: `var(${card.color})` }}
                                ></i>
                            </div>
                            <i className="fa-solid fa-ellipsis-vertical text-gray-600"></i>
                        </div>
                        <div className="text-2xl font-syne font-bold text-[#e8eaf6]">
                            {loading ? (
                                <span className="inline-block w-12 h-7 bg-[#1f2540] rounded animate-pulse" />
                            ) : (
                                card.value
                            )}
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* KPI Trend */}
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">KPI Performance Trend</h3>
                            <p className="text-xs text-gray-500">Points awarded over time</p>
                        </div>
                        <select className="bg-[#171b2e] border border-[#1f2540] text-[10px] rounded-lg px-2 py-1 text-gray-400">
                            <option>Last 12 Months</option>
                            <option>Last 12 Weeks</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full bg-[#171b2e] rounded-xl animate-pulse" />
                        ) : kpiTrends.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                                No trend data available yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={kpiTrends}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
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
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#4b5563', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#111420',
                                            border: '1px solid #1f2540',
                                            borderRadius: '12px',
                                        }}
                                        itemStyle={{ color: '#6c63ff', fontSize: '12px' }}
                                        formatter={(value: any) => [`${value} pts`, 'Points']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6c63ff"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTrend)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Department Distribution */}
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Department Performance</h3>
                            <p className="text-xs text-gray-500">Total points per department</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#6c63ff]"></span>
                            <span className="text-[10px] text-gray-500 font-bold">Points</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full bg-[#171b2e] rounded-xl animate-pulse" />
                        ) : deptStats.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                                No department data available yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" vertical={false} />
                                    <XAxis
                                        dataKey="department"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#4b5563', fontSize: 10 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#4b5563', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        contentStyle={{
                                            backgroundColor: '#111420',
                                            border: '1px solid #1f2540',
                                            borderRadius: '12px',
                                        }}
                                        formatter={(value: any, _: any, props: any) => [
                                            `${value} pts (${props.payload?.employeeCount ?? 0} employees)`,
                                            props.payload?.department ?? '',
                                        ]}
                                    />
                                    {/* dataKey="points" matches reshapeDeptStats output */}
                                    <Bar dataKey="points" radius={[6, 6, 0, 0]} barSize={32}>
                                        {deptStats.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index % 2 === 0 ? '#6c63ff' : '#43e97b'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Bottom section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Activity log */}
                <div className="lg:col-span-2 glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f2540] flex items-center justify-between">
                        <h3 className="font-syne font-bold text-[#e8eaf6]">Administrator Activity Log</h3>
                        <Button
                            variant="ghost"
                            className="text-[10px] py-1 h-auto text-[#6c63ff]"
                            onClick={() => navigate('/admin/audit')}
                        >
                            View All
                        </Button>
                    </div>
                    <div>
                        {loading ? (
                            <div className="divide-y divide-[#1f2540]">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#1f2540] animate-pulse flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-2/3" />
                                            <div className="h-2 bg-[#1f2540] rounded animate-pulse w-1/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activity.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No recent activity detected.
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1f2540]">
                                {activity.map((log, i) => (
                                    <div
                                        key={i}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-[#171b2e] transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[#171b2e] border border-[#1f2540] flex items-center justify-center text-[#6b7280] flex-shrink-0">
                                                <i className="fa-solid fa-user-gear text-sm"></i>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[#e8eaf6] group-hover:text-[#6c63ff] transition-colors">
                                                    {log.action}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    by {log.admin?.name || 'System'} on{' '}
                                                    <span className="text-gray-400">{log.targetTable}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase">
                                                {new Date(log.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-[#6b7280] mt-1">
                                                {new Date(log.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column — stacked cards */}
                <div className="lg:col-span-1 flex flex-col gap-5">

                    {/* Pending approvals attention card */}
                    <div className="glass-panel p-6 border-l-4 border-l-[#ff6584] bg-gradient-to-br from-[#ff6584]/5 to-transparent flex-1">
                        <div className="flex flex-col h-full">
                            <div className="mb-5">
                                <div className="w-12 h-12 rounded-2xl bg-[#ff6584]/10 flex items-center justify-center text-xl text-[#ff6584] mb-4">
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                </div>
                                <h3 className="font-syne font-extrabold text-lg text-[#e8eaf6] mb-2">
                                    Pending Approvals
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    You have{' '}
                                    <span className="text-[#ff6584] font-bold">
                                        {loading ? '...' : stats.pendingApprovals} requests
                                    </span>{' '}
                                    requiring attention.
                                </p>
                            </div>
                            <div className="mt-auto space-y-3">
                                <Button
                                    className="w-full bg-[#ff6584] hover:bg-[#e05673] text-white py-3 font-bold"
                                    onClick={() => navigate('/admin/approvals')}
                                >
                                    Review Requests Now
                                </Button>
                                <p className="text-[10px] text-center text-gray-600">
                                    Last updated just now
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Top performers mini-list */}
                    <div className="glass-panel overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#1f2540] flex items-center justify-between">
                            <h3 className="font-syne font-bold text-[#e8eaf6] text-sm">Top Performers</h3>
                            <Button
                                variant="ghost"
                                className="text-[10px] py-1 h-auto text-[#6c63ff]"
                                onClick={() => navigate('/admin/leaderboard')}
                            >
                                Full Board
                            </Button>
                        </div>
                        {loading ? (
                            <div className="divide-y divide-[#1f2540]">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#1f2540] animate-pulse" />
                                        <div className="flex-1 h-3 bg-[#1f2540] rounded animate-pulse" />
                                        <div className="w-10 h-3 bg-[#1f2540] rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : topPerformers.length === 0 ? (
                            <div className="px-5 py-6 text-center text-gray-600 text-xs">
                                No performers data yet
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1f2540]">
                                {topPerformers.map((p, i) => (
                                    <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#171b2e] transition-colors">
                                        <span
                                            className="text-xs font-bold w-5 text-center flex-shrink-0"
                                            style={{ color: i === 0 ? '#f7b731' : i === 1 ? '#a0aec0' : i === 2 ? '#cd7f32' : '#4b5563' }}
                                        >
                                            {i + 1}
                                        </span>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-[#e8eaf6] truncate">{p.name}</div>
                                            <div className="text-[10px] text-gray-600 truncate">{p.department ?? 'No dept'}</div>
                                        </div>
                                        <div className="text-xs font-bold text-[#6c63ff] flex-shrink-0">
                                            {p.totalPoints.toLocaleString()} pts
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};