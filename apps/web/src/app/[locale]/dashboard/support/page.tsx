"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function SupportPage() {
    const [formData, setFormData] = useState({
        subject: "",
        category: "general",
        message: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Please log in to submit a support request");
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/support/ticket`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSubmitted(true);
                setFormData({ subject: "", category: "general", message: "" });
            } else {
                const data = await response.json();
                console.error('Support ticket error:', data);
                // Handle Pydantic validation errors
                if (data.detail && Array.isArray(data.detail)) {
                    const errors = data.detail.map((err: any) =>
                        `${err.loc.join('.')}: ${err.msg}`
                    ).join(', ');
                    setError(errors);
                } else {
                    setError(data.detail || "Failed to submit ticket");
                }
            }
        } catch (err) {
            console.error('Support submission error:', err);
            setError("An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-white mb-2">Need Help?</h1>
            <p className="text-gray-400 mb-8">
                Get support from our team. We'll respond within 24 hours.
            </p>

            {submitted && (
                <div className="bg-[#25D366]/10 border border-[#25D366] rounded-xl p-4 mb-6">
                    <h3 className="text-[#25D366] font-semibold">Ticket Submitted!</h3>
                    <p className="text-gray-300 text-sm mt-1">
                        We've received your support request and will get back to you soon.
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-xl p-4 mb-6">
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Quick Links */}
                <div className="lg:col-span-1">
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4">Quick Links</h2>

                        <a
                            href="/docs"
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800/50 transition mb-2"
                        >
                            <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <div>
                                <p className="text-white text-sm font-medium">Documentation</p>
                                <p className="text-gray-400 text-xs">API guides & tutorials</p>
                            </div>
                        </a>

                        <a
                            href="mailto:support@wamux.com"
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800/50 transition mb-2"
                        >
                            <svg className="w-5 h-5 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <div>
                                <p className="text-white text-sm font-medium">Email Support</p>
                                <p className="text-gray-400 text-xs">support@wamux.com</p>
                            </div>
                        </a>

                        <a
                            href="https://wa.me/237XXXXXXXXX"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800/50 transition"
                        >
                            <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <div>
                                <p className="text-white text-sm font-medium">WhatsApp</p>
                                <p className="text-gray-400 text-xs">Chat with us</p>
                            </div>
                        </a>
                    </div>

                    <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mt-4">
                        <h2 className="text-white font-semibold mb-3">Response Time</h2>
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="w-2 h-2 bg-[#25D366] rounded-full"></span>
                            <span className="text-gray-400">Usually within 24h</span>
                        </div>
                    </div>
                </div>

                {/* Support Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-[#111] border border-gray-800 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-6">Submit a Support Ticket</h2>

                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#25D366]"
                                required
                            >
                                <option value="general">General Question</option>
                                <option value="technical">Technical Issue</option>
                                <option value="billing">Billing & Subscription</option>
                                <option value="api">API Integration</option>
                                <option value="feature">Feature Request</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Subject
                            </label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#25D366]"
                                placeholder="Brief description of your issue"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Message
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#25D366] min-h-[200px]"
                                placeholder="Describe your issue in detail..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Submitting..." : "Submit Ticket"}
                        </button>
                    </form>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <h2 className="text-white font-semibold mb-4">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer p-4 bg-[#0a0a0a] rounded-lg">
                            <span className="text-white">How do I get my API key?</span>
                            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <p className="p-4 text-gray-400 text-sm">
                            Go to Dashboard → Settings. Your API key will be displayed there. Keep it secure!
                        </p>
                    </details>

                    <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer p-4 bg-[#0a0a0a] rounded-lg">
                            <span className="text-white">How do I upgrade my subscription?</span>
                            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <p className="p-4 text-gray-400 text-sm">
                            Visit the Billing page in your dashboard and select the plan you want to upgrade to.
                        </p>
                    </details>

                    <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer p-4 bg-[#0a0a0a] rounded-lg">
                            <span className="text-white">What payment methods do you accept?</span>
                            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <p className="p-4 text-gray-400 text-sm">
                            We accept credit/debit cards and Mobile Money via Flutterwave (MTN, Orange Money, etc.).
                        </p>
                    </details>

                    <details className="group">
                        <summary className="flex justify-between items-center cursor-pointer p-4 bg-[#0a0a0a] rounded-lg">
                            <span className="text-white">How do I cancel my subscription?</span>
                            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <p className="p-4 text-gray-400 text-sm">
                            Contact our support team via this form or email us at support@wamux.com to cancel your subscription.
                        </p>
                    </details>
                </div>
            </div>
        </div>
    );
}
