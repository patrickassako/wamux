import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const endpoints = [
    // Sessions
    {
        method: "POST",
        path: "/api/v1/sessions",
        description: "Create a new WhatsApp session",
        category: "Sessions",
    },
    {
        method: "GET",
        path: "/api/v1/sessions",
        description: "List all your sessions",
        category: "Sessions",
    },
    {
        method: "GET",
        path: "/api/v1/sessions/{id}",
        description: "Get session details",
        category: "Sessions",
    },
    {
        method: "GET",
        path: "/api/v1/sessions/{id}/stream",
        description: "SSE stream for QR code updates",
        category: "Sessions",
    },
    {
        method: "PATCH",
        path: "/api/v1/sessions/{id}",
        description: "Update session name",
        category: "Sessions",
    },
    {
        method: "DELETE",
        path: "/api/v1/sessions/{id}",
        description: "Delete a session",
        category: "Sessions",
    },
    // Messages
    {
        method: "POST",
        path: "/api/v1/messages",
        description: "Send a text message",
        category: "Messages",
    },
    {
        method: "POST",
        path: "/api/v1/messages/media",
        description: "Send an image or video",
        category: "Messages",
    },
    {
        method: "POST",
        path: "/api/v1/messages/audio",
        description: "Send audio or voice note",
        category: "Messages",
    },
    {
        method: "GET",
        path: "/api/v1/messages",
        description: "List sent messages",
        category: "Messages",
    },
    {
        method: "GET",
        path: "/api/v1/messages/{id}",
        description: "Get message status",
        category: "Messages",
    },
    // API Keys
    {
        method: "POST",
        path: "/api/v1/keys",
        description: "Create a new API key",
        category: "API Keys",
    },
    {
        method: "GET",
        path: "/api/v1/keys",
        description: "List all your API keys",
        category: "API Keys",
    },
    {
        method: "DELETE",
        path: "/api/v1/keys/{id}",
        description: "Revoke an API key",
        category: "API Keys",
    },
];

