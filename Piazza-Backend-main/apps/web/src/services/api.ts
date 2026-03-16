import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attaches the JWT to every outgoing request.
// Falls back to localStorage directly if Zustand hasn't hydrated yet.
api.interceptors.request.use(
    (config) => {
        let token = useAuthStore.getState().token;

        if (!token) {
            try {
                const persisted = localStorage.getItem("piazza-auth");
                if (persisted) {
                    const parsed = JSON.parse(persisted);
                    token = parsed?.state?.token ?? null;
                }
            } catch {
                // malformed localStorage — ignore
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────────
// SUCCESS  → returns response.data so callers get the unwrapped body directly.
//            e.g. api.post('/auth/login') resolves to { token, employee }
//            NOT the full Axios response object.
//
// ERROR    → 401 clears auth and redirects to /login.
//            All other errors are re-rejected so callers can catch them.
api.interceptors.response.use(
    (response) => response.data,           // ← unwrap once here, NEVER again in callers
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().clearAuth();
            localStorage.removeItem("piazza-auth");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);