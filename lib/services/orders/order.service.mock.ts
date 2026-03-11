// ─── Mock Order Service ──────────────────────────────────────────────────────
// localStorage + BroadcastChannel implementation.
// Replace with ApiOrderService when backend is ready.

import type { Order, OrderFilter, OrderStatus, CreateOrderInput } from '@/types/order';
import { generateOrderId } from '@/types/order';
import type { OrderService } from './order.service';
import { BRANCH_COORDS } from '@/lib/constants/order.constants';

const STORAGE_KEY = 'cedibites-orders';
const CHANNEL_NAME = 'cedibites-orders-sync';

// ─── Seed data ──────────────────────────────────────────────────────────────

function minsAgo(m: number): number { return Date.now() - m * 60_000; }
function hoursAgo(h: number): number { return Date.now() - h * 3_600_000; }

const SEED_ORDERS: Order[] = [
    // ── Staff / Customer orders ──────────────────────────────────────────
    {
        id: 'CB847291', orderNumber: 'CB847291',
        status: 'received', source: 'whatsapp', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'jollof', name: 'Jollof Rice', quantity: 2, unitPrice: 35, sizeLabel: 'Regular' },
            { id: '2', menuItemId: 'malt', name: 'Malt', quantity: 2, unitPrice: 12, sizeLabel: 'Regular' },
        ],
        subtotal: 94, deliveryFee: 15, discount: 0, tax: 2.73, total: 111.73,
        contact: { name: 'Ama Serwaa', phone: '0244123456', address: 'Trassacco Valley, East Legon', notes: 'Extra spicy please' },
        branch: { id: '2', name: 'East Legon', address: '45 American House, East Legon', phone: '+233 50 987 6543', coordinates: BRANCH_COORDS['East Legon'] },
        placedAt: minsAgo(8),
        coords: { branch: BRANCH_COORDS['East Legon'], customer: { latitude: 5.6320, longitude: -0.1480 } },
    },
    {
        id: 'CB391045', orderNumber: 'CB391045',
        status: 'received', source: 'phone', fulfillmentType: 'pickup',
        paymentMethod: 'cash', isPaid: false, paymentStatus: 'pending',
        items: [
            { id: '1', menuItemId: 'waakye', name: 'Waakye', quantity: 1, unitPrice: 30, sizeLabel: 'Regular' },
            { id: '2', menuItemId: 'kelewele', name: 'Kelewele', quantity: 1, unitPrice: 20, sizeLabel: 'Regular' },
        ],
        subtotal: 50, deliveryFee: 0, discount: 0, tax: 1.25, total: 51.25,
        contact: { name: 'Kweku Asante', phone: '0201987654' },
        branch: { id: '1', name: 'Osu', address: '123 Oxford Street, Osu', phone: '+233 24 123 4567', coordinates: BRANCH_COORDS['Osu'] },
        placedAt: minsAgo(22),
    },
    {
        id: 'CB204837', orderNumber: 'CB204837',
        status: 'preparing', source: 'instagram', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'banku', name: 'Banku & Tilapia', quantity: 1, unitPrice: 55, sizeLabel: 'Regular' },
        ],
        subtotal: 55, deliveryFee: 18, discount: 0, tax: 1.38, total: 74.38,
        contact: { name: 'Abena Boateng', phone: '0551234567', address: 'Community 5, Tema' },
        branch: { id: '4', name: 'Tema', address: 'Community 1, Tema', phone: '+233 24 777 8888', coordinates: BRANCH_COORDS['Tema'] },
        placedAt: minsAgo(34),
        coords: { branch: BRANCH_COORDS['Tema'], customer: { latitude: 5.6525, longitude: -0.0080 } },
    },
    {
        id: 'CB173920', orderNumber: 'CB173920',
        status: 'preparing', source: 'facebook', fulfillmentType: 'delivery',
        paymentMethod: 'cash', isPaid: false, paymentStatus: 'pending',
        items: [
            { id: '1', menuItemId: 'fufu', name: 'Fufu & Light Soup', quantity: 2, unitPrice: 45, sizeLabel: 'Regular' },
            { id: '2', menuItemId: 'sobolo', name: 'Sobolo', quantity: 2, unitPrice: 10, sizeLabel: '350ml' },
        ],
        subtotal: 110, deliveryFee: 15, discount: 0, tax: 2.75, total: 127.75,
        contact: { name: 'Yaw Darko', phone: '0277654321', address: 'Madina Market, near Mosque' },
        branch: { id: '5', name: 'Madina', address: 'Remy Junction, Madina', phone: '+233 55 444 3333', coordinates: BRANCH_COORDS['Madina'] },
        placedAt: minsAgo(19),
        coords: { branch: BRANCH_COORDS['Madina'], customer: { latitude: 5.6750, longitude: -0.1650 } },
    },
    {
        id: 'CB998812', orderNumber: 'CB998812',
        status: 'ready', source: 'phone', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'fried-rice', name: 'Fried Rice', quantity: 1, unitPrice: 35, sizeLabel: 'Regular' },
            { id: '2', menuItemId: 'coke', name: 'Coke', quantity: 1, unitPrice: 12, sizeLabel: 'Regular' },
        ],
        subtotal: 47, deliveryFee: 15, discount: 0, tax: 1.18, total: 63.18,
        contact: { name: 'Efua Mensah', phone: '0244567890', address: 'Airport Residential' },
        branch: { id: '2', name: 'East Legon', address: '45 American House, East Legon', phone: '+233 50 987 6543', coordinates: BRANCH_COORDS['East Legon'] },
        placedAt: minsAgo(45),
        coords: { branch: BRANCH_COORDS['East Legon'], customer: { latitude: 5.6085, longitude: -0.1780 } },
    },
    {
        id: 'CB774433', orderNumber: 'CB774433',
        status: 'out_for_delivery', source: 'whatsapp', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'jollof', name: 'Jollof Rice', quantity: 3, unitPrice: 35, sizeLabel: 'Regular' },
        ],
        subtotal: 105, deliveryFee: 15, discount: 0, tax: 2.63, total: 122.63,
        contact: { name: 'Kojo Appiah', phone: '0200112233', address: 'Cantonments, Accra' },
        branch: { id: '1', name: 'Osu', address: '123 Oxford Street, Osu', phone: '+233 24 123 4567', coordinates: BRANCH_COORDS['Osu'] },
        placedAt: minsAgo(62),
        coords: {
            branch: BRANCH_COORDS['Osu'],
            customer: { latitude: 5.5745, longitude: -0.1690 },
            rider: { latitude: 5.5651, longitude: -0.1730 },
        },
    },
    {
        id: 'CB556677', orderNumber: 'CB556677',
        status: 'ready_for_pickup', source: 'phone', fulfillmentType: 'pickup',
        paymentMethod: 'cash', isPaid: false, paymentStatus: 'pending',
        items: [
            { id: '1', menuItemId: 'combo-special', name: 'Combo Special', quantity: 2, unitPrice: 48, sizeLabel: 'Regular' },
        ],
        subtotal: 96, deliveryFee: 0, discount: 0, tax: 2.40, total: 98.40,
        contact: { name: 'Adwoa Ofori', phone: '0245678901' },
        branch: { id: '6', name: 'La Paz', address: 'Abeka-Lapaz, Near Lapaz Market', phone: '+233 24 789 1234', coordinates: BRANCH_COORDS['La Paz'] },
        placedAt: minsAgo(38),
    },
    {
        id: 'CB112233', orderNumber: 'CB112233',
        status: 'delivered', source: 'online', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'waakye', name: 'Waakye', quantity: 2, unitPrice: 30, sizeLabel: 'Regular' },
        ],
        subtotal: 60, deliveryFee: 15, discount: 0, tax: 1.50, total: 76.50,
        contact: { name: 'Fiifi Annan', phone: '0266778899', address: 'Dzorwulu Junction, near Shell' },
        branch: { id: '7', name: 'Dzorwulu', address: 'Dzorwulu, Near US Embassy', phone: '+233 50 123 9876', coordinates: BRANCH_COORDS['Dzorwulu'] },
        placedAt: minsAgo(95),
        coords: { branch: BRANCH_COORDS['Dzorwulu'], customer: { latitude: 5.6030, longitude: -0.2050 } },
    },

    // ── POS / Dine-in orders ─────────────────────────────────────────────
    {
        id: 'CB660011', orderNumber: 'CB660011',
        status: 'preparing', source: 'pos', fulfillmentType: 'dine_in',
        paymentMethod: 'cash', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'jollof', name: 'Jollof Rice (Assorted)', quantity: 1, unitPrice: 85, variantKey: 'assorted' },
            { id: '2', menuItemId: 'sobolo', name: 'Sobolo', quantity: 1, unitPrice: 15, variantKey: 'small', sizeLabel: '350ml' },
        ],
        subtotal: 100, deliveryFee: 0, discount: 0, tax: 0, total: 100,
        contact: { name: 'Walk-in Customer', phone: '' },
        branch: { id: '2', name: 'East Legon', address: '45 American House, East Legon', phone: '+233 50 987 6543', coordinates: BRANCH_COORDS['East Legon'] },
        staffId: 'u2', staffName: 'Kofi Mensah',
        placedAt: minsAgo(12),
    },
    {
        id: 'CB660022', orderNumber: 'CB660022',
        status: 'ready', source: 'pos', fulfillmentType: 'takeaway',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'fried-rice', name: 'Fried Rice (Plain)', quantity: 2, unitPrice: 65, variantKey: 'plain' },
        ],
        subtotal: 130, deliveryFee: 0, discount: 0, tax: 0, total: 130,
        contact: { name: 'Akua Mensah', phone: '0241234567' },
        branch: { id: '1', name: 'Osu', address: '123 Oxford Street, Osu', phone: '+233 24 123 4567', coordinates: BRANCH_COORDS['Osu'] },
        staffId: 'u4', staffName: 'Kwame Darko',
        placedAt: minsAgo(25),
    },
    {
        id: 'CB660033', orderNumber: 'CB660033',
        status: 'completed', source: 'pos', fulfillmentType: 'dine_in',
        paymentMethod: 'card', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'banku-tilapia-combo', name: 'Banku × Grilled Tilapia', quantity: 1, unitPrice: 120 },
            { id: '2', menuItemId: 'bottled-water', name: 'Bottled Water', quantity: 2, unitPrice: 7, variantKey: 'small', sizeLabel: '500ml' },
        ],
        subtotal: 134, deliveryFee: 0, discount: 0, tax: 0, total: 134,
        contact: { name: 'Kwesi Boateng', phone: '' },
        branch: { id: '2', name: 'East Legon', address: '45 American House, East Legon', phone: '+233 50 987 6543', coordinates: BRANCH_COORDS['East Legon'] },
        staffId: 'u2', staffName: 'Kofi Mensah',
        placedAt: hoursAgo(2), completedAt: hoursAgo(1.5),
    },

    // ── Customer online orders ───────────────────────────────────────────
    {
        id: 'CB770011', orderNumber: 'CB770011',
        status: 'out_for_delivery', source: 'online', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: true, paymentStatus: 'completed',
        items: [
            { id: '1', menuItemId: 'jollof', name: 'Jollof Rice & Chicken', quantity: 2, unitPrice: 45, icon: '🍛', sizeLabel: 'Large' },
            { id: '2', menuItemId: 'kelewele', name: 'Kelewele', quantity: 1, unitPrice: 15, icon: '🍌', sizeLabel: 'Regular' },
            { id: '3', menuItemId: 'malt', name: 'Malta Guinness', quantity: 2, unitPrice: 8, icon: '🥤', sizeLabel: 'Regular' },
        ],
        subtotal: 121, deliveryFee: 15, discount: 0, tax: 3.03, total: 139.03,
        contact: { name: 'Kwame Mensah', phone: '+233241234567', address: '14 Osu Badu Street, Osu, Accra', notes: 'Blue gate — call on arrival' },
        branch: { id: '1', name: 'Osu', address: '123 Oxford Street, Osu', phone: '+233 24 123 4567', coordinates: BRANCH_COORDS['Osu'] },
        placedAt: minsAgo(22), estimatedMinutes: 35,
    },

    // ── Staff-created order (phone/whatsapp) ─────────────────────────────
    {
        id: 'CB880011', orderNumber: 'CB880011',
        status: 'received', source: 'whatsapp', fulfillmentType: 'delivery',
        paymentMethod: 'momo', isPaid: false, paymentStatus: 'pending',
        items: [
            { id: '1', menuItemId: 'fried-rice', name: 'Fried Rice (Assorted)', quantity: 1, unitPrice: 85, variantKey: 'assorted', category: 'Basic Meals' },
            { id: '2', menuItemId: 'jollof-bowl', name: 'Jollof Bowl', quantity: 1, unitPrice: 60, variantKey: 'small', sizeLabel: 'Small', category: 'Budget Bowls' },
        ],
        subtotal: 145, deliveryFee: 15, discount: 0, tax: 3.63, total: 163.63,
        contact: { name: 'Naa Kwarley', phone: '0551234567', address: 'East Legon Hills' },
        branch: { id: '2', name: 'East Legon', address: '45 American House, East Legon', phone: '+233 50 987 6543', coordinates: BRANCH_COORDS['East Legon'] },
        staffId: 'u2', staffName: 'Kofi Mensah',
        placedAt: minsAgo(5),
    },
];

