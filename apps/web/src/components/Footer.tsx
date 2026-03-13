import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-6 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-4">
          <span>© 2026 AlphaSentinel</span>
          <Link href="/grid" className="hover:text-slate-400 transition-colors">网格量化</Link>
          <Link href="/pricing" className="hover:text-slate-400 transition-colors">AI 扫描</Link>
          <Link href="/docs" className="hover:text-slate-400 transition-colors">API 文档</Link>
        </div>
        <span>alphinel.com</span>
      </div>
    </footer>
  );
}
