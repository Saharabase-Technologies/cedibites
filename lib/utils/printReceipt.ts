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


function receiptHTML(order: Order, branch: ReceiptBranch, kind: ReceiptKind): string {
  const sectionTitle = kind === 'reprint' ? 'Reprinted Receipt' : 'Original Receipt';
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

  const deliveryRow = deliveryFee > 0
    ? `<tr><td colspan="3">Delivery Fee</td><td class="amount">${deliveryFee.toFixed(2)}</td></tr>`
    : '';

  const discountRow = discount > 0
    ? `<tr><td colspan="3">Discount</td><td class="amount">-${discount.toFixed(2)}</td></tr>`
    : '';

  const amountPaidRow = amountPaid != null
    ? `<tr><td colspan="3">Amount Paid</td><td class="amount">${amountPaid.toFixed(2)}</td></tr>`
    : '';

  const changeRow = change > 0
    ? `<tr class="bold"><td colspan="3">Change</td><td class="amount">${change.toFixed(2)}</td></tr>`
    : '';

  const customerNoteRow = order.contact.notes
    ? `<tr><td colspan="4" class="note">Note: ${order.contact.notes}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${order.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
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
  .item-name { font-size: 11px; word-break: break-word; }
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
  @media print {
    @page { size: 80mm auto; margin: 3mm; }
    body { width: 100%; }
  }
</style>
</head>
<body>

  <div class="center brand">CediBites</div>
  <div class="center invoice-title">RECEIPT</div>
  <div class="center branch-info">${branch.name}</div>
  ${branch.address ? `<div class="center branch-info">${branch.address}</div>` : ''}
  ${branch.phone ? `<div class="center branch-info">Phone: ${branch.phone}</div>` : ''}

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
    ${deliveryRow}
    ${discountRow}
    <tr class="grand-total">
      <td colspan="3">TOTAL</td>
      <td class="amount">${total.toFixed(2)}</td>
    </tr>
    ${amountPaidRow}
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
  const win = window.open('', '_blank', 'width=420,height=700');
  if (!win) {
    toast.error('Popup blocked — please allow popups for this site to print receipts.');
    return;
  }
  win.document.write(receiptHTML(order, resolvedBranch, kind));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
