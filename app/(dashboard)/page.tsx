'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'
import { TrendingUp, Users, Truck, AlertTriangle, Wallet, TrendingDown, BarChart3, Package } from 'lucide-react'

interface DashboardStats {
  today_sales: { usd: number; iqd: number }
  month_sales: { usd: number; iqd: number }
  customer_debt_usd: number
  supplier_debt_usd: number
  supplier_debt_iqd: number
  low_stock_count: number
}

interface FinancialSummary {
  revenue_usd: number
  revenue_iqd: number
  cogs_usd: number
  cogs_iqd: number
  expenses_usd: number
  expenses_iqd: number
  net_profit_usd: number
  net_profit_iqd: number
  inventory_value_usd: number
  inventory_value_iqd: number
  customer_debt_usd: number
  supplier_debt_usd: number
  supplier_debt_iqd: number
}

function DualAmount({ usd, iqd, colorClass }: { usd: number; iqd: number; colorClass?: string }) {
  const cls = colorClass ?? 'text-slate-900'
  if (usd === 0 && iqd === 0) return <span className={`text-xl font-bold ${cls}`}>—</span>
  return (
    <div className="space-y-0.5">
      {usd > 0 && <div className={`text-xl font-bold ${cls}`}>{formatCurrency(usd, 'USD')}</div>}
      {iqd > 0 && <div className={`text-xl font-bold ${cls}`}>{formatCurrency(iqd, 'IQD')}</div>}
    </div>
  )
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

  const netProfitUSD = summary?.net_profit_usd ?? 0
  const netProfitIQD = summary?.net_profit_iqd ?? 0

  return (
    <DashboardLayout title="لوحة التحكم">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Today sales */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">مبيعات اليوم</p>
                  {stats && <DualAmount usd={stats.today_sales.usd} iqd={stats.today_sales.iqd} />}
                </div>
                <div className="p-3 rounded-xl bg-blue-50"><TrendingUp size={22} className="text-blue-600" /></div>
              </div>
            </div>

            {/* Month sales */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">مبيعات الشهر</p>
                  {stats && <DualAmount usd={stats.month_sales.usd} iqd={stats.month_sales.iqd} />}
                </div>
                <div className="p-3 rounded-xl bg-green-50"><TrendingUp size={22} className="text-green-600" /></div>
              </div>
            </div>

            {/* Customer debt */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">ديون الزبائن</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency((stats?.customer_debt_usd ?? 0) * IQD_RATE, 'IQD')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50"><Users size={22} className="text-orange-600" /></div>
              </div>
            </div>

            {/* Supplier debt */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">مستحق للموردين</p>
                  {stats && (
                    <DualAmount
                      usd={stats.supplier_debt_usd}
                      iqd={stats.supplier_debt_iqd}
                      colorClass="text-purple-600"
                    />
                  )}
                </div>
                <div className="p-3 rounded-xl bg-purple-50"><Truck size={22} className="text-purple-600" /></div>
              </div>
            </div>

            {/* Low stock */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">منتجات منخفضة المخزون</p>
                  <p className="text-xl font-bold text-red-600">{stats?.low_stock_count ?? 0} منتج</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50"><AlertTriangle size={22} className="text-red-600" /></div>
              </div>
            </div>
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
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(capital, 'USD')}</p>
                    {capital > 0 && <p className="text-xs text-slate-400 mt-1">{formatCurrency(capital * IQD_RATE, 'IQD')}</p>}
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50"><Wallet size={22} className="text-blue-600" /></div>
                </div>
              </div>

              {/* Net Profit */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">صافي الربح</p>
                    <div className="space-y-0.5">
                      {(netProfitUSD !== 0 || (summary?.revenue_usd ?? 0) > 0) && (
                        <p className={`text-xl font-bold ${netProfitUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netProfitUSD >= 0 ? '+' : ''}{formatCurrency(netProfitUSD, 'USD')}
                        </p>
                      )}
                      {(netProfitIQD !== 0 || (summary?.revenue_iqd ?? 0) > 0) && (
                        <p className={`text-xl font-bold ${netProfitIQD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netProfitIQD >= 0 ? '+' : ''}{formatCurrency(Math.abs(netProfitIQD), 'IQD')}
                          {netProfitIQD < 0 && <span className="text-red-600"> خسارة</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${netProfitUSD >= 0 && netProfitIQD >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    {netProfitUSD >= 0 && netProfitIQD >= 0
                      ? <TrendingUp size={22} className="text-green-600" />
                      : <TrendingDown size={22} className="text-red-600" />}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                  {(summary?.revenue_usd ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>إيرادات $</span>
                      <span className="text-green-600">+{formatCurrency(summary!.revenue_usd, 'USD')}</span>
                    </div>
                  )}
                  {(summary?.revenue_iqd ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>إيرادات د.ع</span>
                      <span className="text-green-600">+{formatCurrency(summary!.revenue_iqd, 'IQD')}</span>
                    </div>
                  )}
                  {(summary?.expenses_usd ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>مصاريف $</span>
                      <span className="text-red-500">-{formatCurrency(summary!.expenses_usd, 'USD')}</span>
                    </div>
                  )}
                  {(summary?.expenses_iqd ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>مصاريف د.ع</span>
                      <span className="text-red-500">-{formatCurrency(summary!.expenses_iqd, 'IQD')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Value */}
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">قيمة المخزون</p>
                    {summary && (
                      <DualAmount usd={summary.inventory_value_usd} iqd={summary.inventory_value_iqd} />
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100"><Package size={22} className="text-slate-600" /></div>
                </div>
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">بسعر التكلفة</p>
              </div>

              {/* Working Capital */}
              <div className="card border-2 border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium mb-1">المبلغ المداور</p>
                    {(() => {
                      const wcUSD = capital + netProfitUSD + (summary?.inventory_value_usd ?? 0) + (summary?.customer_debt_usd ?? 0) - (summary?.supplier_debt_usd ?? 0)
                      const wcIQD = netProfitIQD + (summary?.inventory_value_iqd ?? 0) - (summary?.supplier_debt_iqd ?? 0)
                      return (
                        <div className="space-y-0.5">
                          <p className={`text-xl font-bold ${wcUSD >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                            {formatCurrency(wcUSD, 'USD')}
                          </p>
                          {wcIQD !== 0 && (
                            <p className={`text-xl font-bold ${wcIQD >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(wcIQD), 'IQD')}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100"><BarChart3 size={22} className="text-blue-700" /></div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>رأس المال + ربح $</span>
                    <span>{formatCurrency(capital + netProfitUSD, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مخزون + ذمم $</span>
                    <span>+{formatCurrency((summary?.inventory_value_usd ?? 0) + (summary?.customer_debt_usd ?? 0), 'USD')}</span>
                  </div>
                  {(summary?.supplier_debt_usd ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>مستحق موردين $</span>
                      <span className="text-red-500">-{formatCurrency(summary!.supplier_debt_usd, 'USD')}</span>
                    </div>
                  )}
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
