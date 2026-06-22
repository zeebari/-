'use client'

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');`

const BASE = `
${FONT}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
  color: #1e293b;
  background: #fff;
  font-size: 13px;
  line-height: 1.5;
}
.back-btn {
  position: fixed;
  top: 14px;
  left: 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  font-family: 'Tajawal', sans-serif;
  font-weight: 600;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  transition: background 0.15s;
}
.back-btn:hover { background: #1d4ed8; }
@media print { .back-btn { display: none !important; } }
.page { padding: 32px 36px; min-height: 100vh; display: flex; flex-direction: column; }
.header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 16px;
  border-bottom: 3px solid #2563eb;
  margin-bottom: 20px;
}
.company { }
.company-name { font-size: 20px; font-weight: 800; color: #1e3a8a; }
.company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
.report-info { text-align: left; }
.report-title { font-size: 18px; font-weight: 700; color: #2563eb; }
.report-date { font-size: 11px; color: #94a3b8; margin-top: 3px; }
table { width: 100%; border-collapse: collapse; margin-top: 4px; }
thead tr { background: #1e3a8a; }
th {
  color: #fff; font-weight: 600; font-size: 12px;
  padding: 9px 11px; text-align: right;
  white-space: nowrap;
}
td { padding: 8px 11px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
tr:nth-child(even) td { background: #f8fafc; }
tr:last-child td { border-bottom: none; }
.low { color: #dc2626; font-weight: 700; }
.ok  { color: #16a34a; font-weight: 600; }
.num { font-variant-numeric: tabular-nums; }
.footer {
  margin-top: auto; padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex; justify-content: space-between;
  font-size: 10px; color: #94a3b8;
}
/* Invoice-specific */
.inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 20px; font-size: 12px; }
.inv-meta .label { color: #64748b; }
.inv-meta .value { font-weight: 600; }
.totals { margin-top: 16px; background: #f8fafc; border-radius: 8px; padding: 14px 16px; }
.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.total-row.grand { border-top: 2px solid #e2e8f0; margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 800; }
.status { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
.note-box { margin-top: 16px; background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #713f12; }
/* Screen hint — hidden on print */
.hint { font-size: 11px; color: #94a3b8; background: #f1f5f9; border-radius: 6px; padding: 7px 12px; margin-bottom: 18px; }
@media print {
  .hint { display: none; }
  @page { size: A4; margin: 1.2cm 1cm; }
  body { font-size: 12px; }
}
`

