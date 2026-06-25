'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { Plus, Pencil, CreditCard, History, Trash2, MessageCircle } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Customer, Sale } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import {
  fetchCustomers, fetchSales,
  createCustomer, updateCustomer, deleteCustomer, createCustomerPayment,
} from '@/lib/api'

type ModalType = 'add' | 'edit' | 'payment' | 'history' | 'whatsapp' | null

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [payForm, setPayForm] = useState({ amount: '', currency: 'IQD', note: '', sale_id: '', payment_date: new Date().toISOString().split('T')[0] })
  const [waLang, setWaLang] = useState<'ar' | 'ku' | 'en'>('ar')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const custData = await fetchCustomers()
    setCustomers(custData as Customer[])
    setLoading(false)
  }

  async function loadSales(customerId: string) {
    const all = await fetchSales() as Sale[]
    setSales(all.filter(s => s.customer_id === customerId))
  }

  async function saveCustomer() {
    if (!form.name) return
    setSaving(true)
    if (selected) {
      await updateCustomer(selected.id, form)
    } else {
      await createCustomer(form)
    }
    await loadData(); setModal(null); setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteCustomer(deleteTarget.id)
    await loadData()
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function savePayment() {
    if (!selected || !payForm.amount) return
    setSaving(true)
    await createCustomerPayment({
      customer_id: selected.id,
      sale_id: payForm.sale_id || null,
      amount: parseFloat(payForm.amount),
      currency: payForm.currency,
      exchange_rate: payForm.currency === 'IQD' ? IQD_RATE : 1,
      payment_date: payForm.payment_date,
      note: payForm.note || null,
    })
    await loadData(); setModal(null); setSaving(false)
  }

  function getWaMessage(c: Customer, lang: 'ar' | 'ku' | 'en') {
    const amtIQD = formatCurrency(c.balance_owed * IQD_RATE, 'IQD')
    const amtUSD = formatCurrency(c.balance_owed, 'USD')
    if (lang === 'ar')
      return `السلام عليكم ${c.name}،\nنذكركم بمبلغ الدين المتبقي: ${amtIQD}.\nيرجى التواصل معنا لترتيب الدفع.\nشكراً`
    if (lang === 'ku')
      return `سه‌ره‌تای باش ${c.name}،\nبیرت بکه‌وه‌ له‌ قه‌رزی ماوه‌ته‌وه‌ی: ${amtIQD}.\nتکایه‌ پێوه‌ند بکه‌.\nسپاس`
    return `Hello ${c.name},\nThis is a reminder for your outstanding balance: ${amtUSD}.\nPlease contact us to arrange payment.\nThank you.`
  }

  function normalizePhone(raw: string | null | undefined): string {
    if (!raw) return ''
    const digits = raw.replace(/[^0-9]/g, '')
    // Iraqi local format 07xx → 9647xx
    if (digits.startsWith('07') && digits.length === 11) return '964' + digits.slice(1)
    return digits
  }

  function openWhatsApp(c: Customer) {
    const msg = getWaMessage(c, waLang)
    const phone = normalizePhone(c.phone)
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const statusBadge = (status: string) => {
    if (status === 'مدفوع') return <Badge variant="success">{status}</Badge>
    if (status === 'جزئي') return <Badge variant="warning">{status}</Badge>
    return <Badge variant="danger">{status}</Badge>
  }

  return (
    <DashboardLayout
      title="الزبائن"
      headerActions={
        <Button onClick={() => { setSelected(null); setForm({ name: '', phone: '', address: '' }); setModal('add') }}>
          <Plus size={16} />إضافة زبون
        </Button>
      }
    >
      <div className="card p-0">
        <Table>
          <Thead>
            <tr>
              <Th>الزبون</Th>
              <Th>الهاتف</Th>
              <Th>رصيد الدين</Th>
              <Th>إجراءات</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td className="text-center py-8 text-slate-400" colSpan={4}>جاري التحميل...</Td></Tr>
            ) : customers.length === 0 ? (
              <Tr><Td className="text-center py-8 text-slate-400" colSpan={4}>لا يوجد زبائن</Td></Tr>
            ) : customers.map(c => (
              <Tr key={c.id}>
                <Td>
                  <div className="font-medium text-slate-900">{c.name}</div>
                  {c.address && <div className="text-xs text-slate-400">{c.address}</div>}
                </Td>
                <Td>{c.phone ?? '—'}</Td>
                <Td>
                  <div className={c.balance_owed > 0 ? 'font-semibold text-red-600' : 'text-green-600'}>
                    {formatCurrency(c.balance_owed * IQD_RATE, 'IQD')}
                  </div>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(c); setForm({ name: c.name, phone: c.phone ?? '', address: c.address ?? '' }); setModal('edit') }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { setSelected(c); setPayForm({ amount: '', currency: 'IQD', note: '', sale_id: '', payment_date: new Date().toISOString().split('T')[0] }); setSales([]); loadSales(c.id); setModal('payment') }}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="تسجيل دفعة">
                      <CreditCard size={14} />
                    </button>
                    {c.balance_owed > 0 && (
                      <button onClick={() => { setSelected(c); setModal('whatsapp') }}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="تذكير واتساب">
                        <MessageCircle size={14} />
                      </button>
                    )}
                    <button onClick={() => { setSelected(c); loadSales(c.id); setModal('history') }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="السجل">
                      <History size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(c)}
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

      {/* Add/Edit */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'تعديل زبون' : 'إضافة زبون'} size="sm">
        <div className="space-y-4">
          <Input label="اسم الزبون *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="الاسم الكامل" />
          <Input label="رقم الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+964..." />
          <Textarea label="العنوان" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={saveCustomer} loading={saving}>{modal === 'edit' ? 'حفظ' : 'إضافة'}</Button>
          </div>
        </div>
      </Modal>

      {/* WhatsApp Reminder */}
      <Modal open={modal === 'whatsapp'} onClose={() => setModal(null)} title={`تذكير واتساب — ${selected?.name}`} size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            رصيد الدين: <strong>{formatCurrency((selected?.balance_owed ?? 0) * IQD_RATE, 'IQD')}</strong>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">لغة الرسالة</label>
            <div className="flex gap-2">
              {(['ar', 'ku', 'en'] as const).map(lang => (
                <button key={lang}
                  onClick={() => setWaLang(lang)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${waLang === lang ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 text-slate-600 hover:border-green-400'}`}>
                  {lang === 'ar' ? 'عربي' : lang === 'ku' ? 'كوردي' : 'English'}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed border border-slate-200">
            {selected && getWaMessage(selected, waLang)}
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">إلغاء</button>
            <button
              onClick={() => { selected && openWhatsApp(selected); setModal(null) }}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 flex items-center gap-2"
            >
              <MessageCircle size={15} />
              فتح واتساب
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment */}
      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title={`تسجيل دفعة — ${selected?.name}`} size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
            رصيد الدين: <strong>{formatCurrency((selected?.balance_owed ?? 0) * IQD_RATE, 'IQD')}</strong>
          </div>
          {sales.filter(s => s.status !== 'مدفوع').length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تطبيق على فاتورة (اختياري)</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={payForm.sale_id}
                onChange={e => setPayForm(f => ({ ...f, sale_id: e.target.value }))}
              >
                <option value="">— دفعة عامة على الحساب —</option>
                {sales.filter(s => s.status !== 'مدفوع').map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sale_date} — {formatCurrency(s.total_amount - s.amount_paid, s.currency as 'USD' | 'IQD')} متبقي
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input label="المبلغ المدفوع *" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">العملة</label>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={payForm.currency} onChange={e => setPayForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="USD">دولار</option>
                <option value="IQD">دينار</option>
              </select>
            </div>
            <Input label="التاريخ" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
          </div>
          <Textarea label="ملاحظة" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={savePayment} loading={saving}>تسجيل الدفعة</Button>
          </div>
        </div>
      </Modal>

      {/* History */}
      <Modal open={modal === 'history'} onClose={() => setModal(null)} title={`سجل مبيعات — ${selected?.name}`} size="lg">
        <div className="space-y-3">
          {sales.length === 0 ? (
            <p className="text-center text-slate-400 py-8">لا توجد مبيعات لهذا الزبون</p>
          ) : sales.map(s => (
            <div key={s.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium">{s.sale_date}</span>
                  <span className="text-slate-500 text-xs mr-2">#{s.id.slice(0, 8).toUpperCase()}</span>
                  <Badge variant="info" className="mr-2">{s.payment_type}</Badge>
                </div>
                {statusBadge(s.status)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
                <div>المجموع: <strong>{formatCurrency(s.total_amount, s.currency as 'USD' | 'IQD')}</strong></div>
                <div>المدفوع: <strong className="text-green-600">{formatCurrency(s.amount_paid, s.currency as 'USD' | 'IQD')}</strong></div>
                <div>المتبقي: <strong className="text-red-600">{formatCurrency(s.total_amount - s.amount_paid, s.currency as 'USD' | 'IQD')}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف زبون"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟`}
        loading={deleting}
      />
    </DashboardLayout>
  )
}
