import type { Metadata } from "next";
import Script from 'next/script';
import { Cabin, Caprasimo } from 'next/font/google';
import localFont from 'next/font/local';
import "./globals.css";
import { LocationProvider } from "./components/providers/LocationProvider";
import { BranchProvider } from "./components/providers/BranchProvider";
import { OrderStoreProvider } from "./components/providers/OrderStoreProvider";
import { QueryProvider } from "./components/providers/QueryProvider";
import { RouterInitializer } from "./components/providers/RouterInitializer";

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

const abeezee = localFont({
  src: [
    { path: '../fonts/ABeeZee-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/ABeeZee-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-abeezee',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://app.cedibites.com'),
  title: {
    template: '%s | CediBites',
    default: 'CediBites — Authentic Ghanaian Food Delivery',
  },
  description:
    'Order authentic Ghanaian dishes online — jollof rice, waakye, kelewele, soups and more. Delivered fresh to your door across Ghana.',
  openGraph: {
    type: 'website',
    siteName: 'CediBites',
    locale: 'en_GH',
    url: 'https://app.cedibites.com',
    title: 'CediBites — Authentic Ghanaian Food Delivery',
    description: 'Order authentic Ghanaian dishes online, delivered fresh.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'CediBites' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CediBites — Authentic Ghanaian Food Delivery',
    description: 'Order authentic Ghanaian dishes online, delivered fresh.',
    images: ['/og-default.png'],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION ?? '',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cabin.variable} ${caprasimo.variable} bg-neutral-light dark:bg-brand-darker antialiased`}>
      <body className={abeezee.variable} suppressHydrationWarning>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          strategy="afterInteractive"
        />
        <QueryProvider>
          <RouterInitializer />
          <LocationProvider autoRequest={false}>
            <BranchProvider>
              <OrderStoreProvider>
                {children}
              </OrderStoreProvider>
            </BranchProvider>
          </LocationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}