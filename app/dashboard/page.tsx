import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/">
          <Button variant="outline">홈으로</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">사용자 정보</h2>
          <div className="space-y-2">
            <p>ID: {user.id}</p>
            <p>이메일: {user.emailAddresses[0]?.emailAddress}</p>
            <p>이름: {user.firstName} {user.lastName}</p>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">통계</h2>
          <div className="space-y-2">
            <p>오늘 방문자: 245</p>
            <p>이번 주 방문자: 1,245</p>
            <p>총 회원: 5,678</p>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">최근 활동</h2>
          <div className="space-y-2">
            <p>최근 로그인: {new Date().toLocaleString()}</p>
            <p>계정 생성: {user.createdAt ? new Date(user.createdAt).toLocaleString() : '정보 없음'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 