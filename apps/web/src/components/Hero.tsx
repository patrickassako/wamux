import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function Hero() {
    const t = useTranslations('Hero');

    return (
        <section className="hero-gradient pt-32 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full mb-6">
                        <span className="w-2 h-2 bg-[#25D366] rounded-full mr-2 animate-pulse"></span>
                        <span className="text-sm text-gray-300">{t('badge')}</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                        {t('title')}
                        <br />
                        <span className="text-[#25D366]">{t('subtitle')}</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10">
                        {t('description')}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white px-8 py-4 rounded-xl font-semibold text-lg transition glow-green"
                        >
                            {t('startFree')}
                        </Link>
                        <Link
                            href="/docs"
                            className="w-full sm:w-auto border border-gray-700 hover:border-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition"
                        >
                            {t('viewDocs')}
                        </Link>
                    </div>

                    {/* Code Preview */}
                    <div className="max-w-2xl mx-auto bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                        <div className="flex items-center px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="ml-4 text-sm text-gray-500">{t('codeTitle')}</span>
                        </div>
                        <pre className="p-6 text-left text-sm md:text-base overflow-x-auto">
                            <code className="text-gray-300">
                                <span className="text-purple-400">curl</span> -X POST \<br />
                                &nbsp;&nbsp;{`https://api.yoursite.com/v1/messages`} \<br />
                                &nbsp;&nbsp;-H <span className="text-green-400">{`"Authorization: Bearer YOUR_API_KEY"`}</span> \<br />
                                &nbsp;&nbsp;-d <span className="text-yellow-400">{`'{"to": "+1234567890", "message": "Hello!"}'`}</span>
                            </code>
                        </pre>
                    </div>
                </div>
            </div>
        </section>
    );
}
