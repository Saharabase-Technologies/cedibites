'use client';

import { useState } from 'react';
import {
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon,
  SquaresFourIcon,
  ListIcon,
} from '@phosphor-icons/react';
import {
  InventoryModal,
  FormField,
  TextInput,
  Textarea,
  PrimaryButton,
  SearchBar,
  FilterBar,
  SegmentedTabs,
  DataTable,
  RowActionButton,
  type DataTableColumn,
} from '../../../_components';
import {
  useInventorySuppliers,
  useCreateInventorySupplier,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import type { InventorySupplier } from '@/types/inventory';

// ─── Add supplier form ────────────────────────────────────────────────────────

function AddSupplierForm({ onClose }: { onClose: () => void }) {
  const [name,        setName]        = useState('');
  const [contactName, setContactName] = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [address,     setAddress]     = useState('');
  const [terms,       setTerms]       = useState<string>('');
  const [notes,       setNotes]       = useState('');

  const create = useCreateInventorySupplier();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      code: name.toUpperCase().replace(/\s+/g, '_').slice(0, 10),
      name,
      contact_name: contactName || undefined,
      phone:        phone        || undefined,
      email:        email        || undefined,
      address:      address      || undefined,
      payment_terms_days: terms ? Number(terms) : undefined,
      notes:        notes        || undefined,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Supplier name" htmlFor="sup-name" required>
        <TextInput
          id="sup-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Accra Fresh Farms"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Contact person" htmlFor="sup-contact">
          <TextInput
            id="sup-contact"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Full name"
          />
        </FormField>
        <FormField label="Phone" htmlFor="sup-phone">
          <TextInput
            id="sup-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233…"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Email" htmlFor="sup-email">
          <TextInput
            id="sup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@supplier.com"
          />
        </FormField>
        <FormField label="Payment terms" htmlFor="sup-terms" hint="Days">
          <TextInput
            id="sup-terms"
            type="number"
            min="0"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="30"
          />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="sup-address">
        <TextInput
          id="sup-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, city"
        />
      </FormField>

      <FormField label="Notes" htmlFor="sup-notes">
        <Textarea
          id="sup-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lead time, delivery preferences, etc."
        />
      </FormField>

      <PrimaryButton type="submit" loading={create.isPending}>
        Save supplier
      </PrimaryButton>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'table';

export function CatalogSuppliersPage() {
  const can = useStaffAuthOptional()?.can;
  const canManage = !can || can('inventory.supplier.manage');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search,    setSearch]    = useState('');
  const [view,      setView]      = useState<ViewMode>('grid');
  const { data: suppliers = [], isLoading } = useInventorySuppliers();

  const filtered = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q)
    );
  });

  const columns: DataTableColumn<InventorySupplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      sortValue: (s) => s.name.toLowerCase(),
      cell: (s) => (
        <div>
          <p className="font-medium text-text-dark">{s.name}</p>
          <p className="text-neutral-gray text-[11px] font-mono mt-0.5">{s.code}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideBelow: 'sm',
      sortValue: (s) => s.contact_name ?? '',
      cell: (s) => s.contact_name ?? <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideBelow: 'md',
      cell: (s) => s.phone ?? <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'email',
      header: 'Email',
      hideBelow: 'lg',
      cell: (s) => s.email ?? <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'terms',
      header: 'Terms',
      hideBelow: 'md',
      align: 'right',
      sortValue: (s) => s.payment_terms_days ?? -1,
      cell: (s) =>
        s.payment_terms_days != null ? (
          <span className="tabular-nums">Net {s.payment_terms_days}d</span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-24',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <RowActionButton
            icon={<PencilSimpleIcon size={14} weight="bold" />}
            label={`Edit ${s.name}`}
            onClick={() => console.info('edit', s)}
          />
          <RowActionButton
            icon={<TrashIcon size={14} weight="bold" />}
            label={`Delete ${s.name}`}
            destructive
            onClick={() => console.info('delete', s)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers…" />
        <SegmentedTabs<ViewMode>
          value={view}
          onChange={setView}
          options={[
            { value: 'grid',  label: 'Grid',  icon: <SquaresFourIcon size={14} weight="bold" /> },
            { value: 'table', label: 'Table', icon: <ListIcon size={14} weight="bold" /> },
          ]}
        />
        {canManage && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="ml-auto flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
          >
            <PlusIcon size={16} weight="bold" />
            Add Supplier
          </button>
        )}
      </FilterBar>

      {isLoading ? (
        view === 'grid' ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-neutral-light rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <DataTable<InventorySupplier>
            data={[]}
            columns={columns}
            isLoading
          />
        )
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setIsAddOpen(true)} hasSearch={!!search} canAdd={canManage} />
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <SupplierCard key={s.id} supplier={s} />
          ))}
        </div>
      ) : (
        <DataTable<InventorySupplier>
          data={filtered}
          columns={columns}
          rowKey={(s) => s.id}
          defaultSortKey="name"
          pageSize={10}
        />
      )}

      <InventoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add supplier"
        size="lg"
      >
        <AddSupplierForm onClose={() => setIsAddOpen(false)} />
      </InventoryModal>
    </>
  );
}

function SupplierCard({ supplier }: { supplier: InventorySupplier }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 hover:shadow-sm transition-shadow flex flex-col gap-3 cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-neutral-light flex items-center justify-center shrink-0">
          <TruckIcon size={20} weight="bold" className="text-text-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-dark font-semibold font-body text-sm">{supplier.name}</p>
          <p className="text-neutral-gray text-xs font-mono mt-0.5">{supplier.code}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs font-body">
        {supplier.contact_name && (
          <Detail icon={<UserIcon size={12} />}>{supplier.contact_name}</Detail>
        )}
        {supplier.phone && (
          <Detail icon={<PhoneIcon size={12} />}>{supplier.phone}</Detail>
        )}
        {supplier.email && (
          <Detail icon={<EnvelopeIcon size={12} />}>{supplier.email}</Detail>
        )}
        {supplier.address && (
          <Detail icon={<MapPinIcon size={12} />}>{supplier.address}</Detail>
        )}
        {supplier.payment_terms_days != null && (
          <Detail icon={<CalendarIcon size={12} />}>
            Net {supplier.payment_terms_days} days
          </Detail>
        )}
      </div>
    </div>
  );
}

function Detail({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-neutral-gray">
      <span className="text-neutral-gray/70 shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function EmptyState({
  onAdd,
  hasSearch,
  canAdd,
}: {
  onAdd: () => void;
  hasSearch: boolean;
  canAdd: boolean;
}) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      <TruckIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      <p className="text-text-dark font-medium font-body">
        {hasSearch ? 'No suppliers match your search' : 'No suppliers yet'}
      </p>
      <p className="text-neutral-gray text-sm font-body mt-1 mb-5 max-w-xs">
        {hasSearch
          ? 'Try clearing the search or adjusting your terms.'
          : 'Track who you buy from, their contact info and payment terms.'}
      </p>
      {!hasSearch && canAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <PlusIcon size={16} weight="bold" />
          Add first supplier
        </button>
      )}
    </div>
  );
}
