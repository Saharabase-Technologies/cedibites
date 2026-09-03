import type { Order, OrderItem } from '@/types/order';
import { FULFILLMENT_LABELS } from '@/lib/constants/order.constants';
import { toast } from '@/lib/utils/toast';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

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

  return `
  <div class="center brand">CediBites</div>
  <div class="center invoice-title">RECEIPT</div>
  <div class="center branch-info">${branch.name}</div>
  ${branch.address ? `<div class="center branch-info">${branch.address}</div>` : ''}
  ${branch.phone ? `<div class="center branch-info">Phone: ${branch.phone}</div>` : ''}

  ${isPastOrder ? '<div class="past-order-banner">⏱ RECORDED PAST ORDER</div>' : ''}

  <div class="divider"></div>
  <table class="meta-table">
    <tr>
      <td class="label">Receipt No.:</td>
      <td>${order.orderNumber}</td>
    </tr>
    <tr>
      <td class="label">Date:</td>
      <td>${formatDateTime(createdAt)}</td>
    </tr>
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

  <div class="divider"></div>
  <div class="section-title">${sectionTitle}</div>
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
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: bold;
    width: 302px;
    padding: 8px;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .brand  { font-size: 18px; font-weight: bold; letter-spacing: 1px; line-height: 1.3; }
  .invoice-title { font-size: 15px; font-weight: bold; margin: 4px 0 2px; }
  .branch-info { font-size: 11px; margin-bottom: 2px; }
  .divider { border-top: 2px dashed #000; margin: 6px 0; }
  .thin-divider { border-top: 1px solid #000; margin: 4px 0; }
  .meta-table { width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 2px; }
  .meta-table td { padding: 1px 0; vertical-align: top; }
  .meta-table .label { white-space: nowrap; padding-right: 4px; }
  .section-title { font-size: 13px; font-weight: bold; text-align: center; margin: 4px 0; }
  .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .items-table th { text-align: left; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 3px 2px; font-size: 11px; }
  .items-table th.qty, .items-table th.price, .items-table th.amount { text-align: right; }
  .items-table td { padding: 3px 2px; vertical-align: top; }
  .item-name { font-size: 12px; font-weight: 900; word-break: break-word; }
  .qty, .price, .amount { text-align: right; white-space: nowrap; }
  .totals-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 2px; }
  .totals-table td { padding: 2px 2px; }
  .totals-table .amount { text-align: right; white-space: nowrap; }
  .totals-table .bold td { font-weight: bold; font-size: 12px; }
  .grand-total td { font-weight: bold; font-size: 13px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 2px; }
  .customer-table { width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 2px; }
  .customer-table td { padding: 2px 0; vertical-align: top; }
  .customer-table .label { white-space: nowrap; padding-right: 6px; }
  .note { font-size: 11px; padding-top: 3px; }
  .thank-you { font-size: 12px; font-weight: bold; text-align: center; margin: 6px 0 4px; }
  .order-code-num { font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 4px; margin: 4px 0 0; }
  .order-code-label { font-size: 10px; text-align: center; letter-spacing: 2px; margin-bottom: 4px; }
  .past-order-banner { text-align: center; font-size: 12px; font-weight: bold; padding: 4px 0; margin: 4px 0; border: 2px solid #000; letter-spacing: 1px; }
  @media print {
    @page { size: 80mm auto; margin: 3mm; }
    body { width: 100%; }
  }
  /* One cut between copies, none after the last. A page-break-after on every
     slip would feed a blank one off the end of the roll. */
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
): string {
  const slip = slipHTML(order, branch, kind, reprintNumber);
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

export function printReceipt(
  order: Order,
  branch: ReceiptBranch | string,
  options?: PrintReceiptOptions,
): void {
  const resolvedBranch: ReceiptBranch = typeof branch === 'string' ? { name: branch } : branch;
  const kind: ReceiptKind = options?.kind === 'reprint' ? 'reprint' : 'original';
  // A reprint is always a single slip. Two copies is what an original hands to
  // the customer and the till; running a spare of a spare just wastes roll.
  const copies = kind === 'reprint' ? 1 : Math.max(1, Math.floor(options?.copies ?? 1));
  const win = window.open('', '_blank', 'width=420,height=700');
  if (!win) {
    toast.error('Popup blocked. Allow popups for this site to print receipts.');
    return;
  }
  try {
    win.document.write(
      receiptHTML(order, resolvedBranch, kind, copies, options?.reprintNumber),
    );
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  } catch (err) {
    console.error('[Receipt] Failed to generate receipt:', err);
    win.close();
    toast.error('Failed to generate receipt. Please try reprinting from the Orders page.');
  }
}
