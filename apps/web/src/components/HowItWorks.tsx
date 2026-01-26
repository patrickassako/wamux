import { useTranslations } from 'next-intl';

export default function HowItWorks() {
    const t = useTranslations('HowItWorks');

    const steps = [
        {
            title: t('step1Title'),
            desc: t('step1Desc'),
            icon: (
                <svg className="w-8 h-8 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
            )
        },
        {
            title: t('step2Title'),
            desc: t('step2Desc'),
            icon: (
                <svg className="w-8 h-8 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            )
        },
        {
            title: t('step3Title'),
            desc: t('step3Desc'),
            icon: (
                <svg className="w-8 h-8 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        }
    ];

    return (
        <section className="py-20 px-4 bg-gray-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('title')}</h2>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">{t('subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="bg-gray-800/50 border border-gray-700 p-8 rounded-2xl hover:border-[#25D366]/50 transition duration-300">
                            <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center mb-6 mx-auto">
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-center">{step.title}</h3>
                            <p className="text-gray-400 text-center leading-relaxed">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