// ─── Implementation ─────────────────────────────────────────────────────────

export class MockOrderService implements OrderService {
    private listeners = new Set<(orders: Order[]) => void>();
    private channel: BroadcastChannel | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            // Seed if empty
            if (!localStorage.getItem(STORAGE_KEY)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ORDERS));
            }

            // Cross-tab sync
            this.channel = new BroadcastChannel(CHANNEL_NAME);
            this.channel.onmessage = () => this.notifyListeners();
        }
    }

    // ── Read ─────────────────────────────────────────────────────────────

    private readAll(): Order[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    private writeAll(orders: Order[]): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        this.channel?.postMessage('update');
        this.notifyListeners();
    }

    private notifyListeners(): void {
        const orders = this.readAll();
        this.listeners.forEach(cb => cb(orders));
    }

    // ── OrderService interface ───────────────────────────────────────────

    async getAll(filter?: OrderFilter): Promise<Order[]> {
        let orders = this.readAll();
        if (!filter) return orders;

        if (filter.branchId) orders = orders.filter(o => o.branch.id === filter.branchId);
        if (filter.branchName) orders = orders.filter(o => o.branch.name === filter.branchName);
        if (filter.staffId) orders = orders.filter(o => o.staffId === filter.staffId);
        if (filter.status?.length) orders = orders.filter(o => filter.status!.includes(o.status));
        if (filter.fulfillmentType?.length) orders = orders.filter(o => filter.fulfillmentType!.includes(o.fulfillmentType));
        if (filter.source?.length) orders = orders.filter(o => filter.source!.includes(o.source));
        if (filter.contactPhone) orders = orders.filter(o => o.contact.phone === filter.contactPhone);
        if (filter.dateFrom) orders = orders.filter(o => o.placedAt >= filter.dateFrom!);
        if (filter.dateTo) orders = orders.filter(o => o.placedAt <= filter.dateTo!);
        if (filter.search) {
            const q = filter.search.toLowerCase();
            orders = orders.filter(o =>
                o.id.toLowerCase().includes(q) ||
                o.orderNumber.toLowerCase().includes(q) ||
                o.contact.name.toLowerCase().includes(q) ||
                o.contact.phone.includes(q)
            );
        }

        return orders;
    }

    async getById(id: string): Promise<Order | null> {
        const orders = this.readAll();
        return orders.find(o => o.id.toUpperCase() === id.toUpperCase()) ?? null;
    }

    async create(input: CreateOrderInput): Promise<Order> {
        const id = generateOrderId();
        const itemsWithIds = input.items.map((item, i) => ({
            ...item,
            id: `${id}-${i + 1}`,
        }));

        const subtotal = itemsWithIds.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const deliveryFee = input.deliveryFee ?? (input.fulfillmentType === 'delivery' ? 15 : 0);
        const tax = input.tax ?? subtotal * 0.025;
        const discount = input.discount ?? 0;

        const order: Order = {
            id,
            orderNumber: id,
            status: 'received',
            source: input.source,
            fulfillmentType: input.fulfillmentType,
            paymentMethod: input.paymentMethod,
            isPaid: input.paymentMethod === 'momo',
            paymentStatus: input.paymentMethod === 'momo' ? 'completed' : 'pending',
            items: itemsWithIds,
            subtotal,
            deliveryFee,
            discount,
            promoCode: input.promoCode,
            tax,
            total: subtotal + deliveryFee + tax - discount,
            contact: input.contact,
            branch: {
                id: input.branchId,
                name: input.branchName,
                address: input.branchAddress ?? '',
                phone: input.branchPhone ?? '',
                coordinates: input.branchCoordinates ?? { latitude: 0, longitude: 0 },
            },
            staffId: input.staffId,
            staffName: input.staffName,
            placedAt: Date.now(),
            allergyFlags: input.allergyFlags,
            staffNotes: input.notes,
        };

        const orders = this.readAll();
        orders.unshift(order);
        this.writeAll(orders);

        return order;
    }

    async updateStatus(
        id: string,
        status: OrderStatus,
        timestamps?: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>>,
    ): Promise<Order> {
        const orders = this.readAll();
        const idx = orders.findIndex(o => o.id === id);
        if (idx === -1) throw new Error(`Order ${id} not found`);

        orders[idx] = { ...orders[idx], status, ...timestamps };

        // Auto-set timestamps
        const now = Date.now();
        if (status === 'accepted' && !orders[idx].acceptedAt) orders[idx].acceptedAt = now;
        if (status === 'preparing' && !orders[idx].startedAt) orders[idx].startedAt = now;
        if (status === 'ready' && !orders[idx].readyAt) orders[idx].readyAt = now;
        if (['delivered', 'completed'].includes(status) && !orders[idx].completedAt) orders[idx].completedAt = now;

        this.writeAll(orders);
        return orders[idx];
    }

    async update(id: string, patch: Partial<Order>): Promise<Order> {
        const orders = this.readAll();
        const idx = orders.findIndex(o => o.id === id);
        if (idx === -1) throw new Error(`Order ${id} not found`);

        orders[idx] = { ...orders[idx], ...patch };
        this.writeAll(orders);
        return orders[idx];
    }

    subscribe(callback: (orders: Order[]) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    async delete(id: string): Promise<void> {
        const orders = this.readAll().filter(o => o.id !== id);
        this.writeAll(orders);
    }
}
