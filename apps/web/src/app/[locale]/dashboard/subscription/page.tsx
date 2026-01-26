"use client";

import { useTranslations } from 'next-intl';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';

export default function SubscriptionPage() {
    const t = useTranslations('Subscription');
    const tp = useTranslations('Pricing');
    const { subscription, usage, plans, loading, error, upgradePlan, downgradeToFree } = useSubscription();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#25D366]"></div>
            </div>
        );
    }

    const daysRemaining = subscription?.currentPeriodEnd
        ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
                <p className="text-gray-400">{t('subtitle')}</p>
            </div>

            {error && !error.includes('404') && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {/* Current Plan Card (If active) */}
            {subscription ? (
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 mb-10 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">{t('currentPlan')}</span>
                            <div className="flex items-center gap-3 mt-1">
                                <h2 className="text-3xl font-bold text-white capitalize">
                                    {subscription?.plan || 'Free'}
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${subscription?.status === 'active' && daysRemaining > 0 ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                    {daysRemaining > 0 ? t(subscription?.status || 'active') : 'Expired'}
                                </span>
                            </div>
                        </div>
                        {subscription?.currentPeriodEnd && (
                            <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                                <p className="text-gray-400 text-xs">
                                    {subscription.plan === 'free' ? 'Trial ends in' : t('support')}
                                </p>
                                <p className={`font-medium text-sm ${subscription.plan === 'free' && daysRemaining <= 1 ? 'text-yellow-500' : 'text-white'}`}>
                                    {subscription.plan === 'free'
                                        ? t('remaining', { days: daysRemaining })
                                        : new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-t border-gray-800">
                        <div className="space-y-1">
                            <p className="text-gray-500 text-sm">{t('sessions')}</p>
                            <p className="text-white text-2xl font-bold">{subscription?.sessionsLimit || 1}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-500 text-sm">{t('usage')}</p>
                            <div className="flex items-end gap-2">
                                <p className="text-white text-2xl font-bold">{usage?.messagesUsed || 0}</p>
                                <p className="text-gray-500 text-sm mb-1">/ {usage?.messageLimit === 0 ? '∞' : usage?.messageLimit}</p>
                            </div>
                            {usage && usage.messageLimit > 0 && (
                                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-500 ${usage.usagePercent > 90 ? 'bg-red-500' : 'bg-[#25D366]'}`}
                                        style={{ width: `${Math.min(usage.usagePercent, 100)}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 text-right sm:text-left">
                            <p className="text-gray-500 text-sm">{t('support')}</p>
                            <p className="text-white text-xl font-semibold">
                                {subscription?.plan === 'free' ? 'Community' : 'Priority Email'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* No Active Subscription view */
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-12 text-center shadow-xl mb-10">
                    <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Aucun abonnement actif</h2>
                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                        Vous n'avez pas encore d'abonnement actif. Activez votre essai gratuit de 3 jours ou choisissez un plan ci-dessous.
                    </p>
                    <button
                        onClick={async () => {
                            const res = await downgradeToFree();
                            if (res.success) {
                                window.location.reload();
                            }
                        }}
                        className="px-10 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-all"
                    >
                        Activer mon essai de 3 jours
                    </button>
                    <p className="mt-4 text-gray-500 text-xs text-center">
                        Ou choisissez l'un des plans premium ci-dessous pour plus de puissance.
                    </p>
                </div>
            )}

            {/* Plans List - Always shown */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
                    {subscription ? t('upgradeTitle') : tp('title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.filter(p => p.name !== 'free').map((plan) => (
                        <div
                            key={plan.name}
                            className={`p-6 rounded-2xl flex flex-col justify-between transition-all border ${plan.name === 'pro'
                                ? 'bg-[#25D366]/5 border-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.1)]'
                                : 'bg-[#111] border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-lg font-bold text-white capitalize">{plan.name}</h4>
                                    {plan.name === 'pro' && (
                                        <span className="bg-[#25D366] text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Popular</span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-3xl font-bold text-white">${plan.priceMonthly}</span>
                                    <span className="text-gray-500 text-sm">{tp('perMonth')}</span>
                                </div>
                                <ul className="space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                            <svg className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {subscription?.plan === plan.name ? (
                                <button disabled className="w-full py-2.5 rounded-xl font-bold text-sm bg-gray-800 text-gray-400 cursor-not-allowed">
                                    {t('active')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => upgradePlan(plan.name)}
                                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${plan.name === 'pro'
                                        ? 'bg-[#25D366] hover:bg-[#20bd5a] text-white'
                                        : 'border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10'
                                        }`}
                                >
                                    {t('upgradeTo', { plan: plan.name })}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {subscription && subscription.plan !== 'free' && (
                    <div className="pt-4 flex justify-center">
                        <button
                            onClick={downgradeToFree}
                            className="text-gray-500 hover:text-white text-sm transition-colors underline decoration-gray-700 underline-offset-4"
                        >
                            {t('downgradeToFree')}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-12 text-center text-gray-600 text-xs flex items-center justify-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t('paymentProcessor')}
            </p>
        </div>
    );
}
