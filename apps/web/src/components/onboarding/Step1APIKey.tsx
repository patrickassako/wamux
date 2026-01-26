"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface Step1Props {
    onComplete: (apiKey: string) => void;
}

export default function Step1APIKey({ onComplete }: Step1Props) {
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const supabase = createClient();

    const createAPIKey = async () => {
        setLoading(true);
        setError("");

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError("Please login first");
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/keys`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "Onboarding Key",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to create API key");
            }

            const data = await response.json();
            // API returns apiKey in camelCase format
            const keyValue = data.apiKey || data.api_key || data.key;
            if (keyValue) {
                setApiKey(keyValue);
                // Store the key in localStorage for display in dashboard
                localStorage.setItem('whatsapp_api_key', keyValue);
                localStorage.setItem('whatsapp_api_key_id', data.id);
            } else {
                console.log("API Response:", data);
                setError("API key created but could not retrieve the key value");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-[#25D366]/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">Create API Key</h2>
                    <p className="text-gray-400 text-sm">Generate your first API key to authenticate requests</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {!apiKey ? (
                <button
                    onClick={createAPIKey}
                    disabled={loading}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                >
                    {loading ? "Creating..." : "Generate API Key"}
                </button>
            ) : (
                <div>
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Your API Key</span>
                            <button
                                onClick={copyToClipboard}
                                className="text-[#25D366] text-sm hover:underline"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <code className="text-green-400 text-sm break-all">{apiKey}</code>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4">
                        <p className="text-yellow-400 text-sm">
                            ⚠️ Save this key securely! You won&apos;t be able to see it again.
                        </p>
                    </div>

                    <button
                        onClick={() => onComplete(apiKey)}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-lg font-semibold transition"
                    >
                        Continue to Connect WhatsApp
                    </button>
                </div>
            )}
        </div>
    );
}
