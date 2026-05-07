'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, Users, UserCheck, BookOpen,
  LogOut, ChevronRight, GraduationCap, Camera
} from 'lucide-react';

const navItems = {
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Teachers', href: '/dashboard/admin/teachers', icon: BookOpen },
    { label: 'Students', href: '/dashboard/admin/students', icon: GraduationCap },
    { label: 'Attendance', href: '/attendance', icon: UserCheck },
    { label: 'Face Register', href: '/attendance/register', icon: Camera },
  ],
  teacher: [
    { label: 'Dashboard', href: '/dashboard/teacher', icon: LayoutDashboard },
    { label: 'My Students', href: '/dashboard/teacher/students', icon: Users },
    { label: 'Attendance', href: '/attendance', icon: UserCheck },
    { label: 'Face Scan', href: '/attendance/face', icon: Camera },
  ],
  student: [
    { label: 'Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
    { label: 'My Attendance', href: '/dashboard/student/attendance', icon: UserCheck },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  if (!user) return null;
  const items = navItems[user.role] || [];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white"
            style={{ background: 'var(--accent)' }}>M</div>
          <div>
            <p className="font-bold text-white text-sm">Manexa</p>
            <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{user.role} Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active ? 'text-white' : 'hover:text-white'}`}
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'white' : 'var(--muted)'
              }}>
              <item.icon size={17} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1"
          style={{ background: 'var(--surface2)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.email}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all hover:text-red-400"
          style={{ color: 'var(--muted)' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
