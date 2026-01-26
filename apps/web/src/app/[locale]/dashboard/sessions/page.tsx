"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface Session {
    id: string;
    session_key: string;
    phone_number: string | null;
    status: string;
    last_activity_at: string;
    created_at: string;
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editName, setEditName] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions`, {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette session ? Cette action est irréversible.")) {
            return;
        }

        setDeletingId(sessionId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`,
                    },
                }
            );

            if (response.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
            alert("Erreur lors de la suppression");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (session: Session) => {
        setEditingSession(session);
        setEditName(session.session_key);
    };

    const handleSaveEdit = async () => {
        if (!editingSession || !editName.trim()) return;

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions/${editingSession.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ session_key: editName.trim() }),
                }
            );

            if (response.ok) {
                const updated = await response.json();
                setSessions(prev => prev.map(s =>
                    s.id === editingSession.id ? { ...s, session_key: updated.sessionKey || editName } : s
                ));
                setEditingSession(null);
            } else {
                alert("Erreur lors de la modification");
            }
        } catch (error) {
            console.error("Failed to update session:", error);
            alert("Erreur lors de la modification");
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            connected: "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30",
            disconnected: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
            initializing: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
            failed: "bg-red-500/20 text-red-400 border border-red-500/30",
        };
        return styles[status] || styles.disconnected;
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
            {/* Edit Modal */}
            {editingSession && (
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
                                onClick={() => setEditingSession(null)}
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

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Sessions</h1>
                    <p className="text-gray-400">Manage your WhatsApp sessions</p>
                </div>
                <Link
                    href="/onboarding"
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Session</span>
                </Link>
            </div>

            {sessions.length === 0 ? (
                <div className="bg-[#111] border border-gray-800 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-2">No sessions yet</h3>
                    <p className="text-gray-400 mb-6">Create your first WhatsApp session to get started</p>
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center space-x-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-2.5 rounded-lg font-medium transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Session</span>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="bg-[#111] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
                        >
                            <div className="flex items-center justify-between">
                                <Link
                                    href={`/dashboard/sessions/${session.id}`}
                                    className="flex items-center space-x-4 flex-1"
                                >
                                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-white font-semibold">{session.session_key}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(session.status)}`}>
                                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            {session.phone_number || "No phone connected"}
                                        </p>
                                    </div>
                                </Link>
                                <div className="flex items-center space-x-2">
                                    <div className="text-right mr-4">
                                        <p className="text-gray-400 text-sm">Last active</p>
                                        <p className="text-white text-sm">
                                            {new Date(session.last_activity_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(session)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                                        title="Modifier"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        disabled={deletingId === session.id}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                                        title="Supprimer"
                                    >
                                        {deletingId === session.id ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
