"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

export default function LoginPage() {
    const t = useTranslations('Auth');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                setError(signInError.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                router.push("/dashboard");
            }
        } catch {
            setError(t('errorGeneric'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
                    {/* Assuming logo-full.png is suitable for dark background */}
                    <img
                        src="/logo-full.png"
                        alt="Wamux Logo"
                        className="h-10 w-auto object-contain"
                    />
                </Link>

                {/* Form Card */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                    <h1 className="text-2xl font-bold text-white mb-2">{t('welcomeBack')}</h1>
                    <p className="text-gray-400 mb-6">{t('signInToAccount')}</p>

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
                                placeholder={t('passwordPlaceholder')}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                        >
                            {loading ? t('signingInButton') : t('signInButton')}
                        </button>
                    </form>

                    <p className="text-center text-gray-400 mt-6">
                        {t('noAccount')}{" "}
                        <Link href="/register" className="text-[#25D366] hover:underline">
                            {t('createOne')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
