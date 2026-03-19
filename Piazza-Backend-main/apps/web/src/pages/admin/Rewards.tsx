import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { cn } from '../../utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reward {
    id: string;
    name: string;
    description?: string | null;
    pointCost: number;
    category?: string | null;
    stock: number;
    imageUrl?: string | null;
}

interface Redemption {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    employee?: { id: string; name: string; email: string };
    reward?: { id: string; name: string; pointCost: number };
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminRewards: React.FC = () => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [activeTab, setActiveTab] = useState<'catalog' | 'redemptions'>('catalog');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    // ── Fetch rewards ─────────────────────────────────────────────────────────
    // GET /rewards → sendPaginated → { success, data: Reward[], pagination }
    const fetchRewards = useCallback(async () => {
        try {
            setLoading(true);
            const payload = await api.get('/rewards') as any;
            setRewards(Array.isArray(payload?.data) ? payload.data : []);
        } catch (err: any) {
            setError('Failed to load rewards.');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch pending redemptions ─────────────────────────────────────────────
    // GET /redemptions → sendPaginated → { success, data: Redemption[], pagination }
    const fetchRedemptions = useCallback(async () => {
        try {
            setLoading(true);
            const payload = await api.get('/redemptions') as any;
            const all: Redemption[] = Array.isArray(payload?.data) ? payload.data : [];
            // Show pending first, then others
            setRedemptions(all.sort((a, b) => {
                if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
            }));
        } catch (err: any) {
            setError('Failed to load redemptions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'catalog') fetchRewards();
        else fetchRedemptions();
    }, [activeTab, fetchRewards, fetchRedemptions]);

    // ── Create reward ─────────────────────────────────────────────────────────
    // POST /rewards — backend accepts multipart OR JSON depending on whether image is sent
    // We send JSON here (no file upload in admin web form for simplicity)
    const onSubmit = async (data: any) => {
        try {
            setError('');
            await api.post('/rewards', {
                name: data.name,
                description: data.description,
                pointCost: parseInt(data.pointCost, 10),
                stock: parseInt(data.stock, 10),
                category: data.category,
                // If no image URL provided, generate a placeholder
                imageUrl: data.imageUrl?.trim() ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=111420&color=6c63ff&size=512`,
            });
            setIsModalOpen(false);
            reset();
            setSuccessMsg('Reward added to catalog!');
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchRewards();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create reward.');
        }
    };

    // ── Delete reward ─────────────────────────────────────────────────────────
    // DELETE /rewards/:id
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            setActionLoading(id);
            await api.delete(`/rewards/${id}`);
            setSuccessMsg(`"${name}" deleted.`);
            setTimeout(() => setSuccessMsg(''), 3000);
            await fetchRewards();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete reward.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Approve redemption ────────────────────────────────────────────────────
    // POST /redemptions/:id/approve
    const handleApprove = async (id: string) => {
        try {
            setActionLoading(id);
            await api.post(`/redemptions/${id}/approve`, {});
            setSuccessMsg('Redemption approved! Employee notified.');
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchRedemptions();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to approve redemption.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Reject redemption (refunds points) ────────────────────────────────────
    // POST /redemptions/:id/reject
    const handleReject = async (id: string) => {
        if (!confirm('Reject this redemption? Points will be refunded to the employee.')) return;
        try {
            setActionLoading(id);
            await api.post(`/redemptions/${id}/reject`, {});
            setSuccessMsg('Redemption rejected. Points refunded to employee.');
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchRedemptions();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reject redemption.');
        } finally {
            setActionLoading(null);
        }
    };

    const pendingCount = redemptions.filter(r => r.status === 'PENDING').length;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Rewards</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage the reward catalog and process redemptions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                        <button
                            onClick={() => setActiveTab('catalog')}
                            className={cn('px-4 py-1.5 rounded-lg text-xs font-bold transition-all', activeTab === 'catalog' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300')}
                        >
                            <i className="fa-solid fa-gift mr-1.5"></i>Catalog
                        </button>
                        <button
                            onClick={() => setActiveTab('redemptions')}
                            className={cn('px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2', activeTab === 'redemptions' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300')}
                        >
                            <i className="fa-solid fa-clock-rotate-left"></i>Redemptions
                            {pendingCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-[#ff6584] text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>
                    {activeTab === 'catalog' && (
                        <Button
                            variant="primary"
                            className="bg-[#6c63ff] hover:bg-[#5b54d6] shadow-lg shadow-[#6c63ff]/20"
                            onClick={() => { setIsModalOpen(true); setError(''); reset(); }}
                        >
                            <i className="fa-solid fa-plus mr-2"></i>Add Reward
                        </Button>
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
                    <button onClick={() => setError('')} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* ── Catalog Tab ── */}
            {activeTab === 'catalog' && (
                loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-72 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]" />
                        ))}
                    </div>
                ) : rewards.length === 0 ? (
                    <div className="glass-panel py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-box-open text-gray-600 text-2xl"></i>
                        </div>
                        <h3 className="font-syne font-bold text-[#e8eaf6]">No rewards yet</h3>
                        <p className="text-gray-500 text-sm mt-1">Add your first reward to the catalog.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {rewards.map(reward => (
                            <div key={reward.id} className="group glass-panel overflow-hidden hover:border-[#6c63ff]/30 transition-all">
                                <div className="h-44 relative overflow-hidden bg-[#0d0f1a] flex-shrink-0">
                                    <img
                                        src={reward.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reward.name)}&background=111420&color=6c63ff`}
                                        alt={reward.name}
                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reward.name)}&background=111420&color=6c63ff`; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#111420] to-transparent" />
                                    <button
                                        onClick={() => handleDelete(reward.id, reward.name)}
                                        disabled={actionLoading === reward.id}
                                        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm text-[#ff6584] hover:bg-[#ff6584] hover:text-white transition-all flex items-center justify-center border border-white/10 disabled:opacity-40"
                                    >
                                        {actionLoading === reward.id
                                            ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            : <i className="fa-solid fa-trash-can text-xs"></i>
                                        }
                                    </button>
                                    {reward.category && (
                                        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-[#6c63ff]/20 text-[#6c63ff] text-[9px] font-bold uppercase backdrop-blur-sm border border-[#6c63ff]/30">
                                            {reward.category}
                                        </span>
                                    )}
                                </div>
                                <div className="p-5">
                                    <h3 className="font-syne font-bold text-[#e8eaf6] text-sm mb-1 group-hover:text-[#6c63ff] transition-colors">
                                        {reward.name}
                                    </h3>
                                    {reward.description && (
                                        <p className="text-[11px] text-gray-500 line-clamp-2 mb-3">{reward.description}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-3 border-t border-[#1f2540]">
                                        <div>
                                            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-0.5">Cost</div>
                                            <div className="text-lg font-syne font-bold text-[#6c63ff]">
                                                {reward.pointCost.toLocaleString()} <span className="text-[10px] text-gray-600">pts</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-0.5">Stock</div>
                                            <div className={cn(
                                                'text-sm font-bold',
                                                reward.stock === 0 ? 'text-[#ff6584]' :
                                                    reward.stock <= 5 ? 'text-[#f7b731]' : 'text-[#43e97b]'
                                            )}>
                                                {reward.stock === 0 ? 'Out of stock' : `${reward.stock} left`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Redemptions Tab ── */}
            {activeTab === 'redemptions' && (
                loading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-16 bg-[#111420] rounded-xl animate-pulse border border-[#1f2540]" />
                        ))}
                    </div>
                ) : redemptions.length === 0 ? (
                    <div className="glass-panel py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#171b2e] flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-receipt text-gray-600 text-2xl"></i>
                        </div>
                        <h3 className="font-syne font-bold text-[#e8eaf6]">No redemptions yet</h3>
                        <p className="text-gray-500 text-sm mt-1">Employees haven't redeemed any rewards yet.</p>
                    </div>
                ) : (
                    <div className="glass-panel overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-[#171b2e] border-b border-[#1f2540]">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Reward</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Cost</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f2540]">
                                    {redemptions.map(r => (
                                        <tr key={r.id} className="hover:bg-[#171b2e]/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#e8eaf6] text-sm">{r.employee?.name ?? '—'}</div>
                                                <div className="text-[10px] text-gray-500">{r.employee?.email ?? ''}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">{r.reward?.name ?? '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-syne font-bold text-[#6c63ff] text-sm">
                                                    {(r.reward?.pointCost ?? 0).toLocaleString()} pts
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {new Date(r.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase',
                                                    r.status === 'APPROVED' ? 'bg-[#43e97b]/10 text-[#43e97b]' :
                                                        r.status === 'REJECTED' ? 'bg-[#ff6584]/10 text-[#ff6584]' :
                                                            'bg-[#f7b731]/10 text-[#f7b731]'
                                                )}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {r.status === 'PENDING' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleReject(r.id)}
                                                            disabled={actionLoading === r.id}
                                                            className="w-8 h-8 rounded-lg bg-[#ff6584]/10 text-[#ff6584] hover:bg-[#ff6584] hover:text-white transition-all flex items-center justify-center disabled:opacity-40"
                                                            title="Reject & Refund"
                                                        >
                                                            <i className="fa-solid fa-xmark text-sm"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(r.id)}
                                                            disabled={actionLoading === r.id}
                                                            className="w-8 h-8 rounded-lg bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b] hover:text-white transition-all flex items-center justify-center disabled:opacity-40"
                                                            title="Approve"
                                                        >
                                                            {actionLoading === r.id
                                                                ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                                : <i className="fa-solid fa-check text-sm"></i>
                                                            }
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-600 font-bold">Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* ── Create Reward Modal ── */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setError(''); reset(); }} title="Add New Reward">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-2">
                    {error && (
                        <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">{error}</div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Reward Name</label>
                        <input
                            type="text"
                            {...register('name', { required: true })}
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                            placeholder="e.g. Amazon Gift Card ₹500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                        <textarea
                            {...register('description')}
                            className="w-full h-20 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none resize-none"
                            placeholder="What does the employee receive?"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Point Cost</label>
                            <input
                                type="number"
                                min={1}
                                {...register('pointCost', { required: true, min: 1 })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                                placeholder="500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Stock</label>
                            <input
                                type="number"
                                min={0}
                                {...register('stock', { required: true, min: 0 })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                                placeholder="10"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                            <input
                                type="text"
                                {...register('category', { required: true })}
                                className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                                placeholder="Voucher"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Image URL <span className="text-gray-600">(optional — auto-generated if empty)</span>
                        </label>
                        <input
                            type="url"
                            {...register('imageUrl')}
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none"
                            placeholder="https://…"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={() => { setIsModalOpen(false); setError(''); reset(); }}>Cancel</Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting} className="bg-[#6c63ff] hover:bg-[#5b54d6]">
                            <i className="fa-solid fa-gift mr-2"></i>Add to Catalog
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};