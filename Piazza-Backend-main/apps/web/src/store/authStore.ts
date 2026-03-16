import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "ADMIN" | "EMPLOYEE";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string | null;
    avatarUrl?: string | null;
    isSuperAdmin?: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    _hasHydrated: boolean;

    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;
    setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            _hasHydrated: false,

            setAuth: (user, token) => set({ user, token }),

            clearAuth: () => set({ user: null, token: null }),

            // Called automatically by onRehydrateStorage once localStorage is read.
            // ProtectedRoute blocks rendering until this is true to avoid
            // a flash-redirect on page refresh when the token is valid.
            setHasHydrated: (value) => set({ _hasHydrated: value }),
        }),
        {
            name: "piazza-auth",

            // Only persist the fields that should survive a page refresh.
            // _hasHydrated must NOT be persisted — it must always start false
            // and be set to true by onRehydrateStorage on each load.
            partialize: (state) => ({
                user: state.user,
                token: state.token,
            }),

            onRehydrateStorage: () => (state) => {
                // Fires after Zustand finishes reading from localStorage.
                // Flipping _hasHydrated to true unblocks ProtectedRoute.
                state?.setHasHydrated(true);
            },
        }
    )
);