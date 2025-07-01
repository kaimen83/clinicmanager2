import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserWithRole } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import UserManagementContent from './UserManagementContent';

export default async function UserManagementPage() {
  const userWithRole = await getCurrentUserWithRole();
  
  // 권한 확인 - SUPER_ADMIN만 접근 가능
  if (!userWithRole || userWithRole.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2 hover:bg-gray-50">
              <ArrowLeft className="w-4 h-4" />
              홈으로 돌아가기
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">사용자 권한 관리</h1>
        <p className="text-gray-600 mt-2">시스템 사용자의 권한을 관리할 수 있습니다.</p>
      </div>
      
      <UserManagementContent />
    </div>
  );
}