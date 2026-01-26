import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function Footer() {
    const t = useTranslations('Footer');
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-950 border-t border-gray-800 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center space-x-2 mb-4">
                            <img
                                src="/logo-full.png"
                                alt="Wamux"
                                className="h-10 object-contain"
                            />
                        </Link>
                        <p className="text-gray-400 text-sm">
                            {t('disclaimer')}
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-semibold mb-4">{t('product')}</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="#features" className="hover:text-white transition">{t('features')}</a></li>
                            <li><a href="#pricing" className="hover:text-white transition">{t('pricing')}</a></li>
                            <li><Link href="/docs" className="hover:text-white transition">{t('docs')}</Link></li>
                            <li><Link href="/register" className="hover:text-white transition">{t('getStarted')}</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-semibold mb-4">{t('company')}</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="/about" className="hover:text-white transition">{t('about')}</a></li>
                            <li><a href="/blog" className="hover:text-white transition">{t('blog')}</a></li>
                            <li><a href="/contact" className="hover:text-white transition">{t('contact')}</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold mb-4">{t('legal')}</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="/privacy" className="hover:text-white transition">{t('privacy')}</a></li>
                            <li><a href="/terms" className="hover:text-white transition">{t('terms')}</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between">
                    <p className="text-gray-500 text-sm">
                        {t('copyright', { year: currentYear })}
                    </p>
                    <p className="text-gray-600 text-xs mt-2 md:mt-0">
                        {t('disclaimer')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
