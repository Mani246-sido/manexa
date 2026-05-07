'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { attendanceApi } from '@/lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDashboard() {
  const user = useAuthStore(s => s.user);
  const { data } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => attendanceApi.get({ studentId: user?._id }).then(r => r.data),
    enabled: !!user?._id,
  });

  const present = data?.records?.filter((r: any) => r.status === 'present').length || 0;
  const absent = data?.records?.filter((r: any) => r.status === 'absent').length || 0;
  const late = data?.records?.filter((r: any) => r.status === 'late').length || 0;
  const total = data?.total || 0;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

  const pieData = [
    { name: 'Present', value: present, color: '#22c55e' },
    { name: 'Absent', value: absent, color: '#ef4444' },
    { name: 'Late', value: late, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">My Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {user?.class && `Class ${user.class}`} {user?.section && `| Section ${user.section}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance % */}
        <div className="card text-center">
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--muted)' }}>Attendance Rate</p>
          <div className="relative inline-flex">
            <div className="text-5xl font-black" style={{ color: Number(percentage) >= 75 ? '#22c55e' : '#ef4444' }}>
              {percentage}%
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl p-2" style={{ background: 'var(--surface2)' }}>
              <p className="text-lg font-bold text-white">{present}</p>
              <p className="text-xs" style={{ color: '#22c55e' }}>Present</p>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'var(--surface2)' }}>
              <p className="text-lg font-bold text-white">{absent}</p>
              <p className="text-xs" style={{ color: '#ef4444' }}>Absent</p>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'var(--surface2)' }}>
              <p className="text-lg font-bold text-white">{late}</p>
              <p className="text-xs" style={{ color: '#f59e0b' }}>Late</p>
            </div>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>Breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent records */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Recent Attendance</h2>
        <div className="space-y-2">
          {(data?.records || []).slice(0, 10).map((r: any) => (
            <div key={r._id} className="flex items-center justify-between py-2 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm text-white">
                {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className={`badge-${r.status}`}>{r.status}</span>
            </div>
          ))}
          {(!data?.records || data.records.length === 0) && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No attendance records yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
