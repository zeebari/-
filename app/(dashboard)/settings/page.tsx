'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Wallet } from 'lucide-react'
import { IQD_RATE } from '@/lib/config'
import { fetchCategories, createCategory } from '@/lib/api'

export default function SettingsPage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [newCat, setNewCat] = useState('')
  const [capital, setCapital] = useState('')
  const [capitalCurrency, setCapitalCurrency] = useState<'USD' | 'IQD'>('USD')
  const [capitalSaved, setCapitalSaved] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('initial_capital_usd')
    if (saved) setCapital(saved)
    fetchCategories().then(cats => setCategories(cats as { id: string; name: string }[]))
  }, [])

  function saveCapital() {
    const usd = capitalCurrency === 'IQD'
      ? (parseFloat(capital) || 0) / IQD_RATE
      : parseFloat(capital) || 0
    localStorage.setItem('initial_capital_usd', String(usd))
    setCapitalSaved(true)
    setTimeout(() => setCapitalSaved(false), 2000)
  }

  const capitalPreview = capital
    ? capitalCurrency === 'USD'
      ? `= ${((parseFloat(capital) || 0) * IQD_RATE).toLocaleString('en-US', { maximumFractionDigits: 0 })} د.ع`
      : `= $${((parseFloat(capital) || 0) / IQD_RATE).toFixed(2)}`
    : null

  async function addCategory() {
    if (!newCat) return
    await createCategory(newCat)
    setNewCat('')
    fetchCategories().then(cats => setCategories(cats as { id: string; name: string }[]))
  }

  return (
    <DashboardLayout title="الإعدادات">
      <div className="max-w-2xl space-y-6">

        {/* Capital */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-800">رأس المال الأولي</h2>
          </div>
          <p className="text-sm text-slate-500">أدخل رأس المال الذي استثمرته في المشروع لحساب الصافي والمبلغ المداور في لوحة التحكم</p>
          <div className="flex gap-2 mb-1">
            {(['USD', 'IQD'] as const).map(cur => (
              <button key={cur} type="button"
                onClick={() => setCapitalCurrency(cur)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${capitalCurrency === cur ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                {cur === 'USD' ? 'دولار ($)' : 'دينار (د.ع)'}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label={`رأس المال (${capitalCurrency === 'USD' ? '$' : 'د.ع'})`}
                type="number"
                step={capitalCurrency === 'USD' ? '0.01' : '1'}
                value={capital}
                onChange={e => setCapital(e.target.value)}
                placeholder="0"
              />
              {capitalPreview && <p className="text-xs text-slate-400 mt-1 mr-1">{capitalPreview}</p>}
            </div>
            <Button onClick={saveCapital} variant="secondary">حفظ</Button>
          </div>
          {capitalSaved && (
            <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} />تم الحفظ</span>
          )}
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

      </div>
    </DashboardLayout>
  )
}
