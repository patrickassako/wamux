"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface Stats {
    totalSessions: number;
    connectedSessions: number;
    totalMessages: number;
    successRate: number;
}

interface RecentSession {
    id: string;
    sessionKey: string;
    status: string;
    lastActivityAt: string;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        totalSessions: 0,
        connectedSessions: 0,
        totalMessages: 0,
        successRate: 100,
    });
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Load sessions
            const sessionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/sessions`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                const sessions = data.sessions || [];
                setRecentSessions(sessions.slice(0, 3));
                setStats(prev => ({
                    ...prev,
                    totalSessions: sessions.length,
                    connectedSessions: sessions.filter((s: any) => s.status === "connected").length,
                }));
            }

            // Load messages count
            const messagesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages?limit=1`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (messagesRes.ok) {
                const data = await messagesRes.json();
                setStats(prev => ({
                    ...prev,
                    totalMessages: data.total || 0,
                }));
            }
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setLoading(false);
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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400">Overview of your Wamux usage</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Sessions"
                    value={stats.totalSessions}
                    icon="phone"
                    color="blue"
                />
                <StatCard
                    title="Connected"
                    value={stats.connectedSessions}
                    icon="check"
                    color="green"
                />
                <StatCard
                    title="Messages Sent"
                    value={stats.totalMessages}
                    icon="message"
                    color="purple"
                />
                <StatCard
                    title="Success Rate"
                    value={`${stats.successRate}%`}
                    icon="chart"
                    color="yellow"
                />
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Recent Sessions */}
                <div className="col-span-2">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-semibold">Recent Sessions</h2>
                            <Link href="/dashboard/sessions" className="text-[#25D366] text-sm hover:underline">
                                View all
                            </Link>
                        </div>

                        {recentSessions.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400">No sessions yet</p>
                                <Link href="/onboarding" className="text-[#25D366] hover:underline text-sm mt-2 inline-block">
                                    Create your first session
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentSessions.map((session) => (
                                    <Link
                                        key={session.id}
                                        href={`/dashboard/sessions/${session.id}`}
                                        className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{session.sessionKey}</p>
                                                <p className="text-gray-400 text-xs">
                                                    {new Date(session.lastActivityAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${session.status === "connected"
                                            ? "bg-[#25D366]/20 text-[#25D366]"
                                            : "bg-gray-500/20 text-gray-400"
                                            }`}>
                                            {session.status}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="col-span-1">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <Link
                                href="/onboarding"
                                className="flex items-center space-x-3 p-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-lg hover:bg-[#25D366]/20 transition"
                            >
                                <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-white">New Session</span>
                            </Link>
                            <Link
                                href="/docs"
                                className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span className="text-gray-300">API Documentation</span>
                            </Link>
                            <Link
                                href="/dashboard/subscription"
                                className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="text-gray-300">Manage Subscription</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
    const colors: Record<string, { bg: string; text: string }> = {
        blue: { bg: "bg-blue-500/10", text: "text-blue-400" },
        green: { bg: "bg-[#25D366]/10", text: "text-[#25D366]" },
        purple: { bg: "bg-purple-500/10", text: "text-purple-400" },
        yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
    };

    const icons: Record<string, React.ReactNode> = {
        phone: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
        check: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        message: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        ),
        chart: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    };

    return (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 ${colors[color].bg} rounded-lg flex items-center justify-center ${colors[color].text}`}>
                    {icons[icon]}
                </div>
            </div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
}
