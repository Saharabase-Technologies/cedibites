import type { Metadata } from 'next';
import { ModalProvider } from '../components/providers/ModalProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { MenuDiscoveryProvider } from '../components/providers/MenuDiscoveryProvider';
import { CartProvider } from '../components/providers/CartProvider';
import LocationRequestModal from '../components/ui/LocationRequestModal';
import BranchSelectorModal from '../components/ui/BranchSelectorModal';
import Navbar from '../components/layout/Navbar';
import BottomNav, { BottomNavSpacer } from '../components/layout/BottomNav';
import CartDrawer from '../components/ui/CartDrawer';
import AuthModal from '../components/ui/AuthModal';
import SearchSheet from '../components/ui/SearchSheet';

export const metadata: Metadata = {
  description: 'Browse and order authentic Ghanaian food from CediBites.',
  openGraph: { type: 'website', siteName: 'CediBites' },
};

const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'CediBites',
  description: 'Authentic Ghanaian food delivery: jollof rice, fried rice, banku, grilled chicken, wraps, combos and more. Order online for delivery or pickup in Tema and Accra.',
  url: 'https://app.cedibites.com',
  servesCuisine: ['Ghanaian', 'West African', 'African'],
  priceRange: 'GH₵60 - GH₵255',
  currenciesAccepted: 'GHS',
  paymentAccepted: 'Cash, Mobile Money',
  telephone: ['+233548162282', '+233500165512'],
  image: 'https://app.cedibites.com/og-default.png',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Nii Tetteh Amui Street',
    addressLocality: 'Tema',
    addressRegion: 'Greater Accra',
    addressCountry: 'GH',
  },
  areaServed: [
    { '@type': 'City', name: 'Tema' },
    { '@type': 'City', name: 'Accra' },
  ],
  menu: 'https://app.cedibites.com/menu',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'CediBites Menu',
    url: 'https://app.cedibites.com/menu',
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CediBites',
  url: 'https://app.cedibites.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://app.cedibites.com/menu?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
            {/* The rebrand lives on this wrapper, not on :root. Overriding the
                role tokens inside `.cb-customer` re-tints every customer screen
                through the existing cascade while POS, kitchen, inventory,
                admin and partner keep the warm foundation they were built on.
                Nothing in this tree uses createPortal, so the modals, drawers
                and sheets below inherit it too. */}
            <div className="cb-customer min-h-dvh bg-bg text-fg font-body">
            <ModalProvider>
                <AuthProvider>
                    <MenuDiscoveryProvider>
                        <CartProvider>
                            {/* The shell is mounted once here, not per page. CartDrawer and
                                AuthModal used to be rendered inside Navbar, so on any page
                                that did not itself render a Navbar — checkout, account, order
                                tracking — openCart() and openAuth() flipped state that had
                                nothing listening, and the drawer simply never appeared. */}
                            <Navbar />
                            <div aria-hidden className="h-(--nav-h) shrink-0" />
                            {children}
                            {/* In the flow, so the last row of the menu is not
                                sitting under the tabs. */}
                            <BottomNavSpacer />
                            <BottomNav />
                            <CartDrawer />
                            <AuthModal />
                            <SearchSheet />
                            <LocationRequestModal />
                            <BranchSelectorModal />
                        </CartProvider>
                    </MenuDiscoveryProvider>
                </AuthProvider>
            </ModalProvider>
            </div>
        </>
    );
}
