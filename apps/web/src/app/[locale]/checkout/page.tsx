"use client";

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CheckoutForm from '../../../components/checkout/CheckoutForm';

export default function CheckoutPage() {
    const t = useTranslations('Checkout');
    const searchParams = useSearchParams();

    // Default to 'basic' plan if not specified
    const initialPlan = searchParams.get('plan') || 'basic';

    // Plan details (simplified for demo)
    const plans = {
        basic: { price: 4000, currency: 'XAF', label: 'Basic' },
        pro: { price: 11000, currency: 'XAF', label: 'Pro' },
        plus: { price: 23000, currency: 'XAF', label: 'Plus' },
        business: { price: 40000, currency: 'XAF', label: 'Business' }
    };

    const selectedPlan = plans[initialPlan as keyof typeof plans] || plans.basic;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 py-20">
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">

                {/* Left: Plan Details */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col justify-between">
                    <div>
                        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Selected Plan</h2>
                        <h1 className="text-4xl font-bold text-white mb-4">{selectedPlan.label}</h1>
                        <div className="text-3xl text-[#25D366] font-bold mb-6">
                            {selectedPlan.price.toLocaleString()} {selectedPlan.currency}
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            You are about to subscribe to the {selectedPlan.label} plan.
                            Secure payment via Flutterwave (💳 Cards + 📱 Mobile Money).
                        </p>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-800">
                        <div className="flex items-center text-sm text-gray-500">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Secure SSL Connection
                        </div>
                    </div>
                </div>

                {/* Right: Payment Form */}
                <CheckoutForm plan={selectedPlan} />
            </div>
        </div>
    );
}
