'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { Plus, Pencil, ShoppingBag, CreditCard, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Supplier, PurchaseOrder, Product } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import {
  fetchSuppliers, fetchProducts,
  createSupplier, updateSupplier, deleteSupplier,
  fetchPurchaseOrders, createPurchaseOrder, createSupplierPayment,
} from '@/lib/api'

type ModalType = 'add-supplier' | 'edit-supplier' | 'purchase-order' | 'payment' | 'history' | null

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [supForm, setSupForm] = useState({ name: '', phone: '', address: '', currency: 'USD' })
  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: string; unit_price: string }[]>([{ product_id: '', quantity: '', unit_price: '' }])
  const [orderNote, setOrderNote] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [orderCurrency, setOrderCurrency] = useState<'USD' | 'IQD'>('USD')
  const [amountPaid, setAmountPaid] = useState('')

  const [payForm, setPayForm] = useState({ amount: '', currency: 'USD', note: '', purchase_order_id: '', payment_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [sups, prods] = await Promise.all([fetchSuppliers(), fetchProducts()])
    setSuppliers(sups as Supplier[])
    setProducts(prods as Product[])
    setLoading(false)
  }

  async function loadOrders(supplierId: string) {
    const data = await fetchPurchaseOrders(supplierId)
    setOrders(data as PurchaseOrder[])
  }

  async function saveSuppiler() {
    if (!supForm.name) return
    setSaving(true)
    if (selected) {
      await updateSupplier(selected.id, supForm)
    } else {
      await createSupplier(supForm)
    }
    await loadData(); setModal(null); setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteSupplier(deleteTarget.id)
    await loadData()
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function saveOrder() {
    if (!selected) return
    setSaving(true)
    const validItems = orderItems.filter(i => i.product_id && i.quantity && i.unit_price)
    const total = validItems.reduce((s, i) => s + parseFloat(i.quantity) * parseFloat(i.unit_price), 0)
    const paid = parseFloat(amountPaid) || 0
    await createPurchaseOrder({
      supplier_id: selected.id,
      order_date: orderDate,
      total_amount: total,
      currency: orderCurrency,
      exchange_rate: IQD_RATE,
      amount_paid: paid,
      status: paid >= total ? 'مدفوع' : paid > 0 ? 'جزئي' : 'معلق',
      note: orderNote || null,
      items: validItems.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) })),
    })
    await loadData(); setModal(null); setSaving(false)
    setOrderItems([{ product_id: '', quantity: '', unit_price: '' }])
  }

  async function savePayment() {
    if (!selected || !payForm.amount) return
    setSaving(true)
    await createSupplierPayment({
      supplier_id: selected.id,
      purchase_order_id: payForm.purchase_order_id || null,
      amount: parseFloat(payForm.amount),
      currency: payForm.currency,
      exchange_rate: IQD_RATE,
      payment_date: payForm.payment_date,
      note: payForm.note || null,
    })
    await loadData(); setModal(null); setSaving(false)
  }

  function orderTotal() {
    return orderItems.reduce((s, i) => s + (parseFloat(i.quantity || '0') * parseFloat(i.unit_price || '0')), 0)
  }

  const statusBadge = (status: string) => {
    if (status === 'مدفوع') return <Badge variant="success">{status}</Badge>
    if (status === 'جزئي') return <Badge variant="warning">{status}</Badge>
    return <Badge variant="danger">{status}</Badge>
  }

  return (
    <DashboardLayout
      title="الموردون"
      headerActions={
        <Button onClick={() => { setSelected(null); setSupForm({ name: '', phone: '', address: '', currency: 'USD' }); setModal('add-supplier') }}>
          <Plus size={16} />إضافة مورد
        </Button>
      }
    >
      <div className="card p-0">
        <Table>
          <Thead>
            <tr>
              <Th>المورد</Th>
              <Th>الهاتف</Th>
              <Th>العملة</Th>
              <Th>المبلغ المستحق</Th>
              <Th>إجراءات</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td className="text-center py-8 text-slate-400" colSpan={5}>جاري التحميل...</Td></Tr>
            ) : suppliers.length === 0 ? (
              <Tr><Td className="text-center py-8 text-slate-400" colSpan={5}>لا يوجد موردون</Td></Tr>
            ) : suppliers.map(s => (
              <Tr key={s.id}>
                <Td>
                  <div className="font-medium text-slate-900">{s.name}</div>
                  {s.address && <div className="text-xs text-slate-400">{s.address}</div>}
                </Td>
                <Td>{s.phone ?? '—'}</Td>
                <Td><Badge variant="info">{s.currency}</Badge></Td>
                <Td className={s.balance_owed > 0 ? 'font-semibold text-red-600' : 'text-green-600'}>
                  {formatCurrency(s.balance_owed, s.currency as 'USD' | 'IQD')}
                </Td>
                <Td>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => { setSelected(s); setSupForm({ name: s.name, phone: s.phone ?? '', address: s.address ?? '', currency: s.currency }); setModal('edit-supplier') }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { setSelected(s); setOrderItems([{ product_id: '', quantity: '', unit_price: '' }]); setOrderNote(''); setAmountPaid(''); setModal('purchase-order') }}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="إضافة فاتورة شراء">
                      <ShoppingBag size={14} />
                    </button>
                    <button onClick={() => { setSelected(s); setPayForm({ amount: '', currency: s.currency, note: '', purchase_order_id: '', payment_date: new Date().toISOString().split('T')[0] }); setModal('payment') }}
                      className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="تسجيل دفعة">
                      <CreditCard size={14} />
                    </button>
                    <button onClick={() => { setSelected(s); loadOrders(s.id); setModal('history') }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs px-2" title="السجل">
                      سجل
                    </button>
                    <button onClick={() => setDeleteTarget(s)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {/* Add/Edit Supplier */}
      <Modal open={modal === 'add-supplier' || modal === 'edit-supplier'} onClose={() => setModal(null)} title={modal === 'edit-supplier' ? 'تعديل مورد' : 'إضافة مورد جديد'} size="sm">
        <div className="space-y-4">
          <Input label="اسم المورد *" value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المورد أو الشركة" />
          <Input label="رقم الهاتف" value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))} placeholder="+964..." />
          <Textarea label="العنوان" value={supForm.address} onChange={e => setSupForm(f => ({ ...f, address: e.target.value }))} placeholder="عنوان المورد" />
          <Select label="العملة" value={supForm.currency} onChange={e => setSupForm(f => ({ ...f, currency: e.target.value }))}
            options={[{ value: 'USD', label: 'دولار أمريكي' }, { value: 'IQD', label: 'دينار عراقي' }]} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={saveSuppiler} loading={saving}>{modal === 'edit-supplier' ? 'حفظ' : 'إضافة'}</Button>
          </div>
        </div>
      </Modal>

      {/* Purchase Order */}
      <Modal open={modal === 'purchase-order'} onClose={() => setModal(null)} title={`فاتورة شراء — ${selected?.name}`} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="تاريخ الفاتورة" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            <Select label="العملة" value={orderCurrency} onChange={e => setOrderCurrency(e.target.value as 'USD' | 'IQD')}
              options={[{ value: 'USD', label: 'دولار' }, { value: 'IQD', label: 'دينار' }]} />
            <Input label="المبلغ المدفوع" type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0" />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">المنتج</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">الكمية</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">سعر الوحدة</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">المجموع</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <select className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.product_id} onChange={e => setOrderItems(items => items.map((it, i) => i === idx ? { ...it, product_id: e.target.value } : it))}>
                        <option value="">اختر منتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" className="w-20 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.quantity} onChange={e => setOrderItems(items => items.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} placeholder="0" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" className="w-24 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.unit_price} onChange={e => setOrderItems(items => items.map((it, i) => i === idx ? { ...it, unit_price: e.target.value } : it))} placeholder="0.00" />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {(parseFloat(item.quantity || '0') * parseFloat(item.unit_price || '0')).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {orderItems.length > 1 && (
                        <button onClick={() => setOrderItems(items => items.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-lg">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setOrderItems(items => [...items, { product_id: '', quantity: '', unit_price: '' }])}>
              <Plus size={14} />إضافة صنف
            </Button>
            <div className="text-lg font-bold text-slate-900">
              المجموع: {orderTotal().toFixed(2)} {orderCurrency}
              {orderCurrency === 'USD' && <span className="text-sm text-slate-500 mr-2">= {(orderTotal() * IQD_RATE).toLocaleString('en-US', { maximumFractionDigits: 0 })} د.ع</span>}
            </div>
          </div>

          {parseFloat(amountPaid) > 0 && (
            <div className="text-sm bg-slate-50 p-3 rounded-lg">
              <span className="text-slate-600">المتبقي: </span>
              <strong className="text-red-600">{(orderTotal() - parseFloat(amountPaid)).toFixed(2)} {orderCurrency}</strong>
            </div>
          )}

          <Textarea label="ملاحظة" value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="ملاحظات اختيارية" />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={saveOrder} loading={saving}>حفظ الفاتورة وتحديث المخزون</Button>
          </div>
        </div>
      </Modal>

      {/* Payment */}
      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title={`تسجيل دفعة — ${selected?.name}`} size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
            المبلغ المستحق: <strong>{formatCurrency(selected?.balance_owed ?? 0, selected?.currency as 'USD' | 'IQD' ?? 'USD')}</strong>
          </div>
          <Input label="المبلغ المدفوع *" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          <Select label="العملة" value={payForm.currency} onChange={e => setPayForm(f => ({ ...f, currency: e.target.value }))}
            options={[{ value: 'USD', label: 'دولار' }, { value: 'IQD', label: 'دينار' }]} />
          <Input label="التاريخ" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
          <Textarea label="ملاحظة" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="ملاحظة اختيارية" />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={savePayment} loading={saving}>تسجيل الدفعة</Button>
          </div>
        </div>
      </Modal>

      {/* History */}
      <Modal open={modal === 'history'} onClose={() => setModal(null)} title={`سجل الفواتير — ${selected?.name}`} size="xl">
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-center text-slate-400 py-8">لا توجد فواتير</p>
          ) : orders.map(o => (
            <div key={o.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium text-slate-900">{o.order_date}</span>
                  <span className="text-slate-500 mr-2 text-sm">#{o.id.slice(0, 8).toUpperCase()}</span>
                </div>
                {statusBadge(o.status)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
                <div>المجموع: <strong>{o.total_amount.toFixed(2)} {o.currency}</strong></div>
                <div>المدفوع: <strong className="text-green-600">{o.amount_paid.toFixed(2)} {o.currency}</strong></div>
                <div>المتبقي: <strong className="text-red-600">{(o.total_amount - o.amount_paid).toFixed(2)} {o.currency}</strong></div>
              </div>
              {o.note && <p className="text-xs text-slate-400 mt-2">{o.note}</p>}
            </div>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف مورد"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟`}
        loading={deleting}
      />
    </DashboardLayout>
  )
}
