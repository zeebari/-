'use client'

const BASE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Tajawal', sans-serif; direction: rtl; color: #1e293b; font-size: 13px; padding: 20px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2563eb; color: white; padding: 8px 10px; text-align: right; font-weight: 600; font-size: 12px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge-low { color: #dc2626; font-weight: 600; }
  .badge-ok { color: #16a34a; }
  .total-row { background: #f1f5f9 !important; font-weight: 700; }
  @media print {
    body { padding: 10px; }
    button { display: none; }
  }
`

function openPrint(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print() }
}

export async function exportInventoryToPdf(
  items: {
    name: string
    category: string
    unit: string
    quantity: number
    min_quantity: number
    cost_price_usd: number
    sale_price_usd: number
  }[],
  exchangeRate: number
) {
  const date = new Date().toLocaleDateString('ar-IQ')
  const rows = items.map(i => {
    const isLow = i.quantity <= i.min_quantity
    return `
      <tr>
        <td>${i.name}</td>
        <td>${i.category || '—'}</td>
        <td>${i.unit}</td>
        <td class="${isLow ? 'badge-low' : ''}">${i.quantity}</td>
        <td>${i.min_quantity}</td>
        <td>$${i.cost_price_usd.toFixed(2)}</td>
        <td>$${i.sale_price_usd.toFixed(2)}</td>
        <td>${Math.round(i.sale_price_usd * exchangeRate).toLocaleString()} د.ع</td>
        <td class="${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? 'منخفض' : 'جيد'}</td>
      </tr>
    `
  }).join('')

  openPrint(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تقرير المخزون</title>
<style>${BASE_STYLES}</style>
</head>
<body>
  <h1>تقرير المخزون</h1>
  <div class="meta">التاريخ: ${date} &nbsp;|&nbsp; سعر الصرف: 1$ = ${exchangeRate.toLocaleString()} د.ع &nbsp;|&nbsp; عدد المنتجات: ${items.length}</div>
  <table>
    <thead>
      <tr>
        <th>المنتج</th><th>الفئة</th><th>الوحدة</th><th>الكمية</th>
        <th>حد التنبيه</th><th>سعر التكلفة</th><th>سعر البيع $</th>
        <th>سعر البيع د.ع</th><th>الحالة</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`)
}

export async function exportSaleToPdf(sale: {
  id: string
  sale_date: string
  customer_name: string | null
  payment_type: string
  currency: string
  exchange_rate: number
  total_amount: number
  amount_paid: number
  status: string
  note: string | null
  items: { product_name: string; quantity: number; unit_price: number; total: number }[]
  installments?: { due_date: string; amount: number; status: string }[]
}) {
  const remaining = sale.total_amount - sale.amount_paid
  const statusColor = sale.status === 'مدفوع' ? '#16a34a' : sale.status === 'جزئي' ? '#d97706' : '#dc2626'

  const itemRows = sale.items.map(i => `
    <tr>
      <td>${i.product_name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:left">${i.unit_price.toFixed(2)}</td>
      <td style="text-align:left;font-weight:600">${i.total.toFixed(2)}</td>
    </tr>
  `).join('')

  const installmentRows = (sale.installments ?? []).map((inst, i) => `
    <tr>
      <td>قسط ${i + 1}</td>
      <td>${inst.due_date}</td>
      <td style="text-align:left">${inst.amount.toFixed(2)} ${sale.currency}</td>
      <td class="${inst.status === 'مدفوع' ? 'badge-ok' : 'badge-low'}">${inst.status}</td>
    </tr>
  `).join('')

  const installmentsSection = sale.installments && sale.installments.length > 0 ? `
    <h2 style="margin-top:24px;margin-bottom:8px;font-size:15px;">جدول الأقساط</h2>
    <table>
      <thead><tr><th>البيان</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead>
      <tbody>${installmentRows}</tbody>
    </table>
  ` : ''

  openPrint(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة #${sale.id.slice(0, 8).toUpperCase()}</title>
<style>
${BASE_STYLES}
.invoice-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; padding-bottom:16px; border-bottom:2px solid #2563eb; }
.company-name { font-size:22px; font-weight:700; color:#2563eb; }
.invoice-title { font-size:28px; font-weight:700; color:#1e293b; text-align:left; }
.invoice-num { color:#64748b; font-size:13px; text-align:left; }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
.info-item { font-size:12px; } .info-item span { color:#64748b; }
.totals { margin-top:16px; padding:12px 16px; background:#f8fafc; border-radius:8px; }
.total-line { display:flex; justify-content:space-between; padding:4px 0; font-size:13px; }
.total-line.main { font-size:16px; font-weight:700; border-top:1px solid #e2e8f0; margin-top:4px; padding-top:8px; }
.status-badge { display:inline-block; padding:2px 10px; border-radius:999px; font-weight:600; font-size:12px; color:${statusColor}; border:1px solid ${statusColor}; }
</style>
</head>
<body>
  <div class="invoice-header">
    <div>
      <div class="company-name">نظام المحاسبة</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px">غذائية وكهربائية</div>
    </div>
    <div style="text-align:left">
      <div class="invoice-title">فاتورة بيع</div>
      <div class="invoice-num">#${sale.id.slice(0, 8).toUpperCase()}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span>الزبون: </span><strong>${sale.customer_name ?? 'بيع نقدي'}</strong></div>
    <div class="info-item"><span>التاريخ: </span><strong>${sale.sale_date}</strong></div>
    <div class="info-item"><span>نوع الدفع: </span><strong>${sale.payment_type}</strong></div>
    <div class="info-item"><span>العملة: </span><strong>${sale.currency}</strong></div>
    <div class="info-item"><span>سعر الصرف: </span><strong>1$ = ${sale.exchange_rate.toLocaleString()} د.ع</strong></div>
    <div class="info-item"><span>الحالة: </span><span class="status-badge">${sale.status}</span></div>
  </div>

  <table>
    <thead>
      <tr><th>المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:left">سعر الوحدة (${sale.currency})</th><th style="text-align:left">المجموع (${sale.currency})</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="total-line"><span>المجموع</span><span>${sale.total_amount.toFixed(2)} ${sale.currency}</span></div>
    <div class="total-line" style="color:#16a34a"><span>المدفوع</span><span>${sale.amount_paid.toFixed(2)} ${sale.currency}</span></div>
    <div class="total-line main" style="color:${remaining > 0 ? '#dc2626' : '#16a34a'}">
      <span>المتبقي</span><span>${remaining.toFixed(2)} ${sale.currency}</span>
    </div>
    ${sale.currency === 'USD' ? `<div class="total-line" style="color:#64748b;font-size:12px"><span>الإجمالي بالدينار</span><span>${Math.round(sale.total_amount * sale.exchange_rate).toLocaleString()} د.ع</span></div>` : ''}
  </div>

  ${sale.note ? `<div style="margin-top:16px;padding:10px;background:#fef9c3;border-radius:6px;font-size:12px;color:#713f12"><strong>ملاحظة:</strong> ${sale.note}</div>` : ''}

  ${installmentsSection}
</body>
</html>`)
}
