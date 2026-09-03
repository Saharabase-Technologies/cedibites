import type { Metadata } from 'next';
import Image from 'next/image';

/**
 * "Is this receipt real?", answered for whoever scanned it.
 *
 * Public on purpose. The person holding the slip is a customer with a phone,
 * and there is nobody to log in as. The random code in the URL is the whole
 * credential, which is why it is random: a code derived from the order number
 * would let anyone print a forgery whose QR points at a real sale.
 *
 * Never indexed. The code is meant to travel on a piece of paper, not in a
 * search result.
 */
export const metadata: Metadata = {
  title: 'Check a CediBites receipt',
  robots: { index: false, follow: false, nocache: true },
};

/** Every scan has to reach the API. A cached answer is not a check. */
export const dynamic = 'force-dynamic';

const API_BASE =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000/v1';

interface VerifiedItem {
  name: string;
  option?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface VerifiedReceipt {
  verified: true;
  order_number: string;
  placed_at?: string;
  status: string;
  is_cancelled: boolean;
  branch: { name?: string; address?: string; phone?: string };
  customer: { name?: string; phone?: string };
  items: VerifiedItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method?: string | null;
  is_paid: boolean;
  order_type?: string | null;
  served_by?: string | null;
  print_count: number;
}

function ghs(n: number): string {
  return `GHS ${Number(n || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function whenPlaced(iso?: string): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

async function fetchReceipt(code: string): Promise<VerifiedReceipt | null> {
  try {
    const res = await fetch(`${API_BASE}/receipts/${encodeURIComponent(code)}/verify`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? null) as VerifiedReceipt | null;
  } catch {
    return null;
  }
}

export default async function ReceiptVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const receipt = await fetchReceipt(code);

  if (!receipt) {
    return (
      <main className="min-h-dvh bg-neutral-light px-4 py-10 font-body">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-6 text-center">
            <p className="font-brand text-xl font-bold text-[#8a3333]">
              We cannot match this receipt
            </p>
            {/* Deliberately does not say whether the order exists. A message
                that distinguished "no such code" from "code belongs to another
                order" would turn this page into a way to test guesses. */}
            <p className="mt-2 text-sm leading-relaxed text-neutral-gray">
              No receipt on our records carries this code. Check the QR was
              scanned fully, or call us on 0592123054 and read out the order
              number printed on the slip.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const rows: Array<[string, string]> = [
    ['Order number', receipt.order_number],
    ['Date', whenPlaced(receipt.placed_at)],
    ['Branch', receipt.branch.name ?? 'Unknown'],
    ...(receipt.order_type ? ([['Order type', receipt.order_type.replace('_', ' ')]] as Array<[string, string]>) : []),
    ...(receipt.served_by ? ([['Served by', receipt.served_by]] as Array<[string, string]>) : []),
    ...(receipt.customer.name ? ([['Customer', receipt.customer.name]] as Array<[string, string]>) : []),
    ...(receipt.customer.phone ? ([['Phone', receipt.customer.phone]] as Array<[string, string]>) : []),
    ...(receipt.payment_method ? ([['Paid by', receipt.payment_method.replace('_', ' ')]] as Array<[string, string]>) : []),
  ];

  return (
    <main className="min-h-dvh bg-neutral-light px-4 py-8 font-body">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">

        {/* The verdict, first and largest. Somebody scanning this wants one
            answer, and everything below is the evidence for it. */}
        <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-5 py-6 text-center">
          <Image src="/cblogo.webp" alt="" width={44} height={44} className="mx-auto mb-3" />
          <p className="font-brand text-2xl font-bold leading-tight text-text-dark">
            This receipt is genuine
          </p>
          <p className="mt-1.5 text-sm text-neutral-gray">
            Issued by CediBites{receipt.branch.name ? `, ${receipt.branch.name}` : ''}
          </p>

          {/* A cancelled sale still produced a real receipt. Saying only
              "genuine" would let a cancelled slip pass as a live one. */}
          {receipt.is_cancelled && (
            <p className="mt-4 rounded-xl bg-[#f9ecec] px-3 py-2.5 text-sm font-semibold text-[#8a3333]">
              This order was later cancelled. The receipt is real, the sale did
              not stand.
            </p>
          )}

          {receipt.print_count > 1 && (
            <p className="mt-3 text-xs text-neutral-gray">
              {receipt.print_count} slips have been printed for this order.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5">
          <dl className="flex flex-col gap-2.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
                <dt className="shrink-0 text-neutral-gray">{label}</dt>
                <dd className="min-w-0 text-right font-medium text-text-dark capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {receipt.items.length > 0 && (
          <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5">
            <p className="mb-3 font-brand text-base font-bold text-text-dark">What was bought</p>
            <ul className="flex flex-col gap-2">
              {receipt.items.map((item, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm">
                  <span className="w-6 shrink-0 font-bold tabular-nums text-neutral-gray">
                    {item.quantity}
                  </span>
                  <span className="min-w-0 flex-1 text-text-dark">
                    {item.name}
                    {item.option ? <span className="text-neutral-gray"> · {item.option}</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-text-dark">{ghs(item.line_total)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-[#f0e8d8] pt-3 text-sm">
              {receipt.discount > 0 && (
                <div className="flex justify-between text-neutral-gray">
                  <span>Discount</span>
                  <span className="tabular-nums">-{ghs(receipt.discount)}</span>
                </div>
              )}
              {receipt.delivery_fee > 0 && (
                <div className="flex justify-between text-neutral-gray">
                  <span>Delivery fee</span>
                  <span className="tabular-nums">{ghs(receipt.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-brand text-lg font-bold text-text-dark">
                <span>Total</span>
                <span className="tabular-nums">{ghs(receipt.total)}</span>
              </div>
            </div>
          </div>
        )}

        <p className="px-2 pt-1 text-center text-xs leading-relaxed text-neutral-gray">
          Everything above is what our records hold. If the printed slip says
          something different, call 0592123054.
        </p>
      </div>
    </main>
  );
}
