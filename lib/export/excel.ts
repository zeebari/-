import * as XLSX from 'xlsx'

function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  ws['!cols'] = keys.map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 4, 40) }
  })
}

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data)
  autoFitColumns(ws, data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportInventoryToExcel(items: {
  المنتج: string
  الفئة: string
  الوحدة: string
  الكمية: number
  'حد التنبيه': number
  'سعر التكلفة': number
  'سعر البيع': number
  الموقع: string
}[]) {
  exportToExcel(items, 'تقرير-المخزون', 'المخزون')
}

export function exportSalesToExcel(items: {
  رقم_الفاتورة: string
  التاريخ: string
  الزبون: string
  'نوع الدفع': string
  العملة: string
  المجموع: number
  'المدفوع': number
  'المتبقي': number
  الحالة: string
}[]) {
  exportToExcel(items, 'تقرير-المبيعات', 'المبيعات')
}
