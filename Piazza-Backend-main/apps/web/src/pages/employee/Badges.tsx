import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { getSocket } from '../../socket/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
// GET /gamification/badges      → sendSuccess → payload.data = Badge[]
// GET /gamification/badges/mine → sendSuccess → payload.data = EmployeeBadge[]
// EmployeeBadge has { id, badgeId, unlockedAt, badge: Badge }

interface Badge {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    unlockCondition: string;
}

interface MappedBadge extends Badge {
    earned: boolean;
    unlockedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmployeeBadges: React.FC = () => {
    const [badges, setBadges] = useState<MappedBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [celebration, setCelebration] = useState<Badge | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'EARNED' | 'LOCKED'>('ALL');

    // ── Fetch all badges + my earned badges ───────────────────────────────────
    const fetchBadges = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const [allEnv, mineEnv] = await Promise.allSettled([
                // GET /gamification/badges → sendSuccess → payload.data = Badge[]
                api.get('/gamification/badges'),
                // GET /gamification/badges/mine → sendSuccess → payload.data = EmployeeBadge[]
                // Each: { id, badgeId, unlockedAt, badge: Badge }
                api.get('/gamification/badges/mine'),
            ]);

            const allBadges: Badge[] = allEnv.status === 'fulfilled'
                ? unwrap<Badge[]>(allEnv.value, [])
                : [];

            const myBadges: any[] = mineEnv.status === 'fulfilled'
                ? unwrap<any[]>(mineEnv.value, [])
                : [];

            // Map earned state onto full badge list
            const mapped: MappedBadge[] = allBadges.map(b => {
                // myBadges entries: { id, badgeId, unlockedAt, badge }
                const earned = myBadges.find(
                    mb => mb.badgeId === b.id || mb.badge?.id === b.id
                );
                return {
                    ...b,
                    earned: !!earned,
                    unlockedAt: earned?.unlockedAt ?? null,
                };
            });

            setBadges(mapped);
        } catch (err: any) {
            setError('Failed to load badges. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBadges();

        // Real-time badge unlock event from socket
        const socket = getSocket();
        if (socket) {
            socket.on('badge:unlocked', (badgeData: Badge) => {
                setCelebration(badgeData);
                fetchBadges();
                setTimeout(() => setCelebration(null), 5000);
            });
        }
        return () => {
            if (socket) socket.off('badge:unlocked');
        };
    }, [fetchBadges]);

    const earned = badges.filter(b => b.earned);
    const locked = badges.filter(b => !b.earned);
    const shown = filter === 'EARNED' ? earned : filter === 'LOCKED' ? locked : badges;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">

