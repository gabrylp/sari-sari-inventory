// src/app/protected-layout.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hasAccess = getCookie('gateway_access') === 'granted';
    if (!hasAccess && pathname !== '/') {
      router.push('/');
    }
  }, [pathname, router]);

  return <>{children}</>;
}