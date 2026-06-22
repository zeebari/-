import * as XLSX from 'xlsx'

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data)
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
  'سعر التكلفة $': number
  'سعر البيع $': number
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
