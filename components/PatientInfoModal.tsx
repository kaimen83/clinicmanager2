'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Calendar, CreditCard, FileText, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PatientData {
  patient: {
    chartNumber: string;
    name: string;
    visitPath: string;
    createdAt: string;
  };
  consultations: Array<{
    _id: string;
    date: string;
    doctor: string;
    staff: string;
    amount: number;
    agreed: boolean;
    notes: string;
    confirmedDate?: string;
  }>;
  transactions: Array<{
    _id: string;
    date: string;
    doctor: string;
    treatmentType: string;
    isNew: boolean;
    isConsultation: boolean;
    paymentMethod: string;
    cardCompany?: string;
    paymentAmount: number;
    cashReceipt: boolean;
    notes: string;
  }>;
}

interface PatientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartNumber: string;
}

export default function PatientInfoModal({ isOpen, onClose, chartNumber }: PatientInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);

  useEffect(() => {
    if (isOpen && chartNumber) {
      fetchPatientData();
    }
  }, [isOpen, chartNumber]);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/patients/${chartNumber}/info`);
      if (response.ok) {
        const data = await response.json();
        setPatientData(data);
      }
    } catch (error) {
      console.error('환자 정보를 불러오는데 실패했습니다:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            환자 정보
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : patientData ? (
          <div className="space-y-4">
            {/* 환자 기본 정보 */}
            <div className="bg-gray-50 p-3 rounded-lg border">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">차트번호</span>
                  <p className="font-medium">{patientData.patient.chartNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">환자명</span>
                  <p className="font-medium">{patientData.patient.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">내원경로</span>
                  <p className="font-medium text-xs">{patientData.patient.visitPath}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">등록일</span>
                  <p className="font-medium text-xs">
                    {format(new Date(patientData.patient.createdAt), 'yyyy-MM-dd')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 상담내역 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    상담내역 ({patientData.consultations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {patientData.consultations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        상담 내역이 없습니다.
                      </div>
                    ) : (
                      patientData.consultations.map((consultation) => (
                        <div key={consultation._id} className="border-l-4 border-l-blue-200 bg-blue-50/30 p-3 rounded-r-md hover:bg-blue-50/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {format(new Date(consultation.date), 'MM/dd')}
                              </span>
                              <span className="text-sm">{consultation.doctor}</span>
                              <span className="text-xs text-muted-foreground">{consultation.staff}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={consultation.agreed ? 'default' : 'secondary'} className="text-xs">
                                {consultation.agreed ? '동의' : '비동의'}
                              </Badge>
                              <span className="font-semibold text-sm">{formatCurrency(consultation.amount)}</span>
                            </div>
                          </div>
                          {consultation.confirmedDate && (
                            <p className="text-xs text-muted-foreground mb-1">
                              확정일: {format(new Date(consultation.confirmedDate), 'MM/dd')}
                            </p>
                          )}
                          {consultation.notes && (
                            <p className="text-xs text-muted-foreground">{consultation.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 수납내역 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    수납내역 ({patientData.transactions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {patientData.transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        수납 내역이 없습니다.
                      </div>
                    ) : (
                      patientData.transactions.map((transaction) => (
                        <div key={transaction._id} className="border-l-4 border-l-green-200 bg-green-50/30 p-3 rounded-r-md hover:bg-green-50/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {format(new Date(transaction.date), 'MM/dd')}
                              </span>
                              <span className="text-sm">{transaction.doctor}</span>
                              <span className="text-xs text-muted-foreground">{transaction.treatmentType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {transaction.isNew && (
                                  <Badge variant="outline" className="text-xs">신환</Badge>
                                )}
                                {transaction.isConsultation && (
                                  <Badge variant="outline" className="text-xs">상담</Badge>
                                )}
                                {transaction.cashReceipt && (
                                  <Badge variant="outline" className="text-xs">영수증</Badge>
                                )}
                              </div>
                              <span className="font-semibold text-sm">{formatCurrency(transaction.paymentAmount)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{transaction.paymentMethod}</span>
                            {transaction.cardCompany && <span>({transaction.cardCompany})</span>}
                          </div>
                          {transaction.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{transaction.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            환자 정보를 찾을 수 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}