function open(html: string, title: string) {
  const win = window.open('', '_blank', 'width=950,height=750')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${BASE}</style>
</head>
<body>
<button class="back-btn" onclick="window.close()">✕ إغلاق</button>
${html}
</body>
</html>`)
  win.document.close()
  win.onload = () => { win.focus(); win.print() }
}

export async function exportInventoryToPdf(
  items: {
    name: string; category: string; unit: string
    quantity: number; min_quantity: number
    cost_price_usd: number; sale_price_usd: number
  }[],
  _rate?: number
) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const lowCount = items.filter(i => i.quantity <= i.min_quantity).length

  const rows = items.map(i => {
    const isLow = i.quantity <= i.min_quantity
    return `<tr>
      <td>${i.name}</td>
      <td>${i.category || '—'}</td>
      <td>${i.unit}</td>
      <td class="num ${isLow ? 'low' : ''}">${i.quantity}</td>
      <td class="num">${i.min_quantity}</td>
      <td class="num">$${i.cost_price_usd.toFixed(2)}</td>
      <td class="num">$${i.sale_price_usd.toFixed(2)}</td>
      <td class="${isLow ? 'low' : 'ok'}">${isLow ? '⚠ منخفض' : '✓ جيد'}</td>
    </tr>`
  }).join('')

  open(`
<div class="page">
  <div class="hint">💡 لإخفاء تذييل المتصفح عند الطباعة: More settings ← أوقف "Headers and footers"</div>
  <div class="header">
    <div class="company">
      <div class="company-name">نظام المحاسبة</div>
      <div class="company-sub">غذائية وكهربائية</div>
    </div>
    <div class="report-info">
      <div class="report-title">تقرير المخزون</div>
      <div class="report-date">${date}</div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>المنتج</th><th>الفئة</th><th>الوحدة</th>
      <th>الكمية</th><th>حد التنبيه</th>
      <th>سعر التكلفة</th><th>سعر البيع</th><th>الحالة</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>إجمالي المنتجات: <strong>${items.length}</strong></span>
    ${lowCount > 0 ? `<span style="color:#dc2626">منتجات منخفضة: <strong>${lowCount}</strong></span>` : ''}
    <span>${date}</span>
  </div>
</div>`, 'تقرير المخزون')
}

function fmtAmt(amount: number, currency: string): string {
  if (currency === 'IQD') return amount.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' د.ع'
  return '$' + amount.toFixed(2)
}

export async function exportSaleToPdf(sale: {
  id: string; sale_date: string; customer_name: string | null
  payment_type: string; currency: string; exchange_rate: number
  total_amount: number; amount_paid: number; status: string
  note: string | null
  items: { product_name: string; quantity: number; unit_price: number; total: number }[]
  installments?: { due_date: string; amount: number; status: string }[]
}) {
  const remaining = sale.total_amount - sale.amount_paid
  const statusColor = sale.status === 'مدفوع' ? '#16a34a' : sale.status === 'جزئي' ? '#d97706' : '#dc2626'
  const date = new Date(sale.sale_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const itemRows = sale.items.map(i => `<tr>
    <td>${i.product_name}</td>
    <td class="num" style="text-align:center">${i.quantity}</td>
    <td class="num">${fmtAmt(i.unit_price, sale.currency)}</td>
    <td class="num" style="font-weight:700">${fmtAmt(i.total, sale.currency)}</td>
  </tr>`).join('')

  const instRows = (sale.installments ?? []).map((inst, i) => `<tr>
    <td>قسط ${i + 1}</td>
    <td>${new Date(inst.due_date).toLocaleDateString('en-US')}</td>
    <td class="num">${fmtAmt(inst.amount, sale.currency)}</td>
    <td class="${inst.status === 'مدفوع' ? 'ok' : 'low'}">${inst.status}</td>
  </tr>`).join('')

  const instSection = sale.installments?.length ? `
    <div style="margin-top:24px">
      <div style="font-weight:700;margin-bottom:8px;color:#1e3a8a">جدول الأقساط</div>
      <table>
        <thead><tr><th>البيان</th><th>الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead>
        <tbody>${instRows}</tbody>
      </table>
    </div>` : ''

  open(`
<div class="page">
  <div class="hint">💡 لإخفاء تذييل المتصفح: More settings ← أوقف "Headers and footers"</div>
  <div class="header">
    <div class="company">
      <div class="company-name">نظام المحاسبة</div>
      <div class="company-sub">غذائية وكهربائية</div>
    </div>
    <div class="report-info">
      <div class="report-title">فاتورة بيع</div>
      <div class="report-date">#${sale.id.slice(0, 8).toUpperCase()}</div>
    </div>
  </div>

  <div class="inv-meta">
    <div><span class="label">الزبون: </span><span class="value">${sale.customer_name ?? 'بيع نقدي'}</span></div>
    <div><span class="label">التاريخ: </span><span class="value">${date}</span></div>
    <div><span class="label">نوع الدفع: </span><span class="value">${sale.payment_type}</span></div>
    <div><span class="label">العملة: </span><span class="value">${sale.currency}</span></div>
    <div><span class="label">الحالة: </span>
      <span class="status" style="color:${statusColor};border:1.5px solid ${statusColor}">${sale.status}</span>
    </div>
  </div>

  <table>
    <thead><tr><th>المنتج</th><th style="text-align:center">الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>المجموع</span><span class="num">${fmtAmt(sale.total_amount, sale.currency)}</span></div>
    <div class="total-row" style="color:#16a34a"><span>المدفوع</span><span class="num">${fmtAmt(sale.amount_paid, sale.currency)}</span></div>
    <div class="total-row grand" style="color:${remaining > 0 ? '#dc2626' : '#16a34a'}">
      <span>المتبقي</span><span class="num">${fmtAmt(remaining, sale.currency)}</span>
    </div>
  </div>

  ${sale.note ? `<div class="note-box"><strong>ملاحظة:</strong> ${sale.note}</div>` : ''}
  ${instSection}

  <div class="footer">
    <span>نظام المحاسبة — غذائية وكهربائية</span>
    <span>فاتورة #${sale.id.slice(0, 8).toUpperCase()} | ${date}</span>
  </div>
</div>`, `فاتورة #${sale.id.slice(0, 8).toUpperCase()}`)
}
