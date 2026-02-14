import type { Metadata } from "next";
import { Cabin, Caprasimo } from 'next/font/google';
import localFont from 'next/font/local';
import "./globals.css";
import { ModalProvider } from "./components/providers/ModalProvider";
import { LocationProvider } from "./components/providers/LocationProvider";
import { BranchProvider } from "./components/providers/BranchProvider";
import { MenuDiscoveryProvider } from "./components/providers/MenuDiscoveryProvider";
import { CartProvider } from "./components/providers/CartProvider";
import LocationRequestModal from "./components/ui/LocationRequestModal";
import BranchSelectorModal from "./components/ui/BranchSelectorModal";

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
  title: "CediBites Restaurant | Authentic Ghanaian food",
  description: "Authentic Ghanaian food",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cabin.variable} ${caprasimo.variable} bg-neutral-light dark:bg-brand-darker antialiased`}>
      <body className={abeezee.variable}>
        <ModalProvider>
          <LocationProvider autoRequest={false}>
            <BranchProvider>
              <MenuDiscoveryProvider>
                <CartProvider>
                  <LocationRequestModal />
                  <BranchSelectorModal />
                  {children}
                </CartProvider>
              </MenuDiscoveryProvider>
            </BranchProvider>
          </LocationProvider>
        </ModalProvider>
      </body>
    </html>
  );
}