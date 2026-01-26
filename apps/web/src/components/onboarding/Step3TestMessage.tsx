"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Step3Props {
    apiKey: string;
    sessionId: string;
    onBack: () => void;
}

export default function Step3TestMessage({ apiKey, sessionId, onBack }: Step3Props) {
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("Hello! This is my first message from WhatsApp API 🚀");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const sendMessage = async () => {
        if (!phone.trim()) {
            setError("Please enter a phone number");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError("Please login first");
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: phone,
                    message: message,
                    sessionId: sessionId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to send message");
            }

            setSent(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const completeOnboarding = () => {
        router.push("/dashboard");
    };

    return (
        <div>
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">Send Test Message</h2>
                    <p className="text-gray-400 text-sm">Send your first WhatsApp message via API</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {!sent ? (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                            Recipient Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+237612345678"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                        />
                        <p className="text-gray-500 text-xs mt-1">Include country code (e.g., +237 for Cameroon)</p>
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                            Message
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none"
                        />
                    </div>

                    <button
                        onClick={sendMessage}
                        disabled={loading}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                    >
                        {loading ? "Sending..." : "Send Message"}
                    </button>
                </div>
            ) : (
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-[#25D366]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                    <p className="text-gray-400 mb-6">Check your WhatsApp - your first API message is on its way!</p>

                    <button
                        onClick={completeOnboarding}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-lg font-semibold transition"
                    >
                        🎉 Complete Setup & Go to Dashboard
                    </button>
                </div>
            )}

            {!sent && (
                <div className="flex justify-between mt-6">
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white transition"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={completeOnboarding}
                        className="text-gray-400 hover:text-white text-sm"
                    >
                        Skip for now
                    </button>
                </div>
            )}
        </div>
    );
}
