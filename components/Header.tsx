'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { LogOut, Clock, Calculator, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentKstDate } from '@/lib/utils';

export default function Header() {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const pathname = usePathname();
  
  useEffect(() => {
    const updateDateTime = () => {
      const now = getCurrentKstDate();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      setCurrentDateTime(now.toLocaleString('ko-KR', options));
    };
    
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // 현재 페이지에 따라 버튼 설정 결정
  const isAccountingPage = pathname === '/accounting';
  
  return (
    <header className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-xl">
      <div className="container mx-auto flex justify-between items-center py-6">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            🦷 인천센터치과 경영프로그램
          </h1>
          
          <Link href={isAccountingPage ? "/dashboard" : "/accounting"}>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 hover:border-white/30 text-white hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              {isAccountingPage ? (
                <>
                  <Home className="w-4 h-4" />
                  <span>메인화면</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>회계관리</span>
                </>
              )}
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center text-sm text-blue-100 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
            <Clock className="w-4 h-4 mr-2 text-blue-200" />
            <span className="font-medium">{currentDateTime}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/20">
              <UserButton afterSignOutUrl="/" />
            </div>
            
            <Link href="/sign-out">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white transition-all duration-300">
                <LogOut className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 