"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  className?: string
  classNames?: Record<string, string>
  showOutsideDays?: boolean
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  mode?: "single"
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(() => {
    return selected || new Date()
  })

  const today = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  // 날짜 선택 핸들러
  const handleDateSelect = (date: Date) => {
    if (disabled && disabled(date)) return
    onSelect?.(date)
  }

  // 달력 날짜 생성
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
    const firstDayWeekday = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      isToday: boolean
      isSelected: boolean
    }> = []

    // 이전 달의 마지막 날짜들
    const prevMonth = new Date(currentYear, currentMonth - 1, 0)
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonth.getDate() - i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isSelected: selected ? isSameDay(date, selected) : false
      })
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        isSelected: selected ? isSameDay(date, selected) : false
      })
    }

    // 다음 달의 첫 날짜들
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isSelected: selected ? isSameDay(date, selected) : false
      })
    }

    return days
  }

  // 같은 날인지 확인
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className={cn("p-6 bg-white rounded-2xl shadow-xl border border-gray-100", className)} {...props}>
      {/* 헤더 - 월 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:scale-105 shadow-sm"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="text-xl font-bold text-gray-800 px-4">
          {currentYear}년 {MONTHS[currentMonth]}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:scale-105 shadow-sm"
          aria-label="다음 달"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              "h-10 flex items-center justify-center text-sm font-medium",
              index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-gray-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const isDisabled = disabled && disabled(day.date)
          
          return (
            <button
              key={index}
              onClick={() => handleDateSelect(day.date)}
              disabled={isDisabled}
              className={cn(
                "h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 relative",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                
                // 기본 스타일
                day.isCurrentMonth 
                  ? "text-gray-900 hover:bg-gray-100" 
                  : showOutsideDays 
                    ? "text-gray-400 hover:bg-gray-50" 
                    : "invisible",
                
                // 오늘 날짜 스타일
                day.isToday && day.isCurrentMonth && !day.isSelected && 
                  "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:from-blue-600 hover:to-blue-700",
                
                // 선택된 날짜 스타일
                day.isSelected && 
                  "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg ring-2 ring-emerald-200",
                
                // 비활성화된 날짜
                isDisabled && "opacity-50 cursor-not-allowed hover:scale-100",
                
                // 일요일/토요일 색상
                !day.isSelected && !day.isToday && day.isCurrentMonth && (
                  index % 7 === 0 ? "text-red-600" : 
                  index % 7 === 6 ? "text-blue-600" : ""
                )
              )}
            >
              {day.date.getDate()}
              
              {/* 오늘 날짜 표시 점 */}
              {day.isToday && !day.isSelected && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
