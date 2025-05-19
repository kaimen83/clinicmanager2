'use client';

import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
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
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useDateContext } from "@/lib/context/dateContext";
import SystemSettingsModal from "./SystemSettingsModal";
import PatientTransactionForm from "./PatientTransactionForm";

export default function ClinicNavigation() {
  const { selectedDate, setSelectedDate } = useDateContext();
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };
  
  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handlePatientFormOpen = () => {
    setIsPatientFormOpen(true);
  };

  const handlePatientFormClose = () => {
    setIsPatientFormOpen(false);
  };

  const handleTransactionAdded = () => {
    // 트랜잭션이 추가된 후 필요한 작업 (예: 데이터 새로고침)
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
          
          <Button variant="outline" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span>진료 외 수입</span>
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>지출등록</span>
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span>시재관리</span>
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>매입원장</span>
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span>수불부</span>
          </Button>
          
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
            <Popover>
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
    </Card>
  );
} 