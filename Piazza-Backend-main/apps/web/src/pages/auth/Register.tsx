import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';

interface RegisterForm {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export const Register: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [apiError, setApiError] = useState('');
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>();
    const navigate = useNavigate();

    const password = watch('password');

    const onSubmit = async (data: RegisterForm) => {
        try {
            setApiError('');
            await api.post('/auth/register', {
                name: data.name,
                email: data.email,
                password: data.password,
            });
            navigate('/login');
        } catch (err: any) {
            setApiError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <Card className="w-full">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>

            {apiError && (
                <div className="mb-4 p-3 rounded-lg bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-sm text-center">
                    {apiError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                    <Input
                        placeholder="John Doe"
                        {...register('name', { required: 'Name is required' })}
                        error={errors.name?.message}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <Input
                        type="email"
                        placeholder="you@company.com"
                        {...register('email', {
                            required: 'Email is required',
                            pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
                        })}
                        error={errors.email?.message}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...register('password', {
                                required: 'Password is required',
                                minLength: { value: 6, message: 'Minimum 6 characters' }
                            })}
                            error={errors.password?.message}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('confirmPassword', {
                            required: 'Please confirm password',
                            validate: value => value === password || 'Passwords do not match'
                        })}
                        error={errors.confirmPassword?.message}
                    />
                </div>

                <Button type="submit" className="w-full" isLoading={isSubmitting}>
                    Register
                </Button>

                <p className="text-center text-sm text-gray-400 mt-4">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#06b6d4] hover:underline font-medium">
                        Login
                    </Link>
                </p>
            </form>
        </Card>
    );
};
