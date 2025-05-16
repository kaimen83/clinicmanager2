import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import ClinicNavigation from "@/components/ClinicNavigation";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-6 flex-1">
        <ClinicNavigation />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <Card className="p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">사용자 정보</h2>
            <div className="space-y-2">
              <p>ID: {user.id}</p>
              <p>이메일: {user.emailAddresses[0]?.emailAddress}</p>
              <p>이름: {user.firstName} {user.lastName}</p>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">오늘의 내원 통계</h2>
            <div className="space-y-2">
              <p>전체 내원: 38명</p>
              <p>신규 환자: 5명</p>
              <p>재진 환자: 33명</p>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">오늘의 수입 현황</h2>
            <div className="space-y-2">
              <p>진료 수입: ₩2,450,000</p>
              <p>진료 외 수입: ₩580,000</p>
              <p>총 수입: ₩3,030,000</p>
            </div>
          </Card>
        </div>
      </div>
      
      <footer className="border-t py-4">
        <div className="container mx-auto text-center text-sm text-gray-500">
          &copy; 2025 클리닉 매니저. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 