import React, { useEffect, useState, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface Kpi {
    id: string;
    title: string;
    pointValue: number;
    status: string;
    createdAt: string;
    approvedAt?: string | null;
}


interface TrendPoint {
    date: string;
    points: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#111420] border border-[#1f2540] px-4 py-3 rounded-xl shadow-2xl text-sm">
            <p className="text-gray-400 font-bold mb-1">{label}</p>
            <p className="text-[#6c63ff] font-bold">{payload[0].value.toLocaleString()} pts</p>
        </div>
    );
};

export const EmployeeAnalytics: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [trend, setTrend] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError('');

            const [kpisEnv, ledgerEnv] = await Promise.allSettled([
                // GET /kpis → employee sees their own
                api.get('/kpis'),
                // GET /employees/:id/stats doesn't return ledger
                // We'll approximate trend from KPI approvals
                api.get('/kpis?status=APPROVED'),
            ]);

            let allKpis: Kpi[] = [];
            let approvedKpis: Kpi[] = [];

            if (kpisEnv.status === 'fulfilled') {
                const p = kpisEnv.value as any;
                allKpis = Array.isArray(p?.data) ? p.data : [];
                setKpis(allKpis);
            }

            if (ledgerEnv.status === 'fulfilled') {
                const p = ledgerEnv.value as any;
                approvedKpis = Array.isArray(p?.data) ? p.data : [];
            }

            // Build trend from approved KPIs grouped by month
            const trendMap: Record<string, number> = {};
            for (const kpi of approvedKpis) {
                if (!kpi.approvedAt) continue;
                const d = new Date(kpi.approvedAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                trendMap[key] = (trendMap[key] || 0) + kpi.pointValue;
            }
            const trendArr = Object.entries(trendMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, points]) => ({ date, points }));
            setTrend(trendArr);

        } catch (err: any) {
            setError('Failed to load analytics.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const approved = kpis.filter(k => k.status === 'APPROVED');
    const pending = kpis.filter(k => k.status === 'PENDING' || k.status === 'COMPLETE');
    const rejected = kpis.filter(k => k.status === 'REJECTED');
    const totalEarned = approved.reduce((s, k) => s + k.pointValue, 0);

    const statusDist = [
        { name: 'Approved', value: approved.length, color: '#43e97b' },
        { name: 'Pending', value: pending.length, color: '#f7b731' },
        { name: 'Rejected', value: rejected.length, color: '#ff6584' },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">My Analytics</h1>
                <p className="text-gray-500 text-sm mt-1">Your personal performance breakdown.</p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={fetchData} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total KPIs', value: kpis.length, color: '#6c63ff', icon: 'fa-bullseye' },
                    { label: 'Points Earned', value: totalEarned.toLocaleString(), color: '#43e97b', icon: 'fa-coins' },
                    { label: 'KPIs Approved', value: approved.length, color: '#43e97b', icon: 'fa-circle-check' },
                    { label: 'KPIs Rejected', value: rejected.length, color: '#ff6584', icon: 'fa-circle-xmark' },
                ].map((s, i) => (
                    <div key={i} className="glass-panel p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${s.color}18` }}>
                            <i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i>
                        </div>
                        <div>
                            <div className="text-xl font-syne font-bold text-[#e8eaf6]">
                                {loading ? <span className="inline-block w-8 h-5 bg-[#1f2540] rounded animate-pulse" /> : s.value}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Points earned per month ── */}
                <div className="glass-panel p-6">
                    <div className="mb-6">
                        <h3 className="font-syne font-bold text-[#e8eaf6]">Points Earned Per Month</h3>
                        <p className="text-xs text-gray-500 mt-0.5">From approved KPIs</p>
                    </div>
                    <div className="h-56">
                        {loading ? (
                            <div className="h-full bg-[#171b2e] rounded-xl animate-pulse" />
                        ) : trend.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                <i className="fa-solid fa-chart-area text-3xl opacity-30"></i>
                                <p className="text-sm">No approved KPIs yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trend}>
                                    <defs>
                                        <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="points" stroke="#6c63ff" strokeWidth={2.5} fill="url(#empGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ── KPI status distribution ── */}
                <div className="glass-panel p-6">
                    <div className="mb-6">
                        <h3 className="font-syne font-bold text-[#e8eaf6]">KPI Status Distribution</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Breakdown of all assigned KPIs</p>
                    </div>
                    {loading ? (
                        <div className="h-56 bg-[#171b2e] rounded-xl animate-pulse" />
                    ) : statusDist.length === 0 ? (
                        <div className="h-56 flex flex-col items-center justify-center text-gray-600 gap-2">
                            <i className="fa-solid fa-chart-bar text-3xl opacity-30"></i>
                            <p className="text-sm">No KPIs yet</p>
                        </div>
                    ) : (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusDist} margin={{ left: 0, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2540" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111420', border: '1px solid #1f2540', borderRadius: '12px' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    />
                                    <Bar dataKey="value" name="KPIs" radius={[6, 6, 0, 0]} barSize={40}>
                                        {statusDist.map((d, i) => (
                                            <Cell key={i} fill={d.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Full KPI history ── */}
            <div className="glass-panel overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f2540]">
                    <h3 className="font-syne font-bold text-[#e8eaf6]">Full KPI History</h3>
                </div>
                {loading ? (
                    <div className="divide-y divide-[#1f2540]">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="px-6 py-4">
                                <div className="h-4 bg-[#1f2540] rounded animate-pulse w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : kpis.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 text-sm">No KPIs assigned yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#171b2e] border-b border-[#1f2540]">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">KPI</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Points</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1f2540]">
                                {kpis.map(kpi => (
                                    <tr key={kpi.id} className="hover:bg-[#171b2e]/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#e8eaf6]">{kpi.title}</td>
                                        <td className="px-6 py-4 text-right font-syne font-bold text-[#6c63ff]">+{kpi.pointValue}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${kpi.status === 'APPROVED' ? 'bg-[#43e97b]/10 text-[#43e97b]' :
                                                kpi.status === 'REJECTED' ? 'bg-[#ff6584]/10 text-[#ff6584]' :
                                                    kpi.status === 'COMPLETE' ? 'bg-[#06b6d4]/10 text-[#06b6d4]' :
                                                        'bg-[#f7b731]/10 text-[#f7b731]'
                                                }`}>
                                                {kpi.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {new Date(kpi.approvedAt ?? kpi.createdAt).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};