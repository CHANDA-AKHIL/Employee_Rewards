import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────
// GET /kpis (employee) → sendPaginated
// envelope { success, data: Kpi[], pagination }
// api.ts strips axios → payload = { success, data: Kpi[], pagination }

interface Kpi {
    id: string;
    title: string;
    description?: string | null;
    pointValue: number;
    status: 'PENDING' | 'COMPLETE' | 'APPROVED' | 'REJECTED';
    rejectReason?: string | null;
    submittedAt?: string | null;
    approvedAt?: string | null;
    createdAt: string;
    employee?: { id: string; name: string; email: string };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    PENDING: { label: 'Not Submitted', color: '#f7b731', icon: 'fa-clock', border: '#f7b731' },
    COMPLETE: { label: 'Awaiting Approval', color: '#06b6d4', icon: 'fa-hourglass-half', border: '#06b6d4' },
    APPROVED: { label: 'Approved & Rewarded', color: '#43e97b', icon: 'fa-circle-check', border: '#43e97b' },
    REJECTED: { label: 'Rejected by Admin', color: '#ff6584', icon: 'fa-circle-xmark', border: '#ff6584' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const EmployeeKpis: React.FC = () => {
    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitId, setSubmitId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETE' | 'APPROVED' | 'REJECTED'>('ALL');

    // ── Fetch KPIs ────────────────────────────────────────────────────────────
    // GET /kpis → sendPaginated → { success, data: [], pagination }
    // api.ts strips axios wrapper → payload = { success, data: [], pagination }
    const fetchKpis = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const payload = await api.get('/kpis') as any;
            // sendPaginated: payload.data = array, payload.pagination = {}
            const list: Kpi[] = Array.isArray(payload?.data) ? payload.data : [];
            setKpis(list);
        } catch (err: any) {
            setError('Failed to load KPIs. Please retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchKpis(); }, [fetchKpis]);

    // ── Submit KPI ────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!submitId) return;
        try {
            setSubmitting(true);
            // POST /kpis/:id/submit
            await api.post(`/kpis/${submitId}/submit`, {});
            setSubmitId(null);
            setSuccessMsg('KPI submitted for approval!');
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchKpis();
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Submission failed.';
            setError(msg);
            setTimeout(() => setError(''), 4000);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = filter === 'ALL' ? kpis : kpis.filter(k => k.status === filter);

    const counts = {
        ALL: kpis.length,
        PENDING: kpis.filter(k => k.status === 'PENDING').length,
        COMPLETE: kpis.filter(k => k.status === 'COMPLETE').length,
        APPROVED: kpis.filter(k => k.status === 'APPROVED').length,
        REJECTED: kpis.filter(k => k.status === 'REJECTED').length,
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">My KPIs</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Complete your assigned KPIs to earn points and rewards.
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
                    <button onClick={fetchKpis} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Stat row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { key: 'APPROVED', label: 'Approved', color: '#43e97b', icon: 'fa-circle-check' },
                    { key: 'PENDING', label: 'Pending', color: '#f7b731', icon: 'fa-clock' },
                    { key: 'COMPLETE', label: 'Submitted', color: '#06b6d4', icon: 'fa-hourglass-half' },
                    { key: 'REJECTED', label: 'Rejected', color: '#ff6584', icon: 'fa-circle-xmark' },
                ].map(s => (
                    <div key={s.key} className="glass-panel p-4 flex items-center gap-3">
                        <i className={`fa-solid ${s.icon} text-lg`} style={{ color: s.color }}></i>
                        <div>
                            <div className="text-xl font-syne font-bold text-[#e8eaf6]">
                                {loading ? <span className="inline-block w-6 h-5 bg-[#1f2540] rounded animate-pulse" /> : counts[s.key as keyof typeof counts]}
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter tabs ── */}
            <div className="flex flex-wrap gap-2">
                {(['ALL', 'PENDING', 'COMPLETE', 'APPROVED', 'REJECTED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f
                            ? 'bg-[#6c63ff] text-white'
                            : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'
                            }`}
                    >
                        {f === 'ALL' ? `All (${counts.ALL})` : `${f[0] + f.slice(1).toLowerCase()} (${counts[f]})`}
                    </button>
                ))}
            </div>

            {/* ── KPI cards ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="glass-panel p-6 space-y-3">
                            <div className="h-4 bg-[#1f2540] rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-full" />
                            <div className="h-3 bg-[#1f2540] rounded animate-pulse w-2/3" />
                            <div className="h-8 bg-[#1f2540] rounded-xl animate-pulse w-full mt-4" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center text-3xl text-[#6c63ff] mx-auto mb-4">
                        <i className="fa-solid fa-bullseye"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">
                        {filter === 'ALL' ? 'No KPIs assigned yet' : `No ${filter.toLowerCase()} KPIs`}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {filter === 'ALL'
                            ? 'Your admin will assign KPIs to you soon.'
                            : 'Try a different filter to see your KPIs.'}
                    </p>
                    {filter !== 'ALL' && (
                        <button
                            onClick={() => setFilter('ALL')}
                            className="mt-5 px-5 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all"
                        >
                            View All KPIs
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(kpi => {
                        const cfg = STATUS_CONFIG[kpi.status];
                        return (
                            <div
                                key={kpi.id}
                                className="glass-panel p-6 flex flex-col gap-4 border-t-4"
                                style={{ borderTopColor: cfg.border }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-syne font-bold text-[#e8eaf6] text-base leading-tight flex-1">
                                        {kpi.title}
                                    </h3>
                                    <span
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 border"
                                        style={{
                                            color: cfg.color,
                                            background: `${cfg.color}18`,
                                            borderColor: `${cfg.color}40`,
                                        }}
                                    >
                                        <i className={`fa-solid ${cfg.icon} mr-1 text-[9px]`}></i>
                                        {cfg.label}
                                    </span>
                                </div>

                                {/* Description */}
                                {kpi.description && (
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                                        {kpi.description}
                                    </p>
                                )}

                                {/* Rejection reason */}
                                {kpi.status === 'REJECTED' && kpi.rejectReason && (
                                    <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/20">
                                        <p className="text-[11px] text-[#ff6584] font-bold mb-1">Rejection Reason:</p>
                                        <p className="text-xs text-gray-300">{kpi.rejectReason}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#1f2540]">
                                    <span className="flex items-center gap-1.5 text-sm font-bold text-[#6c63ff]">
                                        <i className="fa-solid fa-coins text-xs"></i>
                                        +{kpi.pointValue} pts
                                    </span>

                                    {kpi.status === 'PENDING' && (
                                        <button
                                            onClick={() => setSubmitId(kpi.id)}
                                            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-[#6c63ff]/20"
                                        >
                                            <i className="fa-solid fa-paper-plane mr-1.5 text-[10px]"></i>
                                            Mark Complete
                                        </button>
                                    )}

                                    {kpi.status === 'COMPLETE' && (
                                        <span className="text-xs text-[#06b6d4] font-bold flex items-center gap-1.5">
                                            <i className="fa-solid fa-hourglass-half text-[10px]"></i>
                                            Pending review
                                        </span>
                                    )}

                                    {kpi.status === 'APPROVED' && (
                                        <span className="text-xs text-[#43e97b] font-bold flex items-center gap-1.5">
                                            <i className="fa-solid fa-circle-check text-[10px]"></i>
                                            Points awarded
                                        </span>
                                    )}

                                    {kpi.status === 'REJECTED' && (
                                        <button
                                            onClick={() => setSubmitId(kpi.id)}
                                            className="px-4 py-2 bg-[#171b2e] hover:bg-[#1f2540] border border-[#1f2540] text-gray-300 hover:text-white rounded-lg font-bold text-xs transition-all"
                                        >
                                            Resubmit
                                        </button>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="flex gap-3 text-[10px] text-gray-600">
                                    <span>Created {new Date(kpi.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                    {kpi.submittedAt && (
                                        <span>· Submitted {new Date(kpi.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                    )}
                                    {kpi.approvedAt && (
                                        <span>· Approved {new Date(kpi.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Submit confirmation modal ── */}
            <Modal
                isOpen={!!submitId}
                onClose={() => setSubmitId(null)}
                title="Submit KPI for Approval"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Are you sure you have completed all the requirements for this KPI?
                        Once submitted, your administrator will review and award your points.
                    </p>
                    {error && (
                        <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                            {error}
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setSubmitId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            isLoading={submitting}
                            className="bg-[#6c63ff] hover:bg-[#5b54d6]"
                        >
                            <i className="fa-solid fa-paper-plane mr-2 text-sm"></i>
                            Yes, Submit
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};