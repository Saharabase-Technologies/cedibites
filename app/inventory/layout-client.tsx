'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  SquaresFourIcon,
  PackageIcon,
  ArrowsLeftRightIcon,
  ClipboardTextIcon,
  TrashIcon,
  ChartBarIcon,
  GearSixIcon,
  StorefrontIcon,
  CaretRightIcon,
  CalendarCheckIcon,
  SignOutIcon,
  WarehouseIcon,
  SlidersIcon,
  ReceiptIcon,
  ClipboardIcon,
  CookingPotIcon,
  ScalesIcon,
  ForkKnifeIcon,
  TagIcon,
  RulerIcon,
  MapPinIcon,
} from '@phosphor-icons/react';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';

// ─── Nav config ───────────────────────────────────────────────────────────────

/**
 * `permission` is the single source of truth for both the sidebar and the route
 * guard below — a link a role cannot see is also a URL it cannot open. The
 * strings mirror the backend grants in RoleSeeder. The sections group the portal
 * by workflow so every role gets an appropriate menu once filtered: the Warehouse
 * Manager runs Operations + Purchasing (view) + the item Catalog she curates
 * (items/categories/units); the Purchasing Clerk gets Purchasing + suppliers; the
 * Branch Manager gets branch operations; only Admin sees the System section.
 */
type NavItem = { href: string; label: string; icon: React.ElementType; permission: string };

/** Home — always first, no section header. */
const DASHBOARD_NAV: NavItem[] = [
  { href: '/inventory/dashboard', label: 'Dashboard', icon: SquaresFourIcon, permission: 'access_inventory_portal' },
];

/** Operational work — daily stock movement. */
const OPERATIONS_NAV: NavItem[] = [
  { href: '/inventory/production',    label: 'Production',    icon: CookingPotIcon,      permission: 'inventory.production.record'         },
  { href: '/inventory/transfers',     label: 'Transfers',     icon: ArrowsLeftRightIcon, permission: 'inventory.transfer.create'           },
  { href: '/inventory/requisitions',  label: 'Requisitions',  icon: ClipboardTextIcon,   permission: 'inventory.requisition.create'        },
  { href: '/inventory/wastage',       label: 'Wastage',       icon: TrashIcon,           permission: 'inventory.wastage.record'            },
  { href: '/inventory/daily-closing', label: 'Daily Closing', icon: CalendarCheckIcon,   permission: 'inventory.daily_closing.enter'       },
  { href: '/inventory/reconciliation',label: 'Reconciliation',icon: ScalesIcon,          permission: 'inventory.reconciliation.open_cycle' },
];

/** Purchasing — Purchasing Clerk authors POs; Warehouse Manager views them. */
const PURCHASING_NAV: NavItem[] = [
  // Gated on `purchase.view` so the WM sees POs read-only; the create/edit
  // surfaces are separately gated on `inventory.purchase_order.*`.
  { href: '/inventory/purchase-orders', label: 'Purchase Orders', icon: ClipboardIcon, permission: 'inventory.purchase.view' },
  { href: '/inventory/purchases',       label: 'Purchases',       icon: ReceiptIcon,   permission: 'inventory.purchase.view' },
];

/** Item catalog & master data. Each row gated on its own manage grant. */
const CATALOG_NAV: NavItem[] = [
  { href: '/inventory/catalog',            label: 'Items',      icon: PackageIcon,    permission: 'view_inventory_catalog'  },
  { href: '/inventory/catalog/categories', label: 'Categories', icon: TagIcon,        permission: 'inventory.category.manage' },
  { href: '/inventory/catalog/units',      label: 'Units',      icon: RulerIcon,      permission: 'inventory.unit.manage'   },
  // Suppliers are a purchasing concern — Clerk/Admin only, not the WM.
  { href: '/inventory/catalog/suppliers',  label: 'Suppliers',  icon: StorefrontIcon, permission: 'inventory.supplier.manage' },
  // Recipes/BOM authoring is Admin-only; Branch Managers keep view access.
  { href: '/inventory/catalog/recipes',    label: 'Recipes',    icon: ForkKnifeIcon,  permission: 'inventory.recipe.view'   },
];

/** Reporting — its own section. */
const REPORTS_NAV: NavItem[] = [
  { href: '/inventory/reports', label: 'Reports', icon: ChartBarIcon, permission: 'inventory.report.view' },
];

