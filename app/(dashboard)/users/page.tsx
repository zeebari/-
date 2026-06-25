'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { listUsers, createUser, deleteUser, updateUserRole } from '@/lib/api'

interface UserRow {
  id: string
  email: string
  name: string
  role: string
}

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  employee: 'موظف',
  viewer: 'مشاهد',
}

const roleBadge: Record<string, 'success' | 'warning' | 'gray'> = {
  admin: 'success',
  employee: 'warning',
  viewer: 'gray',
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [editRole, setEditRole] = useState('employee')
  const [editName, setEditName] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(data.users ?? [])
    } catch {
      // silent
    }
    setLoading(false)
  }

  function openAdd() {
    setForm({ name: '', email: '', password: '', role: 'employee' })
    setErr('')
    setAddOpen(true)
  }

  async function handleAdd() {
    setSaving(true)
    setErr('')
    try {
      await createUser(form)
      await loadUsers()
      setAddOpen(false)
    } catch (e: unknown) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  function openEdit(u: UserRow) {
    setEditTarget(u)
    setEditRole(u.role)
    setEditName(u.name)
    setErr('')
  }

  async function handleEdit() {
    if (!editTarget) return
    setSaving(true)
    setErr('')
    try {
      await updateUserRole(editTarget.id, editRole, editName)
      await loadUsers()
      setEditTarget(null)
    } catch (e: unknown) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      await loadUsers()
      setDeleteTarget(null)
    } catch (e: unknown) {
      alert((e as Error).message)
    }
    setDeleting(false)
  }

  return (
    <DashboardLayout
      title="إدارة المستخدمين"
      headerActions={
        <Button size="sm" onClick={openAdd}><UserPlus size={15} />إضافة مستخدم</Button>
      }
    >
      <div className="card p-0">
        <Table>
          <Thead>
            <tr>
              <Th>الاسم</Th>
              <Th>البريد الإلكتروني</Th>
              <Th>الصلاحية</Th>
              <Th>إجراءات</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan={4} className="text-center py-8 text-slate-400">جاري التحميل...</Td></Tr>
            ) : users.length === 0 ? (
              <Tr><Td colSpan={4} className="text-center py-8 text-slate-400">لا يوجد مستخدمون</Td></Tr>
            ) : users.map(u => (
              <Tr key={u.id}>
                <Td className="font-medium">{u.name || '—'}</Td>
                <Td dir="ltr" className="text-right text-sm text-slate-600">{u.email}</Td>
                <Td>
                  <Badge variant={roleBadge[u.role] ?? 'gray'}>
                    {roleLabels[u.role] ?? u.role}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                      <Pencil size={15} />
                    </button>
                    {u.id !== me?.id && (
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مستخدم جديد" size="sm">
        <div className="space-y-4">
          <Input label="الاسم" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المستخدم" />
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" dir="ltr" />
          <Input label="كلمة المرور" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="6 أحرف على الأقل" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الصلاحية</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">مدير — صلاحية كاملة</option>
              <option value="employee">موظف — إضافة وتعديل</option>
              <option value="viewer">مشاهد — قراءة فقط</option>
            </select>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAdd} loading={saving}>إضافة</Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="تعديل المستخدم" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dir-ltr">{editTarget?.email}</p>
          <Input label="الاسم" value={editName} onChange={e => setEditName(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الصلاحية</label>
            <select
              value={editRole}
              onChange={e => setEditRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">مدير — صلاحية كاملة</option>
              <option value="employee">موظف — إضافة وتعديل</option>
              <option value="viewer">مشاهد — قراءة فقط</option>
            </select>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button onClick={handleEdit} loading={saving}>حفظ</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name || deleteTarget?.email}"؟`}
        loading={deleting}
      />
    </DashboardLayout>
  )
}
