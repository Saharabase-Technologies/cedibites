'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HamburgerIcon, ListIcon, HouseIcon, PathIcon,
    ShoppingBagIcon, UserIcon, XIcon,
    SignInIcon, CaretRightIcon, StorefrontIcon, SignOutIcon,
} from "@phosphor-icons/react";
import Image from 'next/image';
import { useBranch } from '../providers/BranchProvider';
import { useLocation } from '../providers/LocationProvider';
import { useModal } from '../providers/ModalProvider';
import { useCart } from '../providers/CartProvider';
import { useAuth } from '../providers/AuthProvider';
import CartDrawer from '../ui/CartDrawer';
import AuthModal from '../ui/AuthModal';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    matchPrefixes?: string[];
}

export default function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const { selectedBranch, getBranchesWithDistance } = useBranch();
    const { openBranchSelector, openCart, openAuth } = useModal();
    const { coordinates } = useLocation();
    const { totalItems } = useCart();
    const { user, isLoggedIn, logout } = useAuth();

    const branchDistance = coordinates && selectedBranch
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude)
            .find(b => b.id === selectedBranch.id)?.distance
        : null;

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMobileMenuOpen(false);
                setIsUserMenuOpen(false);
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    useEffect(() => { setIsUserMenuOpen(false); }, [pathname]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        if (isUserMenuOpen) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isUserMenuOpen]);

    const navItems: NavItem[] = [
        { label: 'Home', icon: <HouseIcon weight="fill" size={20} />, href: '/' },
        { label: 'Our Menu', icon: <HamburgerIcon weight="fill" size={20} />, href: '/menu' },
        { label: 'Track Order', icon: <PathIcon weight="fill" size={20} />, href: '/orders', matchPrefixes: ['/orders/', '/order-history'] },
    ];

    const isNavActive = (item: NavItem) =>
        pathname === item.href ||
        item.matchPrefixes?.some(p => pathname === p || pathname.startsWith(p)) === true;

    const initials = user?.name ? user.name.charAt(0).toUpperCase() : null;

    return (
        <>
            <nav>
                <div className={`fixed top-0 left-0 w-full z-30 transition-all duration-300`}>

                    {/* NavRow1 — untouched */}
                    <div className='w-full bg-brown flex justify-between items-center'>
                        <div className='w-full flex' />
                    </div>

                    {/* NavRow2 — untouched layout */}
                    <div className='w-full px-6 sm:px-12 py-6 mx-auto bg-brand-darker dark:bg-brand-dark flex justify-between items-center'>

                        {/* Logo — unchanged */}
                        <div className='flex shrink-0 items-center gap-x-2'>
                            <Link href="/" className='text-2xl flex items-center gap-2 text-primary'>
                                <Image src="/cblogo.webp" alt="CediBites Logo" width={44} height={44} className='object-contain' />
                                <p className='hidde md:flex text-3xl md:text-3xl font-bold font-body'>CediBites</p>
                            </Link>
                        </div>

                        {/* Desktop nav — unchanged */}
                        <div className='w-[50%]'>
                            <ul className='hidden md:flex items-center justify-center gap-6'>
                                {navItems.map((item, index) => (
                                    <li key={index}>
                                        <Link href={item.href} className={`hover:text-primary gap-2 flex md:text-base xl:text-lg items-center ${isNavActive(item) ? 'text-primary font-extrabold px-6 py-2 backdrop-blur-md bg-primary/25 rounded-full' : 'text-text-light font-bold px-2 xl:px-6 rounded-full py-2 bg-transparent'}`}>
                                            <span className="hidden xl:inline-flex">{item.icon}</span>
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Right side */}
                        <div className='flex justify-end items-center gap-3'>

                            {/* Cart — unchanged */}
                            <button
                                onClick={openCart}
                                className="relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer bg-neutral-light/80 hover:bg-neutral-light transition-colors"
                                aria-label="Open cart"
                            >
                                <ShoppingBagIcon weight="bold" size={20} className="text-text-dark" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1 leading-none">
                                        {totalItems > 99 ? '99+' : totalItems}
                                    </span>
                                )}
                            </button>

                            {/* ── Desktop user button ─────────────────────────── */}
                            <div ref={userMenuRef} className="hidden md:block relative">
                                {isLoggedIn ? (
                                    <>
                                        {/* Avatar — click to toggle */}
                                        <button
                                            onClick={() => setIsUserMenuOpen(prev => !prev)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-colors"
                                            aria-label="My account"
                                            aria-expanded={isUserMenuOpen}
                                        >
                                            {initials}
                                        </button>

                                        {/* Click dropdown */}
                                        <div className={`absolute right-0 top-full mt-2 w-52 bg-white dark:bg-brand-darker rounded-2xl shadow-xl border border-neutral-gray/10 py-2
                                            transition-all duration-150 origin-top-right z-40
                                            ${isUserMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                            <div className="px-4 py-3 border-b border-neutral-gray/10">
                                                <p className="text-sm font-bold text-text-dark dark:text-text-light truncate">{user?.name}</p>
                                                <p className="text-xs text-neutral-gray truncate">{user?.phone}</p>
                                            </div>
                                            <Link href="/order-history"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-dark dark:text-text-light hover:text-primary hover:bg-primary/5 transition-colors">
                                                <PathIcon weight="fill" size={14} className="text-neutral-gray" /> My Orders
                                            </Link>
                                            <button onClick={() => { logout(); setIsUserMenuOpen(false); }}
                                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors">
                                                <SignOutIcon weight="fill" size={14} /> Sign Out
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* Guest — plain icon, opens auth modal */
                                    <button
                                        onClick={openAuth}
                                        className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer bg-neutral-light/80 hover:bg-neutral-light transition-colors"
                                        aria-label="Sign in"
                                    >
                                        <UserIcon weight='bold' size={20} className="text-text-dark" />
                                    </button>
                                )}
                            </div>

                            {/* Mobile menu toggle — unchanged */}
                            <div className='md:hidden flex'>
                                <button
                                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                                    className="relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer bg-neutral-light/80 hover:bg-neutral-light transition-colors">
                                    <span className={`absolute transition-all duration-200 ${isMobileMenuOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-90'}`}>
                                        <XIcon weight="bold" size={20} className="text-text-dark" />
                                    </span>
                                    <span className={`absolute transition-all duration-200 ${isMobileMenuOpen ? 'opacity-0 scale-75 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                                        <ListIcon weight="bold" size={24} className="text-text-dark" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ─── Mobile Menu ─────────────────────────────────────────────── */}
            <div
                onClick={() => setIsMobileMenuOpen(false)}
                className={`fixed inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden
                    ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            <div className={`fixed top-0 right-0 z-20 h-dvh w-[82vw] max-w-[320px] bg-brand-darker flex flex-col shadow-2xl
                transition-transform duration-300 ease-out md:hidden
                ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="flex items-center justify-between px-5 pt-6 pb-5 shrink-0 border-b border-white/8">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-primary">
                        <Image src="/cblogo.webp" alt="CediBites" width={30} height={30} className="object-contain" />
                        <span className="text-lg font-bold font-body">CediBites</span>
                    </Link>
                    <button onClick={() => setIsMobileMenuOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition-colors">
                        <XIcon weight="bold" size={16} className="text-text-light" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain py-2">

                    {/* ── Account section ─────────────────────────────────── */}
                    <div className="px-4 py-4 border-b border-white/8">
                        <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest mb-3 px-1">Account</p>

                        {isLoggedIn ? (
                            <div className="flex flex-col gap-1.5">
                                {/* User card */}
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/6 border border-white/8 mb-1">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 font-bold text-white text-sm">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text-light truncate">{user?.name}</p>
                                        <p className="text-xs text-neutral-gray truncate">{user?.phone}</p>
                                    </div>
                                </div>
                                <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-text-light hover:bg-white/6 hover:text-primary transition-all text-sm font-semibold">
                                    <PathIcon weight="fill" size={15} className="text-neutral-gray" /> My Orders
                                </Link>
                                <button onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-error hover:bg-error/8 transition-all text-sm font-semibold text-left">
                                    <SignOutIcon weight="fill" size={15} /> Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => { openAuth(); setIsMobileMenuOpen(false); }}
                                    className="flex items-center justify-between w-full bg-primary hover:bg-primary-hover text-white font-bold px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]">
                                    <div className="flex items-center gap-3">
                                        <SignInIcon weight="fill" size={18} />
                                        <span className="text-sm">Sign In to your account</span>
                                    </div>
                                    <CaretRightIcon size={16} weight="bold" className="shrink-0" />
                                </button>
                                <p className="text-xs text-neutral-gray text-center">
                                    New here?{' '}
                                    <button onClick={() => { openAuth(); setIsMobileMenuOpen(false); }} className="text-primary font-semibold hover:underline">
                                        Create a free account
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Navigation ──────────────────────────────────────── */}
                    <div className="px-4 py-4 border-b border-white/8">
                        <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest mb-3 px-1">Menu</p>
                        <ul className="flex flex-col gap-1">
                            {navItems.map((item) => {
                                const isActive = isNavActive(item);
                                return (
                                    <li key={item.href}>
                                        <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm border
                                                ${isActive ? 'bg-primary/15 text-primary border-primary/25' : 'text-text-light hover:bg-white/6 hover:text-primary border-transparent'}`}>
                                            <span className={isActive ? 'text-primary' : 'text-neutral-gray'}>{item.icon}</span>
                                            {item.label}
                                            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* ── Current Branch ───────────────────────────────────── */}
                    {selectedBranch && (
                        <div className="px-4 py-4 border-b border-white/8">
                            <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest mb-3 px-1">Your Branch</p>
                            <button onClick={() => { openBranchSelector(); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/8 hover:border-primary/30 hover:bg-primary/8 transition-all text-left group">
                                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                    <StorefrontIcon weight="fill" size={16} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-text-light truncate">{selectedBranch.name} Branch</p>
                                    <p className="text-xs text-neutral-gray truncate">{selectedBranch.address}</p>
                                    {branchDistance !== null && (
                                        <p className="text-xs text-primary font-semibold mt-0.5">{branchDistance?.toFixed(1)} km away</p>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-primary group-hover:underline shrink-0">Change</span>
                            </button>
                        </div>
                    )}

                    {/* ── Quick Actions ────────────────────────────────────── */}
                    <div className="px-4 py-4">
                        <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest mb-3 px-1">Quick Actions</p>
                        <button onClick={() => { openCart(); setIsMobileMenuOpen(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-text-light hover:bg-white/6 hover:text-primary transition-all font-bold text-sm text-left border border-transparent hover:border-white/8">
                            <ShoppingBagIcon weight="fill" size={18} className="text-neutral-gray shrink-0" />
                            <span className="flex-1">View Cart</span>
                            {totalItems > 0 && (
                                <span className="min-w-5.5 h-5 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1.5 shrink-0">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-white/8 shrink-0">
                    {/* <p className="text-xs text-neutral-gray/60 text-center">Fresh from the kitchen</p> */}
                </div>
            </div>

            <CartDrawer />
            <AuthModal />
        </>
    );
}