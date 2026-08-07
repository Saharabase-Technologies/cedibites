// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportMeta {
  title: string;
  branchName: string;
  periodLabel: string;
  dateRange: string;
  generatedAt: string;
}

export interface SalesSummaryData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  noChargeOrders: number;
  noChargeAmount: number;
  cancelledOrders: number;
  avgItemsPerOrder?: number;
}

export interface ItemSoldRow {
  name: string;
  units: number;
  revenue: number;
  pctOfTotal?: number;
  trend?: number;
}

export interface DailyRow {
  date: string;
  orders: number;
  revenue: number;
}

export interface CustomerRow {
  name: string;
  phone: string;
  orders: number;
  totalSpend: number;
}

export interface ReportData {
  meta: ReportMeta;
  summary?: SalesSummaryData;
  itemsSold?: ItemSoldRow[];
  dailyBreakdown?: DailyRow[];
  topCustomers?: CustomerRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(text: string | number | undefined | null): string {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ghs(n: number): string {
  return `&#8373;${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildSummarySection(s: SalesSummaryData): string {
  const rows: [string, string][] = [
    ['Total Revenue', ghs(s.totalRevenue)],
    ['Total Orders', String(s.totalOrders)],
    ['Avg. Order Value', ghs(s.avgOrderValue)],
    ['No-Charge Orders', String(s.noChargeOrders)],
    ['No-Charge Amount', ghs(s.noChargeAmount)],
    ['Cancelled Orders', String(s.cancelledOrders)],
  ];
  if (s.avgItemsPerOrder != null) {
    rows.push(['Avg. Items per Order', String(s.avgItemsPerOrder)]);
  }
  return `
    <div class="section">
      <div class="section-title">Sales Summary</div>
      <table>
        <thead><tr><th>Metric</th><th class="right">Value</th></tr></thead>
        <tbody>
          ${rows.map(([label, val]) => `<tr><td>${esc(label)}</td><td class="right">${val}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function buildItemsSection(items: ItemSoldRow[]): string {
  const totalUnits = items.reduce((s, i) => s + i.units, 0);
  const totalRev = items.reduce((s, i) => s + i.revenue, 0);
  const rows = items.map((item, idx) => {
    const trend = item.trend != null
      ? `<span style="color:${item.trend >= 0 ? '#6c833f' : '#d32f2f'}">${item.trend >= 0 ? '+' : ''}${item.trend}%</span>`
      : '—';
    const pct = item.pctOfTotal != null ? `${item.pctOfTotal.toFixed(1)}%` : '—';
    return `<tr>
      <td class="right muted">${idx + 1}</td>
      <td>${esc(item.name)}</td>
      <td class="right">${item.units}</td>
      <td class="right">${ghs(item.revenue)}</td>
      <td class="right">${pct}</td>
      <td class="right">${trend}</td>
    </tr>`;
  }).join('');

  return `
    <div class="section">
      <div class="section-title">Items Sold Detail</div>
      <table>
        <thead>
          <tr>
            <th class="right" style="width:28px">#</th>
            <th>Item</th>
            <th class="right">Qty Sold</th>
            <th class="right">Revenue</th>
            <th class="right">% of Total</th>
            <th class="right">Trend</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td></td>
            <td><strong>TOTAL</strong></td>
            <td class="right"><strong>${totalUnits}</strong></td>
            <td class="right"><strong>${ghs(totalRev)}</strong></td>
            <td class="right"><strong>100%</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function buildDailySection(rows: DailyRow[]): string {
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  return `
    <div class="section">
      <div class="section-title">Daily Breakdown</div>
      <table>
        <thead><tr><th>Date</th><th class="right">Orders</th><th class="right">Revenue</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr><td>${esc(formatReportDate(r.date))}</td><td class="right">${r.orders}</td><td class="right">${ghs(Number(r.revenue))}</td></tr>`).join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="right"><strong>${totalOrders}</strong></td>
            <td class="right"><strong>${ghs(totalRev)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function buildCustomersSection(customers: CustomerRow[]): string {
  return `
    <div class="section">
      <div class="section-title">Top Customers</div>
      <table>
        <thead>
          <tr>
            <th class="right" style="width:28px">#</th>
            <th>Name</th>
            <th>Phone</th>
            <th class="right">Orders</th>
            <th class="right">Total Spend</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map((c, i) => `
            <tr>
              <td class="right muted">${i + 1}</td>
              <td>${esc(c.name || 'Unknown')}</td>
              <td>${esc(c.phone || '—')}</td>
              <td class="right">${c.orders}</td>
              <td class="right">${ghs(c.totalSpend)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildReportHtml(data: ReportData): string {
  const { meta } = data;
  const sections = [
    data.summary ? buildSummarySection(data.summary) : '',
    data.itemsSold?.length ? buildItemsSection(data.itemsSold) : '',
    data.dailyBreakdown?.length ? buildDailySection(data.dailyBreakdown) : '',
    data.topCustomers?.length ? buildCustomersSection(data.topCustomers) : '',
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(meta.title)} — CediBites</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #2a2017;
    background: #fff;
    padding: 24px 28px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 2px solid #e49925;
    margin-bottom: 20px;
  }
  .brand { font-size: 22px; font-weight: bold; color: #e49925; letter-spacing: 0.5px; }
  .report-title { font-size: 16px; font-weight: bold; color: #2a2017; margin-top: 2px; }
  .meta-right { text-align: right; font-size: 11px; color: #7a6e60; line-height: 1.7; }
  .meta-right strong { color: #2a2017; }
  .section {
    margin-bottom: 22px;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #e49925;
    border-left: 3px solid #e49925;
    padding: 3px 8px;
    background: #fff8ee;
    margin-bottom: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  th {
    background: #f5f0e5;
    text-align: left;
    padding: 5px 8px;
    border-bottom: 1px solid #ddd;
    font-weight: bold;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #5a4e40;
  }
  td {
    padding: 4px 8px;
    border-bottom: 1px solid #f0ebe0;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #faf7f2; }
  .right { text-align: right; }
  .muted { color: #a09080; }
  .total-row td {
    border-top: 1.5px solid #ddd;
    border-bottom: none;
    background: #fff8ee !important;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  .footer {
    margin-top: 28px;
    padding-top: 8px;
    border-top: 1px solid #f0ebe0;
    font-size: 10px;
    color: #a09080;
    text-align: center;
  }
  @media print {
    @page { size: A4; margin: 15mm; }
    body { padding: 0; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">CediBites</div>
    <div class="report-title">${esc(meta.title)}</div>
  </div>
  <div class="meta-right">
    <div><strong>${esc(meta.branchName)}</strong> &nbsp;·&nbsp; ${esc(meta.periodLabel)}</div>
    <div>${esc(meta.dateRange)}</div>
    <div>Generated: ${esc(meta.generatedAt)}</div>
  </div>
</div>

${sections}

<div class="footer">Generated by CediBites &nbsp;·&nbsp; ${esc(meta.generatedAt)}</div>

</body>
</html>`;
}

// ─── Print ────────────────────────────────────────────────────────────────────

export function printReport(html: string): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function generateCsv(headers: string[], rows: string[][], filename: string): void {
  const csvRows = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
