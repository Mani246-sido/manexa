'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi, attendanceApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Save, CheckCircle } from 'lucide-react';

type Status = 'present' | 'absent' | 'late';

export default function AttendancePage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [cls, setCls] = useState(user?.class || '');
  const [section, setSection] = useState(user?.section || '');
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [saved, setSaved] = useState(false);

  const { data: studentsData } = useQuery({
    queryKey: ['students', cls, section],
    queryFn: () => teacherApi.getStudents({ class: cls, section }).then(r => r.data),
    enabled: !!(cls || section),
  });

  const bulkMutation = useMutation({
    mutationFn: (data: object) => attendanceApi.markBulk(data),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); qc.invalidateQueries({ queryKey: ['today-attendance'] }); }
  });

  const students = studentsData?.students || [];

  const handleSave = () => {
    const payload = students.map((s: any) => ({
      studentId: s._id,
      status: records[s._id] || 'absent'
    }));
    bulkMutation.mutate({ records: payload, class: cls, section, date: new Date().toISOString() });
  };

  const markAll = (status: Status) => {
    const all: Record<string, Status> = {};
    students.forEach((s: any) => { all[s._id] = status; });
    setRecords(all);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mark Attendance</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle size={16} /> Saved!
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-4 flex-wrap">
          <input className="input flex-1 min-w-[120px]" placeholder="Class (e.g. 10)" value={cls}
            onChange={e => setCls(e.target.value)} />
          <input className="input flex-1 min-w-[120px]" placeholder="Section (e.g. A)" value={section}
            onChange={e => setSection(e.target.value)} />
        </div>
      </div>

      {students.length > 0 && (
        <div className="card space-y-4">
          {/* Bulk actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white mr-2">Mark All:</span>
            {(['present', 'absent', 'late'] as Status[]).map(s => (
              <button key={s} onClick={() => markAll(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: s === 'present' ? '#22c55e20' : s === 'absent' ? '#ef444420' : '#f59e0b20',
                  color: s === 'present' ? '#22c55e' : s === 'absent' ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${s === 'present' ? '#22c55e40' : s === 'absent' ? '#ef444440' : '#f59e0b40'}`
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Student list */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {students.map((student: any) => {
              const status = records[student._id] || 'absent';
              return (
                <div key={student._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white text-sm">{student.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Roll: {student.rollNumber || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    {(['present', 'absent', 'late'] as Status[]).map(s => (
                      <button key={s} onClick={() => setRecords(r => ({ ...r, [student._id]: s }))}
                        className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                        style={{
                          background: status === s
                            ? (s === 'present' ? '#22c55e' : s === 'absent' ? '#ef4444' : '#f59e0b')
                            : 'var(--surface2)',
                          color: status === s ? 'white' : 'var(--muted)',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleSave} disabled={bulkMutation.isPending}
            className="w-full btn-primary flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)' }}>
            {bulkMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Save size={16} /> Save Attendance</>}
          </button>
        </div>
      )}

      {students.length === 0 && (cls || section) && (
        <div className="card text-center py-12">
          <p style={{ color: 'var(--muted)' }}>No students found for this class/section</p>
        </div>
      )}

      {!cls && !section && (
        <div className="card text-center py-12">
          <p style={{ color: 'var(--muted)' }}>Enter a class or section above to load students</p>
        </div>
      )}
    </div>
  );
}
