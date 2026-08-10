'use client';

import { useRef, useState } from 'react';
import { CheckCircleIcon, UploadSimpleIcon, XCircleIcon } from '@phosphor-icons/react';
import { InventoryModal, PrimaryButton } from '@/app/inventory/_components';
import { menuService } from '@/lib/api/services/menu.service';
import { toast } from '@/lib/utils/toast';

interface PreviewRow {
    name: string;
    category: string;
    price: number | null;
    status: string;
    errors?: string[];
}

interface PreviewData {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    preview: PreviewRow[];
    can_import: boolean;
}

export function BulkImportModal({
    onClose,
    onImported,
    branchId,
}: {
    onClose: () => void;
    onImported: () => void;
    branchId: number;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleFile(selected: File) {
        setFile(selected);
        setBusy(true);
        try {
            const response = await menuService.bulkImportPreview(selected, branchId);
            setPreview(response.data as PreviewData);
        } catch (error) {
            toast.error(`Could not read the file: ${(error as Error).message ?? 'unknown error'}`);
        } finally {
            setBusy(false);
        }
    }

    async function handleImport() {
        if (!file) return;
        setBusy(true);
        try {
            const response = await menuService.bulkImport(file, branchId);
            const { imported, failed = 0, skipped = 0 } = response.data;
            toast.success(`Imported ${imported}${failed ? `, ${failed} failed` : ''}${skipped ? `, ${skipped} skipped` : ''}.`);
            onImported();
            onClose();
        } catch (error) {
            toast.error(`Import failed: ${(error as Error).message ?? 'unknown error'}`);
        } finally {
            setBusy(false);
        }
    }

    function downloadTemplate() {
        const csv = [
            'name,category,description,price',
            'Jollof Rice with Chicken,Basic Meals,Jollof rice with grilled chicken,75',
            'Coconut Rice,Basic Meals,Aromatic coconut rice,65',
            'Milo Drink,Drinks,Hot chocolate milo,15',
        ].join('\n');

        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu-items-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <InventoryModal isOpen onClose={onClose} title="Bulk import menu items" size="lg">
            {!preview ? (
                <div className="flex flex-col gap-4">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={busy}
                        className="border-2 border-dashed border-[#e3e1de] rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors disabled:opacity-60"
                    >
                        <UploadSimpleIcon size={32} weight="thin" className="text-neutral-gray" />
                        <span className="text-text-dark text-sm font-semibold font-body">
                            {busy ? 'Reading…' : 'Choose a CSV or Excel file'}
                        </span>
                        <span className="text-neutral-gray text-xs font-body">CSV, XLS or XLSX · up to 5 MB</span>
                    </button>
                    <input
                        type="file"
                        ref={fileRef}
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={e => {
                            const selected = e.target.files?.[0];
                            if (selected) handleFile(selected);
                        }}
                    />
                    <button
                        type="button"
                        onClick={downloadTemplate}
                        className="text-primary text-sm font-medium font-body hover:opacity-80 transition-opacity cursor-pointer w-fit mx-auto"
                    >
                        Download a template CSV
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <p className="text-neutral-gray text-sm font-body">
                        {preview.total_rows} row{preview.total_rows !== 1 ? 's' : ''} read:{' '}
                        <span className="text-secondary font-semibold">{preview.valid_rows} valid</span>
                        {preview.invalid_rows > 0 && (
                            <>, <span className="text-red-500 font-semibold">{preview.invalid_rows} with errors</span></>
                        )}.
                    </p>

                    <div className="border border-[#f0e8d8] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                        {preview.preview.slice(0, 25).map((row, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-[#f0e8d8]' : ''}`}
                            >
                                {row.status === 'valid'
                                    ? <CheckCircleIcon size={16} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                                    : <XCircleIcon size={16} weight="fill" className="text-red-500 shrink-0 mt-0.5" />}
                                <div className="min-w-0">
                                    <p className="text-text-dark text-sm font-medium font-body">{row.name || '(no name)'}</p>
                                    <p className="text-neutral-gray text-xs font-body">
                                        {row.category || 'No category'} · {row.price != null ? `₵${row.price}` : <span className="text-red-500">No price</span>}
                                    </p>
                                    {row.errors?.length ? (
                                        <p className="text-red-500 text-xs font-body mt-0.5">{row.errors.join(', ')}</p>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                        {preview.preview.length > 25 && (
                            <p className="px-4 py-2 text-center text-neutral-gray text-xs font-body border-t border-[#f0e8d8]">
                                …and {preview.preview.length - 25} more
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setPreview(null); setFile(null); }}
                            className="flex-1 px-4 py-2.5 bg-[#f5f4f2] text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#eceae7] transition-colors min-h-11"
                        >
                            Back
                        </button>
                        <PrimaryButton
                            onClick={handleImport}
                            loading={busy}
                            disabled={!preview.can_import}
                        >
                            Import {preview.valid_rows} item{preview.valid_rows !== 1 ? 's' : ''}
                        </PrimaryButton>
                    </div>
                </div>
            )}
        </InventoryModal>
    );
}
