'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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

  // 진료외수입 목록 조회
  const fetchextraincomes = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const dateStr = toISODateString(date);
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

  // 날짜가 변경될 때마다 목록 새로 조회
  useEffect(() => {
    fetchextraincomes();
  }, [date, userId]);

  // 모달 열기
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 등록 성공 시 목록 새로고침
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
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">진료외수입</CardTitle>
          <CardDescription className="text-xs">
            {format(date, 'PPP', { locale: ko })}의 진료외수입 내역
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="text-center py-2 text-sm">로딩 중...</div>
          ) : extraincomes.length === 0 ? (
            <div className="text-center py-2 text-xs text-muted-foreground">
              등록된 진료외수입이 없습니다.
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-hidden">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="h-8 text-xs font-medium">유형</TableHead>
                      <TableHead className="h-8 text-xs font-medium text-right">금액</TableHead>
                      <TableHead className="h-8 text-xs font-medium">비고</TableHead>
                      <TableHead className="h-8 text-xs font-medium w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extraincomes.map((item) => (
                      <TableRow key={item._id} className="h-8 hover:bg-muted/50">
                        <TableCell className="py-1 text-xs">{item.type}</TableCell>
                        <TableCell className="py-1 text-xs text-right">
                          ₩{formatAmount(item.amount)}
                        </TableCell>
                        <TableCell className="py-1 text-xs max-w-[120px] truncate">
                          {item.notes || '-'}
                        </TableCell>
                        <TableCell className="py-1 text-xs">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleOpenDeleteDialog(item._id || '')}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="h-8 bg-muted/20 hover:bg-muted/50">
                      <TableCell className="py-1 text-xs font-bold">합계</TableCell>
                      <TableCell className="py-1 text-xs font-bold text-right">
                        ₩{formatAmount(calculateTotal())}
                      </TableCell>
                      <TableCell className="py-1 text-xs"></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 진료외수입 등록 모달 */}
      <ExtraIncomeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        defaultDate={date}
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