
import { useState } from 'react';

interface PaymentInfo {
    amount: number;
    currency: string;
    description: string;
    email: string;
    name: string;
    phone: string;
    lang?: string;
}

interface PaymentResult {
    success: boolean;
    paymentUrl?: string;
    error?: string;
}

export function usePayment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initiatePayment = async (info: PaymentInfo): Promise<PaymentResult> => {
        setLoading(true);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            if (!apiUrl) {
                throw new Error('API URL is not configured');
            }

            // Generate a temporary unique reference for the app side
            // In a real app, this might come from your database after creating an order
            const ref = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const response = await fetch(`${apiUrl}/api/v1/payment/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionAmount: info.amount,
                    transactionCurrency: info.currency,
                    transactionReason: info.description,
                    appTransactionRef: ref,
                    customerName: info.name,
                    customerPhoneNumber: info.phone,
                    customerEmail: info.email,
                    customerLang: info.lang || 'fr'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Payment initialization failed');
            }

            const data = await response.json();

            if (data.payment_url) {
                return { success: true, paymentUrl: data.payment_url };
            } else {
                throw new Error('No payment URL received from server');
            }

        } catch (err: any) {
            const message = err.message || 'An unexpected error occurred';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    return { initiatePayment, loading, error };
}
