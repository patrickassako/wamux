"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface Session {
    id: string;
    sessionKey: string;
    phoneNumber: string | null;
    status: string;
    lastActivityAt: string;
    createdAt: string;
}

type TabType = "credentials" | "test-sending" | "webhook" | "settings";

interface SessionSettings {
    alwaysOnline: boolean;
    autoReadMessages: boolean;
    rejectCalls: boolean;
    typingIndicator: boolean;
    linkPreview: boolean;
    rateLimitPerMinute: number;
}

export default function SessionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>("credentials");
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [testPhone, setTestPhone] = useState("");
    const [testMessage, setTestMessage] = useState("Hello!");
    const [sending, setSending] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [deleting, setDeleting] = useState(false);

    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<SessionSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (sessionId) {
            loadSession();
            loadApiKey();
        }
    }, [sessionId]);

    useEffect(() => {
        if (editModalOpen && session) {
            setEditName(session.sessionKey);
        }
    }, [editModalOpen, session]);

    // Helper for debounced updates or direct updates
    const updateSetting = async (key: keyof SessionSettings, value: boolean | number) => {
        if (!settings) return;

        // Optimistic update
        const oldSettings = { ...settings };
        setSettings({ ...settings, [key]: value });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}/settings`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ [key]: value }),
            });

            if (!response.ok) {
                // Revert on failure
                setSettings(oldSettings);
                console.error("Failed to update setting");
            }
        } catch (error) {
            setSettings(oldSettings);
            console.error("Failed to update setting:", error);
        }
    };

    const loadSession = async () => {
        // Safety timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            console.error("Session load timed out");
            setLoading(false);
        }, 5000);

        try {
            // Use getUser instead of getSession for better reliability
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.log("No auth user found:", error);
                // Try session fallback
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
            }

            // Get session for token
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}`, {
                headers: { "Authorization": `Bearer ${authSession.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setSession(data);
                if (data.sessionKey) setApiKey(data.sessionKey);
                loadSettings();
            } else {
                console.error("Failed to fetch session:", response.status);
                // router.push("/dashboard/sessions");
            }
        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        setSettingsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}/settings`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setSettings({
                    alwaysOnline: data.alwaysOnline ?? false,
                    autoReadMessages: data.autoReadMessages ?? false,
                    rejectCalls: data.rejectCalls ?? false,
                    typingIndicator: data.typingIndicator ?? false,
                    linkPreview: data.linkPreview ?? true,
                    rateLimitPerMinute: data.rateLimitPerMinute ?? 60,
                });
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setSettingsLoading(false);
        }
    };

    const loadApiKey = async () => {
        // First, try to get the full key from localStorage (saved during onboarding)
        const storedKey = localStorage.getItem('whatsapp_api_key');
        if (storedKey) {
            setApiKey(storedKey);
            return;
        }

        // Fallback: get only the prefix from API
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/keys`, {
                headers: { "Authorization": `Bearer ${authSession.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.keys && data.keys.length > 0) {
                    // Only show prefix if full key not in localStorage
                    setApiKey(data.keys[0].keyPrefix + "••••••••");
                }
            }
        } catch (error) {
            console.error("Failed to load API key:", error);
        }
    };

    const sendTestMessage = async () => {
        if (!testPhone.trim()) return;
        setSending(true);

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authSession.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: testPhone,
                    message: testMessage,
                    sessionId: sessionId,
                }),
            });

            if (response.ok) {
                alert("Message sent successfully!");
                setTestPhone("");
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail || "Failed to send message"}`);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleEdit = () => {
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) return;
        setSaving(true);
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${authSession.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: editName }),
            });

            if (response.ok) {
                setSession(prev => prev ? { ...prev, sessionKey: editName } : null);
                setEditModalOpen(false);
            }
        } catch (error) {
            console.error("Failed to save edit:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) return;
        setDeleting(true);
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${authSession.access_token}` },
            });

            if (response.ok) {
                router.push("/dashboard/sessions");
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        } finally {
            setDeleting(false);
        }
    };

    const regenerateApiKey = async () => {
        if (!confirm("Are you sure you want to regenerate your API key? Your old key will stop working immediately.")) return;
        setRegenerating(true);
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/keys/regenerate`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${authSession.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setApiKey(data.key);
                localStorage.setItem('whatsapp_api_key', data.key);
            }
        } catch (error) {
            console.error("Failed to regenerate API key:", error);
        } finally {
            setRegenerating(false);
        }
    };

    const handleDisconnect = async () => {
        console.log("handleDisconnect called");
        if (!confirm("Are you sure you want to disconnect this session?")) return;

        try {
            console.log("Disconnect confirmed, fetching auth session...");
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) {
                console.error("No auth session found");
                return;
            }

            console.log("Calling disconnect API...");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}/disconnect`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authSession.access_token}`,
                },
            });

            console.log("Disconnect response:", response.status);
            if (!response.ok) throw new Error("Failed to disconnect");
            await loadSession();
        } catch (error) {
            console.error("Failed to disconnect session:", error);
            alert("Failed to disconnect session");
        }
    };

    const handleRestart = async () => {
        console.log("handleRestart called");
        if (!confirm("Are you sure you want to restart this session?")) return;

        try {
            console.log("Restart confirmed, fetching auth session...");
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) {
                console.error("No auth session found");
                return;
            }

            console.log("Calling restart API...");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}/restart`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authSession.access_token}`,
                },
            });

            console.log("Restart response:", response.status);
            if (!response.ok) throw new Error("Failed to restart");
            await loadSession();
        } catch (error) {
            console.error("Failed to restart session:", error);
            alert("Failed to restart session");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Session not found</p>
                <Link href="/dashboard/sessions" className="text-[#25D366] hover:underline mt-2 inline-block">
                    Back to Sessions
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Edit Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-white font-semibold text-lg mb-4">Modifier la session</h3>
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Nom de la session</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                                autoFocus
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving || !editName.trim()}
                                className="flex-1 px-4 py-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#20bd5a] disabled:opacity-50 transition"
                            >
                                {saving ? "Enregistrement..." : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-white">{session.sessionKey}</h1>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${session.status === "connected"
                                ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                }`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </span>
                        </div>
                        <p className="text-gray-400">{session.phoneNumber || "No phone connected"}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleEdit}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-lg transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center space-x-2 text-red-400 hover:text-red-300 border border-red-400/30 px-4 py-2 rounded-lg disabled:opacity-50 transition"
                    >
                        {deleting ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                        <span>{deleting ? "Suppression..." : "Delete"}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Session Info */}
                <div className="col-span-1">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-semibold">Session Information</h2>
                            <button className="text-gray-400 hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">Details about this WhatsApp session</p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Session Name</p>
                                    <p className="text-white">{session.sessionKey}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Phone Number</p>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span className="text-white">{session.phoneNumber || "-"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Status</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${session.status === "connected"
                                        ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30"
                                        : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                        }`}>
                                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                    </span>
                                    <p className="text-gray-500 text-xs mt-1">The WhatsApp session is {session.status}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Last Active</p>
                                    <p className="text-white">{new Date(session.lastActivityAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleDisconnect}
                                className="flex-1 flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg transition"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Disconnect</span>
                            </button>
                            <button
                                onClick={handleRestart}
                                className="flex-1 flex items-center justify-center space-x-2 border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 py-2.5 rounded-lg transition"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Restart</span>
                            </button>
                        </div>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5 mt-4">
                        <h2 className="text-white font-semibold mb-4">Next Steps</h2>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <span className="w-6 h-6 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                <p className="text-gray-300 text-sm">Copy your API key from the <span className="text-white font-medium">Credentials</span> tab to use in your integration</p>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="w-6 h-6 bg-[#25D366]/20 text-[#25D366] rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                <p className="text-gray-300 text-sm">Send your first test message using either cURL commands or the <span className="text-[#25D366]">Test Sending</span> tab</p>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                <p className="text-gray-300 text-sm">View the complete <span className="text-[#25D366]">API Documentation</span> for all available endpoints</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Tabs */}
                <div className="col-span-2">
                    <div className="bg-[#111] border border-gray-800 rounded-xl">
                        {/* Tabs */}
                        <div className="border-b border-gray-800 px-4">
                            <div className="flex space-x-1">
                                {[
                                    { id: "credentials", label: "Credentials", icon: "key" },
                                    { id: "test-sending", label: "Test Sending", icon: "send" },
                                    { id: "webhook", label: "Webhook Simulator", icon: "webhook" },
                                    { id: "settings", label: "Settings", icon: "settings" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as TabType)}
                                        className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${activeTab === tab.id
                                            ? "border-[#25D366] text-white"
                                            : "border-transparent text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        <TabIcon name={tab.icon} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-5">
                            {activeTab === "credentials" && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">API Credentials</h3>
                                    <p className="text-gray-400 text-sm mb-4">Use these credentials to authenticate requests from your application.</p>

                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                                <p className="text-yellow-500 font-medium">Usage Limit</p>
                                                <p className="text-yellow-400/70 text-sm">Limited to 1 request per minute on free trial. <Link href="/dashboard/subscription" className="underline">Upgrade now</Link> for unlimited access.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-400 text-sm">API Access Token:</p>
                                            <p className="text-white font-mono truncate">
                                                {apiKey ? (showKey ? apiKey : apiKey.substring(0, 12) + "••••••••") : "No API key found"}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button
                                                onClick={() => setShowKey(!showKey)}
                                                className="text-gray-400 hover:text-white p-2"
                                                title={showKey ? "Hide key" : "Show key"}
                                            >
                                                {showKey ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (apiKey) {
                                                        navigator.clipboard.writeText(apiKey);
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-white p-2"
                                                title="Copy to clipboard"
                                            >
                                                {copied ? (
                                                    <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <Link href="/docs" className="flex items-center space-x-2 text-[#25D366] hover:underline">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span>API Documentation</span>
                                        </Link>
                                        <button
                                            onClick={regenerateApiKey}
                                            disabled={regenerating}
                                            className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 disabled:opacity-50 transition"
                                        >
                                            <svg className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>{regenerating ? "Régénération..." : "Régénérer la clé"}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === "test-sending" && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Test Sending Capability</h3>
                                    <p className="text-gray-400 text-sm mb-4">Send a real WhatsApp message to verify your session is working.</p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Destination Number</label>
                                            <input
                                                type="tel"
                                                value={testPhone}
                                                onChange={(e) => setTestPhone(e.target.value)}
                                                placeholder="e.g. +1234567890 (with country code)"
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
                                            />
                                            <p className="text-gray-500 text-xs mt-1">Enter the full phone number with country code (e.g., +1 for US)</p>
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Message</label>
                                            <textarea
                                                value={testMessage}
                                                onChange={(e) => setTestMessage(e.target.value)}
                                                rows={3}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none"
                                            />
                                        </div>
                                        <button
                                            onClick={sendTestMessage}
                                            disabled={sending || !testPhone.trim()}
                                            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg transition"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            <span>{sending ? "Sending..." : "Send Test Message"}</span>
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-800 mt-6 pt-6">
                                        <p className="text-gray-400 text-sm mb-3">OR SEND VIA CLI</p>
                                        <div className="bg-gray-800/50 rounded-lg p-4 relative">
                                            <button className="absolute top-3 right-3 text-gray-400 hover:text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                            <pre className="text-green-400 text-sm overflow-x-auto">
                                                {`curl -X POST "${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "+1234567890", "message": "Hello!"}'`}
                                            </pre>
                                        </div>
                                        <p className="text-gray-500 text-xs mt-2">This command uses your actual API key and the values entered above.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === "webhook" && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white font-semibold mb-2">Webhook Not Configured</h3>
                                    <p className="text-gray-400 text-sm mb-6">Please configure a webhook URL in your session settings to use the simulator.</p>
                                    <button className="inline-flex items-center space-x-2 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 px-4 py-2 rounded-lg transition">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Configure Webhook</span>
                                    </button>
                                </div>
                            )}

                            {activeTab === "settings" && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Advanced Settings</h3>
                                    <p className="text-gray-400 text-sm mb-6">Configure automated behavior for this session.</p>

                                    {settingsLoading ? (
                                        <div className="flex items-center justify-center p-8">
                                            <div className="animate-spin w-6 h-6 border-2 border-[#25D366] border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : settings ? (
                                        <div className="space-y-8">
                                            {/* Behavior Section */}
                                            <div>
                                                <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Behavior</h4>
                                                <div className="space-y-4">
                                                    <Toggle
                                                        label="Always Online"
                                                        description="Keep your status as 'Online' even when you're not using the app"
                                                        checked={settings.alwaysOnline}
                                                        onChange={(checked) => updateSetting("alwaysOnline", checked)}
                                                    />
                                                    <Toggle
                                                        label="Auto-Read Messages"
                                                        description="Automatically mark incoming messages as read instantly"
                                                        checked={settings.autoReadMessages}
                                                        onChange={(checked) => updateSetting("autoReadMessages", checked)}
                                                    />
                                                    <Toggle
                                                        label="Reject Incoming Calls"
                                                        description="Automatically reject voice and video calls"
                                                        checked={settings.rejectCalls}
                                                        onChange={(checked) => updateSetting("rejectCalls", checked)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Privacy Section */}
                                            <div>
                                                <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Privacy & Chat</h4>
                                                <div className="space-y-4">
                                                    <Toggle
                                                        label="Typing Indicator"
                                                        description="Show 'typing...' status when sending automated messages"
                                                        checked={settings.typingIndicator}
                                                        onChange={(checked) => updateSetting("typingIndicator", checked)}
                                                    />
                                                    <Toggle
                                                        label="Link Previews"
                                                        description="Generate previews for links sent in messages"
                                                        checked={settings.linkPreview}
                                                        onChange={(checked) => updateSetting("linkPreview", checked)}
                                                    />
                                                </div>
                                            </div>
                                            {/* Rate Limits Section */}
                                            <div>
                                                <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Rate Limits</h4>

                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <p className="text-white font-medium">Messages per Minute</p>
                                                            <span className="text-[#25D366] font-mono">{settings.rateLimitPerMinute || 60} / min</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="120"
                                                            step="1"
                                                            value={settings.rateLimitPerMinute || 60}
                                                            onChange={(e) => updateSetting("rateLimitPerMinute", parseInt(e.target.value))}
                                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#25D366]"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                            <span>1 msg/min</span>
                                                            <span>60 msg/min (Safe)</span>
                                                            <span>120 msg/min (High Risk)</span>
                                                        </div>
                                                    </div>

                                                    {(settings.rateLimitPerMinute && settings.rateLimitPerMinute > 60) && (
                                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start space-x-3">
                                                            <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                            <p className="text-yellow-400/80 text-sm">
                                                                Warning: High sending rates may trigger WhatsApp's anti-spam systems and result in your number being banned. The recommended safe limit is 60 messages per minute (1 per second).
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            Failed to load settings. Please try refreshing.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-white font-medium">{label}</p>
                <p className="text-gray-500 text-sm">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-[#111] ${checked ? "bg-[#25D366]" : "bg-gray-700"
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"
                        }`}
                />
            </button>
        </div>
    );
}

function TabIcon({ name }: { name: string }) {
    const icons: Record<string, React.ReactNode> = {
        key: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
        ),
        settings: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        send: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
        ),
        webhook: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
        ),
    };
    return icons[name] || null;
}
