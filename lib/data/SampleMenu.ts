// lib/data/SampleMenu.ts

// ============================================
// CediBites Menu Data - Client's Actual Menu
// Categories: Basic Meals | Budget Bowls | Combos | Top Ups | Drinks
// ============================================

export type MenuVariant = 'plain' | 'assorted';
export type SizeKey = 'small' | 'large' | 'full' | 'half' | 'quarter' | '10pc' | '15pc' | 'fried-rice' | 'jollof';

export interface MenuItemSize {
    key: SizeKey;
    label: string;
    price: number;
    image?: string;
}

export interface MenuAddOn {
    id: string;
    name: string;
    price: number;
    perPiece?: boolean; // true for Drumsticks (price per piece)
}

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    category: 'Basic Meals' | 'Budget Bowls' | 'Combos' | 'Top Ups' | 'Drinks';

    // Pricing
    price?: number; // For items without sizes (basic single price)
    sizes?: MenuItemSize[]; // For items with size variants

    // Variants (Plain vs Assorted for rice/jollof/noodles)
    hasVariants?: boolean;
    variants?: {
        plain?: number;
        assorted?: number;
    };

    // Available add-ons for this item
    availableAddOns?: string[]; // Array of add-on IDs

    image?: string;
    url: string;
    popular?: boolean;
    isNew?: boolean;
}

// ============================================
// ADD-ONS (can be purchased standalone or with meals)
// ============================================
export const menuAddOns: Record<string, MenuAddOn> = {
    drumsticks: {
        id: 'drumsticks',
        name: 'Drumsticks',
        price: 12,
        perPiece: true,
    },
    tilapia: {
        id: 'tilapia',
        name: 'Charcoal Grilled Tilapia',
        price: 60,
    },
};

