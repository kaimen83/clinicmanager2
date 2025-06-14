'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import ConsultationPayment from '@/components/ConsultationPayment';
import { 
  Receipt, 
  FileText, 
  BarChart3, 
  CreditCard, 
  Users, 
  ShoppingCart, 
  Calendar, 
  Plus
} from 'lucide-react';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('payment');

  return (
    <div className="container mx-auto px-6 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1 bg-gray-100 rounded-xl">
          <TabsTrigger
            value="payment"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              상담/진료비 수납
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="documents"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              증빙자료 현황
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="daily-report"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              종합일계표
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="card-sales"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              카드매출/입금
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="patient-analysis"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              환자분석
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="purchase-ledger"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              매입원장
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="management-schedule"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              경영관리 일정
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="add-features"
            className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200 hover:bg-white/50"
          >
            <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              기능추가
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment">
          <ConsultationPayment />
        </TabsContent>

        <TabsContent value="documents">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">증빙자료 현황 기능이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-report">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">종합일계표 기능이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="card-sales">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">카드매출/입금 기능이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patient-analysis">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">환자분석 기능이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-ledger">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">매입원장 기능이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management-schedule">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">경영관리 일정 기능이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-features">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">기능추가 설정이 여기에 구현됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 