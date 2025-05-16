import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const user = await currentUser();
  const isSignedIn = !!user;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16 mx-auto">
          <h1 className="text-lg font-semibold">클리닉 매니저</h1>
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">대시보드</Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
                <Link href="/sign-out">
                  <Button variant="ghost" size="icon">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">로그인</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>회원가입</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          {isSignedIn ? (
            <div className="p-6 border rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-4">환영합니다!</h2>
              <p className="mb-4">현재 로그인 상태입니다.</p>
              <p className="text-sm text-gray-500 mb-4">사용자 ID: {user?.id}</p>
              <Link href="/dashboard">
                <Button>대시보드로 이동</Button>
              </Link>
            </div>
          ) : (
            <div className="p-6 border rounded-lg shadow-sm text-center">
              <h2 className="text-2xl font-semibold mb-4">클리닉 매니저에 오신 것을 환영합니다</h2>
              <p className="mb-6">서비스를 이용하려면 로그인하세요.</p>
              <div className="flex justify-center gap-4">
                <Link href="/sign-in">
                  <Button variant="outline" size="lg">로그인</Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="lg">회원가입</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="border-t py-4">
        <div className="container mx-auto text-center text-sm text-gray-500">
          &copy; 2025 클리닉 매니저. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
