import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Challenge {
    id: string;
    title: string;
    description?: string;
    targetPoints: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    briefUrl?: string | null;
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

function unwrap<T>(envelope: any, fallback: T): T {
    if (envelope && 'data' in envelope) return (envelope.data as T) ?? fallback;
    return (envelope as T) ?? fallback;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(d: string) { return new Date(d) < new Date(); }

function daysLeft(d: string) {
    const diff = new Date(d).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.ceil(diff / 86400000);
    return `${days} day${days === 1 ? '' : 's'} left`;
}

function progressColor(pct: number) {
    if (pct >= 100) return '#43e97b';
    if (pct >= 60) return '#6c63ff';
    if (pct >= 30) return '#f7b731';
    return '#ff6584';
}

export const EmployeeChallenges: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'JOINED' | 'AVAILABLE'>('ALL');

    // Submission file state per challenge
    const [submissionFiles, setSubmissionFiles] = useState<Record<string, File>>({});
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const loadChallenges = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get('/gamification/challenges');
            const data = unwrap<Challenge[]>(res, []);
            const list = Array.isArray(data) ? data : [];
            setChallenges(list);

            const progressEntries = await Promise.allSettled(
                list.map(async (c) => {
                    const progRes = await api.get(`/gamification/challenges/${c.id}/progress`);
                    const prog = unwrap<ChallengeProgress>(progRes, {
                        challengeId: c.id, currentPoints: 0, targetPoints: c.targetPoints,
                        percentComplete: 0, status: 'NOT_JOINED', joined: false,
                    });
                    return { id: c.id, prog };
                })
            );

            const progressMap: Record<string, ChallengeProgress> = {};
            progressEntries.forEach(r => {
                if (r.status === 'fulfilled') progressMap[r.value.id] = r.value.prog;
            });
            setProgress(progressMap);
        } catch {
            setError('Failed to load challenges. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadChallenges(); }, [loadChallenges]);

    const handleJoin = async (challengeId: string, title: string) => {
        try {
            setJoiningId(challengeId);
            await api.post(`/gamification/challenges/${challengeId}/join`, {});
            try {
                const progRes = await api.get(`/gamification/challenges/${challengeId}/progress`);
                const prog = unwrap<ChallengeProgress>(progRes, {
                    challengeId, currentPoints: 0, targetPoints: 0,
                    percentComplete: 0, status: 'ACTIVE', joined: true,
                });
                setProgress(prev => ({ ...prev, [challengeId]: prog }));
            } catch {
                setProgress(prev => ({ ...prev, [challengeId]: { ...(prev[challengeId] ?? {}), joined: true, status: 'ACTIVE' } as ChallengeProgress }));
            }
            setSuccessMsg(`Joined "${title}"! Read the brief (if available) and start working. 🎯`);
            setTimeout(() => setSuccessMsg(''), 6000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to join challenge.');
            setTimeout(() => setError(''), 4000);
        } finally {
            setJoiningId(null);
        }
    };

    // ── Submit challenge with optional file upload ─────────────────────────────
    const handleSubmit = async (challengeId: string, title: string) => {
        try {
            setSubmittingId(challengeId);

            const file = submissionFiles[challengeId];

            if (file) {
                // Upload file as multipart
                const formData = new FormData();
                formData.append('submissionFile', file);
                await api.post(`/gamification/challenges/${challengeId}/submit`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                // Submit without file
                await api.post(`/gamification/challenges/${challengeId}/submit`, {});
            }

            // Refresh progress
            const progRes = await api.get(`/gamification/challenges/${challengeId}/progress`);
            const prog = unwrap<ChallengeProgress>(progRes, {
                challengeId, currentPoints: 0, targetPoints: 0,
                percentComplete: 0, status: 'COMPLETED', joined: true,
            });
            setProgress(prev => ({ ...prev, [challengeId]: prog }));

            // Clear the file
            setSubmissionFiles(prev => { const n = { ...prev }; delete n[challengeId]; return n; });

            setSuccessMsg(`🏆 "${title}" submitted! Admin will review and verify.`);
            setTimeout(() => setSuccessMsg(''), 6000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit challenge.');
            setTimeout(() => setError(''), 4000);
        } finally {
            setSubmittingId(null);
        }
    };

    const isJoined = (c: Challenge) => progress[c.id]?.joined || c.participations?.some(p => p.employeeId === user?.id) || false;
    const isSubmitted = (c: Challenge) => progress[c.id]?.status === 'COMPLETED' || progress[c.id]?.status === 'APPROVED';

    const filtered = challenges.filter(c => {
        if (filter === 'JOINED') return isJoined(c);
        if (filter === 'AVAILABLE') return !isJoined(c) && c.isActive && !isExpired(c.endDate);
        return true;
    });

    const joinedCount = challenges.filter(c => isJoined(c)).length;
    const availableCount = challenges.filter(c => !isJoined(c) && c.isActive && !isExpired(c.endDate)).length;
    const completedCount = Object.values(progress).filter(p => p?.status === 'COMPLETED' || p?.status === 'APPROVED').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Challenges</h1>
                <p className="text-gray-500 text-sm mt-1">Join challenges, read the brief, submit your work, and earn points.</p>
            </div>

            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm">
                    <i className="fa-solid fa-circle-check"></i>{successMsg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                </div>
            )}

            {/* How it works */}
            <div className="p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-3">
                <i className="fa-solid fa-circle-info text-[#6c63ff] text-lg flex-shrink-0 mt-0.5"></i>
                <div className="text-xs text-gray-400 leading-relaxed">
                    <span className="text-[#e8eaf6] font-bold block mb-1">How challenges work:</span>
                    <span className="text-[#6c63ff] font-bold">1. Join</span> →{' '}
                    <span className="text-[#f7b731] font-bold">2. Download & read the brief</span> (if provided) →{' '}
                    <span className="text-[#43e97b] font-bold">3. Complete your work</span> (earn points via KPIs) →{' '}
                    <span className="text-[#ff6584] font-bold">4. Upload your submission & submit</span> →
                    Admin reviews and verifies.
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Joined', value: joinedCount, icon: 'fa-flag', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
                    { label: 'Available', value: availableCount, icon: 'fa-bullseye', color: '#f7b731', bg: 'rgba(247,183,49,0.1)' },
                    { label: 'Submitted', value: completedCount, icon: 'fa-trophy', color: '#43e97b', bg: 'rgba(67,233,123,0.1)' },
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

            {/* Filter tabs */}
            <div className="flex gap-2">
                {([
                    { key: 'ALL', label: `All (${challenges.length})` },
                    { key: 'JOINED', label: `Joined (${joinedCount})` },
                    { key: 'AVAILABLE', label: `Available (${availableCount})` },
                ] as const).map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key ? 'bg-[#6c63ff] text-white' : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Challenge cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="glass-panel p-6 space-y-4">
                            <div className="h-5 bg-[#1f2540] rounded animate-pulse w-2/3" />
                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-full" />
                            <div className="h-2 bg-[#1f2540] rounded-full animate-pulse w-full" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <i className="fa-solid fa-trophy text-4xl text-gray-700 mb-4 block"></i>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">
                        {filter === 'JOINED' ? 'No challenges joined yet' : 'No challenges available'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {filter === 'JOINED' ? 'Join an active challenge to get started!' : 'Check back soon.'}
                    </p>
                    {filter === 'JOINED' && (
                        <button onClick={() => setFilter('AVAILABLE')} className="mt-5 px-5 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all">
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
                        const submitted = isSubmitted(challenge);
                        const prog = progress[challenge.id];
                        const pct = Math.min(prog?.percentComplete ?? 0, 100);
                        const currPts = prog?.currentPoints ?? 0;
                        const completed = pct >= 100 || submitted;
                        const isJoining = joiningId === challenge.id;
                        const isSub = submittingId === challenge.id;
                        const selectedFile = submissionFiles[challenge.id];

                        return (
                            <div key={challenge.id} className={`glass-panel p-6 flex flex-col gap-4 border-l-4 transition-all ${submitted ? 'border-l-[#43e97b]' :
                                    joined ? 'border-l-[#6c63ff]' :
                                        active ? 'border-l-[#f7b731]' : 'border-l-[#1f2540]'
                                }`}>

                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${submitted ? 'bg-[#43e97b]/10' : 'bg-[#6c63ff]/10'}`}>
                                            <i className={`fa-solid ${submitted ? 'fa-trophy' : 'fa-swords'} text-sm`}
                                                style={{ color: submitted ? '#43e97b' : '#6c63ff' }}></i>
                                        </div>
                                        <h3 className="font-syne font-bold text-[#e8eaf6] text-base leading-tight truncate">{challenge.title}</h3>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {submitted ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#43e97b]/10 text-[#43e97b] border border-[#43e97b]/30">SUBMITTED ✓</span>
                                            : joined ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/30">IN PROGRESS</span>
                                                : active ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f7b731]/10 text-[#f7b731] border border-[#f7b731]/30">OPEN</span>
                                                    : <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1f2540] text-gray-500">ENDED</span>}
                                    </div>
                                </div>

                                {challenge.description && (
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{challenge.description}</p>
                                )}

                                {/* Brief download */}
                                {challenge.briefUrl && (
                                    <a href={challenge.briefUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/30 text-[#6c63ff] text-xs font-bold hover:bg-[#6c63ff]/20 transition-all w-fit">
                                        <i className="fa-solid fa-file-pdf"></i>
                                        Download Challenge Brief
                                        <i className="fa-solid fa-arrow-down text-[10px]"></i>
                                    </a>
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

                                {/* Progress (joined only) */}
                                {joined && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500">Points Progress</span>
                                            <span className="text-xs font-bold" style={{ color: progressColor(pct) }}>
                                                {currPts.toLocaleString()} / {challenge.targetPoints.toLocaleString()} pts ({Math.round(pct)}%)
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-[#1f2540] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: progressColor(pct), boxShadow: `0 0 8px ${progressColor(pct)}60` }} />
                                        </div>
                                        {pct < 100 && !submitted && (
                                            <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                                                <i className="fa-solid fa-lightbulb text-[#f7b731] text-[9px]"></i>
                                                Earn points by completing KPIs to track progress here
                                            </p>
                                        )}
                                        {completed && !submitted && (
                                            <p className="text-xs text-[#43e97b] font-bold mt-2 flex items-center gap-1.5">
                                                <i className="fa-solid fa-circle-check"></i>
                                                Target reached! Upload your work and submit.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* File upload for submission (joined + active + not yet submitted) */}
                                {joined && active && !submitted && (
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Upload Your Work <span className="text-gray-600">(optional)</span>
                                        </div>
                                        <div className="relative cursor-pointer group"
                                            onClick={() => fileRefs.current[challenge.id]?.click()}>
                                            <input
                                                ref={el => { fileRefs.current[challenge.id] = el; }}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    if (f) setSubmissionFiles(prev => ({ ...prev, [challenge.id]: f }));
                                                }}
                                                className="hidden"
                                            />
                                            <div className={`w-full border border-dashed rounded-xl px-3 py-3 text-center transition-all text-xs ${selectedFile
                                                    ? 'border-[#43e97b]/50 bg-[#43e97b]/5'
                                                    : 'border-[#1f2540] bg-[#0a0c14] group-hover:border-[#6c63ff]/50'
                                                }`}>
                                                {selectedFile ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <i className="fa-solid fa-file-check text-[#43e97b]"></i>
                                                        <span className="text-[#43e97b] font-bold truncate max-w-[160px]">{selectedFile.name}</span>
                                                        <button type="button"
                                                            onClick={e => { e.stopPropagation(); setSubmissionFiles(prev => { const n = { ...prev }; delete n[challenge.id]; return n; }); }}
                                                            className="text-gray-500 hover:text-[#ff6584]">
                                                            <i className="fa-solid fa-xmark text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600">
                                                        <i className="fa-solid fa-paperclip mr-1"></i>
                                                        Attach submission file (PDF, DOC, ZIP…)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-[#1f2540]">
                                    <span className={`text-[11px] font-bold ${active ? 'text-[#f7b731]' : 'text-gray-600'}`}>
                                        <i className="fa-solid fa-clock mr-1 text-[10px]"></i>{daysLeft(challenge.endDate)}
                                    </span>

                                    {/* JOIN */}
                                    {active && !joined && (
                                        <button onClick={() => handleJoin(challenge.id, challenge.title)} disabled={!!joiningId}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#6c63ff] hover:bg-[#5b54d6] disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all">
                                            {isJoining ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>Joining…</> : <><i className="fa-solid fa-plus text-[10px]"></i>Join Challenge</>}
                                        </button>
                                    )}

                                    {/* SUBMIT */}
                                    {joined && active && !submitted && (
                                        <button onClick={() => handleSubmit(challenge.id, challenge.title)} disabled={!!submittingId}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${completed
                                                    ? 'bg-[#43e97b] hover:bg-[#3cd16e] text-white shadow-md shadow-[#43e97b]/20'
                                                    : 'bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white hover:border-[#6c63ff]/50'
                                                } disabled:opacity-50`}>
                                            {isSub ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>Submitting…</>
                                                : <><i className={`fa-solid ${completed ? 'fa-paper-plane' : 'fa-flag-checkered'} text-[10px]`}></i>Submit Work</>}
                                        </button>
                                    )}

                                    {submitted && (
                                        <span className="text-[11px] text-[#43e97b] font-bold flex items-center gap-1.5">
                                            <i className="fa-solid fa-circle-check text-[10px]"></i>Submitted
                                        </span>
                                    )}

                                    {ended && !joined && <span className="text-[11px] text-gray-600">Closed</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};