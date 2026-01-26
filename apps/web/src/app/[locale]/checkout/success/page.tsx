"use client";

import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function CheckoutSuccessPage() {
    const t = useTranslations('Checkout');

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-lg">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">{t('successTitle')}</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    {t('successDesc')}
                </p>

                <div className="space-y-4">
                    <Link
                        href="/dashboard"
                        className="block w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-semibold transition"
                    >
                        {t('goToDashboard')}
                    </Link>
                    {/* Placeholder for future receipt implementation */}
                    {/* 
                    <button className="block w-full border border-gray-700 hover:border-gray-500 text-gray-300 py-3 rounded-xl font-medium transition">
                        {t('viewReceipt')}
                    </button> 
                    */}
                </div>
            </div>
        </div>
    );
}
