import type { Metadata } from 'next';
import { ModalProvider } from '../components/providers/ModalProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { MenuDiscoveryProvider } from '../components/providers/MenuDiscoveryProvider';
import { CartProvider } from '../components/providers/CartProvider';
import LocationRequestModal from '../components/ui/LocationRequestModal';
import BranchSelectorModal from '../components/ui/BranchSelectorModal';

export const metadata: Metadata = {
  description: 'Browse and order authentic Ghanaian food from CediBites.',
  openGraph: { type: 'website', siteName: 'CediBites' },
};

const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'CediBites',
  description: 'Authentic Ghanaian food delivery — jollof rice, fried rice, banku, grilled chicken, wraps, combos and more. Order online for delivery or pickup in Tema and Accra.',
  url: 'https://app.cedibites.com',
  servesCuisine: ['Ghanaian', 'West African', 'African'],
  priceRange: 'GH₵60 - GH₵255',
  currenciesAccepted: 'GHS',
  paymentAccepted: 'Cash, Mobile Money',
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
            <ModalProvider>
                <AuthProvider>
                    <MenuDiscoveryProvider>
                        <CartProvider>
                            <LocationRequestModal />
                            <BranchSelectorModal />
                            {children}
                        </CartProvider>
                    </MenuDiscoveryProvider>
                </AuthProvider>
            </ModalProvider>
        </>
    );
}
