import { useTranslations } from 'next-intl';

export default function Features() {
    const t = useTranslations('Features');

    const messageTypes = [
        { name: t('textTitle'), desc: t('textDesc'), icon: '💬' },
        { name: t('imageTitle'), desc: t('imageDesc'), icon: '🖼️' },
        { name: t('docTitle'), desc: t('docDesc'), icon: '📄' },
        { name: t('voiceTitle'), desc: t('voiceDesc'), icon: '🎤' },
        { name: t('contactTitle'), desc: t('contactDesc'), icon: '👤' },
        { name: t('locationTitle'), desc: t('locationDesc'), icon: '📍' },
    ];

    const senderTypes = [
        { name: t('usersTitle'), desc: t('usersDesc'), icon: '👤' },
        { name: t('groupsTitle'), desc: t('groupsDesc'), icon: '👥' },
        { name: t('channelsTitle'), desc: t('channelsDesc'), icon: '📢' },
    ];

    return (
        <section className="py-20 px-4 bg-black">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('title')}</h2>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">{t('subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    {/* Message Types */}
                    <div>
                        <h3 className="text-2xl font-bold mb-8 flex items-center">
                            <span className="w-2 h-8 bg-[#25D366] mr-4 rounded-full"></span>
                            {t('messageTypesTitle')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {messageTypes.map((type, index) => (
                                <div key={index} className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-gray-600 transition">
                                    <div className="text-3xl mb-4">{type.icon}</div>
                                    <h4 className="font-bold mb-2">{type.name}</h4>
                                    <p className="text-sm text-gray-400">{type.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sender Types & Visual */}
                    <div>
                        <h3 className="text-2xl font-bold mb-8 flex items-center">
                            <span className="w-2 h-8 bg-blue-500 mr-4 rounded-full"></span>
                            {t('senderTypesTitle')}
                        </h3>
                        <div className="grid grid-cols-1 gap-6 mb-12">
                            {senderTypes.map((type, index) => (
                                <div key={index} className="bg-gray-900 border border-gray-800 p-6 rounded-xl flex items-center hover:border-gray-600 transition">
                                    <div className="text-3xl mr-6">{type.icon}</div>
                                    <div>
                                        <h4 className="font-bold mb-1">{type.name}</h4>
                                        <p className="text-sm text-gray-400">{type.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chat UI Mockup */}
                        <div className="bg-[#0b141a] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                            <div className="bg-[#202c33] px-4 py-3 flex items-center border-b border-gray-700">
                                <div className="w-8 h-8 rounded-full bg-gray-500 mr-3"></div>
                                <div className="text-gray-200 text-sm font-semibold">Demo User</div>
                            </div>
                            <div className="p-4 space-y-4 font-sans text-sm h-64 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                <div className="flex justify-end">
                                    <div className="bg-[#005c4b] text-[#e9edef] p-2 rounded-lg rounded-tr-none px-3 max-w-[80%] shadow-sm">
                                        Hi, how are you?
                                        <span className="text-[10px] text-[#8696a0] ml-2 block text-right mt-1">10:22</span>
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="bg-[#202c33] text-[#e9edef] p-2 rounded-lg rounded-tl-none px-3 max-w-[80%] shadow-sm">
                                        Fine, how are you?
                                        <span className="text-[10px] text-[#8696a0] ml-2 block text-right mt-1">10:23</span>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <div className="bg-[#005c4b] text-[#e9edef] p-2 rounded-lg rounded-tr-none px-3 max-w-[80%] shadow-sm">
                                        Check out this view! 📸
                                        <span className="text-[10px] text-[#8696a0] ml-2 block text-right mt-1">10:24</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
