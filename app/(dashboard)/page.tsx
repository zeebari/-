'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import { TrendingUp, Users, Truck, AlertTriangle, Wallet, TrendingDown, BarChart3, Package } from 'lucide-react'

interface DashboardStats {
  today_sales_usd: number
  month_sales_usd: number
  customer_debt_usd: number
  supplier_debt_usd: number
  low_stock_count: number
}

interface FinancialSummary {
  total_revenue_usd: number
  cost_of_goods_usd: number
  total_expenses_usd: number
  inventory_value_usd: number
  customer_debt_usd: number
  supplier_debt_usd: number
  net_profit_usd: number
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
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [capital, setCapital] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('initial_capital_usd')
    if (saved) setCapital(parseFloat(saved) || 0)

    Promise.all([
      import('@/lib/api').then(m => m.fetchDashboardStats()),
      import('@/lib/api').then(m => m.fetchFinancialSummary()),
    ]).then(([statsData, summaryData]) => {
      setStats(statsData)
      setSummary(summaryData)
      setLoading(false)
    })
  }, [])

  const cards: StatCard[] = stats
    ? [
        {
          label: 'مبيعات اليوم',
          value: formatCurrency(stats.today_sales_usd * IQD_RATE, 'IQD'),
          subvalue: formatCurrency(stats.today_sales_usd, 'USD'),
          icon: TrendingUp,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        },
        {
          label: 'مبيعات الشهر',
          value: formatCurrency(stats.month_sales_usd * IQD_RATE, 'IQD'),
          subvalue: formatCurrency(stats.month_sales_usd, 'USD'),
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        },
        {
          label: 'ديون الزبائن',
          value: formatCurrency(stats.customer_debt_usd * IQD_RATE, 'IQD'),
          subvalue: formatCurrency(stats.customer_debt_usd, 'USD'),
          icon: Users,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        },
        {
          label: 'مستحق للموردين',
          value: formatCurrency(stats.supplier_debt_usd * IQD_RATE, 'IQD'),
          subvalue: formatCurrency(stats.supplier_debt_usd, 'USD'),
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
      ]
    : []

  const netProfit = summary?.net_profit_usd ?? 0
  const workingCapital = capital + netProfit + (summary?.inventory_value_usd ?? 0) + (summary?.customer_debt_usd ?? 0) - (summary?.supplier_debt_usd ?? 0)
  const isProfit = netProfit >= 0

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

          {/* Financial Summary */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3">الملخص المالي</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Capital */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">رأس المال</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(capital * IQD_RATE, 'IQD')}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatCurrency(capital, 'USD')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50">
                    <Wallet size={22} className="text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">صافي الربح</p>
                    <p className={`text-xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                      {isProfit ? '+' : ''}{formatCurrency(Math.abs(netProfit) * IQD_RATE, 'IQD')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{isProfit ? '+' : ''}{formatCurrency(netProfit, 'USD')}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
                    {isProfit ? <TrendingUp size={22} className="text-green-600" /> : <TrendingDown size={22} className="text-red-600" />}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>الإيرادات</span>
                    <span className="text-green-600">+{formatCurrency((summary?.total_revenue_usd ?? 0) * IQD_RATE, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تكلفة البضائع</span>
                    <span className="text-red-500">-{formatCurrency((summary?.cost_of_goods_usd ?? 0) * IQD_RATE, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المصاريف</span>
                    <span className="text-red-500">-{formatCurrency((summary?.total_expenses_usd ?? 0) * IQD_RATE, 'IQD')}</span>
                  </div>
                </div>
              </div>

              {/* Inventory Value */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">قيمة المخزون</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency((summary?.inventory_value_usd ?? 0) * IQD_RATE, 'IQD')}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatCurrency(summary?.inventory_value_usd ?? 0, 'USD')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100">
                    <Package size={22} className="text-slate-600" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">بسعر التكلفة</p>
              </div>

              {/* Working Capital */}
              <div className="card border-2 border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium mb-1">المبلغ المداور</p>
                    <p className={`text-xl font-bold ${workingCapital >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(workingCapital) * IQD_RATE, 'IQD')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{formatCurrency(workingCapital, 'USD')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100">
                    <BarChart3 size={22} className="text-blue-700" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>رأس المال + الربح</span>
                    <span>{formatCurrency((capital + netProfit) * IQD_RATE, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مخزون + ذمم</span>
                    <span>+{formatCurrency(((summary?.inventory_value_usd ?? 0) + (summary?.customer_debt_usd ?? 0)) * IQD_RATE, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مستحق للموردين</span>
                    <span className="text-red-500">-{formatCurrency((summary?.supplier_debt_usd ?? 0) * IQD_RATE, 'IQD')}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {capital === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              💡 أدخل رأس المال في <a href="/settings" className="font-semibold underline">الإعدادات</a> لعرض الملخص المالي الكامل
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
