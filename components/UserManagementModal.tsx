'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/lib/models/UserProfile';

interface UserManagementModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRoleUpdate: (clerkId: string, newRole: UserRole) => Promise<void>;
}

const roleLabels: Record<UserRole, string> = {
  'SUPER_ADMIN': '최고관리자',
  'ADMIN': '관리자',
  'STAFF': '일반직원',
  'READ_ONLY': '조회전용'
};

const roleDescriptions: Record<UserRole, string> = {
  'SUPER_ADMIN': '모든 시스템 기능에 접근 가능하며, 사용자 권한을 관리할 수 있습니다.',
  'ADMIN': '대부분의 관리 기능에 접근 가능합니다.',
  'STAFF': '일반적인 업무 기능에 접근 가능합니다.',
  'READ_ONLY': '데이터 조회만 가능합니다.'
};

export function UserManagementModal({ user, isOpen, onClose, onRoleUpdate }: UserManagementModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('STAFF');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleRoleChange = async () => {
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await onRoleUpdate(user.clerkId, selectedRole);
      onClose();
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>사용자 권한 변경</DialogTitle>
          <DialogDescription>
            {user.name} 님의 권한을 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">사용자 정보</label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="mt-2 flex space-x-2">
                <Badge variant="outline">현재 권한: {roleLabels[user.role as UserRole]}</Badge>
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? '활성' : '비활성'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">새로운 권한</label>
            <Select 
              value={selectedRole} 
              onValueChange={(value: UserRole) => setSelectedRole(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="권한을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([role, label]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              {roleDescriptions[selectedRole]}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={handleRoleChange} 
            disabled={loading || selectedRole === user.role}
          >
            {loading ? '변경 중...' : '권한 변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}