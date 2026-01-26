"use client";

import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function CheckoutErrorPage() {
    const t = useTranslations('Checkout');

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-lg">
                <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">{t('errorTitle')}</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    {t('errorDesc')}
                </p>

                <div className="space-y-4">
                    <Link
                        href="/contact"
                        className="block w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-semibold transition"
                    >
                        {t('contactSupport')}
                    </Link>
                    <Link
                        href="/"
                        className="block w-full border border-gray-700 hover:border-gray-500 text-gray-300 py-3 rounded-xl font-medium transition"
                    >
                        {t('backToHome')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
