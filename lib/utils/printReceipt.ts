import type { Order, OrderItem } from '@/types/order';
import { FULFILLMENT_LABELS } from '@/lib/constants/order.constants';
import { toast } from '@/lib/utils/toast';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { RECEIPT_LOGO_DATA_URI } from '@/lib/utils/receiptLogo';

export interface ReceiptBranch {
  name: string;
  address?: string;
  phone?: string;
}

export type ReceiptKind = 'original' | 'reprint';

export interface PrintReceiptOptions {
  kind?: ReceiptKind;
  /**
   * How many slips to put through the printer.
   *
   * Emitted as repeated copies inside one document rather than asked of the
   * driver, because the driver's copy count is a setting a person has to choose
   * in the dialog every single time. Two slips in one job is one dialog and one
   * press, and the printer's cutter separates them.
   */
  copies?: number;
  /**
   * Which reprint this is: 1 for the first, 2 for the next, and so on. Printed
   * on the slip so two receipts for the same order can be told apart in a
   * drawer. Ignored on an original.
   */
  reprintNumber?: number;
}

function formatDateTime(d: Date): string {
  const tz = { timeZone: 'Africa/Accra' };
  const date = d.toLocaleDateString('en-GH', { ...tz, day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GH', { ...tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

/** Where a customer takes a problem with a slip. Saharabase, not the branch. */
const SUPPORT_PHONE = '0508049030';

/**
 * Where a scanned receipt resolves.
 *
 * Same origin as the app, so a receipt printed by beta verifies against beta
 * and one printed by production verifies against production. Hard-coding a
 * domain here would have every beta test slip pointing at live data.
 */
function verifyUrlFor(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/receipt/${encodeURIComponent(code)}`;
}

const paymentLabel: Record<string, string> = {
  cash: 'CASH',
  momo: 'MOBILE MONEY',
  mobile_money: 'MOBILE MONEY',
  card: 'CARD',
  no_charge: 'NO CHARGE',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Receipt item cell HTML — DB-backed option label when present (getOrderItemLineLabel). */
export function formatReceiptItemLabel(item: OrderItem): string {
  return escapeHtml(getOrderItemLineLabel(item));
}


function slipHTML(
  order: Order,
  branch: ReceiptBranch,
  kind: ReceiptKind,
  reprintNumber?: number,
  qrDataUrl?: string,
): string {
  const isPastOrder = order.source === 'manual_entry';
  // Numbered so a customer holding two slips for one order, or a supervisor
  // finding three in a drawer, can tell which came first and how many were run.
  const reprintLabel = reprintNumber && reprintNumber > 0
    ? `Reprint ${reprintNumber}`
    : 'Reprinted Receipt';
  const sectionTitle = isPastOrder
    ? 'Recorded Past Order'
    : kind === 'reprint' ? reprintLabel : 'Original Receipt';
  const createdAt = new Date(order.placedAt);

  const itemRows = order.items.map(item => {
    const label = formatReceiptItemLabel(item);
    const lineTotal = (item.unitPrice * item.quantity).toFixed(2);
    return `
      <tr>
        <td class="item-name">${label}</td>
        <td class="qty">${item.quantity}</td>
        <td class="price">${item.unitPrice.toFixed(2)}</td>
        <td class="amount">${lineTotal}</td>
      </tr>`;
  }).join('');

  const subtotal = order.subtotal ?? order.total;
  const deliveryFee = order.deliveryFee ?? 0;
  const discount = order.discount ?? 0;
  const total = order.total;
  const amountPaid = order.amountPaid;
  const change = amountPaid != null && amountPaid > total ? amountPaid - total : 0;

  // Value of goods purchased (restaurant revenue) — never includes the delivery fee.
  const goodsTotal = subtotal - discount;
  // Third-party delivery is a pass-through: shown to the customer, but kept distinct
  // from the goods total so the rider fee is never mistaken for restaurant revenue.
  const hasDelivery = deliveryFee > 0;

  const discountRow = discount > 0
    ? `<tr><td colspan="3">Discount</td><td class="amount">-${discount.toFixed(2)}</td></tr>`
    : '';

  // When a delivery fee applies, the goods total is broken out explicitly and the
  // grand total is labelled "Amount Due"; otherwise a single "Total" line suffices.
  const goodsTotalRow = hasDelivery
    ? `<tr class="bold"><td colspan="3">GOODS TOTAL</td><td class="amount">${goodsTotal.toFixed(2)}</td></tr>`
    : '';

  const deliveryRow = hasDelivery
    ? `<tr><td colspan="3">Delivery Fee</td><td class="amount">${deliveryFee.toFixed(2)}</td></tr>`
    : '';

  const grandTotalLabel = hasDelivery ? 'ORDER TOTAL' : 'TOTAL';

  // With a delivery fee, the restaurant collects the goods only; the rider
  // collects the delivery fee on delivery — shown so the customer knows exactly
  // what they pay each party.
  const paidLabel = hasDelivery ? 'Paid (goods)' : 'Amount Paid';
  const amountPaidRow = amountPaid != null
    ? `<tr><td colspan="3">${paidLabel}</td><td class="amount">${amountPaid.toFixed(2)}</td></tr>`
    : '';

  const riderRow = hasDelivery
    ? `<tr><td colspan="3">${order.deliveryFeeStatus === 'collected' ? 'Paid to rider' : 'Due to rider'}</td><td class="amount">${deliveryFee.toFixed(2)}</td></tr>`
    : '';

  const changeRow = change > 0
    ? `<tr class="bold"><td colspan="3">Change</td><td class="amount">${change.toFixed(2)}</td></tr>`
    : '';

  const customerNoteRow = order.contact.notes
    ? `<tr><td colspan="4" class="note">Note: ${order.contact.notes}</td></tr>`
    : '';

  // A reprint pulled three days later used to show only the original time, so
  // the slip in somebody's hand and the sale it described disagreed by days.
  // The Date row stays the sale; this says when this piece of paper was run.
  const reprintedRow = kind === 'reprint'
    ? `<tr><td class="label">Reprinted:</td><td>${formatDateTime(new Date())}</td></tr>`
    : '';

  return `
  <img class="logo" src="${RECEIPT_LOGO_DATA_URI}" alt="">
  <div class="center brand">CediBites</div>
  <div class="center branch-name">${branch.name}</div>
  ${branch.address ? `<div class="center branch-info">${branch.address}</div>` : ''}
  ${branch.phone ? `<div class="center branch-info">Phone: ${branch.phone}</div>` : ''}

  ${isPastOrder ? '<div class="past-order-banner">RECORDED PAST ORDER</div>' : ''}

  <div class="divider"></div>
  <!-- What kind of slip this is, said once. It used to be printed twice: a
       "RECEIPT" title up here and an "Original Receipt" heading again above the
       items. Two labels for one fact is one label too many. -->
  <div class="kind">${sectionTitle}</div>
  <table class="meta-table">
    <tr>
      <td class="label">Receipt No.:</td>
      <td>${order.orderNumber}</td>
    </tr>
    <tr>
      <td class="label">Date:</td>
      <td>${formatDateTime(createdAt)}</td>
    </tr>
    ${reprintedRow}
    <tr>
      <td class="label">Cashier:</td>
      <td>${order.staffName ?? 'Staff'}</td>
    </tr>
    <tr>
      <td class="label">Pay Mode:</td>
      <td>${paymentLabel[order.paymentMethod] ?? order.paymentMethod.toUpperCase()}</td>
    </tr>
    ${order.momoNumber ? `<tr>
      <td class="label">MoMo #:</td>
      <td>${escapeHtml(order.momoNumber)}</td>
    </tr>` : ''}
    <tr>
      <td class="label">Order Type:</td>
      <td>${FULFILLMENT_LABELS[order.fulfillmentType]}</td>
    </tr>
  </table>

  <div class="thin-divider"></div>

  <table class="items-table">
    <thead>
      <tr>
        <th>ITEM</th>
        <th class="qty">QTY</th>
        <th class="price">PRICE<br/>(GHS)</th>
        <th class="amount">AMOUNT<br/>(GHS)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="thin-divider"></div>

  <table class="totals-table">
    <tr>
      <td colspan="3">Subtotal</td>
      <td class="amount">${subtotal.toFixed(2)}</td>
    </tr>
    ${discountRow}
    ${goodsTotalRow}
    ${deliveryRow}
    <tr class="grand-total">
      <td colspan="3">${grandTotalLabel}</td>
      <td class="amount">${total.toFixed(2)}</td>
    </tr>
    ${amountPaidRow}
    ${riderRow}
    ${changeRow}
  </table>

  <div class="divider"></div>

  <table class="customer-table">
    <tr>
      <td class="label">Customer Name:</td>
      <td>${order.contact.name || 'Walk-in'}</td>
    </tr>
    <tr>
      <td class="label">PhoneNo:</td>
      <td>${order.contact.phone || '—'}</td>
    </tr>
    ${customerNoteRow}
  </table>

  <div class="divider"></div>

  <div class="thank-you">Thank you for dining with us!</div>

  <div class="order-code-num">${order.orderNumber}</div>
  <div class="order-code-label">ORDER CODE</div>

  ${qrDataUrl ? `
  <img class="qr" src="${qrDataUrl}" alt="">
  <div class="qr-label">Scan to verify this receipt</div>` : ''}

  <div class="thin-divider"></div>

  <!-- The number is given something to do. A bare phone number at the foot of a
       receipt is read by nobody; one attached to a reason to call is read by
       the person who needs it. -->
  <div class="footer-line">Keep this receipt.</div>
  <div class="footer-line">Any problem, call ${SUPPORT_PHONE}</div>

  <div class="software-line">Software by Saharabase Technologies</div>
`;
}

/**
 * The stylesheet every slip in a job shares.
 *
 * Lifted out of the slip itself when copies arrived: repeating the whole
 * document per copy would repeat the <style> block with it, which is wasted
 * bytes and, worse, invalid markup the moment there is more than one.
 */
const RECEIPT_CSS = `  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    /* Tahoma and Verdana were drawn by Matthew Carter for low-resolution
       rendering: tall x-height, open counters, generous sidebearings. A 203dpi
       thermal head with no antialiasing is that exact problem, and Courier is
       the opposite of the answer to it, being thin, narrow-apertured and small
       on the body. Tahoma leads because it is the narrower of the two and the
       roll is only 80mm wide.

       Losing monospace costs nothing here. Both faces set their digits on a
       fixed width, so the price and amount columns still line up, which was the
       only job Courier was actually doing. */
    font-family: Tahoma, Verdana, 'DejaVu Sans', sans-serif;
    font-size: 13px;
    /* Regular, not bold. The whole slip used to be bold, which on a thermal
       head bleeds strokes together and fills in the counters of a, e and o —
       so it read worse, not better. It also flattened every level of
       hierarchy: when everything is at maximum weight, nothing can stand out.
       Bold is now spent deliberately, on about five things. */
    font-weight: 400;
    line-height: 1.4;
    width: 302px;
    padding: 8px;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .brand  { font-size: 19px; font-weight: bold; letter-spacing: 1.5px; line-height: 1.25; }
  /* The branch is the second thing anyone checks on a receipt, after the name
     of the business, and it was set smaller than the item lines. */
  .branch-name { font-size: 14px; font-weight: 700; margin-bottom: 1px; }
  .branch-info { font-size: 11.5px; margin-bottom: 1px; }
  /* Every rule on the slip is a hairline now. The dashed one was 2px, which at
     203dpi is a heavy black stripe rather than a divider, and it competed with
     the content it was supposed to be separating. Separation comes from the
     space around a line far more than from its weight. */
  .divider { border-top: 1px dashed #000; margin: 7px 0; }
  .thin-divider { border-top: 1px solid #000; margin: 5px 0; }
  .meta-table { width: 100%; font-size: 11.5px; border-collapse: collapse; margin-bottom: 2px; }
  .meta-table td { padding: 1.5px 0; vertical-align: top; }
  /* The label is the quiet half of the pair. Greying it is not available on a
     one-colour printer, so the separation has to come from weight. */
  .meta-table .label { white-space: nowrap; padding-right: 6px; font-weight: 400; }
  .meta-table td:last-child { font-weight: 700; text-align: right; }
  .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  /* No border-top. A thin-divider already sits directly above this row, so the
     header was drawing a second line about two millimetres under the first —
     which is most of what made the top of the table look cluttered. */
  .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 4px 2px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
  .items-table th.qty, .items-table th.price, .items-table th.amount { text-align: right; }
  .items-table td { padding: 3px 2px; vertical-align: top; }
  /* The dish is what the customer scans for, so it is the one thing in the
     table carrying weight. 700, not 900: past bold, a thermal head stops adding
     blackness and starts adding blur. */
  .item-name { font-size: 13px; font-weight: 700; word-break: break-word; }
  .qty, .price, .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 3px; }
  .totals-table td { padding: 2px 2px; }
  .totals-table .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals-table .bold td { font-weight: 700; font-size: 12.5px; }
  /* The only filled area on the slip, and it is here because this is the number
     the customer is looking for and the one a dispute is about.
     Everything else groups with whitespace and rules instead. Filling a panel
     means burning every dot inside it: slow, patchy on a cheap roll, and the
     first thing to smear as the paper ages. It is affordable once, on one band,
     at a size where reversed type still holds together — small reversed text
     closes up as the ink bleeds into the letterforms. */
  .grand-total td {
    font-weight: 700;
    font-size: 15px;
    background: #000;
    color: #fff;
    padding: 6px 6px;
    letter-spacing: 0.5px;
    /* Repeated on the element, not inherited from body. Browsers drop
       backgrounds when printing unless the painted element says otherwise, and
       a TOTAL band that silently prints as white-on-white is worse than never
       having filled it. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .customer-table { width: 100%; font-size: 11.5px; border-collapse: collapse; margin-top: 2px; }
  .customer-table td { padding: 2px 0; vertical-align: top; }
  .customer-table .label { white-space: nowrap; padding-right: 6px; }
  .customer-table td:last-child { font-weight: 700; }
  .note { font-size: 11px; padding-top: 3px; }
  .thank-you { font-size: 12px; font-weight: 700; text-align: center; margin: 8px 0 5px; }
  .order-code-num { font-size: 30px; font-weight: 700; text-align: center; letter-spacing: 3px; margin: 4px 0 0; font-variant-numeric: tabular-nums; }
  .order-code-label { font-size: 9.5px; text-align: center; letter-spacing: 2px; word-spacing: 6px; margin-bottom: 4px; }
  .past-order-banner { text-align: center; font-size: 12px; font-weight: bold; padding: 4px 0; margin: 4px 0; border: 2px solid #000; letter-spacing: 1px; }
  /* image-rendering matters more than it looks. The logo and the QR are already
     1-bit; letting the browser smooth them while scaling reintroduces the greys
     a thermal head cannot print, and a smoothed QR stops scanning. */
  /* Smaller than it was. The mark is an identifier, not the headline, and at
     120px it was taking a centimetre of roll off every slip — which is two
     centimetres now that an original prints twice. */
  .logo { display: block; width: 74px; height: auto; margin: 0 auto 4px; image-rendering: pixelated; }
  /* Letter-spacing without word-spacing turns "REPRINT 1" into a row of
     evenly separated characters, and the eye loses where the word ends. Any
     tracked line on this slip gets its word gaps widened to match. */
  .kind { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 2px; word-spacing: 6px; text-transform: uppercase; margin: 4px 0 7px; }
  .qr { display: block; width: 116px; height: 116px; margin: 7px auto 3px; image-rendering: pixelated; }
  .qr-label { text-align: center; font-size: 10px; margin-bottom: 5px; }
  .footer-line { text-align: center; font-size: 11.5px; line-height: 1.4; }
  .software-line { text-align: center; font-size: 10px; margin-top: 6px; letter-spacing: 0.3px; }
  @media print {
    @page { size: 80mm auto; margin: 3mm; }
    /* Fills the roll, but never grows past it. A plain width of 100% takes
       whatever the paper offers, so printing to A4 or to PDF stretched the slip
       to 210mm and tore each label away from its value across half a page. The
       cap costs nothing on the 80mm roll it was designed for and keeps the
       thing readable everywhere else. */
    body { width: 100%; max-width: 74mm; margin: 0 auto; }
  }
  /* Each slip stands off the roll at both ends.
     The foot is the bigger of the two and is not decoration: without it the
     last printed line sits inside the mechanism, so the cut lands mid-receipt
     and the customer is handed a slip with its footer shaved off. It also
     gives a clean strip to tear against where the cutter is not used at all.
     The head is smaller, just enough that a fresh copy does not begin on the
     same line the previous one ended. */
  .slip { padding-top: 4mm; padding-bottom: 12mm; }

  /* One cut between copies, none after the last. A page-break-after on every
     slip would feed a blank one off the end of the roll.
     The padding above is what actually guarantees the gap: a page break is
     only honoured if the driver is paginating, and on a continuous roll it may
     do nothing at all, which is exactly how two copies came to be printed nose
     to tail. */
  .slip + .slip { page-break-before: always; }
`;

/**
 * One print job, however many slips it holds.
 *
 * The copies live in the document rather than in the driver's copy count. That
 * count is a setting somebody has to pick in the print dialog on every single
 * sale, which is exactly the manual step this removes: two slips in one job is
 * one dialog and one press, and the printer's cutter separates them.
 */
function receiptHTML(
  order: Order,
  branch: ReceiptBranch,
  kind: ReceiptKind,
  copies: number,
  reprintNumber?: number,
  qrDataUrl?: string,
): string {
  const slip = slipHTML(order, branch, kind, reprintNumber, qrDataUrl);
  const slips = Array.from(
    { length: Math.max(1, copies) },
    () => `<div class="slip">${slip}</div>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${order.orderNumber}</title>
<style>
${RECEIPT_CSS}
</style>
</head>
<body>
${slips}
</body>
</html>`;
}

/**
 * The QR that lets a customer check the slip is genuine.
 *
 * Never allowed to stop a receipt. An order created before the verification
 * column existed has no code, the qrcode import can fail on a bad connection,
 * and neither is a reason to send somebody away with no paper — the slip prints
 * without the block and everything else on it still stands.
 */
async function buildVerifyQr(order: Order): Promise<string | undefined> {
  const code = order.receiptVerificationCode;
  if (!code) return undefined;

  try {
    const QRCode = await import('qrcode');
    // Rendered at twice its printed size and scaled down by an exact factor of
    // two, so every QR module lands on a whole number of dots. A fractional
    // scale blurs the module edges, and a blurred QR is one a phone gives up on.
    return await QRCode.toDataURL(verifyUrlFor(code), {
      margin: 1,
      width: 256,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return undefined;
  }
}

/**
 * Hold the print until the images have decoded.
 *
 * The old code waited a flat 300ms and hoped. That was fine when the slip was
 * pure text; it is not fine now that a logo and a QR have to be decoded first,
 * because printing early prints the gaps where they should have been. The cap
 * is there so a stuck image cannot leave a cashier staring at a window that
 * never prints.
 */
function imagesReady(win: Window, capMs = 2000): Promise<void> {
  const images = Array.from(win.document.images);
  const pending = images.filter((img) => !img.complete);
  if (pending.length === 0) return Promise.resolve();

  return Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    ).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, capMs)),
  ]);
}

export async function printReceipt(
  order: Order,
  branch: ReceiptBranch | string,
  options?: PrintReceiptOptions,
): Promise<void> {
  const resolvedBranch: ReceiptBranch = typeof branch === 'string' ? { name: branch } : branch;
  const kind: ReceiptKind = options?.kind === 'reprint' ? 'reprint' : 'original';
  // A reprint is always a single slip. Two copies is what an original hands to
  // the customer and the till; running a spare of a spare just wastes roll.
  const copies = kind === 'reprint' ? 1 : Math.max(1, Math.floor(options?.copies ?? 1));

  // Opened first, before anything is awaited. A popup only counts as
  // user-initiated while the click that caused it is still on the stack, so
  // building the QR before this line would get the window blocked on every
  // sale — which is the whole receipt, lost to a nicety.
  const win = window.open('', '_blank', 'width=420,height=700');
  if (!win) {
    toast.error('Popup blocked. Allow popups for this site to print receipts.');
    return;
  }

  try {
    const qrDataUrl = await buildVerifyQr(order);
    win.document.write(
      receiptHTML(order, resolvedBranch, kind, copies, options?.reprintNumber, qrDataUrl),
    );
    win.document.close();
    win.focus();
    await imagesReady(win);
    win.print();
    win.close();
  } catch (err) {
    console.error('[Receipt] Failed to generate receipt:', err);
    win.close();
    toast.error('Failed to generate receipt. Please try reprinting from the Orders page.');
  }
}
