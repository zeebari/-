'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { FileSpreadsheet, FileText, Pencil, AlertTriangle, Search } from 'lucide-react'
import type { Inventory } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([])
  const [rate, setRate] = useState(1310)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState<Inventory | null>(null)
  const [form, setForm] = useState({ quantity: '', min_quantity: '', warehouse_location: '', note: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [invRes, rateRes] = await Promise.all([
      fetch('/api/inventory'),
      fetch('/api/exchange-rate'),
    ])
    setItems(await invRes.json())
    const rateData = await rateRes.json()
    setRate(rateData.usd_to_iqd ?? 1310)
    setLoading(false)
  }

  function openEdit(item: Inventory) {
    setEditTarget(item)
    setForm({
      quantity: String(item.quantity),
      min_quantity: String(item.min_quantity),
      warehouse_location: item.warehouse_location ?? '',
      note: '',
    })
  }

  async function handleSave() {
    if (!editTarget) return
    setSaving(true)
    await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: editTarget.product_id,
        quantity: parseFloat(form.quantity) || 0,
        min_quantity: parseFloat(form.min_quantity) || 5,
        warehouse_location: form.warehouse_location || null,
        note: form.note || null,
      }),
    })
    await loadData()
    setEditTarget(null)
    setSaving(false)
  }

  async function exportExcel() {
    const { exportInventoryToExcel } = await import('@/lib/export/excel')
    exportInventoryToExcel(filtered.map(i => ({
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

  async function exportPdf() {
    const { exportInventoryToPdf } = await import('@/lib/export/pdf')
    await exportInventoryToPdf(
      filtered.map(i => ({
        name: i.products?.name ?? '',
        category: i.products?.categories?.name ?? '',
        unit: i.products?.unit ?? '',
        quantity: i.quantity,
        min_quantity: i.min_quantity,
        cost_price_usd: i.products?.cost_price_usd ?? 0,
        sale_price_usd: i.products?.sale_price_usd ?? 0,
      })),
      rate
    )
  }

  const filtered = items.filter(i =>
    i.products?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = items.filter(i => i.quantity <= i.min_quantity).length

  return (
    <DashboardLayout
      title="المخزون"
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet size={15} />Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPdf}><FileText size={15} />PDF</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle size={16} />
            تنبيه: يوجد <strong>{lowStockCount}</strong> منتج بمخزون منخفض
          </div>
        )}

        <div className="card">
          <div className="flex items-center gap-2 relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="بحث في المخزون..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card p-0">
          <Table>
            <Thead>
              <tr>
                <Th>المنتج</Th>
                <Th>الفئة</Th>
                <Th>الوحدة</Th>
                <Th>الكمية</Th>
                <Th>حد التنبيه</Th>
                <Th>سعر البيع $</Th>
                <Th>سعر البيع د.ع</Th>
                <Th>الحالة</Th>
                <Th>الموقع</Th>
                <Th>تعديل</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={10}>جاري التحميل...</Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={10}>لا توجد بيانات</Td></Tr>
              ) : filtered.map(item => {
                const isLow = item.quantity <= item.min_quantity
                return (
                  <Tr key={item.id}>
                    <Td className="font-medium">{item.products?.name}</Td>
                    <Td>{item.products?.categories?.name ?? '—'}</Td>
                    <Td>{item.products?.unit}</Td>
                    <Td className={`font-semibold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                      {item.quantity}
                    </Td>
                    <Td className="text-slate-500">{item.min_quantity}</Td>
                    <Td>{formatCurrency(item.products?.sale_price_usd ?? 0, 'USD')}</Td>
                    <Td className="text-slate-500">{formatCurrency((item.products?.sale_price_usd ?? 0) * rate, 'IQD')}</Td>
                    <Td>
                      <Badge variant={isLow ? 'danger' : 'success'}>
                        {isLow ? 'منخفض' : 'جيد'}
                      </Badge>
                    </Td>
                    <Td className="text-slate-500">{item.warehouse_location ?? '—'}</Td>
                    <Td>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                        <Pencil size={15} />
                      </button>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="تعديل المخزون" size="sm">
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">{editTarget?.products?.name}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="الكمية الحالية" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input label="حد التنبيه" type="number" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} />
          </div>
          <Input label="موقع المخزن" value={form.warehouse_location} onChange={e => setForm(f => ({ ...f, warehouse_location: e.target.value }))} placeholder="مثال: رف A1" />
          <Textarea label="ملاحظة" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="سبب التعديل..." />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
