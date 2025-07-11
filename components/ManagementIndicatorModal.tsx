'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, MessageSquare, CreditCard, Calendar, Activity, Target, PieChart } from 'lucide-react';

interface ManagementIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManagementIndicatorModal({ isOpen, onClose }: ManagementIndicatorModalProps) {
  const [activeTab, setActiveTab] = useState('visit');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <DialogTitle className="text-2xl font-bold text-gray-800">경영지표 대시보드</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-14 mb-6 bg-gray-100/50">
              <TabsTrigger 
                value="visit" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <Users className="h-4 w-4" />
                내원지표
              </TabsTrigger>
              <TabsTrigger 
                value="revenue" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <TrendingUp className="h-4 w-4" />
                매출지표
              </TabsTrigger>
              <TabsTrigger 
                value="consultation" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4" />
                상담지표
              </TabsTrigger>
              <TabsTrigger 
                value="expense" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <CreditCard className="h-4 w-4" />
                지출지표
              </TabsTrigger>
            </TabsList>

            {/* 내원지표 탭 */}
            <TabsContent value="visit" className="space-y-4 mt-0">
              {/* 내원지표 컨텐츠 */}
            </TabsContent>

            {/* 매출지표 탭 */}
            <TabsContent value="revenue" className="space-y-4 mt-0">
              {/* 매출지표 컨텐츠 */}
            </TabsContent>

            {/* 상담지표 탭 */}
            <TabsContent value="consultation" className="space-y-4 mt-0">
              {/* 상담지표 컨텐츠 */}
            </TabsContent>

            {/* 지출지표 탭 */}
            <TabsContent value="expense" className="space-y-4 mt-0">
              {/* 지출지표 컨텐츠 */}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}