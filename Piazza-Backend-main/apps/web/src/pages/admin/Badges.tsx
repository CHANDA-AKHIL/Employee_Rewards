import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useForm } from 'react-hook-form';

interface Badge {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    unlockCondition: string;
}

// ── Preset badge templates with correct JSON unlock conditions ────────────────
// scoringEngine.evaluateBadges() supports:
//   { "type": "points",        "threshold": N }
//   { "type": "kpis_completed","threshold": N }
//   { "type": "streak",        "threshold": N }
const BADGE_PRESETS = [
    {
        group: '⭐ Points Milestones',
        items: [
            { name: 'First Steps', description: 'Earn your first 100 points', condition: '{"type":"points","threshold":100}', icon: 'fa-shoe-prints', color: '#43e97b' },
            { name: 'Rising Star', description: 'Earn 500 points total', condition: '{"type":"points","threshold":500}', icon: 'fa-star', color: '#f7b731' },
            { name: 'Point Collector', description: 'Earn 1,000 points total', condition: '{"type":"points","threshold":1000}', icon: 'fa-coins', color: '#6c63ff' },
            { name: 'High Achiever', description: 'Earn 2,500 points total', condition: '{"type":"points","threshold":2500}', icon: 'fa-trophy', color: '#f59e0b' },
            { name: 'Elite Performer', description: 'Earn 5,000 points total', condition: '{"type":"points","threshold":5000}', icon: 'fa-crown', color: '#ff6584' },
        ],
    },
    {
        group: '✅ KPI Completions',
        items: [
            { name: 'First Win', description: 'Complete your first KPI', condition: '{"type":"kpis_completed","threshold":1}', icon: 'fa-circle-check', color: '#43e97b' },
            { name: 'Consistent', description: 'Complete 5 KPIs', condition: '{"type":"kpis_completed","threshold":5}', icon: 'fa-list-check', color: '#06b6d4' },
            { name: 'KPI Master', description: 'Complete 10 KPIs', condition: '{"type":"kpis_completed","threshold":10}', icon: 'fa-bullseye', color: '#6c63ff' },
            { name: 'Overachiever', description: 'Complete 25 KPIs', condition: '{"type":"kpis_completed","threshold":25}', icon: 'fa-medal', color: '#f7b731' },
        ],
    },
    {
        group: '🔥 Streaks',
        items: [
            { name: 'On Fire', description: 'Maintain a 3-day streak', condition: '{"type":"streak","threshold":3}', icon: 'fa-fire', color: '#f59e0b' },
            { name: 'Dedicated', description: 'Maintain a 7-day streak', condition: '{"type":"streak","threshold":7}', icon: 'fa-fire-flame-curved', color: '#ff6584' },
            { name: 'Unstoppable', description: 'Maintain a 14-day streak', condition: '{"type":"streak","threshold":14}', icon: 'fa-bolt', color: '#f7b731' },
            { name: 'Legend', description: 'Maintain a 30-day streak', condition: '{"type":"streak","threshold":30}', icon: 'fa-dragon', color: '#6c63ff' },
        ],
    },
];

function parseConditionLabel(raw: string): string {
    try {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'points') return `Earn ${parsed.threshold} pts`;
        if (parsed.type === 'kpis_completed') return `Complete ${parsed.threshold} KPIs`;
        if (parsed.type === 'streak') return `${parsed.threshold}-day streak`;
    } catch { /* not JSON */ }
    return raw;
}

