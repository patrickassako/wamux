"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
    const t = useTranslations('Auth');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (password !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError(t('passwordTooShort'));
            setLoading(false);
            return;
        }

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                setSuccess(true);
            }
        } catch {
            setError(t('errorGeneric'));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
                    <div className="w-16 h-16 bg-[#25D366]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('checkEmail')}</h2>
                    <p className="text-gray-400 mb-6">
                        {t('confirmationSent', { email })}
                    </p>
                    <Link href="/login" className="text-[#25D366] hover:underline">
                        {t('backToLogin')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
                    <img
                        src="/logo-full.png"
                        alt="Wamux Logo"
                        className="h-10 w-auto object-contain"
                    />
                </Link>

                {/* Form Card */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                    <h1 className="text-2xl font-bold text-white mb-2">{t('createAccount')}</h1>
                    <p className="text-gray-400 mb-6">{t('startConnecting')}</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                {t('emailLabel')}
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                                placeholder={t('emailPlaceholder')}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                {t('passwordLabel')}
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                                placeholder={t('passwordMinChars')}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                {t('confirmPasswordLabel')}
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                                placeholder={t('confirmPasswordPlaceholder')}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                        >
                            {loading ? t('creatingAccountButton') : t('createAccountButton')}
                        </button>
                    </form>

                    <p className="text-center text-gray-400 mt-6">
                        {t('alreadyHaveAccount')}{" "}
                        <Link href="/login" className="text-[#25D366] hover:underline">
                            {t('signInButton')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
