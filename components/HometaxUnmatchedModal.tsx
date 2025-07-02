'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toISODateString } from '@/lib/utils';
import { Trash2, AlertCircle, Calendar, DollarSign } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  type: 'daily' | 'monthly';
};

interface UnmatchedRecord {
  _id: string;
  거래일자: string;
  공급가액: number;
  매입금액: number;
  승인번호: string;
  발급수단: string;
  거래구분: string;
  사용구분: string;
  비고: string;
  verifiedAt: Date;
  status: string;
}

export default function HometaxUnmatchedModal({ isOpen, onClose, date, type }: Props) {
  const [unmatchedData, setUnmatchedData] = useState<Record<string, UnmatchedRecord[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 매칭되지 않은 데이터 조회
  const fetchUnmatchedData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (type === 'daily') {
        queryParams.append('dateStart', toISODateString(date));
        queryParams.append('dateEnd', toISODateString(date));
      } else {
        // 월간 조회의 경우 해당 월의 전체 기간
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        queryParams.append('dateStart', toISODateString(startOfMonth));
        queryParams.append('dateEnd', toISODateString(endOfMonth));
      }
      
      const response = await fetch(`/api/hometax/unmatched?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('매칭되지 않은 데이터 조회에 실패했습니다.');
      }
      
      const data = await response.json();
      setUnmatchedData(data.data || {});
    } catch (error) {
      console.error('매칭되지 않은 데이터 조회 에러:', error);
      alert('매칭되지 않은 데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 데이터 조회
  useEffect(() => {
    if (isOpen) {
      fetchUnmatchedData();
      setSelectedIds([]);
    }
  }, [isOpen, date, type]);

  // 선택 토글
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    const allIds = Object.values(unmatchedData).flat().map(item => item._id);
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds);
  };

  // 선택된 항목 삭제
  const deleteSelectedItems = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}개의 항목을 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/hometax/unmatched', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`${data.deletedCount}건이 삭제되었습니다.`);
        setSelectedIds([]);
        fetchUnmatchedData(); // 목록 새로고침
      } else {
        alert('삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('삭제 에러:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 형식화
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'yyyy-MM-dd', { locale: ko });
  };

  const totalUnmatchedCount = Object.values(unmatchedData).flat().length;
  const sortedDates = Object.keys(unmatchedData).sort().reverse();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                홈택스 데이터
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                홈택스의 현금영수증 데이터입니다
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              총 {totalUnmatchedCount}건
            </Badge>
            {totalUnmatchedCount > 0 && (
              <div className="text-sm text-gray-600">
                기간: {type === 'daily' ? formatDate(toISODateString(date)) : `${date.getFullYear()}년 ${date.getMonth() + 1}월`}
              </div>
            )}
          </div>
          
          {selectedIds.length > 0 && (
            <Button
              onClick={deleteSelectedItems}
              disabled={isDeleting}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2"
            >
              <Trash2 className="h-4 w-4" />
              선택 삭제 ({selectedIds.length})
            </Button>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-orange-600">
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">데이터를 불러오는 중...</span>
              </div>
            </div>
          ) : totalUnmatchedCount === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 text-3xl opacity-50">✅</div>
              <div className="text-gray-500 font-medium">
                매칭되지 않은 데이터가 없습니다
              </div>
              <div className="text-sm text-gray-400 mt-2">
                모든 홈택스 데이터가 시스템과 정상적으로 매칭되었습니다
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(dateKey => (
                <div key={dateKey} className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-gray-800">{formatDate(dateKey)}</span>
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          {unmatchedData[dateKey].length}건
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unmatchedData[dateKey].every(item => selectedIds.includes(item._id))}
                            onChange={() => {
                              const dateIds = unmatchedData[dateKey].map(item => item._id);
                              const allSelected = dateIds.every(id => selectedIds.includes(id));
                              if (allSelected) {
                                setSelectedIds(prev => prev.filter(id => !dateIds.includes(id)));
                              } else {
                                setSelectedIds(prev => [...new Set([...prev, ...dateIds])]);
                              }
                            }}
                            className="rounded"
                          />
                          날짜별 전체 선택
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[50px] text-center">선택</TableHead>
                        <TableHead className="w-[140px]">승인번호</TableHead>
                        <TableHead className="w-[110px]">발급수단</TableHead>
                        <TableHead className="w-[120px] text-right">공급가액</TableHead>
                        <TableHead className="w-[120px] text-right">총금액</TableHead>
                        <TableHead className="w-[110px]">거래구분</TableHead>
                        <TableHead>비고</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatchedData[dateKey].map((record, index) => (
                        <TableRow 
                          key={record._id}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            selectedIds.includes(record._id) ? 'bg-blue-50 border-blue-200' : 
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                        >
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(record._id)}
                              onChange={() => toggleSelection(record._id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="py-3 text-sm font-mono">{record.승인번호}</TableCell>
                          <TableCell className="py-3 text-sm">{record.발급수단}</TableCell>
                          <TableCell className="py-3 text-sm text-right font-semibold">
                            ₩{formatAmount(record.공급가액)}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-right font-bold text-orange-700">
                            ₩{formatAmount(record.매입금액)}
                          </TableCell>
                          <TableCell className="py-3 text-sm">{record.거래구분}</TableCell>
                          <TableCell className="py-3 text-sm text-gray-600">{record.비고}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {totalUnmatchedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 rounded-b-xl">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  총 <span className="font-bold text-gray-900 text-base">{totalUnmatchedCount}</span>건
                </div>
                <div className="text-sm text-gray-600">
                  선택: <span className="font-bold text-blue-700">{selectedIds.length}</span>건
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">총 금액</span>
                <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  ₩{formatAmount(Object.values(unmatchedData).flat().reduce((sum, record) => sum + record.매입금액, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 