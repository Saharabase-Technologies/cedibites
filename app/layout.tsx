import type { Metadata, Viewport } from "next";
import Script from 'next/script';
import { Cabin, Caprasimo, Manrope, Montserrat } from 'next/font/google';
import localFont from 'next/font/local';
import "./globals.css";
import { LocationProvider } from "./components/providers/LocationProvider";
import { BranchProvider } from "./components/providers/BranchProvider";
import { OrderStoreProvider } from "./components/providers/OrderStoreProvider";
import { QueryProvider } from "./components/providers/QueryProvider";
import { RouterInitializer } from "./components/providers/RouterInitializer";
import { FeedbackCapture } from "./components/feedback/feedback-capture";
import { FeedbackWidget } from "./components/feedback/feedback-widget";
import { FEATURES } from "@/lib/constants/features";
import { ThemeProvider } from "./components/providers/ThemeProvider";

const caprasimo = Caprasimo({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-caprasimo',
  display: 'swap',
});

const cabin = Cabin({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cabin',
  display: 'swap',
});

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const abeezee = localFont({
  src: [
    { path: '../fonts/ABeeZee-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/ABeeZee-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-abeezee',
  display: 'swap',
});

// ── Customer brand faces ────────────────────────────────────────────────────
// Montserrat stands in for Mont, the brand's body face. Only two demo weights
// of Mont are licensed, so the full family is not shippable. Swap it here when
// the licence lands: nothing else references the family by name.
const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

// American Captain is all-caps and condensed. It carries the wordmark and
// section headers on the customer side, never item names or body copy.
const americanCaptain = localFont({
  src: [{ path: '../fonts/AmericanCaptain.ttf', weight: '400', style: 'normal' }],
  variable: '--font-american-captain',
  display: 'swap',
});

/**
 * There was no viewport export at all, while appleWebApp.statusBarStyle was
 * already set to black-translucent. Installed to a home screen, that puts the
 * page under the iPhone clock with nothing compensating for it. viewportFit
 * cover is what makes env(safe-area-inset-*) report real numbers, and --nav-h
 * folds the top inset in for every screen.
 *
 * No maximumScale and no userScalable: pinch zoom stays available.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // One value: the app is light whatever the phone is set to, so offering the
  // browser a dark chrome colour would put a dark status bar over a light page.
  themeColor: '#fafafa',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://app.cedibites.com'),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CediBites',
  },
  title: {
    template: '%s | CediBites',
    default: 'CediBites | Authentic Ghanaian Food Delivery',
  },
  description:
    'Order authentic Ghanaian dishes online: jollof rice, waakye, kelewele, soups and more. Delivered fresh to your door across Ghana.',
  openGraph: {
    type: 'website',
    siteName: 'CediBites',
    locale: 'en_GH',
    url: 'https://app.cedibites.com',
    title: 'CediBites | Authentic Ghanaian Food Delivery',
    description: 'Order authentic Ghanaian dishes online, delivered fresh.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'CediBites' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CediBites | Authentic Ghanaian Food Delivery',
    description: 'Order authentic Ghanaian dishes online, delivered fresh.',
    images: ['/og-default.png'],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION ?? '',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // next-themes writes the `.dark` class onto <html> before paint, so the
    // hydration warning has to be suppressed here rather than on <body>.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cabin.variable} ${manrope.variable} ${caprasimo.variable} ${montserrat.variable} ${americanCaptain.variable} bg-bg antialiased`}
    >
      <body className={abeezee.variable}>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          strategy="afterInteractive"
        />
        <ThemeProvider>
          <QueryProvider>
            <RouterInitializer />
            {FEATURES.feedback && <FeedbackCapture />}
            <LocationProvider autoRequest={false}>
              <BranchProvider>
                <OrderStoreProvider>
                  {children}
                  {FEATURES.feedback && <FeedbackWidget />}
                </OrderStoreProvider>
              </BranchProvider>
            </LocationProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}