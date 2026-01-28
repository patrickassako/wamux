"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Plan {
    name: string;
    sessionsLimit: number;
    messageLimit: number;
    rateLimitPerMinute: number;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
}

interface Subscription {
    id: string;
    plan: string;
    status: string;
    messageLimit: number;
    messagesUsed: number;
    rateLimitPerMinute: number;
    currentPeriodEnd: string | null;
}

interface Usage {
    messagesUsed: number;
    messageLimit: number;
    usagePercent: number;
    remaining: number;
}

export default function BillingPage() {
    const searchParams = useSearchParams();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // Check for payment success and verify
        const paymentStatus = searchParams.get("payment");
        const transactionId = searchParams.get("transaction_id");

        if (paymentStatus === "success" && transactionId) {
            verifyPayment(transactionId);
        } else {
            loadBillingData();
        }
    }, [searchParams]);

    const verifyPayment = async (transactionId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/verify-payment`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ transaction_id: transactionId }),
            });

            if (response.ok) {
                setShowSuccessAlert(true);
                // Reload billing data after successful verification
                await loadBillingData();
            } else {
                const error = await response.json();
                console.error("Payment verification failed:", error);
            }
        } catch (error) {
            console.error("Error verifying payment:", error);
        }
    };

    const loadBillingData = async () => {
        const timeoutId = setTimeout(() => {
            console.error("Billing load timed out");
            setLoading(false);
        }, 8000);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                clearTimeout(timeoutId);
                return;
            }

            const headers = { "Authorization": `Bearer ${session.access_token}` };

            try {
                const plansRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/plans`, { headers });
                if (plansRes.ok) setPlans(await plansRes.json());
            } catch (e) {
                console.error("Failed to load plans:", e);
            }

            try {
                const subRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/subscription`, { headers });
                if (subRes.ok) setSubscription(await subRes.json());
            } catch (e) {
                console.error("Failed to load subscription:", e);
            }

            try {
                const usageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/usage`, { headers });
                if (usageRes.ok) setUsage(await usageRes.json());
            } catch (e) {
                console.error("Failed to load usage:", e);
            }
        } catch (error) {
            console.error("Failed to load billing data:", error);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const handleUpgrade = async (planName: string) => {
        setUpgrading(planName);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/checkout`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ plan: planName, billingPeriod }),
            });

            if (response.ok) {
                const data = await response.json();
                window.location.href = data.checkoutUrl;
            } else {
                alert("Failed to create checkout session");
            }
        } catch (error) {
            console.error("Failed to upgrade:", error);
        } finally {
            setUpgrading(null);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/portal`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                window.location.href = data.portalUrl;
            }
        } catch (error) {
            console.error("Failed to open portal:", error);
        }
    };

    const getPrice = (plan: Plan) => {
        return billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly;
    };

    const getYearlyTotal = (plan: Plan) => {
        return plan.priceYearly * 12;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">Billing & Subscription</h1>
            <p className="text-gray-400 mb-8">Choose the plan that fits your needs</p>

            {/* Success Alert */}
            {showSuccessAlert && (
                <div className="bg-[#25D366]/10 border border-[#25D366] rounded-xl p-4 mb-6 flex items-start">
                    <svg className="w-5 h-5 text-[#25D366] mr-3 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <h3 className="text-[#25D366] font-semibold">Payment Successful!</h3>
                        <p className="text-gray-300 text-sm mt-1">Your subscription has been activated. It may take a few minutes to reflect.</p>
                    </div>
                    <button
                        onClick={() => setShowSuccessAlert(false)}
                        className="ml-auto text-gray-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Current Plan Card */}
            {subscription && (
                <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Current Plan</p>
                            <h2 className="text-2xl font-bold text-white capitalize">{subscription.plan}</h2>
                            <p className="text-gray-500 text-sm mt-1">
                                Status: <span className={subscription.status === "active" ? "text-[#25D366]" : "text-yellow-500"}>{subscription.status}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleManageSubscription}
                            className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                        >
                            Manage Subscription
                        </button>
                    </div>
                </div>
            )}

            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center mb-8">
                <div className="bg-[#111] border border-gray-800 rounded-xl p-1 flex">
                    <button
                        onClick={() => setBillingPeriod("monthly")}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === "monthly"
                            ? "bg-[#25D366] text-white"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingPeriod("yearly")}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === "yearly"
                            ? "bg-[#25D366] text-white"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Yearly <span className="text-xs opacity-75">(Save 15%)</span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan, index) => (
                    <div
                        key={plan.name}
                        className={`bg-[#111] border rounded-xl p-6 relative ${subscription?.plan === plan.name
                            ? "border-[#25D366]"
                            : index === 1 ? "border-[#25D366]/50" : "border-gray-800"
                            }`}
                    >
                        {index === 1 && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span className="bg-[#25D366] text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    MOST POPULAR
                                </span>
                            </div>
                        )}

                        <h4 className="text-xl font-bold text-white capitalize">{plan.name}</h4>
                        <p className="text-gray-500 text-sm mt-1">{plan.sessionsLimit} WhatsApp Number{plan.sessionsLimit > 1 ? "s" : ""}</p>

                        <div className="mt-4 mb-2">
                            <span className="text-4xl font-bold text-white">${getPrice(plan)}</span>
                            <span className="text-gray-500">/mo</span>
                            {billingPeriod === "yearly" && (
                                <span className="text-gray-600 text-sm ml-2 line-through">${plan.priceMonthly}</span>
                            )}
                        </div>

                        {billingPeriod === "yearly" && (
                            <p className="text-gray-500 text-sm mb-4">
                                Billed ${getYearlyTotal(plan)} yearly
                            </p>
                        )}

                        <ul className="space-y-2 my-6">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start text-gray-300 text-sm">
                                    <svg className="w-4 h-4 text-[#25D366] mr-2 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        {subscription?.plan === plan.name ? (
                            <button
                                disabled
                                className="w-full py-2.5 bg-gray-800 text-gray-500 rounded-lg cursor-not-allowed"
                            >
                                Current Plan
                            </button>
                        ) : (
                            <button
                                onClick={() => handleUpgrade(plan.name)}
                                disabled={upgrading === plan.name}
                                className={`w-full py-2.5 rounded-lg transition disabled:opacity-50 ${index === 1
                                    ? "bg-[#25D366] text-white hover:bg-[#20bd5a]"
                                    : "border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                                    }`}
                            >
                                {upgrading === plan.name ? "Redirecting..." : "Subscribe"}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Features Note */}
            <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                    All plans include: Full API Access, Real-time Webhooks, MCP Server Integration, Priority Support
                </p>
            </div>
        </div>
    );
}
