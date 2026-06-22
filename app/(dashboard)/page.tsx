'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { formatCurrency } from '@/lib/currency'
import { TrendingUp, Users, Truck, AlertTriangle, DollarSign, Calendar } from 'lucide-react'

interface DashboardStats {
  today_sales_usd: number
  month_sales_usd: number
  customer_debt_usd: number
  supplier_debt_usd: number
  low_stock_count: number
}

interface StatCard {
  label: string
  value: string
  subvalue?: string
  icon: React.ElementType
  color: string
  bgColor: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [rate, setRate] = useState(1310)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [statsRes, rateRes] = await Promise.all([
        fetch('/api/reports?type=dashboard'),
        fetch('/api/exchange-rate'),
      ])
      const statsData = await statsRes.json()
      const rateData = await rateRes.json()
      setStats(statsData)
      setRate(rateData.usd_to_iqd ?? 1310)
      setLoading(false)
    }
    load()
  }, [])

  const cards: StatCard[] = stats
    ? [
        {
          label: 'مبيعات اليوم',
          value: formatCurrency(stats.today_sales_usd, 'USD'),
          subvalue: formatCurrency(stats.today_sales_usd * rate, 'IQD'),
          icon: DollarSign,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        },
        {
          label: 'مبيعات الشهر',
          value: formatCurrency(stats.month_sales_usd, 'USD'),
          subvalue: formatCurrency(stats.month_sales_usd * rate, 'IQD'),
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        },
        {
          label: 'ديون الزبائن',
          value: formatCurrency(stats.customer_debt_usd, 'USD'),
          subvalue: formatCurrency(stats.customer_debt_usd * rate, 'IQD'),
          icon: Users,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        },
        {
          label: 'مستحق للموردين',
          value: formatCurrency(stats.supplier_debt_usd, 'USD'),
          subvalue: formatCurrency(stats.supplier_debt_usd * rate, 'IQD'),
          icon: Truck,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
        },
        {
          label: 'منتجات منخفضة المخزون',
          value: `${stats.low_stock_count} منتج`,
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        },
        {
          label: 'سعر الصرف',
          value: `1 $ = ${rate.toLocaleString()} د.ع`,
          icon: Calendar,
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
        },
      ]
    : []

  return (
    <DashboardLayout title="لوحة التحكم">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{card.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                      {card.subvalue && (
                        <p className="text-sm text-slate-500 mt-1">{card.subvalue}</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl ${card.bgColor}`}>
                      <Icon size={22} className={card.color} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-slate-800 mb-1">مرحباً بك في نظام المحاسبة</h2>
            <p className="text-sm text-slate-500">استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
