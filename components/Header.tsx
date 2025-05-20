'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentKstDate } from '@/lib/utils';

export default function Header() {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  
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
  
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto flex justify-between items-center py-4">
        <h1 className="text-2xl font-bold text-primary">인천센터치과 경영프로그램</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>{currentDateTime}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            
            <Link href="/sign-out">
              <Button variant="ghost" size="icon">
                <LogOut className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 