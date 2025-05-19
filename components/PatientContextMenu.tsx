'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  UserRound, 
  ClipboardList,
  X
} from 'lucide-react';

type Position = {
  x: number;
  y: number;
};

type Props = {
  chartNumber: string;
  patientName: string;
  position: Position;
  onClose: () => void;
  onViewLogs: () => void;
  onShowPatientInfo: () => void;
};

export default function PatientContextMenu({
  chartNumber,
  patientName,
  position,
  onClose,
  onViewLogs,
  onShowPatientInfo
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 컨텍스트 메뉴가 화면 밖으로 나가지 않도록 위치 조정
  const [adjustedPosition, setAdjustedPosition] = useState<Position>(position);
  
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      // 오른쪽 경계 확인
      if (position.x + rect.width > windowWidth) {
        newX = windowWidth - rect.width - 10;
      }
      
      // 아래쪽 경계 확인
      if (position.y + rect.height > windowHeight) {
        newY = windowHeight - rect.height - 10;
      }
      
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);
  
  return (
    <div
      ref={menuRef}
      className="absolute bg-white border rounded-md shadow-md z-50 w-48 overflow-hidden"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`
      }}
    >
      <div className="flex justify-between items-center p-2 bg-gray-100 border-b">
        <span className="font-medium text-sm truncate">{patientName}</span>
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="py-1">
        <button
          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-100"
          onClick={onShowPatientInfo}
        >
          <UserRound className="h-4 w-4" />
          <span>환자정보</span>
        </button>
        
        <button
          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-100"
          onClick={onViewLogs}
        >
          <ClipboardList className="h-4 w-4" />
          <span>로그보기</span>
        </button>
      </div>
    </div>
  );
} 