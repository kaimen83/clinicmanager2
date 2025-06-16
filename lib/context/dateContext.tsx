'use client';

import { createContext, useState, useContext, ReactNode } from 'react';
import { getCurrentKstDate } from '../utils';

type DateContextType = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  cashRefreshTrigger: number;
  triggerCashRefresh: () => void;
  statsRefreshTrigger: number;
  triggerStatsRefresh: () => void;
  expenseRefreshTrigger: number;
  triggerExpenseRefresh: () => void;
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentKstDate());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [cashRefreshTrigger, setCashRefreshTrigger] = useState<number>(0);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState<number>(0);
  const [expenseRefreshTrigger, setExpenseRefreshTrigger] = useState<number>(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const triggerCashRefresh = () => {
    setCashRefreshTrigger(prev => prev + 1);
  };

  const triggerStatsRefresh = () => {
    setStatsRefreshTrigger(prev => prev + 1);
  };

  const triggerExpenseRefresh = () => {
    setExpenseRefreshTrigger(prev => prev + 1);
  };

  return (
    <DateContext.Provider value={{ 
      selectedDate, 
      setSelectedDate, 
      refreshTrigger, 
      triggerRefresh,
      cashRefreshTrigger,
      triggerCashRefresh,
      statsRefreshTrigger,
      triggerStatsRefresh,
      expenseRefreshTrigger,
      triggerExpenseRefresh
    }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateContext() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDateContext must be used within a DateProvider');
  }
  return context;
}

// DateProvider가 없을 때도 안전하게 사용할 수 있는 hook
export function useDateContextSafe() {
  const context = useContext(DateContext);
  
  // DateProvider가 없으면 빈 함수들을 반환
  if (context === undefined) {
    return {
      selectedDate: getCurrentKstDate(),
      setSelectedDate: () => {},
      refreshTrigger: 0,
      triggerRefresh: () => {},
      cashRefreshTrigger: 0,
      triggerCashRefresh: () => {},
      statsRefreshTrigger: 0,
      triggerStatsRefresh: () => {},
      expenseRefreshTrigger: 0,
      triggerExpenseRefresh: () => {}
    };
  }
  
  return context;
} 