import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '../lib/query';
import { ServiceWorkerRegister } from './sw-register';
import { OfflineBanner } from './offline-banner';
import { AccountNav } from './account-nav';
import { MigrationBoot } from './migration-boot';
import { EssentialCookieBanner } from './essential-cookies';
import { getTranslator, getServerLocale } from '../lib/i18n-server';
import { LocaleProvider } from '../lib/i18n-client';
import { direction as directionFor, t as translate, type MessageKey } from '@emrooz/i18n';
import type { Locale } from '@emrooz/i18n';

const SITE = 'https://emroozapp.com';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  const appName = t('app.name');
  const tagline = t('app.tagline');
  const heroTitle = `${appName} — ${tagline}`;
  const description = t('landing.hero.subtitle');
  return {
    metadataBase: new URL(SITE),
    title: {
      default: heroTitle,
      template: `%s · ${appName}`,
    },
    description,
    applicationName: appName,
    openGraph: {
      title: heroTitle,
      description,
      url: SITE,
      siteName: appName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: heroTitle,
    },
    manifest: '/manifest.webmanifest',
    icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
  };
}

export const viewport: Viewport = {
  themeColor: '#254D32',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const { t } = await getTranslator();
  const htmlLang = locale === 'fa-AF' ? 'fa-AF' : locale;
  const htmlDir = directionFor(locale);
  return (
    <html
      lang={htmlLang}
      dir={htmlDir}
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      {/*
       * suppressHydrationWarning: browser extensions (ColorZilla, Grammarly,
       * LastPass, etc.) inject attributes on <html>/<body> before React hydrates.
       * The document tree itself is server-rendered deterministically.
       */}
      <body className="min-h-screen text-ink antialiased" suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <QueryProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-card"
            >
              {t('nav.skipToContent')}
            </a>
            <OfflineBanner />
            <SiteHeader locale={locale} />
            <main id="main" className="min-h-[calc(100vh-72px)]">
              {children}
            </main>
            <SiteFooter locale={locale} />
            <ServiceWorkerRegister />
            <MigrationBoot />
            <EssentialCookieBanner />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

function tr(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  return translate(locale, key, params);
}

function SiteHeader({ locale }: { locale: Locale }) {
  const appName = tr(locale, 'app.name');
  const dir = directionFor(locale);
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/60 bg-cream-50/80 backdrop-blur supports-[backdrop-filter]:bg-cream-50/60">
      <div className="mx-auto max-w-6xl px-4 h-[72px] flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-emerald-700 focus-ring"
          aria-label={`${appName} — Home`}
        >
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-700 text-cream-50 shadow-card">
            <EmroozMark />
          </span>
          <span className="font-display text-2xl leading-none tracking-tight">{appName}</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-1 text-sm text-ink-700"
        >
          <NavLink href="/app">{tr(locale, 'nav.today')}</NavLink>
          <NavLink href="/discover">{tr(locale, 'nav.discover')}</NavLink>
          <NavLink href="/cuisines">{tr(locale, 'nav.cuisines')}</NavLink>
          <NavLink href="/pantry">{tr(locale, 'nav.pantry')}</NavLink>
          <NavLink href="/planner">{tr(locale, 'nav.planner')}</NavLink>
          <NavLink href="/favorites">{tr(locale, 'nav.favorites')}</NavLink>
          <MoreMenu locale={locale} />
          <AccountNav />
        </nav>

        <details className="md:hidden relative">
          <summary
            className="list-none inline-flex items-center gap-1 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm focus-ring"
            aria-label={tr(locale, 'nav.menu')}
          >
            {tr(locale, 'nav.menu')}
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-card border border-ink-100 p-2 text-sm">
            <MobileLink href="/app" primary>
              {tr(locale, 'nav.today')} {dir === 'rtl' ? '←' : '→'}
            </MobileLink>
            <div className="my-1 h-px bg-ink-100" />
            <MobileLink href="/discover">{tr(locale, 'nav.discover')}</MobileLink>
            <MobileLink href="/cuisines">{tr(locale, 'nav.cuisines')}</MobileLink>
            <MobileLink href="/pantry">{tr(locale, 'nav.pantry')}</MobileLink>
            <MobileLink href="/planner">{tr(locale, 'nav.planner')}</MobileLink>
            <MobileLink href="/favorites">{tr(locale, 'nav.favorites')}</MobileLink>
            <MobileLink href="/shopping-list">{tr(locale, 'nav.shoppingList')}</MobileLink>
            <MobileLink href="/history">{tr(locale, 'nav.history')}</MobileLink>
            <div className="my-1 h-px bg-ink-100" />
            <MobileLink href="/settings">{tr(locale, 'nav.settings')}</MobileLink>
            <MobileLink href="/auth/sign-in">{tr(locale, 'action.signIn')}</MobileLink>
            <MobileLink href="/auth/sign-up">{tr(locale, 'action.signUp')}</MobileLink>
          </div>
        </details>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition focus-ring"
    >
      {children}
    </Link>
  );
}

/**
 * Overflow menu for the desktop nav. Keeps the primary bar uncluttered
 * while still surfacing every top-level page. Uses <details>/<summary>
 * so it works without JavaScript and closes on Escape via the browser.
 */
function MoreMenu({ locale }: { locale: Locale }) {
  return (
    <details className="relative">
      <summary
        className="list-none px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition focus-ring cursor-pointer inline-flex items-center gap-1"
        aria-label={tr(locale, 'nav.more')}
      >
        {tr(locale, 'nav.more')}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="absolute right-0 mt-1 w-56 rounded-xl bg-white shadow-pop border border-ink-100 p-1 z-20 text-sm">
        <MoreLink href="/shopping-list">{tr(locale, 'nav.shoppingList')}</MoreLink>
        <MoreLink href="/history">{tr(locale, 'nav.history')}</MoreLink>
        <MoreLink href="/settings">{tr(locale, 'nav.settings')}</MoreLink>
      </div>
    </details>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-ink-700 hover:bg-emerald-50 hover:text-emerald-700 focus-ring"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  children,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg focus-ring ${
        primary ? 'text-emerald-700 font-medium' : 'text-ink-700 hover:bg-emerald-50'
      }`}
    >
      {children}
    </Link>
  );
}

function SiteFooter({ locale }: { locale: Locale }) {
  const appName = tr(locale, 'app.name');
  const tagline = tr(locale, 'app.tagline');
  return (
    <footer className="mt-20 border-t border-ink-100/60 bg-cream-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-700 text-cream-50">
              <EmroozMark />
            </span>
            <span className="font-display text-xl">{appName}</span>
          </div>
          <p className="mt-3 max-w-md text-sm text-ink-500">
            {tr(locale, 'landing.footer.brandBody')}
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-400 font-medium">
            {tr(locale, 'landing.footer.product')}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/app" className="hover:text-emerald-700 focus-ring">
                {tr(locale, 'nav.openApp')}
              </Link>
            </li>
            <li>
              <Link href="/discover" className="hover:text-emerald-700 focus-ring">
                {tr(locale, 'nav.discover')}
              </Link>
            </li>
            <li>
              <Link href="/cuisines" className="hover:text-emerald-700 focus-ring">
                {tr(locale, 'nav.cuisines')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-400 font-medium">
            {tr(locale, 'landing.footer.legal')}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="hover:text-emerald-700 focus-ring">
                {tr(locale, 'landing.footer.privacy')}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-emerald-700 focus-ring">
                {tr(locale, 'landing.footer.terms')}
              </Link>
            </li>
            <li>
              <Link href="/imprint" className="hover:text-emerald-700 focus-ring">
                {tr(locale, 'landing.footer.imprint')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100/60 py-4">
        <div className="mx-auto max-w-6xl px-4 text-xs text-ink-400 flex flex-wrap gap-2 justify-between">
          <span>
            {tr(locale, 'landing.footer.copyright', {
              year: new Date().getFullYear(),
              app: appName,
              tagline,
            })}
          </span>
          <span>{tr(locale, 'landing.footer.tagline')}</span>
        </div>
      </div>
    </footer>
  );
}

function EmroozMark() {
  // Compact "e" monogram for use in the header + footer at ~18px.
  // At this size we drop the pencil-wobble filter and warmth dots that the
  // 1024px master carries — they read as noise below ~40px. The essential
  // shape (open C-body + crossbar + saffron accent dot) survives cleanly.
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 9.4C17.5 6.6 15 4.8 12 4.8C8.5 4.8 5.5 7 5.5 10.8C5.5 14.5 8 17 11.5 17C13.9 17 15.6 16 17 14.4"
        stroke="#254D32"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M6 11.2 L17.6 11" stroke="#254D32" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="20.4" r="1.1" fill="#F4A261" />
    </svg>
  );
}
