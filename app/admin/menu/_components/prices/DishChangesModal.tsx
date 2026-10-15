'use client';

import { useState } from 'react';
import { InventoryModal, FormField, TextInput, Toggle, PrimaryButton } from '@/app/inventory/_components';
import type { BoardDish, DraftField } from '@/lib/api/services/menuPrices.service';
import { formatGHS } from '@/lib/utils/currency';
import { BUTTON_QUIET } from './StatusCard';

export interface DishChange {
    optionId: number | null;
    field: DraftField;
    value: string | boolean | null;
}

/**
 * Everything about one dish that waits for the button, apart from prices:
 * its name, whether it stays on sale, what each option is called, and new
 * options.
 *
 * Mounted fresh for each dish, so its fields start from the board.
 */
export function DishChangesModal({
    dish,
    onClose,
    onSave,
    onAddOption,
    onRemoveNewOption,
}: {
    dish: BoardDish;
    onClose: () => void;
    onSave: (changes: DishChange[]) => Promise<void>;
    onAddOption: (label: string, receiptName: string, price: number) => Promise<boolean>;
    onRemoveNewOption: (draftId: number) => Promise<void>;
}) {
    const [name, setName] = useState(dish.drafts.name?.value ?? dish.name);
    const [offSale, setOffSale] = useState(Boolean(dish.drafts.off_sale));
    const [options, setOptions] = useState(
        dish.options.map(o => ({
            id: o.id,
            label: o.drafts.option_label?.value ?? o.option_label,
            receipt: o.drafts.display_name?.value ?? o.display_name ?? '',
            todayLabel: o.option_label,
            todayReceipt: o.display_name ?? '',
            standard: o.option_key === 'standard',
        })),
    );
    const [saving, setSaving] = useState(false);

    const [newLabel, setNewLabel] = useState('');
    const [newReceipt, setNewReceipt] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [adding, setAdding] = useState(false);

    function changes(): DishChange[] {
        const out: DishChange[] = [];
        const wantedName = name.trim();

        // Each field is sent when it differs from what is waiting. The server
        // drops any that end up equal to today's value.
        if (wantedName !== (dish.drafts.name?.value ?? dish.name)) {
            out.push({ optionId: null, field: 'name', value: wantedName === dish.name ? null : wantedName });
        }
        if (offSale !== Boolean(dish.drafts.off_sale)) {
            out.push({ optionId: null, field: 'off_sale', value: offSale ? true : null });
        }

        for (const o of options) {
            const before = dish.options.find(x => x.id === o.id);
            if (!before) continue;
            const label = o.label.trim();
            const receipt = o.receipt.trim();
            if (label !== (before.drafts.option_label?.value ?? before.option_label)) {
                out.push({ optionId: o.id, field: 'option_label', value: label === before.option_label ? null : label });
            }
            if (receipt !== (before.drafts.display_name?.value ?? before.display_name ?? '')) {
                out.push({ optionId: o.id, field: 'display_name', value: receipt === (before.display_name ?? '') ? null : receipt });
            }
        }

        return out;
    }

    async function save() {
        const list = changes();
        if (list.length === 0) {
            onClose();
            return;
        }
        setSaving(true);
        try {
            await onSave(list);
            onClose();
        } catch {
            // The page has already said what went wrong. Stay open so nothing typed is lost.
        } finally {
            setSaving(false);
        }
    }

    async function add() {
        const price = Number(newPrice.trim());
        if (!newLabel.trim() || !newReceipt.trim() || !Number.isFinite(price) || price < 0) return;
        setAdding(true);
        try {
            const ok = await onAddOption(newLabel.trim(), newReceipt.trim(), Math.round(price * 100) / 100);
            if (ok) {
                setNewLabel('');
                setNewReceipt('');
                setNewPrice('');
            }
        } finally {
            setAdding(false);
        }
    }

    const canAdd = newLabel.trim() !== '' && newReceipt.trim() !== '' && newPrice.trim() !== '';

    return (
        <InventoryModal isOpen onClose={onClose} title={dish.name} size="lg">
            <p className="text-sm font-body text-neutral-gray mb-5">
                These wait with the prices and go live when you press the button.
            </p>

            <div className="space-y-4">
                <FormField label="Dish name" htmlFor="dish-name">
                    <TextInput id="dish-name" value={name} onChange={e => setName(e.target.value)} />
                </FormField>

                {dish.is_available && (
                    <Toggle checked={offSale} onChange={setOffSale} label="Take this dish off sale" />
                )}
            </div>

            <h4 className="text-sm font-semibold font-body text-text-dark mt-6 mb-1">Options</h4>
            <p className="text-xs font-body text-neutral-gray mb-3">
                The option is what the customer taps. The receipt name is what prints on the slip.
            </p>
            <div className="space-y-3">
                {options.map((o, i) => (
                    <div key={o.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <TextInput
                            aria-label={`Option ${i + 1}`}
                            value={o.label}
                            disabled={o.standard}
                            onChange={e => setOptions(prev => prev.map(x => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
                        />
                        <TextInput
                            aria-label={`Receipt name ${i + 1}`}
                            placeholder={o.standard ? 'The dish name prints' : 'Receipt name'}
                            value={o.receipt}
                            onChange={e => setOptions(prev => prev.map(x => (x.id === o.id ? { ...x, receipt: e.target.value } : x)))}
                        />
                    </div>
                ))}
            </div>

            <PrimaryButton className="mt-5" loading={saving} onClick={save}>
                Save
            </PrimaryButton>

            <div className="border-t border-neutral-100 mt-6 pt-5">
                <h4 className="text-sm font-semibold font-body text-text-dark mb-3">New options</h4>

                {dish.new_options.length > 0 && (
                    <ul className="space-y-2 mb-4">
                        {dish.new_options.map(added => (
                            <li key={added.draft_id} className="flex items-center gap-3 bg-neutral-light rounded-xl px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-body text-text-dark">{added.display_name}</p>
                                    <p className="text-xs font-body text-neutral-gray">Option: {added.option_label}</p>
                                </div>
                                <span className="text-sm font-semibold font-body tabular-nums">{formatGHS(added.price)}</span>
                                <button type="button" className={BUTTON_QUIET} onClick={() => onRemoveNewOption(added.draft_id)}>
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_7rem] gap-2">
                    <FormField label="Option" htmlFor="new-label">
                        <TextInput id="new-label" placeholder="7 Wings" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                    </FormField>
                    <FormField label="Receipt name" htmlFor="new-receipt">
                        <TextInput
                            id="new-receipt"
                            placeholder="7 Pieces of Special Crunch Wings"
                            value={newReceipt}
                            onChange={e => setNewReceipt(e.target.value)}
                        />
                    </FormField>
                    <FormField label="Price" htmlFor="new-price">
                        <TextInput
                            id="new-price"
                            inputMode="decimal"
                            placeholder="65"
                            className="text-right tabular-nums"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                        />
                    </FormField>
                </div>
                <button type="button" className={`${BUTTON_QUIET} mt-3`} disabled={!canAdd || adding} onClick={add}>
                    {adding ? 'Adding…' : 'Add this option'}
                </button>
            </div>
        </InventoryModal>
    );
}
