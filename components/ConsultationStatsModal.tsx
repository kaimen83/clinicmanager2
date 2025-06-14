import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, CheckCircle, XCircle, DollarSign, Users, Edit, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ConsultationStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  type: 'daily' | 'monthly';
}

interface ConsultationStats {
  type: string;
  date: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    consultationAgreedAmount: number;
    consultationNonAgreedAmount: number;
    totalConsultationAmount: number;
    agreedCount: number;
    nonAgreedCount: number;
    totalConsultationCount: number;
    agreedPercentage: number;
    agreedAmountPercentage: number;
  };
  doctorStats: Array<{
    doctor: string;
    agreedAmount: number;
    nonAgreedAmount: number;
    totalAmount: number;
    agreedCount: number;
    nonAgreedCount: number;
    totalCount: number;
    agreedPercentage: number;
  }>;
}

interface Consultation {
  _id: string;
  date: string;
  chartNumber: string;
  patientName: string;
  doctor: string;
  staff: string;
  amount: number;
  agreed: boolean;
  confirmedDate?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConsultationStatsModal({
  isOpen,
  onClose,
  date,
  type
}: ConsultationStatsModalProps) {
  const [stats, setStats] = useState<ConsultationStats | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultationsLoading, setConsultationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agreed' | 'non-agreed'>('agreed');

  // 통계 데이터 조회
  const fetchStats = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/consultations/stats?type=${type}&date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('통계 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('상담 통계 조회 중 에러:', error);
      setError('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상담내역 조회
  const fetchConsultations = async () => {
    if (!isOpen || !stats) return;
    
    setConsultationsLoading(true);
    
    try {
      // 원래 요청한 날짜를 기준으로 날짜 범위 계산 (시간대 문제 해결)
      let dateStart: string, dateEnd: string;
      
      if (type === 'daily') {
        // 일간: 해당 날짜만
        dateStart = date;
        dateEnd = date;
      } else {
        // 월간: 해당 월의 첫날부터 마지막날까지
        const [year, month] = date.split('-').map(Number);
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        
        // 시간대 변환 없이 직접 날짜 문자열 생성
        dateStart = `${year}-${String(month).padStart(2, '0')}-01`;
        dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      }
      
      // 동의한 상담내역과 미동의한 상담내역을 각각 조회
      const [agreedResponse, nonAgreedResponse] = await Promise.all([
        fetch(`/api/consultations?dateStart=${dateStart}&dateEnd=${dateEnd}&agreed=true&limit=1000`),
        fetch(`/api/consultations?dateStart=${dateStart}&dateEnd=${dateEnd}&agreed=false&limit=1000`)
      ]);
      
      if (agreedResponse.ok && nonAgreedResponse.ok) {
        const [agreedData, nonAgreedData] = await Promise.all([
          agreedResponse.json(),
          nonAgreedResponse.json()
        ]);
        
        // 두 결과를 합쳐서 설정
        const allConsultations = [
          ...(agreedData.consultations || []),
          ...(nonAgreedData.consultations || [])
        ];
        
        setConsultations(allConsultations);
      } else {
        throw new Error('상담내역 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('상담내역 조회 중 에러:', error);
      toast.error('상담내역을 불러오는데 실패했습니다.');
    } finally {
      setConsultationsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [isOpen, date, type]);

  useEffect(() => {
    if (stats) {
      fetchConsultations();
    }
  }, [stats]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 상담 수정
  const handleEdit = (consultation: Consultation) => {
    // TODO: 상담 수정 모달 열기
    toast.info('상담 수정 기능은 추후 구현 예정입니다.');
  };

  // 상담 삭제
  const handleDelete = async (consultation: Consultation) => {
    if (!confirm(`${consultation.patientName}님의 상담내역을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/consultations/${consultation._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('상담내역이 삭제되었습니다.');
        fetchConsultations(); // 목록 새로고침
        fetchStats(); // 통계 새로고침
      } else {
        throw new Error('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('상담내역 삭제 중 에러:', error);
      toast.error('상담내역 삭제에 실패했습니다.');
    }
  };

  // 동의한 상담내역 필터링
  const agreedConsultations = consultations.filter(c => c.agreed);
  
  // 미동의한 상담내역 필터링
  const nonAgreedConsultations = consultations.filter(c => !c.agreed);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            상담 통계 - {type === 'daily' ? '일간' : '월간'} ({formatDate(date)})
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">통계 데이터를 불러오는 중...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        )}

        {stats && (
          <div className="space-y-4">
            {/* 전체 요약 - 컴팩트하게 수정 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        상담 동의금액
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        ₩{formatAmount(stats.summary.consultationAgreedAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{stats.summary.agreedCount}건</div>
                      <div className="text-xs font-semibold text-green-600">{stats.summary.agreedPercentage}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-500" />
                        상담 미동의금액
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        ₩{formatAmount(stats.summary.consultationNonAgreedAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{stats.summary.nonAgreedCount}건</div>
                      <div className="text-xs font-semibold text-red-600">{100 - stats.summary.agreedPercentage}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-blue-500" />
                        전체 상담금액
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        ₩{formatAmount(stats.summary.totalConsultationAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">총 {stats.summary.totalConsultationCount}건</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 동의율 진행바 - 컴팩트하게 수정 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">상담 동의율</h3>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600 font-semibold">건수: {stats.summary.agreedPercentage}%</span>
                    <span className="text-blue-600 font-semibold">금액: {stats.summary.agreedAmountPercentage}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>건수 기준</span>
                      <span className="font-semibold">{stats.summary.agreedPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${stats.summary.agreedPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>금액 기준</span>
                      <span className="font-semibold">{stats.summary.agreedAmountPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${stats.summary.agreedAmountPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 상담내역 리스트 */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  상담내역 목록
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'agreed' | 'non-agreed')}>
                  <div className="px-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="agreed" className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        상담동의 ({agreedConsultations.length}건)
                      </TabsTrigger>
                      <TabsTrigger value="non-agreed" className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        상담미동의 ({nonAgreedConsultations.length}건)
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="agreed" className="mt-4 px-6 pb-6">
                    {consultationsLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="text-gray-500">상담내역을 불러오는 중...</div>
                      </div>
                    ) : agreedConsultations.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>차트번호</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead>담당의사</TableHead>
                              <TableHead>상담직원</TableHead>
                              <TableHead className="text-right">상담금액</TableHead>
                              <TableHead>상담날짜</TableHead>
                              <TableHead>확정날짜</TableHead>
                              <TableHead className="text-center">관리</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agreedConsultations.map((consultation) => (
                              <TableRow key={consultation._id}>
                                <TableCell className="font-medium">{consultation.chartNumber}</TableCell>
                                <TableCell>{consultation.patientName}</TableCell>
                                <TableCell>{consultation.doctor}</TableCell>
                                <TableCell>{consultation.staff}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  ₩{formatAmount(consultation.amount)}
                                </TableCell>
                                <TableCell>{formatDateShort(consultation.date)}</TableCell>
                                <TableCell>
                                  {consultation.confirmedDate ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      {formatDateShort(consultation.confirmedDate)}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(consultation)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(consultation)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        해당 기간에 동의한 상담내역이 없습니다.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="non-agreed" className="mt-4 px-6 pb-6">
                    {consultationsLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="text-gray-500">상담내역을 불러오는 중...</div>
                      </div>
                    ) : nonAgreedConsultations.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>차트번호</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead>담당의사</TableHead>
                              <TableHead>상담직원</TableHead>
                              <TableHead className="text-right">상담금액</TableHead>
                              <TableHead>상담날짜</TableHead>
                              <TableHead>확정날짜</TableHead>
                              <TableHead className="text-center">관리</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nonAgreedConsultations.map((consultation) => (
                              <TableRow key={consultation._id}>
                                <TableCell className="font-medium">{consultation.chartNumber}</TableCell>
                                <TableCell>{consultation.patientName}</TableCell>
                                <TableCell>{consultation.doctor}</TableCell>
                                <TableCell>{consultation.staff}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  ₩{formatAmount(consultation.amount)}
                                </TableCell>
                                <TableCell>{formatDateShort(consultation.date)}</TableCell>
                                <TableCell>
                                  <span className="text-gray-400">-</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(consultation)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(consultation)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        해당 기간에 미동의한 상담내역이 없습니다.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 