'use client'
import { Menu } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  title: string
  onMenuClick: () => void
  children?: React.ReactNode
}

export function Header({ title, onMenuClick, children }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        {children}
      </div>
    </header>
  )
}
