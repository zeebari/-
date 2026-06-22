'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  title: string
  children: React.ReactNode
  headerActions?: React.ReactNode
}

export function DashboardLayout({ title, children, headerActions }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:mr-64">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)}>
          {headerActions}
        </Header>
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
