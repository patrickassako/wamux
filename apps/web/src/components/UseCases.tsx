import { useTranslations } from 'next-intl';

export default function UseCases() {
    const t = useTranslations('UseCases');

    const cases = [
        { title: t('supportTitle'), desc: t('supportDesc'), icon: '🤝', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { title: t('alertsTitle'), desc: t('alertsDesc'), icon: '🔔', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
        { title: t('aiTitle'), desc: t('aiDesc'), icon: '🤖', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { title: t('leadsTitle'), desc: t('leadsDesc'), icon: '📈', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { title: t('ecommerceTitle'), desc: t('ecommerceDesc'), icon: '🛍️', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        { title: t('analyticsTitle'), desc: t('analyticsDesc'), icon: '📊', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    ];

    return (
        <section className="py-20 px-4 bg-gray-900">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cases.map((item, index) => (
                        <div key={index} className={`p-8 rounded-2xl border ${item.color} backdrop-blur-sm transition duration-300 hover:scale-[1.02]`}>
                            <div className="text-4xl mb-6">{item.icon}</div>
                            <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                            <p className="opacity-80 leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
