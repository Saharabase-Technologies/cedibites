'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    MapPinIcon,
    PhoneIcon,
    EnvelopeIcon,
    InstagramLogoIcon,
    FacebookLogoIcon,
    WhatsappLogoIcon,
    ClockIcon,
} from '@phosphor-icons/react';
import { useBranches } from '@/lib/api/hooks/useBranches';
import apiClient from '@/lib/api/client';
import { serverNow } from '@/lib/utils/serverClock';

/**
 * How to reach us, in one place.
 *
 * The number printed here used to be +233 24 123 4567, which is a placeholder
 * somebody left behind. Anyone who tapped it reached nobody. The real numbers
 * are the ones in the Restaurant structured data on app/(customer)/layout.tsx,
 * which is what Google reads and shows beside a search result, so the footer had
 * better agree with them.
 */
const PHONE_DISPLAY = '+233 54 816 2282';
const PHONE_DIAL = '+233548162282';
const WHATSAPP_NUMBER = '233548162282';
const EMAIL = 'hello@cedibites.com';

function formatTime12h(time24: string): string {
    const [h, m] = time24.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const SOCIAL = [
    { icon: <InstagramLogoIcon weight="fill" size={20} />, label: 'Instagram', href: '#' },
    { icon: <FacebookLogoIcon weight="fill" size={20} />, label: 'Facebook', href: '#' },
    { icon: <WhatsappLogoIcon weight="fill" size={20} />, label: 'WhatsApp', href: '#' },
];

const QUICK_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Our Menu', href: '/menu' },
    { label: 'Track Order', href: '/orders' },
    { label: 'Find a Branch', href: '#' },
];

/**
 * Two footers, because a phone and a desktop are asking different questions.
 *
 * On a laptop this is a site map: four columns, every branch, every link, the
 * shape a restaurant website has had for twenty years. That is still right
 * there, and it is untouched below.
 *
 * On a phone it is not. The tab bar already carries Home, Menu, Orders and
 * Search, so a column repeating them is a second navigation that agrees with
 * the first, and every branch is already on the map directly above this. What a
 * customer on a phone genuinely cannot get anywhere else is a person: nothing
 * in the whole customer app offers a way to call the shop unless you already
 * have an order in flight.
 *
 * So the phone gets three things in falling order of use. When we are cooking,
 * two ways to reach somebody, and the line at the bottom that every site has.
 */
