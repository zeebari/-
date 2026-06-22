'use client'
import { useState, useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const BACKUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const LAST_BACKUP_KEY = 'last_telegram_backup'

interface DashboardLayoutProps {
  title: string
  children: React.ReactNode
  headerActions?: React.ReactNode
}

export function DashboardLayout({ title, children, headerActions }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const backupRef = useRef(false)

  useEffect(() => {
    async function runBackup() {
      if (backupRef.current) return
      backupRef.current = true
      try {
        const { sendBackupToTelegram } = await import('@/lib/telegram')
        await sendBackupToTelegram()
        localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString())
      } catch {
        // silent — backup failure shouldn't break the app
      } finally {
        backupRef.current = false
      }
    }

    function scheduleBackup() {
      const last = parseInt(localStorage.getItem(LAST_BACKUP_KEY) ?? '0', 10)
      const elapsed = Date.now() - last
      const delay = elapsed >= BACKUP_INTERVAL_MS ? 0 : BACKUP_INTERVAL_MS - elapsed
      return setTimeout(() => {
        runBackup()
        intervalId = setInterval(runBackup, BACKUP_INTERVAL_MS)
      }, delay)
    }

    let intervalId: ReturnType<typeof setInterval>
    const timeoutId = scheduleBackup()
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [])

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