/** System configuration — Admin-only, set once. */
const SYSTEM_NAV: NavItem[] = [
  { href: '/inventory/configure', label: 'Setup',     icon: SlidersIcon, permission: 'inventory.settings.manage' },
  { href: '/inventory/locations', label: 'Locations', icon: MapPinIcon,  permission: 'inventory.location.manage' },
  { href: '/inventory/settings',  label: 'Settings',  icon: GearSixIcon, permission: 'inventory.settings.manage' },
];

/** Bottom mobile bar — 5 most accessed, filtered the same way. */
const BOTTOM_NAV: NavItem[] = [
  { href: '/inventory/dashboard',    label: 'Home',     icon: SquaresFourIcon,     permission: 'access_inventory_portal'      },
  { href: '/inventory/catalog',      label: 'Catalog',  icon: PackageIcon,         permission: 'view_inventory_catalog'       },
  { href: '/inventory/transfers',    label: 'Transfers',icon: ArrowsLeftRightIcon, permission: 'inventory.transfer.create'    },
  { href: '/inventory/requisitions', label: 'Requests', icon: ClipboardTextIcon,   permission: 'inventory.requisition.create' },
  { href: '/inventory/reports',      label: 'Reports',  icon: ChartBarIcon,        permission: 'inventory.report.view'        },
];

/**
 * Route guard table — longest prefix wins, so `/inventory/catalog/suppliers`
 * is checked before `/inventory/catalog`. Anything unlisted only requires
 * portal access.
 */
const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string }> = [
  ...[
    ...DASHBOARD_NAV,
    ...OPERATIONS_NAV,
    ...PURCHASING_NAV,
    ...CATALOG_NAV,
    ...REPORTS_NAV,
    ...SYSTEM_NAV,
  ].map(({ href, permission }) => ({ prefix: href, permission })),
  // The PO list/detail are viewable (purchase.view), but authoring the new PO
  // requires the create grant — longest prefix wins, so this overrides the list.
  { prefix: '/inventory/purchase-orders/new', permission: 'inventory.purchase_order.create' },
].sort((a, b) => b.prefix.length - a.prefix.length);

/** The permission required to open a given IMS path, if any beyond portal access. */
function permissionForPath(pathname: string): string | null {
  return ROUTE_PERMISSIONS.find(({ prefix }) => pathname.startsWith(prefix))?.permission ?? null;
}

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group flex items-center gap-3 py-2.5 rounded-xl
        text-sm font-medium font-body transition-all duration-150
        ${
          active
            ? 'bg-[#fff8ec] text-primary px-3 border-l-[3px] border-primary ml-0 pl-2.25'
            : 'text-neutral-gray hover:bg-neutral-light hover:text-text-dark px-3'
        }
      `}
    >
      <Icon size={18} weight={active ? 'fill' : 'regular'} className="shrink-0" />
      <span>{label}</span>
      {active && <CaretRightIcon size={12} weight="bold" className="ml-auto opacity-40" />}
    </Link>
  );
}

/** Labeled sidebar section. */
function NavSection({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  // Callers filter before rendering; an empty section would otherwise leave a
  // stray heading and divider behind.
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-gray/60 font-body select-none">
          {label}
        </p>
      )}
      {items.map((item) => (
        <SidebarLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={
            item.href === '/inventory/catalog'
              ? pathname === '/inventory/catalog' ||
                pathname.startsWith('/inventory/catalog/items')
              : pathname.startsWith(item.href)
          }
        />
      ))}
    </div>
  );
}

/** A labeled section preceded by a top divider. Renders nothing when empty. */
function DividerSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="border-t border-[#f0e8d8] pt-1">
      <NavSection label={label} items={items} pathname={pathname} />
    </div>
  );
}

// ─── Bottom nav link ──────────────────────────────────────────────────────────

function BottomNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium font-body transition-colors ${
        active ? 'text-primary' : 'text-neutral-gray'
      }`}
    >
      <Icon size={22} weight={active ? 'fill' : 'regular'} />
      <span>{label}</span>
    </Link>
  );
}

// ─── Shared sidebar shell ─────────────────────────────────────────────────────