export default function Footer({ className = '' }: { className?: string }) {
    const { branches } = useBranches();
    const BRANCHES = branches.map((b: any) => ({ id: b.id, name: b.name, address: b.address || '' }));

    const [hours, setHours] = useState({ open: '08:00', close: '22:00' });

    /**
     * The year comes off the server's clock, not this machine's.
     *
     * It is set again after the config call because the offset is learned from
     * response headers, so the first render of a session has nothing to correct
     * with. A device whose clock is a year out is rarer than one an hour out,
     * but the copyright line is the one piece of this footer that would be
     * quietly, visibly wrong for twelve months. See lib/utils/serverClock.ts.
     */
    const [year, setYear] = useState(() => serverNow().getFullYear());

    useEffect(() => {
        apiClient.get('/checkout-config').then((res: unknown) => {
            const d = (res as { data?: { global_operating_hours_open?: string; global_operating_hours_close?: string } })?.data;
            if (d) {
                setHours({
                    open: d.global_operating_hours_open ?? '08:00',
                    close: d.global_operating_hours_close ?? '22:00',
                });
            }
        }).catch(() => { /* keep defaults */ }).finally(() => setYear(serverNow().getFullYear()));
    }, []);

    const hoursDisplay = `${formatTime12h(hours.open)} to ${formatTime12h(hours.close)}`;

    return (
        <footer className={`bg-brand-darker border-t border-white/5 mt-8 ${className}`}>

            {/* ── On a phone ─────────────────────────────────────────────── */}
            <div className="page-x pt-9 pb-7 md:hidden">
                <h2 className="font-brand text-2xl leading-none tracking-wide text-white">
                    Talk to us
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-white/55">
                    Somebody is at the shop every day, {hoursDisplay}.
                </p>

                {/* Calling is the loud one. WhatsApp sits beside it at its own
                    width rather than splitting the row in half, so the two do
                    not read as the same offer twice. */}
                <div className="mt-5 flex items-stretch gap-2.5">
                    <a
                        href={`tel:${PHONE_DIAL}`}
                        className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out active:brightness-90"
                    >
                        <PhoneIcon weight="fill" size={16} />
                        Call the shop
                    </a>
                    <a
                        href={`https://wa.me/${WHATSAPP_NUMBER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/85 transition-colors duration-150 ease-out active:bg-white/10"
                    >
                        <WhatsappLogoIcon weight="fill" size={17} />
                        WhatsApp
                    </a>
                </div>

                <a
                    href={`mailto:${EMAIL}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors duration-150 ease-out active:text-white/70"
                >
                    <EnvelopeIcon weight="fill" size={13} />
                    {EMAIL}
                </a>
            </div>

            {/* Main Footer Grid */}
            <div className="w-[95%] hidden md:w-[80%] xl:w-[70%] mx-auto py-12 md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

                {/* ── Col 1: Brand ── */}
                <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/cblogo.webp" alt="CediBites" width={36} height={36} className="object-contain" />
                        <span className="text-xl font-bold text-primary font-body">CediBites</span>
                    </Link>
                    <p className="text-sm text-white/50 leading-relaxed max-w-[220px]">
                        Authentic Ghanaian flavours, delivered fresh to your door from our branches across Accra.
                    </p>

                    {/* Social */}
                    <div className="flex items-center gap-3 mt-1">
                        {SOCIAL.map((s) => (
                            <a
                                key={s.label}
                                href={s.href}
                                aria-label={s.label}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary text-white/50 transition-colors duration-150"
                            >
                                {s.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* ── Col 2: Hours ── */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                        <ClockIcon weight="fill" size={16} className="text-primary" />
                        Opening Hours
                    </h4>
                    <ul className="flex flex-col gap-3">
                        <li className="flex flex-col gap-0.5">
                            <span className="text-xs text-white/40 uppercase tracking-wide">Daily</span>
                            <span className="text-sm text-white/80">{hoursDisplay}</span>
                        </li>
                    </ul>
                </div>

                {/* ── Col 3: Branches ── */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                        <MapPinIcon weight="fill" size={16} className="text-primary" />
                        Our Branches
                    </h4>
                    <ul className="flex flex-col gap-2.5">
                        {BRANCHES.map((b: any) => (
                            <li key={b.id}>
                                <p className="text-sm font-medium text-white/80">{b.name}</p>
                                <p className="text-xs text-white/40">{b.address}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Col 4: Contact + Quick Links ── */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                        <h4 className="text-white font-semibold">Contact</h4>
                        <ul className="flex flex-col gap-3">
                            <li>
                                <a href={`tel:${PHONE_DIAL}`} className="flex items-center gap-2 text-sm text-white/60 hover:text-primary transition-colors">
                                    <PhoneIcon weight="fill" size={14} className="text-primary shrink-0" />
                                    {PHONE_DISPLAY}
                                </a>
                            </li>
                            <li>
                                <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-sm text-white/60 hover:text-primary transition-colors">
                                    <EnvelopeIcon weight="fill" size={14} className="text-primary shrink-0" />
                                    {EMAIL}
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h4 className="text-white font-semibold">Quick Links</h4>
                        <ul className="flex flex-col gap-2">
                            {QUICK_LINKS.map((l) => (
                                <li key={l.label}>
                                    <Link href={l.href} className="text-sm text-white/50 hover:text-primary transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Divider. The width below md is the page gutter to the pixel, so
                it lines up with the block above it rather than nearly doing. */}
            <div className="w-[calc(100%-2.5rem)] md:w-[80%] xl:w-[70%] mx-auto border-t border-white/5" />

            {/* Bottom Bar */}
            <div className="w-[calc(100%-2.5rem)] md:w-[80%] xl:w-[70%] py-6 mx-auto md:py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-xs text-white/30">
                    © {year} CediBites Restaurant. All rights reserved.
                </p>
                <p className="text-xs text-white/20">
                    Built by <span className="text-white/40">Saharabasetech</span>
                </p>
            </div>

        </footer>
    );
}
