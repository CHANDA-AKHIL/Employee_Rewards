import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Challenge {
    id: string;
    title: string;
    description?: string;
    targetPoints: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    participations?: { id: string; employeeId: string; status: string }[];
}

interface ChallengeProgress {
    challengeId: string;
    currentPoints: number;
    targetPoints: number;
    percentComplete: number;
    status: string;
    joined: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function isExpired(endDate: string) {
    return new Date(endDate) < new Date();
}

function daysLeft(endDate: string) {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${d} day${d === 1 ? '' : 's'} left`;
}

function progressColor(pct: number) {
    if (pct >= 100) return '#43e97b';
    if (pct >= 60) return '#6c63ff';
    if (pct >= 30) return '#f7b731';
    return '#ff6584';
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmployeeChallenges: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'JOINED' | 'AVAILABLE'>('ALL');

    // ── Load all active challenges ────────────────────────────────────────────
    const loadChallenges = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get('/gamification/challenges');
            const data = unwrap<Challenge[]>(res, []);
            const list = Array.isArray(data) ? data : [];
            setChallenges(list);

            // Load progress for each challenge in parallel
            const progressEntries = await Promise.allSettled(
                list.map(async (c) => {
                    const progRes = await api.get(`/gamification/challenges/${c.id}/progress`);
                    const prog = unwrap<ChallengeProgress>(progRes, {
                        challengeId: c.id,
                        currentPoints: 0,
                        targetPoints: c.targetPoints,
                        percentComplete: 0,
                        status: 'NOT_JOINED',
                        joined: false,
                    });
                    return { id: c.id, prog };
                })
            );

            const progressMap: Record<string, ChallengeProgress> = {};
            progressEntries.forEach(result => {
                if (result.status === 'fulfilled') {
                    progressMap[result.value.id] = result.value.prog;
                }
            });
            setProgress(progressMap);

        } catch (err: any) {
            setError('Failed to load challenges. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadChallenges(); }, [loadChallenges]);

    // ── Join challenge ────────────────────────────────────────────────────────
    const handleJoin = async (challengeId: string, challengeTitle: string) => {
        try {
            setJoiningId(challengeId);

            // POST /gamification/challenges/:id/join
            await api.post(`/gamification/challenges/${challengeId}/join`, {});

            // Reload progress for this challenge
            setLoadingProgress(challengeId);
            try {
                const progRes = await api.get(`/gamification/challenges/${challengeId}/progress`);
                const prog = unwrap<ChallengeProgress>(progRes, {
                    challengeId,
                    currentPoints: 0,
                    targetPoints: 0,
                    percentComplete: 0,
                    status: 'ACTIVE',
                    joined: true,
                });
                setProgress(prev => ({ ...prev, [challengeId]: prog }));
            } catch {
                // If progress fetch fails, just mark as joined locally
                setProgress(prev => ({
                    ...prev,
                    [challengeId]: {
                        ...(prev[challengeId] ?? {}),
                        joined: true,
                        status: 'ACTIVE',
                    } as ChallengeProgress,
                }));
            } finally {
                setLoadingProgress(null);
            }

            setSuccessMsg(`You've joined "${challengeTitle}"! Good luck! 🎯`);
            setTimeout(() => setSuccessMsg(''), 4000);

        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Failed to join challenge.';
            setError(msg);
            setTimeout(() => setError(''), 4000);
        } finally {
            setJoiningId(null);
        }
    };

    // ── Derived state ─────────────────────────────────────────────────────────
    const isJoined = (c: Challenge) => {
        const prog = progress[c.id];
        if (prog?.joined) return true;
        // Also check participations array if progress hasn't loaded yet
        return c.participations?.some(p => p.employeeId === user?.id) ?? false;
    };

    const filtered = challenges.filter(c => {
        if (filter === 'JOINED') return isJoined(c);
        if (filter === 'AVAILABLE') return !isJoined(c) && c.isActive && !isExpired(c.endDate);
        return true;
    });

    const joinedCount = challenges.filter(c => isJoined(c)).length;
    const availableCount = challenges.filter(c => !isJoined(c) && c.isActive && !isExpired(c.endDate)).length;
    const completedCount = Object.values(progress).filter(p => p?.percentComplete >= 100).length;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Challenges</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Join challenges, earn points, and climb the leaderboard.
                </p>
            </div>

            {/* ── Banners ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm">
                    <i className="fa-solid fa-circle-check"></i>
                    {successMsg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Challenges Joined', value: joinedCount, icon: 'fa-flag', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
                    { label: 'Available to Join', value: availableCount, icon: 'fa-bullseye', color: '#f7b731', bg: 'rgba(247,183,49,0.1)' },
                    { label: 'Completed', value: completedCount, icon: 'fa-trophy', color: '#43e97b', bg: 'rgba(67,233,123,0.1)' },
                ].map((s, i) => (
                    <div key={i} className="glass-panel p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: s.bg }}>
                            <i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i>
                        </div>
                        <div>
                            <div className="text-2xl font-syne font-bold text-[#e8eaf6]">
                                {loading ? <span className="inline-block w-8 h-6 bg-[#1f2540] rounded animate-pulse" /> : s.value}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter tabs ── */}
            <div className="flex gap-2">
                {([
                    { key: 'ALL', label: `All (${challenges.length})` },
                    { key: 'JOINED', label: `Joined (${joinedCount})` },
                    { key: 'AVAILABLE', label: `Available (${availableCount})` },
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

            {/* ── Challenge cards ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="glass-panel p-6 space-y-4">
                            <div className="h-5 bg-[#1f2540] rounded animate-pulse w-2/3" />
                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-full" />
                            <div className="h-2 bg-[#1f2540] rounded-full animate-pulse w-full mt-2" />
                            <div className="h-9 bg-[#1f2540] rounded-xl animate-pulse w-full mt-2" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center text-3xl text-[#6c63ff] mx-auto mb-4">
                        <i className="fa-solid fa-trophy"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">
                        {filter === 'JOINED' ? 'No challenges joined yet' : 'No challenges available'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {filter === 'JOINED'
                            ? 'Join an active challenge to start earning points!'
                            : 'Check back soon — your admin will post new challenges.'}
                    </p>
                    {filter === 'JOINED' && (
                        <button
                            onClick={() => setFilter('AVAILABLE')}
                            className="mt-5 px-5 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all"
                        >
                            Browse Available
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filtered.map(challenge => {
                        const ended = isExpired(challenge.endDate);
                        const active = challenge.isActive && !ended;
                        const joined = isJoined(challenge);
                        const prog = progress[challenge.id];
                        const pct = Math.min(prog?.percentComplete ?? 0, 100);
                        const currPts = prog?.currentPoints ?? 0;
                        const isLoadingProg = loadingProgress === challenge.id;
                        const isJoining = joiningId === challenge.id;
                        const completed = pct >= 100;

                        return (
                            <div
                                key={challenge.id}
                                className={`glass-panel p-6 flex flex-col gap-4 border-l-4 transition-all ${completed ? 'border-l-[#43e97b]' :
                                    joined ? 'border-l-[#6c63ff]' :
                                        active ? 'border-l-[#f7b731]' :
                                            'border-l-[#1f2540]'
                                    }`}
                            >
                                {/* Card header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${completed ? 'bg-[#43e97b]/10' : 'bg-[#6c63ff]/10'
                                            }`}>
                                            <i className={`fa-solid ${completed ? 'fa-trophy' : 'fa-swords'} text-sm`}
                                                style={{ color: completed ? '#43e97b' : '#6c63ff' }}></i>
                                        </div>
                                        <h3 className="font-syne font-bold text-[#e8eaf6] text-base leading-tight truncate">
                                            {challenge.title}
                                        </h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                        {completed ? (
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#43e97b]/10 text-[#43e97b] border border-[#43e97b]/30">
                                                COMPLETED ✓
                                            </span>
                                        ) : joined ? (
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/30">
                                                JOINED
                                            </span>
                                        ) : active ? (
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f7b731]/10 text-[#f7b731] border border-[#f7b731]/30">
                                                OPEN
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1f2540] text-gray-500 border border-[#1f2540]">
                                                ENDED
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                {challenge.description && (
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                        {challenge.description}
                                    </p>
                                )}

                                {/* Target + dates */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">
                                        <i className="fa-solid fa-coins text-[10px]"></i>
                                        {challenge.targetPoints.toLocaleString()} pts target
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-[#171b2e] text-gray-400">
                                        <i className="fa-solid fa-calendar text-[10px]"></i>
                                        {formatDate(challenge.startDate)} → {formatDate(challenge.endDate)}
                                    </span>
                                </div>

                                {/* Progress bar (only when joined) */}
                                {joined && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500">Your Progress</span>
                                            {isLoadingProg ? (
                                                <span className="text-xs text-gray-600">Loading…</span>
                                            ) : (
                                                <span className="text-xs font-bold" style={{ color: progressColor(pct) }}>
                                                    {currPts.toLocaleString()} / {challenge.targetPoints.toLocaleString()} pts
                                                    <span className="text-gray-500 font-normal ml-1">({Math.round(pct)}%)</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-2 bg-[#1f2540] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: progressColor(pct),
                                                    boxShadow: `0 0 8px ${progressColor(pct)}60`,
                                                }}
                                            />
                                        </div>
                                        {completed && (
                                            <p className="text-xs text-[#43e97b] font-bold mt-2 flex items-center gap-1.5">
                                                <i className="fa-solid fa-circle-check"></i>
                                                Challenge completed! Great work!
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Footer: days left + action */}
                                <div className="flex items-center justify-between pt-3 border-t border-[#1f2540]">
                                    <span className={`text-[11px] font-bold ${active ? 'text-[#f7b731]' : 'text-gray-600'}`}>
                                        <i className="fa-solid fa-clock mr-1 text-[10px]"></i>
                                        {daysLeft(challenge.endDate)}
                                    </span>

                                    {active && !joined && (
                                        <button
                                            onClick={() => handleJoin(challenge.id, challenge.title)}
                                            disabled={!!joiningId}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#6c63ff] hover:bg-[#5b54d6] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-[#6c63ff]/20 hover:scale-[1.03]"
                                        >
                                            {isJoining ? (
                                                <>
                                                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                                                    Joining…
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa-solid fa-plus text-[10px]"></i>
                                                    Join Challenge
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {joined && !completed && (
                                        <span className="text-[11px] text-[#6c63ff] font-bold flex items-center gap-1.5">
                                            <i className="fa-solid fa-circle-check text-[10px]"></i>
                                            In progress
                                        </span>
                                    )}

                                    {ended && !joined && (
                                        <span className="text-[11px] text-gray-600">
                                            Closed
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};