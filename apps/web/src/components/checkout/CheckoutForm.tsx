
"use client";

import { useState } from 'react';
import { usePayment } from '../../hooks/usePayment';

interface CheckoutFormProps {
    plan: {
        price: number;
        currency: string;
        label: string;
    };
}

export default function CheckoutForm({ plan }: CheckoutFormProps) {
    const { initiatePayment, loading, error: hookError } = usePayment();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await initiatePayment({
            amount: plan.price,
            currency: plan.currency,
            description: `Subscription - ${plan.label} Plan`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            lang: 'fr'
        });

        if (result.success && result.paymentUrl) {
            window.location.href = result.paymentUrl;
        }
    };

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Checkout</h2>

            {hookError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
                    {hookError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                    <input
                        type="email"
                        required
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        required
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition"
                        placeholder="+237 6..."
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl mt-4 transition flex items-center justify-center"
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        "Proceed to Payment"
                    )}
                </button>
            </form>
        </div>
    );
}
