import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../pages/auth/Login';

describe('Login Component', () => {
    it('renders login form properly', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In to Workspace/i })).toBeInTheDocument();
    });

    it('displays validation errors when submitting empty form', async () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        const loginBtn = screen.getByRole('button', { name: /Sign In to Workspace/i });
        fireEvent.click(loginBtn);

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Password is required')).toBeInTheDocument();
        });
    });

    it('toggles password visibility', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        const passwordInput = screen.getByPlaceholderText('••••••••');
        expect(passwordInput).toHaveAttribute('type', 'password');

        const toggleButton = screen.getByRole('button', { name: '' });
        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });
});
