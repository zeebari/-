'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { Plus, Trash2, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import { fetchExpenses, createExpense, deleteExpense, type Expense } from '@/lib/api'

const CATEGORIES = ['إيجار', 'رواتب', 'كهرباء وماء', 'نقل وتوصيل', 'صيانة', 'تسويق', 'مستلزمات مكتبية', 'أخرى']

const emptyForm = {
  category: CATEGORIES[0],
  description: '',
  amount: '',
  currency: 'IQD' as 'USD' | 'IQD',
  expense_date: new Date().toISOString().split('T')[0],
  note: '',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    const data = await fetchExpenses(from, to)
    setExpenses(data)
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.description || !form.amount) return
    setSaving(true)
    await createExpense({
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      currency: form.currency,
      exchange_rate: form.currency === 'IQD' ? IQD_RATE : 1,
      expense_date: form.expense_date,
      note: form.note || undefined,
    })
    setForm(emptyForm)
    setShowModal(false)
    await loadExpenses()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const toIQD = (e: Expense) =>
    e.currency === 'IQD' ? e.amount : e.amount * e.exchange_rate

  const toUSD = (e: Expense) =>
    e.currency === 'USD' ? e.amount : e.amount / e.exchange_rate

  const totalIQD = expenses.reduce((s, e) => s + toIQD(e), 0)
  const totalUSD = expenses.reduce((s, e) => s + toUSD(e), 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    totalIQD: expenses.filter(e => e.category === cat).reduce((s, e) => s + toIQD(e), 0),
    totalUSD: expenses.filter(e => e.category === cat).reduce((s, e) => s + toUSD(e), 0),
  })).filter(x => x.totalIQD > 0)

  return (
    <DashboardLayout
      title="المصاريف"
      headerActions={
        <Button onClick={() => setShowModal(true)}><Plus size={16} />مصروف جديد</Button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="card flex flex-wrap items-end gap-3">
          <Input label="من تاريخ" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          <Input label="إلى تاريخ" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
          <Button onClick={loadExpenses}>عرض</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card text-center col-span-1">
            <BarChart3 size={24} className="text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalIQD, 'IQD')}</div>
            <div className="text-sm text-slate-500">إجمالي المصاريف</div>
            <div className="text-xs text-slate-400 mt-1">{formatCurrency(totalUSD, 'USD')}</div>
          </div>
          <div className="card col-span-2">
            <div className="text-sm font-medium text-slate-700 mb-3">توزيع حسب الفئة</div>
            <div className="space-y-2">
              {byCategory.length === 0 && <p className="text-slate-400 text-sm">لا توجد بيانات</p>}
              {byCategory.map(({ cat, totalIQD: catIQD }) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="text-sm text-slate-600 w-32 shrink-0">{cat}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-400 h-full rounded-full"
                      style={{ width: totalIQD > 0 ? `${(catIQD / totalIQD) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="text-sm font-medium text-slate-700 w-28 text-left">{formatCurrency(catIQD, 'IQD')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0">
          <Table>
            <Thead>
              <tr>
                <Th>التاريخ</Th>
                <Th>الفئة</Th>
                <Th>الوصف</Th>
                <Th>المبلغ</Th>
                <Th>بالدينار</Th>
                <Th>ملاحظة</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={7}>جاري التحميل...</Td></Tr>
              ) : expenses.length === 0 ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={7}>لا توجد مصاريف</Td></Tr>
              ) : expenses.map(e => (
                <Tr key={e.id}>
                  <Td>{e.expense_date}</Td>
                  <Td><Badge variant="warning">{e.category}</Badge></Td>
                  <Td className="font-medium">{e.description}</Td>
                  <Td>{formatCurrency(e.amount, e.currency)}</Td>
                  <Td className="font-medium text-slate-800">{formatCurrency(toIQD(e), 'IQD')}</Td>
                  <Td className="text-slate-400 text-xs">{e.note ?? '—'}</Td>
                  <Td>
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة مصروف" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الفئة</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input
            label="الوصف"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="مثال: إيجار المخزن لشهر يونيو"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="المبلغ"
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'USD' | 'IQD' }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">دولار USD</option>
                <option value="IQD">دينار IQD</option>
              </select>
            </div>
          </div>
          <Input
            label="التاريخ"
            type="date"
            value={form.expense_date}
            onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
          />
          <Input
            label="ملاحظة (اختياري)"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="تفاصيل إضافية..."
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleCreate} loading={saving}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
