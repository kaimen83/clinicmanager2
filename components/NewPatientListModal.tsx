'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, UserPlus } from 'lucide-react';
import { toISODateString } from '@/lib/utils';

// 신환 데이터 타입 정의
type NewPatient = {
  _id: string;
  date: string | Date;
  chartNumber: string;
  patientName: string;
  paymentMethod: string;
  paymentAmount: number;
  visitPath: string;
  doctor: string;
  treatments: string[];
  treatmentDetails: any[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date: Date;
  type: 'daily' | 'monthly'; // 일간 또는 월간 통계
};

export default function NewPatientListModal({ isOpen, onClose, title, date, type }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [newPatients, setNewPatients] = useState<NewPatient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<NewPatient[]>([]);

  // 신환 목록 조회
  const fetchNewPatients = async () => {
    setIsLoading(true);
    
    try {
      let dateParam;
      if (type === 'daily') {
        dateParam = toISODateString(date);
      } else {
        // YYYY-MM 형식으로 변환 (한국 시간대 고려)
        dateParam = toISODateString(date).substring(0, 7);
      }
      
      const queryParams = new URLSearchParams({
        dateType: type,
        date: dateParam,
      });
      
      const response = await fetch(`/api/patients/new-patients?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('신환 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const sortedPatients = sortPatientsByDate(data.newPatients || []);
      setNewPatients(sortedPatients);
      setFilteredPatients(sortedPatients);
    } catch (error) {
      console.error('신환 목록 조회 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 신환 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchNewPatients();
      setSearchTerm('');
    }
  }, [isOpen, date, type]);

  // 신환 정렬 함수 (오름차순)
  const sortPatientsByDate = (patients: NewPatient[]) => {
    return [...patients].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  // 검색어 변경 처리
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(sortPatientsByDate(newPatients));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = newPatients.filter(
        (patient) =>
          patient.chartNumber?.toLowerCase().includes(term) ||
          patient.patientName?.toLowerCase().includes(term) ||
          patient.visitPath?.toLowerCase().includes(term)
      );
      setFilteredPatients(sortPatientsByDate(filtered));
    }
  }, [searchTerm, newPatients]);

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 형식화
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd', { locale: ko });
  };

  // 결제방법별 색상 지정
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case '카드':
        return 'text-blue-700 bg-blue-50';
      case '현금':
        return 'text-green-700 bg-green-50';
      case '계좌이체':
        return 'text-purple-700 bg-purple-50';
      case '복합':
        return 'text-orange-700 bg-orange-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  // 내원경로별 색상 지정
  const getVisitPathColor = (path: string) => {
    switch (path) {
      case '내원검진':
        return 'text-emerald-700 bg-emerald-50';
      case '환자가족':
        return 'text-orange-700 bg-orange-50';
      case '지인소개':
        return 'text-indigo-700 bg-indigo-50';
      case '광고':
        return 'text-red-700 bg-red-50';
      case '인터넷':
        return 'text-cyan-700 bg-cyan-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="차트번호, 환자명 또는 내원경로로 검색"
                className="pl-10 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-green-600">
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">데이터를 불러오는 중...</span>
              </div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 text-3xl opacity-50">👋</div>
              <div className="text-gray-500 font-medium">
                {searchTerm ? '검색 결과가 없습니다.' : '해당 기간에 신환이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <TableRow className="border-b border-gray-200">
                    <TableHead className="w-[100px] font-semibold text-gray-700 py-4 text-sm">날짜</TableHead>
                    <TableHead className="w-[80px] font-semibold text-gray-700 py-4 text-sm">차트번호</TableHead>
                    <TableHead className="w-[120px] font-semibold text-gray-700 py-4 text-sm">환자명</TableHead>
                    <TableHead className="w-[100px] font-semibold text-gray-700 py-4 text-sm">내원경로</TableHead>
                    <TableHead className="w-[90px] font-semibold text-gray-700 py-4 text-sm">결제방법</TableHead>
                    <TableHead className="w-[80px] font-semibold text-gray-700 py-4 text-sm">담당의</TableHead>
                    <TableHead className="w-[200px] font-semibold text-gray-700 py-4 text-sm">치료내역</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-gray-700 py-4 text-sm pr-6">결제금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient, index) => (
                    <TableRow 
                      key={patient._id} 
                      className={`hover:bg-green-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <TableCell className="py-3.5 text-gray-700 font-medium text-sm whitespace-nowrap">
                        {formatDate(patient.date)}
                      </TableCell>
                      <TableCell className="py-3.5 text-gray-800 font-semibold text-sm">
                        {patient.chartNumber}
                      </TableCell>
                      <TableCell className="py-3.5 text-gray-800 font-medium text-sm">
                        {patient.patientName}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getVisitPathColor(patient.visitPath)}`}>
                          {patient.visitPath}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentMethodColor(patient.paymentMethod)}`}>
                          {patient.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-medium text-gray-700">
                        {patient.doctor}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-medium">
                        <div className="flex flex-wrap gap-1">
                          {patient.treatments.map((treatment, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium"
                            >
                              {treatment}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3.5 font-bold text-gray-900 pr-6 text-sm">
                        ₩{formatAmount(patient.paymentAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Footer with total */}
        {filteredPatients.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-b-xl">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  총 <span className="font-bold text-gray-900 text-base">{filteredPatients.length}</span>명의 신환
                </div>
                <div className="text-sm text-gray-600">
                  총 치료건수: <span className="font-bold text-blue-700">
                    {filteredPatients.reduce((sum, p) => sum + p.treatments.length, 0)}건
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">총 결제금액</span>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ₩{formatAmount(filteredPatients.reduce((sum, p) => sum + p.paymentAmount, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}