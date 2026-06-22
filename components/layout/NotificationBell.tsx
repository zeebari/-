'use client'
import { useEffect, useState } from 'react'
import { Bell, Package, CreditCard, X } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { IQD_RATE } from '@/lib/config'

interface LowStockItem {
  quantity: number
  min_quantity: number
  products: { name: string } | null
}

interface UpcomingInstallment {
  id: string
  due_date: string
  amount: number
  sales: {
    currency: string
    exchange_rate: number
    customers: { name: string; phone: string | null } | null
  } | null
}

interface NotificationData {
  low_stock: LowStockItem[]
  upcoming_installments: UpcomingInstallment[]
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationData>({ low_stock: [], upcoming_installments: [] })

  useEffect(() => {
    import('@/lib/api').then(m => m.fetchNotifications()).then(setData).catch(() => {})
  }, [])

  const count = data.low_stock.length + data.upcoming_installments.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        title="الإشعارات"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-2 right-2 top-14 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
              <span className="font-semibold text-slate-800">الإشعارات</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            {count === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 text-sm">لا توجد إشعارات</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.low_stock.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="p-1.5 bg-orange-50 rounded-lg shrink-0 mt-0.5">
                      <Package size={14} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.products?.name}</p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        مخزون منخفض: {item.quantity} وحدة (الحد: {item.min_quantity})
                      </p>
                    </div>
                  </div>
                ))}
                {data.upcoming_installments.map(inst => {
                  const cur = (inst.sales?.currency ?? 'USD') as 'USD' | 'IQD'
                  const rate = inst.sales?.exchange_rate ?? IQD_RATE
                  const amtIQD = cur === 'IQD' ? inst.amount : Math.round(inst.amount * rate)
                  return (
                    <div key={inst.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="p-1.5 bg-blue-50 rounded-lg shrink-0 mt-0.5">
                        <CreditCard size={14} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {inst.sales?.customers?.name ?? 'زبون'}
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          قسط مستحق: {formatCurrency(amtIQD, 'IQD')}
                        </p>
                        <p className="text-xs text-slate-400">{inst.due_date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
