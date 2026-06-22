'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { FileSpreadsheet, FileText, BarChart3 } from 'lucide-react'
import type { Sale, Customer, Supplier } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { fetchExchangeRate, fetchSalesReport, fetchDebtsReport, fetchInventory } from '@/lib/api'

type Tab = 'sales' | 'debts' | 'inventory'

interface DebtData {
  customers: Customer[]
  suppliers: Supplier[]
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<DebtData>({ customers: [], suppliers: [] })
  const [rate, setRate] = useState(1310)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchExchangeRate().then(d => setRate(d.usd_to_iqd ?? 1310))
    loadSales()
    loadDebts()
  }, [])

  async function loadSales() {
    setLoading(true)
    const data = await fetchSalesReport(from, to)
    setSales(data as Sale[])
    setLoading(false)
  }

  async function loadDebts() {
    const data = await fetchDebtsReport()
    setDebts(data as DebtData)
  }

  const totalSalesUSD = sales.reduce((s, sale) =>
    s + (sale.currency === 'USD' ? sale.total_amount : sale.total_amount / sale.exchange_rate), 0)

  const totalCustomerDebt = debts.customers.reduce((s, c) => s + c.balance_owed, 0)
  const totalSupplierDebt = debts.suppliers.reduce((s, s2) => s + s2.balance_owed, 0)

  async function exportSalesExcel() {
    const { exportSalesToExcel } = await import('@/lib/export/excel')
    exportSalesToExcel(sales.map(s => ({
      رقم_الفاتورة: s.id.slice(0, 8).toUpperCase(),
      التاريخ: s.sale_date,
      الزبون: s.customers?.name ?? 'نقدي',
      'نوع الدفع': s.payment_type,
      العملة: s.currency,
      المجموع: s.total_amount,
      'المدفوع': s.amount_paid,
      'المتبقي': s.total_amount - s.amount_paid,
      الحالة: s.status,
    })))
  }

  async function exportInventoryReport() {
    const inventory = await fetchInventory()
    const { exportInventoryToExcel } = await import('@/lib/export/excel')
    exportInventoryToExcel(inventory.map((i: { products?: { name?: string; categories?: { name?: string }; unit?: string; cost_price_usd?: number; sale_price_usd?: number }; quantity: number; min_quantity: number; warehouse_location?: string }) => ({
      المنتج: i.products?.name ?? '',
      الفئة: i.products?.categories?.name ?? '',
      الوحدة: i.products?.unit ?? '',
      الكمية: i.quantity,
      'حد التنبيه': i.min_quantity,
      'سعر التكلفة $': i.products?.cost_price_usd ?? 0,
      'سعر البيع $': i.products?.sale_price_usd ?? 0,
      الموقع: i.warehouse_location ?? '',
    })))
  }

  async function exportInventoryPdf() {
    const inventory = await fetchInventory()
    const { exportInventoryToPdf } = await import('@/lib/export/pdf')
    await exportInventoryToPdf(inventory.map((i: { products?: { name?: string; categories?: { name?: string }; unit?: string; cost_price_usd?: number; sale_price_usd?: number }; quantity: number; min_quantity: number }) => ({
      name: i.products?.name ?? '',
      category: i.products?.categories?.name ?? '',
      unit: i.products?.unit ?? '',
      quantity: i.quantity,
      min_quantity: i.min_quantity,
      cost_price_usd: i.products?.cost_price_usd ?? 0,
      sale_price_usd: i.products?.sale_price_usd ?? 0,
    })), rate)
  }

  const statusBadge = (status: string) => {
    if (status === 'مدفوع') return <Badge variant="success">{status}</Badge>
    if (status === 'جزئي') return <Badge variant="warning">{status}</Badge>
    return <Badge variant="danger">{status}</Badge>
  }

  return (
    <DashboardLayout title="التقارير">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {(['sales', 'debts', 'inventory'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'sales' ? 'المبيعات' : t === 'debts' ? 'الديون' : 'المخزون'}
            </button>
          ))}
        </div>

        {/* Sales Report */}
        {tab === 'sales' && (
          <div className="space-y-4">
            <div className="card flex flex-wrap items-end gap-3">
              <Input label="من تاريخ" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
              <Input label="إلى تاريخ" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
              <Button onClick={loadSales}>عرض</Button>
              <div className="flex gap-2 mr-auto">
                <Button variant="outline" size="sm" onClick={exportSalesExcel}><FileSpreadsheet size={14} />Excel</Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <BarChart3 size={24} className="text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalSalesUSD, 'USD')}</div>
                <div className="text-sm text-slate-500">إجمالي المبيعات $</div>
                <div className="text-xs text-slate-400 mt-1">{formatCurrency(totalSalesUSD * rate, 'IQD')}</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-green-600">{sales.filter(s => s.status === 'مدفوع').length}</div>
                <div className="text-sm text-slate-500">فواتير مدفوعة</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-red-600">{sales.filter(s => s.status !== 'مدفوع').length}</div>
                <div className="text-sm text-slate-500">فواتير معلقة</div>
              </div>
            </div>

            <div className="card p-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>رقم الفاتورة</Th>
                    <Th>التاريخ</Th>
                    <Th>الزبون</Th>
                    <Th>نوع الدفع</Th>
                    <Th>المجموع</Th>
                    <Th>المدفوع</Th>
                    <Th>المتبقي</Th>
                    <Th>الحالة</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {loading ? (
                    <Tr><Td className="text-center py-8 text-slate-400" colSpan={8}>جاري التحميل...</Td></Tr>
                  ) : sales.map(s => (
                    <Tr key={s.id}>
                      <Td className="font-mono text-xs">#{s.id.slice(0, 8).toUpperCase()}</Td>
                      <Td>{s.sale_date}</Td>
                      <Td>{s.customers?.name ?? <span className="text-slate-400">نقدي</span>}</Td>
                      <Td><Badge variant="info">{s.payment_type}</Badge></Td>
                      <Td>{formatCurrency(s.total_amount, s.currency as 'USD' | 'IQD')}</Td>
                      <Td className="text-green-600">{formatCurrency(s.amount_paid, s.currency as 'USD' | 'IQD')}</Td>
                      <Td className="text-red-600">{formatCurrency(s.total_amount - s.amount_paid, s.currency as 'USD' | 'IQD')}</Td>
                      <Td>{statusBadge(s.status)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        )}

        {/* Debts Report */}
        {tab === 'debts' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-3">ديون الزبائن</h3>
                <div className="text-2xl font-bold text-red-600 mb-4">{formatCurrency(totalCustomerDebt, 'USD')}</div>
                <div className="space-y-2">
                  {debts.customers.map(c => (
                    <div key={c.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">{formatCurrency(c.balance_owed, 'USD')}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(c.balance_owed * rate, 'IQD')}</div>
                      </div>
                    </div>
                  ))}
                  {debts.customers.length === 0 && <p className="text-slate-400 text-sm text-center py-4">لا توجد ديون</p>}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-slate-800 mb-3">مستحقات الموردين</h3>
                <div className="text-2xl font-bold text-purple-600 mb-4">{formatCurrency(totalSupplierDebt, 'USD')}</div>
                <div className="space-y-2">
                  {debts.suppliers.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        {s.phone && <div className="text-xs text-slate-400">{s.phone}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-purple-600">{formatCurrency(s.balance_owed, s.currency as 'USD' | 'IQD')}</div>
                      </div>
                    </div>
                  ))}
                  {debts.suppliers.length === 0 && <p className="text-slate-400 text-sm text-center py-4">لا توجد مستحقات</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Report */}
        {tab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={exportInventoryReport}><FileSpreadsheet size={14} />تصدير Excel</Button>
              <Button variant="outline" size="sm" onClick={exportInventoryPdf}><FileText size={14} />تصدير PDF</Button>
            </div>
            <p className="text-sm text-slate-500">اذهب إلى صفحة المخزون للاطلاع على التفاصيل الكاملة وتصدير التقرير من هناك مباشرة.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
