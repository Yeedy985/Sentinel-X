import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AlphaSentinel | 加密市场智能扫描服务',
  description: '基于 300 信号矩阵的 AI 驱动加密市场舆情监控与预警系统 · alphinel.com',
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
        {children}
      </body>
    </html>
  );
}
