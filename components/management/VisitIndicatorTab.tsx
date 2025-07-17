import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, CreditCard, MessageSquare, Calendar, Stethoscope } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, Bar } from 'recharts';
import { MonthlyStats, HistoricalData, DoctorStats, DayOfWeekStats } from '@/types/management-indicator';

interface VisitIndicatorTabProps {
  loading: boolean;
  monthlyStats: MonthlyStats | null;
  historicalData: HistoricalData[];
  doctorStats: DoctorStats[];
  dayOfWeekStats: DayOfWeekStats[];
}

export default function VisitIndicatorTab({
  loading,
  monthlyStats,
  historicalData,
  doctorStats,
  dayOfWeekStats
}: VisitIndicatorTabProps) {
  return (
    <div className="space-y-6 mt-0">
      {/* 현재 월 내원 통계 - 컴팩트 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">총 내원</span>
          </div>
          <div className="text-xl font-bold text-blue-600">
            {loading ? '...' : monthlyStats?.totalPatients?.toLocaleString() || '0'}
            {!loading && monthlyStats?.dailyAvgPatients ? (
              <span className="text-sm font-normal text-gray-500 ml-1">
                (일평균 {monthlyStats.dailyAvgPatients})
              </span>
            ) : null}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-gray-600">신환</span>
          </div>
          <div className="text-xl font-bold text-green-600">
            {loading ? '...' : monthlyStats?.newPatients?.toLocaleString() || '0'}
            {!loading && monthlyStats?.dailyAvgNewPatients ? (
              <span className="text-sm font-normal text-gray-500 ml-1">
                (일평균 {monthlyStats.dailyAvgNewPatients})
              </span>
            ) : null}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-600">총 수납</span>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {loading ? '...' : (monthlyStats?.totalPaymentAmount || 0).toLocaleString()}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-600">상담</span>
          </div>
          <div className="text-xl font-bold text-orange-600">
            {loading ? '...' : ((monthlyStats?.consultationAgreedCount || 0) + (monthlyStats?.consultationNonAgreedCount || 0)).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* 의사별 통계와 요일별 통계를 2열로 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 의사별 통계 - 컴팩트 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-4 w-4" />
              의사별 내원 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doctorStats.map((doctor, index) => {
                const newPatientRate = doctor.totalPatients > 0 
                  ? (doctor.newPatients / doctor.totalPatients * 100) 
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
                        <span className="text-xs text-gray-600">총 내원</span>
                        <span className="font-bold text-blue-600">
                          {doctor.totalPatients.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">신환</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-green-600 text-sm">
                            {doctor.newPatients.toLocaleString()}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                          >
                            {newPatientRate.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {doctorStats.length === 0 && !loading && (
              <div className="text-center py-6 text-gray-500">
                <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">해당 월에 진료한 의사 데이터가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 요일별 통계 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-4 w-4" />
              요일별 내원 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2">
              {dayOfWeekStats.map((day) => {
                const maxPatients = Math.max(...dayOfWeekStats.map(d => d.totalPatients));
                const heightPercentage = maxPatients > 0 ? (day.totalPatients / maxPatients) * 100 : 0;
                
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
                        총: <span className="font-semibold">{day.totalPatients}</span>
                      </div>
                      <div className="text-xs text-green-600">
                        신환: <span className="font-semibold">{day.newPatients}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 통합 15개월 트렌드 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 15개월 내원 추이</CardTitle>
          <CardDescription>월별 총계 및 일평균 내원인원과 신환 수 (진료일 기준)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
                {/* 왼쪽 Y축 - 월별 총계 */}
                <YAxis 
                  yAxisId="monthly"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  label={{ value: '월별 총계 (명)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                {/* 오른쪽 Y축 - 일평균 */}
                <YAxis 
                  yAxisId="daily"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  label={{ value: '일평균 (명)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value}명`,
                    name
                  ]}
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
                
                {/* 월별 총계 라인 - 실선 */}
                <Line 
                  yAxisId="monthly"
                  type="monotone" 
                  dataKey="totalPatients" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="월별 총 내원"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                >
                  <LabelList 
                    dataKey="totalPatients" 
                    position="top" 
                    style={{ fontSize: '10px', fill: '#3b82f6', fontWeight: 'bold' }}
                    offset={15}
                  />
                </Line>
                <Line 
                  yAxisId="monthly"
                  type="monotone" 
                  dataKey="newPatients" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="월별 신환"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                >
                  <LabelList 
                    dataKey="newPatients" 
                    position="bottom" 
                    style={{ fontSize: '10px', fill: '#10b981', fontWeight: 'bold' }}
                    offset={10}
                  />
                </Line>
                
                {/* 일평균 막대 그래프 */}
                <Bar 
                  yAxisId="daily"
                  dataKey="avgTotalPatients" 
                  fill="#f59e0b" 
                  fillOpacity={0.6}
                  name="일평균 총 내원"
                  stroke="#f59e0b"
                  strokeWidth={1}
                >
                  <LabelList 
                    dataKey="avgTotalPatients" 
                    position="top" 
                    style={{ fontSize: '9px', fill: '#f59e0b', fontWeight: 'bold' }}
                    offset={5}
                  />
                </Bar>
                <Bar 
                  yAxisId="daily"
                  dataKey="avgNewPatients" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                  name="일평균 신환"
                  stroke="#ef4444"
                  strokeWidth={1}
                >
                  <LabelList 
                    dataKey="avgNewPatients" 
                    position="insideTop" 
                    style={{ fontSize: '9px', fill: '#ffffff', fontWeight: 'bold', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}
                    offset={-5}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* 차트 설명 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span>라인: 월별 총계 (왼쪽 축)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-orange-500 opacity-60"></div>
                  <span>막대: 진료일 기준 일평균 (오른쪽 축)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}