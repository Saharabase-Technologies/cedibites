'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    UsersThreeIcon,
    ClockIcon,
    CurrencyCircleDollarIcon,
    UserPlusIcon,
} from '@phosphor-icons/react';

const TABS = [
    { href: '/admin/staff',             label: 'Directory',   icon: UsersThreeIcon },
    { href: '/admin/staff/shifts',      label: 'Shifts',      icon: ClockIcon },
    { href: '/admin/staff/sales',       label: 'Staff Sales', icon: CurrencyCircleDollarIcon },
    { href: '/admin/staff/recruitment', label: 'Onboarding',  icon: UserPlusIcon },
] as const;

export function StaffTabNav() {
    const pathname = usePathname();

    return (
        <div className="border-b border-[#f0e8d8] bg-neutral-card/50 px-4 md:px-8">
            <nav className="flex gap-1 -mb-px max-w-6xl mx-auto">
                {TABS.map(({ href, label, icon: Icon }) => {
                    // Directory owns both the group cards and the roster behind
                    // each one, so it stays lit at /admin/staff/group/*. Without
                    // this, opening a branch unlit every tab in the bar.
                    const active = href === '/admin/staff'
                        ? pathname === '/admin/staff' || pathname.startsWith('/admin/staff/group')
                        : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`
                                flex items-center gap-2 px-4 py-3 text-sm font-medium font-body
                                border-b-2 transition-colors
                                ${active
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-neutral-gray hover:text-text-dark hover:border-neutral-gray/20'
                                }
                            `}
                        >
                            <Icon size={16} weight={active ? 'fill' : 'regular'} />
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
