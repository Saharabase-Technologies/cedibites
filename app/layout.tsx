import type { Metadata } from "next";
import { Caprasimo } from 'next/font/google';
import localFont from 'next/font/local';
import "./globals.css";
import { LocationProvider } from "./components/providers/LocationProvider";
import LocationRequestModal from "./components/ui/LocationRequestModal";
import { ModalProvider } from "./components/providers/ModalProvider";
import BranchSelectorModal from "./components/ui/BranchSelectorModal";
import { BranchProvider } from "./components/providers/BranchProvider";

// Google Font - Caprasimo (for brand/headings)
const caprasimo = Caprasimo({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-caprasimo',
  display: 'swap',
});

// Local Font - ABeeZee (for body text)
const abeezee = localFont({
  src: [
    {
      path: '../fonts/ABeeZee-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/ABeeZee-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-abeezee',
  display: 'swap',
});


export const metadata: Metadata = {
  title: "CediBites Restaurant | Authentic Ghanaian food",
  description: "Authentic Ghanaian food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${abeezee.variable} ${caprasimo.variable}  bg-neutral-light dark:bg-brand-darker antialiased`}>
      <body
        className={``}
      >
        <ModalProvider >
          <LocationProvider autoRequest={false}>
            <LocationRequestModal />
            <BranchProvider>
              <BranchSelectorModal />
              {children}
            </BranchProvider>
          </LocationProvider>
        </ModalProvider>

      </body>
    </html>
  );
}
