import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { getSocket } from '../../socket/socket';

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

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

function parseConditionLabel(raw: string): string {
    try {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'points') return `Earn ${parsed.threshold.toLocaleString()} total points`;
        if (parsed.type === 'kpis_completed') return `Complete ${parsed.threshold} KPIs`;
        if (parsed.type === 'streak') return `Maintain a ${parsed.threshold}-day streak`;
    } catch { /* not JSON */ }
    return raw;
}

export const EmployeeBadges: React.FC = () => {
    const [badges, setBadges] = useState<MappedBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [celebration, setCelebration] = useState<Badge | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'EARNED' | 'LOCKED'>('ALL');
    const [selectedBadge, setSelectedBadge] = useState<MappedBadge | null>(null); // detail modal

    const fetchBadges = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const [allEnv, mineEnv] = await Promise.allSettled([
                api.get('/gamification/badges'),
                api.get('/gamification/badges/mine'),
            ]);

            const allBadges: Badge[] = allEnv.status === 'fulfilled' ? unwrap<Badge[]>(allEnv.value, []) : [];
            const myBadges: any[] = mineEnv.status === 'fulfilled' ? unwrap<any[]>(mineEnv.value, []) : [];

            const mapped: MappedBadge[] = allBadges.map(b => {
                const earned = myBadges.find(mb => mb.badgeId === b.id || mb.badge?.id === b.id);
                return { ...b, earned: !!earned, unlockedAt: earned?.unlockedAt ?? null };
            });

            setBadges(mapped);
        } catch {
            setError('Failed to load badges. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBadges();
        const socket = getSocket();
        if (socket) {
            socket.on('badge:unlocked', (badgeData: Badge) => {
                setCelebration(badgeData);
                fetchBadges();
                setTimeout(() => setCelebration(null), 5000);
            });
        }
        return () => { if (socket) socket.off('badge:unlocked'); };
    }, [fetchBadges]);

    const earned = badges.filter(b => b.earned);
    const locked = badges.filter(b => !b.earned);
    const shown = filter === 'EARNED' ? earned : filter === 'LOCKED' ? locked : badges;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">

            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Achievements & Badges</h1>
                <p className="text-gray-500 text-sm mt-1">Click any badge to see details. Earn badges by hitting milestones.</p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={fetchBadges} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* Stats */}
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

            {/* Filter tabs */}
            <div className="flex gap-2">
                {([
                    { key: 'ALL', label: `All (${badges.length})` },
                    { key: 'EARNED', label: `Earned (${earned.length})` },
                    { key: 'LOCKED', label: `Locked (${locked.length})` },
                ] as const).map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key ? 'bg-[#6c63ff] text-white' : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Badge grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="glass-panel p-6 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-[#1f2540] animate-pulse" />
                            <div className="h-3 w-20 bg-[#1f2540] rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : shown.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <i className="fa-solid fa-certificate text-4xl text-gray-700 mb-4 block"></i>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">
                        {filter === 'EARNED' ? 'No badges earned yet' : 'No badges found'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {filter === 'EARNED' ? 'Complete KPIs and challenges to earn your first badge!' : 'Your admin hasn\'t created any badges yet.'}
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
                                    <button key={b.id} onClick={() => setSelectedBadge(b)}
                                        className="glass-panel p-5 flex flex-col items-center text-center gap-3 border border-[#6c63ff]/20 hover:border-[#6c63ff]/60 hover:scale-[1.03] transition-all duration-200 group cursor-pointer">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6c63ff]/20 to-[#ff6584]/20 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(108,99,255,0.2)]">
                                            {b.imageUrl
                                                ? <img src={b.imageUrl} alt={b.name} className="w-full h-full object-contain p-1 drop-shadow-lg" />
                                                : <i className="fa-solid fa-medal text-2xl text-[#f7b731]"></i>
                                            }
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#e8eaf6] text-sm group-hover:text-[#6c63ff] transition-colors">{b.name}</h3>
                                        </div>
                                        {b.unlockedAt && (
                                            <span className="text-[10px] font-bold text-[#6c63ff] bg-[#6c63ff]/10 px-2.5 py-1 rounded-full">
                                                {new Date(b.unlockedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        )}
                                        <span className="text-[9px] text-gray-600 group-hover:text-[#6c63ff] transition-colors">Click to view details</span>
                                    </button>
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
                                    <button key={b.id} onClick={() => setSelectedBadge(b)}
                                        className="glass-panel p-5 flex flex-col items-center text-center gap-3 opacity-60 hover:opacity-90 transition-all duration-200 group cursor-pointer hover:border-[#f7b731]/30">
                                        <div className="w-16 h-16 rounded-full bg-[#1f2540] flex items-center justify-center relative overflow-hidden">
                                            {b.imageUrl ? (
                                                <>
                                                    <img src={b.imageUrl} alt={b.name} className="w-full h-full object-contain p-1 grayscale" />
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
                                        </div>
                                        <span className="text-[9px] text-gray-600 group-hover:text-[#f7b731] transition-colors">Click to see how to earn</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* ── Badge Detail Modal ── */}
            {selectedBadge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedBadge(null)}>
                    <div className="w-full max-w-sm mx-4 bg-[#111420] border border-[#1f2540] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2540]">
                            <h3 className="font-syne font-bold text-[#e8eaf6]">
                                {selectedBadge.earned ? 'Badge Details' : 'How to Earn This Badge'}
                            </h3>
                            <button onClick={() => setSelectedBadge(null)}
                                className="w-7 h-7 rounded-lg bg-[#171b2e] text-gray-500 hover:text-white flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col items-center text-center gap-5">
                            {/* Badge image */}
                            <div className="relative">
                                <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl border-4 ${selectedBadge.earned
                                        ? 'border-[#f7b731] bg-gradient-to-br from-[#f7b731]/20 to-[#6c63ff]/20 shadow-[0_0_30px_rgba(247,183,49,0.3)]'
                                        : 'border-[#1f2540] bg-[#0d0f1a]'
                                    }`}>
                                    {selectedBadge.imageUrl ? (
                                        <img src={selectedBadge.imageUrl} alt={selectedBadge.name}
                                            className={`w-20 h-20 object-contain ${!selectedBadge.earned ? 'grayscale opacity-50' : 'drop-shadow-lg'}`} />
                                    ) : (
                                        <i className={`fa-solid fa-medal text-5xl ${selectedBadge.earned ? 'text-[#f7b731]' : 'text-gray-600'}`}></i>
                                    )}
                                </div>
                                {selectedBadge.earned && (
                                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#f7b731] flex items-center justify-center shadow-lg">
                                        <i className="fa-solid fa-check text-white text-sm"></i>
                                    </div>
                                )}
                            </div>

                            {/* Name + status */}
                            <div>
                                <h2 className="text-xl font-syne font-bold text-[#e8eaf6]">{selectedBadge.name}</h2>
                                {selectedBadge.earned && selectedBadge.unlockedAt && (
                                    <p className="text-xs text-[#f7b731] font-bold mt-1">
                                        ✓ Earned on {new Date(selectedBadge.unlockedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                                {!selectedBadge.earned && (
                                    <p className="text-xs text-gray-500 mt-1 font-bold uppercase tracking-wider">Not yet earned</p>
                                )}
                            </div>

                            {/* Description */}
                            {selectedBadge.description && (
                                <p className="text-sm text-gray-400 leading-relaxed">{selectedBadge.description}</p>
                            )}

                            {/* Unlock condition */}
                            <div className="w-full p-4 rounded-xl bg-[#0a0c14] border border-[#1f2540]">
                                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                                    {selectedBadge.earned ? 'You earned this by:' : 'To earn this badge:'}
                                </div>
                                <div className={`text-sm font-bold ${selectedBadge.earned ? 'text-[#43e97b]' : 'text-[#f7b731]'}`}>
                                    <i className={`fa-solid ${selectedBadge.earned ? 'fa-circle-check' : 'fa-bullseye'} mr-2`}></i>
                                    {parseConditionLabel(selectedBadge.unlockCondition)}
                                </div>
                            </div>

                            <button onClick={() => setSelectedBadge(null)}
                                className="w-full py-3 rounded-xl bg-[#6c63ff] hover:bg-[#5b54d6] text-white font-bold text-sm transition-all">
                                {selectedBadge.earned ? 'Awesome! 🎉' : 'Got it!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Celebration overlay ── */}
            {celebration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="text-center animate-in zoom-in duration-500 space-y-6">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-[#6c63ff] blur-[80px] opacity-40 rounded-full animate-pulse" />
                            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-[#6c63ff]/30 to-[#ff6584]/30 flex items-center justify-center border-4 border-[#6c63ff]/50 shadow-[0_0_60px_rgba(108,99,255,0.4)]">
                                {celebration.imageUrl
                                    ? <img src={celebration.imageUrl} alt={celebration.name} className="w-24 h-24 object-contain drop-shadow-2xl" />
                                    : <i className="fa-solid fa-medal text-6xl text-[#f7b731]"></i>
                                }
                            </div>
                        </div>
                        <div>
                            <h2 className="text-4xl font-syne font-extrabold text-[#e8eaf6] mb-2">Badge Unlocked!</h2>
                            <p className="text-xl text-[#6c63ff] font-bold">{celebration.name}</p>
                            {celebration.description && <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">{celebration.description}</p>}
                        </div>
                        <button onClick={() => setCelebration(null)} className="px-8 py-3 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold transition-all">
                            Awesome! 🎉
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};