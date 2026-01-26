'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

type MessageType = 'text' | 'image' | 'video' | 'audio';

interface TestResult {
    success: boolean;
    message: string;
    messageId?: string;
    timestamp: string;
}

export default function TestPage() {
    const [apiKey, setApiKey] = useState("");
    const [phone, setPhone] = useState("");
    const [messageType, setMessageType] = useState<MessageType>("text");
    const [textContent, setTextContent] = useState("Hello from WhatsApp API! 👋");
    const [mediaUrl, setMediaUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [ptt, setPtt] = useState(false);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);
    const supabase = createClient();

    useEffect(() => {
        loadApiKey();
    }, []);

    const loadApiKey = async () => {
        const storedKey = localStorage.getItem('whatsapp_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    };

    const sendMessage = async () => {
        if (!phone.trim()) {
            alert("Please enter a phone number");
            return;
        }

        setSending(true);
        const timestamp = new Date().toLocaleTimeString();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("Not authenticated");
            }

            let endpoint = "/api/v1/messages";
            let body: any = { to: phone };

            switch (messageType) {
                case "text":
                    body.message = textContent;
                    break;
                case "image":
                case "video":
                    endpoint = "/api/v1/messages/media";
                    body.mediaUrl = mediaUrl;
                    body.mediaType = messageType;
                    body.caption = caption || undefined;
                    break;
                case "audio":
                    endpoint = "/api/v1/messages/audio";
                    body.audioUrl = mediaUrl;
                    body.ptt = ptt;
                    break;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                setResults(prev => [{
                    success: true,
                    message: `✅ ${messageType.toUpperCase()} sent! ID: ${data.id}`,
                    messageId: data.id,
                    timestamp
                }, ...prev]);
            } else {
                setResults(prev => [{
                    success: false,
                    message: `❌ Error: ${data.detail || "Unknown error"}`,
                    timestamp
                }, ...prev]);
            }
        } catch (error: any) {
            setResults(prev => [{
                success: false,
                message: `❌ Error: ${error.message}`,
                timestamp
            }, ...prev]);
        } finally {
            setSending(false);
        }
    };

    const sampleUrls = {
        image: "https://images.unsplash.com/photo-1531804055935-76f44d7c3621?w=800",
        video: "https://www.w3schools.com/html/mov_bbb.mp4",
        audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">🧪 Test Center</h1>
                <p className="text-gray-400">Test all message types from the Epic 2 implementation</p>
            </div>

            {/* Message Type Selector */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6">
                <h2 className="text-white font-semibold mb-4">Message Type</h2>
                <div className="grid grid-cols-4 gap-3">
                    {(['text', 'image', 'video', 'audio'] as MessageType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setMessageType(type)}
                            className={`p-4 rounded-lg border-2 transition ${messageType === type
                                    ? 'border-[#25D366] bg-[#25D366]/10 text-[#25D366]'
                                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                                }`}
                        >
                            <div className="text-2xl mb-1">
                                {type === 'text' && '💬'}
                                {type === 'image' && '🖼️'}
                                {type === 'video' && '🎬'}
                                {type === 'audio' && '🎵'}
                            </div>
                            <div className="text-sm font-medium capitalize">{type}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Message Form */}
            <div className="bg-gray-900 rounded-xl p-6 mb-6">
                <h2 className="text-white font-semibold mb-4">Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}</h2>

                <div className="space-y-4">
                    {/* Phone Number */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Phone Number *</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+33612345678"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                        />
                    </div>

                    {/* Text Message */}
                    {messageType === 'text' && (
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Message</label>
                            <textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none"
                            />
                        </div>
                    )}

                    {/* Media URL */}
                    {messageType !== 'text' && (
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">
                                {messageType === 'audio' ? 'Audio URL' : 'Media URL'} *
                            </label>
                            <input
                                type="url"
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                                placeholder="https://example.com/media.jpg"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                            />
                            <button
                                onClick={() => setMediaUrl(sampleUrls[messageType as keyof typeof sampleUrls])}
                                className="text-[#25D366] text-sm mt-2 hover:underline"
                            >
                                Use sample {messageType} URL
                            </button>
                        </div>
                    )}

                    {/* Caption for image/video */}
                    {(messageType === 'image' || messageType === 'video') && (
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Caption (optional)</label>
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Check this out! 🔥"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                            />
                        </div>
                    )}

                    {/* PTT for audio */}
                    {messageType === 'audio' && (
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="ptt"
                                checked={ptt}
                                onChange={(e) => setPtt(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-[#25D366] focus:ring-[#25D366]"
                            />
                            <label htmlFor="ptt" className="text-gray-300">
                                Send as Voice Note 🎙️ (PTT - Push to Talk)
                            </label>
                        </div>
                    )}

                    {/* Send Button */}
                    <button
                        onClick={sendMessage}
                        disabled={sending || !phone.trim() || (messageType !== 'text' && !mediaUrl.trim())}
                        className="w-full flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition"
                    >
                        {sending ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span>Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Log */}
            <div className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-semibold">Results Log</h2>
                    {results.length > 0 && (
                        <button
                            onClick={() => setResults([])}
                            className="text-gray-400 hover:text-white text-sm"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {results.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No messages sent yet. Send a test message to see results here.</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {results.map((result, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                                        {result.message}
                                    </span>
                                    <span className="text-gray-500 text-xs">{result.timestamp}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* API Info */}
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-gray-300 font-medium mb-2">📚 API Endpoints</h3>
                <div className="text-sm text-gray-400 space-y-1 font-mono">
                    <p>POST /api/v1/messages — Text messages</p>
                    <p>POST /api/v1/messages/media — Images & Videos</p>
                    <p>POST /api/v1/messages/audio — Audio & Voice Notes</p>
                </div>
            </div>
        </div>
    );
}
