import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

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
    resolvedAt?: string | null;
    reward: {
        id: string;
        name: string;
        description?: string | null;
        pointCost: number;
        category?: string | null;
        imageUrl?: string | null;
    };
}

function statusColor(s: string) {
    if (s === 'APPROVED') return { color: '#43e97b', bg: 'bg-[#43e97b]/10', border: 'border-[#43e97b]/30' };
    if (s === 'REJECTED') return { color: '#ff6584', bg: 'bg-[#ff6584]/10', border: 'border-[#ff6584]/30' };
    return { color: '#f7b731', bg: 'bg-[#f7b731]/10', border: 'border-[#f7b731]/30' };
}

// Estimate expiry: 30 days from approval date (since Redemption model has no expiryDate field)
function estimateExpiry(resolvedAt?: string | null, requestedAt?: string): string {
    const base = resolvedAt ? new Date(resolvedAt) : requestedAt ? new Date(requestedAt) : new Date();
    const expiry = new Date(base);
    expiry.setDate(expiry.getDate() + 30);
    return expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const EmployeeRewards: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'catalog' | 'myredemptions'>('catalog');
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [redeeming, setRedeeming] = useState(false);
    const [error, setError] = useState('');
    const [filterCat, setFilterCat] = useState('All');

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError('');
            const [rewardsEnv, statsEnv, redemptionsEnv] = await Promise.allSettled([
                api.get('/rewards'),
                api.get(`/employees/${user.id}/stats`),
                api.get('/redemptions'),
            ]);

            if (rewardsEnv.status === 'fulfilled') {
                const p = rewardsEnv.value as any;
                setRewards(Array.isArray(p?.data) ? p.data : []);
            }
            if (statsEnv.status === 'fulfilled') {
                const p = statsEnv.value as any;
                setTotalPoints(p?.data?.totalPoints ?? 0);
            }
            if (redemptionsEnv.status === 'fulfilled') {
                const p = redemptionsEnv.value as any;
                setRedemptions(Array.isArray(p?.data) ? p.data : []);
            }
        } catch {
            setError('Failed to load rewards.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleConfirmRedeem = async () => {
        if (!selectedReward) return;
        try {
            setRedeeming(true);
            setError('');
            await api.post('/redemptions', { rewardId: selectedReward.id });
            setStep(2);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Redemption failed.');
        } finally {
            setRedeeming(false);
        }
    };

    const closeModal = () => { setSelectedReward(null); setStep(1); setError(''); };
    const closeRedemption = () => setSelectedRedemption(null);

    const categories = ['All', ...Array.from(new Set(rewards.map(r => r.category).filter(Boolean) as string[]))];
    const filtered = filterCat === 'All' ? rewards : rewards.filter(r => r.category === filterCat);

    const pendingCount = redemptions.filter(r => r.status === 'PENDING').length;
    const approvedCount = redemptions.filter(r => r.status === 'APPROVED').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Rewards</h1>
                    <p className="text-gray-500 text-sm mt-1">Browse the catalog and track your redemptions.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tab switcher */}
                    <div className="flex items-center gap-1 bg-[#111420] p-1 rounded-xl border border-[#1f2540]">
                        <button onClick={() => setActiveTab('catalog')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'catalog' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            <i className="fa-solid fa-gift mr-1.5"></i>Catalog
                        </button>
                        <button onClick={() => setActiveTab('myredemptions')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'myredemptions' ? 'bg-[#6c63ff] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            My Redemptions
                            {pendingCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-[#f7b731] text-[8px] font-bold text-black flex items-center justify-center animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Points balance */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/30">
                        <i className="fa-solid fa-coins text-[#6c63ff]"></i>
                        <div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none">Balance</div>
                            <div className="text-sm font-syne font-bold text-[#e8eaf6] leading-tight">
                                {loading ? '…' : totalPoints.toLocaleString()} pts
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && !selectedReward && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={fetchData} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── CATALOG TAB ── */}
            {activeTab === 'catalog' && (
                <>
                    <div className="p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-4 text-sm">
                        <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0 mt-0.5"></i>
                        <div className="text-gray-400 leading-relaxed text-xs">
                            <span className="text-[#e8eaf6] font-bold block mb-1">How to redeem:</span>
                            Complete KPIs → earn points → click Redeem → admin approves → see your voucher in My Redemptions.
                        </div>
                    </div>

                    {categories.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setFilterCat(cat)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCat === cat ? 'bg-[#6c63ff] text-white' : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {[...Array(8)].map((_, i) => <div key={i} className="glass-panel overflow-hidden h-64 animate-pulse bg-[#111420]" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="glass-panel p-16 text-center">
                            <i className="fa-solid fa-gift text-4xl text-gray-700 mb-4 block"></i>
                            <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">No rewards available</h3>
                            <p className="text-gray-500 text-sm">Your admin will add rewards soon.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filtered.map(reward => {
                                const canAfford = totalPoints >= reward.pointCost;
                                const inStock = reward.stock > 0;
                                const disabled = !canAfford || !inStock;
                                return (
                                    <div key={reward.id} className={`glass-panel overflow-hidden flex flex-col group transition-all duration-200 ${disabled ? 'opacity-70' : 'hover:scale-[1.02] hover:border-[#6c63ff]/30'}`}>
                                        <div className="h-44 overflow-hidden bg-[#171b2e] relative flex-shrink-0">
                                            {reward.imageUrl
                                                ? <img src={reward.imageUrl} alt={reward.name} className={`w-full h-full object-cover transition-transform duration-500 ${disabled ? 'grayscale' : 'group-hover:scale-105'}`} />
                                                : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600"><i className="fa-solid fa-gift"></i></div>
                                            }
                                            {!inStock && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                                    <span className="font-bold text-white text-xs bg-[#ff6584]/80 px-4 py-1.5 rounded-lg">OUT OF STOCK</span>
                                                </div>
                                            )}
                                            {reward.category && (
                                                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-lg bg-black/50 text-gray-300 backdrop-blur-sm">{reward.category}</span>
                                            )}
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col gap-3">
                                            <h3 className={`font-syne font-bold text-base leading-tight ${disabled ? 'text-gray-400' : 'text-[#e8eaf6]'}`}>{reward.name}</h3>
                                            {reward.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">{reward.description}</p>}
                                            {inStock && reward.stock <= 5 && (
                                                <p className="text-[11px] text-[#f7b731] font-bold">
                                                    <i className="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>Only {reward.stock} left!
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1f2540]">
                                                <span className={`font-syne font-bold text-lg ${canAfford ? 'text-[#6c63ff]' : 'text-gray-600'}`}>
                                                    {reward.pointCost.toLocaleString()}<span className="text-xs font-normal text-gray-600 ml-1">pts</span>
                                                </span>
                                                <button disabled={disabled} onClick={() => { setSelectedReward(reward); setStep(1); setError(''); }}
                                                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${disabled ? 'bg-[#171b2e] text-gray-600 border border-[#1f2540] cursor-not-allowed' : 'bg-[#6c63ff] hover:bg-[#5b54d6] text-white shadow-md shadow-[#6c63ff]/20'}`}>
                                                    {!canAfford ? 'Not enough pts' : !inStock ? 'Out of stock' : 'Redeem'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── MY REDEMPTIONS TAB ── */}
            {activeTab === 'myredemptions' && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Total', value: redemptions.length, color: '#6c63ff' },
                            { label: 'Pending', value: pendingCount, color: '#f7b731' },
                            { label: 'Approved', value: approvedCount, color: '#43e97b' },
                        ].map((s, i) => (
                            <div key={i} className="glass-panel p-4 text-center">
                                <div className="text-2xl font-syne font-bold" style={{ color: s.color }}>{s.value}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-20 glass-panel animate-pulse" />)}
                        </div>
                    ) : redemptions.length === 0 ? (
                        <div className="glass-panel p-16 text-center">
                            <i className="fa-solid fa-receipt text-4xl text-gray-700 mb-4 block"></i>
                            <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">No redemptions yet</h3>
                            <p className="text-gray-500 text-sm mb-5">Browse the catalog and redeem your first reward!</p>
                            <button onClick={() => setActiveTab('catalog')} className="px-5 py-2.5 bg-[#6c63ff] hover:bg-[#5b54d6] text-white rounded-xl font-bold text-sm transition-all">
                                Browse Catalog
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {redemptions.map(r => {
                                const sc = statusColor(r.status);
                                return (
                                    <button key={r.id} onClick={() => setSelectedRedemption(r)}
                                        className="glass-panel w-full p-5 flex items-center gap-4 hover:border-[#6c63ff]/30 transition-all text-left group">
                                        {/* Reward image */}
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#171b2e] flex-shrink-0 flex items-center justify-center">
                                            {r.reward.imageUrl
                                                ? <img src={r.reward.imageUrl} alt={r.reward.name} className="w-full h-full object-cover" />
                                                : <i className="fa-solid fa-gift text-xl text-gray-600"></i>
                                            }
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="font-syne font-bold text-[#e8eaf6] group-hover:text-[#6c63ff] transition-colors truncate">{r.reward.name}</div>
                                            {r.reward.category && <div className="text-[10px] text-gray-500 mt-0.5">{r.reward.category}</div>}
                                            <div className="text-[10px] text-gray-600 mt-1">
                                                Requested {new Date(r.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            <span className="font-syne font-bold text-sm text-[#6c63ff]">
                                                {r.reward.pointCost.toLocaleString()} pts
                                            </span>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.border}`} style={{ color: sc.color }}>
                                                {r.status}
                                            </span>
                                        </div>

                                        <i className="fa-solid fa-chevron-right text-gray-600 group-hover:text-[#6c63ff] transition-colors flex-shrink-0 text-xs ml-1"></i>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Redemption confirm modal ── */}
            <Modal isOpen={!!selectedReward} onClose={closeModal} title={step === 1 ? 'Confirm Redemption' : 'Redeemed! 🎉'}>
                {selectedReward && step === 1 && (
                    <div className="space-y-5">
                        <div className="flex gap-4 p-4 rounded-xl bg-[#171b2e] border border-[#1f2540]">
                            <div className="w-16 h-16 rounded-xl bg-[#111420] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {selectedReward.imageUrl ? <img src={selectedReward.imageUrl} alt={selectedReward.name} className="w-full h-full object-cover" /> : <i className="fa-solid fa-gift text-2xl text-gray-600"></i>}
                            </div>
                            <div>
                                <h4 className="font-bold text-[#e8eaf6]">{selectedReward.name}</h4>
                                {selectedReward.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedReward.description}</p>}
                            </div>
                        </div>
                        <div className="rounded-xl bg-[#0a0c14] border border-[#1f2540] p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Current balance</span>
                                <span className="text-[#e8eaf6] font-bold">{totalPoints.toLocaleString()} pts</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Reward cost</span>
                                <span className="text-[#ff6584] font-bold">−{selectedReward.pointCost.toLocaleString()} pts</span>
                            </div>
                            <div className="h-px bg-[#1f2540]" />
                            <div className="flex justify-between">
                                <span className="text-sm font-bold text-[#e8eaf6]">Remaining balance</span>
                                <span className="font-syne font-bold text-[#6c63ff]">{(totalPoints - selectedReward.pointCost).toLocaleString()} pts</span>
                            </div>
                        </div>
                        {error && <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">{error}</div>}
                        <div className="flex justify-end gap-3 pt-1">
                            <Button variant="ghost" type="button" onClick={closeModal}>Cancel</Button>
                            <Button variant="primary" onClick={handleConfirmRedeem} isLoading={redeeming} className="bg-[#6c63ff] hover:bg-[#5b54d6]">
                                <i className="fa-solid fa-check mr-2 text-sm"></i>Confirm & Redeem
                            </Button>
                        </div>
                    </div>
                )}
                {selectedReward && step === 2 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-5">
                        <div className="w-20 h-20 bg-[#43e97b]/10 rounded-full flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-[#43e97b] blur-xl opacity-10 rounded-full animate-pulse" />
                            <i className="fa-solid fa-circle-check text-[#43e97b] text-4xl relative z-10"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-syne font-bold text-[#e8eaf6] mb-2">Redemption Successful!</h3>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                                You've redeemed <span className="text-[#e8eaf6] font-bold">{selectedReward.name}</span>.
                                Track the status in <span className="text-[#6c63ff] font-bold">My Redemptions</span>.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <Button variant="ghost" onClick={closeModal} className="flex-1">Back to Catalog</Button>
                            <Button variant="primary" onClick={() => { closeModal(); setActiveTab('myredemptions'); }} className="flex-1 bg-[#6c63ff] hover:bg-[#5b54d6]">
                                View Redemptions
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Redemption Detail Modal ── */}
            {selectedRedemption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={closeRedemption}>
                    <div className="w-full max-w-sm mx-4 bg-[#111420] border border-[#1f2540] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2540]">
                            <h3 className="font-syne font-bold text-[#e8eaf6]">Redemption Details</h3>
                            <button onClick={closeRedemption} className="w-7 h-7 rounded-lg bg-[#171b2e] text-gray-500 hover:text-white flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Reward image + name */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#171b2e] border border-[#1f2540]">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#111420] flex-shrink-0 flex items-center justify-center">
                                    {selectedRedemption.reward.imageUrl
                                        ? <img src={selectedRedemption.reward.imageUrl} alt={selectedRedemption.reward.name} className="w-full h-full object-cover" />
                                        : <i className="fa-solid fa-gift text-2xl text-gray-600"></i>
                                    }
                                </div>
                                <div>
                                    <h4 className="font-syne font-bold text-[#e8eaf6]">{selectedRedemption.reward.name}</h4>
                                    {selectedRedemption.reward.category && (
                                        <span className="text-[10px] text-[#6c63ff] font-bold uppercase">{selectedRedemption.reward.category}</span>
                                    )}
                                    {selectedRedemption.reward.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedRedemption.reward.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="rounded-xl bg-[#0a0c14] border border-[#1f2540] divide-y divide-[#1f2540]">
                                {[
                                    { label: 'Status', value: selectedRedemption.status, special: true },
                                    { label: 'Points Spent', value: `${selectedRedemption.reward.pointCost.toLocaleString()} pts` },
                                    { label: 'Requested On', value: new Date(selectedRedemption.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
                                    ...(selectedRedemption.resolvedAt ? [{
                                        label: 'Approved On',
                                        value: new Date(selectedRedemption.resolvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
                                    }] : []),
                                    ...(selectedRedemption.status === 'APPROVED' ? [{
                                        label: 'Estimated Expiry',
                                        value: estimateExpiry(selectedRedemption.resolvedAt, selectedRedemption.requestedAt),
                                        expiry: true,
                                    }] : []),
                                ].map((item: any, i) => {
                                    const sc = statusColor(selectedRedemption.status);
                                    return (
                                        <div key={i} className="flex items-center justify-between px-4 py-3">
                                            <span className="text-xs text-gray-500">{item.label}</span>
                                            {item.special ? (
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.border}`} style={{ color: sc.color }}>
                                                    {item.value}
                                                </span>
                                            ) : (
                                                <span className={`text-sm font-bold ${item.expiry ? 'text-[#f7b731]' : 'text-[#e8eaf6]'}`}>
                                                    {item.expiry && <i className="fa-solid fa-hourglass-half mr-1 text-[10px]"></i>}
                                                    {item.value}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Status message */}
                            {selectedRedemption.status === 'PENDING' && (
                                <div className="p-3 rounded-xl bg-[#f7b731]/10 border border-[#f7b731]/20 text-xs text-[#f7b731]">
                                    <i className="fa-solid fa-clock mr-2"></i>
                                    Your redemption is being processed. Admin will approve shortly.
                                </div>
                            )}
                            {selectedRedemption.status === 'APPROVED' && (
                                <div className="p-3 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/20 text-xs text-[#43e97b]">
                                    <i className="fa-solid fa-circle-check mr-2"></i>
                                    Approved! Contact your admin to collect your reward before the expiry date.
                                </div>
                            )}
                            {selectedRedemption.status === 'REJECTED' && (
                                <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/20 text-xs text-[#ff6584]">
                                    <i className="fa-solid fa-ban mr-2"></i>
                                    This redemption was rejected. Your points have been refunded.
                                </div>
                            )}

                            <button onClick={closeRedemption}
                                className="w-full py-3 rounded-xl bg-[#6c63ff] hover:bg-[#5b54d6] text-white font-bold text-sm transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};