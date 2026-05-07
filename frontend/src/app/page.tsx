'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, init } = useAuthStore();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.replace('/login');
      else router.replace(`/dashboard/${user.role}`);
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
