'use client';

import Header from "@/components/Header";
import ClinicNavigation from "@/components/ClinicNavigation";
import { DateProvider } from "@/lib/context/dateContext";
import { UserRoleProvider } from "@/components/UserRoleProvider";
import DashboardContent from "./DashboardContent";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DateProvider>
      <UserRoleProvider>
        <div className="flex flex-col min-h-screen bg-gray-50">
          <Header />
          
          <main className="flex-1">
            <DashboardContent>
              {children}
            </DashboardContent>
          </main>
          
          <footer className="border-t border-gray-200 py-6 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
              &copy; 2025 인천센터치과. All rights reserved.
            </div>
          </footer>
        </div>
      </UserRoleProvider>
    </DateProvider>
  );
} 