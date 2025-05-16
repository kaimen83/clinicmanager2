import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // 빈 페이지를 반환합니다. DashboardContent 컴포넌트가 렌더링을 담당합니다.
  return null;
} 