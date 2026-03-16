import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";

interface LoginForm {
    email: string;
    password: string;
}

// ─── Response shapes ──────────────────────────────────────────────────────────
//
// Your backend sendSuccess() wraps everything like this:
//   { success: true, message: string, data: T }
//
// Your api.ts interceptor does (response) => response.data
// which strips the Axios envelope, giving you the raw JSON body.
//
// So after api.post('/auth/login') resolves, the value is:
//   { success: true, message: '...', data: { token, employee } }
//
// That means payload.data.token and payload.data.employee — NOT payload.token.

interface LoginEmployee {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "EMPLOYEE";
    department?: string | null;
    isSuperAdmin?: boolean;
}

interface LoginResponseEnvelope {
    success: boolean;
    message: string;
    data: {
        token: string;
        employee: LoginEmployee;
    };
}

// ─────────────────────────────────────────────────────────────────────────────

export const Login: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [apiError, setApiError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>();

    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const onSubmit = async (formData: LoginForm) => {
        try {
            setApiError("");

            // api.ts interceptor strips Axios wrapper → payload is the raw JSON body:
            // { success: true, message: '...', data: { token, employee } }
            const payload = await api.post<any, LoginResponseEnvelope>(
                "/auth/login",
                formData
            );

            const token = payload?.data?.token;
            const employee = payload?.data?.employee;

            if (!token || !employee) {
                setApiError("Unexpected response from server. Please try again.");
                return;
            }

            // Persist into Zustand + localStorage (via persist middleware)
            setAuth(employee, token);

            // RBAC redirect
            if (employee.role === "ADMIN") {
                navigate("/admin/dashboard", { replace: true });
            } else {
                navigate("/employee/dashboard", { replace: true });
            }
        } catch (err: any) {
            // Backend sendError() returns { success: false, error: '...', code: N }
            // api.ts interceptor re-rejects on non-2xx, so err.response.data is
            // already the unwrapped JSON body from the interceptor... except for
            // error responses — Axios does NOT call the success interceptor for
            // error responses, so err.response.data is the raw body here.
            const message =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                "Invalid credentials. Please try again.";
            setApiError(message);
        }
    };

    return (
        <Card className="w-full shadow-2xl shadow-black/50 border-white/10 backdrop-blur-2xl bg-[#0a0a0f]/80">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>

            {apiError && (
                <div className="mb-4 p-3 rounded-lg bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-sm text-center font-medium">
                    {apiError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email Address
                    </label>
                    <Input
                        type="email"
                        placeholder="you@company.com"
                        {...register("email", { required: "Email is required" })}
                        error={errors.email?.message}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Password
                    </label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...register("password", { required: "Password is required" })}
                            error={errors.password?.message}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-[#7c3aed] hover:bg-[#6d28d9]"
                    isLoading={isSubmitting}
                >
                    Sign In to Workspace
                </Button>

                <p className="text-center text-sm text-gray-400 mt-4">
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/register"
                        className="text-[#06b6d4] hover:underline font-medium"
                    >
                        Register
                    </Link>
                </p>
            </form>
        </Card>
    );
};