function Sidebar({
  pathname,
  userName,
  userRole,
  onSignOut,
  can,
}: {
  pathname: string;
  userName: string;
  userRole: string;
  onSignOut: () => void;
  can: (permission: string) => boolean;
}) {
  const dashboard  = DASHBOARD_NAV.filter((i) => can(i.permission));
  const operations = OPERATIONS_NAV.filter((i) => can(i.permission));
  const purchasing = PURCHASING_NAV.filter((i) => can(i.permission));
  const catalog    = CATALOG_NAV.filter((i) => can(i.permission));
  const reports    = REPORTS_NAV.filter((i) => can(i.permission));
  const system     = SYSTEM_NAV.filter((i) => can(i.permission));

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-neutral-card border-r border-[#f0e8d8] sticky top-0 h-screen">
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-[#f0e8d8] gap-2.5">
        <Image src="/cblogo.webp" alt="CediBites" width={40} height={40} className="shrink-0" priority />
        <div>
          <p className="font-brand text-primary text-lg leading-none">CediBites</p>
          <p className="text-neutral-gray text-[10px] font-body mt-0.5 flex items-center gap-1">
            <WarehouseIcon size={10} weight="fill" className="text-primary/70" />
            Inventory Portal
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-2 overflow-y-auto">
        <NavSection items={dashboard} pathname={pathname} />
        <DividerSection label="Operations" items={operations} pathname={pathname} />
        <DividerSection label="Purchasing" items={purchasing} pathname={pathname} />
        <DividerSection label="Catalog"    items={catalog}    pathname={pathname} />
        <DividerSection label="Reports"    items={reports}    pathname={pathname} />
        <DividerSection label="System"     items={system}     pathname={pathname} />
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-[#f0e8d8]">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-semibold font-body">
              {userName.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-dark text-sm font-medium font-body truncate">{userName}</p>
            <p className="text-neutral-gray text-xs font-body truncate">{userRole}</p>
          </div>
          <button
            onClick={onSignOut}
            className="text-neutral-gray hover:text-red-500 transition-colors p-1 cursor-pointer"
            aria-label="Sign out"
          >
            <SignOutIcon size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Inner layout (inside auth provider) ─────────────────────────────────────

function InventoryLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { staffUser, isLoading, logout, can } = useStaffAuth();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IMS_MOCK === 'true') return;
    if (!isLoading) {
      if (!staffUser) { router.push('/staff/login'); return; }
      if (!staffUser.permissions?.includes('access_inventory_portal')) {
        router.push('/staff/login');
        return;
      }

      // Deep links and stale bookmarks can reach a section this role has no
      // grant for. Send them to the dashboard rather than rendering a page
      // whose every action is disabled.
      const required = permissionForPath(pathname);
      if (required && !can(required)) {
        router.replace('/inventory/dashboard');
      }
    }
  }, [staffUser, isLoading, router, pathname, can]);

  const isMock = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

  if (!isMock && isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-light">
        <div className="text-center">
          <Image src="/cblogo.webp" alt="CediBites" width={48} height={48} className="mx-auto mb-4" />
          <p className="text-neutral-gray text-sm font-body">Loading inventory portal…</p>
        </div>
      </div>
    );
  }

  if (!isMock && (!staffUser || !staffUser.permissions?.includes('access_inventory_portal'))) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-neutral-light w-full flex">
      <Sidebar
        pathname={pathname}
        userName={staffUser?.name ?? 'Inventory User'}
        userRole={staffUser?.role ?? ''}
        onSignOut={() => setIsSignOutOpen(true)}
        can={can}
      />

      <main className="flex-1 overflow-y-auto flex flex-col min-h-0">{children}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-card border-t border-[#f0e8d8] flex z-50">
        {BOTTOM_NAV.filter((item) => can(item.permission)).map((item) => (
          <BottomNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={async () => { await logout(); router.push('/staff/login'); }}
      />
    </div>
  );
}

// ─── Mock-mode inner (no auth provider, no gates) ────────────────────────────

function InventoryLayoutMockInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-neutral-light w-full flex">
      <Sidebar
        pathname={pathname}
        userName="Mock User"
        userRole="Super Admin"
        onSignOut={() => setIsSignOutOpen(true)}
        // Mock mode has no real grants — show the whole portal so every screen
        // stays reachable while developing against fixtures.
        can={() => true}
      />

      <main className="flex-1 overflow-y-auto flex flex-col min-h-0">{children}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-card border-t border-[#f0e8d8] flex z-50">
        {BOTTOM_NAV.map((item) => (
          <BottomNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={async () => { router.push('/staff/login'); }}
      />
    </div>
  );
}

// ─── Exported layout ─────────────────────────────────────────────────────────

export default function InventoryLayoutClient({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_IMS_MOCK === 'true') {
    return <InventoryLayoutMockInner>{children}</InventoryLayoutMockInner>;
  }
  return (
    <StaffAuthProvider>
      <InventoryLayoutInner>{children}</InventoryLayoutInner>
    </StaffAuthProvider>
  );
}
