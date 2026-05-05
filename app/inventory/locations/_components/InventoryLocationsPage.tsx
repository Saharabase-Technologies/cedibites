'use client';

import { useState } from 'react';
import {
  WarehouseIcon,
  StorefrontIcon,
  MapPinIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import {
  FilterBar,
  FilterSelect,
  InventoryModal,
  FormField,
  TextInput,
  Select,
  PrimaryButton,
} from '../../_components';
import { useInventoryLocations, useCreateInventoryLocation } from '@/lib/api/hooks/inventory/useInventoryLocations';
import type { InventoryLocation, LocationType } from '@/types/inventory';

// ─── Status indicator (subtle gray) ───────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        active ? 'bg-neutral-gray/70' : 'bg-neutral-gray/30'
      }`}
      title={active ? 'Active' : 'Inactive'}
    />
  );
}

// ─── Location card ────────────────────────────────────────────────────────────

function LocationCard({ location }: { location: InventoryLocation }) {
  const isWarehouse = location.type === 'warehouse';
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-neutral-light flex items-center justify-center shrink-0">
          {isWarehouse ? (
            <WarehouseIcon size={20} weight="bold" className="text-text-dark" />
          ) : (
            <StorefrontIcon size={20} weight="bold" className="text-text-dark" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-text-dark font-semibold font-body text-sm">
              {location.name}
            </p>
            <span className="text-xs font-body text-neutral-gray">
              {isWarehouse ? 'Mother kitchen' : 'Satellite kitchen'}
            </span>
          </div>
          <p className="text-neutral-gray text-xs font-mono mt-0.5">{location.code}</p>
        </div>
        <StatusDot active={location.is_active} />
      </div>

      {location.address && (
        <div className="flex items-center gap-1.5 text-neutral-gray text-xs font-body">
          <MapPinIcon size={12} className="shrink-0" />
          {location.address}
        </div>
      )}

      {location.branch && (
        <div className="text-xs font-body text-neutral-gray">
          Branch:{' '}
          <span className="text-text-dark font-medium">{location.branch.name}</span>
        </div>
      )}
    </div>
  );
}

// ─── Add location form ────────────────────────────────────────────────────────

function AddLocationForm({ onClose }: { onClose: () => void }) {
  const [name,    setName]    = useState('');
  const [code,    setCode]    = useState('');
  const [type,    setType]    = useState<LocationType>('satellite');
  const [address, setAddress] = useState('');

  const create = useCreateInventoryLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name,
      code: code.toUpperCase(),
      type,
      address: address || undefined,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Location name" htmlFor="loc-name" required>
        <TextInput
          id="loc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Osu Branch"
          required
          autoFocus
        />
      </FormField>

      <FormField label="Code" htmlFor="loc-code" required hint="Short unique identifier (e.g. SK-005)">
        <TextInput
          id="loc-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. SK-005"
          required
        />
      </FormField>

      <FormField label="Type" htmlFor="loc-type" required>
        <Select
          id="loc-type"
          value={type}
          onChange={(e) => setType(e.target.value as LocationType)}
        >
          <option value="satellite">Satellite kitchen (branch)</option>
          <option value="warehouse">Mother kitchen (central warehouse)</option>
        </Select>
      </FormField>

      <FormField label="Address" htmlFor="loc-address">
        <TextInput
          id="loc-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Oxford St, Osu, Accra"
        />
      </FormField>

      <PrimaryButton type="submit" loading={create.isPending}>
        Save location
      </PrimaryButton>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TypeFilter = '' | 'warehouse' | 'satellite';

export default function InventoryLocationsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [isAddOpen,   setIsAddOpen]   = useState(false);

  const apiType: LocationType | undefined =
    typeFilter === '' ? undefined : typeFilter;

  const { data: locations = [], isLoading } = useInventoryLocations({
    type: apiType,
  });

  const warehouses = locations.filter((l) => l.type === 'warehouse');
  const satellites = locations.filter((l) => l.type === 'satellite');

  return (
    <div className="w-full">
      <FilterBar>
        <p className="text-sm font-body text-neutral-gray flex-1 min-w-0">
          Mother kitchen and satellite kitchen locations.
        </p>
        <FilterSelect
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
          placeholder="All types"
          options={[
            { value: 'warehouse', label: 'Mother kitchen'     },
            { value: 'satellite', label: 'Satellite kitchens' },
          ]}
        />
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
        >
          <PlusIcon size={16} weight="bold" />
          New location
        </button>
      </FilterBar>

      {/* Content */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-neutral-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {(typeFilter === '' || typeFilter === 'warehouse') &&
            warehouses.length > 0 && (
              <div>
                <h2 className="text-xs font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">
                  Mother kitchen ({warehouses.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {warehouses.map((loc) => (
                    <LocationCard key={loc.id} location={loc} />
                  ))}
                </div>
              </div>
            )}

          {(typeFilter === '' || typeFilter === 'satellite') &&
            satellites.length > 0 && (
              <div>
                <h2 className="text-xs font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">
                  Satellite kitchens ({satellites.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {satellites.map((loc) => (
                    <LocationCard key={loc.id} location={loc} />
                  ))}
                </div>
              </div>
            )}

          {locations.length === 0 && (
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
              <MapPinIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
              <p className="text-text-dark font-medium font-body">No locations found</p>
            </div>
          )}
        </div>
      )}

      <InventoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="New Location"
      >
        <AddLocationForm onClose={() => setIsAddOpen(false)} />
      </InventoryModal>
    </div>
  );
}
