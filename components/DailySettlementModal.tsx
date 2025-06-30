'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toISODateString } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { 
  CreditCard, 
  Banknote, 
  TrendingDown, 
  TrendingUp,
  Package, 
  Receipt, 
  Users,
  UserPlus,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle
} from 'lucide-react';

type PaymentMethodData = {
  count: number;
  amount: number;
  transactions: any[];
};

type SettlementData = {
  date: string;
  income: {
    paymentByMethod: Record<string, PaymentMethodData>;
    cardByCompany: Record<string, { count: number; amount: number }>;
    totalAmount: number;
    extraIncomes: any[];
    extraIncomeTotal: number;
  };
  expenses: {
    items: any[];
    totalAmount: number;
  };
  cashRecords: {
    records: any[];
    summary: {
      previousBalance: number;
      cashIncome: number;
      cashExpense: number;
      bankDeposit: number;
      netCash: number;
      endBalance: number;
    };
  };
  implant: {
    implantCount: number;
    fixtureCount: number;
    placements: any[];
  };
  dentalProducts: {
    sales: any[];
    inventoryLogs: any[];
  };
  cashReceipts: {
    transactions: any[];
    count: number;
    totalAmount: number;
    nonIssuedTransactions?: any[];
  };
  consultations: {
    all: any[];
    agreed: any[];
    nonAgreed: any[];
    agreedAmount: number;
    nonAgreedAmount: number;
  };
  newPatientCount: number;
  settlementCheck?: {
    income: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    expenses: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    cashRecords: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    implant: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    dentalProducts: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    consultations: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    cashReceipts: { checked: boolean; checkedBy?: string; checkedAt?: Date };
    isCompleted: boolean;
    completedBy?: string;
    completedAt?: Date;
  };
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onDateChange?: (date: Date) => void;
};

