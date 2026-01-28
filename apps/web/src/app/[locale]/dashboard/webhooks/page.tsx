'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface Session {
    id: string;
    name: string;
    phone_number: string | null;
    status: string;
}

interface Webhook {
    id: string;
    url: string;
    sessionId: string | null;
    events: string[];
    enabled: boolean;
    lastTriggeredAt: string | null;
    failureCount: number;
    createdAt: string;
}

interface EventCategory {
    name: string;
    icon: string;
    events: { type: string; description: string }[];
}

const EVENT_CATALOG: EventCategory[] = [
    {
        name: "Messages",
        icon: "💬",
        events: [
            { type: "message.received", description: "Any incoming message" },
            { type: "message.received.personal", description: "Personal/DM message" },
            { type: "message.received.group", description: "Group message" },
            { type: "message.sent", description: "Message sent" },
            { type: "message.delivered", description: "Message delivered" },
            { type: "message.read", description: "Message read" },
            { type: "message.failed", description: "Message failed" },
        ],
    },
    {
        name: "Sessions",
        icon: "📱",
        events: [
            { type: "session.connected", description: "Session connected" },
            { type: "session.disconnected", description: "Session disconnected" },
            { type: "session.qr.updated", description: "QR code updated" },
        ],
    },
    {
        name: "Groups",
        icon: "👥",
        events: [
            { type: "group.participant.added", description: "Participant added" },
            { type: "group.participant.removed", description: "Participant removed" },
            { type: "group.updated", description: "Group updated" },
        ],
    },
];

const DEFAULT_EVENTS = ["message.received", "message.sent", "session.connected", "session.disconnected"];

