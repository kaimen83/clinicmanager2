"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // 캘린더가 렌더링된 후 실행될 이펙트
  React.useEffect(() => {
    // 날짜 선택 시 캘린더가 자동으로 닫히도록 이벤트 핸들러 추가
    const handleDayClick = () => {
      // 약간의 지연 후 포커스 제거 (선택이 제대로 처리되도록)
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 100);
    };

    // 캘린더의 버튼 요소들에 이벤트 리스너 추가
    const calendarButtons = document.querySelectorAll('.rdp-button');
    calendarButtons.forEach(button => {
      button.addEventListener('click', handleDayClick);
    });

    return () => {
      // 정리 함수에서 이벤트 리스너 제거
      calendarButtons.forEach(button => {
        button.removeEventListener('click', handleDayClick);
      });
    };
  }, []);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white rounded-lg shadow-sm border border-gray-100", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-lg font-semibold text-gray-800",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-9 w-9 bg-white border border-gray-200 rounded-lg p-0 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        head_cell:
          "text-gray-500 rounded-md w-10 h-10 font-medium text-sm flex items-center justify-center",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-blue-50 [&:has([aria-selected].day-outside)]:bg-blue-50/50",
          "[&:has([aria-selected].day-range-end)]:rounded-r-lg",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-lg [&:has(>.day-range-start)]:rounded-l-lg first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg"
            : "[&:has([aria-selected])]:rounded-lg"
        ),
        day: cn(
          "h-10 w-10 p-0 font-normal text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          "aria-selected:opacity-100"
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 focus:text-white shadow-md",
        today: "relative bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 ring-2 ring-emerald-200 ring-offset-2 scale-105 after:absolute after:top-0 after:right-0 after:w-2 after:h-2 after:bg-yellow-400 after:rounded-full after:shadow-sm after:animate-bounce",
        outside:
          "day-outside text-gray-400 aria-selected:bg-blue-50/50 aria-selected:text-gray-400",
        disabled: "text-gray-300 opacity-50 cursor-not-allowed",
        range_middle:
          "aria-selected:bg-blue-50 aria-selected:text-blue-700",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4 text-gray-600" {...props} />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
