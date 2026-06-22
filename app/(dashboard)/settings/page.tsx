'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

interface ExchangeRate {
  id: string
  usd_to_iqd: number
  rate_date: string
}

export default function SettingsPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [newRate, setNewRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [newCat, setNewCat] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [ratesRes, catsRes] = await Promise.all([
      fetch('/api/exchange-rate'),
      fetch('/api/categories'),
    ])
    const rateData = await ratesRes.json()
    setRates(Array.isArray(rateData) ? rateData : [rateData])
    const cats = await catsRes.json()
    setCategories(Array.isArray(cats) ? cats : [])
  }

  async function saveRate() {
    if (!newRate) return
    setSaving(true)
    await fetch('/api/exchange-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usd_to_iqd: parseFloat(newRate) }),
    })
    setNewRate('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await loadData()
    setSaving(false)
  }

  async function addCategory() {
    if (!newCat) return
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat }),
    })
    setNewCat('')
    await loadData()
  }

  const currentRate = rates[0]?.usd_to_iqd ?? 1310

  return (
    <DashboardLayout title="الإعدادات">
      <div className="max-w-2xl space-y-6">
        {/* Exchange Rate */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-800">سعر الصرف</h2>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="text-sm text-slate-500 mb-1">السعر الحالي</div>
            <div className="text-2xl font-bold text-blue-700">1 USD = {currentRate.toLocaleString()} IQD</div>
            <div className="text-xs text-slate-400 mt-1">{rates[0]?.rate_date}</div>
          </div>
          <div className="flex gap-3 items-end">
            <Input
              label="سعر الصرف الجديد (دينار لكل دولار)"
              type="number"
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              placeholder="مثال: 1310"
              className="flex-1"
            />
            <Button onClick={saveRate} loading={saving}>
              {saved ? <><CheckCircle size={16} />تم الحفظ</> : 'حفظ'}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            سيتم استخدام هذا السعر في جميع الفواتير والتحويلات الجديدة. الفواتير القديمة تحتفظ بسعرها.
          </p>
        </div>

        {/* Categories */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-800">فئات المنتجات</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <Badge key={c.id} variant="info">{c.name}</Badge>
            ))}
          </div>
          <div className="flex gap-3 items-end">
            <Input
              label="إضافة فئة جديدة"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              placeholder="مثال: أجهزة منزلية"
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && addCategory()}
            />
            <Button variant="secondary" onClick={addCategory}>إضافة</Button>
          </div>
        </div>

        {/* System Info */}
        <div className="card space-y-2 text-sm text-slate-600">
          <h2 className="text-base font-semibold text-slate-800 mb-3">معلومات النظام</h2>
          <div className="flex justify-between"><span>الإصدار:</span><strong>1.0.0</strong></div>
          <div className="flex justify-between"><span>قاعدة البيانات:</span><strong>Supabase PostgreSQL</strong></div>
          <div className="flex justify-between"><span>اللغة:</span><strong>العربية (RTL)</strong></div>
          <div className="flex justify-between"><span>العملات المدعومة:</span><strong>USD / IQD</strong></div>
        </div>
      </div>
    </DashboardLayout>
  )
}
