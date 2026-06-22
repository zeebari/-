'use client'

export async function exportInventoryToPdf(items: {
  name: string
  category: string
  unit: string
  quantity: number
  min_quantity: number
  cost_price_usd: number
  sale_price_usd: number
}[], exchangeRate: number) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFont('helvetica')
  doc.setFontSize(16)
  doc.text('Inventory Report', doc.internal.pageSize.width / 2, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Date: ${new Date().toLocaleDateString('en-US')}  |  Exchange Rate: 1 USD = ${exchangeRate} IQD`, doc.internal.pageSize.width / 2, 22, { align: 'center' })

  autoTable(doc, {
    startY: 28,
    head: [['Product', 'Category', 'Unit', 'Qty', 'Min Qty', 'Cost $', 'Price $', 'Price IQD', 'Status']],
    body: items.map(i => [
      i.name,
      i.category,
      i.unit,
      i.quantity,
      i.min_quantity,
      `$${i.cost_price_usd.toFixed(2)}`,
      `$${i.sale_price_usd.toFixed(2)}`,
      `${Math.round(i.sale_price_usd * exchangeRate).toLocaleString()} IQD`,
      i.quantity <= i.min_quantity ? 'LOW' : 'OK',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  })

  doc.save('inventory-report.pdf')
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
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFontSize(18)
  doc.text('INVOICE', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Invoice #: ${sale.id.slice(0, 8).toUpperCase()}`, 14, 35)
  doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString('en-US')}`, 14, 42)
  doc.text(`Customer: ${sale.customer_name || 'Cash Sale'}`, 14, 49)
  doc.text(`Payment: ${sale.payment_type}  |  Currency: ${sale.currency}`, 14, 56)

  autoTable(doc, {
    startY: 65,
    head: [['Product', 'Qty', `Price (${sale.currency})`, `Total (${sale.currency})`]],
    body: sale.items.map(i => [
      i.product_name,
      i.quantity,
      i.unit_price.toFixed(2),
      i.total.toFixed(2),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  doc.setFontSize(11)
  doc.text(`Total: ${sale.total_amount.toFixed(2)} ${sale.currency}`, 14, finalY)
  doc.text(`Paid: ${sale.amount_paid.toFixed(2)} ${sale.currency}`, 14, finalY + 7)
  doc.text(`Remaining: ${(sale.total_amount - sale.amount_paid).toFixed(2)} ${sale.currency}`, 14, finalY + 14)
  doc.text(`Status: ${sale.status}`, 14, finalY + 21)

  if (sale.currency === 'USD') {
    doc.text(`Total in IQD: ${Math.round(sale.total_amount * sale.exchange_rate).toLocaleString()} IQD`, 14, finalY + 28)
  }

  if (sale.installments && sale.installments.length > 0) {
    autoTable(doc, {
      startY: finalY + 38,
      head: [['Installment Date', 'Amount', 'Status']],
      body: sale.installments.map(i => [
        new Date(i.due_date).toLocaleDateString('en-US'),
        `${i.amount.toFixed(2)} ${sale.currency}`,
        i.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 116, 139] },
    })
  }

  doc.save(`invoice-${sale.id.slice(0, 8)}.pdf`)
}
