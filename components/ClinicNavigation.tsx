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
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay} title="이전 날짜">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="grid gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    <span>{format(selectedDate, "PPP (EEEE)", { locale: ko })}</span>
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
                  initialFocus
                  locale={ko}
                  defaultMonth={selectedDate}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button variant="outline" size="icon" onClick={goToNextDay} title="다음 날짜">
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button onClick={goToToday}>오늘</Button>
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