"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface User {
    id: string;
    email: string;
    fullName: string | null;
    isAdmin: boolean;
    isBanned: boolean;
    createdAt: string;
}

interface PlatformStats {
    totalUsers: number;
    activeSessions: number;
    messagesLast24h: number;
    payingCustomers: number;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        checkAdminAndLoad();
    }, []);

    const checkAdminAndLoad = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const headers = { "Authorization": `Bearer ${session.access_token}` };

            // Load stats (will fail if not admin)
            const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/stats`, { headers });

            if (statsRes.status === 403) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            if (statsRes.ok) {
                setStats(await statsRes.json());
                setIsAdmin(true);
            }

            // Load users
            const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users`, { headers });
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to load admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const url = search
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users?search=${encodeURIComponent(search)}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users`;

            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to search users:", error);
        }
    };

    const handleBan = async (userId: string) => {
        if (!confirm("Are you sure you want to ban this user? All their sessions will be disconnected.")) return;
        setActionLoading(userId);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}/ban`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, isBanned: true } : u));
            }
        } catch (error) {
            console.error("Failed to ban user:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnban = async (userId: string) => {
        setActionLoading(userId);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}/unban`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, isBanned: false } : u));
            }
        } catch (error) {
            console.error("Failed to unban user:", error);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400">You don't have admin privileges.</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 mb-8">Platform management and user control</p>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <p className="text-gray-400 text-sm">Total Users</p>
                        <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <p className="text-gray-400 text-sm">Active Sessions</p>
                        <p className="text-2xl font-bold text-[#25D366]">{stats.activeSessions}</p>
                    </div>
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <p className="text-gray-400 text-sm">Messages (24h)</p>
                        <p className="text-2xl font-bold text-white">{stats.messagesLast24h}</p>
                    </div>
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                        <p className="text-gray-400 text-sm">Paying Customers</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats.payingCustomers}</p>
                    </div>
                </div>
            )}

            {/* User Search */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold">User Management</h3>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                            placeholder="Search by email or name..."
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] w-64"
                        />
                        <button
                            onClick={searchUsers}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                            <th className="pb-3">Email</th>
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Joined</th>
                            <th className="pb-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-800/50">
                                <td className="py-4 text-white">{user.email}</td>
                                <td className="py-4 text-gray-400">{user.fullName || "-"}</td>
                                <td className="py-4">
                                    {user.isBanned ? (
                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Banned</span>
                                    ) : user.isAdmin ? (
                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Admin</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-[#25D366]/20 text-[#25D366] rounded text-xs">Active</span>
                                    )}
                                </td>
                                <td className="py-4 text-gray-500 text-sm">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-4 text-right">
                                    {!user.isAdmin && (
                                        user.isBanned ? (
                                            <button
                                                onClick={() => handleUnban(user.id)}
                                                disabled={actionLoading === user.id}
                                                className="text-[#25D366] hover:underline disabled:opacity-50 text-sm"
                                            >
                                                {actionLoading === user.id ? "..." : "Unban"}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBan(user.id)}
                                                disabled={actionLoading === user.id}
                                                className="text-red-400 hover:underline disabled:opacity-50 text-sm"
                                            >
                                                {actionLoading === user.id ? "..." : "Ban"}
                                            </button>
                                        )
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No users found</p>
                )}
            </div>
        </div>
    );
}
