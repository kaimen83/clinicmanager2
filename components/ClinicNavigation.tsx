'use client';

import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { 
  UserPlus, 
  CreditCard, 
  DollarSign, 
  Calculator, 
  ShoppingCart, 
  ClipboardList, 
  Star, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { cn, getCurrentKstDate } from "@/lib/utils";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useDateContext } from "@/lib/context/dateContext";
import SystemSettingsModal from "./SystemSettingsModal";
import PatientTransactionForm from "./PatientTransactionForm";
import ExtraIncomeModal from "./ExtraIncomeModal";
import ExpenseModal from "./ExpenseModal";
import CashManagementModal from "./CashManagementModal";
import SupplyModal from "./SupplyModal";
import DentalProductInventoryModal from "./DentalProductInventoryModal";
import ImplantInventoryModal from "./ImplantInventoryModal";
import { ExtraIncome, Expense } from "@/lib/types";
import { toast } from "sonner";

export default function ClinicNavigation() {
  const { selectedDate, setSelectedDate, triggerRefresh, triggerCashRefresh, triggerExpenseRefresh, triggerStatsRefresh } = useDateContext();
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isExtraIncomeModalOpen, setIsExtraIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCashManagementModalOpen, setIsCashManagementModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isDentalProductInventoryModalOpen, setIsDentalProductInventoryModalOpen] = useState(false);
  const [isImplantInventoryModalOpen, setIsImplantInventoryModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };
  
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };
  
  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(getCurrentKstDate());
  };

  const handlePatientFormOpen = () => {
    setIsPatientFormOpen(true);
  };

  const handlePatientFormClose = () => {
    setIsPatientFormOpen(false);
  };

  const handleExtraIncomeModalOpen = () => {
    setIsExtraIncomeModalOpen(true);
  };

  const handleExtraIncomeModalClose = () => {
    setIsExtraIncomeModalOpen(false);
  };

  const handleExpenseModalOpen = () => {
    setIsExpenseModalOpen(true);
  };

  const handleExpenseModalClose = () => {
    setIsExpenseModalOpen(false);
  };

  const handleCashManagementModalOpen = () => {
    setIsCashManagementModalOpen(true);
  };

  const handleCashManagementModalClose = () => {
    setIsCashManagementModalOpen(false);
  };

  const handleSupplyModalOpen = () => {
    setIsSupplyModalOpen(true);
  };

  const handleSupplyModalClose = () => {
    setIsSupplyModalOpen(false);
  };

  const handleDentalProductInventoryModalOpen = () => {
    setIsDentalProductInventoryModalOpen(true);
  };

  const handleDentalProductInventoryModalClose = () => {
    setIsDentalProductInventoryModalOpen(false);
  };

  const handleImplantInventoryModalOpen = () => {
    setIsImplantInventoryModalOpen(true);
  };

  const handleImplantInventoryModalClose = () => {
    setIsImplantInventoryModalOpen(false);
  };

  const handleExtraIncomeSuccess = (data: ExtraIncome) => {
    toast.success('진료외수입이 등록되었습니다.');
  };

  const handleExpenseSuccess = (data: Expense) => {
    // 지출 관련 데이터 새로고침
    triggerExpenseRefresh();
    triggerStatsRefresh();
    
    // 현금 지출인 경우 시재 데이터도 새로고침
    if (data.method === '현금') {
      triggerCashRefresh();
    }
    
    toast.success('지출이 등록되었습니다.');
  };

  const handleTransactionAdded = () => {
    // 트랜잭션이 추가된 후 데이터 새로고침
    triggerRefresh();
    triggerCashRefresh(); // 시재 데이터도 새로고침
    toast.success('내원정보가 등록되었습니다.');
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handlePatientFormOpen}
          >
            <UserPlus className="w-4 h-4" />
            <span>내원정보등록</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleExtraIncomeModalOpen}
          >
            <CreditCard className="w-4 h-4" />
            <span>진료 외 수입</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleExpenseModalOpen}
          >
            <DollarSign className="w-4 h-4" />
            <span>지출등록</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCashManagementModalOpen}
          >
            <Calculator className="w-4 h-4" />
            <span>시재관리</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleSupplyModalOpen}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>매입원장</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span>수불부</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDentalProductInventoryModalOpen}>
                구강용품 수불부
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImplantInventoryModalOpen}>
                임플란트 수불부
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>병원리뷰</span>
          </Button>
          
          <SystemSettingsModal />
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousDay} 
            title="이전 날짜"
            className="h-10 w-10 rounded-lg border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </Button>
          
          <div className="grid gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-medium px-4 py-2 h-10 min-w-[220px]",
                    "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300",
                    "rounded-lg transition-all duration-200 shadow-sm hover:shadow-md",
                    !selectedDate && "text-gray-400"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4 text-blue-600" />
                  {selectedDate ? (
                    <span className="text-gray-800">{format(selectedDate, "PPP (EEEE)", { locale: ko })}</span>
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextDay} 
            title="다음 날짜"
            className="h-10 w-10 rounded-lg border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </Button>
          
          <Button 
            onClick={goToToday}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            오늘
          </Button>
        </div>
      </div>

      {/* 내원정보 등록 폼 */}
      <PatientTransactionForm 
        isOpen={isPatientFormOpen}
        onClose={handlePatientFormClose}
        onTransactionAdded={handleTransactionAdded}
      />

      {/* 진료외수입 등록 모달 */}
      <ExtraIncomeModal
        isOpen={isExtraIncomeModalOpen}
        onClose={handleExtraIncomeModalClose}
        onSuccess={handleExtraIncomeSuccess}
        defaultDate={selectedDate}
      />

      {/* 지출 등록 모달 */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={handleExpenseModalClose}
        onSuccess={handleExpenseSuccess}
        defaultDate={selectedDate}
      />

      {/* 시재관리 모달 */}
      <CashManagementModal
        isOpen={isCashManagementModalOpen}
        onClose={handleCashManagementModalClose}
        date={selectedDate}
      />

      {/* 매입원장 모달 */}
      <SupplyModal
        isOpen={isSupplyModalOpen}
        onClose={handleSupplyModalClose}
        date={selectedDate}
      />

      {/* 구강용품 수불부 모달 */}
      <DentalProductInventoryModal
        isOpen={isDentalProductInventoryModalOpen}
        onClose={handleDentalProductInventoryModalClose}
      />

      {/* 임플란트 수불부 모달 */}
      <ImplantInventoryModal
        isOpen={isImplantInventoryModalOpen}
        onClose={handleImplantInventoryModalClose}
      />
    </Card>
  );
} 