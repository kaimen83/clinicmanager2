'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExtraIncome } from '@/lib/types';
import { toISODateString } from '@/lib/utils';
import ExtraIncomeModal from './ExtraIncomeModal';

type Props = {
  date: Date;
};

export default function ExtraIncomeList({ date }: Props) {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [extraincomes, setextraincomes] = useState<ExtraIncome[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExtraIncome | null>(null);
  
  // 날짜를 문자열로 변환하여 메모이제이션
  const dateStr = useMemo(() => toISODateString(date), [date]);

  // 진료외수입 목록 조회
  const fetchextraincomes = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      // 메모이제이션된 날짜 문자열 사용
      const response = await fetch(`/api/extraIncome?dateStart=${dateStr}&dateEnd=${dateStr}`);
      
      if (!response.ok) {
        throw new Error('진료외수입 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setextraincomes(data);
    } catch (error) {
      console.error('진료외수입 목록 조회 에러:', error);
      toast.error('진료외수입 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 문자열이 변경될 때마다 목록 새로 조회
  useEffect(() => {
    fetchextraincomes();
  }, [dateStr, userId]);

  // 등록 모달 열기
  const handleOpenModal = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  // 수정 모달 열기
  const handleOpenEditModal = (item: ExtraIncome) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  // 등록 또는 수정 성공 시 목록 새로고침
  const handleSuccess = (newData: ExtraIncome) => {
    fetchextraincomes();
  };

  // 삭제 대화상자 열기
  const handleOpenDeleteDialog = (id: string) => {
    setSelectedItem(id);
    setIsDeleteDialogOpen(true);
  };

  // 삭제 대화상자 닫기
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  // 진료외수입 삭제 처리
  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      const response = await fetch(`/api/extraIncome?id=${selectedItem}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('진료외수입 삭제에 실패했습니다.');
      }
      
      toast.success('진료외수입이 삭제되었습니다.');
      fetchextraincomes();
    } catch (error) {
      console.error('진료외수입 삭제 에러:', error);
      toast.error('진료외수입 삭제에 실패했습니다.');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 총 금액 계산
  const calculateTotal = () => {
    return extraincomes.reduce((total, item) => total + item.amount, 0);
  };

  return (
    <>
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-violet-800 mb-2">💰 진료외수입</h3>
          <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50/50 px-3 py-2 rounded-lg border border-violet-200">
            <span className="font-medium">총 {extraincomes.length}건</span>
            <span className="text-violet-500">•</span>
            <span className="font-semibold">{formatAmount(calculateTotal())}원</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-600">데이터를 불러오는 중...</div>
        ) : extraincomes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-gradient-to-r from-slate-50 to-white rounded-xl">
            <div className="mb-2 text-4xl opacity-50">💰</div>
            <div>등록된 진료외수입이 없습니다.</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-violet-50 z-10">
                  <TableRow className="border-b border-violet-200">
                    <TableHead className="font-semibold text-violet-800">유형</TableHead>
                    <TableHead className="font-semibold text-violet-800 text-right">금액</TableHead>
                    <TableHead className="font-semibold text-violet-800">비고</TableHead>
                    <TableHead className="text-right font-semibold text-violet-800">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extraincomes.map((item) => (
                    <TableRow key={item._id} className="hover:bg-violet-50/30 transition-colors">
                      <TableCell className="font-medium">{item.type}</TableCell>
                      <TableCell className="font-semibold text-violet-700 text-right">
                        ₩{formatAmount(item.amount)}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {item.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            onClick={() => handleOpenEditModal(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-red-100 hover:text-red-700 transition-colors"
                            onClick={() => handleOpenDeleteDialog(item._id || '')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* 진료외수입 등록/수정 모달 */}
      <ExtraIncomeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        defaultDate={date}
        editItem={editItem}
      />

      {/* 삭제 확인 대화상자 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>진료외수입 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 진료외수입 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 