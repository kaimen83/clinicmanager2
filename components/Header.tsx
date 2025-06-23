'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { LogOut, Clock, Calculator, Home, Menu, X } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { getCurrentKstDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Typography } from '@/components/ui/typography';

export default function Header() {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  
  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="w-full bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 shadow-md sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        {/* Desktop Header */}
        <div className="flex justify-between items-center">
          {/* Left Section - Logo & Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
                <Typography variant="label" className="text-white font-bold text-lg">
                  IC
                </Typography>
              </div>
              <div>
                <Typography variant="h4" className="text-gray-900 font-bold leading-none">
                  인천센터치과
                </Typography>
                <Typography variant="body" className="text-gray-600 text-xs leading-none mt-1">
                  경영관리시스템
                </Typography>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <Link href={isAccountingPage ? "/dashboard" : "/accounting"}>
                <EnhancedButton 
                  variant="outline" 
                  size="sm"
                  leftIcon={isAccountingPage ? <Home className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {isAccountingPage ? '메인화면' : '회계관리'}
                </EnhancedButton>
              </Link>
            </div>
          </div>
          
          {/* Right Section - Time & User */}
          <div className="flex items-center gap-4">
            {/* Desktop Time Display */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-200">
              <Clock className="w-4 h-4 mr-2 text-primary-500" />
              <Typography variant="body" className="font-medium">
                {currentDateTime}
              </Typography>
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-full p-1 shadow-sm border border-gray-200">
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                />
              </div>
              
              <div className="hidden sm:block">
                <Link href="/sign-out">
                  <EnhancedButton 
                    variant="ghost" 
                    size="sm"
                    iconOnly
                    aria-label="로그아웃"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                  </EnhancedButton>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="lg:hidden">
              <EnhancedButton
                variant="ghost"
                size="sm"
                iconOnly
                onClick={toggleMobileMenu}
                aria-label="메뉴 열기"
                className="text-gray-600 hover:text-gray-900"
              >
                <Menu className="h-5 w-5" />
              </EnhancedButton>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-3">
              {/* Mobile Time Display */}
              <div className="md:hidden flex items-center bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-200">
                <Clock className="w-4 h-4 mr-2 text-primary-500" />
                <Typography variant="body" className="font-medium">
                  {currentDateTime}
                </Typography>
              </div>

              {/* Mobile Navigation */}
              <Link href={isAccountingPage ? "/dashboard" : "/accounting"}>
                <EnhancedButton 
                  variant="outline" 
                  size="md"
                  leftIcon={isAccountingPage ? <Home className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                  className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {isAccountingPage ? '메인화면' : '회계관리'}
                </EnhancedButton>
              </Link>

              {/* Mobile Logout */}
              <Link href="/sign-out" className="sm:hidden">
                <EnhancedButton 
                  variant="ghost" 
                  size="md"
                  leftIcon={<LogOut className="h-4 w-4" />}
                  className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 justify-start"
                >
                  로그아웃
                </EnhancedButton>
              </Link>

              {/* Close Menu Button */}
              <EnhancedButton
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-4 w-4" />}
                onClick={toggleMobileMenu}
                className="text-gray-600 hover:text-gray-900 justify-start"
              >
                메뉴 닫기
              </EnhancedButton>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 