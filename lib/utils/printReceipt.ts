import type { Order } from '@/types/order';
import { FULFILLMENT_LABELS } from '@/lib/constants/order.constants';

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function receiptHTML(order: Order, branchName: string): string {
  const createdAt = new Date(order.placedAt);

  const itemLines = order.items.map(item => {
    const qty = `${item.quantity}×`;
    const unitPrice = `GHS ${item.unitPrice.toFixed(2)}`;
    const lineTotal = `GHS ${(item.unitPrice * item.quantity).toFixed(2)}`;
    const nameLine = `${qty} ${item.name}`;
    return `<div class="item-name">${nameLine}</div><div class="item-price">${unitPrice} → ${lineTotal}</div>`;
  }).join('');

  const paymentLabel: Record<string, string> = {
    cash: 'Cash',
    momo: 'Mobile Money',
    card: 'Card',
  };

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
    width: 302px;
    padding: 8px 6px;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .brand  { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
  .divider { border-top: 1px dashed #555; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .item-name  { margin-top: 4px; word-break: break-word; }
  .item-price { font-size: 11px; color: #333; margin-bottom: 2px; }
  .total-row  { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 4px 0; }
  .footer { font-size: 11px; color: #555; text-align: center; margin-top: 4px; }
  @media print {
    @page { size: 80mm auto; margin: 4mm; }
    body { width: 100%; }
  }
</style>
</head>
<body>
  <div class="center brand">CediBites</div>
  <div class="center" style="font-size:11px; margin-bottom:4px;">${branchName}</div>
  <div class="divider"></div>

  <div class="row"><span>Order</span><span class="bold">#${order.orderNumber}</span></div>
  <div class="row"><span>Date</span><span>${formatDate(createdAt)}</span></div>
  <div class="row"><span>Time</span><span>${formatTime(createdAt)}</span></div>
  <div class="row"><span>Type</span><span>${FULFILLMENT_LABELS[order.fulfillmentType]}</span></div>
  ${order.contact.name ? `<div class="row"><span>Customer</span><span>${order.contact.name}</span></div>` : ''}
  ${order.contact.phone ? `<div class="row"><span>Phone</span><span>${order.contact.phone}</span></div>` : ''}
  <div class="divider"></div>

  ${itemLines}

  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>GHS ${order.subtotal.toFixed(2)}</span></div>
  <div class="total-row"><span>TOTAL</span><span>GHS ${order.total.toFixed(2)}</span></div>
  <div class="row" style="margin-top:4px;"><span>Payment</span><span>${paymentLabel[order.paymentMethod] ?? order.paymentMethod}</span></div>
  ${order.contact.notes ? `<div class="divider"></div><div style="font-size:11px;">Note: ${order.contact.notes}</div>` : ''}

  <div class="divider"></div>
  <div class="footer">Thank you for dining with us!</div>
  <div class="footer" style="margin-top:2px;">Powered by CediBites</div>
  <br/>
</body>
</html>`;
}

export function printReceipt(order: Order, branchName: string): void {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(receiptHTML(order, branchName));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}
