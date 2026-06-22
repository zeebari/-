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
import { Plus, FileText, Search } from 'lucide-react'
import type { Sale, Customer, Product, Installment } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import { fetchSales, fetchCustomers, fetchProducts, createSale } from '@/lib/api'

type Currency = 'USD' | 'IQD'
type PaymentType = 'نقد' | 'دين' | 'أقساط'

interface SaleFormItem {
  product_id: string
  quantity: string
  unit_price: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  // Form state
  const [currency, setCurrency] = useState<Currency>('USD')
  const [paymentType, setPaymentType] = useState<PaymentType>('نقد')
  const [customerId, setCustomerId] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [items, setItems] = useState<SaleFormItem[]>([{ product_id: '', quantity: '', unit_price: '' }])

  // Installments
  const [installmentCount, setInstallmentCount] = useState('3')
  const [installmentStart, setInstallmentStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  })
  const [downPayment, setDownPayment] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [salesData, custsData, prodsData] = await Promise.all([
      fetchSales(), fetchCustomers(), fetchProducts(),
    ])
    setSales(salesData as Sale[])
    setCustomers(custsData as Customer[])
    setProducts(prodsData as Product[])
    setLoading(false)
  }

  function openNew() {
    setCurrency('USD'); setPaymentType('نقد'); setCustomerId(''); setSaleDate(new Date().toISOString().split('T')[0])
    setNote(''); setAmountPaid(''); setDownPayment(''); setInstallmentCount('3')
    setItems([{ product_id: '', quantity: '', unit_price: '' }])
    setModalOpen(true)
  }

  function updateItem(idx: number, field: keyof SaleFormItem, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value)
      if (prod) {
        const prodCur = (prod.price_currency ?? 'USD') as 'USD' | 'IQD'
        let price: number
        if (prodCur === currency) {
          price = prod.sale_price_usd
        } else if (prodCur === 'USD' && currency === 'IQD') {
          price = Math.round(prod.sale_price_usd * IQD_RATE)
        } else {
          price = parseFloat((prod.sale_price_usd / IQD_RATE).toFixed(2))
        }
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, product_id: value, unit_price: String(price) } : it))
      }
    }
  }

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity || '0') * parseFloat(i.unit_price || '0')), 0)

  function generateInstallments(): { due_date: string; amount: number }[] {
    const n = parseInt(installmentCount) || 1
    const dp = parseFloat(downPayment || '0')
    const remaining = subtotal - dp
    const instAmount = remaining / n
    const result = []
    for (let i = 0; i < n; i++) {
      const d = new Date(installmentStart)
      d.setMonth(d.getMonth() + i)
      result.push({ due_date: d.toISOString().split('T')[0], amount: Math.round(instAmount * 100) / 100 })
    }
    return result
  }

  async function handleSave() {
    const validItems = items.filter(i => i.product_id && i.quantity && i.unit_price)
    if (validItems.length === 0) return
    setSaving(true)
    setSaveError('')

    let paidAmount = parseFloat(amountPaid || '0')
    let installmentsData: { due_date: string; amount: number }[] = []

    if (paymentType === 'نقد') { paidAmount = subtotal }
    if (paymentType === 'دين') { paidAmount = 0 }
    if (paymentType === 'أقساط') {
      paidAmount = parseFloat(downPayment || '0')
      installmentsData = generateInstallments()
    }

    try {
      await createSale({
        customer_id: customerId || null,
        sale_date: saleDate,
        total_amount: subtotal,
        currency,
        exchange_rate: IQD_RATE,
        payment_type: paymentType,
        amount_paid: paidAmount,
        note: note || null,
        items: validItems.map(i => ({ product_id: i.product_id, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) })),
        installments: installmentsData,
      })
      await loadData()
      setModalOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'حدث خطأ')
    }
    setSaving(false)
  }

  async function printSale(sale: Sale) {
    const { exportSaleToPdf } = await import('@/lib/export/pdf')
    await exportSaleToPdf({
      id: sale.id,
      sale_date: sale.sale_date,
      customer_name: sale.customers?.name ?? null,
      payment_type: sale.payment_type,
      currency: sale.currency,
      exchange_rate: sale.exchange_rate,
      total_amount: sale.total_amount,
      amount_paid: sale.amount_paid,
      status: sale.status,
      note: sale.note,
      items: (sale.sale_items ?? []).map(si => ({
        product_name: si.products?.name ?? '',
        quantity: si.quantity,
        unit_price: si.unit_price,
        total: si.total,
      })),
    })
  }

  const statusBadge = (status: string) => {
    if (status === 'مدفوع') return <Badge variant="success">{status}</Badge>
    if (status === 'جزئي') return <Badge variant="warning">{status}</Badge>
    return <Badge variant="danger">{status}</Badge>
  }

  const filtered = sales.filter(s =>
    (s.customers?.name ?? 'نقدي').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      title="المبيعات"
      headerActions={<Button onClick={openNew}><Plus size={16} />فاتورة بيع جديدة</Button>}
    >
      <div className="space-y-4">
        <div className="card">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="بحث بالزبون..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <Th>طباعة</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={9}>جاري التحميل...</Td></Tr>
              ) : filtered.length === 0 ? (
                <Tr><Td className="text-center py-8 text-slate-400" colSpan={9}>لا توجد مبيعات</Td></Tr>
              ) : filtered.map(s => (
                <Tr key={s.id} className="cursor-pointer" onClick={() => setDetailSale(s)}>
                  <Td className="font-mono text-xs text-slate-500">#{s.id.slice(0, 8).toUpperCase()}</Td>
                  <Td>{s.sale_date}</Td>
                  <Td>{s.customers?.name ?? <span className="text-slate-400">نقدي</span>}</Td>
                  <Td><Badge variant="info">{s.payment_type}</Badge></Td>
                  <Td className="font-medium">{formatCurrency(s.total_amount, s.currency as Currency)}</Td>
                  <Td className="text-green-600">{formatCurrency(s.amount_paid, s.currency as Currency)}</Td>
                  <Td className={s.total_amount - s.amount_paid > 0 ? 'text-red-600' : 'text-slate-400'}>
                    {formatCurrency(s.total_amount - s.amount_paid, s.currency as Currency)}
                  </Td>
                  <Td>{statusBadge(s.status)}</Td>
                  <Td>
                    <button onClick={e => { e.stopPropagation(); printSale(s) }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                      <FileText size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {/* New Sale Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="فاتورة بيع جديدة" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">الزبون</label>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">بيع نقدي</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="التاريخ" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            <Select label="العملة" value={currency} onChange={e => setCurrency(e.target.value as Currency)}
              options={[{ value: 'USD', label: 'دولار ($)' }, { value: 'IQD', label: 'دينار (د.ع)' }]} />
            <Select label="نوع الدفع" value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}
              options={[{ value: 'نقد', label: 'نقد' }, { value: 'دين', label: 'دين (آجل)' }, { value: 'أقساط', label: 'أقساط' }]} />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
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
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <select className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                        <option value="">اختر منتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" className="w-20 border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="0" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} placeholder="0.00" />
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {(parseFloat(item.quantity || '0') * parseFloat(item.unit_price || '0')).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {items.length > 1 && (
                        <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, { product_id: '', quantity: '', unit_price: '' }])}>
            <Plus size={14} />إضافة صنف
          </Button>

          <div className="bg-blue-50 rounded-lg p-4 text-right">
            <div className="text-2xl font-bold text-blue-700">المجموع: {subtotal.toFixed(2)} {currency}</div>
            {currency === 'USD' && <div className="text-sm text-blue-500 mt-1">= {(subtotal * IQD_RATE).toLocaleString()} د.ع</div>}
          </div>

          {paymentType === 'نقد' && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm">
              سيتم تسجيل الدفع الكامل: {subtotal.toFixed(2)} {currency}
            </div>
          )}

          {paymentType === 'دين' && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              سيُضاف المبلغ كاملاً لرصيد دين الزبون: {subtotal.toFixed(2)} {currency}
            </div>
          )}

          {paymentType === 'أقساط' && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-slate-800">إعداد الأقساط</h3>
              <div className="grid grid-cols-3 gap-3">
                <Input label="الدفعة الأولى" type="number" step="0.01" value={downPayment} onChange={e => setDownPayment(e.target.value)} placeholder="0" />
                <Input label="عدد الأقساط" type="number" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} placeholder="3" />
                <Input label="تاريخ أول قسط" type="date" value={installmentStart} onChange={e => setInstallmentStart(e.target.value)} />
              </div>
              {subtotal > 0 && (
                <div className="text-sm text-slate-600 space-y-1">
                  <div>المبلغ المتبقي بعد الدفعة الأولى: <strong>{(subtotal - parseFloat(downPayment || '0')).toFixed(2)} {currency}</strong></div>
                  <div>قيمة كل قسط: <strong>{((subtotal - parseFloat(downPayment || '0')) / (parseInt(installmentCount) || 1)).toFixed(2)} {currency}</strong></div>
                  <div className="mt-2 font-medium text-slate-700">مواعيد الأقساط:</div>
                  {generateInstallments().map((inst, i) => (
                    <div key={i} className="text-xs text-slate-500">
                      قسط {i + 1}: {inst.due_date} — {inst.amount.toFixed(2)} {currency}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Textarea label="ملاحظة" value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات اختيارية" />

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{saveError}</div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ الفاتورة</Button>
          </div>
        </div>
      </Modal>

      {/* Sale Detail Modal */}
      {detailSale && (
        <Modal open={!!detailSale} onClose={() => setDetailSale(null)} title={`فاتورة #${detailSale.id.slice(0, 8).toUpperCase()}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">الزبون:</span> <strong>{detailSale.customers?.name ?? 'بيع نقدي'}</strong></div>
              <div><span className="text-slate-500">التاريخ:</span> <strong>{detailSale.sale_date}</strong></div>
              <div><span className="text-slate-500">نوع الدفع:</span> <Badge variant="info">{detailSale.payment_type}</Badge></div>
              <div><span className="text-slate-500">الحالة:</span> {statusBadge(detailSale.status)}</div>
              <div><span className="text-slate-500">العملة:</span> <strong>{detailSale.currency}</strong></div>
            </div>

            <Table>
              <Thead>
                <tr>
                  <Th>المنتج</Th>
                  <Th>الكمية</Th>
                  <Th>سعر الوحدة</Th>
                  <Th>المجموع</Th>
                </tr>
              </Thead>
              <Tbody>
                {(detailSale.sale_items ?? []).map(si => (
                  <Tr key={si.id}>
                    <Td>{si.products?.name}</Td>
                    <Td>{si.quantity}</Td>
                    <Td>{si.unit_price.toFixed(2)}</Td>
                    <Td className="font-semibold">{si.total.toFixed(2)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between"><span>المجموع:</span><strong>{detailSale.total_amount.toFixed(2)} {detailSale.currency}</strong></div>
              <div className="flex justify-between text-green-600"><span>المدفوع:</span><strong>{detailSale.amount_paid.toFixed(2)} {detailSale.currency}</strong></div>
              <div className="flex justify-between text-red-600"><span>المتبقي:</span><strong>{(detailSale.total_amount - detailSale.amount_paid).toFixed(2)} {detailSale.currency}</strong></div>
              {detailSale.currency === 'USD' && (
                <div className="flex justify-between text-slate-500 text-xs pt-1 border-t border-slate-200">
                  <span>المجموع بالدينار:</span>
                  <strong>{(detailSale.total_amount * IQD_RATE).toLocaleString()} د.ع</strong>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => printSale(detailSale)}><FileText size={15} />طباعة PDF</Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
