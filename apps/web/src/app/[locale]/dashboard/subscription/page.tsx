"use client";

import Link from "next/link";

export default function SubscriptionPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Subscription</h1>
                <p className="text-gray-400">Manage your billing and subscription</p>
            </div>

            {/* Current Plan */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <span className="text-gray-400 text-sm">Current Plan</span>
                        <h2 className="text-2xl font-bold text-white">Free Trial</h2>
                    </div>
                    <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                        7 days remaining
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center py-4 border-t border-gray-800">
                    <div>
                        <p className="text-gray-400 text-sm">Sessions</p>
                        <p className="text-white text-xl font-bold">1 / 1</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Messages/min</p>
                        <p className="text-white text-xl font-bold">1</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Support</p>
                        <p className="text-white text-xl font-bold">Community</p>
                    </div>
                </div>
            </div>

            {/* Upgrade Plans */}
            <h3 className="text-white font-semibold mb-4">Upgrade your plan</h3>
            <div className="grid grid-cols-2 gap-6">
                {/* Pro Plan */}
                <div className="bg-[#111] border border-[#25D366] rounded-xl p-6 relative">
                    <span className="absolute -top-3 left-6 bg-[#25D366] text-white px-3 py-1 rounded-full text-xs font-medium">
                        Recommended
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                    <p className="text-gray-400 text-sm mb-4">For growing businesses</p>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-white">$29</span>
                        <span className="text-gray-400">/month</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                        {[
                            "5 WhatsApp sessions",
                            "100 messages per minute",
                            "Webhooks support",
                            "Priority email support",
                            "API analytics",
                        ].map((feature) => (
                            <li key={feature} className="flex items-center space-x-2 text-gray-300">
                                <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-lg font-medium transition">
                        Upgrade to Pro
                    </button>
                </div>

                {/* Enterprise Plan */}
                <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                    <p className="text-gray-400 text-sm mb-4">For large organizations</p>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-white">Custom</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                        {[
                            "Unlimited sessions",
                            "Unlimited messages",
                            "Custom SLA",
                            "Dedicated support",
                            "Custom integrations",
                            "On-premise option",
                        ].map((feature) => (
                            <li key={feature} className="flex items-center space-x-2 text-gray-300">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <button className="w-full border border-gray-700 hover:border-gray-600 text-white py-3 rounded-lg font-medium transition">
                        Contact Sales
                    </button>
                </div>
            </div>
        </div>
    );
}
