'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, toISODateString, getCurrentKstDate } from '@/lib/utils';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

// 타입 정의
interface Consultation {
  _id: string;
  date: string;
  confirmedDate?: string;
  chartNumber: string;
  patientName: string;
  doctor: string;
  staff: string;
  amount: number;
  agreed: boolean;
  notes?: string;
}

interface Transaction {
  _id: string;
  date: string;
  chartNumber: string;
  patientName: string;
  paymentAmount: number;
  isConsultation: boolean;
}

interface Payment {
  date: string;
  amount: number;
}

interface ConsultationGroup {
  chartNumber: string;
  patientName: string;
  consultations: Consultation[];
  payments: {
    consultation: Payment[];
    normal: Payment[];
  };
  lastConsultDate: Date;
}

interface ConsultationTotals {
  total: number;
  agreed: number;
  notAgreed: number;
  paid: number;
}

export default function ConsultationPayment() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredData, setFilteredData] = useState<ConsultationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 필터 상태
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPeriodDays, setCurrentPeriodDays] = useState('30');
  const [currentStatus, setCurrentStatus] = useState('all');
  const [notAgreedFilter, setNotAgreedFilter] = useState('all');

  // 초기 날짜 설정
  useEffect(() => {
    const today = getCurrentKstDate();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    setStartDate(toISODateString(oneMonthAgo));
    setEndDate(toISODateString(today));
  }, []);

  // 데이터 로드
  useEffect(() => {
    if (startDate && endDate && isLoaded && isSignedIn) {
      loadData();
    }
  }, [startDate, endDate, currentStatus, notAgreedFilter, isLoaded, isSignedIn]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const token = await getToken();
      if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/sign-in';
        return;
      }
      
      // 상담 데이터 조회 (날짜 파라미터 포함)
      const consultParams = new URLSearchParams({
        dateStart: startDate,
        dateEnd: endDate,
        limit: '1000' // 충분히 큰 값으로 설정
      });
      
      const consultResponse = await fetch(`/api/consultations?${consultParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!consultResponse.ok) {
        if (consultResponse.status === 401) {
          alert('로그인이 필요합니다.');
          window.location.href = '/sign-in';
          return;
        }
        throw new Error(`상담 데이터 조회 실패: ${consultResponse.status}`);
      }
      
      const consultationsData = await consultResponse.json();

      // 수납 데이터 조회 (날짜 파라미터 포함)
      const transParams = new URLSearchParams({
        dateStart: startDate,
        dateEnd: endDate,
        limit: '1000' // 충분히 큰 값으로 설정
      });
      
      const transResponse = await fetch(`/api/transactions?${transParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!transResponse.ok) {
        if (transResponse.status === 401) {
          alert('로그인이 필요합니다.');
          window.location.href = '/sign-in';
          return;
        }
        throw new Error(`수납 데이터 조회 실패: ${transResponse.status}`);
      }
      
      const transactionsData = await transResponse.json();

      // API 응답에서 실제 데이터 배열 추출
      const consultationsArray = consultationsData.consultations || [];
      const transactionsArray = transactionsData.transactions || [];

      setConsultations(consultationsArray);
      setTransactions(transactionsArray);
      
      // 필터링 및 그룹화
      filterAndGroupData(consultationsArray, transactionsArray);
      
    } catch (error) {
      console.error('데이터 로드 중 에러:', error);
      if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
        alert('인증에 실패했습니다. 다시 로그인해주세요.');
        window.location.href = '/sign-in';
      } else {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        alert('데이터를 불러오는데 실패했습니다: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterAndGroupData = (consultationsData: Consultation[], transactionsData: Transaction[]) => {
    // API에서 이미 날짜 필터링이 되어 오므로 추가 날짜 필터링 불필요
    let groupedData = groupConsultationsByChart(consultationsData, transactionsData);

    // 상태 필터링
    if (currentStatus !== 'all') {
      groupedData = groupedData.filter(group => {
        const filteredConsultations = group.consultations.filter(consultation => {
          const isAgreed = consultation.agreed;
          const amount = consultation.amount || 0;
          const paidAmount = group.payments.consultation
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          switch (currentStatus) {
            case 'completed':
              return isAgreed && amount > 0 && amount <= paidAmount;
            case 'partial':
              return isAgreed && amount > 0 && amount > paidAmount;
            case 'pending':
              return isAgreed && amount > 0 && amount < paidAmount;
            case 'notagreed':
              return !isAgreed;
            default:
              return true;
          }
        });

        if (filteredConsultations.length > 0) {
          group.consultations = filteredConsultations;
          return true;
        }
        return false;
      });
    }

    // 미동의 금액 필터링
    if (notAgreedFilter !== 'all') {
      groupedData = groupedData.filter(group => {
        const notAgreedAmount = group.consultations
          .filter(c => !c.agreed)
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        
        switch (notAgreedFilter) {
          case 'under100': return notAgreedAmount <= 1000000;
          case 'over100': return notAgreedAmount > 1000000;
          case 'over200': return notAgreedAmount > 2000000;
          case 'over300': return notAgreedAmount > 3000000;
          default: return true;
        }
      });
    }

    setFilteredData(groupedData);
  };

  const groupConsultationsByChart = (consultations: Consultation[], transactions: Transaction[]): ConsultationGroup[] => {
    const groups: { [key: string]: ConsultationGroup } = {};
    
    consultations.forEach(consultation => {
      if (!groups[consultation.chartNumber]) {
        groups[consultation.chartNumber] = {
          chartNumber: consultation.chartNumber,
          patientName: consultation.patientName,
          consultations: [],
          payments: {
            consultation: [],
            normal: []
          },
          lastConsultDate: new Date(consultation.date)
        };
      }
      groups[consultation.chartNumber].consultations.push(consultation);
      
      const consultDate = new Date(consultation.date);
      if (consultDate > groups[consultation.chartNumber].lastConsultDate) {
        groups[consultation.chartNumber].lastConsultDate = consultDate;
      }
    });

    // 수납 내역 추가
    transactions.forEach(transaction => {
      if (groups[transaction.chartNumber]) {
        if (transaction.isConsultation) {
          groups[transaction.chartNumber].payments.consultation.push({
            date: transaction.date,
            amount: transaction.paymentAmount
          });
        } else {
          groups[transaction.chartNumber].payments.normal.push({
            date: transaction.date,
            amount: transaction.paymentAmount
          });
        }
      }
    });

    // 각 그룹 내 정렬
    Object.values(groups).forEach(group => {
      group.consultations.sort((a, b) => {
        const dateA = a.agreed ? new Date(a.confirmedDate!) : new Date(a.date);
        const dateB = b.agreed ? new Date(b.confirmedDate!) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      group.payments.consultation.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      group.payments.normal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    // 최근 날짜 기준으로 그룹 정렬
    return Object.values(groups).sort((a, b) => {
      const getLatestDate = (group: ConsultationGroup) => {
        if (!group.consultations.length) return new Date(0);
        const consultation = group.consultations[0];
        return consultation.agreed ? new Date(consultation.confirmedDate!) : new Date(consultation.date);
      };
      
      const dateA = getLatestDate(a);
      const dateB = getLatestDate(b);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const calculateTotals = (): ConsultationTotals => {
    return filteredData.reduce((acc, group) => {
      const totalAmount = group.consultations.reduce((sum, c) => sum + (c.amount || 0), 0);
      const agreedAmount = group.consultations.filter(c => c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
      const notAgreedAmount = group.consultations.filter(c => !c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
      const paidAmount = group.payments.consultation.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      return {
        total: acc.total + totalAmount,
        agreed: acc.agreed + agreedAmount,
        notAgreed: acc.notAgreed + notAgreedAmount,
        paid: acc.paid + paidAmount
      };
    }, { total: 0, agreed: 0, notAgreed: 0, paid: 0 });
  };

  const toggleGroupExpansion = (chartNumber: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(chartNumber)) {
      newExpanded.delete(chartNumber);
    } else {
      newExpanded.add(chartNumber);
    }
    setExpandedGroups(newExpanded);
  };

  const exportToExcel = async () => {
    if (!filteredData || filteredData.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    try {
      // 동적으로 XLSX 라이브러리 로드
      const XLSX = await import('xlsx');
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const defaultFileName = `상담수납_${timestamp}.xlsx`;

      const excelData = filteredData.map(group => ({
        '차트번호': group.chartNumber,
        '환자명': group.patientName,
        '총액': group.consultations.reduce((sum, c) => sum + (c.amount || 0), 0),
        '동의금액': group.consultations.filter(c => c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0),
        '미동의금액': group.consultations.filter(c => !c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0),
        '수납금액': group.payments.consultation.reduce((sum, p) => sum + (p.amount || 0), 0),
        '최근상담일': new Date(group.lastConsultDate).toLocaleDateString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "상담수납현황");

      XLSX.writeFile(workbook, defaultFileName);
    } catch (error) {
      console.error('엑셀 저장 중 에러:', error);
      alert('엑셀 파일 저장에 실패했습니다.');
    }
  };

  const totals = calculateTotals();
  const agreedRate = totals.total > 0 ? ((totals.agreed / totals.total) * 100).toFixed(1) : 0;

  if (!isLoaded) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="min-h-[400px] flex items-center justify-center">
            <p className="text-gray-500">인증 정보를 확인하는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSignedIn) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="min-h-[400px] flex items-center justify-center">
            <p className="text-gray-500">로그인이 필요합니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="min-h-[400px] flex items-center justify-center">
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6 space-y-6">
        {/* 필터 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">시작일</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">종료일</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">수납상태</label>
            <Select value={currentStatus} onValueChange={setCurrentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="completed">완납</SelectItem>
                <SelectItem value="partial">부분납부</SelectItem>
                <SelectItem value="pending">초과납부</SelectItem>
                <SelectItem value="notagreed">미동의</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">미동의금액</label>
            <Select value={notAgreedFilter} onValueChange={setNotAgreedFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="under100">100만원 이하</SelectItem>
                <SelectItem value="over100">100만원 초과</SelectItem>
                <SelectItem value="over200">200만원 초과</SelectItem>
                <SelectItem value="over300">300만원 초과</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 합계 섹션 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600">상담총액</div>
              <div className="text-lg font-bold">{formatCurrency(totals.total)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600">동의금액</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(totals.agreed)}
                <div className="text-xs">동의율: {agreedRate}%</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600">미동의금액</div>
              <div className="text-lg font-bold text-gray-600">{formatCurrency(totals.notAgreed)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600">상담수납액</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(totals.paid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600">진료잔액</div>
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(Math.abs(totals.agreed - totals.paid))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 엑셀 내보내기 버튼 */}
        <div className="flex justify-end">
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            엑셀 저장
          </Button>
        </div>

        {/* 데이터 리스트 */}
        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              조건에 맞는 데이터가 없습니다.
            </div>
          ) : (
            filteredData.map((group) => {
              const totalConsultAmount = group.consultations.reduce((sum, c) => sum + (c.amount || 0), 0);
              const agreedAmount = group.consultations.filter(c => c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
              const notAgreedAmount = group.consultations.filter(c => !c.agreed).reduce((sum, c) => sum + (c.amount || 0), 0);
              const totalConsultPaidAmount = group.payments.consultation.reduce((sum, p) => sum + (p.amount || 0), 0);
              const remainingAmount = agreedAmount - totalConsultPaidAmount;
              const isExpanded = expandedGroups.has(group.chartNumber);

              let remainingText = '';
              let statusClass = '';
              
              if (agreedAmount === 0 && totalConsultPaidAmount === 0) {
                remainingText = '미동의';
                statusClass = 'text-gray-600';
              } else if (remainingAmount > 0) {
                remainingText = '미납금액';
                statusClass = 'text-red-600';
              } else if (remainingAmount < 0) {
                remainingText = '초과납부';
                statusClass = 'text-purple-600';
              } else {
                remainingText = '완납';
                statusClass = 'text-green-600';
              }

              return (
                <Card key={group.chartNumber} className="border">
                  <CardContent className="p-0">
                    {/* 그룹 헤더 */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleGroupExpansion(group.chartNumber)}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-center">
                        <div className="md:col-span-2">
                          <div className="font-medium">{group.chartNumber}</div>
                          <div className="text-sm text-gray-600">{group.patientName}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">상담총액</div>
                          <div className="font-medium">{formatCurrency(totalConsultAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">동의금액</div>
                          <div className="font-medium text-blue-600">{formatCurrency(agreedAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">미동의금액</div>
                          <div className="font-medium text-gray-600">{formatCurrency(notAgreedAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">상담수납액</div>
                          <div className="font-medium text-red-600">{formatCurrency(totalConsultPaidAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">수납상태</div>
                          <div className={`font-medium ${statusClass}`}>
                            {remainingText} {agreedAmount === 0 && totalConsultPaidAmount === 0 ? '' : formatCurrency(Math.abs(remainingAmount))}
                          </div>
                          <div className="mt-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 상세 정보 */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* 상담 내역 */}
                          <div>
                            <h4 className="font-medium mb-3">상담 내역</h4>
                            <div className="space-y-2">
                              {group.consultations.map((consultation, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                                  <div>
                                    <div className="text-sm">
                                      {new Date(consultation.agreed ? consultation.confirmedDate! : consultation.date).toLocaleDateString()}
                                    </div>
                                    <div className={`text-xs ${consultation.agreed ? 'text-blue-600' : 'text-gray-600'}`}>
                                      {consultation.agreed ? '동의' : '미동의'}
                                    </div>
                                  </div>
                                  <div className={`font-medium ${consultation.agreed ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {formatCurrency(consultation.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 상담 수납 내역 */}
                          <div>
                            <h4 className="font-medium mb-3">상담 수납 내역</h4>
                            <div className="space-y-2">
                              {group.payments.consultation.length === 0 ? (
                                <div className="text-sm text-gray-500 p-2">수납 내역이 없습니다.</div>
                              ) : (
                                group.payments.consultation.map((payment, index) => (
                                  <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                                    <div className="text-sm">
                                      {new Date(payment.date).toLocaleDateString()}
                                    </div>
                                    <div className="font-medium text-red-600">
                                      {formatCurrency(payment.amount)}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
} 