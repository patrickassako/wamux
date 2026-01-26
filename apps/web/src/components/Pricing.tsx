"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from 'next-intl';

export default function Pricing() {
    const t = useTranslations('Pricing');
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

    const plans = [
        {
            name: t('freeName'),
            id: "free",
            priceMonthly: 0,
            priceYearly: 0,
            sessions: 1,
            description: t('freeDesc'),
            features: [
                "1 Connected WhatsApp Number",
                "100 Messages / day",
                "10 Messages / min",
                "Community Support",
                "Basic Features",
            ],
            highlighted: false,
        },
        {
            name: t('basicName'),
            id: "basic",
            priceMonthly: 4,
            priceYearly: 3,
            sessions: 1,
            description: t('basicDesc'),
            features: [
                "1 Connected WhatsApp Number",
                "Unlimited Contacts",
                "No Daily Message Cap",
                "MCP Server Integration",
                "Send to Users, Groups & Channels",
                "Send Text, Images, Videos & Audio",
                "Send Documents, Contacts & Locations",
                "Full API Access",
                "Real-time Webhooks",
                "Priority Support",
            ],
            highlighted: false,
        },
        {
            name: t('proName'),
            id: "pro",
            priceMonthly: 11,
            priceYearly: 9,
            sessions: 3,
            description: t('proDesc'),
            features: [
                "3 Connected WhatsApp Numbers",
                "Unlimited Contacts",
                "No Daily Message Cap",
                "MCP Server Integration",
                "Send to Users, Groups & Channels",
                "Send Text, Images, Videos & Audio",
                "Send Documents, Contacts & Locations",
                "Full API Access",
                "Real-time Webhooks",
                "Priority Support",
            ],
            highlighted: true,
        },
        {
            name: t('plusName'),
            id: "plus",
            priceMonthly: 23,
            priceYearly: 20,
            sessions: 6,
            description: t('plusDesc'),
            features: [
                "6 Connected WhatsApp Numbers",
                "Unlimited Contacts",
                "No Daily Message Cap",
                "MCP Server Integration",
                "Send to Users, Groups & Channels",
                "Send Text, Images, Videos & Audio",
                "Send Documents, Contacts & Locations",
                "Full API Access",
                "Real-time Webhooks",
                "Priority Support",
            ],
            highlighted: false,
        },
        {
            name: t('businessName'),
            id: "business",
            priceMonthly: 40,
            priceYearly: 35,
            sessions: 10,
            description: t('businessDesc'),
            features: [
                "10 Connected WhatsApp Numbers",
                "Unlimited Contacts",
                "No Daily Message Cap",
                "MCP Server Integration",
                "Send to Users, Groups & Channels",
                "Send Text, Images, Videos & Audio",
                "Send Documents, Contacts & Locations",
                "Full API Access",
                "Real-time Webhooks",
                "Priority Support",
            ],
            highlighted: false,
        },
    ];

    const getPrice = (plan: typeof plans[0]) => {
        return billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly;
    };

    const getYearlyTotal = (plan: typeof plans[0]) => {
        return plan.priceYearly * 12;
    };

    return (
        <section id="pricing" className="py-24 px-4 bg-gray-900/50">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">
                        {t('title')}
                    </h2>
                    <p className="text-xl text-gray-400 mb-8">
                        {t('subtitle')}
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center">
                        <div className="bg-gray-800 rounded-xl p-1 flex">
                            <button
                                onClick={() => setBillingPeriod("monthly")}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === "monthly"
                                    ? "bg-[#25D366] text-white"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                {t('monthly')}
                            </button>
                            <button
                                onClick={() => setBillingPeriod("yearly")}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === "yearly"
                                    ? "bg-[#25D366] text-white"
                                    : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                {t('yearly')} <span className="text-xs opacity-75">({t('save')})</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl p-6 card-hover ${plan.highlighted
                                ? "bg-gradient-to-b from-[#25D366]/20 to-gray-900 border-2 border-[#25D366]"
                                : "bg-gray-900 border border-gray-800"
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-[#25D366] text-white text-xs font-semibold px-4 py-1 rounded-full">
                                        {t('mostPopular')}
                                    </span>
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                <p className="text-gray-500 text-sm">
                                    {t('sessions', { count: plan.sessions, s: plan.sessions > 1 ? "s" : "" })}
                                </p>
                            </div>

                            {/* Price */}
                            <div className="mb-2">
                                <span className="text-4xl font-bold">${getPrice(plan)}</span>
                                <span className="text-gray-400">{t('perMonth')}</span>
                                {billingPeriod === "yearly" && (
                                    <span className="text-gray-600 text-sm ml-2 line-through">${plan.priceMonthly}</span>
                                )}
                            </div>

                            {billingPeriod === "yearly" && (
                                <p className="text-gray-500 text-sm mb-4">
                                    {t('billedYearly', { price: `$${getYearlyTotal(plan)}` })}
                                </p>
                            )}

                            <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                            {/* Features */}
                            <ul className="space-y-3 mb-6">
                                {plan.features.slice(0, 5).map((feature, index) => (
                                    <li key={index} className="flex items-start text-sm">
                                        <svg className="w-4 h-4 text-[#25D366] mr-2 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-gray-300">{feature}</span>
                                    </li>
                                ))}
                                <li className="text-gray-500 text-xs">+ 5 more features</li>
                            </ul>

                            {/* CTA */}
                            <Link
                                href={`/register?plan=${plan.id}`}
                                className={`block w-full text-center py-3 rounded-xl font-semibold transition ${plan.highlighted
                                    ? "bg-[#25D366] hover:bg-[#20bd5a] text-white"
                                    : "border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                                    }`}
                            >
                                {t('getStarted')}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    {t('included')}
                </p>
            </div>
        </section>
    );
}
