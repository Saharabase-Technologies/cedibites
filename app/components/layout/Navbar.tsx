'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '../base/Button';
import { HamburgerIcon, ListIcon, HouseIcon, PathIcon, ShoppingBagIcon, UserIcon } from "@phosphor-icons/react";
import Image from 'next/image';
import LocationBadge from '../ui/LocationBadge';
import { useBranch } from '../providers/BranchProvider';
import { useLocation } from '../providers/LocationProvider';
import { useModal } from '../providers/ModalProvider';



const App = () => {

};

interface NavItem {
    label: string;
    href: string;
    active?: boolean;
    icon: React.ReactNode;
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
    const { selectedBranch, getBranchesWithDistance } = useBranch();
    const { openBranchSelector } = useModal();
    const { coordinates, permissionStatus } = useLocation();
    const [mounted, setMounted] = useState(false);


    const branchDistance = coordinates && selectedBranch
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude)
            .find(b => b.id === selectedBranch.id)?.distance
        : null;

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMobileMenuOpen]);

    // 👇 Check if location is being requested
    const isLocationLoading = permissionStatus === 'prompt' && !coordinates;

    const navItems: NavItem[] = [
        { label: 'Home', icon: <HouseIcon weight="fill" size={32} />, href: '/' },
        { label: 'Menu', icon: <HamburgerIcon weight="fill" size={32} />, href: '/menu' },
        { label: 'Track Order', icon: <PathIcon weight="fill" size={32} />, href: '/orders' },
    ];

    const isActive = (href: string) => pathname === href;

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
                    <div className='w-[95%] md:w-[80%] mx-auto my- rounded-b-4xl bg-brand-darker dark:bg-brand-dark flex justify-between items-center py-6 px-12 '>
                        {/* left side */}
                        {/* Logo */}
                        <Link href="/" className='text-2xl font- flex items-center gap-2 text-primary' style={{ fontFamily: 'var(--font-family-brand)' }}>
                            <Image src="/cblogo.webp" alt="CediBites Logo" width={44} height={44} className='object-contain' />
                            <p className='hidden md:flex uppercase font-caprasimo'>CediBites</p>
                        </Link>

                        {/* middle side */}
                        <div>
                            <ul className='hidden md:flex items-center justify-center gap-12'>
                                {navItems.map((item, index) => (
                                    <li key={index}>
                                        <div className=''>
                                            <Link href={item.href} className={` hover:text-primary gap-2 flex text-base items-center   ${pathname === item.href ? 'text-primary font-extrabold px-6 py-2 backdrop-blur- ' : 'text-text-light font-bold'}`}>
                                                {item.icon} {item.label}
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className='flex md:hidden'>
                                <LocationBadge
                                    branch={selectedBranch}
                                    distance={branchDistance}
                                    onClick={openBranchSelector}
                                    fullWidth={false}
                                    isLoading={isLocationLoading}
                                />
                            </div>
                        </div>


                        {/* right side - COMBINED */}
                        <div className='flex items-center gap-3'>
                            <div className='hidden md:flex'>
                                <LocationBadge
                                    branch={selectedBranch}
                                    distance={branchDistance}
                                    onClick={openBranchSelector}
                                    fullWidth={false}
                                    isLoading={isLocationLoading}

                                />
                            </div>

                            {/* Mobile menu icon */}
                            <div className='flex md:hidden items-center justify-end'>
                                <div className='w-10 h-10 flex rounded-full bg-brand-darker items-center justify-center'>
                                    <ListIcon weight="bold" className="text-primary" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </nav>
        </>
    );
}