import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface Employee {
    id: string;
    name: string;
    email: string;
    department?: string | null;
}

interface RecognitionHistory {
    receiverId: string;
    receiverName: string;
    points: number;
    message: string;
}

function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export const EmployeeRecognition: React.FC = () => {
    const user = useAuthStore(s => s.user);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [myPoints, setMyPoints] = useState(0);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Employee | null>(null);
    const [points, setPoints] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [history, setHistory] = useState<RecognitionHistory[]>([]);

    const POINT_OPTIONS = [5, 10, 25, 50, 100];
    const QUICK_MESSAGES = [
        'Great work on the project!',
        'Your help made a huge difference.',
        'Outstanding performance this week!',
        'Thanks for going above and beyond.',
        'Excellent teamwork and collaboration.',
        'You crushed it! 🔥',
    ];

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [lbPayload, statsPayload] = await Promise.allSettled([
                api.get('/gamification/leaderboard?limit=100') as any,
                user?.id ? api.get(`/employees/${user.id}/stats`) as any : Promise.reject(),
            ]);

            if (lbPayload.status === 'fulfilled') {
                const entries: any[] = Array.isArray(lbPayload.value?.data) ? lbPayload.value.data : [];
                const colleagues: Employee[] = entries
                    .filter(e => e.employee?.id !== user?.id)
                    .map(e => ({
                        id: e.employee.id,
                        name: e.employee.name,
                        email: e.employee.email ?? '',
                        department: e.employee.department,
                    }));
                setEmployees(colleagues);
            }

            if (statsPayload.status === 'fulfilled') {
                const p = statsPayload.value as any;
                setMyPoints(p?.data?.totalPoints ?? 0);
            }
        } catch {
            setError('Failed to load colleagues.');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) { setError('Please select a colleague.'); return; }
        if (!points) { setError('Please select a point amount.'); return; }
        if (!message.trim()) { setError('Please write a message.'); return; }
        if (message.trim().length < 10) { setError('Message must be at least 10 characters.'); return; }

        const pts = parseInt(points, 10);
        if (pts > myPoints) {
            setError(`You only have ${myPoints} pts. You can't give more than you have.`);
            return;
        }

        try {
            setSending(true);
            setError('');

            const response = await api.post(`/employees/${selected.id}/recognize`, {
                points: pts,
                message: message.trim(),
            }) as any;

            // Update local balance
            const remaining = response?.data?.giverRemainingPoints ?? (myPoints - pts);
            setMyPoints(remaining);

            setHistory(prev => [
                { receiverId: selected.id, receiverName: selected.name, points: pts, message: message.trim() },
                ...prev.slice(0, 4),
            ]);

            setSuccessMsg(`🌟 ${pts} points given to ${selected.name}! Your balance: ${remaining.toLocaleString()} pts`);
            setTimeout(() => setSuccessMsg(''), 6000);

            setSelected(null);
            setPoints('');
            setMessage('');
            setSearch('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send recognition.');
        } finally {
            setSending(false);
        }
    };

    const filtered = employees.filter(e => {
        const q = search.toLowerCase();
        return e.name.toLowerCase().includes(q) || (e.department ?? '').toLowerCase().includes(q);
    });

    const pts = parseInt(points, 10) || 0;
    const remainingAfter = myPoints - pts;
    const canAfford = pts > 0 && pts <= myPoints;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div>
                <h1 className="text-3xl font-syne font-extrabold text-[#e8eaf6]">Give Recognition</h1>
                <p className="text-gray-500 text-sm mt-1">Spend your own points to recognise a colleague's great work.</p>
            </div>

            {successMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#43e97b]/10 border border-[#43e97b]/30 text-[#43e97b] text-sm font-bold">
                    <i className="fa-solid fa-circle-check"></i>{successMsg}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ff6584]/10 border border-[#ff6584]/30 text-[#ff6584] text-sm">
                    <i className="fa-solid fa-circle-exclamation"></i>{error}
                    <button onClick={() => setError('')} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Info + balance */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-4 rounded-xl bg-[#6c63ff]/5 border border-[#6c63ff]/20 flex gap-3 text-xs text-gray-400">
                    <i className="fa-solid fa-circle-info text-[#6c63ff] flex-shrink-0 mt-0.5"></i>
                    <div className="leading-relaxed">
                        <span className="text-[#e8eaf6] font-bold">Fair recognition: </span>
                        Points are deducted from <span className="text-[#ff6584] font-bold">your</span> balance and given to your colleague.
                        This keeps recognition meaningful — you're genuinely sharing your own earned points.
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/30 flex-shrink-0">
                    <i className="fa-solid fa-coins text-[#6c63ff] text-lg"></i>
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Your Balance</div>
                        <div className="text-xl font-syne font-bold text-[#e8eaf6] leading-tight">
                            {loading ? '…' : myPoints.toLocaleString()} pts
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* Colleague picker */}
                <div className="glass-panel overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#1f2540]">
                        <h3 className="font-syne font-bold text-[#e8eaf6] text-sm">Select Colleague</h3>
                    </div>
                    <div className="p-4">
                        <div className="relative mb-3">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or department…"
                                className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl py-2 pl-9 pr-4 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none" />
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
                            {loading ? (
                                [...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[#1f2540] rounded-xl animate-pulse" />)
                            ) : filtered.length === 0 ? (
                                <div className="py-8 text-center text-gray-600 text-sm">
                                    <i className="fa-solid fa-users-slash text-2xl mb-2 block opacity-30"></i>No colleagues found
                                </div>
                            ) : filtered.map(emp => (
                                <button key={emp.id} type="button" onClick={() => { setSelected(emp); setError(''); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${selected?.id === emp.id ? 'bg-[#6c63ff]/15 border border-[#6c63ff]/40' : 'hover:bg-[#171b2e] border border-transparent'}`}>
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {initials(emp.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold truncate ${selected?.id === emp.id ? 'text-[#6c63ff]' : 'text-[#e8eaf6]'}`}>{emp.name}</div>
                                        <div className="text-[10px] text-gray-500 truncate">{emp.department ?? 'No department'}</div>
                                    </div>
                                    {selected?.id === emp.id && <i className="fa-solid fa-circle-check text-[#6c63ff] flex-shrink-0"></i>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recognition form */}
                <form onSubmit={handleSend} className="glass-panel p-6 space-y-5">

                    {/* Selected person */}
                    {selected ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/30">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {initials(selected.name)}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#e8eaf6]">{selected.name}</div>
                                <div className="text-[10px] text-gray-500">{selected.department ?? 'No department'}</div>
                            </div>
                            <button type="button" onClick={() => setSelected(null)} className="ml-auto text-gray-500 hover:text-[#ff6584] transition-colors text-xs">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-[#171b2e] border border-dashed border-[#1f2540] text-center text-gray-600 text-xs">
                            ← Select a colleague first
                        </div>
                    )}

                    {/* Point amount */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Point Amount</label>
                            {pts > 0 && (
                                <span className={`text-[10px] font-bold ${canAfford ? 'text-[#43e97b]' : 'text-[#ff6584]'}`}>
                                    {canAfford ? `After: ${remainingAfter.toLocaleString()} pts left` : `Not enough pts (have ${myPoints})`}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {POINT_OPTIONS.map(p => {
                                const affordable = myPoints >= p;
                                return (
                                    <button key={p} type="button"
                                        onClick={() => { if (affordable) { setPoints(String(p)); setError(''); } else { setError(`You only have ${myPoints} pts`); } }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${points === String(p)
                                            ? 'bg-[#6c63ff] text-white shadow-lg shadow-[#6c63ff]/20'
                                            : affordable
                                                ? 'bg-[#171b2e] text-gray-400 border border-[#1f2540] hover:text-white hover:border-[#6c63ff]/50'
                                                : 'bg-[#171b2e] text-gray-700 border border-[#1f2540] cursor-not-allowed opacity-40'
                                            }`}>
                                        {p} pts
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2">
                            <input type="number" min={1} max={myPoints} value={points}
                                onChange={e => { setPoints(e.target.value); setError(''); }}
                                placeholder={`Custom amount (max ${myPoints} pts)`}
                                className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-2.5 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none transition-all" />
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recognition Message</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {QUICK_MESSAGES.map(m => (
                                <button key={m} type="button" onClick={() => setMessage(m)}
                                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#171b2e] border border-[#1f2540] text-gray-400 hover:text-[#6c63ff] hover:border-[#6c63ff]/30 transition-all">
                                    {m}
                                </button>
                            ))}
                        </div>
                        <textarea value={message} onChange={e => { setMessage(e.target.value); setError(''); }}
                            placeholder="Write a personal message of appreciation…"
                            rows={4} maxLength={300}
                            className="w-full bg-[#0a0c14] border border-[#1f2540] rounded-xl px-4 py-3 text-sm text-[#e8eaf6] focus:border-[#6c63ff] outline-none resize-none transition-all" />
                        <div className="text-right text-[10px] text-gray-600 mt-1">{message.length}/300</div>
                    </div>

                    <button type="submit" disabled={sending || !selected || !canAfford || !message.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#ff6584] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#6c63ff]/20 hover:scale-[1.01]">
                        {sending ? (
                            <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                        ) : (
                            <><i className="fa-solid fa-paper-plane"></i>Send {pts > 0 ? `${pts} pts` : ''} Recognition</>
                        )}
                    </button>

                    {myPoints < 5 && (
                        <p className="text-[10px] text-center text-gray-600">
                            Complete KPIs to earn more points before giving recognition.
                        </p>
                    )}
                </form>
            </div>

            {/* Session history */}
            {history.length > 0 && (
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f2540]">
                        <h3 className="font-syne font-bold text-[#e8eaf6] text-sm">Sent This Session</h3>
                    </div>
                    <div className="divide-y divide-[#1f2540]">
                        {history.map((h, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#ff6584] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {initials(h.receiverName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-[#e8eaf6]">{h.receiverName}</div>
                                    <div className="text-xs text-gray-500 truncate">{h.message}</div>
                                </div>
                                <span className="text-sm font-syne font-bold text-[#ff6584] flex-shrink-0">−{h.points} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};