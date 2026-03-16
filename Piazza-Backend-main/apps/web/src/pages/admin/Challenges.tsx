import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';

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
    participations?: { id: string }[];
}

interface CreateForm {
    title: string;
    description: string;
    targetPoints: string;
    startDate: string;
    endDate: string;
}

const EMPTY_FORM: CreateForm = {
    title: '',
    description: '',
    targetPoints: '',
    startDate: '',
    endDate: '',
};

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

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminChallenges: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ALL');

    // ── Load challenges ───────────────────────────────────────────────────────
    const loadChallenges = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get('/gamification/challenges');
            const data = unwrap<Challenge[]>(res, []);
            setChallenges(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError('Failed to load challenges. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadChallenges(); }, [loadChallenges]);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setFormError('');
    };

    const validateForm = (): boolean => {
        if (!form.title.trim()) { setFormError('Title is required.'); return false; }
        if (!form.targetPoints || isNaN(Number(form.targetPoints)) || Number(form.targetPoints) <= 0) {
            setFormError('Target points must be a positive number.'); return false;
        }
        if (!form.startDate) { setFormError('Start date is required.'); return false; }
        if (!form.endDate) { setFormError('End date is required.'); return false; }
        if (new Date(form.endDate) <= new Date(form.startDate)) {
            setFormError('End date must be after start date.'); return false;
        }
        return true;
    };

    // ── Create challenge ──────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            setFormError('');

            // POST /gamification/challenges
            // Body: { title, description, targetPoints, startDate, endDate }
            await api.post('/gamification/challenges', {
                title: form.title.trim(),
                description: form.description.trim(),
                targetPoints: parseInt(form.targetPoints, 10),
                startDate: new Date(form.startDate).toISOString(),
                endDate: new Date(form.endDate).toISOString(),
            });

            setSuccessMsg(`Challenge "${form.title}" created and sent to all employees!`);
            setShowModal(false);
            setForm(EMPTY_FORM);
            await loadChallenges();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Failed to create challenge.';
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const openModal = () => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setFormError(''); };

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = challenges.filter(c => {
        if (filter === 'ACTIVE') return c.isActive && !isExpired(c.endDate);
        if (filter === 'ENDED') return !c.isActive || isExpired(c.endDate);
        return true;
    });

    // ── Stats ─────────────────────────────────────────────────────────────────
    const totalActive = challenges.filter(c => c.isActive && !isExpired(c.endDate)).length;
    const totalEnded = challenges.filter(c => !c.isActive || isExpired(c.endDate)).length;
    const totalParticipants = challenges.reduce((sum, c) => sum + (c.participations?.length ?? 0), 0);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Challenges</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Create challenges and broadcast them to all employees.
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#6c63ff]/20 hover:scale-[1.02]"
                >
                    <i className="fa-solid fa-plus"></i>
                    Create Challenge
                </button>
            </div>

            {/* ── Success banner ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm">
                    <i className="fa-solid fa-circle-check"></i>
                    {successMsg}
                </div>
            )}

            {/* ── Error banner ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                    <button onClick={loadChallenges} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Challenges', value: challenges.length, icon: 'fa-swords', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
                    { label: 'Active Now', value: totalActive, icon: 'fa-fire', color: '#43e97b', bg: 'rgba(67,233,123,0.1)' },
                    { label: 'Participants', value: totalParticipants, icon: 'fa-users', color: '#f7b731', bg: 'rgba(247,183,49,0.1)' },
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
                {(['ALL', 'ACTIVE', 'ENDED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f
                            ? 'bg-[#6c63ff] text-white'
                            : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'
                            }`}
                    >
                        {f === 'ALL' ? `All (${challenges.length})` : f === 'ACTIVE' ? `Active (${totalActive})` : `Ended (${totalEnded})`}
                    </button>
                ))}
            </div>

            {/* ── Challenge cards ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="glass-panel p-6 space-y-3">
                            <div className="h-5 bg-[#1f2540] rounded animate-pulse w-2/3" />
                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-full" />
                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-4/5" />
                            <div className="h-8 bg-[#1f2540] rounded animate-pulse w-1/3 mt-4" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center text-3xl text-[#6c63ff] mx-auto mb-4">
                        <i className="fa-solid fa-swords"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">No challenges yet</h3>
                    <p className="text-gray-500 text-sm mb-6">Create your first challenge to engage your employees.</p>
                    <button
                        onClick={openModal}
                        className="px-6 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all"
                    >
                        Create First Challenge
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map(challenge => {
                        const ended = isExpired(challenge.endDate);
                        const active = challenge.isActive && !ended;
                        const participants = challenge.participations?.length ?? 0;

                        return (
                            <div
                                key={challenge.id}
                                className={`glass-panel p-6 flex flex-col gap-4 border-l-4 transition-all hover:scale-[1.01] ${active ? 'border-l-[#43e97b]' : 'border-l-[#1f2540]'
                                    }`}
                            >
                                {/* Card header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center text-[#6c63ff] flex-shrink-0">
                                        <i className="fa-solid fa-trophy text-sm"></i>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${active
                                        ? 'bg-[#43e97b]/10 text-[#43e97b] border border-[#43e97b]/30'
                                        : 'bg-[#1f2540] text-gray-500 border border-[#1f2540]'
                                        }`}>
                                        {active ? 'ACTIVE' : 'ENDED'}
                                    </span>
                                </div>

                                {/* Title + description */}
                                <div>
                                    <h3 className="font-syne font-bold text-[#e8eaf6] text-base leading-tight">
                                        {challenge.title}
                                    </h3>
                                    {challenge.description && (
                                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                                            {challenge.description}
                                        </p>
                                    )}
                                </div>

                                {/* Meta pills */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">
                                        <i className="fa-solid fa-coins text-[10px]"></i>
                                        {challenge.targetPoints.toLocaleString()} pts target
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#171b2e] text-gray-400">
                                        <i className="fa-solid fa-users text-[10px]"></i>
                                        {participants} joined
                                    </span>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="bg-[#171b2e] rounded-lg p-2.5">
                                        <div className="text-gray-600 uppercase tracking-wide text-[10px] mb-0.5">Start</div>
                                        <div className="text-gray-300 font-bold">{formatDate(challenge.startDate)}</div>
                                    </div>
                                    <div className="bg-[#171b2e] rounded-lg p-2.5">
                                        <div className="text-gray-600 uppercase tracking-wide text-[10px] mb-0.5">End</div>
                                        <div className={`font-bold ${active ? 'text-[#43e97b]' : 'text-gray-500'}`}>
                                            {formatDate(challenge.endDate)}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-[#1f2540]">
                                    <span className={`text-[11px] font-bold ${active ? 'text-[#f7b731]' : 'text-gray-600'}`}>
                                        <i className="fa-solid fa-clock mr-1 text-[10px]"></i>
                                        {daysLeft(challenge.endDate)}
                                    </span>
                                    <span className="text-[10px] text-gray-600">
                                        Created {formatDate(challenge.createdAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                CREATE CHALLENGE MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="w-full max-w-lg bg-[#111420] border border-[#1f2540] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2540]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center text-[#6c63ff]">
                                    <i className="fa-solid fa-swords text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="font-syne font-bold text-[#e8eaf6] text-lg leading-tight">
                                        Create Challenge
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Visible to all employees instantly
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 rounded-lg bg-[#171b2e] text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        {/* Modal form */}
                        <form onSubmit={handleCreate} className="p-6 space-y-5">

                            {/* Error */}
                            {formError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                                    <i className="fa-solid fa-circle-exclamation flex-shrink-0"></i>
                                    {formError}
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Challenge Title <span className="text-[#ff6584]">*</span>
                                </label>
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Q2 Top Performer Sprint"
                                    maxLength={100}
                                    className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm placeholder-gray-600 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Describe the challenge goals and rules..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm placeholder-gray-600 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition-all resize-none"
                                />
                                <div className="text-right text-[10px] text-gray-600 mt-1">
                                    {form.description.length}/500
                                </div>
                            </div>

                            {/* Target points */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Target Points <span className="text-[#ff6584]">*</span>
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-coins absolute left-4 top-1/2 -translate-y-1/2 text-[#6c63ff] text-sm"></i>
                                    <input
                                        name="targetPoints"
                                        type="number"
                                        min="1"
                                        value={form.targetPoints}
                                        onChange={handleChange}
                                        placeholder="e.g. 500"
                                        className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl pl-10 pr-4 py-3 text-[#e8eaf6] text-sm placeholder-gray-600 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition-all"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-600 mt-1.5">
                                    Employees need to earn this many points to complete the challenge.
                                </p>
                            </div>

                            {/* Date range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Start Date <span className="text-[#ff6584]">*</span>
                                    </label>
                                    <input
                                        name="startDate"
                                        type="date"
                                        value={form.startDate}
                                        onChange={handleChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition-all [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        End Date <span className="text-[#ff6584]">*</span>
                                    </label>
                                    <input
                                        name="endDate"
                                        type="date"
                                        value={form.endDate}
                                        onChange={handleChange}
                                        min={form.startDate || new Date().toISOString().split('T')[0]}
                                        className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 transition-all [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {/* Info note */}
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20">
                                <i className="fa-solid fa-circle-info text-[#6c63ff] text-sm mt-0.5 flex-shrink-0"></i>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Once created, this challenge will be <span className="text-[#e8eaf6] font-bold">visible to all employees</span> immediately.
                                    They can join and track their progress from their dashboard.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white font-bold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-[#6c63ff] hover:bg-[#5b54d6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#6c63ff]/20"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                                            Creating…
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-paper-plane text-sm"></i>
                                            Create & Send
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};