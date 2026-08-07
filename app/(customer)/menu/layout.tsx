import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'Order jollof rice, fried rice, banku, grilled chicken, drumsticks, wraps and combos online. Delivery and pickup available in Tema and Accra.',
  openGraph: {
    title: 'Menu | CediBites',
    url: 'https://app.cedibites.com/menu',
  },
};

const menuJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  name: 'CediBites',
  url: 'https://app.cedibites.com',
  servesCuisine: ['Ghanaian', 'West African', 'African'],
  menu: 'https://app.cedibites.com/menu',
  hasMenu: {
    '@type': 'Menu',
    name: 'CediBites Menu',
    url: 'https://app.cedibites.com/menu',
    description: 'Authentic Ghanaian dishes — jollof rice, fried rice, noodles, banku, grilled chicken, drumsticks, wraps and combos.',
    hasMenuSection: [
      {
        '@type': 'MenuSection',
        name: 'Main Delights',
        description: 'Authentic Ghanaian staple rice and banku dishes',
        hasMenuItem: [
          { '@type': 'MenuItem', name: 'Plain Jollof', offers: { '@type': 'Offer', price: '65', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Jollof', offers: { '@type': 'Offer', price: '85', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Seafood Jollof', offers: { '@type': 'Offer', price: '105', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Plain Fried Rice', offers: { '@type': 'Offer', price: '60', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Fried Rice', offers: { '@type': 'Offer', price: '80', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Seafood Fried Rice', offers: { '@type': 'Offer', price: '100', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Noodles', offers: { '@type': 'Offer', price: '80', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Seafood Noodles', offers: { '@type': 'Offer', price: '100', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Banku with Grilled Tilapia', offers: { '@type': 'Offer', price: '110', priceCurrency: 'GHS' } },
        ],
      },
      {
        '@type': 'MenuSection',
        name: 'Meat Bites',
        description: 'Crispy drumsticks and rotisserie grilled chicken',
        hasMenuItem: [
          { '@type': 'MenuItem', name: 'Special Crunch Drumsticks (5 pieces)', offers: { '@type': 'Offer', price: '65', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Special Crunch Drumsticks (10 pieces)', offers: { '@type': 'Offer', price: '110', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Juicy Fried Drumsticks (5 pieces)', offers: { '@type': 'Offer', price: '65', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Juicy Fried Drumsticks (10 pieces)', offers: { '@type': 'Offer', price: '110', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Full Rotisserie Grilled Chicken', offers: { '@type': 'Offer', price: '170', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Half Rotisserie Grilled Chicken', offers: { '@type': 'Offer', price: '90', priceCurrency: 'GHS' } },
        ],
      },
      {
        '@type': 'MenuSection',
        name: 'Combos',
        description: 'Street packages and big budget meal deals',
        hasMenuItem: [
          { '@type': 'MenuItem', name: 'Fried Rice + 3 Drums', offers: { '@type': 'Offer', price: '90', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Jollof + 3 Drums', offers: { '@type': 'Offer', price: '95', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Fried Rice / Noodles + 3 Drums', offers: { '@type': 'Offer', price: '110', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Jollof + 3 Drums', offers: { '@type': 'Offer', price: '115', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Fried Rice + 7 Drums + Kɔkɔɔ', offers: { '@type': 'Offer', price: '145', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Jollof + 7 Drums + Kɔkɔɔ', offers: { '@type': 'Offer', price: '150', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Fried Rice / Noodles + 7 Drums + Kɔkɔɔ', offers: { '@type': 'Offer', price: '165', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Fried Rice / Noodles + Full Chicken + Kɔkɔɔ', offers: { '@type': 'Offer', price: '250', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Assorted Jollof + Full Chicken + Kɔkɔɔ', offers: { '@type': 'Offer', price: '255', priceCurrency: 'GHS' } },
        ],
      },
      {
        '@type': 'MenuSection',
        name: 'Soft Bites',
        description: 'Cedi Wraps — chicken, beef and mix',
        hasMenuItem: [
          { '@type': 'MenuItem', name: 'Chicken Wrap', offers: { '@type': 'Offer', price: '60', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Beef Wrap', offers: { '@type': 'Offer', price: '60', priceCurrency: 'GHS' } },
          { '@type': 'MenuItem', name: 'Mix Wrap', offers: { '@type': 'Offer', price: '70', priceCurrency: 'GHS' } },
        ],
      },
    ],
  },
  currenciesAccepted: 'GHS',
  paymentAccepted: 'Cash, Mobile Money',
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(menuJsonLd) }}
      />
      {children}
    </>
  );
}