            {/* ── Header ── */}
            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Achievements & Badges</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Collect badges by completing challenges and hitting milestones.
                </p>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                    <button onClick={fetchBadges} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Badges', value: badges.length, icon: 'fa-certificate', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
                    { label: 'Earned', value: earned.length, icon: 'fa-star', color: '#f7b731', bg: 'rgba(247,183,49,0.1)' },
                    { label: 'Remaining', value: locked.length, icon: 'fa-lock', color: '#ff6584', bg: 'rgba(255,101,132,0.1)' },
                ].map((s, i) => (
                    <div key={i} className="glass-panel p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
                            <i className={`fa-solid ${s.icon} text-sm`} style={{ color: s.color }}></i>
                        </div>
                        <div>
                            <div className="text-xl font-syne font-bold text-[#e8eaf6]">
                                {loading ? <span className="inline-block w-6 h-5 bg-[#1f2540] rounded animate-pulse" /> : s.value}
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter tabs ── */}
            <div className="flex gap-2">
                {([
                    { key: 'ALL', label: `All (${badges.length})` },
                    { key: 'EARNED', label: `Earned (${earned.length})` },
                    { key: 'LOCKED', label: `Locked (${locked.length})` },
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key
                            ? 'bg-[#6c63ff] text-white'
                            : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Badge grid ── */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="glass-panel p-6 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-[#1f2540] animate-pulse" />
                            <div className="h-3 w-20 bg-[#1f2540] rounded animate-pulse" />
                            <div className="h-2 w-16 bg-[#1f2540] rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : shown.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center text-3xl text-[#6c63ff] mx-auto mb-4">
                        <i className="fa-solid fa-certificate"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">
                        {filter === 'EARNED' ? 'No badges earned yet' : 'No badges found'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {filter === 'EARNED'
                            ? 'Complete KPIs and challenges to earn your first badge!'
                            : 'Your admin hasn\'t created any badges yet.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Earned section */}
                    {(filter === 'ALL' || filter === 'EARNED') && earned.length > 0 && (
                        <section>
                            <h2 className="font-syne font-bold text-[#e8eaf6] text-lg mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-star text-[#f7b731]"></i>
                                Earned Badges
                                <span className="text-sm font-normal text-gray-500">({earned.length})</span>
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {earned.map(b => (
                                    <div
                                        key={b.id}
                                        className="glass-panel p-5 flex flex-col items-center text-center gap-3 border border-[#6c63ff]/20 hover:border-[#6c63ff]/50 hover:scale-[1.02] transition-all duration-200 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6c63ff]/20 to-[#ff6584]/20 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(108,99,255,0.2)]">
                                            {b.imageUrl ? (
                                                <img
                                                    src={b.imageUrl}
                                                    alt={b.name}
                                                    className="w-full h-full object-contain p-1 drop-shadow-lg"
                                                />
                                            ) : (
                                                <i className="fa-solid fa-medal text-2xl text-[#f7b731]"></i>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#e8eaf6] text-sm group-hover:text-[#6c63ff] transition-colors">
                                                {b.name}
                                            </h3>
                                            {b.description && (
                                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{b.description}</p>
                                            )}
                                        </div>
                                        {b.unlockedAt && (
                                            <span className="text-[10px] font-bold text-[#6c63ff] bg-[#6c63ff]/10 px-2.5 py-1 rounded-full">
                                                {new Date(b.unlockedAt).toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                })}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Locked section */}
                    {(filter === 'ALL' || filter === 'LOCKED') && locked.length > 0 && (
                        <section className={filter === 'ALL' ? 'pt-6 border-t border-[#1f2540]' : ''}>
                            <h2 className="font-syne font-bold text-gray-600 text-lg mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-lock text-gray-600"></i>
                                Locked Badges
                                <span className="text-sm font-normal">({locked.length})</span>
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {locked.map(b => (
                                    <div
                                        key={b.id}
                                        className="glass-panel p-5 flex flex-col items-center text-center gap-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-300 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[#1f2540] flex items-center justify-center relative overflow-hidden">
                                            {b.imageUrl ? (
                                                <>
                                                    <img
                                                        src={b.imageUrl}
                                                        alt={b.name}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                                                        <i className="fa-solid fa-lock text-white text-lg"></i>
                                                    </div>
                                                </>
                                            ) : (
                                                <i className="fa-solid fa-lock text-gray-500 text-xl"></i>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-400 text-sm">{b.name}</h3>
                                            <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                                                {b.unlockCondition ?? 'Keep participating to unlock'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* ── Badge unlock celebration overlay ── */}
            {celebration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="text-center animate-in zoom-in duration-500 space-y-6">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-[#6c63ff] blur-[80px] opacity-40 rounded-full animate-pulse" />
                            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-[#6c63ff]/30 to-[#ff6584]/30 flex items-center justify-center border-4 border-[#6c63ff]/50 shadow-[0_0_60px_rgba(108,99,255,0.4)]">
                                {celebration.imageUrl ? (
                                    <img
                                        src={celebration.imageUrl}
                                        alt={celebration.name}
                                        className="w-24 h-24 object-contain drop-shadow-2xl"
                                    />
                                ) : (
                                    <i className="fa-solid fa-medal text-6xl text-[#f7b731]"></i>
                                )}
                            </div>
                            <i className="fa-solid fa-sparkles absolute -top-4 -left-4 text-[#f7b731] text-2xl animate-bounce"></i>
                            <i className="fa-solid fa-sparkles absolute -bottom-4 -right-4 text-[#6c63ff] text-xl animate-bounce" style={{ animationDelay: '200ms' }}></i>
                        </div>
                        <div>
                            <h2 className="text-4xl font-syne font-extrabold text-[#e8eaf6] mb-2">
                                Badge Unlocked!
                            </h2>
                            <p className="text-xl text-[#6c63ff] font-bold">{celebration.name}</p>
                            {celebration.description && (
                                <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">{celebration.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setCelebration(null)}
                            className="px-8 py-3 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold transition-all"
                        >
                            Awesome! 🎉
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};