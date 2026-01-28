"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        email: "",
        fullName: "",
        phone: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfile({
                    email: user.email || "",
                    fullName: user.user_metadata?.full_name || "",
                    phone: user.user_metadata?.phone || "",
                });
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.fullName,
                    phone: profile.phone,
                }
            });

            if (error) throw error;

            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (error: any) {
            setMessage({ type: "error", text: error.message || "Failed to update profile" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-gray-400 mb-8">
                Manage your account information
            </p>

            {message.text && (
                <div className={`rounded-xl p-4 mb-6 ${message.type === "success"
                        ? "bg-[#25D366]/10 border border-[#25D366]"
                        : "bg-red-500/10 border border-red-500"
                    }`}>
                    <p className={message.type === "success" ? "text-[#25D366]" : "text-red-500"}>
                        {message.text}
                    </p>
                </div>
            )}

            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={profile.fullName}
                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#25D366]"
                            placeholder="Your full name"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#25D366]"
                            placeholder="+237 XXX XXX XXX"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* Account Info */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mt-6">
                <h2 className="text-white font-semibold mb-4">Account Information</h2>

                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                        <span className="text-gray-400">Account Type</span>
                        <span className="text-white">Free</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-gray-400">Subscription Status</span>
                        <span className="text-[#25D366]">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
