import { redirect } from 'next/navigation';
import { getCurrentUserWithRole } from '@/lib/utils/auth';

export default async function PendingApprovalPage() {
  const userWithRole = await getCurrentUserWithRole();
  
  // 사용자가 없거나 READ_ONLY가 아닌 경우 메인 페이지로 리다이렉트
  if (!userWithRole || userWithRole.role !== 'READ_ONLY') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-yellow-100">
            <svg 
              className="h-8 w-8 text-yellow-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            가입 승인 대기중
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            현재 가입 심사중입니다.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            관리자가 계정을 승인할 때까지 잠시만 기다려주세요.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center space-y-3">
            <h3 className="text-lg font-medium text-gray-900">승인 절차 안내</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 관리자가 계정을 검토하고 있습니다</p>
              <p>• 승인이 완료되면 시스템을 이용하실 수 있습니다</p>
              <p>• 문의사항이 있으시면 관리자에게 연락해주세요</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100">
            <svg 
              className="animate-spin -ml-1 mr-3 h-4 w-4 text-indigo-600" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            승인 대기중...
          </div>
        </div>
      </div>
    </div>
  );
}