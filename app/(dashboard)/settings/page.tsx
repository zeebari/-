'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Send } from 'lucide-react'
import { fetchExchangeRate, saveExchangeRate, fetchCategories, createCategory } from '@/lib/api'

interface ExchangeRate {
  usd_to_iqd: number
  rate_date: string
}

export default function SettingsPage() {
  const [rate, setRate] = useState<ExchangeRate | null>(null)
  const [newRate, setNewRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [newCat, setNewCat] = useState('')
  const [backupSending, setBackupSending] = useState(false)
  const [backupStatus, setBackupStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  useEffect(() => {
    const ts = localStorage.getItem('last_telegram_backup')
    if (ts) setLastBackup(new Date(parseInt(ts, 10)).toLocaleString('ar-IQ'))
  }, [])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [rateData, cats] = await Promise.all([fetchExchangeRate(), fetchCategories()])
    setRate(rateData)
    setCategories(cats as { id: string; name: string }[])
  }

  async function handleSaveRate() {
    if (!newRate) return
    setSaving(true)
    await saveExchangeRate(parseFloat(newRate))
    setNewRate('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await loadData()
    setSaving(false)
  }

  async function sendBackupNow() {
    setBackupSending(true)
    setBackupStatus('idle')
    try {
      const { sendBackupToTelegram } = await import('@/lib/telegram')
      await sendBackupToTelegram()
      const now = Date.now()
      localStorage.setItem('last_telegram_backup', now.toString())
      setLastBackup(new Date(now).toLocaleString('ar-IQ'))
      setBackupStatus('ok')
    } catch {
      setBackupStatus('err')
    } finally {
      setBackupSending(false)
      setTimeout(() => setBackupStatus('idle'), 3000)
    }
  }

  async function addCategory() {
    if (!newCat) return
    await createCategory(newCat)
    setNewCat('')
    await loadData()
  }

  const currentRate = rate?.usd_to_iqd ?? 1310

  return (
    <DashboardLayout title="الإعدادات">
      <div className="max-w-2xl space-y-6">
        {/* Exchange Rate */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-800">سعر الصرف</h2>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="text-sm text-slate-500 mb-1">السعر الحالي</div>
            <div className="text-2xl font-bold text-blue-700">1 USD = {currentRate.toLocaleString()} IQD</div>
            <div className="text-xs text-slate-400 mt-1">{rate?.rate_date}</div>
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
            <Button onClick={handleSaveRate} loading={saving}>
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

        {/* Telegram Backup */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-800">النسخ الاحتياطي — تليكرام</h2>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>الحالة:</span>
              <strong className="text-green-600">نشط — كل ساعة تلقائياً</strong>
            </div>
            {lastBackup && (
              <div className="flex justify-between">
                <span>آخر نسخة:</span>
                <strong>{lastBackup}</strong>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={sendBackupNow} loading={backupSending} variant="secondary">
              <Send size={15} />
              إرسال نسخة الآن
            </Button>
            {backupStatus === 'ok' && <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} />تم الإرسال</span>}
            {backupStatus === 'err' && <span className="text-red-500 text-sm">فشل الإرسال — تحقق من البوت</span>}
          </div>
          <p className="text-xs text-slate-400">
            يُرسل ملف Excel يحتوي على جميع البيانات (زبائن، موردون، مبيعات، مصاريف، مخزون) إلى حسابك على تليكرام.
          </p>
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
