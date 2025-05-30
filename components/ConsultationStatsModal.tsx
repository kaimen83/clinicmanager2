import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, TrendingUp, Users, DollarSign } from 'lucide-react';

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

export default function ConsultationStatsModal({
  isOpen,
  onClose,
  date,
  type
}: ConsultationStatsModalProps) {
  const [stats, setStats] = useState<ConsultationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStats();
  }, [isOpen, date, type]);

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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <div className="space-y-6">
            {/* 전체 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    상담 동의금액
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₩{formatAmount(stats.summary.consultationAgreedAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.summary.agreedCount}건 ({stats.summary.agreedPercentage}%)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    상담 미동의금액
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ₩{formatAmount(stats.summary.consultationNonAgreedAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.summary.nonAgreedCount}건 ({100 - stats.summary.agreedPercentage}%)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    전체 상담금액
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ₩{formatAmount(stats.summary.totalConsultationAmount)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    총 {stats.summary.totalConsultationCount}건
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 동의율 진행바 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">상담 동의율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>건수 기준 동의율</span>
                      <span className="font-semibold">{stats.summary.agreedPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.summary.agreedPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>금액 기준 동의율</span>
                      <span className="font-semibold">{stats.summary.agreedAmountPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.summary.agreedAmountPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 의사별 통계 */}
            {stats.doctorStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    의사별 상담 통계
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.doctorStats.map((doctor, index) => (
                      <div key={doctor.doctor} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{doctor.doctor}</Badge>
                            <span className="text-sm text-gray-500">
                              총 {doctor.totalCount}건
                            </span>
                          </div>
                          <div className="text-lg font-semibold">
                            ₩{formatAmount(doctor.totalAmount)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-sm text-gray-600">동의</div>
                            <div className="font-semibold text-green-600">
                              ₩{formatAmount(doctor.agreedAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {doctor.agreedCount}건
                            </div>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="text-sm text-gray-600">미동의</div>
                            <div className="font-semibold text-red-600">
                              ₩{formatAmount(doctor.nonAgreedAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {doctor.nonAgreedCount}건
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>동의율</span>
                            <span>{doctor.agreedPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-green-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${doctor.agreedPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 