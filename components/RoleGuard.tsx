'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface RoleGuardProps {
  children: React.ReactNode;
}

export default function RoleGuard({ children }: RoleGuardProps) {
  const { isLoaded, user } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkUserRole() {
      if (!isLoaded || !user) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/user-role');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
          
          // READ_ONLY 사용자는 pending-approval 페이지로 리다이렉트
          if (data.role === 'READ_ONLY' && window.location.pathname !== '/pending-approval') {
            router.push('/pending-approval');
            return;
          }
          
          // 다른 권한 사용자가 pending-approval 페이지에 있으면 대시보드로 리다이렉트
          if (data.role !== 'READ_ONLY' && window.location.pathname === '/pending-approval') {
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkUserRole();
  }, [isLoaded, user, router]);

  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}