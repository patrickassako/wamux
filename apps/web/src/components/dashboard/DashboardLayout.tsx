"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslations } from "next-intl";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();
    const { subscription, loading: subLoading } = useSubscription();
    const t = useTranslations('Subscription');

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);
            setAuthLoading(false);
        };
        checkUser();
    }, [router, supabase.auth]);

    const daysRemaining = subscription?.currentPeriodEnd
        ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    const showTrialBanner = subscription?.plan === 'free' && daysRemaining > 0;

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Sidebar />

            {/* Main Content */}
            <div className="ml-64">
                {/* Trial Banner */}
                {showTrialBanner && (
                    <div className="bg-[#1a1a1a] border-b border-gray-800 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-white font-medium">{t('trialActive')}</span>
                                <span className="text-gray-400 ml-2">{t('trialEndsIn', { days: daysRemaining })}</span>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/subscription"
                            className="bg-white text-black px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                        >
                            {t('upgradeNow')}
                        </Link>
                    </div>
                )}

                {/* Page Content */}
                <main className="p-6">
                    {children}
                </main>
            </div>

            {/* WhatsApp Floating Button */}
            <a
                href="https://wa.me/237694788215"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:bg-[#20bd5a] transition hover:scale-110"
                title="Contact us on WhatsApp"
            >
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </a>
        </div>
    );
}
