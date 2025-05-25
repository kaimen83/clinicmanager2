'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { toISODateString } from '@/lib/utils';
import { useDateContext } from '@/lib/context/dateContext';

interface CashRecord {
  _id: string;
  date: Date;
  type: '수입' | '지출' | '통장입금';
  amount: number;
  description?: string;
  isClosed: boolean;
  closingAmount?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
}

export default function CashManagementModal({ isOpen, onClose, date }: Props) {
  const { cashRefreshTrigger } = useDateContext();
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousAmount, setPreviousAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isClosed, setIsClosed] = useState(false);
  
  // 새 기록 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: '수입' as '수입' | '지출' | '통장입금',
    amount: '',
    description: ''
  });
  
  // 마감 폼
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closingAmount, setClosingAmount] = useState('');
  
  // 삭제 관련 상태
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 데이터 가져오기
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('시재관리 데이터 조회 시작:', {
        date: toISODateString(date),
        cashRefreshTrigger
      });

      const [recordsResponse, previousResponse] = await Promise.all([
        fetch(`/api/cash?date=${toISODateString(date)}`),
        fetch(`/api/cash/previous?date=${toISODateString(date)}`)
      ]);

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        console.log('시재 기록 조회 결과:', {
          recordsCount: recordsData.length,
          records: recordsData.map((r: CashRecord) => ({
            id: r._id,
            type: r.type,
            amount: r.amount,
            description: r.description
          }))
        });
        setRecords(recordsData);
        
        // 마감 여부 확인
        const closedRecord = recordsData.find((record: CashRecord) => record.isClosed);
        setIsClosed(!!closedRecord);
      } else {
        console.error('시재 기록 조회 실패:', recordsResponse.status, recordsResponse.statusText);
        throw new Error('시재 기록을 조회할 수 없습니다.');
      }

      if (previousResponse.ok) {
        const previousData = await previousResponse.json();
        console.log('전일 시재 조회 결과:', {
          previousAmount: previousData.closingAmount || 0
        });
        setPreviousAmount(previousData.closingAmount || 0);
      } else {
        console.log('전일 시재 데이터 없음');
        setPreviousAmount(0);
      }
    } catch (error) {
      console.error('시재 데이터 조회 중 오류:', error);
      toast.error('시재 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 현재 잔액 계산
  useEffect(() => {
    const balance = records.reduce((acc, record) => {
      if (record.type === '수입') {
        return acc + record.amount;
      } else if (record.type === '지출' || record.type === '통장입금') {
        return acc - record.amount;
      }
      return acc;
    }, previousAmount);
    
    setCurrentBalance(balance);
    setClosingAmount(balance.toString());
  }, [records, previousAmount]);

  // 모달이 열릴 때 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      console.log('시재관리 모달 열림 - 데이터 조회 시작');
      fetchData();
    }
  }, [isOpen, date]);

  // cashRefreshTrigger 변경 시 실시간 업데이트
  useEffect(() => {
    if (isOpen && cashRefreshTrigger > 0) {
      console.log('현금 거래 변경 감지 - 시재 데이터 새로고침:', cashRefreshTrigger);
      fetchData();
    }
  }, [cashRefreshTrigger, isOpen]);

  // 새 기록 추가
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error('유효한 금액을 입력해주세요.');
      return;
    }
    
    try {
      const response = await fetch('/api/cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: toISODateString(date),
          type: formData.type,
          amount: Number(formData.amount),
          description: formData.description
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '기록 추가에 실패했습니다.');
      }
      
      toast.success('기록이 추가되었습니다.');
      setFormData({ type: '수입', amount: '', description: '' });
      setShowAddForm(false);
      fetchData(); // 데이터 새로고침
    } catch (error: any) {
      console.error('기록 추가 에러:', error);
      toast.error(error.message);
    }
  };

  // 시재 마감
  const handleClose = async () => {
    if (!closingAmount || isNaN(Number(closingAmount))) {
      toast.error('유효한 마감금액을 입력해주세요.');
      return;
    }
    
    try {
      const response = await fetch('/api/cash/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: toISODateString(date),
          closingAmount: Number(closingAmount)
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '시재 마감에 실패했습니다.');
      }
      
      toast.success('시재가 마감되었습니다.');
      setShowCloseForm(false);
      fetchData(); // 데이터 새로고침
    } catch (error: any) {
      console.error('시재 마감 에러:', error);
      toast.error(error.message);
    }
  };

  // 기록 삭제 확인
  const handleDeleteClick = (recordId: string) => {
    setDeleteRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  // 기록 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deleteRecordId) return;
    
    try {
      const response = await fetch(`/api/cash/${deleteRecordId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '기록 삭제에 실패했습니다.');
      }
      
      toast.success('기록이 삭제되었습니다.');
      setShowDeleteConfirm(false);
      setDeleteRecordId(null);
      fetchData(); // 데이터 새로고침
    } catch (error: any) {
      console.error('기록 삭제 에러:', error);
      toast.error(error.message);
    }
  };

  // 삭제 취소
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteRecordId(null);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '수입': return 'text-blue-600';
      case '지출': return 'text-red-600';
      case '통장입금': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            시재관리 - {format(date, 'yyyy년 MM월 dd일', { locale: ko })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 시재 현황 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">전일 시재</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatAmount(previousAmount)}원</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">현재 잔액</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatAmount(currentBalance)}원</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">마감 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-lg font-semibold ${isClosed ? 'text-red-600' : 'text-green-600'}`}>
                  {isClosed ? '마감됨' : '진행중'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-2">
            {!isClosed && (
              <>
                <Button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant={showAddForm ? "secondary" : "default"}
                >
                  {showAddForm ? '취소' : '기록 추가'}
                </Button>
                <Button 
                  onClick={() => setShowCloseForm(!showCloseForm)}
                  variant={showCloseForm ? "secondary" : "destructive"}
                >
                  {showCloseForm ? '취소' : '시재 마감'}
                </Button>
              </>
            )}
          </div>

          {/* 기록 추가 폼 */}
          {showAddForm && !isClosed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">새 기록 추가</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddRecord} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">구분</Label>
                      <Select value={formData.type} onValueChange={(value: '수입' | '지출' | '통장입금') => setFormData({...formData, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="수입">수입</SelectItem>
                          <SelectItem value="지출">지출</SelectItem>
                          <SelectItem value="통장입금">통장입금</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">금액</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="금액 입력"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">내용</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="내용 입력 (선택사항)"
                      rows={2}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">추가</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 시재 마감 폼 */}
          {showCloseForm && !isClosed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">시재 마감</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="closingAmount">마감 금액</Label>
                    <Input
                      id="closingAmount"
                      type="number"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                      placeholder="마감 금액 입력"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      계산된 잔액: {formatAmount(currentBalance)}원
                    </p>
                  </div>
                  
                  <Button onClick={handleClose} variant="destructive" className="w-full">
                    시재 마감
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 기록 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">현금 기록</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  등록된 기록이 없습니다.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>구분</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>내용</TableHead>
                        <TableHead>시간</TableHead>
                        <TableHead className="w-20">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>
                            <span className={getTypeColor(record.type)}>
                              {record.type}
                            </span>
                          </TableCell>
                          <TableCell className={getTypeColor(record.type)}>
                            {record.type === '수입' ? '+' : '-'}{formatAmount(record.amount)}원
                          </TableCell>
                          <TableCell>{record.description || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(record.date), 'HH:mm', { locale: ko })}
                          </TableCell>
                          <TableCell>
                            {/* cashManagement.js 로직: 통장입금 기록만 삭제 가능 */}
                            {record.type === '통장입금' && !isClosed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(record._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                삭제
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>기록 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>이 기록을 삭제하시겠습니까?</p>
            <p className="text-sm text-muted-foreground mt-2">
              삭제된 기록은 복구할 수 없습니다.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDeleteCancel}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}