export default function DailySettlementModal({ isOpen, onClose, date, onDateChange }: Props) {
  const { user } = useUser();
  const [data, setData] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [checkStates, setCheckStates] = useState<any>({});

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateString = toISODateString(date);
      
      // 일일결산 데이터와 체크 상태를 병렬로 조회
      const [settlementResponse, checkResponse] = await Promise.all([
        fetch(`/api/daily-settlement?date=${dateString}`),
        fetch(`/api/daily-settlement-check?date=${dateString}`)
      ]);
      
      if (!settlementResponse.ok) {
        throw new Error('일일결산 데이터를 가져오는데 실패했습니다.');
      }
      
      const settlementData = await settlementResponse.json();
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        setCheckStates(checkData);
      }
      
      setData(settlementData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('일일결산 데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettlementData();
    }
  }, [isOpen, date]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>일일결산 - 로딩 중...</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p>데이터를 불러오는 중입니다...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>일일결산 - 오류</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) return null;

  const totalIncome = data.income.totalAmount + data.income.extraIncomeTotal;
  const patientCount = Object.values(data.income.paymentByMethod).reduce((sum, method) => sum + method.count, 0);
  
  const handlePreviousDay = () => {
    if (onDateChange) {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() - 1);
      onDateChange(newDate);
    }
  };
  
  const handleNextDay = () => {
    if (onDateChange) {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + 1);
      onDateChange(newDate);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && onDateChange) {
      onDateChange(selectedDate);
      setIsCalendarOpen(false);
    }
  };

  const handleSectionCheck = async (section: string, checked: boolean) => {
    try {
      const dateString = toISODateString(date);
      
      const response = await fetch('/api/daily-settlement-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateString,
          section,
          checked,
          checkedBy: user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || 'Unknown User'
        }),
      });

      if (!response.ok) {
        throw new Error('체크 상태 업데이트에 실패했습니다.');
      }

      const updatedCheckData = await response.json();
      setCheckStates(updatedCheckData);
    } catch (err) {
      console.error('체크 상태 업데이트 오류:', err);
      // 에러 발생 시 UI 상태 되돌리기
      fetchSettlementData();
    }
  };

  // 체크박스 컴포넌트
  const SectionCheckbox = ({ section, title }: { section: string; title: string }) => {
    const isChecked = checkStates[section]?.checked || false;
    const checkedBy = checkStates[section]?.checkedBy;
    const checkedAt = checkStates[section]?.checkedAt;

    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
        onClick={() => handleSectionCheck(section, !isChecked)}
        title={isChecked ? `${checkedBy}가 ${checkedAt ? new Date(checkedAt).toLocaleString('ko-KR') : ''}에 확인함` : '클릭하여 확인 완료 표시'}
      >
        {isChecked ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-xs text-gray-600 select-none">
          {isChecked ? '확인완료' : '미확인'}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              일일결산
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-base font-medium px-3 hover:bg-gray-50"
                  >
                    {date.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 상단 요약 통계 - 컴팩트 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">총 수입</p>
                  <p className="text-lg font-bold text-blue-700">₩{formatAmount(totalIncome)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs text-gray-600">총 지출</p>
                  <p className="text-lg font-bold text-red-700">₩{formatAmount(data.expenses.totalAmount)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">신환수</p>
                  <p className="text-lg font-bold text-green-700">{data.newPatientCount}명</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">환자수</p>
                  <p className="text-lg font-bold text-purple-700">{patientCount}명</p>
                </div>
              </div>
            </div>
          </div>

          {/* 전체 마감 완료 상태 표시 */}
          {checkStates.isCompleted && (
            <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">일일결산 완료</p>
                  <p className="text-sm text-green-700">
                    {checkStates.completedBy} 에 의해 {checkStates.completedAt ? new Date(checkStates.completedAt).toLocaleString('ko-KR') : ''}에 완료했습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 메인 콘텐츠 영역 - 컴팩트 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 첫 번째 열: 수입/지출/현금시재 */}
            <div className="space-y-4">
              {/* 수입내역 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.income?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-blue-600 rounded flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-white" />
                      </div>
                      수입내역
                    </CardTitle>
                    <SectionCheckbox section="income" title="수입내역" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {Object.entries(data.income.paymentByMethod).map(([method, details]) => (
                      <div key={method} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{method}</span>
                            <Badge variant="secondary" className="text-xs">{details.count}건</Badge>
                          </div>
                          <span className="font-bold text-blue-600 text-sm">₩{formatAmount(details.amount)}</span>
                        </div>
                        {method === '카드' && data.income.cardByCompany && Object.keys(data.income.cardByCompany).length > 0 && (
                          <div className="mt-1 ml-2 space-y-1">
                            {Object.entries(data.income.cardByCompany).map(([company, info]) => (
                              <div key={company} className="flex justify-between text-xs text-gray-600">
                                <span>└ {company}</span>
                                <span>₩{formatAmount(info.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {data.income.extraIncomeTotal > 0 && (
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">진료외수입</span>
                            <Badge variant="secondary" className="text-xs">{data.income.extraIncomes.length}건</Badge>
                          </div>
                          <span className="font-bold text-green-600 text-sm">₩{formatAmount(data.income.extraIncomeTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 지출내역 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.expenses?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-red-600 rounded flex items-center justify-center">
                        <TrendingDown className="h-3 w-3 text-white" />
                      </div>
                      지출내역
                    </CardTitle>
                    <SectionCheckbox section="expenses" title="지출내역" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.expenses.items.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {data.expenses.items.map((expense, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{expense.details || expense.description || '지출'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">{expense.vendor || expense.category || ''}</p>
                                {expense.method && (
                                  <Badge variant="outline" className="text-xs">{expense.method}</Badge>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-red-600 text-sm ml-2">₩{formatAmount(expense.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-4 text-sm">지출 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* 현금시재 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.cashRecords?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-green-600 rounded flex items-center justify-center">
                        <Banknote className="h-3 w-3 text-white" />
                      </div>
                      현금시재
                    </CardTitle>
                    <SectionCheckbox section="cashRecords" title="현금시재" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">전일이월</p>
                      <p className="font-bold text-purple-600 text-sm">₩{formatAmount(data.cashRecords.summary.previousBalance)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">현금수입</p>
                      <p className="font-bold text-green-600 text-sm">₩{formatAmount(data.cashRecords.summary.cashIncome)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">현금지출</p>
                      <p className="font-bold text-red-600 text-sm">₩{formatAmount(data.cashRecords.summary.cashExpense)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">통장입금</p>
                      <p className="font-bold text-blue-600 text-sm">₩{formatAmount(data.cashRecords.summary.bankDeposit)}</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-2 border-2 border-gray-300">
                    <p className="text-xs text-gray-600 text-center">당일마감 시재</p>
                    <p className="text-lg font-bold text-center">₩{formatAmount(data.cashRecords.summary.endBalance)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 두 번째 열: 임플란트/구강용품/상담/현금영수증 */}
            <div className="space-y-4">
              {/* 임플란트 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.implant?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs">🦷</span>
                      </div>
                      임플란트
                    </CardTitle>
                    <SectionCheckbox section="implant" title="임플란트" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">식립수</p>
                      <p className="text-lg font-bold text-blue-600">{data.implant.implantCount}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">이식재</p>
                      <p className="text-lg font-bold text-green-600">{data.implant.fixtureCount}</p>
                    </div>
                  </div>

                  {data.implant.placements.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {data.implant.placements.map((placement, index) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{placement.patientName}</span>
                            <span className="text-xs text-gray-600">{placement.doctor}</span>
                          </div>
                          {placement.implants && placement.implants.length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                              임플란트: {placement.implants.reduce((sum: number, implant: any) => sum + (implant.quantity || 0), 0)}개
                            </div>
                          )}
                          {placement.fixtures && placement.fixtures.length > 0 && (
                            <div className="text-xs text-gray-600">
                              이식재: {placement.fixtures.reduce((sum: number, fixture: any) => sum + (fixture.quantity || 0), 0)}개
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-2 text-sm">식립 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* 구강용품 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.dentalProducts?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-purple-600 rounded flex items-center justify-center">
                        <Package className="h-3 w-3 text-white" />
                      </div>
                      구강용품
                    </CardTitle>
                    <SectionCheckbox section="dentalProducts" title="구강용품" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.dentalProducts.sales.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {data.dentalProducts.sales.map((sale, index) => (
                        <div key={index} className="bg-purple-50 rounded-lg p-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{sale.patientName}</span>
                            <span className="font-bold text-purple-600">₩{formatAmount(sale.totalAmount)}</span>
                          </div>
                          {sale.products && sale.products.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              {sale.products.length}개 품목
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-2 text-sm">구매 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* 상담내역 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.consultations?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-gray-600 rounded flex items-center justify-center">
                        <Users className="h-3 w-3 text-white" />
                      </div>
                      상담내역
                    </CardTitle>
                    <SectionCheckbox section="consultations" title="상담내역" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">동의</p>
                      <p className="text-base font-bold text-green-600">{data.consultations.agreed.length}건</p>
                      <p className="text-xs">₩{formatAmount(data.consultations.agreedAmount)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">미동의</p>
                      <p className="text-base font-bold text-red-600">{data.consultations.nonAgreed.length}건</p>
                      <p className="text-xs">₩{formatAmount(data.consultations.nonAgreedAmount)}</p>
                    </div>
                  </div>

                  {data.consultations.all.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {data.consultations.all.map((consultation, index) => (
                        <div key={index} className="flex justify-between items-center p-1 bg-gray-50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{consultation.patientName}</span>
                            <Badge 
                              variant={consultation.agreed ? "default" : "destructive"}
                              className="text-xs px-1 py-0"
                            >
                              {consultation.agreed ? '동의' : '미동의'}
                            </Badge>
                          </div>
                          <span className="text-xs font-medium">₩{formatAmount(consultation.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-2 text-sm">상담 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* 현금영수증 - 컴팩트 */}
              <Card className={`shadow-sm ${checkStates.cashReceipts?.checked ? 'ring-2 ring-green-200 bg-green-50/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-4 w-4 bg-orange-600 rounded flex items-center justify-center">
                        <Receipt className="h-3 w-3 text-white" />
                      </div>
                      현금영수증
                    </CardTitle>
                    <SectionCheckbox section="cashReceipts" title="현금영수증" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">발행</p>
                      <p className="text-base font-bold text-blue-600">{data.cashReceipts.count}건</p>
                      <p className="text-xs">₩{formatAmount(data.cashReceipts.totalAmount)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600">미발행</p>
                      <p className="text-base font-bold text-orange-600">
                        {data.cashReceipts.nonIssuedTransactions ? data.cashReceipts.nonIssuedTransactions.length : 0}건
                      </p>
                      <p className="text-xs">
                        ₩{formatAmount(data.cashReceipts.nonIssuedTransactions ? 
                          data.cashReceipts.nonIssuedTransactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0) : 0)}
                      </p>
                    </div>
                  </div>

                  {/* 발행 + 미발행 내역을 합쳐서 표시 */}
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {/* 발행된 현금영수증 */}
                    {data.cashReceipts.transactions.slice(0, 2).map((transaction, index) => (
                      <div key={`issued-${index}`} className="flex justify-between items-center p-1 bg-blue-50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{transaction.patientName}</span>
                          <Badge variant="default" className="text-xs px-1 py-0">발행</Badge>
                        </div>
                        <span className="text-xs font-medium text-blue-600">₩{formatAmount(transaction.paymentAmount)}</span>
                      </div>
                    ))}
                    
                    {/* 미발행 현금영수증 */}
                    {data.cashReceipts.nonIssuedTransactions && data.cashReceipts.nonIssuedTransactions.slice(0, 2).map((transaction, index) => (
                      <div key={`non-issued-${index}`} className="flex justify-between items-center p-1 bg-orange-50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{transaction.patientName}</span>
                          <Badge variant="destructive" className="text-xs px-1 py-0">미발행</Badge>
                        </div>
                        <span className="text-xs font-medium text-orange-600">₩{formatAmount(transaction.paymentAmount)}</span>
                      </div>
                    ))}
                    
                    {/* 더 많은 항목이 있을 때 */}
                    {(data.cashReceipts.transactions.length + (data.cashReceipts.nonIssuedTransactions?.length || 0)) > 4 && (
                      <p className="text-xs text-gray-500 text-center">
                        외 {(data.cashReceipts.transactions.length + (data.cashReceipts.nonIssuedTransactions?.length || 0)) - 4}건
                      </p>
                    )}

                    {data.cashReceipts.transactions.length === 0 && (!data.cashReceipts.nonIssuedTransactions || data.cashReceipts.nonIssuedTransactions.length === 0) && (
                      <p className="text-center text-gray-400 py-2 text-sm">현금영수증 내역이 없습니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}