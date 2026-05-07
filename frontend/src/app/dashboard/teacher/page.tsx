'use client';
import { useQuery } from '@tanstack/react-query';
import { teacherApi, attendanceApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Users, UserCheck, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboard() {
  const user = useAuthStore(s => s.user);
  const { data: studentsData } = useQuery({
    queryKey: ['my-students'],
    queryFn: () => teacherApi.getStudents({ class: user?.class, section: user?.section }).then(r => r.data),
  });

  const today = new Date().toISOString().split('T')[0];
  const { data: todayAtt } = useQuery({
    queryKey: ['today-attendance', today],
    queryFn: () => attendanceApi.get({ date: today }).then(r => r.data),
  });

  const presentCount = todayAtt?.records?.filter((r: any) => r.status === 'present').length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Welcome, {user?.name} 👋</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#6c63ff20' }}>
            <Users size={22} style={{ color: '#6c63ff' }} />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{studentsData?.students?.length ?? '—'}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Total Students</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#22c55e20' }}>
            <UserCheck size={22} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{presentCount}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Present Today</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b20' }}>
            <Calendar size={22} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{today}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Today</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/attendance" className="card hover:border-accent transition-colors cursor-pointer block"
          style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-white mb-1">Mark Attendance</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Manually mark today's attendance</p>
        </Link>
        <Link href="/attendance/face" className="card hover:border-accent transition-colors cursor-pointer block"
          style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-white mb-1">Face Recognition</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Use camera to auto-mark attendance</p>
        </Link>
      </div>
    </div>
  );
}
