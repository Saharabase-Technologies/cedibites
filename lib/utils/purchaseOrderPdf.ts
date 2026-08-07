/**
 * lib/utils/purchaseOrderPdf.ts
 *
 * Generates a printable Purchase Order document (A4 PDF) the warehouse manager
 * can forward to a supplier — we have no direct supplier integration, so the PO
 * is downloaded and sent manually. Triggered automatically when a PO reaches
 * `sent`, and on demand via the "Download PO" button.
 */

import type { PurchaseOrder } from '@/types/inventory';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// jsPDF's built-in Helvetica (WinAnsi) has no glyph for ₵ (U+20B5) — it renders
// as "µ" with broken spacing. Use the ASCII "GHS" prefix with thousand separators.
function fmtMoney(n: number | string | null | undefined): string {
  const num = typeof n === 'number' ? n : parseFloat(String(n ?? 0));
  const safe = Number.isNaN(num) ? 0 : num;
  return `GHS ${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function downloadPurchaseOrderPdf(po: PurchaseOrder): Promise<void> {
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')]);
  const doc = new jsPDF('p', 'mm', 'a4');

  // QR signature encodes a verify URL so a scan opens the authenticity check.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const verifyUrl = `${origin}/inventory/purchase-orders/verify/${encodeURIComponent(po.verification_code)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
  } catch {
    qrDataUrl = '';
  }

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const right = pageW - margin;
  let y = margin;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CediBites', margin, y);
  doc.setFontSize(15);
  doc.text('PURCHASE ORDER', right, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text('Mother Kitchen — Inventory', margin, y);
  doc.setTextColor(30);
  doc.setFont('helvetica', 'bold');
  doc.text(po.reference, right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 4;
  doc.setTextColor(110);
  doc.setFontSize(9);
  doc.text(`Status: ${po.status.replace(/_/g, ' ')}`, right, y, { align: 'right' });
  doc.setTextColor(30);
  y += 6;

  doc.setDrawColor(225);
  doc.line(margin, y, right, y);
  y += 8;

  // ── Supplier + destination ──────────────────────────────────────────────
  const colR = pageW / 2 + 4;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('SUPPLIER', margin, y);
  doc.text('DELIVER TO', colR, y);
  y += 5;

  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.setFont('helvetica', 'bold');
  doc.text(po.supplier.name, margin, y);
  doc.text(po.destination_location.name, colR, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Code: ${po.supplier.code}`, margin, y);
  doc.text('Warehouse', colR, y);
  y += 4;
  if (po.supplier.phone) {
    doc.text(`Phone: ${po.supplier.phone}`, margin, y);
  }
  doc.text(`Expected: ${fmtDate(po.expected_delivery_date)}`, colR, y);
  y += 4;
  doc.text(`Created: ${fmtDate(po.created_at)} by ${po.created_by?.name ?? '—'}`, margin, y);
  if (['sent', 'partially_received', 'received', 'closed'].includes(po.status)) {
    doc.text(`Sent: ${fmtDate(po.approved_at ?? po.updated_at)}`, colR, y);
  }
  y += 8;
  doc.setTextColor(30);

  // ── Line items table ────────────────────────────────────────────────────
  const cols = {
    item: margin,
    qty: pageW - margin - 78,
    unit: pageW - margin - 58,
    cost: pageW - margin - 40,
    total: right,
  };

  const headerTop = y - 4;
  const headerH = 8;
  const headerBaseline = headerTop + headerH / 2 + 1.4; // vertically centre the 8pt text
  doc.setFillColor(245, 241, 232);
  doc.rect(margin, headerTop, right - margin, headerH, 'F');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text('ITEM', cols.item + 1, headerBaseline);
  doc.text('QTY', cols.qty, headerBaseline, { align: 'right' });
  doc.text('UNIT', cols.unit, headerBaseline, { align: 'right' });
  doc.text('EST. COST', cols.cost, headerBaseline, { align: 'right' });
  doc.text('LINE TOTAL', cols.total, headerBaseline, { align: 'right' });
  y = headerTop + headerH + 4;

  doc.setFontSize(9);
  doc.setTextColor(30);
  for (const line of po.items) {
    doc.text(`${line.item.name}  (${line.item.sku})`, cols.item + 1, y);
    doc.text(String(line.ordered_qty), cols.qty, y, { align: 'right' });
    doc.text(line.unit.symbol, cols.unit, y, { align: 'right' });
    doc.text(fmtMoney(line.estimated_unit_cost), cols.cost, y, { align: 'right' });
    doc.text(fmtMoney(line.line_total), cols.total, y, { align: 'right' });
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setDrawColor(225);
  doc.line(margin, y, right, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Estimated total', cols.cost, y, { align: 'right' });
  doc.text(fmtMoney(po.estimated_total), cols.total, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 10;

  // ── Notes + approval ────────────────────────────────────────────────────
  if (po.notes) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('NOTES', margin, y);
    y += 4;
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.text(doc.splitTextToSize(po.notes, right - margin), margin, y);
    y += 10;
  }

  if (po.approved_by) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Approved by ${po.approved_by.name} on ${fmtDate(po.approved_at)}`, margin, y);
    y += 6;
  }

  // ── Verification signature (QR + code) ──────────────────────────────────
  const qrSize = 30;
  const qrX = right - qrSize;
  const qrY = 250;
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text(po.verification_code, qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, margin, 287);

  doc.save(`${po.reference}.pdf`);
}
