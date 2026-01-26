"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";

export default function LanguageSelector() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);

    const onSelectChange = (nextLocale: string) => {
        setIsOpen(false);
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    const languages = [
        { code: "en", label: "English", flag: "🇺🇸" },
        { code: "fr", label: "Français", flag: "🇫🇷" },
    ];

    const currentLanguage = languages.find((l) => l.code === locale) || languages[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 transition border border-gray-700"
            >
                <span>{currentLanguage.flag}</span>
                <span className="hidden sm:inline">{currentLanguage.label}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 py-2">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => onSelectChange(lang.code)}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-3 hover:bg-gray-800 transition ${locale === lang.code ? "text-[#25D366] bg-gray-800/50" : "text-gray-300"
                                    }`}
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                                {locale === lang.code && (
                                    <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
