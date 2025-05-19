import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();
  
  if (user) {
    // 로그인된 사용자는 대시보드로 리디렉션
    redirect("/dashboard");
  } else {
    // 로그인되지 않은 사용자는 로그인 페이지로 리디렉션
    redirect("/sign-in");
  }
}
