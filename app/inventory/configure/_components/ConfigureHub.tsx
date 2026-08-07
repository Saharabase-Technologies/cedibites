'use client';

import Link from 'next/link';
import {
  RulerIcon,
  TagIcon,
  MapPinIcon,
  PackageIcon,
  ForkKnifeIcon,
  CheckIcon,
  CaretRightIcon,
  LockSimpleIcon,
} from '@phosphor-icons/react';
import {
  useInventoryItems,
  useInventoryCategories,
  useInventoryUnits,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useInventoryRecipes } from '@/lib/api/hooks/inventory/useInventoryRecipes';

// ─── Step model ───────────────────────────────────────────────────────────────

type Step = {
  n: number;
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
  /** Blocks the step until a prerequisite is met (e.g. recipes need items). */
  lockedReason?: string;
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function StepRow({ step }: { step: Step }) {
  const locked = Boolean(step.lockedReason);

  const badge = (
    <span
      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold font-body ${
        step.done
          ? 'bg-secondary text-white'
          : locked
            ? 'bg-neutral-light text-neutral-gray/50'
            : 'bg-primary/10 text-primary'
      }`}
    >
      {step.done ? <CheckIcon size={18} weight="bold" /> : locked ? <LockSimpleIcon size={16} /> : step.n}
    </span>
  );

  const Icon = step.icon;

  const body = (
    <>
      {badge}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon size={16} weight="bold" className={locked ? 'text-neutral-gray/50' : 'text-text-dark'} />
          <p className={`font-semibold font-body text-sm ${locked ? 'text-neutral-gray/60' : 'text-text-dark'}`}>
            {step.label}
          </p>
        </div>
        <p className="text-neutral-gray text-xs font-body mt-0.5">
          {step.lockedReason ?? step.desc}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-xs font-semibold font-body ${
            step.done ? 'text-secondary' : locked ? 'text-neutral-gray/50' : 'text-primary'
          }`}
        >
          {step.done ? 'Done' : locked ? 'Locked' : 'To do'}
        </span>
        {!locked && <CaretRightIcon size={14} className="text-neutral-gray/50" />}
      </div>
    </>
  );

  const base =
    'flex items-center gap-3 p-4 rounded-2xl border border-[#f0e8d8] bg-neutral-card transition-shadow';

  if (locked) {
    return <div className={`${base} opacity-80 cursor-not-allowed`}>{body}</div>;
  }

  return (
    <Link href={step.href} className={`${base} hover:shadow-sm cursor-pointer`}>
      {body}
    </Link>
  );
}

// ─── Hub ──────────────────────────────────────────────────────────────────────

export function ConfigureHub() {
  const { data: units = [],      isLoading: lu } = useInventoryUnits();
  const { data: categories = [], isLoading: lc } = useInventoryCategories();
  const { data: locations = [],  isLoading: ll } = useInventoryLocations();
  const { data: items = [],      isLoading: li } = useInventoryItems();
  const { data: recipes = [],    isLoading: lr } = useInventoryRecipes();

  const isLoading = lu || lc || ll || li || lr;
  const hasItems = items.length > 0;

  const steps: Step[] = [
    {
      n: 1, key: 'units', label: 'Units of measurement',
      desc: 'How you measure stock - piece, kg, litre, crate.',
      href: '/inventory/catalog/units', icon: RulerIcon, done: units.length > 0,
    },
    {
      n: 2, key: 'categories', label: 'Categories',
      desc: 'Group items - proteins, dry goods, packaging.',
      href: '/inventory/catalog/categories', icon: TagIcon, done: categories.length > 0,
    },
    {
      n: 3, key: 'locations', label: 'Locations',
      desc: 'Your mother kitchen and satellite kitchens.',
      href: '/inventory/locations', icon: MapPinIcon, done: locations.length > 0,
    },
    {
      n: 4, key: 'items', label: 'Inventory items',
      desc: 'The stock you buy, count and consume.',
      href: '/inventory/catalog/items', icon: PackageIcon, done: hasItems,
    },
    {
      n: 5, key: 'recipes', label: 'Recipes',
      desc: 'Map menu dishes to the ingredients they consume.',
      href: '/inventory/catalog/recipes', icon: ForkKnifeIcon, done: recipes.length > 0,
      lockedReason: hasItems ? undefined : 'Add at least one inventory item first.',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[76px] bg-neutral-light rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Progress */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-text-dark font-semibold font-body text-sm">
            {completed === steps.length ? 'Setup complete 🎉' : 'Getting started'}
          </p>
          <p className="text-neutral-gray text-xs font-body">
            {completed} of {steps.length} complete
          </p>
        </div>
        <div className="h-2 rounded-full bg-neutral-light overflow-hidden">
          <div
            className="h-full bg-secondary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-neutral-gray text-xs font-body mt-3">
          Follow the steps in order - each one builds on the last. Recipes need items,
          items need units and categories.
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <StepRow key={step.key} step={step} />
        ))}
      </div>
    </div>
  );
}