export default function DocsPage() {
    return (
        <>
            <Header />
            <main className="pt-24 pb-16 px-4 min-h-screen bg-gray-950">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="text-4xl font-bold text-white mb-4">API Documentation</h1>
                        <p className="text-xl text-gray-400">
                            Everything you need to integrate WhatsApp messaging into your application.
                        </p>
                    </div>

                    {/* Quick Start */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Quick Start</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                            <div className="flex items-center px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="ml-4 text-sm text-gray-500">Send your first message</span>
                            </div>
                            <pre className="p-6 text-sm overflow-x-auto">
                                <code className="text-gray-300">
                                    <span className="text-purple-400">curl</span> -X POST \<br />
                                    &nbsp;&nbsp;<span className="text-gray-500">https://api.yoursite.com/api/v1/messages</span> \<br />
                                    &nbsp;&nbsp;-H <span className="text-green-400">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> \<br />
                                    &nbsp;&nbsp;-H <span className="text-green-400">&quot;Content-Type: application/json&quot;</span> \<br />
                                    &nbsp;&nbsp;-d <span className="text-yellow-400">{`'{"to": "+237XXXXXXXXX", "message": "Hello!"}'`}</span>
                                </code>
                            </pre>
                        </div>
                    </section>

                    {/* Authentication */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Authentication</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
                            <p className="text-gray-300 mb-4">
                                All API requests require authentication using a Bearer token. Generate your API key from the dashboard.
                            </p>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <code className="text-green-400">
                                    Authorization: Bearer your_api_key_here
                                </code>
                            </div>
                        </div>
                    </section>

                    {/* Endpoints */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">API Endpoints</h2>

                        {["Sessions", "Messages", "API Keys"].map((category) => (
                            <div key={category} className="mb-8">
                                <h3 className="text-xl font-semibold text-white mb-4">{category}</h3>
                                <div className="space-y-3">
                                    {endpoints
                                        .filter((e) => e.category === category)
                                        .map((endpoint, index) => (
                                            <div
                                                key={index}
                                                className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between hover:border-gray-700 transition"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-mono font-bold ${endpoint.method === "GET"
                                                            ? "bg-blue-500/20 text-blue-400"
                                                            : endpoint.method === "POST"
                                                                ? "bg-green-500/20 text-green-400"
                                                                : endpoint.method === "DELETE"
                                                                    ? "bg-red-500/20 text-red-400"
                                                                    : "bg-yellow-500/20 text-yellow-400"
                                                            }`}
                                                    >
                                                        {endpoint.method}
                                                    </span>
                                                    <code className="text-gray-300 font-mono text-sm">{endpoint.path}</code>
                                                </div>
                                                <span className="text-gray-500 text-sm hidden md:block">{endpoint.description}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Send Text Message */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Send Text Message</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Request</h3>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-green-500/10 border-b border-gray-700">
                                        <span className="text-sm text-green-400">POST /api/v1/messages</span>
                                    </div>
                                    <pre className="p-4 text-sm overflow-x-auto">
                                        <code className="text-gray-300">{`{
  "to": "+237612345678",
  "message": "Hello from WhatsApp API!"
}`}</code>
                                    </pre>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Response (202)</h3>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                                        <span className="text-sm text-gray-400">application/json</span>
                                    </div>
                                    <pre className="p-4 text-sm overflow-x-auto">
                                        <code className="text-gray-300">{`{
  "id": "uuid",
  "toPhone": "+237612345678",
  "type": "text",
  "status": "pending"
}`}</code>
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Send Image/Video */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Send Image or Video</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Request</h3>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-green-500/10 border-b border-gray-700">
                                        <span className="text-sm text-green-400">POST /api/v1/messages/media</span>
                                    </div>
                                    <pre className="p-4 text-sm overflow-x-auto">
                                        <code className="text-gray-300">{`{
  "to": "+237612345678",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "image",
  "caption": "Check this out!"
}`}</code>
                                    </pre>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Supported Formats</h3>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">🖼️ Images</span>
                                        <span className="text-gray-500 text-sm">JPEG, PNG, WebP, GIF (16MB)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-300">🎬 Videos</span>
                                        <span className="text-gray-500 text-sm">MP4, 3GPP, MOV, WebM (64MB)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Send Audio */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Send Audio or Voice Note</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Request</h3>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-green-500/10 border-b border-gray-700">
                                        <span className="text-sm text-green-400">POST /api/v1/messages/audio</span>
                                    </div>
                                    <pre className="p-4 text-sm overflow-x-auto">
                                        <code className="text-gray-300">{`{
  "to": "+237612345678",
  "audioUrl": "https://example.com/voice.ogg",
  "ptt": true
}`}</code>
                                    </pre>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">PTT (Push to Talk)</h3>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <code className="text-green-400">ptt: true</code>
                                        <span className="text-gray-400">→ Voice Note 🎙️</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <code className="text-yellow-400">ptt: false</code>
                                        <span className="text-gray-400">→ Audio File 🎵</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Formats: MP3, OGG, AAC, WAV, Opus (max 16MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Session Management */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Session Management</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-white font-semibold mb-2">1. Create Session</h4>
                                    <pre className="bg-gray-800 rounded-lg p-3 text-sm">
                                        <code className="text-gray-300">{`POST /api/v1/sessions
{ "session_key": "my-session" }`}</code>
                                    </pre>
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-2">2. Scan QR Code</h4>
                                    <p className="text-gray-400 text-sm mb-2">
                                        Connect to the SSE stream to receive QR code updates:
                                    </p>
                                    <pre className="bg-gray-800 rounded-lg p-3 text-sm">
                                        <code className="text-gray-300">{`GET /api/v1/sessions/{id}/stream
Events: qr, connected, error`}</code>
                                    </pre>
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-2">3. Send Messages</h4>
                                    <p className="text-gray-400 text-sm">
                                        Once connected, you can send messages using the Messages endpoints.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Rate Limits */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Rate Limits</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-gray-800">
                                        <th className="pb-3">Plan</th>
                                        <th className="pb-3">Sessions</th>
                                        <th className="pb-3">Messages/day</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    <tr className="border-b border-gray-800">
                                        <td className="py-3">Free</td>
                                        <td className="py-3">10</td>
                                        <td className="py-3">100</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3">Pro</td>
                                        <td className="py-3">Unlimited</td>
                                        <td className="py-3">10,000</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Error Codes */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Error Codes</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                                    <code className="text-red-400">401 Unauthorized</code>
                                    <span className="text-gray-400 text-sm">Invalid or missing API key</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                                    <code className="text-red-400">404 Not Found</code>
                                    <span className="text-gray-400 text-sm">Session or resource not found</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                                    <code className="text-yellow-400">409 Conflict</code>
                                    <span className="text-gray-400 text-sm">Session not connected</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <code className="text-yellow-400">429 Too Many Requests</code>
                                    <span className="text-gray-400 text-sm">Rate limit exceeded</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <div className="bg-gradient-to-r from-[#25D366]/20 to-gray-900 border border-[#25D366]/30 rounded-xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
                        <p className="text-gray-400 mb-6">Create your free account and start sending WhatsApp messages in minutes.</p>
                        <Link
                            href="/register"
                            className="inline-block bg-[#25D366] hover:bg-[#20bd5a] text-white px-8 py-3 rounded-lg font-semibold transition"
                        >
                            Create Free Account
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
