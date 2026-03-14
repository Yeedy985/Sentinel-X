import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'AlphaSentinel | AI Crypto Market Intelligence',
  description: 'AI-driven crypto market sentiment monitoring & alert system with 300+ signal matrix · alphinel.com',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  themeColor: '#0a0e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
