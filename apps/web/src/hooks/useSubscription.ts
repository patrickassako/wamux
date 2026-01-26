import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Subscription {
    id: string;
    plan: string;
    status: string;
    sessionsLimit: number;
    messageLimit: number;
    messagesUsed: number;
    rateLimitPerMinute: number;
    currentPeriodEnd?: string;
}

interface Usage {
    messagesUsed: number;
    messageLimit: number;
    usagePercent: number;
    remaining: number;
}

interface Plan {
    name: string;
    sessionsLimit: number;
    messageLimit: number;
    rateLimitPerMinute: number;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
}

export function useSubscription() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize Supabase client
    const supabase = createClient();

    const getAuthHeader = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
    };

    const fetchPlans = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const response = await fetch(`${apiUrl}/api/v1/billing/plans`);
            if (!response.ok) throw new Error('Failed to fetch available plans');
            const data = await response.json();
            setPlans(data);
        } catch (err: any) {
            console.error('Error fetching plans:', err);
            setError(err.message);
        }
    };

    const fetchSubscription = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const headers = await getAuthHeader(); // Get fresh token

            const response = await fetch(`${apiUrl}/api/v1/billing/subscription`, {
                headers: headers
            });

            if (response.status === 404) {
                setSubscription(null);
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch subscription details');
            const data = await response.json();
            setSubscription(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const fetchUsage = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const headers = await getAuthHeader(); // Get fresh token

            const response = await fetch(`${apiUrl}/api/v1/billing/usage`, {
                headers: headers
            });

            if (response.status === 404) {
                setUsage(null);
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch usage statistics');
            const data = await response.json();
            setUsage(data);
        } catch (err: any) {
            console.error('Error fetching usage:', err);
        }
    };

    const upgradePlan = async (planId: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const headers = await getAuthHeader(); // Get fresh token

            const response = await fetch(`${apiUrl}/api/v1/billing/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({
                    plan: planId,
                    successUrl: window.location.href + '?success=true',
                    cancelUrl: window.location.href + '?canceled=true'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create checkout session');
            }

            const data = await response.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const downgradeToFree = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const headers = await getAuthHeader(); // Get fresh token

            const response = await fetch(`${apiUrl}/api/v1/billing/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({ plan: 'free' })
            });

            if (!response.ok) throw new Error('Failed to downgrade plan');

            const data = await response.json();
            setSubscription(data);
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchSubscription(), fetchUsage(), fetchPlans()]);
            setLoading(false);
        };
        init();
    }, []);

    return {
        subscription,
        usage,
        plans,
        loading,
        error,
        upgradePlan,
        downgradeToFree,
        refresh: () => Promise.all([fetchSubscription(), fetchUsage(), fetchPlans()])
    };
}
