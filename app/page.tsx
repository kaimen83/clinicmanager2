import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/utils/auth";

export default async function Home() {
  const user = await currentUser();
  
  if (user) {
    // 로그인된 사용자의 권한 확인
    const userWithRole = await getCurrentUserWithRole();
    
    if (userWithRole?.role === 'READ_ONLY') {
      // READ_ONLY 사용자는 승인 대기 페이지로 리디렉션
      redirect("/pending-approval");
    } else {
      // 다른 권한 사용자는 대시보드로 리디렉션
      redirect("/dashboard");
    }
  } else {
    // 로그인되지 않은 사용자는 로그인 페이지로 리디렉션
    redirect("/sign-in");
  }
}
