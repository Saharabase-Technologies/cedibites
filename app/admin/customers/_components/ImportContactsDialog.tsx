'use client';

import { useRef, useState } from 'react';
import {
    UploadSimpleIcon,
    FileCsvIcon,
    WarningCircleIcon,
    ArrowRightIcon,
} from '@phosphor-icons/react';
import {
    InventoryModal,
    FormField,
    TextInput,
    Textarea,
    Select,
    PrimaryButton,
} from '@/app/inventory/_components';
import { contactService } from '@/lib/api/services/contact.service';
import { useContactMutations } from '@/lib/api/hooks/useContacts';
import { toast } from '@/lib/utils/toast';
import type { ContactImportPreview } from '@/types/contacts';

/**
 * Upload a list, see what it will do, then commit.
 *
 * Two steps, never one. An import writes thousands of rows and the interesting
 * part is always the difference between the row count of the file and the number
 * of contacts that come out of it — duplicates, unreadable numbers, and people
 * who turn out to be customers already. Committing straight from the file picker
 * would make that difference something you discover afterwards.
 *
 * The File object is held across both steps and uploaded twice. See
 * ContactController::preview() for why that beats parking a parsed file in
 * server-side state.
 */
export function ImportContactsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ContactImportPreview | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const [label, setLabel] = useState('');
    const [sourceNote, setSourceNote] = useState('');
    const [phoneColumn, setPhoneColumn] = useState<number | null>(null);
    const [nameColumn, setNameColumn] = useState<number | null>(null);

    const fileInput = useRef<HTMLInputElement>(null);
    const { importContacts } = useContactMutations();

    const reset = () => {
        setFile(null);
        setPreview(null);
        setLabel('');
        setSourceNote('');
        setPhoneColumn(null);
        setNameColumn(null);
        if (fileInput.current) fileInput.current.value = '';
    };

    const close = () => {
        reset();
        onClose();
    };

    const runPreview = async (chosen: File, columns?: { name_column?: number | null; phone_column?: number | null }) => {
        setIsPreviewing(true);
        try {
            const result = await contactService.previewImport(chosen, columns ?? {});
            setPreview(result);
            setPhoneColumn(result.phone_column);
            setNameColumn(result.name_column);
        } catch {
            toast.error('That file could not be read. Make sure it is a CSV.');
            setPreview(null);
        } finally {
            setIsPreviewing(false);
        }
    };

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = e.target.files?.[0];
        if (!chosen) return;

        setFile(chosen);
        // Name the list after the file by default — it is nearly always the
        // right answer and it is editable.
        setLabel((current) => current || chosen.name.replace(/\.csv$/i, ''));
        await runPreview(chosen);
    };

    /** Re-read the file when the operator overrides a column guess. */
    const onColumnChange = async (which: 'name' | 'phone', value: number | null) => {
        if (!file) return;

        const next = {
            name_column: which === 'name' ? value : nameColumn,
            phone_column: which === 'phone' ? value : phoneColumn,
        };

        if (which === 'name') setNameColumn(value);
        else setPhoneColumn(value);

        await runPreview(file, next);
    };

    const commit = async () => {
        if (!file || !label.trim()) return;

        try {
            const result = await importContacts.mutateAsync({
                file,
                label: label.trim(),
                source_note: sourceNote.trim() || undefined,
                name_column: nameColumn,
                phone_column: phoneColumn,
            });

            toast.success(
                `Imported ${result.imported_count.toLocaleString()} contacts.` +
                    (result.already_customer_count > 0
                        ? ` ${result.already_customer_count.toLocaleString()} were already customers.`
                        : ''),
            );
            close();
        } catch (e) {
            const message =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'That import could not be completed.';
            toast.error(message);
        }
    };

    const columnOptions = (preview?.headers ?? []).map((header, index) => ({
        value: String(index),
        label: header,
    }));

    const importable = (preview?.counts.new ?? 0) + (preview?.counts.already_customer ?? 0);
    const canCommit = !!file && !!preview && !preview.error && importable > 0 && label.trim().length > 0;

    return (
        <InventoryModal isOpen={isOpen} onClose={close} title="Import contacts" size="lg">
            <div className="space-y-5">
                {/* What this does and, more importantly, what it does not do. */}
                <div className="flex gap-3 p-4 rounded-xl bg-info/5 border border-info/20">
                    <WarningCircleIcon size={18} className="text-info shrink-0 mt-0.5" weight="fill" />
                    <p className="text-text-dark text-xs font-body leading-relaxed">
                        Imported numbers are <strong>not customers</strong>. They are not counted in any
                        customer figure, and campaigns will not reach them unless an audience asks for
                        them. A contact becomes a customer the moment they place an order.
                    </p>
                </div>

                {/* Step 1 — the file */}
                <div>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={onPick}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-[#f0e8d8] hover:border-primary/40 transition-colors cursor-pointer text-left"
                    >
                        {file ? (
                            <FileCsvIcon size={24} className="text-primary shrink-0" />
                        ) : (
                            <UploadSimpleIcon size={24} className="text-neutral-gray shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className="text-text-dark text-sm font-semibold font-body truncate">
                                {file ? file.name : 'Choose a CSV file'}
                            </p>
                            <p className="text-neutral-gray text-xs font-body mt-0.5">
                                {file
                                    ? 'Click to choose a different file'
                                    : 'Name and phone columns. Ghana mobile numbers.'}
                            </p>
                        </div>
                    </button>
                </div>

                {isPreviewing && (
                    <p className="text-neutral-gray text-sm font-body text-center py-4">Reading the file…</p>
                )}

                {preview?.error && (
                    <div className="flex gap-3 p-4 rounded-xl bg-error/5 border border-error/20">
                        <WarningCircleIcon size={18} className="text-error shrink-0 mt-0.5" weight="fill" />
                        <p className="text-text-dark text-xs font-body leading-relaxed">{preview.error}</p>
                    </div>
                )}

                {preview && !preview.error && !isPreviewing && (
                    <>
                        {/* Column mapping — pre-filled from the guess, overridable. */}
                        {preview.has_header && columnOptions.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Phone column">
                                    <Select
                                        value={phoneColumn === null ? '' : String(phoneColumn)}
                                        onChange={(e) =>
                                            onColumnChange('phone', e.target.value === '' ? null : Number(e.target.value))
                                        }
                                    >
                                        <option value="">Choose…</option>
                                        {columnOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </Select>
                                </FormField>

                                <FormField label="Name column (optional)">
                                    <Select
                                        value={nameColumn === null ? '' : String(nameColumn)}
                                        onChange={(e) =>
                                            onColumnChange('name', e.target.value === '' ? null : Number(e.target.value))
                                        }
                                    >
                                        <option value="">No name column</option>
                                        {columnOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </Select>
                                </FormField>
                            </div>
                        )}

                        {/* The breakdown. This is the reason preview exists. */}
                        <div>
                            <p className="text-text-dark text-sm font-semibold font-body mb-2">
                                {preview.total_rows.toLocaleString()} rows in this file
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Tally
                                    value={preview.counts.new}
                                    label="New contacts"
                                    tone="good"
                                />
                                <Tally
                                    value={preview.counts.already_customer}
                                    label="Already customers"
                                    hint="Imported and marked as customers straight away — they have ordered before."
                                />
                                <Tally
                                    value={preview.counts.duplicate_in_file + preview.counts.existing_contact}
                                    label="Duplicates"
                                    hint="Repeated in the file, or already in the contact base. Skipped."
                                />
                                <Tally
                                    value={preview.counts.invalid}
                                    label="Unreadable"
                                    tone={preview.counts.invalid > 0 ? 'bad' : undefined}
                                    hint="Not a Ghana mobile number. Skipped."
                                />
                            </div>
                        </div>

                        {preview.truncated && (
                            <p className="text-warning text-xs font-body">
                                Only the first 50,000 rows were read. Split the file to import the rest.
                            </p>
                        )}

                        {/* A handful of rows as they will be stored. */}
                        {preview.sample.length > 0 && (
                            <div>
                                <p className="text-neutral-gray text-xs font-body mb-2">
                                    First few, as they will be saved
                                </p>
                                <div className="rounded-xl border border-[#f0e8d8] overflow-hidden">
                                    {preview.sample.map((row, i) => (
                                        <div
                                            key={`${row.phone}-${i}`}
                                            className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-body border-b border-[#f0e8d8] last:border-0"
                                        >
                                            <span className="text-text-dark truncate">{row.name ?? '—'}</span>
                                            <span className="flex items-center gap-2 shrink-0 text-neutral-gray">
                                                {row.raw_phone !== row.phone && (
                                                    <>
                                                        <span className="line-through opacity-60">{row.raw_phone}</span>
                                                        <ArrowRightIcon size={10} />
                                                    </>
                                                )}
                                                <span className="text-text-dark font-medium">{row.phone}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rejected rows, verbatim — "412 invalid" with no example is not actionable. */}
                        {preview.invalid_sample.length > 0 && (
                            <div>
                                <p className="text-neutral-gray text-xs font-body mb-2">
                                    Rows that could not be read
                                </p>
                                <div className="rounded-xl border border-error/20 bg-error/5 overflow-hidden">
                                    {preview.invalid_sample.map((row) => (
                                        <div
                                            key={row.line}
                                            className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-body border-b border-error/10 last:border-0"
                                        >
                                            <span className="text-neutral-gray shrink-0">Line {row.line}</span>
                                            <span className="text-text-dark truncate flex-1">{row.value || '(empty)'}</span>
                                            <span className="text-neutral-gray shrink-0 hidden sm:inline">{row.reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Provenance. The only field that can answer "where did this come from?" later. */}
                        <FormField label="What is this list?" required>
                            <TextInput
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Accra Mall activation, August"
                            />
                        </FormField>

                        <FormField label="Where did it come from? (optional)">
                            <Textarea
                                value={sourceNote}
                                onChange={(e) => setSourceNote(e.target.value)}
                                rows={2}
                                placeholder="Collected at the stand — people who signed up for the raffle."
                            />
                        </FormField>
                    </>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={close}
                        className="px-4 py-2.5 text-sm font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        onClick={commit}
                        disabled={!canCommit || importContacts.isPending}
                        className="w-auto px-5"
                    >
                        {importContacts.isPending
                            ? 'Importing…'
                            : importable > 0
                              ? `Import ${importable.toLocaleString()} contacts`
                              : 'Import'}
                    </PrimaryButton>
                </div>
            </div>
        </InventoryModal>
    );
}

function Tally({
    value,
    label,
    hint,
    tone,
}: {
    value: number;
    label: string;
    hint?: string;
    tone?: 'good' | 'bad';
}) {
    const colour =
        tone === 'good' && value > 0
            ? 'text-secondary'
            : tone === 'bad' && value > 0
              ? 'text-error'
              : 'text-text-dark';

    return (
        <div className="rounded-xl border border-[#f0e8d8] px-3 py-2.5" title={hint}>
            <p className={`text-lg font-bold font-body ${colour}`}>{value.toLocaleString()}</p>
            <p className="text-neutral-gray text-[11px] font-body leading-tight mt-0.5">{label}</p>
        </div>
    );
}
