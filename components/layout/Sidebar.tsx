'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Warehouse, Truck, Users, ShoppingCart, BarChart3, Settings, X, Receipt
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/products', label: 'المنتجات', icon: Package },
  { href: '/inventory', label: 'المخزون', icon: Warehouse },
  { href: '/suppliers', label: 'الموردون', icon: Truck },
  { href: '/customers', label: 'الزبائن', icon: Users },
  { href: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { href: '/expenses', label: 'المصاريف', icon: Receipt },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 right-0 h-full w-64 bg-slate-800 text-slate-100 z-40 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h1 className="text-lg font-bold text-white">نظام المحاسبة</h1>
            <p className="text-xs text-slate-400">غذائية وكهربائية</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>


      </aside>
    </>
  )
}
