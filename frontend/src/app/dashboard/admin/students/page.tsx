'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Plus, Search, Trash2, Edit2, X } from 'lucide-react';

function UserModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(initial || {
    name: '', email: '', password: '', role: 'student',
    phone: '', class: '', section: '', rollNumber: '', subject: '', employeeId: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{initial ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder="Full Name" value={form.name}
            onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          <input className="input" placeholder="Email" type="email" value={form.email}
            onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          {!initial && <input className="input" placeholder="Password" type="password" value={form.password}
            onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))} />}
          <select className="input" value={form.role}
            onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" placeholder="Phone" value={form.phone}
            onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
          {form.role === 'student' && <>
            <input className="input" placeholder="Class (e.g. 10)" value={form.class}
              onChange={e => setForm((f: any) => ({ ...f, class: e.target.value }))} />
            <input className="input" placeholder="Section (e.g. A)" value={form.section}
              onChange={e => setForm((f: any) => ({ ...f, section: e.target.value }))} />
            <input className="input" placeholder="Roll Number" value={form.rollNumber}
              onChange={e => setForm((f: any) => ({ ...f, rollNumber: e.target.value }))} />
          </>}
          {form.role === 'teacher' && <>
            <input className="input" placeholder="Subject" value={form.subject}
              onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))} />
            <input className="input" placeholder="Employee ID" value={form.employeeId}
              onChange={e => setForm((f: any) => ({ ...f, employeeId: e.target.value }))} />
          </>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 btn-primary text-sm"
            style={{ background: 'var(--accent)' }}>
            {initial ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ['users', search],
    queryFn: () => adminApi.getUsers({ search, role: 'student' }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => adminApi.createUser(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModal(null); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModal(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleSave = (form: any) => {
    if (modal.id) updateMutation.mutate({ id: modal.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Students</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{data?.total || 0} students enrolled</p>
        </div>
        <button onClick={() => setModal({})} className="btn-primary flex items-center gap-2 text-sm"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="card">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="input pl-9" placeholder="Search students..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Roll No', 'Class', 'Section', 'Actions'].map(h => (
                  <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {(data?.users || []).map((u: any) => (
                <tr key={u._id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-medium text-white">{u.name}</td>
                  <td className="py-3" style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td className="py-3 font-mono text-xs text-white">{u.rollNumber || '—'}</td>
                  <td className="py-3 text-white">{u.class || '—'}</td>
                  <td className="py-3 text-white">{u.section || '—'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ ...u, id: u._id })}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--muted)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(u._id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        style={{ color: 'var(--muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.users || data.users.length === 0) && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>No students found</p>
          )}
        </div>
      </div>

      {modal !== null && (
        <UserModal
          initial={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
