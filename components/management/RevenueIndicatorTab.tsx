import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CreditCard, Activity, Calendar, Stethoscope } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { MonthlyStats, DoctorRevenueStats, DayOfWeekRevenueStats, RevenueHistoricalData } from '@/types/management-indicator';

interface RevenueIndicatorTabProps {
  loading: boolean;
  monthlyStats: MonthlyStats | null;
  doctorRevenueStats: DoctorRevenueStats[];
  dayOfWeekRevenueStats: DayOfWeekRevenueStats[];
  revenueHistoricalData: RevenueHistoricalData[];
  doctorNames: string[];
}

export default function RevenueIndicatorTab({
  loading,
  monthlyStats,
  doctorRevenueStats,
  dayOfWeekRevenueStats,
  revenueHistoricalData,
  doctorNames
}: RevenueIndicatorTabProps) {
  return (
    <div className="space-y-6 mt-0">
      {/* 현재 월 매출 통계 - 컴팩트 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">총 매출</span>
          </div>
          <div className="text-xl font-bold text-blue-600">
            {loading ? '...' : (monthlyStats?.totalPaymentAmount || 0).toLocaleString()}원
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-gray-600">현금매출</span>
          </div>
          <div className="text-xl font-bold text-green-600">
            {loading ? '...' : (monthlyStats?.cashTransferAmount || 0).toLocaleString()}원
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-600">카드매출</span>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {loading ? '...' : (monthlyStats?.cardAmount || 0).toLocaleString()}원
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-600">기타수익</span>
          </div>
          <div className="text-xl font-bold text-orange-600">
            {loading ? '...' : (monthlyStats?.nonMedicalIncome || 0).toLocaleString()}원
          </div>
        </Card>
      </div>

      {/* 의사별 매출 통계와 요일별 매출 통계를 2열로 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 의사별 매출 통계 - 컴팩트 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-4 w-4" />
              의사별 매출 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doctorRevenueStats.map((doctor, index) => {
                const cashRatio = doctor.totalRevenue > 0 
                  ? (doctor.cashRevenue / doctor.totalRevenue * 100) 
                  : 0;
                
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
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">총 매출</span>
                        <span className="font-bold text-blue-600 text-sm">
                          {(doctor.totalRevenue / 10000).toFixed(0)}만
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">현금</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-green-600 text-sm">
                            {(doctor.cashRevenue / 10000).toFixed(0)}만
                          </span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                          >
                            {cashRatio.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">카드</span>
                        <span className="font-semibold text-purple-600 text-sm">
                          {(doctor.cardRevenue / 10000).toFixed(0)}만
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {doctorRevenueStats.length === 0 && !loading && (
              <div className="text-center py-6 text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">해당 월에 매출 데이터가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 요일별 매출 통계 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-4 w-4" />
              요일별 매출 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2">
              {dayOfWeekRevenueStats.map((day) => {
                const maxRevenue = Math.max(...dayOfWeekRevenueStats.map(d => d.totalRevenue));
                const heightPercentage = maxRevenue > 0 ? (day.totalRevenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={day.dayOfWeek} className="text-center">
                    <div className="mb-2">
                      <div className={`text-xs font-medium ${
                        day.dayOfWeek === '일' ? 'text-red-600' : 
                        day.dayOfWeek === '토' ? 'text-blue-600' : 
                        'text-gray-700'
                      }`}>
                        {day.dayOfWeek}
                      </div>
                    </div>
                    
                    {/* 막대 그래프 */}
                    <div className="relative h-20 flex items-end justify-center mb-2">
                      <div 
                        className={`w-8 rounded-t transition-all duration-300 ${
                          day.dayOfWeek === '일' ? 'bg-red-200 border-red-300' : 
                          day.dayOfWeek === '토' ? 'bg-blue-200 border-blue-300' : 
                          'bg-gray-200 border-gray-300'
                        } border-2 border-solid`}
                        style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                      />
                    </div>
                    
                    {/* 통계 정보 */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">
                        총: <span className="font-semibold">{(day.totalRevenue / 10000).toFixed(0)}만</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 15개월 매출 트렌드 차트 - 분리된 구성 */}
      <div className="space-y-6">
        {/* 1. 전체 매출 트렌드 */}
        <Card>
          <CardHeader>
            <CardTitle>전체 매출 트렌드 (15개월)</CardTitle>
            <CardDescription>월별 총매출과 일평균 매출</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    yAxisId="monthly"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                    label={{ value: '매출 (만원)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="daily"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                    label={{ value: '일평균 (만원)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString()}원`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* 월별 총매출 - 굵은 실선 */}
                  <Line 
                    yAxisId="monthly"
                    type="monotone" 
                    dataKey="totalRevenue" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    name="월별 총매출"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  />
                  
                  {/* 일평균 총매출 - 라인 */}
                  <Line 
                    yAxisId="daily"
                    type="monotone" 
                    dataKey="avgTotalRevenue" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    name="일평균 총매출"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. 원장별 매출 비교 */}
        <Card>
          <CardHeader>
            <CardTitle>원장별 매출 비교 (15개월)</CardTitle>
            <CardDescription>각 원장의 월별 매출 추이 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                    label={{ value: '매출 (만원)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString()}원`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* 원장별 월별 총매출 */}
                  {doctorNames.map((doctor, index) => {
                    const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
                    const color = colors[index % colors.length];
                    const dataKey = `${doctor}_총매출`;
                    
                    return (
                      <Line
                        key={`${doctor}_monthly`}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={3}
                        name={`${doctor} 월별매출`}
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

        {/* 3. 원장별 효율성 비교 (일평균) */}
        <Card>
          <CardHeader>
            <CardTitle>원장별 일평균 매출 효율성 (15개월)</CardTitle>
            <CardDescription>실제 진료일 기준 일평균 매출 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                    label={{ value: '일평균 매출 (만원)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString()}원`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* 전체 일평균 - 기준선 */}
                  <Line 
                    type="monotone" 
                    dataKey="avgTotalRevenue" 
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="10 5"
                    name="전체 일평균 (기준)"
                    dot={{ fill: '#94a3b8', strokeWidth: 1, r: 3 }}
                  />
                  
                  {/* 원장별 일평균 매출 */}
                  {doctorNames.map((doctor, index) => {
                    const colors = ['#22c55e', '#a855f7', '#fb923c', '#f87171', '#38bdf8'];
                    const color = colors[index % colors.length];
                    const dataKey = `${doctor}_일평균매출`;
                    
                    return (
                      <Line
                        key={`${doctor}_daily`}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={3}
                        name={`${doctor} 일평균`}
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
    </div>
  );
}