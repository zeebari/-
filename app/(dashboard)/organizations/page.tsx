'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { Building2, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { listOrganizations, createOrganization, toggleOrganization } from '@/lib/api'

interface Org {
  id: string
  name: string
  owner_email: string
  active: boolean
  created_at: string
  user_count: number
}

export default function OrganizationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ name: '', adminName: '', adminEmail: '', adminPassword: '' })

  useEffect(() => {
    if (!authLoading && !user?.is_super_admin) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user?.is_super_admin) loadOrgs()
  }, [user])

  async function loadOrgs() {
    setLoading(true)
    try {
      const data = await listOrganizations()
      setOrgs(data.orgs ?? [])
    } catch {
      // silent
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.name || !form.adminEmail || !form.adminPassword) {
      setErr('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await createOrganization(form)
      await loadOrgs()
      setAddOpen(false)
      setForm({ name: '', adminName: '', adminEmail: '', adminPassword: '' })
    } catch (e: unknown) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  async function handleToggle(org: Org) {
    try {
      await toggleOrganization(org.id, !org.active)
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, active: !org.active } : o))
    } catch (e: unknown) {
      alert((e as Error).message)
    }
  }

  if (authLoading || !user?.is_super_admin) return null

  return (
    <DashboardLayout
      title="إدارة المنظمات"
      headerActions={
        <Button size="sm" onClick={() => { setForm({ name: '', adminName: '', adminEmail: '', adminPassword: '' }); setErr(''); setAddOpen(true) }}>
          <Plus size={15} />منظمة جديدة
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <Building2 size={16} className="mt-0.5 shrink-0" />
          <span>أنت تعمل كمدير عام (Super Admin). كل منظمة هنا لديها مستخدموها وبياناتها المنفصلة.</span>
        </div>

        <div className="card p-0">
          <Table>
            <Thead>
              <tr>
                <Th>اسم المنظمة</Th>
                <Th>إيميل المدير</Th>
                <Th>عدد المستخدمين</Th>
                <Th>تاريخ الإنشاء</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={6} className="text-center py-8 text-slate-400">جاري التحميل...</Td></Tr>
              ) : orgs.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center py-8 text-slate-400">لا توجد منظمات</Td></Tr>
              ) : orgs.map(org => (
                <Tr key={org.id}>
                  <Td className="font-medium">{org.name}</Td>
                  <Td dir="ltr" className="text-right text-sm text-slate-600">{org.owner_email}</Td>
                  <Td className="text-center">{org.user_count}</Td>
                  <Td className="text-sm text-slate-500">{new Date(org.created_at).toLocaleDateString('ar-IQ')}</Td>
                  <Td>
                    <Badge variant={org.active ? 'success' : 'gray'}>
                      {org.active ? 'نشط' : 'موقوف'}
                    </Badge>
                  </Td>
                  <Td>
                    <button
                      onClick={() => handleToggle(org)}
                      className={`p-1.5 rounded-lg transition-colors ${org.active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}
                      title={org.active ? 'إيقاف المنظمة' : 'تفعيل المنظمة'}
                    >
                      {org.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة منظمة جديدة" size="sm">
        <div className="space-y-4">
          <Input
            label="اسم المنظمة *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="مثال: محلات الزبير التجارية"
          />
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 mb-3 font-medium">بيانات حساب المدير للمنظمة</p>
            <div className="space-y-3">
              <Input
                label="اسم المدير"
                value={form.adminName}
                onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                placeholder="الاسم الكامل"
              />
              <Input
                label="البريد الإلكتروني *"
                type="email"
                value={form.adminEmail}
                onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                placeholder="admin@example.com"
                dir="ltr"
              />
              <Input
                label="كلمة المرور *"
                type="password"
                value={form.adminPassword}
                onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                placeholder="6 أحرف على الأقل"
              />
            </div>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} loading={saving}>إنشاء المنظمة</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
