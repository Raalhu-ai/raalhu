import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { loadSettings, FONT_SIZES, setApiBase } from "@raalhu/shared";

// In dev, API requests go directly to the backend server.
// In production (same origin), the base is empty so relative URLs are used.
if (__DEV__) {
  setApiBase('http://localhost:3000');
}

export default function RootLayout() {
  useEffect(() => {
    const root = document.documentElement;

    // Set lang and dir on <html> — RTL for Thaana text and logical property flipping
    root.setAttribute('lang', 'dv');
    root.setAttribute('dir', 'rtl');

    // Google Analytics (inject once)
    if (!document.querySelector('script[src*="googletagmanager"]')) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-DM4QWKNCSF';
      document.head.appendChild(gaScript);
      const gaInit = document.createElement('script');
      gaInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-DM4QWKNCSF');`;
      document.head.appendChild(gaInit);
    }

    // Apply theme from settings (dark is default, .light class overrides)
    const settings = loadSettings();
    if (settings.theme === 'system') {
      const light = !window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('light', light);
    } else if (settings.theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }

    // Apply font size
    const px = FONT_SIZES[settings.fontSize];
    if (px) root.style.setProperty('--chat-font-size', px);

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const current = loadSettings();
      if (current.theme === 'system') {
        root.classList.toggle('light', !e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <>
      <Head>
        <title>ރާޅު</title>
        <meta name="description" content="ދިވެހި ބަހުގެ އެންމެ ކުޅަދާނަ އޭ.އައި" />
        <meta name="keywords" content="ރާޅު, raalhu, dhivehi ai, thaana ai, dhivehi, maldives ai, gemini, divehi, thaana, maldivian ai, ai tool" />
        <meta name="author" content="Elgius Espin" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://raalhu.ai" />

        {/* Theme */}
        <meta name="theme-color" content="#242526" />
        <meta name="color-scheme" content="dark" />
        <meta name="msapplication-TileColor" content="#242526" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://raalhu.ai" />
        <meta property="og:title" content="ރާޅު" />
        <meta property="og:description" content="ރާޅު އަކީ ދިވެހި ބަހަށް ޚާއްޞަ އޭ.އައި ޓޫލެވެ. ގޫގުލް ޖެމިނީ ގެ ބާރުގައި ދިވެހި ބަހުން ލިޔުން، ތަރުޖަމާ، ދިރާސާ — ހިލޭ." />
        <meta property="og:image" content="https://raalhu.ai/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="ރާޅު — ދިވެހި އޭ.އައި" />
        <meta property="og:locale" content="dv_MV" />
        <meta property="og:site_name" content="ރާޅު" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://raalhu.ai" />
        <meta name="twitter:title" content="ރާޅު" />
        <meta name="twitter:description" content="ރާޅު އަކީ ދިވެހި ބަހަށް ޚާއްޞަ އޭ.އައި ޓޫލެވެ. ގޫގުލް ޖެމިނީ ގެ ބާރުގައި ދިވެހި ބަހުން ލިޔުން، ތަރުޖަމާ، ދިރާސާ — ހިލޭ." />
        <meta name="twitter:image" content="https://raalhu.ai/og-image.png" />
        <meta name="twitter:image:alt" content="ރާޅު — ދިވެހި އޭ.އައި" />

        {/* Apple iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ރާޅު" />
      </Head>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "rgb(var(--background))" },
        }}
      />
    </>
  );
}
