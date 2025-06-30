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
import { toISODateString } from '@/lib/utils';
import { 
  CreditCard, 
  Banknote, 
  TrendingDown, 
  TrendingUp,
  Zap, 
  Package, 
  Receipt, 
  Users,
  UserPlus,
  Calculator,
  ChevronLeft,
  ChevronRight 
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
      cashIncome: number;
      cashExpense: number;
      bankDeposit: number;
      netCash: number;
      startBalance: number;
      endBalance: number;
    };
  };
  implant: {
    placementCount: number;
    placementDetails: any[];
    inventoryLogs: any[];
    inCount: number;
    outCount: number;
  };
  dentalProducts: {
    inventoryLogs: any[];
    inCount: number;
    outCount: number;
  };
  cashReceipts: {
    transactions: any[];
    count: number;
    totalAmount: number;
  };
  consultations: {
    all: any[];
    agreed: any[];
    nonAgreed: any[];
    agreedAmount: number;
    nonAgreedAmount: number;
  };
  newPatientCount: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onDateChange?: (date: Date) => void;
};

export default function DailySettlementModal({ isOpen, onClose, date, onDateChange }: Props) {
  const [data, setData] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateString = toISODateString(date);
      const response = await fetch(`/api/daily-settlement?date=${dateString}`);
      
      if (!response.ok) {
        throw new Error('일일결산 데이터를 가져오는데 실패했습니다.');
      }
      
      const settlementData = await response.json();
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
              <span className="text-base font-medium px-3">
                {date.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
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
        
        <div className="space-y-6">
          {/* 상단 요약 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 수입</p>
                    <p className="text-2xl font-bold text-blue-600">₩{formatAmount(totalIncome)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 지출</p>
                    <p className="text-2xl font-bold text-red-600">₩{formatAmount(data.expenses.totalAmount)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">신환수</p>
                    <p className="text-2xl font-bold text-green-600">{data.newPatientCount}명</p>
                  </div>
                  <UserPlus className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">환자수</p>
                    <p className="text-2xl font-bold text-purple-600">{patientCount}명</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 첫 번째 열: 수입/지출 */}
            <div className="space-y-6">
              {/* 수입내역 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    수입내역
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(data.income.paymentByMethod).map(([method, details]) => (
                      <div key={method}>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{method}</p>
                            <p className="text-sm text-gray-600">{details.count}건</p>
                          </div>
                          <p className="font-bold text-blue-600">
                            ₩{formatAmount(details.amount)}
                          </p>
                        </div>
                        {method === '카드' && data.income.cardByCompany && Object.keys(data.income.cardByCompany).length > 0 && (
                          <div className="ml-4 mt-2 space-y-1">
                            {Object.entries(data.income.cardByCompany).map(([company, info]) => (
                              <div key={company} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                                <span className="text-gray-700">{company}</span>
                                <span className="font-medium">₩{formatAmount(info.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {data.income.extraIncomeTotal > 0 && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-semibold">진료외수입</p>
                          <p className="text-sm text-gray-600">{data.income.extraIncomes.length}건</p>
                        </div>
                        <p className="font-bold text-green-600">
                          ₩{formatAmount(data.income.extraIncomeTotal)}
                        </p>
                      </div>
                    )}
                    
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center font-bold">
                        <span>총계</span>
                        <span className="text-blue-700">₩{formatAmount(totalIncome)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 지출내역 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className="h-5 w-5" />
                    지출내역
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.expenses.items.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {data.expenses.items.map((expense, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{expense.details || expense.description || '지출'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-600">{expense.vendor || expense.category || ''}</p>
                              {expense.method && (
                                <Badge variant="outline" className="text-xs">
                                  {expense.method}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-red-600 ml-2">
                            ₩{formatAmount(expense.amount)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center font-bold">
                          <span>총계</span>
                          <span className="text-red-700">₩{formatAmount(data.expenses.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">지출 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 두 번째 열: 임플란트/구강용품 */}
            <div className="space-y-6">
              {/* 임플란트 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5" />
                    임플란트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">식립수</p>
                      <p className="text-xl font-bold text-blue-600">{data.implant.placementCount}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">입고</p>
                      <p className="text-xl font-bold text-green-600">{data.implant.inCount}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">출고</p>
                      <p className="text-xl font-bold text-red-600">{data.implant.outCount}</p>
                    </div>
                  </div>

                  {data.implant.placementDetails.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      <p className="font-semibold text-sm mb-2">식립 상세</p>
                      {data.implant.placementDetails.map((detail, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                          <span>{detail.patientName}</span>
                          <Badge variant="secondary" className="text-xs">{detail.quantity}개</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 구강용품 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    구강용품
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">입고</p>
                      <p className="text-xl font-bold text-green-600">{data.dentalProducts.inCount}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">출고</p>
                      <p className="text-xl font-bold text-red-600">{data.dentalProducts.outCount}</p>
                    </div>
                  </div>

                  {data.dentalProducts.inventoryLogs.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {data.dentalProducts.inventoryLogs.slice(0, 5).map((log, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              log.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.type === 'in' ? '입고' : '출고'}
                            </span>
                            <span className="text-xs">{log.notes || '구강용품'}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{log.quantity}</Badge>
                        </div>
                      ))}
                      {data.dentalProducts.inventoryLogs.length > 5 && (
                        <p className="text-xs text-gray-500 text-center">외 {data.dentalProducts.inventoryLogs.length - 5}건</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">입출고 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 세 번째 열: 현금시재/상담/영수증 */}
            <div className="space-y-6">
              {/* 현금시재 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="h-5 w-5" />
                    현금시재
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* 현금 흐름 요약 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-xs text-gray-600">현금수입</p>
                        <p className="font-bold text-green-600">₩{formatAmount(data.cashRecords.summary.cashIncome)}</p>
                      </div>
                      <div className="p-2 bg-red-50 rounded">
                        <p className="text-xs text-gray-600">현금지출</p>
                        <p className="font-bold text-red-600">₩{formatAmount(data.cashRecords.summary.cashExpense)}</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-gray-600">통장입금</p>
                        <p className="font-bold text-blue-600">₩{formatAmount(data.cashRecords.summary.bankDeposit)}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">현금잔액</p>
                        <p className="font-bold">₩{formatAmount(data.cashRecords.summary.netCash)}</p>
                      </div>
                    </div>
                    
                    {/* 상세 내역 */}
                    {data.cashRecords.records.length > 0 && (
                      <div className="border-t pt-2">
                        <p className="text-xs font-semibold text-gray-700 mb-2">상세내역</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {data.cashRecords.records.slice(0, 5).map((record, index) => (
                            <div key={index} className="flex justify-between items-center p-1 text-xs">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={record.type === '수입' ? 'default' : record.type === '지출' ? 'destructive' : 'secondary'}
                                  className="text-xs px-1 py-0"
                                >
                                  {record.type}
                                </Badge>
                                <span className="text-gray-600 truncate max-w-[120px]">
                                  {record.description || '-'}
                                </span>
                              </div>
                              <span className={`font-medium ${
                                record.type === '수입' ? 'text-green-600' : 
                                record.type === '지출' ? 'text-red-600' : 
                                'text-blue-600'
                              }`}>
                                {record.type === '지출' ? '-' : ''}₩{formatAmount(record.amount)}
                              </span>
                            </div>
                          ))}
                          {data.cashRecords.records.length > 5 && (
                            <p className="text-xs text-gray-500 text-center pt-1">
                              외 {data.cashRecords.records.length - 5}건
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 상담내역 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    상담내역
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">동의</p>
                      <p className="text-lg font-bold text-green-600">{data.consultations.agreed.length}건</p>
                      <p className="text-xs font-semibold">₩{formatAmount(data.consultations.agreedAmount)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">미동의</p>
                      <p className="text-lg font-bold text-red-600">{data.consultations.nonAgreed.length}건</p>
                      <p className="text-xs font-semibold">₩{formatAmount(data.consultations.nonAgreedAmount)}</p>
                    </div>
                  </div>

                  {data.consultations.all.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {data.consultations.all.slice(0, 3).map((consultation, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span>{consultation.patientName}</span>
                            <Badge 
                              variant={consultation.agreed ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {consultation.agreed ? '동의' : '미동의'}
                            </Badge>
                          </div>
                          <span className="font-semibold text-xs">₩{formatAmount(consultation.amount)}</span>
                        </div>
                      ))}
                      {data.consultations.all.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">외 {data.consultations.all.length - 3}건</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">상담 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* 현금영수증 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="h-5 w-5" />
                    현금영수증
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">발행건수</p>
                      <p className="text-lg font-bold text-blue-600">{data.cashReceipts.count}건</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600">총 금액</p>
                      <p className="text-lg font-bold text-blue-600">₩{formatAmount(data.cashReceipts.totalAmount)}</p>
                    </div>
                  </div>

                  {data.cashReceipts.transactions.length > 0 ? (
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {data.cashReceipts.transactions.slice(0, 3).map((transaction, index) => (
                        <div key={index} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                          <span>{transaction.patientName}</span>
                          <span className="font-semibold">₩{formatAmount(transaction.paymentAmount)}</span>
                        </div>
                      ))}
                      {data.cashReceipts.transactions.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">외 {data.cashReceipts.transactions.length - 3}건</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">발행 내역이 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}