export default function WebhooksPage() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUrl, setNewUrl] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState<string>(""); // "" = global
    const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_EVENTS);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; statusCode?: number; error?: string; latencyMs?: number } | null>(null);
    const supabase = createClient();

    useEffect(() => {
        loadWebhooks();
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    const loadWebhooks = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webhooks`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setWebhooks(data.webhooks || []);
            }
        } catch (error) {
            console.error("Failed to load webhooks:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleEvent = (eventType: string) => {
        setSelectedEvents(prev =>
            prev.includes(eventType)
                ? prev.filter(e => e !== eventType)
                : [...prev, eventType]
        );
    };

    const selectAllInCategory = (category: EventCategory) => {
        const categoryEventTypes = category.events.map(e => e.type);
        const allSelected = categoryEventTypes.every(e => selectedEvents.includes(e));

        if (allSelected) {
            setSelectedEvents(prev => prev.filter(e => !categoryEventTypes.includes(e)));
        } else {
            setSelectedEvents(prev => [...new Set([...prev, ...categoryEventTypes])]);
        }
    };

    const createWebhook = async () => {
        if (!newUrl.trim() || selectedEvents.length === 0) return;

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const payload: { url: string; events: string[]; sessionId?: string } = {
                url: newUrl,
                events: selectedEvents,
            };
            // Only add sessionId if a specific session is selected
            if (selectedSessionId) {
                payload.sessionId = selectedSessionId;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webhooks`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                setCreatedSecret(data.secret);
                await loadWebhooks();
            } else {
                const error = await response.json();
                alert(`Erreur: ${error.detail || "Impossible de créer le webhook"}`);
            }
        } catch (error) {
            console.error("Failed to create webhook:", error);
            alert("Erreur lors de la création du webhook");
        } finally {
            setSaving(false);
        }
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm("Supprimer ce webhook ?")) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webhooks/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                setWebhooks(prev => prev.filter(w => w.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete webhook:", error);
        }
    };

    const toggleWebhook = async (webhook: Webhook) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webhooks/${webhook.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ enabled: !webhook.enabled }),
            });

            if (response.ok) {
                setWebhooks(prev => prev.map(w =>
                    w.id === webhook.id ? { ...w, enabled: !w.enabled } : w
                ));
            }
        } catch (error) {
            console.error("Failed to toggle webhook:", error);
        }
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setNewUrl("");
        setSelectedSessionId("");
        setSelectedEvents(DEFAULT_EVENTS);
        setCreatedSecret(null);
    };

    const getSessionDisplay = (sessionId: string | null) => {
        if (!sessionId) return { label: "Toutes les sessions", color: "text-blue-400" };
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return { label: "Session inconnue", color: "text-gray-400" };
        return {
            label: session.phone_number || session.name || sessionId.slice(0, 8),
            color: session.status === "connected" ? "text-green-400" : "text-gray-400"
        };
    };

    const testWebhook = async (id: string) => {
        setTesting(id);
        setTestResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webhooks/${id}/test`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setTestResult(data);
            }
        } catch (error) {
            console.error("Failed to test webhook:", error);
            setTestResult({ success: false, error: "Erreur de connexion" });
        } finally {
            setTesting(null);
        }
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
            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {createdSecret ? (
                            /* Secret Display */
                            <div>
                                <h3 className="text-white font-semibold text-lg mb-4">✅ Webhook créé !</h3>
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                                    <p className="text-yellow-400 text-sm mb-2">⚠️ Copiez ce secret maintenant - il ne sera plus affiché !</p>
                                    <code className="block bg-gray-800 p-3 rounded text-green-400 text-sm break-all">
                                        {createdSecret}
                                    </code>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">
                                    Utilisez ce secret pour vérifier les signatures HMAC-SHA256 de vos webhooks.
                                </p>
                                <button
                                    onClick={closeModal}
                                    className="w-full bg-[#25D366] text-white py-2.5 rounded-lg font-medium hover:bg-[#20bd5a] transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        ) : (
                            /* Create Form */
                            <div>
                                <h3 className="text-white font-semibold text-lg mb-4">Créer un Webhook</h3>

                                {/* URL */}
                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-2">URL du Webhook</label>
                                    <input
                                        type="url"
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        placeholder="https://votre-serveur.com/webhook"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                                    />
                                </div>

                                {/* Session Selection */}
                                <div className="mb-6">
                                    <label className="block text-gray-400 text-sm mb-2">Session associée</label>
                                    <select
                                        value={selectedSessionId}
                                        onChange={(e) => setSelectedSessionId(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                                    >
                                        <option value="">🌐 Toutes les sessions (Global)</option>
                                        {sessions.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.status === "connected" ? "🟢" : "⚪"} {s.phone_number || s.name || s.id.slice(0, 8)}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-gray-500 text-xs mt-1">
                                        {selectedSessionId
                                            ? "Ce webhook recevra uniquement les événements de cette session"
                                            : "Ce webhook recevra les événements de toutes vos sessions"}
                                    </p>
                                </div>

                                {/* Event Selection */}
                                <div className="mb-6">
                                    <label className="block text-gray-400 text-sm mb-3">
                                        Événements ({selectedEvents.length} sélectionnés)
                                    </label>

                                    <div className="space-y-4">
                                        {EVENT_CATALOG.map((category) => {
                                            const categoryEventTypes = category.events.map(e => e.type);
                                            const allSelected = categoryEventTypes.every(e => selectedEvents.includes(e));
                                            const someSelected = categoryEventTypes.some(e => selectedEvents.includes(e));

                                            return (
                                                <div key={category.name} className="bg-gray-800/50 rounded-lg p-4">
                                                    <div
                                                        className="flex items-center justify-between mb-3 cursor-pointer"
                                                        onClick={() => selectAllInCategory(category)}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <span>{category.icon}</span>
                                                            <span className="text-white font-medium">{category.name}</span>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${allSelected
                                                            ? 'bg-[#25D366] border-[#25D366]'
                                                            : someSelected
                                                                ? 'border-[#25D366]'
                                                                : 'border-gray-600'
                                                            }`}>
                                                            {allSelected && <span className="text-white text-xs">✓</span>}
                                                            {someSelected && !allSelected && <span className="text-[#25D366] text-xs">−</span>}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2">
                                                        {category.events.map((event) => (
                                                            <label
                                                                key={event.type}
                                                                className="flex items-center space-x-3 cursor-pointer py-1"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedEvents.includes(event.type)}
                                                                    onChange={() => toggleEvent(event.type)}
                                                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#25D366] focus:ring-[#25D366]"
                                                                />
                                                                <div className="flex-1">
                                                                    <code className="text-green-400 text-sm">{event.type}</code>
                                                                    <span className="text-gray-500 text-sm ml-2">- {event.description}</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-3">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={createWebhook}
                                        disabled={saving || !newUrl.trim() || selectedEvents.length === 0}
                                        className="flex-1 px-4 py-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#20bd5a] disabled:opacity-50 transition"
                                    >
                                        {saving ? "Création..." : "Créer Webhook"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Test Result Modal */}
            {testResult && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center space-x-3 mb-4">
                            {testResult.success ? (
                                <>
                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">Test réussi !</h3>
                                        <p className="text-gray-400 text-sm">Votre endpoint a répondu correctement</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">Test échoué</h3>
                                        <p className="text-gray-400 text-sm">Votre endpoint a retourné une erreur</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 mb-4">
                            {testResult.statusCode && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    <span className={testResult.success ? "text-green-400" : "text-red-400"}>
                                        {testResult.statusCode}
                                    </span>
                                </div>
                            )}
                            {testResult.latencyMs && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Latence</span>
                                    <span className="text-white">{testResult.latencyMs}ms</span>
                                </div>
                            )}
                            {testResult.error && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Erreur</span>
                                    <span className="text-red-400 text-sm">{testResult.error}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setTestResult(null)}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Webhooks</h1>
                    <p className="text-gray-400">Recevez des événements en temps réel sur votre serveur</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Nouveau Webhook</span>
                </button>
            </div>

            {/* Webhooks List */}
            {webhooks.length === 0 ? (
                <div className="bg-[#111] border border-gray-800 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-2">Aucun webhook configuré</h3>
                    <p className="text-gray-400 mb-6">Créez votre premier webhook pour recevoir des événements</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center space-x-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-2.5 rounded-lg font-medium transition"
                    >
                        <span>Créer un Webhook</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {webhooks.map((webhook) => (
                        <div key={webhook.id} className="bg-[#111] border border-gray-800 rounded-xl p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <code className="text-white font-mono text-sm truncate">{webhook.url}</code>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${webhook.enabled
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                            }`}>
                                            {webhook.enabled ? "Actif" : "Désactivé"}
                                        </span>
                                        {/* Session Badge */}
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 border border-blue-500/30 ${getSessionDisplay(webhook.sessionId).color}`}>
                                            {webhook.sessionId ? "📱" : "🌐"} {getSessionDisplay(webhook.sessionId).label}
                                        </span>
                                        {webhook.failureCount > 0 && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                                {webhook.failureCount} échecs
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {webhook.events.slice(0, 5).map((event) => (
                                            <span key={event} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">
                                                {event}
                                            </span>
                                        ))}
                                        {webhook.events.length > 5 && (
                                            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">
                                                +{webhook.events.length - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                    <button
                                        onClick={() => testWebhook(webhook.id)}
                                        disabled={testing === webhook.id}
                                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition disabled:opacity-50"
                                        title="Tester"
                                    >
                                        {testing === webhook.id ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => toggleWebhook(webhook)}
                                        className={`p-2 rounded-lg transition ${webhook.enabled
                                            ? "text-gray-400 hover:text-white hover:bg-gray-800"
                                            : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                            }`}
                                        title={webhook.enabled ? "Désactiver" : "Activer"}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {webhook.enabled ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            )}
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => deleteWebhook(webhook.id)}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                        title="Supprimer"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Help Section */}
            <div className="mt-8 bg-gray-800/30 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-3">📚 Vérifier les signatures</h3>
                <pre className="bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{`# Python
import hmac, hashlib

def verify_signature(secret, timestamp, payload, signature):
    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{payload}".encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)`}</code>
                </pre>
            </div>
        </div>
    );
}
