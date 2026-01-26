"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useTranslations } from 'next-intl';
import LanguageSelector from "./LanguageSelector";

export default function Header() {
    const t = useTranslations('Header');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAuthenticated(!!session);
        } catch (error) {
            console.error("Auth check failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                            <img
                                src="/logo-icon.jpg"
                                alt="Wamux Logo"
                                className="w-8 h-8 rounded-lg object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold">Wamux</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#features" className="text-gray-400 hover:text-white transition">{t('features')}</a>
                        <a href="#pricing" className="text-gray-400 hover:text-white transition">{t('pricing')}</a>
                        <a href="/docs" className="text-gray-400 hover:text-white transition">{t('docs')}</a>
                    </nav>

                    {/* Auth Buttons */}
                    <div className="flex items-center space-x-4">
                        <LanguageSelector />

                        {loading ? (
                            <div className="w-20 h-8 bg-gray-800 animate-pulse rounded-lg"></div>
                        ) : isAuthenticated ? (
                            <Link
                                href="/dashboard"
                                className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-lg font-medium transition"
                            >
                                {t('dashboard')}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-gray-300 hover:text-white transition hidden sm:block"
                                >
                                    {t('login')}
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-lg font-medium transition"
                                >
                                    {t('getStarted')}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
