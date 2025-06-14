'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { toISODateString, cn } from '@/lib/utils';
import { useDateContext } from '@/lib/context/dateContext';
import { 
  Trash2, 
  Edit, 
  Plus, 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Save,
  X,
  Check
} from 'lucide-react';

interface CashRecord {
  _id: string;
  date: Date;
  type: '수입' | '지출' | '통장입금';
  amount: number;
  description?: string;
  transactionId?: string;
  expenseId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
}

export default function CashManagementModal({ isOpen, onClose, date: initialDate }: Props) {
  const { cashRefreshTrigger } = useDateContext();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousAmount, setPreviousAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // 새 기록 추가 폼 (통장입금만)
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: ''
  });
  
  // 편집 관련 상태
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    description: ''
  });
  
  // 삭제 관련 상태
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 날짜 변경 핸들러
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  // 데이터 가져오기
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('시재관리 데이터 조회 시작:', {
        date: toISODateString(selectedDate),
        cashRefreshTrigger
      });

      const [recordsResponse, previousResponse] = await Promise.all([
        fetch(`/api/cash?date=${toISODateString(selectedDate)}`),
        fetch(`/api/cash/previous?date=${toISODateString(selectedDate)}`)
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
  }, [records, previousAmount]);

  // 모달이 열릴 때 또는 날짜가 변경될 때 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      console.log('시재관리 모달 열림 - 데이터 조회 시작');
      fetchData();
    }
  }, [isOpen, selectedDate]);

  // cashRefreshTrigger 변경 시 실시간 업데이트
  useEffect(() => {
    if (isOpen && cashRefreshTrigger > 0) {
      console.log('현금 거래 변경 감지 - 시재 데이터 새로고침:', cashRefreshTrigger);
      fetchData();
    }
  }, [cashRefreshTrigger, isOpen]);

  // 새 기록 추가 (통장입금만)
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
          date: toISODateString(selectedDate),
          type: '통장입금',
          amount: Number(formData.amount),
          description: formData.description || '통장입금'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '기록 추가에 실패했습니다.');
      }
      
      toast.success('통장입금 기록이 추가되었습니다.');
      setFormData({ amount: '', description: '' });
      setShowAddForm(false);
      fetchData(); // 데이터 새로고침
    } catch (error: any) {
      console.error('기록 추가 에러:', error);
      toast.error(error.message);
    }
  };

  // 편집 시작
  const handleEditStart = (record: CashRecord) => {
    if (record.type !== '통장입금') {
      toast.error('수입과 지출은 내원정보와 지출내역에서 관리됩니다.');
      return;
    }
    
    setEditingRecord(record._id);
    setEditFormData({
      amount: record.amount.toString(),
      description: record.description || ''
    });
  };

  // 편집 저장
  const handleEditSave = async (recordId: string) => {
    if (!editFormData.amount || isNaN(Number(editFormData.amount)) || Number(editFormData.amount) <= 0) {
      toast.error('유효한 금액을 입력해주세요.');
      return;
    }
    
    try {
      const response = await fetch(`/api/cash/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(editFormData.amount),
          description: editFormData.description || '통장입금'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '기록 수정에 실패했습니다.');
      }
      
      toast.success('기록이 수정되었습니다.');
      setEditingRecord(null);
      fetchData(); // 데이터 새로고침
    } catch (error: any) {
      console.error('기록 수정 에러:', error);
      toast.error(error.message);
    }
  };

  // 편집 취소
  const handleEditCancel = () => {
    setEditingRecord(null);
    setEditFormData({ amount: '', description: '' });
  };

  // 삭제 클릭
  const handleDeleteClick = (record: CashRecord) => {
    if (record.type !== '통장입금') {
      toast.error('수입과 지출은 내원정보와 지출내역에서 관리됩니다.');
      return;
    }
    
    setDeleteRecordId(record._id);
    setShowDeleteConfirm(true);
  };

  // 삭제 확인
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
    return amount.toLocaleString('ko-KR');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '수입': return 'text-emerald-600';
      case '지출': return 'text-red-500';
      case '통장입금': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case '수입': return 'bg-emerald-50 border-emerald-200';
      case '지출': return 'bg-red-50 border-red-200';
      case '통장입금': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '수입': return <TrendingUp className="w-4 h-4" />;
      case '지출': return <TrendingDown className="w-4 h-4" />;
      case '통장입금': return <Wallet className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  const isEditable = (record: CashRecord) => {
    return record.type === '통장입금';
  };

  const dailyChange = currentBalance - previousAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              시재관리
            </DialogTitle>
            
            {/* 날짜 선택 컨트롤 */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPreviousDay}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "min-w-[200px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                  />
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNextDay}
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-muted-foreground">데이터를 불러오는 중...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* 잔액 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">전일 이월</p>
                      <p className="text-2xl font-bold text-foreground">
                        ₩{formatAmount(previousAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-full">
                      <Wallet className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`border-2 ${dailyChange >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 ${dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        당일 변동
                      </p>
                      <p className={`text-2xl font-bold ${dailyChange >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {dailyChange >= 0 ? '+' : ''}₩{formatAmount(dailyChange)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${dailyChange >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      {dailyChange >= 0 ? 
                        <TrendingUp className={`w-6 h-6 ${dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`} /> :
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">현재 잔액</p>
                      <p className="text-2xl font-bold text-foreground">
                        ₩{formatAmount(currentBalance)}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 통장입금 추가 버튼 */}
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-foreground">시재 내역</h3>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="shadow-sm"
                disabled={showAddForm}
              >
                <Plus className="w-4 h-4 mr-2" />
                통장입금 추가
              </Button>
            </div>

            {/* 통장입금 추가 폼 */}
            {showAddForm && (
              <Card className="border-border shadow-sm">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-base font-medium text-foreground flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    통장입금 추가
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleAddRecord} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                          입금 금액 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0"
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-foreground">
                          설명
                        </Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="통장입금"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <Button 
                        type="submit" 
                        className="shadow-sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAddForm(false);
                          setFormData({ amount: '', description: '' });
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* 시재 기록 테이블 */}
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-medium text-foreground">구분</TableHead>
                        <TableHead className="font-medium text-foreground">내용</TableHead>
                        <TableHead className="font-medium text-foreground text-right">금액</TableHead>
                        <TableHead className="font-medium text-foreground text-center w-32">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center space-y-2">
                              <Wallet className="w-12 h-12 text-muted-foreground/50" />
                              <p>등록된 시재 기록이 없습니다.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((record) => (
                          <TableRow key={record._id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getTypeBgColor(record.type)}`}>
                                <span className={getTypeColor(record.type)}>
                                  {getTypeIcon(record.type)}
                                </span>
                                <span className={`font-medium text-sm ${getTypeColor(record.type)}`}>
                                  {record.type}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {editingRecord === record._id ? (
                                <Input
                                  value={editFormData.description}
                                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                  placeholder="설명"
                                  className="w-full"
                                />
                              ) : (
                                <div>
                                  <p className="font-medium">{record.description || '-'}</p>
                                  {(record.transactionId || record.expenseId) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {record.transactionId ? '내원정보 연동' : '지출내역 연동'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {editingRecord === record._id ? (
                                <Input
                                  type="number"
                                  value={editFormData.amount}
                                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                  className="w-full text-right"
                                />
                              ) : (
                                <span className={`font-bold text-lg ${getTypeColor(record.type)}`}>
                                  {record.type === '수입' ? '+' : '-'}₩{formatAmount(record.amount)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center space-x-1">
                                {editingRecord === record._id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditSave(record._id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleEditCancel}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {isEditable(record) ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditStart(record)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteClick(record)}
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                                        자동 관리
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 삭제 확인 다이얼로그 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-sm w-full mx-4 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">기록 삭제</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  이 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleDeleteConfirm}
                    variant="destructive"
                    className="flex-1"
                  >
                    삭제
                  </Button>
                  <Button
                    onClick={handleDeleteCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}