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
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentKstDate());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [cashRefreshTrigger, setCashRefreshTrigger] = useState<number>(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const triggerCashRefresh = () => {
    setCashRefreshTrigger(prev => prev + 1);
  };

  return (
    <DateContext.Provider value={{ 
      selectedDate, 
      setSelectedDate, 
      refreshTrigger, 
      triggerRefresh,
      cashRefreshTrigger,
      triggerCashRefresh
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