"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

interface Step2Props {
    apiKey: string;
    onComplete: (sessionId: string) => void;
    onBack: () => void;
}

export default function Step2QRSession({ apiKey, onComplete, onBack }: Step2Props) {
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [status, setStatus] = useState<"idle" | "connecting" | "waiting_qr" | "connected" | "error">("idle");
    const [error, setError] = useState("");
    const abortControllerRef = useRef<AbortController | null>(null);
    const supabase = createClient();

    const startSession = async () => {
        setLoading(true);
        setError("");
        setStatus("connecting");

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError("Please login first");
                setStatus("error");
                return;
            }

            // Create a new WhatsApp session
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    session_key: `onboarding-${Date.now()}`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to create session");
            }

            const data = await response.json();
            const newSessionId = data.id || data.sessionId;
            setSessionId(newSessionId);
            setStatus("waiting_qr");

            // Connect to SSE stream for QR code using fetch (supports auth headers)
            connectToSSE(newSessionId, session.access_token);
        } catch (err: any) {
            setError(err.message);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    };

    const connectToSSE = async (sessionId: string, token: string) => {
        // Close existing connection
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const streamUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}/stream`;

        try {
            const response = await fetch(streamUrl, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "text/event-stream",
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`SSE connection failed: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response body");
            }

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data:")) {
                        try {
                            const jsonStr = line.slice(5).trim();
                            if (jsonStr) {
                                const data = JSON.parse(jsonStr);

                                // Handle QR code event
                                if (data.qrData || data.qr_data) {
                                    setQrCode(data.qrData || data.qr_data);
                                    setStatus("waiting_qr");
                                }
                            }
                        } catch {
                            // Not valid JSON, skip
                        }
                    } else if (line.startsWith("event:")) {
                        const eventType = line.slice(6).trim();
                        if (eventType === "connected") {
                            setStatus("connected");
                            reader.cancel();
                            setTimeout(() => onComplete(sessionId), 1500);
                            return;
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.log("SSE connection error:", err.message);
                // Retry after 2 seconds
                setTimeout(() => {
                    if (status === "waiting_qr") {
                        connectToSSE(sessionId, token);
                    }
                }, 2000);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return (
        <div>
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">Connect WhatsApp</h2>
                    <p className="text-gray-400 text-sm">Scan the QR code with your WhatsApp app</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {status === "idle" && (
                <button
                    onClick={startSession}
                    disabled={loading}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
                >
                    {loading ? "Creating session..." : "Start WhatsApp Connection"}
                </button>
            )}

            {status === "connecting" && (
                <div className="text-center py-8">
                    <div className="animate-spin w-12 h-12 border-4 border-[#25D366] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Preparing QR code...</p>
                </div>
            )}

            {status === "waiting_qr" && (
                <div className="text-center">
                    {qrCode ? (
                        <div className="bg-white p-4 rounded-xl inline-block mb-4">
                            <img
                                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                                alt="WhatsApp QR Code"
                                className="w-64 h-64"
                            />
                        </div>
                    ) : (
                        <div className="w-64 h-64 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <div className="animate-pulse text-gray-500">Loading QR...</div>
                        </div>
                    )}
                    <p className="text-gray-400 text-sm mb-4">
                        Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                    </p>
                </div>
            )}

            {status === "connected" && (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-[#25D366]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold">WhatsApp Connected!</p>
                    <p className="text-gray-400 text-sm">Moving to next step...</p>
                </div>
            )}

            <div className="flex justify-between mt-6">
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white transition"
                >
                    ← Back
                </button>
                {status === "waiting_qr" && (
                    <button
                        onClick={startSession}
                        className="text-[#25D366] hover:underline text-sm"
                    >
                        Generate new QR
                    </button>
                )}
            </div>
        </div>
    );
}
