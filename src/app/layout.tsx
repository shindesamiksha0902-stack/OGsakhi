import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'OGsakhi (सखी) — AI-Powered Period, BP & Wellness Companion',
  description:
    'A personal wellness companion for cycle tracking, blood pressure logs, daily holistic check-ins, and safety-aware AI insights.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OGsakhi',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-[#faf8f5] text-slate-800 antialiased touch-manipulation overscroll-none select-none">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
