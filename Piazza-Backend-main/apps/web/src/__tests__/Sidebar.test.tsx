import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';
import { useAuthStore } from '../store/authStore';

// Mock Zustand Store
vi.mock('../store/authStore', () => ({
    useAuthStore: vi.fn(),
}));

describe('Sidebar Navigation', () => {
    it('renders employee links for employee role', () => {
        (useAuthStore as any).mockImplementation((selector: any) =>
            selector({ user: { role: 'EMPLOYEE', name: 'John Doe', avatarUrl: '' } })
        );

        render(
            <BrowserRouter>
                <Sidebar isOpen={true} onClose={() => { }} />
            </BrowserRouter>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My KPIs')).toBeInTheDocument();
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
        expect(screen.queryByText('KPIs')).not.toBeInTheDocument(); // Admin link should not exist
    });

    it('renders admin links for admin role', () => {
        (useAuthStore as any).mockImplementation((selector: any) =>
            selector({ user: { role: 'ADMIN', name: 'Admin User', avatarUrl: '' } })
        );

        render(
            <BrowserRouter>
                <Sidebar isOpen={true} onClose={() => { }} />
            </BrowserRouter>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('KPIs')).toBeInTheDocument();
        expect(screen.getByText('Employees')).toBeInTheDocument();
        expect(screen.queryByText('My KPIs')).not.toBeInTheDocument(); // Employee link should not exist
    });
});
