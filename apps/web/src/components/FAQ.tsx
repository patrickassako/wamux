"use client";
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function FAQ() {
    const t = useTranslations('FAQ');
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const questions = [
        { q: t('q1'), a: t('a1') },
        { q: t('q2'), a: t('a2') },
        { q: t('q3'), a: t('a3') },
        { q: t('q4'), a: t('a4') },
    ];

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-20 px-4 bg-black">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('title')}</h2>
                    <p className="text-xl text-gray-400">{t('subtitle')}</p>
                </div>

                <div className="space-y-4">
                    {questions.map((item, index) => (
                        <div key={index} className="border border-gray-800 rounded-xl bg-gray-900/50 overflow-hidden">
                            <button
                                onClick={() => toggle(index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                            >
                                <span className="text-lg font-semibold">{item.q}</span>
                                <span className={`transform transition-transform duration-300 text-[#25D366] ${openIndex === index ? 'rotate-180' : ''}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            <div
                                className={`transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100 p-6 pt-0' : 'max-h-0 opacity-0 p-0 overflow-hidden'
                                    }`}
                            >
                                <p className="text-gray-400 leading-relaxed border-t border-gray-800 pt-4">
                                    {item.a}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
