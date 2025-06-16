'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface CashRecord {
  _id: string;
  date: string;
  amount: number;
  isCompleted: boolean;
  isGroup?: boolean;
  totalAmount?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
}

export default function CashDepositModal({ isOpen, onClose, selectedDate }: Props) {
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // 데이터 로드
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cash-deposit/recent?date=${selectedDate}`);
      
      if (!response.ok) {
        throw new Error('데이터 로드 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error('계좌입금 데이터 로드 중 오류:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchRecords();
      setSelectedRecords(new Set());
      setSelectedGroups(new Set());
      setSelectAll(false);
    }
  }, [isOpen, selectedDate]);

  // 전체 선택/해제
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    
    if (checked) {
      const newSelectedRecords = new Set<string>();
      const newSelectedGroups = new Set<string>();
      
      records.forEach(record => {
        if (!record.isCompleted) {
          if (record.isGroup) {
            newSelectedGroups.add(record._id);
          } else {
            newSelectedRecords.add(record._id);
          }
        }
      });
      
      setSelectedRecords(newSelectedRecords);
      setSelectedGroups(newSelectedGroups);
    } else {
      setSelectedRecords(new Set());
      setSelectedGroups(new Set());
    }
  };

  // 개별 항목 선택/해제
  const handleRecordSelect = (recordId: string, isGroup: boolean, checked: boolean) => {
    if (isGroup) {
      const newSelectedGroups = new Set(selectedGroups);
      if (checked) {
        newSelectedGroups.add(recordId);
      } else {
        newSelectedGroups.delete(recordId);
      }
      setSelectedGroups(newSelectedGroups);
    } else {
      const newSelectedRecords = new Set(selectedRecords);
      if (checked) {
        newSelectedRecords.add(recordId);
      } else {
        newSelectedRecords.delete(recordId);
      }
      setSelectedRecords(newSelectedRecords);
    }
    
    // 전체 선택 상태 업데이트
    const totalSelectableItems = records.filter(r => !r.isCompleted).length;
    const totalSelectedItems = (checked ? 
      (isGroup ? selectedGroups.size + 1 : selectedRecords.size + 1) : 
      (isGroup ? selectedGroups.size - 1 : selectedRecords.size - 1)
    );
    
    setSelectAll(totalSelectedItems === totalSelectableItems);
  };

  // 선택된 항목 합계 계산
  const calculateSelectedTotal = () => {
    let total = 0;

    // 개별 레코드 합계
    selectedRecords.forEach(id => {
      const record = records.find(r => r._id === id && !r.isGroup);
      if (record) total += record.amount;
    });

    // 그룹 합계
    selectedGroups.forEach(id => {
      const group = records.find(r => r._id === id && r.isGroup);
      if (group) total += group.totalAmount || 0;
    });

    return total;
  };

  // 입금완료 처리
  const handleCompleteSelected = async () => {
    if (selectedRecords.size === 0 && selectedGroups.size === 0) {
      toast.error('완료 처리할 항목을 선택해주세요.');
      return;
    }

    const recordIds = Array.from(selectedRecords);
    const groupIds = Array.from(selectedGroups);

    console.log('입금완료 처리 시작:', { recordIds, groupIds });

    try {
      const response = await fetch('/api/cash-deposit/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recordIds,
          groupIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 응답 오류:', errorData);
        throw new Error(errorData.error || '입금 완료 처리 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      console.log('입금완료 처리 결과:', result);

      if (result.updatedRecords === 0 && result.updatedGroups === 0) {
        toast.error('업데이트된 항목이 없습니다. 이미 완료된 항목이거나 오류가 발생했습니다.');
        return;
      }

      toast.success(`입금완료 처리되었습니다. (${result.updatedRecords + result.updatedGroups}개 항목)`);
      
      // 데이터 새로고침
      setSelectedRecords(new Set());
      setSelectedGroups(new Set());
      setSelectAll(false);
      await fetchRecords();

      // 종합일계표 새로고침 트리거
      const event = new CustomEvent('depositCompleted');
      document.dispatchEvent(event);
    } catch (error) {
      console.error('입금 완료 처리 중 오류:', error);
      toast.error('입금 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const selectedTotal = calculateSelectedTotal();
  const selectedCount = selectedRecords.size + selectedGroups.size;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>계좌입금 상세 내역</DialogTitle>
        </DialogHeader>

        {/* 액션 버튼 */}
        <div className="flex justify-between items-center py-4 border-b">
          <Button 
            onClick={handleCompleteSelected}
            disabled={selectedCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            입금완료
          </Button>
          
          <div className="text-sm text-gray-600">
            <span>선택된 항목: {selectedCount}개</span>
            <span className="ml-4 font-semibold">합계: {formatAmount(selectedTotal)}</span>
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">데이터를 불러오는 중...</div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">날짜</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const isSelected = record.isGroup 
                    ? selectedGroups.has(record._id)
                    : selectedRecords.has(record._id);
                  
                  return (
                    <tr 
                      key={record._id}
                      className={`
                        ${record.isCompleted ? 'bg-green-50 text-gray-500' : 'hover:bg-gray-50'}
                        ${record.isGroup ? 'bg-blue-50' : ''}
                      `}
                    >
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={record.isCompleted}
                          onChange={(e) => 
                            handleRecordSelect(record._id, record.isGroup || false, e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatDate(record.date)}
                        {record.isGroup && <span className="ml-2 text-xs text-blue-600">(그룹)</span>}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {formatAmount(record.isGroup ? (record.totalAmount || 0) : record.amount)}
                        {record.isCompleted && <span className="ml-2 text-xs text-green-600">완료</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 