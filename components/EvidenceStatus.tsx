'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Download, X, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Expense } from '@/lib/types';
import { toISODateString, getCurrentKstDate } from '@/lib/utils';
import ExpenseModal from './ExpenseModal';
import ManualMatchingModal from './ManualMatchingModal';

export default function EvidenceStatus() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  
  // 날짜 필터 상태
  const [dateFilters, setDateFilters] = useState(() => {
    const today = getCurrentKstDate();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    return {
      startDate: toISODateString(oneMonthAgo),
      endDate: toISODateString(today)
    };
  });

  // 지출 데이터 로드
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilters.startDate) params.append('dateStart', dateFilters.startDate);
      if (dateFilters.endDate) params.append('dateEnd', dateFilters.endDate);
      params.append('limit', '1000'); // 많은 데이터를 가져오기 위해 limit 증가
      
      const response = await fetch(`/api/expenses?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('지출 데이터를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        let filteredExpenses = data.data;
        
        // 영수증 필터 적용
        if (receiptFilter !== 'all') {
          filteredExpenses = data.data.filter((expense: Expense) => 
            receiptFilter === 'yes' ? expense.hasReceipt : !expense.hasReceipt
          );
        }
        
        setExpenses(filteredExpenses);
        
        // 총액 계산
        const total = filteredExpenses.reduce((sum: number, expense: Expense) => 
          sum + (expense.amount || 0), 0);
        setTotalAmount(total);
      } else {
        setExpenses([]);
        setTotalAmount(0);
      }
    } catch (error) {
      console.error('지출 데이터 로드 중 에러:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
      setExpenses([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 필터 변경 시 데이터 로드
  useEffect(() => {
    loadExpenses();
  }, [dateFilters.startDate, dateFilters.endDate, receiptFilter]);

  // 날짜 필터 변경 처리
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 지출 수정 모달 열기
  const handleEditExpense = (expense: Expense) => {
    setEditItem(expense);
    setIsModalOpen(true);
  };

  // 지출 삭제
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('정말 이 지출 내역을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('지출 정보 삭제에 실패했습니다.');
      }
      
      toast.success('지출 내역이 삭제되었습니다.');
      loadExpenses(); // 목록 새로고침
    } catch (error) {
      console.error('지출 정보 삭제 중 에러:', error);
      toast.error('지출 내역 삭제에 실패했습니다.');
    }
  };

  // 영수증 상태 토글
  const handleToggleReceipt = async (expense: Expense) => {
    try {
      const response = await fetch(`/api/expenses/${expense._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...expense,
          hasReceipt: !expense.hasReceipt,
        }),
      });

      if (!response.ok) {
        throw new Error('영수증 상태 업데이트에 실패했습니다.');
      }
      
      toast.success(`영수증 상태가 "${!expense.hasReceipt ? '있음' : '없음'}"으로 변경되었습니다.`);
      loadExpenses(); // 목록 새로고침
    } catch (error) {
      console.error('영수증 상태 업데이트 중 에러:', error);
      toast.error('영수증 상태 변경에 실패했습니다.');
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  // 지출 등록/수정 완료 처리
  const handleSuccess = () => {
    loadExpenses(); // 목록 새로고침
    handleCloseModal(); // 모달 닫기
  };

  // 자동 크롤링 상태 관리
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlingStatus, setCrawlingStatus] = useState({ progress: 0, message: '' });
  const [showCrawlingModal, setShowCrawlingModal] = useState(false);
  const [crawlingComplete, setCrawlingComplete] = useState(false);
  const [matchingResults, setMatchingResults] = useState<any>(null);
  const [showManualMatchingModal, setShowManualMatchingModal] = useState(false);

  // 자동 크롤링 시작
  const handleAutoCrawling = () => {
    setShowCrawlingModal(true);
    setCrawlingComplete(false);
    setMatchingResults(null);
    setCrawlingStatus({ progress: 0, message: '자동 크롤링을 시작하려면 시작 버튼을 클릭하세요.' });
  };

  // 크롤링 실행
  const startCrawling = async () => {
    setIsCrawling(true);
    
    try {
      setCrawlingStatus({ progress: 10, message: '홈택스 로그인 중...' });

      const response = await fetch('/api/hometax/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('크롤링 요청 실패');
      }

      // 크롤링 진행 상태 모니터링 (폴링 방식)
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch('/api/hometax/status');
          if (!statusResponse.ok) {
            throw new Error('상태 확인 실패');
          }
          
          const data = await statusResponse.json();
          setCrawlingStatus({ progress: data.progress, message: data.message });

          if (data.progress >= 100) {
            setIsCrawling(false);
            
            setCrawlingStatus({ progress: 100, message: '영수증 매칭 중...' });
            try {
              const matchResponse = await fetch('/api/hometax/match-receipts');
              
              if (!matchResponse.ok) {
                throw new Error('영수증 매칭 요청 실패');
              }
              
              const matchResults = await matchResponse.json();
              
              // 자동 매칭 리스트 처리
              const successfulMatches = [];
              const failedMatches = [];
              
              for (const match of matchResults.automatic) {
                try {
                  const response = await fetch('/api/hometax/confirm-match', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expenseId: match.expense._id })
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok && result.success) {
                    successfulMatches.push(match);
                    console.log(`[자동 매칭 성공] ${match.expense.vendor} ${match.expense.amount}원`);
                  } else {
                    failedMatches.push(match);
                    console.error(`[자동 매칭 실패] ${match.expense.vendor} ${match.expense.amount}원:`, result.error || '알 수 없는 오류');
                  }
                } catch (error) {
                  failedMatches.push(match);
                  console.error(`[자동 매칭 API 오류] ${match.expense.vendor} ${match.expense.amount}원:`, error);
                }
              }
              
              // 실제 성공한 매칭만 결과에 반영
              const updatedMatchResults = {
                ...matchResults,
                automatic: successfulMatches,
                failed: failedMatches
              };
              
              // 결과를 상태에 저장하고 완료 화면 표시
              setMatchingResults(updatedMatchResults);
              setCrawlingComplete(true);
              setCrawlingStatus({ 
                progress: 100, 
                message: `크롤링 완료! 자동 매칭: ${successfulMatches.length}건, 실패: ${failedMatches.length}건, 수동 확인 필요: ${matchResults.needConfirmation.length}건` 
              });
              
              // 매칭 완료 후 즉시 새로고침 (실제 성공한 매칭만 반영되었으므로)
              if (successfulMatches.length > 0) {
                // 성공한 매칭이 있는 경우에만 새로고침
                setTimeout(() => {
                  loadExpenses();
                }, 500); // 대기 시간을 500ms로 단축
              }
              
            } catch (error) {
              console.error('영수증 매칭 중 오류:', error);
              setCrawlingStatus({ progress: 100, message: '영수증 매칭 중 오류가 발생했습니다.' });
            }
            return; // 완료되면 폴링 중단
          }

          // 아직 진행 중이면 1초 후 다시 확인
          setTimeout(pollStatus, 1000);
          
        } catch (error) {
          console.error('상태 확인 오류:', error);
          setTimeout(pollStatus, 2000); // 오류 시 2초 후 재시도
        }
      };

      // 폴링 시작
      pollStatus();

    } catch (error) {
      console.error('크롤링 실패:', error);
      setCrawlingStatus({ progress: 0, message: '크롤링 중 오류가 발생했습니다.' });
      setIsCrawling(false);
      toast.error('크롤링 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 필터 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">증빙자료 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">시작일</Label>
              <Input
                id="start-date"
                type="date"
                value={dateFilters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">종료일</Label>
              <Input
                id="end-date"
                type="date"
                value={dateFilters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-filter">영수증 필터</Label>
              <Select value={receiptFilter} onValueChange={(value: 'all' | 'yes' | 'no') => setReceiptFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="yes">있음</SelectItem>
                  <SelectItem value="no">없음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Button onClick={handleAutoCrawling} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                자동 크롤링
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결과 영역 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">지출 내역</CardTitle>
          <div className="text-sm font-medium">
            총 {expenses.length}건, {totalAmount.toLocaleString()}원
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">데이터를 불러오는 중...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              지출 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {/* 헤더 */}
              <div className="grid grid-cols-8 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm">
                <div>지출일자</div>
                <div>지출내역</div>
                <div>거래처</div>
                <div>지출방법</div>
                <div>지출금액</div>
                <div>영수증</div>
                <div>비고</div>
                <div className="text-center">관리</div>
              </div>
              
              {/* 데이터 행들 */}
              <div className="max-h-[500px] overflow-y-auto space-y-1">
                {expenses.map((expense) => (
                  <div key={expense._id} className="grid grid-cols-8 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-sm">
                      {new Date(expense.date).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="text-sm font-medium">{expense.details}</div>
                    <div className="text-sm">{expense.vendor || '-'}</div>
                    <div className="text-sm">{expense.method}</div>
                    <div className="text-sm font-medium text-right">
                      {expense.amount.toLocaleString()}원
                    </div>
                    <div className="text-sm">
                      <button
                        onClick={() => handleToggleReceipt(expense)}
                        className={`px-2 py-1 rounded-full text-xs transition-colors hover:opacity-80 ${
                          expense.hasReceipt 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {expense.hasReceipt ? '있음' : '없음'}
                      </button>
                    </div>
                    <div className="text-sm truncate">{expense.notes || ''}</div>
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense._id || '')}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 지출 등록/수정 모달 */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        defaultDate={new Date()}
        editItem={editItem}
      />

      {/* 크롤링 모달 */}
      {showCrawlingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[480px] max-w-[90vw] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">홈택스 자동 크롤링</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!isCrawling) {
                    setShowCrawlingModal(false);
                  }
                }}
                disabled={isCrawling}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {isCrawling && (
                  <RotateCw className="h-8 w-8 animate-spin text-blue-500" />
                )}
                {crawlingComplete && (
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              
              <p className="text-center text-sm text-gray-600">
                {crawlingStatus.message}
              </p>
              
              {!crawlingComplete && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${crawlingStatus.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-center text-xs text-gray-500">
                    {crawlingStatus.progress}%
                  </div>
                </>
              )}
              
              {crawlingComplete && matchingResults && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">매칭 결과</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-100 p-3 rounded">
                      <div className="font-medium text-green-800">자동 매칭</div>
                      <div className="text-lg font-bold text-green-600">
                        {matchingResults.automatic.length}건
                      </div>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded">
                      <div className="font-medium text-yellow-800">수동 확인 필요</div>
                      <div className="text-lg font-bold text-yellow-600">
                        {matchingResults.needConfirmation.length}건
                      </div>
                    </div>
                  </div>
                  
                  {/* 자동 매칭된 내역 표시 */}
                  {matchingResults.automatic && matchingResults.automatic.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-sm mb-2 text-green-800">자동 매칭 완료 내역</h5>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {matchingResults.automatic.map((match: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-green-200">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{match.expense.vendor}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-700">
                                    {match.type === 'cash' ? match.receipt.상호명 : match.receipt.상호}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>지출: {new Date(match.expense.date).toLocaleDateString('ko-KR')} · {match.expense.amount.toLocaleString()}원</div>
                                  <div>
                                    영수증: {new Date(match.type === 'cash' ? match.receipt.매입일시 : match.receipt.작성일자).toLocaleDateString('ko-KR')} · 
                                    {(match.type === 'cash' ? match.receipt.매입금액 : match.receipt.합계금액).toLocaleString()}원
                                  </div>
                                  <div className="text-gray-500">{match.expense.details}</div>
                                </div>
                              </div>
                              <div className="text-green-600 font-medium text-xs whitespace-nowrap">
                                ✓ {match.type === 'tax' ? '세금계산서' : match.type === 'cash' ? '현금영수증' : '전자계산서'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 실패한 매칭 내역 표시 */}
                  {matchingResults.failed && matchingResults.failed.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-sm mb-2 text-red-800">매칭 실패 내역</h5>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {matchingResults.failed.map((match: any, index: number) => (
                          <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{match.expense.vendor}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-red-700">매칭 실패</span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <div>지출: {new Date(match.expense.date).toLocaleDateString('ko-KR')} · {match.expense.amount.toLocaleString()}원</div>
                                  <div className="text-gray-500">{match.expense.details}</div>
                                </div>
                              </div>
                              <div className="text-red-600 font-medium text-xs whitespace-nowrap">
                                ✗ 실패
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              {crawlingComplete ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCrawlingModal(false);
                      // 모달 닫을 때 데이터 새로고침으로 UI 업데이트 보장
                      loadExpenses();
                    }}
                  >
                    닫기
                  </Button>
                  {matchingResults && matchingResults.needConfirmation.length > 0 && (
                    <Button
                      onClick={() => {
                        setShowCrawlingModal(false);
                        setShowManualMatchingModal(true);
                      }}
                    >
                      수동 확인 ({matchingResults.needConfirmation.length}건)
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!isCrawling) {
                        setShowCrawlingModal(false);
                      }
                    }}
                    disabled={isCrawling}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={startCrawling}
                    disabled={isCrawling}
                  >
                    {isCrawling ? '진행 중...' : '시작'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 수동 매칭 확인 모달 */}
      <ManualMatchingModal
        isOpen={showManualMatchingModal}
        onClose={() => setShowManualMatchingModal(false)}
        matchingResults={matchingResults}
        onComplete={() => {
          // 매칭 완료 후 데이터 새로고침
          loadExpenses();
          setMatchingResults(null);
        }}
      />
    </div>
  );
} 