export const AdminBadges: React.FC = () => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [conditionMode, setConditionMode] = useState<'preset' | 'custom'>('preset');

    const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();

    const fetchBadges = useCallback(async () => {
        try {
            setLoading(true);
            const payload = await api.get('/gamification/badges') as any;
            setBadges(Array.isArray(payload?.data) ? payload.data : []);
        } catch {
            setError('Failed to load badges.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBadges(); }, [fetchBadges]);

    const applyPreset = (condition: string, name: string, description: string) => {
        setSelectedPreset(condition);
        setValue('unlockCondition', condition);
        setValue('name', name);
        setValue('description', description);
    };

    const onSubmit = async (data: any) => {
        try {
            setError('');
            const formData = new FormData();
            formData.append('name', data.name.trim());
            formData.append('description', data.description?.trim() ?? '');
            formData.append('unlockCondition', data.unlockCondition.trim());
            if (data.image?.[0]) formData.append('image', data.image[0]);

            await api.post('/gamification/badges', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setIsModalOpen(false);
            reset();
            setSelectedPreset('');
            setSuccessMsg(`Badge "${data.name}" created!`);
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchBadges();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create badge.');
        }
    };

    const openModal = () => {
        reset();
        setSelectedPreset('');
        setConditionMode('preset');
        setError('');
        setIsModalOpen(true);
    };

    const handleDelete = async (badge: Badge) => {
        if (!confirm(`Delete badge "${badge.name}"? This will also remove it from any employees who earned it.`)) return;
        try {
            await api.delete(`/gamification/badges/${badge.id}`);
            setSuccessMsg(`Badge "${badge.name}" deleted.`);
            setTimeout(() => setSuccessMsg(''), 4000);
            await fetchBadges();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete badge.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Badges</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Create achievement badges — {badges.length} configured.
                    </p>
                </div>
                <Button variant="primary" className="bg-[#f59e0b] hover:bg-[#d97706] shadow-lg shadow-[#f59e0b]/20" onClick={openModal}>
                    <i className="fa-solid fa-award mr-2"></i> Create Badge
                </Button>
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

            {/* ── How badges work info ── */}
            <div className="p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-3 text-sm">
                <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0 mt-0.5"></i>
                <div className="text-gray-400 text-xs leading-relaxed">
                    <span className="text-[#e8eaf6] font-bold block mb-1">How badges are awarded automatically:</span>
                    When a KPI is approved, the system checks each badge's unlock condition against the employee's stats.
                    Use the preset templates below for conditions the system can automatically evaluate.
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-[#111420] animate-pulse border border-[#1f2540]" />)}
                </div>
            ) : badges.length === 0 ? (
                <div className="glass-panel py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-medal text-[#f59e0b] text-2xl"></i>
                    </div>
                    <h3 className="font-syne font-bold text-[#e8eaf6]">No badges created yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Use the preset templates to create badges quickly.</p>
                    <button onClick={openModal} className="mt-5 px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl font-bold text-sm transition-all">
                        Create First Badge
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {badges.map(b => (
                        <div key={b.id} className="group glass-panel p-6 flex flex-col items-center text-center hover:border-[#f59e0b]/30 transition-all relative overflow-hidden">
                            {/* Delete button */}
                            <button
                                onClick={() => handleDelete(b)}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-[#ff6584]/10 border border-[#ff6584]/20 flex items-center justify-center text-[#ff6584] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ff6584]/20 z-20"
                                title="Delete badge"
                            >
                                <i className="fa-solid fa-trash text-[10px]"></i>
                            </button>
                            <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative mb-4">
                                <div className="w-20 h-20 rounded-full bg-[#0d0f1a] border border-[#1f2540] p-3 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                                    {b.imageUrl
                                        ? <img src={b.imageUrl} alt={b.name} className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        : <i className="fa-solid fa-medal text-3xl text-[#f59e0b]"></i>
                                    }
                                </div>
                                <div className="absolute inset-0 bg-[#f59e0b] blur-[24px] opacity-10 group-hover:opacity-20 transition-opacity rounded-full" />
                            </div>
                            <h3 className="font-syne font-bold text-[#e8eaf6] text-sm mb-1 group-hover:text-[#f59e0b] transition-colors">{b.name}</h3>
                            {b.description && <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 min-h-[28px]">{b.description}</p>}
                            <div className="mt-auto w-full">
                                <div className="text-[8px] text-gray-600 uppercase font-bold tracking-widest mb-1">Unlock Condition</div>
                                <div className="bg-[#171b2e] border border-[#1f2540] rounded-lg px-2 py-1.5 text-[9px] text-[#f59e0b] font-bold truncate" title={b.unlockCondition}>
                                    {parseConditionLabel(b.unlockCondition)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Create Modal ── */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setError(''); reset(); setSelectedPreset(''); }} title="Create Achievement Badge">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
                    {error && <div className="p-3 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">{error}</div>}

                    {/* ── Preset picker ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Unlock Condition
                            </label>
                            <div className="flex gap-1 bg-[#0a0c14] p-0.5 rounded-lg border border-[#1f2540]">
                                <button type="button" onClick={() => setConditionMode('preset')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${conditionMode === 'preset' ? 'bg-[#6c63ff] text-white' : 'text-gray-500'}`}>
                                    Presets
                                </button>
                                <button type="button" onClick={() => setConditionMode('custom')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${conditionMode === 'custom' ? 'bg-[#6c63ff] text-white' : 'text-gray-500'}`}>
                                    Custom
                                </button>
                            </div>
                        </div>

                        {conditionMode === 'preset' ? (
                            <div className="space-y-4 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                {BADGE_PRESETS.map(group => (
                                    <div key={group.group}>
                                        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">{group.group}</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.items.map(item => (
                                                <button
                                                    key={item.condition}
                                                    type="button"
                                                    onClick={() => applyPreset(item.condition, item.name, item.description)}
                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all border text-xs font-bold ${selectedPreset === item.condition
                                                        ? 'border-[#6c63ff] bg-[#6c63ff]/10 text-[#6c63ff]'
                                                        : 'border-[#1f2540] bg-[#0a0c14] text-gray-400 hover:border-[#6c63ff]/40 hover:text-gray-200'
                                                        }`}
                                                >
                                                    <i className={`fa-solid ${item.icon} text-[11px] flex-shrink-0`} style={{ color: selectedPreset === item.condition ? '#6c63ff' : item.color }}></i>
                                                    <span className="truncate">{item.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    {...register('unlockCondition', { required: true })}
                                    className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#f59e0b] outline-none font-mono"
                                    placeholder='{"type":"points","threshold":500}'
                                />
                                <p className="text-[10px] text-gray-600 mt-1">
                                    Valid types: <code className="text-[#f59e0b]">points</code>, <code className="text-[#f59e0b]">kpis_completed</code>, <code className="text-[#f59e0b]">streak</code>
                                </p>
                            </div>
                        )}

                        {/* Hidden field for preset mode */}
                        {conditionMode === 'preset' && (
                            <input type="hidden" {...register('unlockCondition', { required: true })} />
                        )}

                        {conditionMode === 'preset' && selectedPreset && (
                            <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#43e97b]/10 border border-[#43e97b]/20 text-[10px] text-[#43e97b] font-bold font-mono">
                                ✓ {selectedPreset}
                            </div>
                        )}
                    </div>

                    {/* ── Name ── */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Badge Name</label>
                        <input
                            type="text"
                            {...register('name', { required: true })}
                            className="w-full bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#f59e0b] outline-none"
                            placeholder="e.g. Sales Champion"
                        />
                    </div>

                    {/* ── Description ── */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                        <textarea
                            {...register('description')}
                            className="w-full h-20 bg-[#111420] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#f59e0b] outline-none resize-none"
                            placeholder="How is this badge earned?"
                        />
                    </div>

                    {/* ── Image upload ── */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                            Badge Icon <span className="text-gray-600">(optional — PNG recommended)</span>
                        </label>
                        <div className="relative cursor-pointer group">
                            <input type="file" accept="image/*" {...register('image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className="w-full bg-[#111420] border border-[#1f2540] border-dashed rounded-xl px-4 py-6 text-center group-hover:border-[#f59e0b]/50 transition-all">
                                <i className="fa-solid fa-cloud-arrow-up text-gray-600 text-2xl mb-2 block"></i>
                                <div className="text-xs text-gray-500">Click or drag to upload</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={() => { setIsModalOpen(false); setError(''); reset(); setSelectedPreset(''); }}>Cancel</Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting} className="bg-[#f59e0b] hover:bg-[#d97706]"
                            disabled={conditionMode === 'preset' && !selectedPreset}>
                            <i className="fa-solid fa-award mr-2"></i>Create Badge
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};