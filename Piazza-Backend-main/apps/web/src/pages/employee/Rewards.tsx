import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────
// GET /rewards      → sendPaginated → payload.data = Reward[]
// GET /employees/:id/stats → sendSuccess → payload.data = { totalPoints, ... }
// POST /redemptions → sendSuccess

interface Reward {
    id: string;
    name: string;
    description?: string | null;
    pointCost: number;
    category?: string | null;
    stock: number;
    imageUrl?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EmployeeRewards: React.FC = () => {
    const user = useAuthStore(state => state.user);

    const [rewards, setRewards] = useState<Reward[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [redeeming, setRedeeming] = useState(false);
    const [error, setError] = useState('');
    const [filterCat, setFilterCat] = useState('All');

    // ── Load rewards + employee points ────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setError('');

            const [rewardsEnv, statsEnv] = await Promise.allSettled([
                // GET /rewards → sendPaginated → { success, data: Reward[], pagination }
                api.get('/rewards'),
                // GET /employees/:id/stats → sendSuccess → { success, data: { totalPoints, ... } }
                api.get(`/employees/${user.id}/stats`),
            ]);

            if (rewardsEnv.status === 'fulfilled') {
                const payload = rewardsEnv.value as any;
                // sendPaginated: payload.data = array
                const list: Reward[] = Array.isArray(payload?.data) ? payload.data : [];
                setRewards(list);
            }

            if (statsEnv.status === 'fulfilled') {
                const payload = statsEnv.value as any;
                // sendSuccess: payload.data = { totalPoints, ... }
                const pts = payload?.data?.totalPoints ?? 0;
                setTotalPoints(pts);
            }

        } catch (err: any) {
            setError('Failed to load rewards. Please retry.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Redeem ────────────────────────────────────────────────────────────────
    const handleConfirmRedeem = async () => {
        if (!selectedReward) return;
        try {
            setRedeeming(true);
            setError('');
            // POST /redemptions body: { rewardId }
            await api.post('/redemptions', { rewardId: selectedReward.id });
            setStep(2);
            await fetchData(); // Refresh points + stock
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Redemption failed.';
            setError(msg);
        } finally {
            setRedeeming(false);
        }
    };

    const closeModal = () => { setSelectedReward(null); setStep(1); setError(''); };

    // ── Categories ────────────────────────────────────────────────────────────
    const categories = ['All', ...Array.from(new Set(rewards.map(r => r.category).filter(Boolean) as string[]))];
    const filtered = filterCat === 'All' ? rewards : rewards.filter(r => r.category === filterCat);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Reward Catalog</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Spend your hard-earned points on amazing rewards.
                    </p>
                </div>

                {/* Points balance */}
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/30 shadow-[0_0_15px_rgba(108,99,255,0.1)]">
                    <i className="fa-solid fa-coins text-[#6c63ff] text-lg"></i>
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">My Balance</div>
                        <div className="text-xl font-syne font-bold text-[#e8eaf6] leading-tight">
                            {loading ? '…' : totalPoints.toLocaleString()} pts
                        </div>
                    </div>
                </div>
            </div>

            {/* ── How it works ── */}
            <div className="p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-4 text-sm relative overflow-hidden">
                <i className="fa-solid fa-circle-info text-[#6c63ff] text-xl flex-shrink-0 mt-0.5"></i>
                <div className="text-gray-400 leading-relaxed">
                    <span className="text-[#e8eaf6] font-bold block mb-1">How to redeem:</span>
                    Earn points by completing KPIs and challenges → Browse the catalog → Click{' '}
                    <strong className="text-[#e8eaf6]">Redeem</strong> on any reward you can afford → Confirm and we'll process your request.
                </div>
            </div>

            {/* ── Error ── */}
            {error && !selectedReward && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                    <button onClick={fetchData} className="ml-auto underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Category filter ── */}
            {categories.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCat(cat)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCat === cat
                                ? 'bg-[#6c63ff] text-white'
                                : 'bg-[#171b2e] text-gray-500 hover:text-white border border-[#1f2540]'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Rewards grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="glass-panel overflow-hidden">
                            <div className="h-44 bg-[#1f2540] animate-pulse" />
                            <div className="p-5 space-y-3">
                                <div className="h-4 bg-[#1f2540] rounded animate-pulse w-3/4" />
                                <div className="h-3 bg-[#1f2540] rounded animate-pulse w-full" />
                                <div className="h-8 bg-[#1f2540] rounded-xl animate-pulse w-full mt-4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center text-3xl text-[#6c63ff] mx-auto mb-4">
                        <i className="fa-solid fa-gift"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6] text-lg mb-2">No rewards available</h3>
                    <p className="text-gray-500 text-sm">Your admin will add rewards to the catalog soon.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map(reward => {
                        const canAfford = totalPoints >= reward.pointCost;
                        const inStock = reward.stock > 0;
                        const disabled = !canAfford || !inStock;

                        return (
                            <div
                                key={reward.id}
                                className={`glass-panel overflow-hidden flex flex-col group transition-all duration-200 ${disabled ? 'opacity-70' : 'hover:scale-[1.02] hover:border-[#6c63ff]/30'
                                    }`}
                            >
                                {/* Image */}
                                <div className="h-44 overflow-hidden bg-[#171b2e] relative flex-shrink-0">
                                    {reward.imageUrl ? (
                                        <img
                                            src={reward.imageUrl}
                                            alt={reward.name}
                                            className={`w-full h-full object-cover transition-transform duration-500 ${disabled ? 'grayscale' : 'group-hover:scale-105'
                                                }`}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                                            <i className="fa-solid fa-gift"></i>
                                        </div>
                                    )}
                                    {!inStock && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="font-bold text-white tracking-widest text-xs bg-[#ff6584]/80 px-4 py-1.5 rounded-lg">
                                                OUT OF STOCK
                                            </span>
                                        </div>
                                    )}
                                    {reward.category && (
                                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-lg bg-black/50 text-gray-300 backdrop-blur-sm">
                                            {reward.category}
                                        </span>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-5 flex-1 flex flex-col gap-3">
                                    <h3 className={`font-syne font-bold text-base leading-tight ${disabled ? 'text-gray-400' : 'text-[#e8eaf6]'}`}>
                                        {reward.name}
                                    </h3>
                                    {reward.description && (
                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">
                                            {reward.description}
                                        </p>
                                    )}

                                    {/* Stock indicator */}
                                    {inStock && reward.stock <= 5 && (
                                        <p className="text-[11px] text-[#f7b731] font-bold">
                                            <i className="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>
                                            Only {reward.stock} left!
                                        </p>
                                    )}

                                    {/* Price + action */}
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1f2540]">
                                        <span className={`font-syne font-bold text-lg ${canAfford ? 'text-[#6c63ff]' : 'text-gray-600'}`}>
                                            {reward.pointCost.toLocaleString()}
                                            <span className="text-xs font-normal text-gray-600 ml-1">pts</span>
                                        </span>
                                        <button
                                            disabled={disabled}
                                            onClick={() => { setSelectedReward(reward); setStep(1); setError(''); }}
                                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${disabled
                                                ? 'bg-[#171b2e] text-gray-600 border border-[#1f2540] cursor-not-allowed'
                                                : 'bg-[#6c63ff] hover:bg-[#5b54d6] text-white shadow-md shadow-[#6c63ff]/20'
                                                }`}
                                        >
                                            {!canAfford ? 'Not enough pts' : !inStock ? 'Out of stock' : 'Redeem'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Redemption modal ── */}
            <Modal
                isOpen={!!selectedReward}
                onClose={closeModal}
                title={step === 1 ? 'Confirm Redemption' : 'Redeemed! 🎉'}
            >
                {selectedReward && step === 1 && (
                    <div className="space-y-5">
                        {/* Reward preview */}
                        <div className="flex gap-4 p-4 rounded-xl bg-[#171b2e] border border-[#1f2540]">
                            <div className="w-16 h-16 rounded-xl bg-[#111420] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {selectedReward.imageUrl ? (
                                    <img src={selectedReward.imageUrl} alt={selectedReward.name} className="w-full h-full object-cover" />
                                ) : (
                                    <i className="fa-solid fa-gift text-2xl text-gray-600"></i>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-[#e8eaf6]">{selectedReward.name}</h4>
                                {selectedReward.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedReward.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Points breakdown */}
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
                                <span className="font-syne font-bold text-[#6c63ff]">
                                    {(totalPoints - selectedReward.pointCost).toLocaleString()} pts
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-1">
                            <Button variant="ghost" type="button" onClick={closeModal}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmRedeem}
                                isLoading={redeeming}
                                className="bg-[#6c63ff] hover:bg-[#5b54d6]"
                            >
                                <i className="fa-solid fa-check mr-2 text-sm"></i>
                                Confirm & Redeem
                            </Button>
                        </div>
                    </div>
                )}

                {selectedReward && step === 2 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-500 space-y-5">
                        <div className="w-20 h-20 bg-[#43e97b]/10 rounded-full flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-[#43e97b] blur-xl opacity-10 rounded-full animate-pulse" />
                            <i className="fa-solid fa-circle-check text-[#43e97b] text-4xl relative z-10"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-syne font-bold text-[#e8eaf6] mb-2">Redemption Successful!</h3>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                                You've redeemed{' '}
                                <span className="text-[#e8eaf6] font-bold">{selectedReward.name}</span>.
                                Our team will process your request and contact you shortly.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={closeModal}
                            className="w-full bg-[#6c63ff] hover:bg-[#5b54d6]"
                        >
                            Back to Catalog
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
};