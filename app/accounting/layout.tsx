'use client';

import Header from "@/components/Header";

export default function AccountingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
      
      <footer className="border-t py-6 bg-white mt-auto">
        <div className="container mx-auto text-center text-sm text-gray-500">
          &copy; 2025 인천센터치과. All right reserved.
        </div>
      </footer>
    </div>
  );
} 