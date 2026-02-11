'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '../base/Button';
import { HamburgerIcon, ListIcon, PhoneIcon, ShoppingBagIcon, UserIcon } from "@phosphor-icons/react";
import Image from 'next/image';

const App = () => {

};

interface NavItem {
    label: string;
    href: string;
    active?: boolean;
}

interface NavbarProps {
    cartItemCount?: number;
    cartTotal?: number;
    userName?: string;
    userAvatar?: string;
    onCartClick?: () => void;
    onLocationClick?: () => void;
}

export default function Navbar({
    cartItemCount = 0,
    cartTotal = 0,
    userName,
    userAvatar,
    onCartClick = () => { },
    onLocationClick = () => { },
}: NavbarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Navigation items
    const navItems: NavItem[] = [
        { label: 'Home', href: '/' },
        { label: 'Menu', href: '/menu' },
        { label: 'Track Order', href: '/orders' },
    ];

    const phoneNumbers = [
        '+233 24 123 4567',
        '+233 50 987 6543',
    ];

    return (
        <>
            <nav>
                <div className={`md:ixed top-0 left-0 w-full z-50 transition-all duration-300 `}>
                    {/* NavRow1 */}
                    <div className='w-full bg-brand-dark flex justify-between items-center '>

                        {/* phone Numbers */}
                        <div className='w-full md:w-[50%]    flex'>
                            {/* {phoneNumbers.map((phone, index) => (
                                <div
                                    key={index}
                                    className=' group cursor-pointer flex items-center justify-start gap-2 py-3 px-4'
                                >
                                    <div className='w-6 h-6 flex group-hover:bg-primary items-center justify-center rounded-full bg-neutral-light'>
                                        <PhoneIcon weight="fill" className="" size={16} />
                                    </div>
                                    <p className='text-text-light group-hover:text-primary'>{phone}</p>
                                </div>
                            ))} */}
                        </div>
                    </div>

                    {/* NavRow 2 */}
                    <div className='w-[95%] md:w-[80%] mx-auto my-4 rounded-xl bg-brand-darker dark:bg-brand-dark flex justify-between items-center py-4 px-6 '>
                        {/* left side */}
                        {/* Logo */}
                        <Link href="/" className='text-2xl font- flex items-center gap-2 text-primary' style={{ fontFamily: 'var(--font-family-brand)' }}>
                            <Image src="/cblogo.webp" alt="CediBites Logo" width={44} height={44} className='object-contain' />
                            <p className='font-caprasimo'>CediBites</p>
                        </Link>

                        {/* middle side */}
                        <div>
                            <ul className='hidden md:flex items-center justify-center gap-8'>
                                {navItems.map((item, index) => (
                                    <li key={index}>
                                        <Link href={item.href} className={` hover:text-primary ${pathname === item.href ? 'text-primary font-bold' : 'text-text-light'}`}>
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>


                        {/* right side */}
                        <div className='hidden md:flex items-center justify-end gap-4'>
                            <div className='w-10 h-10 flex rounded-full bg-brand-dark cursor-pointer items-center justify-center'>
                                <ShoppingBagIcon weight="bold" className="text-text-light" size={28} />
                            </div>
                        </div>

                        {/* mobile */}
                        <div className='flex md:hidden items-center justify-end gap-4'>
                            <div className='w-10 h-10 flex rounded-full bg-brand-darker items-center justify-center'>
                                <ListIcon weight="bold" className="text-text-light" size={24} />
                            </div>
                        </div>
                    </div>

                </div>
            </nav>
        </>
    );
}