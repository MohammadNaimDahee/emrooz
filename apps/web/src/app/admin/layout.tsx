import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '../../lib/admin-guard';

export const metadata: Metadata = {
  title: { default: 'Admin · Emrooz', template: '%s · Admin · Emrooz' },
  robots: { index: false, follow: false },
};

const NAV: { href: string; label: string; hint: string }[] = [
  { href: '/admin', label: 'Overview', hint: 'Dashboard and health' },
  { href: '/admin/recipes', label: 'Recipes', hint: 'Draft, review, publish' },
  { href: '/admin/ingredients', label: 'Ingredients', hint: 'Catalogue + aliases' },
  { href: '/admin/cuisines', label: 'Cuisines', hint: 'Global taxonomy' },
  { href: '/admin/imports', label: 'Imports', hint: 'Provider ingest review' },
  { href: '/admin/providers', label: 'Providers', hint: 'Keys, terms, health' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start rounded-2xl bg-white shadow-card border border-ink-100 p-3">
        <div className="px-3 pt-2 pb-3">
          <div className="text-xs uppercase tracking-widest text-ink-400">Admin</div>
          <div className="mt-1 text-sm text-ink-900 font-medium truncate">{gate.email ?? gate.userId}</div>
          <div className="text-xs text-emerald-700 mt-0.5 uppercase tracking-widest">{gate.role}</div>
        </div>
        <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-lg px-3 py-2 hover:bg-emerald-50 focus-ring transition"
            >
              <div className="text-sm text-ink-900 group-hover:text-emerald-700 font-medium">
                {item.label}
              </div>
              <div className="text-xs text-ink-400">{item.hint}</div>
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-ink-100 pt-3 px-3">
          <Link
            href="/app"
            className="text-sm text-ink-500 hover:text-emerald-700 focus-ring"
          >
            ← Back to the app
          </Link>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
