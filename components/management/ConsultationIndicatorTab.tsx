import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp, Users, Activity, Stethoscope, AlertTriangle, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { ConsultationStats, ConsultationTrendData, DoctorConsultationStats, AgreementType } from '@/types/management-indicator';
import DisagreementReasonStats from '../DisagreementReasonStats';

interface ConsultationIndicatorTabProps {
  loading: boolean;
  consultationStats: ConsultationStats | null;
  consultationTrendData: ConsultationTrendData[];
  doctorConsultationStats: DoctorConsultationStats[];
  consultationDoctorNames: string[];
  totalConsultationAmount: number;
  allStaffs: string[];
  currentDate: Date;
}

export default function ConsultationIndicatorTab({
  loading,
  consultationStats,
  consultationTrendData,
  doctorConsultationStats,
  consultationDoctorNames,
  totalConsultationAmount,
  allStaffs,
  currentDate
}: ConsultationIndicatorTabProps) {
  const [doctorAgreementType, setDoctorAgreementType] = useState<AgreementType>('count');
  const [staffAgreementType, setStaffAgreementType] = useState<AgreementType>('count');
  const [doctorPerformanceType, setDoctorPerformanceType] = useState<AgreementType>('count');
  const [highlightedStaff, setHighlightedStaff] = useState<string | null>(null);

  // 직원별 차트 범례 클릭 핸들러
  const handleStaffLegendClick = (data: any) => {
    const staffName = data.value.replace(/ 동의율 \(.*\)$/, '');
    setHighlightedStaff(highlightedStaff === staffName ? null : staffName);
  };

  return (
    <div className="space-y-6 mt-0">
      {/* 현재 월 상담 핵심 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-gray-600">총 상담건수 / 동의건수</span>
          </div>
          <div className="text-xl font-bold text-green-600">
            {loading ? '...' : (consultationStats?.totalConsultationCount || 0).toLocaleString()}
            <span className="text-sm font-normal text-gray-500 ml-1">
              / {loading ? '...' : (consultationStats?.agreedCount || 0).toLocaleString()}
            </span>
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">전체 진료잔액</span>
          </div>
          <div className="text-xl font-bold text-blue-600">
            {loading ? '...' : totalConsultationAmount.toLocaleString()}원
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-600">상담 총금액</span>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {loading ? '...' : (consultationStats?.totalConsultationAmount || 0).toLocaleString()}원
            {!loading && consultationStats && consultationStats.totalConsultationAmount > 0 && consultationStats.totalConsultationCount > 0 ? (
              <span className="text-sm font-normal text-gray-500 ml-1">
                (평균 {Math.round((consultationStats.totalConsultationAmount / consultationStats.totalConsultationCount) / 10000)}만원)
              </span>
            ) : null}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-gray-600">미동의금액</span>
          </div>
          <div className="text-xl font-bold text-red-600">
            {loading ? '...' : (consultationStats?.nonAgreedAmount || 0).toLocaleString()}원
            {!loading && consultationStats && consultationStats.nonAgreedCount > 0 ? (
              <span className="text-sm font-normal text-gray-500 ml-1">
                ({consultationStats.nonAgreedCount}건)
              </span>
            ) : null}
          </div>
        </Card>
      </div>

      {/* 15개월 상담 트렌드 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 15개월 상담 성과 트렌드</CardTitle>
          <CardDescription>월별 상담건수, 동의율 및 평균상담금액 추이</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={consultationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                {/* 왼쪽 Y축 - 상담건수 */}
                <YAxis 
                  yAxisId="count"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  label={{ value: '상담건수 (건)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                {/* 오른쪽 Y축 - 동의율 */}
                <YAxis 
                  yAxisId="percentage"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  domain={[0, 100]}
                  label={{ value: '동의율 (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const nameStr = String(name);
                    if (nameStr.includes('동의율')) {
                      return [`${value}%`, name];
                    } else if (nameStr.includes('건수')) {
                      return [`${value}건`, name];
                    } else {
                      return [`${Number(value).toLocaleString()}원`, name];
                    }
                  }}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                
                {/* 상담건수 막대 차트 */}
                <Bar 
                  yAxisId="count"
                  dataKey="totalConsultations" 
                  fill="#3b82f6" 
                  fillOpacity={0.7}
                  name="월별 상담건수"
                  stroke="#3b82f6"
                  strokeWidth={1}
                />
                
                {/* 동의율 라인 차트 */}
                <Line 
                  yAxisId="percentage"
                  type="monotone" 
                  dataKey="agreedPercentage" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="건수기준 동의율"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                />
                
                <Line 
                  yAxisId="percentage"
                  type="monotone" 
                  dataKey="agreedAmountPercentage" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="금액기준 동의율"
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 의사별 성과 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 의사별 상담 성과 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-4 w-4" />
                의사별 상담 성과
              </CardTitle>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDoctorPerformanceType('count')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    doctorPerformanceType === 'count' 
                      ? 'bg-white text-blue-600 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  건수
                </button>
                <button
                  onClick={() => setDoctorPerformanceType('amount')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    doctorPerformanceType === 'amount' 
                      ? 'bg-white text-blue-600 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  금액
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {doctorConsultationStats
                .sort((a, b) => {
                  if (doctorPerformanceType === 'count') {
                    return b.agreedConsultations - a.agreedConsultations;
                  } else {
                    return b.agreedAmount - a.agreedAmount;
                  }
                })
                .map((doctor, index) => {
                  const amountAgreedPercentage = doctor.totalAmount > 0 
                    ? Math.round((doctor.agreedAmount / doctor.totalAmount) * 100) 
                    : 0;
                  
                  const displayPercentage = doctorPerformanceType === 'count' 
                    ? doctor.agreedPercentage 
                    : amountAgreedPercentage;
                  
                  return (
                    <div 
                      key={doctor.doctor} 
                      className="relative p-3 rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-sm transition-all duration-200"
                    >
                      {/* 순위 뱃지 */}
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          'bg-orange-400'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-100 rounded">
                          <Stethoscope className="h-3 w-3 text-blue-600" />
                        </div>
                        <h3 className="font-medium text-sm text-gray-900">{doctor.doctor}</h3>
                      </div>
                      
                      {doctorPerformanceType === 'count' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">총 상담</span>
                              <span className="font-bold text-blue-600 text-sm">
                                {doctor.totalConsultations}건
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">동의</span>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-green-600 text-sm">
                                  {doctor.agreedConsultations}건
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                                >
                                  {doctor.agreedPercentage}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">평균 금액</span>
                              <span className="font-bold text-purple-600 text-sm">
                                {doctor.totalConsultations > 0 ? 
                                  (doctor.totalAmount / doctor.totalConsultations / 10000).toFixed(0) : 0}만원
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">미동의</span>
                              <span className="font-semibold text-red-600 text-sm">
                                {doctor.nonAgreedConsultations}건
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">총 금액</span>
                              <span className="font-bold text-blue-600 text-sm">
                                {(doctor.totalAmount / 10000).toFixed(0)}만원
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">동의금액</span>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-green-600 text-sm">
                                  {(doctor.agreedAmount / 10000).toFixed(0)}만원
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                                >
                                  {amountAgreedPercentage}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">평균 상담금액</span>
                              <span className="font-bold text-purple-600 text-sm">
                                {doctor.totalConsultations > 0 ? 
                                  (doctor.totalAmount / doctor.totalConsultations / 10000).toFixed(0) : 0}만원
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">미동의금액</span>
                              <span className="font-semibold text-red-600 text-sm">
                                {((doctor.totalAmount - doctor.agreedAmount) / 10000).toFixed(0)}만원
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 동의율 진행바 */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>동의율 ({doctorPerformanceType === 'count' ? '건수' : '금액'})</span>
                          <span className="font-semibold">{displayPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              displayPercentage >= 90 ? 'bg-green-500' :
                              displayPercentage >= 80 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${displayPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {doctorConsultationStats.length === 0 && !loading && (
              <div className="text-center py-6 text-gray-500">
                <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">해당 월에 상담 데이터가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 의사별 15개월 동의율 트렌드 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-4 w-4" />
                  의사별 동의율 트렌드
                </CardTitle>
                <CardDescription>15개월간 의사별 동의율 변화 추이</CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDoctorAgreementType('count')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    doctorAgreementType === 'count' 
                      ? 'bg-white text-blue-600 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  건수
                </button>
                <button
                  onClick={() => setDoctorAgreementType('amount')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    doctorAgreementType === 'amount' 
                      ? 'bg-white text-blue-600 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  금액
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consultationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    domain={[60, 100]}
                    label={{ value: '동의율 (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* 전체 평균 기준선 */}
                  <Line 
                    type="monotone" 
                    dataKey={doctorAgreementType === 'count' ? "agreedPercentage" : "agreedAmountPercentage"} 
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="10 5"
                    name={`전체 평균 (${doctorAgreementType === 'count' ? '건수' : '금액'})`}
                    dot={{ fill: '#94a3b8', strokeWidth: 1, r: 3 }}
                  />
                  
                  {/* 의사별 동의율 */}
                  {consultationDoctorNames.map((doctor, index) => {
                    const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
                    const color = colors[index % colors.length];
                    const dataKey = doctorAgreementType === 'count' ? `${doctor}_동의율` : `${doctor}_금액동의율`;
                    
                    return (
                      <Line
                        key={`${doctor}_agreed_${doctorAgreementType}`}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={3}
                        name={`${doctor} 동의율 (${doctorAgreementType === 'count' ? '건수' : '금액'})`}
                        dot={{ fill: color, strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: '#fff' }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 직원별 동의율 트렌드 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" />
                직원별 동의율 트렌드
              </CardTitle>
              <CardDescription>15개월간 직원별 동의율 변화 추이</CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setStaffAgreementType('count')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  staffAgreementType === 'count' 
                    ? 'bg-white text-blue-600 shadow-sm font-medium' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                건수
              </button>
              <button
                onClick={() => setStaffAgreementType('amount')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  staffAgreementType === 'amount' 
                    ? 'bg-white text-blue-600 shadow-sm font-medium' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                금액
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consultationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  domain={[60, 100]}
                  label={{ value: '동의율 (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  onClick={handleStaffLegendClick}
                  wrapperStyle={{ cursor: 'pointer' }}
                />
                
                {/* 전체 평균 기준선 */}
                <Line 
                  type="monotone" 
                  dataKey={staffAgreementType === 'count' ? "agreedPercentage" : "agreedAmountPercentage"} 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  name={`전체 평균 (${staffAgreementType === 'count' ? '건수' : '금액'})`}
                  dot={{ fill: '#94a3b8', strokeWidth: 1, r: 3 }}
                />
                
                {/* 직원별 동의율 */}
                {allStaffs.map((staff, index) => {
                  const colors = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
                  const color = colors[index % colors.length];
                  const dataKey = staffAgreementType === 'count' ? `${staff}_동의율` : `${staff}_금액동의율`;
                  const isHighlighted = highlightedStaff === null || highlightedStaff === staff;
                  const opacity = highlightedStaff === null ? 1 : (isHighlighted ? 1 : 0.2);
                  
                  return (
                    <Line
                      key={`${staff}_agreed_${staffAgreementType}`}
                      type="monotone"
                      dataKey={dataKey}
                      stroke={color}
                      strokeWidth={isHighlighted ? 3 : 2}
                      strokeOpacity={opacity}
                      name={`${staff} 동의율 (${staffAgreementType === 'count' ? '건수' : '금액'})`}
                      dot={{ fill: color, strokeWidth: 2, r: isHighlighted ? 5 : 3, fillOpacity: opacity }}
                      activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: '#fff', fillOpacity: opacity }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 미동의 사유 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            미동의 사유 분석
          </CardTitle>
          <CardDescription>상담 미동의 사유별 통계 및 직원별 성과 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <DisagreementReasonStats 
            selectedDate={currentDate.toISOString().slice(0, 7)} 
          />
        </CardContent>
      </Card>

      {/* 상담성과 인사이트 - 컴팩트 버전 */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-4 w-4 text-emerald-600" />
            상담성과 인사이트
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">현재 월 핵심 지표 요약</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {consultationStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 전체 동의율 */}
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-medium text-gray-700">전체 동의율</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-green-600">{consultationStats.agreedPercentage}%</span>
                  <Badge 
                    variant={consultationStats.agreedPercentage >= 90 ? "default" : consultationStats.agreedPercentage >= 80 ? "secondary" : "destructive"}
                    className="text-xs px-1 py-0 h-4"
                  >
                    {consultationStats.agreedPercentage >= 90 ? "우수" : consultationStats.agreedPercentage >= 80 ? "양호" : "개선"}
                  </Badge>
                </div>
              </div>

              {/* 금액 동의율 */}
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-medium text-gray-700">금액 동의율</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-blue-600">{consultationStats.agreedAmountPercentage}%</span>
                  <Badge 
                    variant={consultationStats.agreedAmountPercentage >= 90 ? "default" : consultationStats.agreedAmountPercentage >= 80 ? "secondary" : "destructive"}
                    className="text-xs px-1 py-0 h-4"
                  >
                    {consultationStats.agreedAmountPercentage >= 90 ? "우수" : consultationStats.agreedAmountPercentage >= 80 ? "양호" : "개선"}
                  </Badge>
                </div>
              </div>

              {/* 평균 상담금액 */}
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-xs font-medium text-gray-700">평균 상담금액</span>
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {consultationStats.totalConsultationCount > 0 
                    ? Math.round(consultationStats.totalConsultationAmount / consultationStats.totalConsultationCount / 10000)
                    : 0}만원
                </span>
              </div>

              {/* 기회 손실 */}
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-gray-700">기회 손실</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  {Math.round(consultationStats.nonAgreedAmount / 10000)}만원
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <span className="text-sm">데이터를 불러오는 중...</span>
            </div>
          )}

          {/* 인사이트 메시지 */}
          {consultationStats && (
            <div className="mt-4 space-y-2">
              {/* 트렌드 분석 */}
              {consultationTrendData.length >= 2 && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <Activity className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                  <span className="text-xs text-indigo-800">
                    {(() => {
                      const currentMonth = consultationTrendData[consultationTrendData.length - 1];
                      const previousMonth = consultationTrendData[consultationTrendData.length - 2];
                      const trend = currentMonth.agreedPercentage - previousMonth.agreedPercentage;
                      
                      if (trend > 0) {
                        return `전월 대비 동의율 ${trend.toFixed(1)}%p 상승 📈`;
                      } else if (trend < 0) {
                        return `전월 대비 동의율 ${Math.abs(trend).toFixed(1)}%p 하락 📉`;
                      } else {
                        return '전월과 동일한 동의율 유지 ➡️';
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* 개선 필요 알림 */}
              {consultationStats.agreedPercentage < 85 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  <span className="text-xs text-red-800">
                    동의율 {consultationStats.agreedPercentage}%로 목표(85%) 미달 - 상담 프로세스 점검 필요
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}