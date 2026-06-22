'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Warehouse, Truck, Users, ShoppingCart,
  BarChart3, Settings, X, Receipt, UserCog, LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

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

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  employee: 'موظف',
  viewer: 'مشاهد',
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 right-0 h-full w-64 bg-slate-800 text-slate-100 z-40 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h1 className="text-lg font-bold text-white">نظام المحاسبة</h1>
            <p className="text-xs text-slate-400">غذائية وكهربائية</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

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

            {user?.role === 'admin' && (
              <li>
                <Link
                  href="/users"
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === '/users'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  <UserCog size={18} />
                  إدارة المستخدمين
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-slate-700 px-3 pt-3 pb-4">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-slate-400">{roleLabels[user?.role ?? ''] ?? user?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}
