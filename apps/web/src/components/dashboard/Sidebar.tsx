"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "grid" },
    { href: "/dashboard/sessions", label: "Sessions", icon: "phone" },
    { href: "/dashboard/webhooks", label: "Webhooks", icon: "link" },
    { href: "/dashboard/test", label: "Test Center", icon: "beaker" },
    { href: "/dashboard/subscription", label: "Subscription", icon: "credit-card" },
    { href: "/dashboard/profile", label: "Profile", icon: "user" },
];

const bottomItems = [
    { href: "/docs", label: "Documentation", icon: "book" },
    { href: "/dashboard/support", label: "Support", icon: "help-circle" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-800">
                <Link href="/dashboard" className="flex items-center space-x-2">
                    {/* Using Image for better quality, ensure you import Image from next/image if not present, checking imports */}
                    <img
                        src="/logo-full.png"
                        alt="Wamux Logo"
                        className="h-8 w-auto object-contain"
                    />
                </Link>
            </div>

            {/* Platform Label */}
            <div className="px-6 py-3">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Platform</span>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-3">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${isActive(item.href)
                            ? "bg-gray-800/50 text-white"
                            : "text-gray-400 hover:text-white hover:bg-gray-800/30"
                            }`}
                    >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Bottom Links */}
            <div className="px-3 pb-4 border-t border-gray-800 pt-4">
                {bottomItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Icon name={item.icon} />
                        <span className="text-sm">{item.label}</span>
                    </Link>
                ))}
            </div>

            {/* User Account */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-sm font-medium">TN</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">tchi network</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Logout"
                    >
                        <Icon name="logout" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

function Icon({ name }: { name: string }) {
    const icons: Record<string, React.ReactNode> = {
        grid: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        ),
        phone: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
        "credit-card": (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
        beaker: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
        link: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
        ),
        book: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
        "help-circle": (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        "message-circle": (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        ),
        user: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        logout: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        ),
    };

    return icons[name] || <div className="w-5 h-5" />;
}
