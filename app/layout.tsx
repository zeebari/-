import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-tajawal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'سيفورا كردستان | Sephora Kurdistan',
  description: 'منتجات تجميل أصلية من الإمارات — توصيل لجميع محافظات كردستان والعراق',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="min-h-full antialiased" style={{ fontFamily: 'var(--font-tajawal), Tajawal, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
