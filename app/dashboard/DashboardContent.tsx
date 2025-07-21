'use client';

import { ReactNode, useState } from 'react';
import { useDateContext } from '@/lib/context/dateContext';
import ClinicNavigation from '@/components/ClinicNavigation';
import DoctorPatientList from '@/components/DoctorPatientList';
import ClinicStats from '@/components/ClinicStats';
import ExtraIncomeList from '@/components/ExtraIncomeList';
import ExpenseList from '@/components/ExpenseList';
import DailySettlementModal from '@/components/DailySettlementModal';
import MonthlySettlementModal from '@/components/MonthlySettlementModal';
import SpeedDialFAB, { FABAction } from '@/components/SpeedDialFAB';
import PatientSearchModal from '@/components/PatientSearchModal';
import PatientInfoModal from '@/components/PatientInfoModal';
import NoticeCreateModal from '@/components/NoticeCreateModal';
import NoticeBoard from '@/components/NoticeBoard';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Wallet, Calculator, Search, Megaphone } from 'lucide-react';

type Props = {
  children?: ReactNode;
};

export default function DashboardContent({ children: _ }: Props) {
  const { selectedDate, setSelectedDate } = useDateContext();
  const [isDailySettlementModalOpen, setIsDailySettlementModalOpen] = useState(false);
  const [isMonthlySettlementModalOpen, setIsMonthlySettlementModalOpen] = useState(false);
  const [isPatientSearchModalOpen, setIsPatientSearchModalOpen] = useState(false);
  const [isPatientInfoModalOpen, setIsPatientInfoModalOpen] = useState(false);
  const [isNoticeCreateModalOpen, setIsNoticeCreateModalOpen] = useState(false);
  const [selectedChartNumber, setSelectedChartNumber] = useState('');

  // Speed Dial actions
  const fabActions: FABAction[] = [
    {
      icon: <Search className="w-5 h-5" />,
      label: '환자 검색',
      onClick: () => setIsPatientSearchModalOpen(true)
    },
    {
      icon: <Megaphone className="w-5 h-5" />,
      label: '공지사항 작성',
      onClick: () => setIsNoticeCreateModalOpen(true)
    }
  ];

  // 환자 선택 핸들러
  const handlePatientSelect = (chartNumber: string) => {
    setSelectedChartNumber(chartNumber);
    setIsPatientSearchModalOpen(false);
    setIsPatientInfoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClinicNavigation />
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            <DoctorPatientList date={selectedDate} />
            <ExpenseList date={selectedDate} />
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Stats Card */}
            <Card className="border-0 shadow-sm bg-white">
              <div className="p-6">
                <ClinicStats 
                  date={selectedDate} 
                  onDailySettlement={() => setIsDailySettlementModalOpen(true)}
                  onMonthlySettlement={() => setIsMonthlySettlementModalOpen(true)}
                />
              </div>
            </Card>
            
            {/* Extra Income Card */}
            <Card className="border-0 shadow-sm bg-white">
              <div className="p-6">
                <ExtraIncomeList date={selectedDate} />
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Daily Settlement Modal */}
      <DailySettlementModal
        isOpen={isDailySettlementModalOpen}
        onClose={() => setIsDailySettlementModalOpen(false)}
        date={selectedDate}
        onDateChange={(newDate) => {
          setSelectedDate(newDate);
        }}
      />

      {/* Monthly Settlement Modal */}
      <MonthlySettlementModal
        isOpen={isMonthlySettlementModalOpen}
        onClose={() => setIsMonthlySettlementModalOpen(false)}
        date={selectedDate}
        onDateChange={(newDate) => {
          setSelectedDate(newDate);
        }}
      />

      {/* Speed Dial FAB */}
      <SpeedDialFAB actions={fabActions} />

      {/* 환자 검색 모달 */}
      <PatientSearchModal
        isOpen={isPatientSearchModalOpen}
        onClose={() => setIsPatientSearchModalOpen(false)}
        onPatientSelect={handlePatientSelect}
      />

      {/* 환자 정보 모달 */}
      <PatientInfoModal
        isOpen={isPatientInfoModalOpen}
        onClose={() => setIsPatientInfoModalOpen(false)}
        chartNumber={selectedChartNumber}
      />

      {/* 공지사항 작성 모달 */}
      <NoticeCreateModal
        isOpen={isNoticeCreateModalOpen}
        onClose={() => setIsNoticeCreateModalOpen(false)}
      />

      {/* 공지사항 보드 */}
      <NoticeBoard
        isCreateModalOpen={isNoticeCreateModalOpen}
        setIsCreateModalOpen={setIsNoticeCreateModalOpen}
      />
    </div>
  );
} 