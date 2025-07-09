'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseUserActivityOptions {
  onActivity: () => void;
  throttleMs?: number;
  events?: string[];
}

export function useUserActivity({ 
  onActivity, 
  throttleMs = 2000, // 2초 간격으로 제한
  events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart']
}: UseUserActivityOptions) {
  const lastActivityRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // 스로틀링: 마지막 활동으로부터 일정 시간이 지나야 실행
    if (now - lastActivityRef.current > throttleMs) {
      lastActivityRef.current = now;
      
      // 디바운싱: 연속된 이벤트를 하나로 묶음
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        onActivity();
      }, 500); // 500ms 후 실행
    }
  }, [onActivity, throttleMs]);

  useEffect(() => {
    // 이벤트 리스너 등록
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 클린업
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleActivity, events]);
}