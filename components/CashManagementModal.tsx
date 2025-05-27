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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { toISODateString } from '@/lib/utils';
import { useDateContext } from '@/lib/context/dateContext';
import { Trash2, Edit, Plus, AlertCircle } from 'lucide-react';

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

export default function CashManagementModal({ isOpen, onClose, date }: Props) {
  const { cashRefreshTrigger } = useDateContext();
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousAmount, setPreviousAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  
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
          date: toISODateString(date),
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
      case '수입': return 'text-blue-600';
      case '지출': return 'text-red-600';
      case '통장입금': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '수입': return '💰';
      case '지출': return '💸';
      case '통장입금': return '🏦';
      default: return '📝';
    }
  };

  const isEditable = (record: CashRecord) => {
    return record.type === '통장입금';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            시재관리 - {format(date, 'yyyy년 MM월 dd일', { locale: ko })}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">데이터를 불러오는 중...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 잔액 요약 */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">전일 이월</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatAmount(previousAmount)}원
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">당일 변동</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${currentBalance - previousAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentBalance - previousAmount >= 0 ? '+' : ''}{formatAmount(currentBalance - previousAmount)}원
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">현재 잔액</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmount(currentBalance)}원
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">시재관리 안내</p>
                  <ul className="space-y-1 text-xs">
                    <li>• 수입: 현금 수납 시 자동 등록 (내원정보에서 관리)</li>
                    <li>• 지출: 현금 지출 시 자동 등록 (지출내역에서 관리)</li>
                    <li>• 통장입금: 직접 추가/수정/삭제 가능</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 통장입금 추가 버튼 */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">시재 내역</h3>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                통장입금 추가
              </Button>
            </div>

            {/* 통장입금 추가 폼 */}
            {showAddForm && (
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-lg">통장입금 추가</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddRecord} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="amount">금액</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="입금 금액"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">설명</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="통장입금 (선택사항)"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                        추가
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAddForm(false);
                          setFormData({ amount: '', description: '' });
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* 시재 기록 테이블 */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">구분</TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead className="text-right w-32">금액</TableHead>
                      <TableHead className="w-24">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          등록된 시재 기록이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{getTypeIcon(record.type)}</span>
                              <span className={`font-medium ${getTypeColor(record.type)}`}>
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
                                {record.description || '-'}
                                {(record.transactionId || record.expenseId) && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {record.transactionId ? '(내원정보 연동)' : '(지출내역 연동)'}
                                  </div>
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
                              <span className={`font-medium ${getTypeColor(record.type)}`}>
                                {record.type === '수입' ? '+' : '-'}{formatAmount(record.amount)}원
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRecord === record._id ? (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditSave(record._id)}
                                  className="h-8 w-8 p-0"
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleEditCancel}
                                  className="h-8 w-8 p-0"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div className="flex space-x-1">
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
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <div className="text-xs text-gray-400 px-2">
                                    자동 관리
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 삭제 확인 다이얼로그 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">기록 삭제</h3>
              <p className="text-gray-600 mb-6">
                이 기록을 삭제하시겠습니까?
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700"
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}