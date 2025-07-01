'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserManagementModal } from '@/components/UserManagementModal';
import { UserRole } from '@/lib/models/UserProfile';
import { useToast } from '@/hooks/use-toast';

const roleLabels: Record<UserRole, string> = {
  'SUPER_ADMIN': '최고관리자',
  'ADMIN': '관리자', 
  'STAFF': '일반직원',
  'READ_ONLY': '조회전용'
};

const roleColors: Record<UserRole, string> = {
  'SUPER_ADMIN': 'bg-red-500',
  'ADMIN': 'bg-orange-500',
  'STAFF': 'bg-blue-500', 
  'READ_ONLY': 'bg-gray-500'
};

export default function UserManagementContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/user-management');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      } else {
        toast({
          title: '오류',
          description: '사용자 목록을 불러오는데 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: '오류',
        description: '사용자 목록을 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (clerkId: string, newRole: UserRole) => {
    try {
      const response = await fetch('/api/user-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clerkId, role: newRole }),
      });

      if (response.ok) {
        await fetchUsers();
        toast({
          title: '성공',
          description: '사용자 권한이 업데이트되었습니다.',
        });
      } else {
        toast({
          title: '오류',
          description: '권한 업데이트에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: '오류',
        description: '권한 업데이트에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (clerkId: string) => {
    try {
      const response = await fetch('/api/user-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clerkId, action: 'toggleActive' }),
      });

      if (response.ok) {
        await fetchUsers();
        toast({
          title: '성공',
          description: '사용자 상태가 변경되었습니다.',
        });
      } else {
        toast({
          title: '오류',
          description: '상태 변경에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast({
        title: '오류',
        description: '상태 변경에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const openRoleModal = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.clerkId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={`text-white ${roleColors[user.role as UserRole]}`}>
                      {roleLabels[user.role as UserRole]}
                    </Badge>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? '활성' : '비활성'}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRoleModal(user)}
                  >
                    권한 변경
                  </Button>
                  <Button
                    variant={user.isActive ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleToggleActive(user.clerkId)}
                  >
                    {user.isActive ? '비활성화' : '활성화'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <UserManagementModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoleUpdate={handleRoleUpdate}
      />
    </>
  );
}