// ============================================
// MENU ITEMS
// ============================================
export const sampleMenuItems: MenuItem[] = [

    // ============================================
    // BASIC MEALS (Plain or Assorted + Chicken Drumsticks)
    // ============================================
    {
        id: 'fried-rice',
        name: 'Fried Rice with Chicken Drumsticks',
        description: 'Mixed vegetable fried rice with chicken Drumsticks - choose Plain or Assorted.',
        category: 'Basic Meals',
        hasVariants: true,
        variants: {
            plain: 65,
            assorted: 85,
        },
        image: '/images/menu/7.webp',
        url: '/menu?item=fried-rice',
        popular: true,
    },
    {
        id: 'jollof',
        name: 'Jollof Rice with Chicken Drumsticks',
        description: 'Smoky party jollof rice with chicken Drumsticks - choose Plain or Assorted.',
        category: 'Basic Meals',
        hasVariants: true,
        variants: {
            plain: 65,
            assorted: 85,
        },
        image: '/images/menu/1.webp',
        url: '/menu?item=jollof',
        popular: true,
    },
    {
        id: 'noodles',
        name: 'Assorted Noodles with Chicken Drumsticks',
        description: 'Assorted noodles with mixed proteins and chicken Drumsticks.',
        category: 'Basic Meals',
        price: 90,
        url: '/menu?item=noodles',
    },
    {
        id: 'banku',
        name: 'Banku with Tilapia',
        description: 'Fermented corn & cassava dough. Add grilled tilapia for the full experience!',
        category: 'Basic Meals',
        price: 60,
        availableAddOns: ['tilapia'],
        image: '/images/menu/2.webp',
        url: '/menu?item=banku',
        popular: true,
    },

    // ============================================
    // BUDGET BOWLS (Small or Large)
    // ============================================
    {
        id: 'jollof-bowl',
        name: 'Jollof Bowl',
        description: 'Plain jollof rice bowl - perfect for a quick meal',
        category: 'Budget Bowls',
        sizes: [
            { key: 'small', label: 'Small', price: 60 },
            { key: 'large', label: 'Large', price: 90 },
        ],
        url: '/menu?item=jollof-bowl',
        popular: true,
    },
    {
        id: 'fried-rice-bowl',
        name: 'Fried Rice Bowl',
        description: 'Plain fried rice bowl - quick and satisfying',
        category: 'Budget Bowls',
        sizes: [
            { key: 'small', label: 'Small', price: 60 },
            { key: 'large', label: 'Large', price: 90 },
        ],
        url: '/menu?item=fried-rice-bowl',
    },
    {
        id: 'assorted-jollof-bowl',
        name: 'Assorted Jollof Bowl',
        description: 'Jollof rice with mixed proteins',
        category: 'Budget Bowls',
        sizes: [
            { key: 'small', label: 'Small', price: 60 },
            { key: 'large', label: 'Large', price: 90 },
        ],
        url: '/menu?item=assorted-jollof-bowl',
    },
    {
        id: 'assorted-fried-rice-bowl',
        name: 'Assorted Fried Rice Bowl',
        description: 'Fried rice with mixed proteins',
        category: 'Budget Bowls',
        sizes: [
            { key: 'small', label: 'Small', price: 60 },
            { key: 'large', label: 'Large', price: 90 },
        ],
        url: '/menu?item=assorted-fried-rice-bowl',
    },
    {
        id: 'assorted-noodles-bowl',
        name: 'Assorted Noodles Bowl',
        description: 'Noodles with mixed proteins',
        category: 'Budget Bowls',
        sizes: [
            { key: 'small', label: 'Small', price: 60 },
            { key: 'large', label: 'Large', price: 90 },
        ],
        url: '/menu?item=assorted-noodles-bowl',
    },

    // ============================================
    // COMBOS (Fixed pricing - complete meals)
    // ============================================
    {
        id: 'banku-tilapia-combo',
        name: 'Banku × Charcoal Grilled Tilapia',
        description: 'Fermented banku with whole charcoal grilled tilapia & garden eggs pepper',
        category: 'Combos',
        price: 120,
        image: '/images/menu/2.webp',
        url: '/menu?item=banku-tilapia-combo',
        popular: true,
    },
    {
        id: 'street-budget-fr-jollof',
        name: 'Street Budget: FR/Jollof + 3 Drumsticks',
        description: 'Choose Fried Rice or Jollof Rice with 3 drumsticks',
        category: 'Combos',
        sizes: [
            { key: 'fried-rice', label: 'Fried Rice', price: 99 },
            { key: 'jollof', label: 'Jollof Rice', price: 99 },
        ],
        url: '/menu?item=street-budget-fr-jollof',
        popular: true,
        isNew: true,
    },
    {
        id: 'street-budget-assorted',
        name: 'Street Budget: Assorted + 3 Drumsticks',
        description: 'Assorted Noodles, Fried Rice, or Jollof with 3 Drumsticks',
        category: 'Combos',
        price: 119,
        url: '/menu?item=street-budget-assorted',
        popular: true,
    },
    {
        id: 'big-budget-fr-jollof',
        name: 'Big Budget: FR/Jollof + 5 Drumsticks',
        description: 'Choose Fried Rice or Jollof Rice with 5 drumsticks - serious value!',
        category: 'Combos',
        sizes: [
            { key: 'fried-rice', label: 'Fried Rice', price: 129 },
            { key: 'jollof', label: 'Jollof Rice', price: 129 },
        ],
        url: '/menu?item=big-budget-fr-jollof',
    },
    {
        id: 'big-budget-assorted',
        name: 'Big Budget: Assorted + 5 Drumsticks',
        description: 'Assorted Noodles, Fried Rice, or Jollof with 5 Drumsticks',
        category: 'Combos',
        price: 149,
        url: '/menu?item=big-budget-assorted',
    },

    // ============================================
    // TOP UPS (Standalone or add to any meal)
    // ============================================
    {
        id: 'rotisserie-full',
        name: 'Rotisserie Chicken - Full',
        description: 'Whole rotisserie chicken, perfectly seasoned and roasted',
        category: 'Top Ups',
        price: 300,
        url: '/menu?item=rotisserie-full',
        popular: true,
    },
    {
        id: 'rotisserie-half',
        name: 'Rotisserie Chicken - Half',
        description: 'Half rotisserie chicken, juicy and flavorful',
        category: 'Top Ups',
        price: 160,
        url: '/menu?item=rotisserie-half',
        popular: true,
    },
    {
        id: 'rotisserie-quarter',
        name: 'Rotisserie Chicken - Quarter',
        description: 'Quarter rotisserie chicken, perfect single serving',
        category: 'Top Ups',
        price: 90,
        url: '/menu?item=rotisserie-quarter',
    },
    {
        id: 'chicken-basket-10',
        name: 'Chicken Basket - 10 Drumsticks',
        description: '10 crispy chicken Drumsticks - perfect for sharing',
        category: 'Top Ups',
        price: 110,
        url: '/menu?item=chicken-basket-10',
    },
    {
        id: 'chicken-basket-15',
        name: 'Chicken Basket - 15 Drumsticks',
        description: '15 crispy chicken Drumsticks - party size!',
        category: 'Top Ups',
        price: 150,
        url: '/menu?item=chicken-basket-15',
    },

    // ============================================
    // DRINKS
    // ============================================
    {
        id: 'sobolo',
        name: 'Sobolo',
        description: 'Chilled hibiscus flower drink with ginger & cloves',
        category: 'Drinks',
        sizes: [
            { key: 'small', label: '350ml', price: 15 },
            { key: 'large', label: '500ml', price: 22 },
        ],
        image: '/images/menu/9.webp',
        url: '/menu?item=sobolo',
        popular: true,
    },
    {
        id: 'asaana',
        name: 'Asaana',
        description: 'Fermented roasted corn drink — sweet, tangy & refreshing',
        category: 'Drinks',
        sizes: [
            { key: 'small', label: '350ml', price: 15 },
            { key: 'large', label: '500ml', price: 22 },
        ],
        url: '/menu?item=asaana',
    },
    {
        id: 'pineapple-ginger',
        name: 'Pineapple Ginger Juice',
        description: 'Freshly blended pineapple with Ghanaian ginger & lime',
        category: 'Drinks',
        sizes: [
            { key: 'small', label: '350ml', price: 20 },
            { key: 'large', label: '500ml', price: 28 },
        ],
        image: '/images/menu/15.webp',
        url: '/menu?item=pineapple-ginger',
        popular: true,
    },
    {
        id: 'bottled-water',
        name: 'Bottled Water',
        description: 'Pure chilled still water',
        category: 'Drinks',
        sizes: [
            { key: 'small', label: '500ml', price: 7 },
            { key: 'large', label: '1L', price: 12 },
        ],
        url: '/menu?item=bottled-water',
    },
];

// ============================================
// CATEGORY CONFIG
// ============================================
export const menuCategories = [
    { id: 'all', label: 'Most Popular' },
    { id: 'Basic Meals', label: 'Basic Meals' },
    { id: 'Budget Bowls', label: 'Budget Bowls' },
    { id: 'Combos', label: 'Combos' },
    { id: 'Top Ups', label: 'Top Ups' },
    { id: 'Drinks', label: 'Drinks' },
];
