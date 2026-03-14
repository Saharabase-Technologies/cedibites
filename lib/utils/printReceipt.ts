import type { Order } from '@/types/order';
import { FULFILLMENT_LABELS } from '@/lib/constants/order.constants';

function formatDateTime(d: Date): string {
  const date = d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

function receiptHTML(order: Order, branchName: string): string {
  const createdAt = new Date(order.placedAt);

  const itemLines = order.items.map(item => {
    const label = item.sizeLabel ? `${item.name} (${item.sizeLabel})` : item.name;
    const lineTotal = `GHS ${(item.unitPrice * item.quantity).toFixed(2)}`;
    return `<div class="item-row"><span class="item-name">${item.quantity}&times; ${label}</span><span>${lineTotal}</span></div>`;
  }).join('');

  const paymentLabel: Record<string, string> = {
    cash: 'Cash',
    momo: 'Mobile Money',
    card: 'Card',
    no_charge: 'No Charge',
  };

  const showDeliveryFee = order.deliveryFee > 0;

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
    padding: 6px 6px;
    color: #000;
    background: #fff;
  }
  .center   { text-align: center; }
  .bold     { font-weight: bold; }
  .brand    { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
  .divider  { border-top: 1px dashed #555; margin: 5px 0; }
  .row      { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
  .item-row { display: flex; justify-content: space-between; margin: 3px 0; }
  .item-name { font-weight: bold; font-size: 13px; word-break: break-word; flex: 1; padding-right: 8px; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 3px 0; }
  .footer   { font-size: 10px; color: #555; text-align: center; margin-top: 3px; }
  @media print {
    @page { size: 80mm auto; margin: 3mm; }
    body { width: 100%; }
  }
</style>
</head>
<body>
  <div class="center brand">CediBites · ${branchName}</div>
  <div class="center" style="font-size:10px; margin-bottom:3px;">${formatDateTime(createdAt)}</div>
  <div class="divider"></div>

  <div class="row"><span>Order #${order.orderNumber}</span><span>${FULFILLMENT_LABELS[order.fulfillmentType]}</span></div>
  ${order.contact.name ? `<div class="row"><span>${order.contact.name}</span><span>${order.contact.phone ?? ''}</span></div>` : ''}
  <div class="divider"></div>

  ${itemLines}

  <div class="divider"></div>
  ${showDeliveryFee ? `<div class="row"><span>Delivery Fee</span><span>GHS ${order.deliveryFee.toFixed(2)}</span></div>` : ''}
  <div class="total-row"><span>TOTAL</span><span>GHS ${order.total.toFixed(2)}</span></div>
  <div class="row" style="margin-top:2px;"><span>Payment</span><span>${paymentLabel[order.paymentMethod] ?? order.paymentMethod}</span></div>
  ${order.contact.notes ? `<div class="divider"></div><div style="font-size:10px;">Note: ${order.contact.notes}</div>` : ''}
  <div class="divider"></div>
  <div class="footer">Thank you for dining with us!</div>
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
