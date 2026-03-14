'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OptionTemplate {
    id: string;
    name: string;
    options: { label: string; price: string }[];
}

export interface AddOn {
    id: string;
    name: string;
    price: number;
    perPiece: boolean;
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
    open: string;    // "09:00"
    close: string;   // "22:00"
    closed: boolean;
}

export interface BranchSettings {
    isOpen: boolean;
    orderTypes: {
        delivery: boolean;
        pickup: boolean;
        dineIn: boolean;
    };
    paymentMethods: {
        momo: boolean;
        cashDelivery: boolean;
        cashPickup: boolean;
    };
    hours: Record<DayKey, DayHours>;
}

export interface MenuConfig {
    categories: string[];
    optionTemplates: OptionTemplate[];
    addOns: AddOn[];
    branch: BranchSettings;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_HOURS: Record<DayKey, DayHours> = {
    mon: { open: '09:00', close: '22:00', closed: false },
    tue: { open: '09:00', close: '22:00', closed: false },
    wed: { open: '09:00', close: '22:00', closed: false },
    thu: { open: '09:00', close: '22:00', closed: false },
    fri: { open: '09:00', close: '23:00', closed: false },
    sat: { open: '09:00', close: '23:00', closed: false },
    sun: { open: '10:00', close: '21:00', closed: false },
};

export const DEFAULT_CONFIG: MenuConfig = {
    categories: ['Basic Meals', 'Budget Bowls', 'Combos', 'Top Ups', 'Drinks'],
    optionTemplates: [
        {
            id: 'tpl-sm-lg',
            name: 'Small / Large',
            options: [{ label: 'Small', price: '' }, { label: 'Large', price: '' }],
        },
        {
            id: 'tpl-plain-assorted',
            name: 'Plain / Assorted',
            options: [{ label: 'Plain', price: '' }, { label: 'Assorted', price: '' }],
        },
        {
            id: 'tpl-full-half-quarter',
            name: 'Full / Half / Quarter',
            options: [
                { label: 'Full',    price: '' },
                { label: 'Half',    price: '' },
                { label: 'Quarter', price: '' },
            ],
        },
        {
            id: 'tpl-350ml-500ml',
            name: '350ml / 500ml',
            options: [{ label: '350ml', price: '' }, { label: '500ml', price: '' }],
        },
    ],
    addOns: [
        { id: 'addon-drumsticks', name: 'Drumsticks',               price: 12, perPiece: true  },
        { id: 'addon-tilapia',    name: 'Charcoal Grilled Tilapia', price: 60, perPiece: false },
    ],
    branch: {
        isOpen: true,
        orderTypes:     { delivery: true, pickup: true, dineIn: false },
        paymentMethods: { momo: true, cashDelivery: true, cashPickup: true },
        hours: DEFAULT_HOURS,
    },
};

const STORAGE_KEY = 'cedibites_menu_config';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMenuConfig() {
    const [config, setConfig] = useState<MenuConfig>(DEFAULT_CONFIG);
    const [ready,  setReady]  = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<MenuConfig>;
                setConfig({
                    categories:      parsed.categories      ?? DEFAULT_CONFIG.categories,
                    optionTemplates: parsed.optionTemplates ?? DEFAULT_CONFIG.optionTemplates,
                    addOns:          parsed.addOns          ?? DEFAULT_CONFIG.addOns,
                    branch:          parsed.branch          ?? DEFAULT_CONFIG.branch,
                });
            }
        } catch {
            // silently fall back to defaults
        }
        setReady(true);
    }, []);

    const save = useCallback((updated: MenuConfig) => {
        setConfig(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // storage quota — ignore
        }
    }, []);

    return { config, save, ready };
}
