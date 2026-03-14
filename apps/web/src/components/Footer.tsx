'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative border-t border-white/[0.04] bg-[#020617]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white/80">{t('footer.brand')}</span>
            </Link>
            <p className="text-[11px] text-slate-600 leading-relaxed">{t('footer.desc')}</p>
          </div>
          {/* Product */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('footer.product')}</h4>
            <div className="space-y-2">
              <Link href="/pricing" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('nav.pricing')}</Link>
              <Link href="/grid" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('nav.grid')}</Link>
              <Link href="/grid" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('grid.plazaTitle')}</Link>
            </div>
          </div>
          {/* Resources */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('footer.resources')}</h4>
            <div className="space-y-2">
              <Link href="/docs" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('nav.docs')}</Link>
              <Link href="/docs" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">Quick Start</Link>
              <Link href="/docs" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">API Reference</Link>
            </div>
          </div>
          {/* Account */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('nav.myAccount')}</h4>
            <div className="space-y-2">
              <Link href="/register" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('nav.register')}</Link>
              <Link href="/login" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('nav.login')}</Link>
              <Link href="/dashboard" className="block text-[12px] text-slate-500 hover:text-slate-300 transition-colors">{t('dashboard.title')}</Link>
            </div>
          </div>
        </div>
        <div className="h-px bg-white/[0.04] mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
          <span>© 2026 AlphaSentinel. {t('footer.rights')}.</span>
          <span className="text-slate-700">alphinel.com</span>
        </div>
      </div>
    </footer>
  );
}
