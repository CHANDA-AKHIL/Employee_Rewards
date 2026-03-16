import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, setAuth, token } = useAuthStore();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        if (!user || !token) return;
        setLoading(true);
        setError('');
        setSuccess(false);
        try {
            await api.put(`/employees/${user.id}`, { name });
            setAuth({ ...user, name }, token);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Account Settings">
            <div className="space-y-4">
                {error && <div className="text-red-400 text-sm bg-red-400/10 p-2 rounded">{error}</div>}
                {success && <div className="text-green-400 text-sm bg-green-400/10 p-2 rounded">Profile updated successfully!</div>}

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email <span className="text-xs text-gray-500">(Cannot be changed)</span></label>
                    <Input value={user.email} disabled className="opacity-60 cursor-not-allowed" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Type / Role</label>
                    <Input value={user.role} disabled className="opacity-60 cursor-not-allowed font-semibold text-[#06b6d4]" />
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={loading} className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
