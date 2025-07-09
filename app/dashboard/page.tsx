import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // DashboardContent가 layout.tsx에서 렌더링되므로 빈 div를 반환
  return <div />;
} 