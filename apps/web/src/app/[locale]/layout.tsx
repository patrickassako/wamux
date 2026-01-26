import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Wamux - Simple WhatsApp Automation for Developers",
  description: "Wamux is the reliable WhatsApp API gateway for developers and SaaS builders. Simple, modern, and built for scale.",
  keywords: ["Wamux", "WhatsApp API", "WhatsApp Gateway", "WhatsApp messaging", "API", "automation", "Wamux API"],
  openGraph: {
    title: "Wamux - Modern WhatsApp API",
    description: "Simple, reliable WhatsApp automation for developers",
    type: "website",
  },
  icons: {
    icon: "/logo-icon.jpg",
  },
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased bg-gray-950 text-white">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
