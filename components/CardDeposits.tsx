'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Download, Trash2, RefreshCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface CardDeposit {
  _id: string;
  cardCompany: string;
  saleDate: string;
  saleAmount: number;
  expectedDepositDate: string;
  actualDepositDate?: string;
  actualDepositAmount?: number;
  fee?: number;
  status: '미입금' | '입금완료' | '입금보류';
  holdReason?: string;
}

interface CardCompany {
  _id: string;
  value: string;
  feeRate: number;
}

export default function CardDeposits() {
  const [data, setData] = useState<CardDeposit[]>([]);
  const [filteredData, setFilteredData] = useState<CardDeposit[]>([]);
  const [cardCompanies, setCardCompanies] = useState<CardCompany[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 필터 상태
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCardCompany, setSelectedCardCompany] = useState('all');
  
  // 선택 상태
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedCardCompanyForBulk, setSelectedCardCompanyForBulk] = useState<string | null>(null);
  
  // 모달 상태
  const [depositModal, setDepositModal] = useState(false);
  const [holdReasonModal, setHoldReasonModal] = useState(false);
  const [bulkDepositModal, setBulkDepositModal] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [editableRows, setEditableRows] = useState<Set<string>>(new Set());
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlingModal, setCrawlingModal] = useState(false);
  const [crawlingStatus, setCrawlingStatus] = useState<{
    step: string;
    progress: number;
    message: string;
    details?: {
      processed?: number;
      errors?: number;
      total?: number;
    };
    errorDetails?: any[];
  }>({
    step: 'ready',
    progress: 0,
    message: '크롤링을 시작합니다...'
  });
  
  // 모달 폼 데이터
  const [actualDepositDate, setActualDepositDate] = useState('');
  const [actualDepositAmount, setActualDepositAmount] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [bulkDepositDate, setBulkDepositDate] = useState('');
  const [bulkActualAmount, setBulkActualAmount] = useState('');

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // 통화 포맷 함수
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  // 초기 날짜 설정
  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 6);
    
    setStartDate(formatDate(oneWeekAgo));
    setEndDate(formatDate(today));
    setBulkDepositDate(formatDate(today));
  }, []);

  // 카드사 목록 로드
  const loadCardCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/card-companies');
      if (response.ok) {
        const companies = await response.json();
        setCardCompanies(companies);
      }
    } catch (error) {
      console.error('카드사 목록 로드 실패:', error);
    }
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/card-deposits?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const cardDeposits = await response.json();
        setData(cardDeposits);
      } else {
        console.error('데이터 로드 실패');
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // 필터 적용
  useEffect(() => {
    let filtered = [...data];
    
    if (selectedCardCompany !== 'all') {
      filtered = filtered.filter(item => item.cardCompany === selectedCardCompany);
    }
    
    setFilteredData(filtered);
  }, [data, selectedCardCompany]);

  // 초기 로드
  useEffect(() => {
    loadCardCompanies();
  }, [loadCardCompanies]);

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [startDate, endDate, loadData]);

  // 요약 계산
  const summary = filteredData.reduce((acc, item) => {
    acc.totalSaleAmount += item.saleAmount;
    acc.totalDepositAmount += item.actualDepositAmount || 0;
    if (item.status === '미입금') {
      acc.totalUnpaidAmount += item.saleAmount;
    }
    acc.totalFee += item.fee || 0;
    return acc;
  }, {
    totalSaleAmount: 0,
    totalDepositAmount: 0,
    totalUnpaidAmount: 0,
    totalFee: 0
  });

  // 행 선택 처리
  const handleRowSelection = (id: string, cardCompany: string, checked: boolean) => {
    if (checked) {
      if (selectedCardCompanyForBulk && selectedCardCompanyForBulk !== cardCompany) {
        alert('동일한 카드사의 건만 선택할 수 있습니다.');
        return;
      }
      if (!selectedCardCompanyForBulk) {
        setSelectedCardCompanyForBulk(cardCompany);
        setSelectedCardCompany(cardCompany);
      }
      setSelectedRows(prev => new Set([...prev, id]));
    } else {
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        if (newSet.size === 0) {
          setSelectedCardCompanyForBulk(null);
          setSelectedCardCompany('all');
        }
        return newSet;
      });
    }
  };

  // 선택 해제
  const clearSelection = () => {
    setSelectedRows(new Set());
    setSelectedCardCompanyForBulk(null);
    setSelectedCardCompany('all');
  };

  // 수정 버튼 클릭
  const handleEditClick = (id: string) => {
    setEditableRows(prev => new Set([...prev, id]));
  };

  // 상태 업데이트
  const updateStatus = async (id: string, status: string, extraData?: any) => {
    try {
      const response = await fetch(`/api/card-deposits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extraData }),
      });
      if (response.ok) {
        await loadData();
        // 수정 완료 후 수정 모드 해제
        setEditableRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
    }
  };

  // 입금 완료 처리
  const handleDepositComplete = async () => {
    if (!currentEditId) return;
    
    const amount = parseInt(actualDepositAmount.replace(/[^\d]/g, '')) || 0;
    const item = data.find(d => d._id === currentEditId);
    const fee = item ? item.saleAmount - amount : 0;
    
    await updateStatus(currentEditId, '입금완료', {
      actualDepositDate,
      actualDepositAmount: amount,
      fee
    });
    
    setDepositModal(false);
    setActualDepositDate('');
    setActualDepositAmount('');
    setCurrentEditId(null);
  };

  // 입금 보류 처리
  const handleHoldDeposit = async () => {
    if (!currentEditId) return;
    
    await updateStatus(currentEditId, '입금보류', {
      holdReason,
      actualDepositAmount: null,
      actualDepositDate: null
    });
    
    setHoldReasonModal(false);
    setHoldReason('');
    setCurrentEditId(null);
  };

  // 수수료 계산
  const calculateBulkFee = (actualAmountStr: string) => {
    const actualAmount = parseInt(actualAmountStr.replace(/[^\d]/g, '')) || 0;
    const totalAmount = Array.from(selectedRows).reduce((sum, id) => {
      const item = data.find(d => d._id === id);
      return sum + (item?.saleAmount || 0);
    }, 0);
    return totalAmount - actualAmount;
  };

  // 크롤링 실행
  const handleCrawling = async () => {
    setIsCrawling(true);
    setCrawlingModal(true);
    setCrawlingStatus({
      step: 'initializing',
      progress: 10,
      message: '브라우저를 초기화하고 있습니다...'
    });

    try {
      // 크롤링 시작과 동시에 API 호출
      const responsePromise = fetch('/api/card-deposits/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // 크롤링 진행 상황을 시뮬레이션 (실제로는 WebSocket이나 SSE를 사용할 수 있음)
      const crawlingSteps = [
        { step: 'login', progress: 30, message: '여신금융협회 웹사이트에 로그인 중입니다...', delay: 2000 },
        { step: 'searching', progress: 50, message: '카드 매출 데이터를 조회하고 있습니다...', delay: 3000 },
        { step: 'extracting', progress: 70, message: '매출 내역을 추출하고 있습니다...', delay: 2000 },
        { step: 'processing', progress: 90, message: '추출한 데이터를 처리하고 있습니다...', delay: 1000 }
      ];

      // 단계별로 상태 업데이트
      for (const step of crawlingSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setCrawlingStatus({
          step: step.step,
          progress: step.progress,
          message: step.message
        });
      }

      // API 응답 대기
      const response = await responsePromise;
      
      if (response.ok) {
        const result = await response.json();
        setCrawlingStatus({
          step: 'completed',
          progress: 100,
          message: '크롤링이 완료되었습니다!',
          details: {
            processed: result.processed || 0,
            errors: result.errors || 0,
            total: (result.processed || 0) + (result.errors || 0)
          },
          errorDetails: result.errorDetails || []
        });
        await loadData(); // 데이터 새로고침
      } else {
        const error = await response.json();
        setCrawlingStatus({
          step: 'error',
          progress: 0,
          message: `크롤링 실패: ${error.message}`
        });
      }
    } catch (error) {
      console.error('크롤링 실패:', error);
      setCrawlingStatus({
        step: 'error',
        progress: 0,
        message: '크롤링 중 오류가 발생했습니다.'
      });
    } finally {
      setIsCrawling(false);
    }
  };

  // 일괄 입금 처리
  const handleBulkDeposit = async () => {
    const actualAmount = parseInt(bulkActualAmount.replace(/[^\d]/g, '')) || 0;
    const totalAmount = Array.from(selectedRows).reduce((sum, id) => {
      const item = data.find(d => d._id === id);
      return sum + (item?.saleAmount || 0);
    }, 0);
    
    const totalFee = totalAmount - actualAmount;
    
    // 입력 검증
    if (totalFee < 0) {
      alert('실제 입금액이 총 매출액보다 클 수 없습니다.');
      return;
    }
    
    if (!bulkDepositDate) {
      alert('입금일자를 선택해주세요.');
      return;
    }
    
    try {
      const promises = Array.from(selectedRows).map(async (id) => {
        const item = data.find(d => d._id === id);
        if (!item) return;
        
        const itemFee = Math.round((item.saleAmount / totalAmount) * totalFee);
        const itemActualAmount = item.saleAmount - itemFee;
        
        const response = await fetch(`/api/card-deposits/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: '입금완료',
            actualDepositDate: bulkDepositDate,
            actualDepositAmount: itemActualAmount,
            fee: itemFee,
            bulkDeposit: true
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update deposit ${id}`);
        }
        
        return await response.json();
      });
      
      await Promise.all(promises);
      setBulkDepositModal(false);
      clearSelection();
      setBulkActualAmount('');
      alert('일괄입금 처리가 완료되었습니다.');
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('일괄입금 처리 실패:', error);
      alert('일괄입금 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>카드매출/입금 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 필터 */}
        <div className="flex gap-4 items-end">
          <div>
            <Label htmlFor="startDate">시작일</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">종료일</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cardCompany">카드사</Label>
            <Select value={selectedCardCompany} onValueChange={setSelectedCardCompany}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {cardCompanies.map(company => (
                  <SelectItem key={company._id} value={company.value}>
                    {company.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={loadData} disabled={loading}>
            {loading ? '로딩...' : '조회'}
          </Button>
          <Button onClick={handleCrawling} disabled={isCrawling} variant="outline">
            <RefreshCcw className={`w-4 h-4 mr-2 ${isCrawling ? 'animate-spin' : ''}`} />
            {isCrawling ? '크롤링 중...' : '크롤링'}
          </Button>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">총 매출액</div>
              <div className="text-lg font-bold">{formatCurrency(summary.totalSaleAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">총 입금액</div>
              <div className="text-lg font-bold">{formatCurrency(summary.totalDepositAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">총 미입금액</div>
              <div className="text-lg font-bold">{formatCurrency(summary.totalUnpaidAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">총 수수료</div>
              <div className="text-lg font-bold">{formatCurrency(summary.totalFee)}</div>
            </CardContent>
          </Card>
        </div>

        {/* 선택된 행 정보 */}
        {selectedRows.size > 0 && (
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{selectedRows.size}건 선택됨</span>
                  <span className="ml-4">
                    총액: {formatCurrency(Array.from(selectedRows).reduce((sum, id) => {
                      const item = data.find(d => d._id === id);
                      return sum + (item?.saleAmount || 0);
                    }, 0))}
                  </span>
                </div>
                <div className="space-x-2">
                  <Button onClick={clearSelection} variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    선택 해제
                  </Button>
                  <Button 
                    onClick={() => {
                      const totalAmount = Array.from(selectedRows).reduce((sum, id) => {
                        const item = data.find(d => d._id === id);
                        return sum + (item?.saleAmount || 0);
                      }, 0);
                      
                      if (selectedRows.size > 1 && totalAmount <= 0) {
                        alert('여러 건을 선택할 경우 총 매출금액이 양수여야 합니다.');
                        return;
                      }
                      
                      setBulkDepositModal(true);
                    }} 
                    size="sm"
                  >
                    일괄입금
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2"></th>
                <th className="border p-2">매출일자</th>
                <th className="border p-2">카드사</th>
                <th className="border p-2">매출금액</th>
                <th className="border p-2">입금예정일</th>
                <th className="border p-2">실제입금일</th>
                <th className="border p-2">실제입금액</th>
                <th className="border p-2">수수료</th>
                <th className="border p-2">수수료율</th>
                <th className="border p-2">상태</th>
                <th className="border p-2">보류사유</th>
                <th className="border p-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => {
                const feeRate = item.saleAmount ? ((item.fee || 0) / item.saleAmount * 100).toFixed(2) : '0.00';
                const isSelected = selectedRows.has(item._id);
                const isCompleted = item.status === '입금완료';
                
                return (
                  <tr key={item._id} className={isSelected ? 'bg-blue-50' : ''}>
                    <td className="border p-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isCompleted}
                        onChange={(e) => handleRowSelection(item._id, item.cardCompany, e.target.checked)}
                      />
                    </td>
                    <td className="border p-2">{new Date(item.saleDate).toLocaleDateString()}</td>
                    <td className="border p-2">{item.cardCompany}</td>
                    <td className="border p-2 text-right">{formatCurrency(item.saleAmount)}</td>
                    <td className="border p-2">{new Date(item.expectedDepositDate).toLocaleDateString()}</td>
                    <td className="border p-2">
                      {item.actualDepositDate ? new Date(item.actualDepositDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="border p-2 text-right">
                      {item.actualDepositAmount ? formatCurrency(item.actualDepositAmount) : '-'}
                    </td>
                    <td className="border p-2 text-right">
                      {item.fee ? formatCurrency(item.fee) : '-'}
                    </td>
                    <td className="border p-2 text-right">{feeRate}%</td>
                    <td className="border p-2">
                      <Select
                        value={item.status}
                        onValueChange={(status) => {
                          if (status === '입금완료') {
                            setCurrentEditId(item._id);
                            setActualDepositDate(item.expectedDepositDate.split('T')[0]);
                            setActualDepositAmount(item.saleAmount.toLocaleString());
                            setDepositModal(true);
                          } else if (status === '입금보류') {
                            setCurrentEditId(item._id);
                            setHoldReasonModal(true);
                          } else {
                            updateStatus(item._id, status, {
                              actualDepositAmount: null,
                              actualDepositDate: null,
                              fee: null,
                              holdReason: null
                            });
                          }
                        }}
                        disabled={false}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="미입금">미입금</SelectItem>
                          <SelectItem value="입금완료">입금완료</SelectItem>
                          <SelectItem value="입금보류">입금보류</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border p-2">{item.holdReason || '-'}</td>
                    <td className="border p-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditClick(item._id)}
                        disabled={editableRows.has(item._id)}
                      >
                        {editableRows.has(item._id) ? '수정중' : '수정'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 입금완료 모달 */}
        <Dialog open={depositModal} onOpenChange={setDepositModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>입금완료 처리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="actualDate">실제 입금일</Label>
                <Input
                  id="actualDate"
                  type="date"
                  value={actualDepositDate}
                  onChange={(e) => setActualDepositDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="actualAmount">실제 입금액</Label>
                <Input
                  id="actualAmount"
                  value={actualDepositAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setActualDepositAmount(value ? Number(value).toLocaleString() : '');
                  }}
                  placeholder="입금액을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositModal(false)}>취소</Button>
              <Button onClick={handleDepositComplete}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 입금보류 모달 */}
        <Dialog open={holdReasonModal} onOpenChange={setHoldReasonModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>입금보류 사유</DialogTitle>
            </DialogHeader>
            <div>
              <Label htmlFor="reason">보류 사유</Label>
              <Input
                id="reason"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="보류 사유를 입력하세요"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHoldReasonModal(false)}>취소</Button>
              <Button onClick={handleHoldDeposit}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 일괄입금 모달 */}
        <Dialog open={bulkDepositModal} onOpenChange={setBulkDepositModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>일괄입금 처리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">
                  선택된 건수: {selectedRows.size}건
                </div>
                <div className="text-sm text-gray-600">
                  총 매출액: {formatCurrency(Array.from(selectedRows).reduce((sum, id) => {
                    const item = data.find(d => d._id === id);
                    return sum + (item?.saleAmount || 0);
                  }, 0))}
                </div>
              </div>
              <div>
                <Label htmlFor="bulkDate">입금일자</Label>
                <Input
                  id="bulkDate"
                  type="date"
                  value={bulkDepositDate}
                  onChange={(e) => setBulkDepositDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bulkAmount">실제 입금액</Label>
                <Input
                  id="bulkAmount"
                  value={bulkActualAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setBulkActualAmount(value ? Number(value).toLocaleString() : '');
                  }}
                  placeholder="실제 입금액을 입력하세요"
                />
              </div>
              {bulkActualAmount && (
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    총 수수료: {formatCurrency(calculateBulkFee(bulkActualAmount))}
                  </div>
                  {calculateBulkFee(bulkActualAmount) < 0 && (
                    <div className="text-sm text-red-600">
                      ⚠️ 실제 입금액이 총 매출액보다 클 수 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDepositModal(false)}>취소</Button>
              <Button onClick={handleBulkDeposit}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 크롤링 진행 상황 모달 */}
        <Dialog open={crawlingModal} onOpenChange={(open) => {
          if (!open && crawlingStatus.step !== 'completed' && crawlingStatus.step !== 'error') {
            // 진행 중일 때는 모달을 닫을 수 없음
            return;
          }
          setCrawlingModal(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {crawlingStatus.step === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : crawlingStatus.step === 'error' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                )}
                카드매출 크롤링
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{crawlingStatus.message}</span>
                  <span className="text-gray-500">{crawlingStatus.progress}%</span>
                </div>
                <Progress value={crawlingStatus.progress} className="h-2" />
              </div>
              
              {crawlingStatus.details && (
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm">처리 결과</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">전체</div>
                      <div className="font-bold">{crawlingStatus.details.total}건</div>
                    </div>
                    <div>
                      <div className="text-gray-600">성공</div>
                      <div className="font-bold text-green-600">{crawlingStatus.details.processed}건</div>
                    </div>
                    <div>
                      <div className="text-gray-600">실패</div>
                      <div className="font-bold text-red-600">{crawlingStatus.details.errors}건</div>
                    </div>
                  </div>
                </div>
              )}

              {crawlingStatus.errorDetails && crawlingStatus.errorDetails.length > 0 && (
                <div className="space-y-2 bg-red-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <h4 className="font-medium text-sm text-red-800">실패 상세 정보</h4>
                  <div className="space-y-2">
                    {crawlingStatus.errorDetails.map((error, index) => (
                      <div key={index} className="border-l-2 border-red-300 pl-3 text-xs bg-white p-2 rounded">
                        <div className="font-medium text-red-700">
                          {error.data?.originalCardCompany} - {error.data?.saleAmount?.toLocaleString()}원
                        </div>
                        <div className="text-red-600 mt-1">{error.error}</div>
                        <div className="text-gray-600 text-xs mt-1 space-y-1">
                          {error.data?.date && <div>매출일: {error.data.date}</div>}
                          {error.data?.actualAmount && <div>실입금액: {error.data.actualAmount}</div>}
                          {error.data?.mappedCardCompany !== error.data?.originalCardCompany && (
                            <div>매핑: {error.data?.originalCardCompany} → {error.data?.mappedCardCompany}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${
                    ['initializing', 'login'].includes(crawlingStatus.step) ? 'bg-blue-500 animate-pulse' : 
                    crawlingStatus.progress >= 30 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>로그인</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${
                    ['searching', 'extracting'].includes(crawlingStatus.step) ? 'bg-blue-500 animate-pulse' : 
                    crawlingStatus.progress >= 70 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>데이터 조회 및 추출</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${
                    crawlingStatus.step === 'processing' ? 'bg-blue-500 animate-pulse' : 
                    crawlingStatus.progress >= 90 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>데이터 처리</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${
                    crawlingStatus.step === 'completed' ? 'bg-green-500' : 
                    crawlingStatus.step === 'error' ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <span>완료</span>
                </div>
              </div>
            </div>
            {(crawlingStatus.step === 'completed' || crawlingStatus.step === 'error') && (
              <DialogFooter>
                <Button 
                  onClick={() => {
                    setCrawlingModal(false);
                    setCrawlingStatus({
                      step: 'ready',
                      progress: 0,
                      message: '크롤링을 시작합니다...'
                    });
                  }}
                  variant={crawlingStatus.step === 'error' ? 'destructive' : 'default'}
                >
                  닫기
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
} 