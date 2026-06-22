'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/lib/auth'

interface DashboardLayoutProps {
  title: string
  children: React.ReactNode
  headerActions?: React.ReactNode
}

export function DashboardLayout({ title, children, headerActions }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) return null

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
