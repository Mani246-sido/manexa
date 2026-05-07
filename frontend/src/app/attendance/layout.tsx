'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, init } = useAuthStore();

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-auto">{children}</main>
    </div>
  );
}
