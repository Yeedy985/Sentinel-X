'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/adminApi';

export default function AdminRoot() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isLoggedIn() ? '/admin/dashboard' : '/admin/login');
  }, []);
  return null;
}
