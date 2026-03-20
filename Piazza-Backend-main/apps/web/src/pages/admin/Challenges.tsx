import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../services/api';

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
    participations?: { id: string }[];
}

interface Submission {
    id: string;
    status: string;
    joinedAt: string;
    submissionUrl?: string | null;
    employee: { id: string; name: string; email: string; department?: string | null };
    challenge: { id: string; title: string; targetPoints: number };
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
    return `${days}d left`;
}

export const AdminChallenges: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [activeTab, setActiveTab] = useState<'challenges' | 'submissions'>('challenges');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ALL');
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [approveLoading, setApproveLoading] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '', description: '', targetPoints: '', startDate: '', endDate: '',
    });
    const [briefFile, setBriefFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadChallenges = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/gamification/challenges');
            const data = unwrap<Challenge[]>(res, []);
            setChallenges(Array.isArray(data) ? data : []);
        } catch { setError('Failed to load challenges.'); }
        finally { setLoading(false); }
    }, []);

    const loadSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/gamification/challenges/submissions') as any;
            setSubmissions(Array.isArray(res?.data) ? res.data : []);
        } catch { setError('Failed to load submissions.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'challenges') loadChallenges();
        else loadSubmissions();
    }, [activeTab, loadChallenges, loadSubmissions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }));
        setFormError('');
    };

    const validateForm = () => {
        if (!form.title.trim()) { setFormError('Title is required.'); return false; }
        if (!form.targetPoints || isNaN(Number(form.targetPoints)) || Number(form.targetPoints) <= 0) { setFormError('Target points must be a positive number.'); return false; }
        if (!form.startDate) { setFormError('Start date is required.'); return false; }
        if (!form.endDate) { setFormError('End date is required.'); return false; }
        if (new Date(form.endDate) <= new Date(form.startDate)) { setFormError('End date must be after start date.'); return false; }
        return true;
    };

    // ── Create challenge with optional brief file ─────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            setSubmitting(true);
            setFormError('');

            // Use FormData because we may have a file
            const formData = new FormData();
            formData.append('title', form.title.trim());
            formData.append('description', form.description.trim());
            formData.append('targetPoints', form.targetPoints);
            formData.append('startDate', new Date(form.startDate).toISOString());
            formData.append('endDate', new Date(form.endDate).toISOString());
            if (briefFile) formData.append('brief', briefFile);

            await api.post('/gamification/challenges', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccessMsg(`Challenge "${form.title}" created!`);
            setShowModal(false);
            setForm({ title: '', description: '', targetPoints: '', startDate: '', endDate: '' });
            setBriefFile(null);
            await loadChallenges();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Failed to create challenge.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Approve a submission ──────────────────────────────────────────────────
    const handleApprove = async (submissionId: string, employeeName: string) => {
        try {
            setApproveLoading(submissionId);
            await api.post(`/gamification/challenges/submissions/${submissionId}/approve`, {});
            setSuccessMsg(`${employeeName}'s submission approved!`);
            setTimeout(() => setSuccessMsg(''), 4000);
            await loadSubmissions();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to approve submission.');
        } finally {
            setApproveLoading(null);
        }
    };

    const filtered = challenges.filter(c => {
        if (filter === 'ACTIVE') return c.isActive && !isExpired(c.endDate);
        if (filter === 'ENDED') return !c.isActive || isExpired(c.endDate);
        return true;
    });

    const totalActive = challenges.filter(c => c.isActive && !isExpired(c.endDate)).length;
    const totalEnded = challenges.filter(c => !c.isActive || isExpired(c.endDate)).length;
    const totalParticipants = challenges.reduce((s, c) => s + (c.participations?.length ?? 0), 0);
    const pendingSubmissions = submissions.filter(s => s.status === 'COMPLETED').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Challenges</h1>
                    <p className="text-gray-500 text-sm mt-1">Create challenges and review employee submissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                        <button onClick={() => setActiveTab('challenges')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'challenges' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            <i className="fa-solid fa-swords mr-1.5"></i>Challenges
                        </button>
                        <button onClick={() => setActiveTab('submissions')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            <i className="fa-solid fa-inbox"></i>
                            Submissions
                            {pendingSubmissions > 0 && (
                                <span className="w-4 h-4 rounded-full bg-[#ff6584] text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                                    {pendingSubmissions}
                                </span>
                            )}
                        </button>
                    </div>
                    {activeTab === 'challenges' && (
                        <button onClick={() => { setForm({ title: '', description: '', targetPoints: '', startDate: '', endDate: '' }); setBriefFile(null); setFormError(''); setShowModal(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#6c63ff]/20">
                            <i className="fa-solid fa-plus"></i>Create Challenge
                        </button>
                    )}
                </div>
            </div>

            {/* ── Banners ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm">
                    <i className="fa-solid fa-circle-check"></i>{successMsg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={() => setError('')} className="ml-auto underline text-xs">Dismiss</button>
                </div>
            )}

            {/* ── CHALLENGES TAB ── */}
            {activeTab === 'challenges' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Total', value: challenges.length, icon: 'fa-swords', color: '#6c63ff', bg: 'rgba(108,99,255,0.1)' },
                            { label: 'Active', value: totalActive, icon: 'fa-fire', color: '#43e97b', bg: 'rgba(67,233,123,0.1)' },
                            { label: 'Participants', value: totalParticipants, icon: 'fa-users', color: '#f7b731', bg: 'rgba(247,183,49,0.1)' },
                        ].map((s, i) => (
                            <div key={i} className="glass-panel p-5 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: s.bg }}>
                                    <i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i>
                                </div>
                                <div>
                                    <div className="text-2xl font-syne font-bold text-[#e8eaf6]">{loading ? <span className="inline-block w-8 h-6 bg-[#1f2540] rounded animate-pulse" /> : s.value}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {(['ALL', 'ACTIVE', 'ENDED'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-[#6c63ff] text-white' : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'}`}>
                                {f === 'ALL' ? `All (${challenges.length})` : f === 'ACTIVE' ? `Active (${totalActive})` : `Ended (${totalEnded})`}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {[...Array(3)].map((_, i) => <div key={i} className="glass-panel p-6 h-52 animate-pulse bg-[#111420]" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="glass-panel p-16 text-center">
                            <i className="fa-solid fa-swords text-4xl text-gray-700 mb-4 block"></i>
                            <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">No challenges yet</h3>
                            <p className="text-gray-500 text-sm mb-6">Create your first challenge with an optional brief document.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filtered.map(challenge => {
                                const ended = isExpired(challenge.endDate);
                                const active = challenge.isActive && !ended;
                                const count = challenge.participations?.length ?? 0;
                                return (
                                    <div key={challenge.id} className={`glass-panel p-6 flex flex-col gap-4 border-l-4 transition-all hover:scale-[1.01] ${active ? 'border-l-[#43e97b]' : 'border-l-[#1f2540]'}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center text-[#6c63ff] flex-shrink-0">
                                                <i className="fa-solid fa-trophy text-sm"></i>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${active ? 'bg-[#43e97b]/10 text-[#43e97b] border border-[#43e97b]/30' : 'bg-[#1f2540] text-gray-500'}`}>
                                                {active ? 'ACTIVE' : 'ENDED'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-syne font-bold text-[#e8eaf6] text-base">{challenge.title}</h3>
                                            {challenge.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{challenge.description}</p>}
                                        </div>

                                        {/* Brief file download */}
                                        {challenge.briefUrl && (
                                            <a href={challenge.briefUrl} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/30 text-[#6c63ff] text-xs font-bold hover:bg-[#6c63ff]/20 transition-all">
                                                <i className="fa-solid fa-file-arrow-down"></i>
                                                Download Challenge Brief
                                            </a>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#6c63ff]/10 text-[#6c63ff]">
                                                <i className="fa-solid fa-coins text-[10px]"></i>
                                                {challenge.targetPoints.toLocaleString()} pts
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#171b2e] text-gray-400">
                                                <i className="fa-solid fa-users text-[10px]"></i>
                                                {count} joined
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div className="bg-[#171b2e] rounded-lg p-2.5">
                                                <div className="text-gray-600 text-[10px] mb-0.5">Start</div>
                                                <div className="text-gray-300 font-bold">{formatDate(challenge.startDate)}</div>
                                            </div>
                                            <div className="bg-[#171b2e] rounded-lg p-2.5">
                                                <div className="text-gray-600 text-[10px] mb-0.5">End</div>
                                                <div className={`font-bold ${active ? 'text-[#43e97b]' : 'text-gray-500'}`}>{formatDate(challenge.endDate)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-[#1f2540]">
                                            <span className={`text-[11px] font-bold ${active ? 'text-[#f7b731]' : 'text-gray-600'}`}>
                                                <i className="fa-solid fa-clock mr-1 text-[10px]"></i>{daysLeft(challenge.endDate)}
                                            </span>
                                            <span className="text-[10px] text-gray-600">Created {formatDate(challenge.createdAt)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── SUBMISSIONS TAB ── */}
            {activeTab === 'submissions' && (
                <>
                    <div className="p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-3 text-xs text-gray-400">
                        <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0"></i>
                        <div>
                            <span className="text-[#e8eaf6] font-bold">Review Flow: </span>
                            Employee joins → reads brief → submits their work →
                            appears here as <span className="text-[#f7b731] font-bold">Pending Review</span> →
                            you approve → employee notified.
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-20 glass-panel animate-pulse" />)}
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="glass-panel py-20 text-center">
                            <i className="fa-solid fa-inbox text-4xl text-gray-700 mb-4 block"></i>
                            <h3 className="font-syne font-bold text-[#e8eaf6]">No submissions yet</h3>
                            <p className="text-gray-500 text-sm mt-1">Employees will appear here after submitting their challenge work.</p>
                        </div>
                    ) : (
                        <div className="glass-panel overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1f2540] flex items-center justify-between">
                                <h3 className="font-syne font-bold text-[#e8eaf6]">Challenge Submissions</h3>
                                <span className="text-xs text-gray-500">{submissions.length} total</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#171b2e] border-b border-[#1f2540]">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Challenge</th>
                                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Submitted</th>
                                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1f2540]">
                                        {submissions.map(sub => (
                                            <tr key={sub.id} className="hover:bg-[#171b2e]/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                            {sub.employee.name[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[#e8eaf6]">{sub.employee.name}</div>
                                                            <div className="text-[10px] text-gray-500">{sub.employee.department ?? sub.employee.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-[#e8eaf6]">{sub.challenge.title}</div>
                                                    <div className="text-[10px] text-[#6c63ff]">{sub.challenge.targetPoints.toLocaleString()} pts target</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                    {formatDate(sub.joinedAt)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sub.status === 'APPROVED' ? 'bg-[#43e97b]/10 text-[#43e97b]' :
                                                            sub.status === 'COMPLETED' ? 'bg-[#f7b731]/10 text-[#f7b731]' :
                                                                'bg-[#6c63ff]/10 text-[#6c63ff]'
                                                        }`}>
                                                        {sub.status === 'COMPLETED' ? 'Pending Review' : sub.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {sub.submissionUrl && (
                                                            <a href={sub.submissionUrl} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 px-3 py-2 bg-[#6c63ff]/10 text-[#6c63ff] hover:bg-[#6c63ff]/20 border border-[#6c63ff]/20 rounded-lg font-bold text-xs transition-all">
                                                                <i className="fa-solid fa-file-arrow-down"></i>
                                                                View File
                                                            </a>
                                                        )}
                                                        {sub.status === 'COMPLETED' ? (
                                                            <button onClick={() => handleApprove(sub.id, sub.employee.name)}
                                                                disabled={approveLoading === sub.id}
                                                                className="flex items-center gap-2 px-4 py-2 bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b] hover:text-white border border-[#43e97b]/20 rounded-lg font-bold text-xs transition-all disabled:opacity-40">
                                                                {approveLoading === sub.id
                                                                    ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                                    : <i className="fa-solid fa-check"></i>
                                                                }
                                                                Approve
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-600 font-bold">✓ Approved</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Create Challenge Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="w-full max-w-lg bg-[#111420] border border-[#1f2540] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f2540] sticky top-0 bg-[#111420]">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#6c63ff]/10 flex items-center justify-center text-[#6c63ff]">
                                    <i className="fa-solid fa-swords text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="font-syne font-bold text-[#e8eaf6] text-lg">Create Challenge</h2>
                                    <p className="text-xs text-gray-500">Visible to all employees instantly</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-[#171b2e] text-gray-500 hover:text-white flex items-center justify-center">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            {formError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                                    <i className="fa-solid fa-circle-exclamation"></i>{formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Challenge Title <span className="text-[#ff6584]">*</span>
                                </label>
                                <input name="title" value={form.title} onChange={handleChange} maxLength={100}
                                    placeholder="e.g. Q2 Top Performer Sprint"
                                    className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                                <textarea name="description" value={form.description} onChange={handleChange} rows={3} maxLength={500}
                                    placeholder="Describe the challenge goals and rules..."
                                    className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20 resize-none" />
                                <div className="text-right text-[10px] text-gray-600 mt-1">{form.description.length}/500</div>
                            </div>

                            {/* ── Brief file upload ── */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Challenge Brief <span className="text-gray-600">(PDF, DOC, DOCX — optional)</span>
                                </label>
                                <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt"
                                        onChange={e => setBriefFile(e.target.files?.[0] ?? null)}
                                        className="hidden" />
                                    <div className={`w-full border border-dashed rounded-xl px-4 py-5 text-center transition-all ${briefFile ? 'border-[#43e97b]/50 bg-[#43e97b]/5' : 'border-[#1f2540] bg-[#0a0c14] group-hover:border-[#6c63ff]/50'}`}>
                                        {briefFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <i className="fa-solid fa-file-check text-[#43e97b] text-xl"></i>
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-[#43e97b]">{briefFile.name}</div>
                                                    <div className="text-[10px] text-gray-500">{(briefFile.size / 1024).toFixed(1)} KB</div>
                                                </div>
                                                <button type="button" onClick={e => { e.stopPropagation(); setBriefFile(null); }}
                                                    className="ml-2 text-gray-500 hover:text-[#ff6584] text-xs">
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-file-arrow-up text-gray-600 text-2xl mb-2 block"></i>
                                                <div className="text-xs text-gray-500">Click to upload brief (PDF, DOC, DOCX)</div>
                                                <div className="text-[10px] text-gray-600 mt-1">Employees will download this to understand the challenge</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Target Points <span className="text-[#ff6584]">*</span>
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-coins absolute left-4 top-1/2 -translate-y-1/2 text-[#6c63ff] text-sm"></i>
                                    <input name="targetPoints" type="number" min="1" value={form.targetPoints} onChange={handleChange}
                                        placeholder="e.g. 500"
                                        className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl pl-10 pr-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Start Date <span className="text-[#ff6584]">*</span></label>
                                    <input name="startDate" type="date" value={form.startDate} onChange={handleChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] [color-scheme:dark]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">End Date <span className="text-[#ff6584]">*</span></label>
                                    <input name="endDate" type="date" value={form.endDate} onChange={handleChange}
                                        min={form.startDate || new Date().toISOString().split('T')[0]}
                                        className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-[#e8eaf6] text-sm outline-none focus:border-[#6c63ff] [color-scheme:dark]" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-white font-bold text-sm transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-[#6c63ff] hover:bg-[#5b54d6] disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                                    {submitting ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>Creating…</> : <><i className="fa-solid fa-paper-plane text-sm"></i>Create & Send</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};