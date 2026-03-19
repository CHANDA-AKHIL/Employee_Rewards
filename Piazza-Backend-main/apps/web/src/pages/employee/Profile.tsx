import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface Stats {
    totalPoints: number;
    level: number;
    streakCount: number;
    badgesEarned: number;
    kpisCompleted: number;
    rewardsRedeemed: number;
    rank: number;
}

interface RecentKpi {
    id: string;
    title: string;
    pointValue: number;
    status: string;
    approvedAt?: string | null;
    createdAt: string;
}

interface RecentBadge {
    id: string;
    unlockedAt: string;
    badge: {
        id: string;
        name: string;
        description?: string | null;
        imageUrl?: string | null;
        unlockCondition: string;
    };
}

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function parseConditionLabel(raw: string): string {
    try {
        const p = JSON.parse(raw);
        if (p.type === 'points') return `Earn ${p.threshold.toLocaleString()} total points`;
        if (p.type === 'kpis_completed') return `Complete ${p.threshold} KPIs`;
        if (p.type === 'streak') return `Maintain a ${p.threshold}-day streak`;
    } catch { /* not JSON */ }
    return raw;
}

export const EmployeeProfile: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [stats, setStats] = useState<Stats | null>(null);
    const [recentKpis, setRecentKpis] = useState<RecentKpi[]>([]);
    const [recentBadges, setRecentBadges] = useState<RecentBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedBadge, setSelectedBadge] = useState<RecentBadge | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError('');
            const [statsEnv, kpisEnv, badgesEnv] = await Promise.allSettled([
                api.get(`/employees/${user.id}/stats`),
                api.get('/kpis?status=APPROVED'),
                api.get('/gamification/badges/mine'),
            ]);

            if (statsEnv.status === 'fulfilled') setStats(unwrap<Stats>(statsEnv.value, null as any));
            if (kpisEnv.status === 'fulfilled') {
                const p = kpisEnv.value as any;
                setRecentKpis(Array.isArray(p?.data) ? p.data.slice(0, 5) : []);
            }
            if (badgesEnv.status === 'fulfilled') {
                const list = unwrap<RecentBadge[]>(badgesEnv.value, []);
                setRecentBadges(Array.isArray(list) ? list.slice(0, 6) : []);
            }
        } catch {
            setError('Failed to load profile.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-[#111420] rounded-2xl border border-[#1f2540]" />
                <div className="grid grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-[#111420] rounded-xl border border-[#1f2540]" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">My Profile</h1>
                <p className="text-gray-500 text-sm mt-1">Your performance summary. Click any badge to see details.</p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={fetchProfile} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* Hero */}
            <div className="glass-panel p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-l-4 border-l-[#6c63ff]">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-3xl font-bold font-syne flex-shrink-0 shadow-lg shadow-[#6c63ff]/20">
                    {user?.name ? initials(user.name) : 'U'}
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl font-syne font-bold text-[#e8eaf6]">{user?.name}</h2>
                    <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                        <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20">{user?.role}</span>
                        {(user as any)?.department && (
                            <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#43e97b]/10 text-[#43e97b] border border-[#43e97b]/20">{(user as any).department}</span>
                        )}
                        {stats && <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#f7b731]/10 text-[#f7b731] border border-[#f7b731]/20">Level {stats.level}</span>}
                        {stats && stats.rank > 0 && <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#ff6584]/10 text-[#ff6584] border border-[#ff6584]/20">Rank #{stats.rank}</span>}
                    </div>
                </div>
                {stats && (
                    <div className="text-center">
                        <div className="text-4xl font-syne font-extrabold text-[#6c63ff]">{stats.totalPoints.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Total Points</div>
                    </div>
                )}
            </div>

            {/* Stats grid */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Total Points', value: stats.totalPoints.toLocaleString(), color: '#6c63ff', icon: 'fa-trophy' },
                        { label: 'Level', value: `Lv. ${stats.level}`, color: '#f7b731', icon: 'fa-layer-group' },
                        { label: 'Streak', value: `${stats.streakCount}d`, color: '#f59e0b', icon: 'fa-fire' },
                        { label: 'KPIs Done', value: stats.kpisCompleted, color: '#43e97b', icon: 'fa-circle-check' },
                        { label: 'Badges', value: stats.badgesEarned, color: '#06b6d4', icon: 'fa-medal' },
                        { label: 'Rewards', value: stats.rewardsRedeemed, color: '#ff6584', icon: 'fa-gift' },
                    ].map((s, i) => (
                        <div key={i} className="glass-panel p-4 flex flex-col items-center text-center gap-2">
                            <i className={`fa-solid ${s.icon} text-xl`} style={{ color: s.color }}></i>
                            <div className="text-xl font-syne font-bold text-[#e8eaf6]">{s.value}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recent KPIs */}
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f2540]">
                        <h3 className="font-syne font-bold text-[#e8eaf6]">Recent Approved KPIs</h3>
                    </div>
                    {recentKpis.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-sm">
                            <i className="fa-solid fa-bullseye text-2xl mb-2 block opacity-30"></i>No approved KPIs yet
                        </div>
                    ) : (
                        <div className="divide-y divide-[#1f2540]">
                            {recentKpis.map(kpi => (
                                <div key={kpi.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#171b2e] transition-colors">
                                    <div>
                                        <div className="text-sm font-bold text-[#e8eaf6]">{kpi.title}</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                            {kpi.approvedAt
                                                ? `Approved ${new Date(kpi.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                                : `Created ${new Date(kpi.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                                        </div>
                                    </div>
                                    <span className="text-sm font-syne font-bold text-[#43e97b]">+{kpi.pointValue} pts</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Badges — clickable */}
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f2540] flex items-center justify-between">
                        <h3 className="font-syne font-bold text-[#e8eaf6]">Recent Badges</h3>
                        <span className="text-[10px] text-gray-600">Click to view details</span>
                    </div>
                    {recentBadges.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-sm">
                            <i className="fa-solid fa-medal text-2xl mb-2 block opacity-30"></i>No badges earned yet
                        </div>
                    ) : (
                        <div className="p-4 grid grid-cols-3 gap-3">
                            {recentBadges.map(eb => (
                                <button key={eb.id} onClick={() => setSelectedBadge(eb)}
                                    className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-[#171b2e] border border-[#1f2540] hover:border-[#f7b731]/50 hover:scale-[1.04] transition-all group cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f7b731]/20 to-[#6c63ff]/20 flex items-center justify-center border border-[#f7b731]/20 group-hover:border-[#f7b731]/50 transition-colors">
                                        {eb.badge.imageUrl
                                            ? <img src={eb.badge.imageUrl} alt={eb.badge.name} className="w-8 h-8 object-contain" />
                                            : <i className="fa-solid fa-medal text-xl text-[#f7b731]"></i>
                                        }
                                    </div>
                                    <div className="text-[11px] font-bold text-[#e8eaf6] group-hover:text-[#f7b731] transition-colors line-clamp-1">{eb.badge.name}</div>
                                    <div className="text-[9px] text-gray-600">
                                        {new Date(eb.unlockedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Badge Detail Popup ── */}
            {selectedBadge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedBadge(null)}>
                    <div className="w-full max-w-sm mx-4 bg-[#111420] border border-[#1f2540] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2540]">
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Badge Details</h3>
                            <button onClick={() => setSelectedBadge(null)}
                                className="w-7 h-7 rounded-lg bg-[#171b2e] text-gray-500 hover:text-white flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center text-center gap-5">
                            {/* Badge */}
                            <div className="relative">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#f7b731]/20 to-[#6c63ff]/20 flex items-center justify-center border-4 border-[#f7b731] shadow-[0_0_30px_rgba(247,183,49,0.3)]">
                                    {selectedBadge.badge.imageUrl
                                        ? <img src={selectedBadge.badge.imageUrl} alt={selectedBadge.badge.name} className="w-20 h-20 object-contain drop-shadow-lg" />
                                        : <i className="fa-solid fa-medal text-5xl text-[#f7b731]"></i>
                                    }
                                </div>
                                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#f7b731] flex items-center justify-center shadow-lg">
                                    <i className="fa-solid fa-check text-white text-sm"></i>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-syne font-bold text-[#e8eaf6]">{selectedBadge.badge.name}</h2>
                                <p className="text-xs text-[#f7b731] font-bold mt-1">
                                    ✓ Earned on {new Date(selectedBadge.unlockedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>

                            {selectedBadge.badge.description && (
                                <p className="text-sm text-gray-400 leading-relaxed">{selectedBadge.badge.description}</p>
                            )}

                            <div className="w-full p-4 rounded-xl bg-[#0a0c14] border border-[#1f2540]">
                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">You earned this by:</div>
                                <div className="text-sm font-bold text-[#43e97b]">
                                    <i className="fa-solid fa-circle-check mr-2"></i>
                                    {parseConditionLabel(selectedBadge.badge.unlockCondition)}
                                </div>
                            </div>

                            <button onClick={() => setSelectedBadge(null)}
                                className="w-full py-3 rounded-xl bg-[#6c63ff] hover:bg-[#5b54d6] text-white font-bold text-sm transition-all">
                                Awesome! 🎉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};