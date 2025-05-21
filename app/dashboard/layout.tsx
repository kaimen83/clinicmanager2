'use client';

import Header from "@/components/Header";
import ClinicNavigation from "@/components/ClinicNavigation";
import { DateProvider } from "@/lib/context/dateContext";
import DashboardContent from "./DashboardContent";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DateProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <div className="container mx-auto px-4 py-6 pb-20 flex-1 overflow-hidden">
          <ClinicNavigation />
          
          <div className="mt-6">
            <DashboardContent>
              {children}
            </DashboardContent>
          </div>
        </div>
        
        <footer className="border-t py-6 bg-white mt-auto">
          <div className="container mx-auto text-center text-sm text-gray-500">
            &copy; 2025 인천센터치과. All right reserved.
          </div>
        </footer>
      </div>
    </DateProvider>
  );
} 