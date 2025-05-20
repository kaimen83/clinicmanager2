'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type PatientInfo = {
  chartNumber: string;
  name: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  address?: string;
  memo?: string;
  lastVisitDate?: string;
  visitCount?: number;
  registrationDate?: string;
  isNew?: boolean;
};

type Props = {
  isOpen: boolean;
  chartNumber: string;
  patientName: string;
  onClose: () => void;
};

export default function PatientInfoModal({
  isOpen,
  chartNumber,
  patientName,
  onClose
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isNew, setIsNew] = useState(false);
  
  useEffect(() => {
    if (isOpen && chartNumber) {
      setLoading(true);
      setError(null);
      
      // 환자 정보 조회 API 호출
      fetch(`/api/patients/${chartNumber}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('환자 정보를 조회할 수 없습니다.');
          }
          return response.json();
        })
        .then(data => {
          setPatientInfo(data);
          setIsNew(data.isNew || false);
        })
        .catch(err => {
          console.error('환자 정보 조회 오류:', err);
          setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, chartNumber]);

  // 신환 여부 변경 처리
  const handleIsNewChange = (checked: boolean) => {
    setIsNew(checked);
    
    // API를 통해 신환 여부 업데이트
    if (chartNumber) {
      fetch(`/api/patients/${chartNumber}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isNew: checked }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('환자 정보를 업데이트할 수 없습니다.');
          }
          return response.json();
        })
        .then(data => {
          setPatientInfo(prev => prev ? { ...prev, isNew: checked } : null);
        })
        .catch(err => {
          console.error('환자 정보 업데이트 오류:', err);
          // 실패 시 원래 값으로 복원
          setIsNew(!checked);
        });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>내원 정보 수정</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">정보를 불러오는 중입니다...</span>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-500">
            <p>{error}</p>
            <p className="mt-2">차트번호: {chartNumber}, 환자명: {patientName}</p>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="visit">내원 이력</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">차트번호</p>
                  <p>{patientInfo?.chartNumber || chartNumber}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">환자명</p>
                  <p>{patientInfo?.name || patientName}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">생년월일</p>
                  <p>{patientInfo?.birthDate || '-'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">성별</p>
                  <p>{patientInfo?.gender || '-'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">연락처</p>
                  <p>{patientInfo?.phoneNumber || '-'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">등록일</p>
                  <p>{patientInfo?.registrationDate ? new Date(patientInfo.registrationDate).toLocaleDateString() : '-'}</p>
                </div>
                
                <div className="flex items-center justify-between col-span-2 border-t pt-2">
                  <p className="text-sm font-medium text-gray-500">신환 여부</p>
                  <Switch 
                    checked={isNew}
                    onCheckedChange={handleIsNewChange}
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium text-gray-500">주소</p>
                <p className="break-words">{patientInfo?.address || '-'}</p>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium text-gray-500">메모</p>
                <p className="break-words whitespace-pre-wrap">{patientInfo?.memo || '-'}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="visit" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">최근 방문일</p>
                  <p>{patientInfo?.lastVisitDate ? new Date(patientInfo.lastVisitDate).toLocaleDateString() : '-'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">총 방문 횟수</p>
                  <p>{patientInfo?.visitCount || '0'}회</p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium text-gray-500">내원 이력</p>
                <p className="text-gray-400 text-sm italic">상세 내원 이력은 로그 탭에서 확인 가능합니다.</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}