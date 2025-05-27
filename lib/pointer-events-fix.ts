// Radix UI Dialog pointer-events 버그 해결을 위한 유틸리티

/**
 * body의 pointer-events를 강제로 복원하는 함수
 */
export function forceRestorePointerEvents(): void {
  document.body.style.pointerEvents = '';
  document.body.style.removeProperty('pointer-events');
}

/**
 * 모달이 닫힌 후 pointer-events를 안전하게 복원하는 함수
 * @param delay 복원까지의 지연 시간 (기본값: 300ms)
 */
export function safeRestorePointerEvents(delay: number = 300): void {
  // 즉시 복원 시도
  forceRestorePointerEvents();
  
  // 지연 후 다시 복원 (애니메이션 완료 후)
  setTimeout(() => {
    forceRestorePointerEvents();
  }, delay);
}

/**
 * pointer-events 상태를 모니터링하고 자동으로 복원하는 함수
 */
export function startPointerEventsMonitor(): () => void {
  let intervalId: NodeJS.Timeout;
  
  const checkAndRestore = () => {
    const bodyStyle = window.getComputedStyle(document.body);
    const pointerEvents = bodyStyle.pointerEvents;
    
    // 모달이 열려있지 않은데 pointer-events가 none인 경우
    const hasOpenModal = document.querySelector('[data-state="open"]');
    
    if (pointerEvents === 'none' && !hasOpenModal) {
      console.warn('Detected stuck pointer-events: none, restoring...');
      forceRestorePointerEvents();
    }
  };
  
  // 1초마다 체크
  intervalId = setInterval(checkAndRestore, 1000);
  
  // cleanup 함수 반환
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * 모달 컴포넌트에서 사용할 수 있는 안전한 onOpenChange 핸들러
 */
export function createSafeOnOpenChange(
  originalOnClose: () => void,
  additionalCleanup?: () => void
) {
  return (open: boolean) => {
    if (!open) {
      // 모달이 닫힐 때 pointer-events 복원
      safeRestorePointerEvents();
      
      // 추가 cleanup 실행
      if (additionalCleanup) {
        additionalCleanup();
      }
      
      // 원래 onClose 핸들러 실행
      originalOnClose();
    }
  };
} 