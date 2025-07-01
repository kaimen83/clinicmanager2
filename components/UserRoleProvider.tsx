'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { UserWithRole } from '@/lib/utils/auth';

interface UserRoleContextType {
  userWithRole: UserWithRole | null;
  loading: boolean;
  refetch: () => void;
}

const UserRoleContext = createContext<UserRoleContextType>({
  userWithRole: null,
  loading: true,
  refetch: () => {}
});

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [userWithRole, setUserWithRole] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/user-management/current-user');
      if (response.ok) {
        const data = await response.json();
        setUserWithRole(data);
      } else {
        setUserWithRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserWithRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, []);

  const refetch = () => {
    setLoading(true);
    fetchUserRole();
  };

  return (
    <UserRoleContext.Provider value={{ userWithRole, loading, refetch }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}