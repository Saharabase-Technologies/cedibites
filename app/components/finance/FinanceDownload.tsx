'use client';

import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react';
import { XIcon } from '@phosphor-icons/react';
import BottomSheet from '@/app/components/ui/BottomSheet';
import { InventoryModal, SegmentedTabs } from '@/app/inventory/_components';
import {
  aboutPages, FULL_REPORT, LONG_LISTS, longListRows, PDF_SECTIONS, SHORT_REPORT, filtersText, fileName, saveFile, sectionTitle,
  type PdfSection,
} from '@/lib/finance/download';
import { buildPdf } from '@/lib/finance/pdf';
import { serverNow } from '@/lib/utils/serverClock';
import { useFinance, type FinanceReady } from './FinanceProvider';

/**
 * The download (plan Section 7). One sheet asks what you want and how much,
 * says the file follows the filters on screen, and has one button. A line
 * under the button says what happened.
 *
 * A bottom sheet on a phone, the kit's dialog from 640px, where the sheet
 * itself would stop being one.
 */

type Kind = 'pdf' | 'csv';
type Amount = 'short' | 'full' | 'choose';

const PHONE = '(max-width: 639px)';
const onWidth = (notify: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const usePhone = (): boolean => useSyncExternalStore(onWidth, () => window.matchMedia(PHONE).matches, () => false);

const TICKED = Object.fromEntries(PDF_SECTIONS.map(k => [k, !LONG_LISTS.includes(k)])) as Record<PdfSection, boolean>;

/** The font subset the PDF is drawn in, read once and kept. */
let fontBytes: Promise<{ regular: Uint8Array; bold: Uint8Array }> | null = null;
const loadFonts = () => {
  const read = (file: string) => fetch(`/fonts/${file}`).then(r => {
    if (!r.ok) throw new Error('the font for the PDF did not load');
    return r.arrayBuffer();
  }).then(b => new Uint8Array(b));
  fontBytes = fontBytes || Promise.all([read('NotoSans-Regular.subset.ttf'), read('NotoSans-Bold.subset.ttf')])
    .then(([regular, bold]) => ({ regular, bold }));
  fontBytes.catch(() => { fontBytes = null; });
  return fontBytes;
};

/** Makes the file. The CSVs are built in the box after the PDF's. */
async function makeFile({ book, figures, colours }: FinanceReady, kind: Kind, sections: PdfSection[]): Promise<Blob> {
  if (kind === 'csv') throw new Error('the CSV maker is not built yet');
  const doc = await buildPdf({ book, figures, colours, sections, fonts: await loadFonts(), madeAt: serverNow().getTime() });
  return doc.output('blob');
}

export function FinanceDownload({ open, onClose }: { open: boolean; onClose: () => void }) {
  const finance = useFinance();
  const { book, figures: res } = finance;
  const phone = usePhone();

  const [kind, setKind] = useState<Kind>('pdf');
  const [amount, setAmount] = useState<Amount>('short');
  const [ticked, setTicked] = useState(TICKED);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const close = useCallback(() => {
    setStatus('');
    onClose();
  }, [onClose]);

  /* Branch against branch needs two branches, as on screen. With one it is in no report. */
  const can = (k: PdfSection) => res.branches.length > 1 || k !== 'bvb';
  const sections = (amount === 'short' ? SHORT_REPORT : amount === 'full' ? FULL_REPORT : PDF_SECTIONS.filter(k => ticked[k])).filter(can);
  const none = kind === 'pdf' && !sections.length;
  const rows = longListRows(book, res);
  const hint: Partial<Record<PdfSection, string>> = {
    branches: `about ${res.branches.length * 2} pages`,
    ledger: aboutPages(rows.ledger),
    cx: aboutPages(rows.cx),
    ...(can('bvb') ? {} : { bvb: 'This needs two branches that have sold.' }),
  };

  const download = async () => {
    const name = kind === 'pdf' ? fileName(book, res, 'sales report', 'pdf') : fileName(book, res, 'sales by month', 'csv');
    setBusy(true);
    setStatus(kind === 'pdf' ? 'Making the PDF. A long report takes a few seconds.' : 'Making the CSV.');
    try {
      saveFile(name, await makeFile(finance, kind, sections));
      setStatus(`${name} saved.`);
    } catch (e) {
      setStatus(`The file could not be made: ${e instanceof Error ? e.message : 'something went wrong'}.`);
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <div className="flex flex-col gap-5 font-body">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text-dark mb-2">What do you want?</legend>
        <div>
          <SegmentedTabs<Kind>
            options={[{ value: 'pdf', label: 'Report (PDF)' }, { value: 'csv', label: 'Spreadsheet (CSV)' }]}
            value={kind}
            onChange={k => { setKind(k); setStatus(''); }}
          />
        </div>
        {kind === 'csv' && <p className="text-sm text-neutral-gray">Sales by month, a row for each branch and month.</p>}
      </fieldset>

      {kind === 'pdf' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-text-dark mb-2">How much?</legend>
          <Choice name="amount" checked={amount === 'short'} onChange={() => setAmount('short')} label="Short report">
            Summary, month by month and the monthly statement. About {2 + 2 * Math.ceil(res.months.length / 15)} pages.
          </Choice>
          <Choice name="amount" checked={amount === 'full'} onChange={() => setAmount('full')} label="Full report">
            Every section except the daily takings and the cancelled orders.
          </Choice>
          <Choice name="amount" checked={amount === 'choose'} onChange={() => setAmount('choose')} label="Choose sections" />
          {amount === 'choose' && (
            <div className="flex flex-col pl-2">
              {PDF_SECTIONS.map(k => (
                <label key={k} className={`flex items-center gap-3 min-h-11 text-sm ${can(k) ? 'text-text-dark cursor-pointer' : 'text-neutral-gray'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary shrink-0"
                    checked={ticked[k] && can(k)}
                    disabled={!can(k)}
                    onChange={e => setTicked(previous => ({ ...previous, [k]: e.target.checked }))}
                  />
                  <span className="flex-1">{sectionTitle(book, k)}</span>
                  {hint[k] && <span className="text-xs text-neutral-gray tabular-nums">{hint[k]}</span>}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <p className="text-sm text-neutral-gray">It follows the filters on screen: {filtersText(book, res)}.</p>
    </div>
  );

  const action = (
    <div className="flex flex-col gap-2 font-body">
      <button
        type="button"
        onClick={download}
        disabled={busy || none}
        className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors min-h-11 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {kind === 'pdf' ? 'Download PDF' : 'Download CSV'}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-text-dark min-h-5 wrap-break-word">
        {none ? 'Tick at least one section.' : status}
      </p>
    </div>
  );

  if (!phone) {
    return (
      <InventoryModal isOpen={open} onClose={close} title="Download">
        <div className="flex flex-col gap-5">
          {form}
          {action}
        </div>
      </InventoryModal>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      label="Download"
      header={(
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <h2 className="text-lg font-semibold font-brand text-text-dark">Download</h2>
          <button type="button" onClick={close} aria-label="Close" className="flex items-center justify-center min-h-11 min-w-11 -mr-3 text-neutral-gray hover:text-text-dark cursor-pointer">
            <XIcon size={20} />
          </button>
        </div>
      )}
      footer={<div className="px-5 pt-3 pb-2">{action}</div>}
    >
      <div className="px-5 pb-5 pt-2">{form}</div>
    </BottomSheet>
  );
}

function Choice({ name, checked, onChange, label, children }: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  children?: ReactNode;
}) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 min-h-11 cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-[#f0e8d8] bg-neutral-card hover:border-neutral-gray/50'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 w-4 h-4 accent-primary shrink-0" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-text-dark">{label}</span>
        {children && <span className="text-sm text-neutral-gray">{children}</span>}
      </span>
    </label>
  );
}
