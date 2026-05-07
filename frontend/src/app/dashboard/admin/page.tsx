'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi, dashboardApi } from '@/lib/api';
import { Users, GraduationCap, UserCheck, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: `${color}20` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value ?? '—'}</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then(r => r.data),
  });
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => dashboardApi.getAnalytics().then(r => r.data),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats?.totalStudents} icon={GraduationCap} color="#6c63ff" />
        <StatCard label="Total Teachers" value={stats?.totalTeachers} icon={Users} color="#22c55e" />
        <StatCard label="Today Present" value={stats?.todayAttendance} icon={UserCheck} color="#f59e0b" />
        <StatCard label="Admins" value={stats?.totalAdmins} icon={TrendingUp} color="#ef4444" />
      </div>

      {/* Chart */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-6">7-Day Attendance Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={analytics?.trend || []}>
            <defs>
              <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 12, color: '#e2e8f0' }}
            />
            <Area type="monotone" dataKey="present" stroke="#6c63ff" fill="url(#present)" strokeWidth={2} name="Present" />
            <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="4 4" name="Absent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
