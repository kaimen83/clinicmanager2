import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignOutPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-6 border rounded-lg shadow-sm text-center max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-4">로그아웃</h2>
        <p className="mb-6">정말 로그아웃 하시겠습니까?</p>
        <div className="flex justify-center gap-4">
          <Link href="/">
            <Button variant="outline">취소</Button>
          </Link>
          <SignOutButton>
            <Button>로그아웃</Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
} 