import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

interface VisitPathTabProps {
  visitPathHistoryData: any[];
  visitPathGroupNames: string[];
}

export default function VisitPathTab({
  visitPathHistoryData,
  visitPathGroupNames
}: VisitPathTabProps) {
  const [highlightedGroup, setHighlightedGroup] = useState<string | null>(null);

  // 범례 클릭 핸들러
  const handleLegendClick = (entry: any) => {
    if (!entry || !entry.dataKey) return;
    
    // dataKey에서 그룹명 추출 (예: "센터치과 관련_환자수" -> "센터치과 관련")
    const groupName = entry.dataKey.split('_')[0];
    
    // 같은 그룹을 클릭하면 하이라이트 해제, 다른 그룹을 클릭하면 해당 그룹 하이라이트
    setHighlightedGroup(highlightedGroup === groupName ? null : groupName);
  };

  return (
    <div className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            내원경로별 15개월 통계
          </CardTitle>
          <CardDescription>대분류별 환자 수, 결제금액, 상담금액 추이</CardDescription>
        </CardHeader>
        <CardContent>
          {visitPathHistoryData.length > 0 ? (
            <div className="space-y-8">
              {/* 환자 수 차트 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-700">환자 수 추이</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={visitPathHistoryData}
                      margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{ value: '환자 수 (명)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value}명`, name]}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        onClick={handleLegendClick}
                        wrapperStyle={{ cursor: 'pointer' }}
                      />
                      {visitPathGroupNames.map((groupName, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                        const dataKey = `${groupName}_환자수`;
                        const isHighlighted = highlightedGroup === null || highlightedGroup === groupName;
                        const opacity = highlightedGroup === null ? 1 : (isHighlighted ? 1 : 0.15);
                        
                        return (
                          <Line
                            key={groupName}
                            type="monotone"
                            dataKey={dataKey}
                            stroke={colors[index % colors.length]}
                            strokeWidth={3}
                            strokeOpacity={opacity}
                            name={groupName}
                            dot={{ r: 4, fillOpacity: opacity }}
                            activeDot={{ r: 6, fillOpacity: opacity }}
                          >
                            {highlightedGroup === groupName && (
                              <LabelList 
                                dataKey={dataKey}
                                position="top"
                                style={{ fontSize: '11px', fill: colors[index % colors.length] }}
                                formatter={(value: any) => typeof value === 'number' && value > 0 ? `${value}명` : ''}
                              />
                            )}
                          </Line>
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 결제 금액 차트 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-700">결제 금액 추이</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={visitPathHistoryData}
                      margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{ value: '결제 금액 (원)', angle: -90, position: 'insideLeft' }}
                        tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        onClick={handleLegendClick}
                        wrapperStyle={{ cursor: 'pointer' }}
                      />
                      {visitPathGroupNames.map((groupName, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                        const dataKey = `${groupName}_결제금액`;
                        const isHighlighted = highlightedGroup === null || highlightedGroup === groupName;
                        const opacity = highlightedGroup === null ? 1 : (isHighlighted ? 1 : 0.15);
                        
                        return (
                          <Line
                            key={groupName}
                            type="monotone"
                            dataKey={dataKey}
                            stroke={colors[index % colors.length]}
                            strokeWidth={3}
                            strokeOpacity={opacity}
                            name={groupName}
                            dot={{ r: 4, fillOpacity: opacity }}
                            activeDot={{ r: 6, fillOpacity: opacity }}
                          >
                            {highlightedGroup === groupName && (
                              <LabelList 
                                dataKey={dataKey}
                                position="top"
                                style={{ fontSize: '11px', fill: colors[index % colors.length] }}
                                formatter={(value: any) => typeof value === 'number' && value > 0 ? `${(value / 10000).toFixed(0)}만` : ''}
                              />
                            )}
                          </Line>
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 상담 금액 차트 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-orange-700">상담 금액 추이</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={visitPathHistoryData}
                      margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{ value: '상담 금액 (원)', angle: -90, position: 'insideLeft' }}
                        tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        onClick={handleLegendClick}
                        wrapperStyle={{ cursor: 'pointer' }}
                      />
                      {visitPathGroupNames.map((groupName, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                        const dataKey = `${groupName}_상담금액`;
                        const isHighlighted = highlightedGroup === null || highlightedGroup === groupName;
                        const opacity = highlightedGroup === null ? 1 : (isHighlighted ? 1 : 0.15);
                        
                        return (
                          <Line
                            key={groupName}
                            type="monotone"
                            dataKey={dataKey}
                            stroke={colors[index % colors.length]}
                            strokeWidth={3}
                            strokeOpacity={opacity}
                            name={groupName}
                            dot={{ r: 4, fillOpacity: opacity }}
                            activeDot={{ r: 6, fillOpacity: opacity }}
                          >
                            {highlightedGroup === groupName && (
                              <LabelList 
                                dataKey={dataKey}
                                position="top"
                                style={{ fontSize: '11px', fill: colors[index % colors.length] }}
                                formatter={(value: any) => typeof value === 'number' && value > 0 ? `${(value / 10000).toFixed(0)}만` : ''}
                              />
                            )}
                          </Line>
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">내원경로별 통계 데이터를 불러오는 중입니다...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}