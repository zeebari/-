'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import type { Product, Category } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import {
  fetchProducts, fetchCategories,
  createProduct, updateProduct, deleteProduct,
} from '@/lib/api'

const UNITS = ['قطعة', 'كيلو', 'لتر', 'علبة', 'كارتون', 'متر', 'زوج']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<'USD' | 'IQD'>('USD')
  const [filterCat, setFilterCat] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: '', category_id: '', unit: 'قطعة',
    cost_price_usd: '', sale_price_usd: '', barcode: '', description: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()])
    setProducts(prods as Product[])
    setCategories(cats as Category[])
    setLoading(false)
  }

  function openAdd() {
    setEditTarget(null)
    setPriceCurrency('USD')
    setForm({ name: '', category_id: '', unit: 'قطعة', cost_price_usd: '', sale_price_usd: '', barcode: '', description: '' })
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditTarget(p)
    setPriceCurrency(p.price_currency as 'USD' | 'IQD' ?? 'USD')
    setForm({
      name: p.name,
      category_id: p.category_id ?? '',
      unit: p.unit,
      cost_price_usd: String(p.cost_price_usd),
      sale_price_usd: String(p.sale_price_usd),
      barcode: p.barcode ?? '',
      description: p.description ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.sale_price_usd) return
    setSaving(true)
    const payload = {
      name: form.name,
      category_id: form.category_id || null,
      unit: form.unit,
      cost_price_usd: parseFloat(form.cost_price_usd) || 0,
      sale_price_usd: parseFloat(form.sale_price_usd) || 0,
      price_currency: priceCurrency,
      barcode: form.barcode || null,
      description: form.description || null,
    }
    if (editTarget) {
      await updateProduct(editTarget.id, payload)
    } else {
      await createProduct(payload)
    }
    await loadData()
    setModalOpen(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteProduct(deleteTarget.id)
    await loadData()
    setDeleteTarget(null)
    setDeleting(false)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (!filterCat || p.category_id === filterCat)
  )

  return (
    <DashboardLayout
      title="المنتجات"
      headerActions={<Button onClick={openAdd}><Plus size={16} />إضافة منتج</Button>}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="card flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="بحث عن منتج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">جميع الفئات</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card p-0">
          <Table>
            <Thead>
              <tr>
                <Th>المنتج</Th>
                <Th>الفئة</Th>
                <Th>الوحدة</Th>
                <Th>سعر التكلفة</Th>
                <Th>سعر البيع</Th>
                <Th>المعادل</Th>
                <Th>إجراءات</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={7}>جاري التحميل...</Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={7}>لا توجد منتجات</Td></Tr>
              ) : filtered.map(p => {
                const cur = (p.price_currency ?? 'USD') as 'USD' | 'IQD'
                const equiv = cur === 'USD'
                  ? formatCurrency(p.sale_price_usd * IQD_RATE, 'IQD')
                  : formatCurrency(p.sale_price_usd / IQD_RATE, 'USD')
                return (
                <Tr key={p.id}>
                  <Td>
                    <div className="font-medium text-slate-900">{p.name}</div>
                    {p.barcode && <div className="text-xs text-slate-400">{p.barcode}</div>}
                  </Td>
                  <Td>
                    {p.categories ? (
                      <Badge variant="info">{p.categories.name}</Badge>
                    ) : <span className="text-slate-400">—</span>}
                  </Td>
                  <Td>{p.unit}</Td>
                  <Td>{formatCurrency(p.cost_price_usd, cur)}</Td>
                  <Td className="font-medium text-green-700">{formatCurrency(p.sale_price_usd, cur)}</Td>
                  <Td className="text-slate-500 text-xs">{equiv}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'تعديل منتج' : 'إضافة منتج جديد'}>
        <div className="space-y-4">
          <Input label="اسم المنتج *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ادخل اسم المنتج" />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="الفئة"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="اختر فئة"
            />
            <Select
              label="الوحدة"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              options={UNITS.map(u => ({ value: u, label: u }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">عملة الأسعار</label>
            <div className="flex gap-2 mb-3">
              {(['USD', 'IQD'] as const).map(cur => (
                <button key={cur} type="button"
                  onClick={() => setPriceCurrency(cur)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${priceCurrency === cur ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                  {cur === 'USD' ? 'دولار ($)' : 'دينار (د.ع)'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`سعر التكلفة (${priceCurrency === 'USD' ? '$' : 'د.ع'})`}
              type="number" step={priceCurrency === 'USD' ? '0.01' : '1'}
              value={form.cost_price_usd}
              onChange={e => setForm(f => ({ ...f, cost_price_usd: e.target.value }))}
              placeholder="0"
            />
            <Input
              label={`سعر البيع (${priceCurrency === 'USD' ? '$' : 'د.ع'}) *`}
              type="number" step={priceCurrency === 'USD' ? '0.01' : '1'}
              value={form.sale_price_usd}
              onChange={e => setForm(f => ({ ...f, sale_price_usd: e.target.value }))}
              placeholder="0"
            />
          </div>
          {form.sale_price_usd && (
            <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
              {priceCurrency === 'USD'
                ? <>المعادل: <strong>{(parseFloat(form.sale_price_usd || '0') * IQD_RATE).toLocaleString()} د.ع</strong></>
                : <>المعادل: <strong>${(parseFloat(form.sale_price_usd || '0') / IQD_RATE).toFixed(2)}</strong></>
              }
            </div>
          )}
          <Input label="الباركود" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="اختياري" />
          <Textarea label="الوصف" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف اختياري" />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>{editTarget ? 'حفظ التغييرات' : 'إضافة المنتج'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف منتج"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذه العملية.`}
        loading={deleting}
      />
    </DashboardLayout>
  )
}
