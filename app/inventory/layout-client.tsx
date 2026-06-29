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
} from '@phosphor-icons/react';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: React.ElementType };

/** Operational work — daily use. */
const OPERATIONS_NAV: NavItem[] = [
  { href: '/inventory/dashboard',     label: 'Dashboard',     icon: SquaresFourIcon     },
  { href: '/inventory/transfers',     label: 'Transfers',     icon: ArrowsLeftRightIcon },
  { href: '/inventory/requisitions',  label: 'Requisitions',  icon: ClipboardTextIcon   },
  { href: '/inventory/wastage',       label: 'Wastage',       icon: TrashIcon           },
  { href: '/inventory/daily-closing', label: 'Daily Closing', icon: CalendarCheckIcon   },
  { href: '/inventory/reports',       label: 'Reports',       icon: ChartBarIcon        },
];

/** Purchasing — Warehouse Manager + Purchasing Clerk workflows. */
const PURCHASING_NAV: NavItem[] = [
  { href: '/inventory/purchase-orders', label: 'Purchase Orders', icon: ClipboardIcon },
  { href: '/inventory/purchases',       label: 'Purchases',       icon: ReceiptIcon   },
];

/** Product master data — less frequent. */
const CATALOG_NAV: NavItem[] = [
  { href: '/inventory/catalog',           label: 'Items',     icon: PackageIcon     },
  { href: '/inventory/catalog/suppliers', label: 'Suppliers', icon: StorefrontIcon  },
];

/** System configuration — set once, rarely touched. */
const CONFIGURE_NAV: NavItem[] = [
  { href: '/inventory/configure', label: 'Configure', icon: SlidersIcon },
];

/** Bottom mobile bar — 5 most accessed. */
const BOTTOM_NAV: NavItem[] = [
  { href: '/inventory/dashboard',    label: 'Home',     icon: SquaresFourIcon     },
  { href: '/inventory/catalog',      label: 'Catalog',  icon: PackageIcon         },
  { href: '/inventory/transfers',    label: 'Transfers',icon: ArrowsLeftRightIcon },
  { href: '/inventory/requisitions', label: 'Requests', icon: ClipboardTextIcon   },
  { href: '/inventory/configure',    label: 'Configure',icon: SlidersIcon         },
];

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
}: {
  pathname: string;
  userName: string;
  userRole: string;
  onSignOut: () => void;
}) {
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
        <NavSection items={OPERATIONS_NAV} pathname={pathname} />
        <div className="border-t border-[#f0e8d8] pt-1">
          <NavSection label="Purchasing" items={PURCHASING_NAV} pathname={pathname} />
        </div>
        <div className="border-t border-[#f0e8d8] pt-1">
          <NavSection label="Catalog" items={CATALOG_NAV} pathname={pathname} />
        </div>
        <div className="border-t border-[#f0e8d8] pt-1">
          <NavSection label="System" items={CONFIGURE_NAV} pathname={pathname} />
          <Link
            href="/inventory/settings"
            className={`
              group flex items-center gap-3 py-2.5 rounded-xl mt-0.5
              text-sm font-medium font-body transition-all duration-150
              ${
                pathname.startsWith('/inventory/settings')
                  ? 'bg-[#fff8ec] text-primary px-3 border-l-[3px] border-primary pl-2.25'
                  : 'text-neutral-gray hover:bg-neutral-light hover:text-text-dark px-3'
              }
            `}
          >
            <GearSixIcon
              size={18}
              weight={pathname.startsWith('/inventory/settings') ? 'fill' : 'regular'}
              className="shrink-0"
            />
            <span>Settings</span>
          </Link>
        </div>
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
  const { staffUser, isLoading, logout } = useStaffAuth();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IMS_MOCK === 'true') return;
    if (!isLoading) {
      if (!staffUser) { router.push('/staff/login'); return; }
      if (!staffUser.permissions?.includes('access_inventory_portal')) {
        router.push('/staff/login');
      }
    }
  }, [staffUser, isLoading, router]);

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
