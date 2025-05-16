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
  Calendar as CalendarIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function ClinicNavigation() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    setDate(date);
    // 여기에 날짜 선택 시 동작할 로직 추가 (예: 해당 날짜의 데이터 로드)
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex items-center gap-2">
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
        </div>
        
        <div className="flex items-center gap-2">
          <div className="grid gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(date, "PPP", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button>이동</Button>
        </div>
      </div>
    </Card>
  );
} 