'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Folder, 
  Tag, 
  BarChart3 
} from 'lucide-react';

interface AnalysisData {
  visitPath: string;
  totalPatientCount: number;
  newPatientCount: number;
  revisitCount: number;
  paymentAmount: number;
  totalConsultationAmount: number;
  isGroup?: boolean;
  groupId?: string;
  details?: AnalysisData[];
}

interface GroupData {
  _id: string;
  name: string;
  description: string;
  visitPaths: string[];
}

interface ComparisonData {
  [key: string]: AnalysisData[];
}

export default function PatientAnalysis() {
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set(['prev', 'prev-year']));
  const [useGroups, setUseGroups] = useState(false);
  const [currentData, setCurrentData] = useState<AnalysisData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData>({});
  const [loading, setLoading] = useState(false);
  
  // 날짜 상태
  const [baseMonth, setBaseMonth] = useState('');
  const [baseYear, setBaseYear] = useState('');
  const [quarterYear, setQuarterYear] = useState('');
  const [quarter, setQuarter] = useState('');
  
  // 모달 상태
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<GroupData | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [visitPaths, setVisitPaths] = useState<string[]>([]);
  const [usedPaths, setUsedPaths] = useState<{ usedPaths: string[]; groupMap: any }>({ usedPaths: [], groupMap: {} });
  
  // 확장된 그룹들 추적
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visitPaths: [] as string[]
  });

  const periodLabels = {
    month: {
      'prev': '직전 월',
      'prev-year': '전년 동월',
      'prev-2year': '2년전 동월',
      'prev-3year': '3년전 동월'
    },
    quarter: {
      'prev': '직전 분기',
      'prev-year': '전년 동분기',
      'prev-2year': '2년전 동분기',
      'prev-3year': '3년전 동분기'
    },
    year: {
      'prev': '직전 연도',
      'prev-year': '2년전',
      'prev-2year': '3년전'
    }
  };

  const comparisonButtons = {
    month: [
      { period: 'prev', label: '직전 월' },
      { period: 'prev-year', label: '전년' },
      { period: 'prev-2year', label: '2년전' },
      { period: 'prev-3year', label: '3년전' }
    ],
    quarter: [
      { period: 'prev', label: '직전 분기' },
      { period: 'prev-year', label: '전년' },
      { period: 'prev-2year', label: '2년전' },
      { period: 'prev-3year', label: '3년전' }
    ],
    year: [
      { period: 'prev', label: '직전 연도' },
      { period: 'prev-year', label: '2년전' },
      { period: 'prev-2year', label: '3년전' }
    ]
  };

  // 초기화
  useEffect(() => {
    const now = new Date();
    setBaseMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setBaseYear(now.getFullYear().toString());
    setQuarterYear(now.getFullYear().toString());
    setQuarter((Math.floor(now.getMonth() / 3) + 1).toString());
    
    loadVisitPaths();
    loadGroups();
  }, []);

  // 데이터 로드
  useEffect(() => {
    if (baseMonth || baseYear) {
      loadData();
    }
  }, [periodType, selectedPeriods, useGroups, baseMonth, baseYear, quarterYear, quarter]);

  const getCurrentPeriod = () => {
    switch (periodType) {
      case 'month': {
        const [year, month] = baseMonth.split('-').map(Number);
        return { year, month };
      }
      case 'quarter': {
        return { year: Number(quarterYear), quarter: Number(quarter) };
      }
      case 'year': {
        return { year: Number(baseYear) };
      }
    }
  };

  const loadData = useCallback(async () => {
    if (!baseMonth && !baseYear) return;
    
    try {
      setLoading(true);
      const period = getCurrentPeriod();
      
      const response = await fetch('/api/patient-analysis/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodType,
          ...period,
          comparePeriods: Array.from(selectedPeriods),
          useGroups
        })
      });

      if (!response.ok) throw new Error('데이터 로드 실패');
      const data = await response.json();
      
      setCurrentData(data.current);
      setComparisonData(data.comparisons);
    } catch (error) {
      console.error('데이터 로드 중 에러:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [baseMonth, baseYear, periodType, selectedPeriods, useGroups, toast]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/visit-path-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('그룹 로드 중 에러:', error);
    }
  };

  const loadVisitPaths = async () => {
    try {
      const response = await fetch('/api/settings/visit-paths');
      if (response.ok) {
        const data = await response.json();
        setVisitPaths(data);
      }
    } catch (error) {
      console.error('내원경로 로드 중 에러:', error);
    }
  };

  const loadUsedPaths = async () => {
    try {
      const response = await fetch('/api/visit-path-groups/used-paths');
      if (response.ok) {
        const data = await response.json();
        setUsedPaths(data);
      }
    } catch (error) {
      console.error('사용 중인 내원경로 로드 중 에러:', error);
    }
  };

  const handlePeriodToggle = (period: string) => {
    const newPeriods = new Set(selectedPeriods);
    if (newPeriods.has(period)) {
      newPeriods.delete(period);
    } else {
      newPeriods.add(period);
    }
    setSelectedPeriods(newPeriods);
  };

  const handlePeriodTypeChange = (newType: 'month' | 'quarter' | 'year') => {
    setPeriodType(newType);
    setSelectedPeriods(new Set());
  };

  const generateComparisonCell = (current: number, comparison: number) => {
    if (!comparison) return { value: '-', changeClass: '', arrow: '', changeRate: '' };

    const change = ((current - comparison) / comparison * 100);
    const changeClass = change > 0 ? 'text-red-600' : change < 0 ? 'text-blue-600' : '';
    const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '';

    return {
      value: comparison.toLocaleString(),
      changeClass,
      arrow,
      changeRate: `${arrow} ${Math.abs(change).toFixed(1)}%`
    };
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const openGroupModal = () => {
    loadUsedPaths();
    setGroupModalOpen(true);
  };

  const openEditModal = async (group?: GroupData) => {
    await loadUsedPaths();
    if (group) {
      setCurrentGroup(group);
      setFormData({
        name: group.name,
        description: group.description,
        visitPaths: group.visitPaths
      });
    } else {
      setCurrentGroup(null);
      setFormData({
        name: '',
        description: '',
        visitPaths: []
      });
    }
    setEditModalOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      const url = currentGroup 
        ? `/api/visit-path-groups/${currentGroup._id}` 
        : '/api/visit-path-groups';
      
      const method = currentGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.type === 'PATH_DUPLICATE' || result.type === 'NAME_DUPLICATE') {
          toast({
            title: "중복 오류",
            description: result.error,
            variant: "destructive",
          });
        } else {
          throw new Error(result.error);
        }
        return;
      }

      toast({
        title: "성공",
        description: currentGroup ? '그룹이 수정되었습니다.' : '그룹이 생성되었습니다.',
      });

      setEditModalOpen(false);
      loadGroups();
      loadData();
    } catch (error) {
      console.error('그룹 저장 중 에러:', error);
      toast({
        title: "오류",
        description: "그룹 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (group: GroupData) => {
    if (!confirm(`정말 '${group.name}' 그룹을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/visit-path-groups/${group._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('그룹 삭제 실패');

      toast({
        title: "성공",
        description: "그룹이 삭제되었습니다.",
      });

      loadGroups();
      loadData();
    } catch (error) {
      console.error('그룹 삭제 중 에러:', error);
      toast({
        title: "오류",
        description: "그룹 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleVisitPathToggle = (path: string) => {
    const newPaths = formData.visitPaths.includes(path)
      ? formData.visitPaths.filter(p => p !== path)
      : [...formData.visitPaths, path];
    setFormData({ ...formData, visitPaths: newPaths });
  };

  // 합계 계산 - 메모이제이션으로 최적화
  const calculateTotals = useCallback((data: AnalysisData[]) => {
    return data.reduce((totals, item) => {
      totals.totalPatientCount += item.totalPatientCount;
      totals.newPatientCount += item.newPatientCount;
      totals.revisitCount += item.revisitCount;
      totals.paymentAmount += item.paymentAmount;
      totals.totalConsultationAmount += item.totalConsultationAmount;
      return totals;
    }, {
      totalPatientCount: 0,
      newPatientCount: 0,
      revisitCount: 0,
      paymentAmount: 0,
      totalConsultationAmount: 0
    });
  }, []);

  // 메모이제이션된 계산 결과들
  const currentTotals = useMemo(() => calculateTotals(currentData), [currentData, calculateTotals]);
  const comparisonTotals = useMemo(() => {
    const totals: { [key: string]: any } = {};
    Object.keys(comparisonData).forEach(period => {
      totals[period] = calculateTotals(comparisonData[period]);
    });
    return totals;
  }, [comparisonData, calculateTotals]);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="w-6 h-6 text-cyan-600" />
          환자분석
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* 제어 패널 */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* 기간 단위 선택 */}
          <div className="flex items-center gap-2">
            <Label>기준단위:</Label>
            <Select value={periodType} onValueChange={handlePeriodTypeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">월별</SelectItem>
                <SelectItem value="quarter">분기별</SelectItem>
                <SelectItem value="year">연도별</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 기간 선택 */}
          {periodType === 'month' && (
            <div className="flex items-center gap-2">
              <Label>기준월:</Label>
              <Input
                type="month"
                value={baseMonth}
                onChange={(e) => setBaseMonth(e.target.value)}
                className="w-40"
              />
            </div>
          )}

          {periodType === 'quarter' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>연도:</Label>
                <Select value={quarterYear} onValueChange={setQuarterYear}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>분기:</Label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1분기</SelectItem>
                    <SelectItem value="2">2분기</SelectItem>
                    <SelectItem value="3">3분기</SelectItem>
                    <SelectItem value="4">4분기</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {periodType === 'year' && (
            <div className="flex items-center gap-2">
              <Label>기준연도:</Label>
              <Select value={baseYear} onValueChange={setBaseYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-l pl-4 ml-4">
            <Button
              variant={useGroups ? "default" : "outline"}
              onClick={() => setUseGroups(!useGroups)}
              className="mr-2"
            >
              {useGroups ? <Folder className="w-4 h-4 mr-2" /> : <Tag className="w-4 h-4 mr-2" />}
              {useGroups ? '대분류보기' : '개별보기'}
            </Button>
            
            <Button variant="outline" onClick={openGroupModal}>
              <Settings className="w-4 h-4 mr-2" />
              대분류 관리
            </Button>
          </div>
        </div>

        {/* 비교 기간 선택 */}
        <div className="mb-6">
          <Label className="block mb-2">비교 기간:</Label>
          <div className="flex flex-wrap gap-2">
            {comparisonButtons[periodType].map(({ period, label }) => (
              <Button
                key={period}
                variant={selectedPeriods.has(period) ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodToggle(period)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* 데이터 테이블 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <BarChart3 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th rowSpan={2} className="border border-gray-200 p-3 text-left font-semibold min-w-[150px]">
                    내원경로
                  </th>
                  <th colSpan={5} className="border border-gray-200 p-3 text-center font-semibold bg-blue-50">
                    현재
                  </th>
                  {Array.from(selectedPeriods).map(period => (
                    <th key={period} colSpan={5} className="border border-gray-200 p-3 text-center font-semibold bg-green-50">
                      {periodLabels[periodType][period as keyof typeof periodLabels[typeof periodType]]}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="border border-gray-200 p-2 text-center bg-blue-50">총환자수</th>
                  <th className="border border-gray-200 p-2 text-center bg-blue-50">신환</th>
                  <th className="border border-gray-200 p-2 text-center bg-blue-50">재진</th>
                  <th className="border border-gray-200 p-2 text-center bg-blue-50">결제금액</th>
                  <th className="border border-gray-200 p-2 text-center bg-blue-50">상담금액</th>
                  {Array.from(selectedPeriods).map(period => (
                    <React.Fragment key={period}>
                      <th className="border border-gray-200 p-2 text-center bg-green-50">총환자수</th>
                      <th className="border border-gray-200 p-2 text-center bg-green-50">신환</th>
                      <th className="border border-gray-200 p-2 text-center bg-green-50">재진</th>
                      <th className="border border-gray-200 p-2 text-center bg-green-50">결제금액</th>
                      <th className="border border-gray-200 p-2 text-center bg-green-50">상담금액</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className={item.isGroup ? 'bg-yellow-50' : ''}>
                      <td className="border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                          {item.isGroup ? (
                            <>
                              <Folder className="w-4 h-4 text-amber-600" />
                              <span className="font-semibold">{item.visitPath}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleGroupExpansion(item.groupId!)}
                                className="p-1 h-6 w-6"
                              >
                                {expandedGroups.has(item.groupId!) ? 
                                  <ChevronUp className="w-4 h-4" /> : 
                                  <ChevronDown className="w-4 h-4" />
                                }
                              </Button>
                            </>
                          ) : (
                            <>
                              <Tag className="w-4 h-4 text-blue-600" />
                              <span>{item.visitPath}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3 text-right">{item.totalPatientCount.toLocaleString()}</td>
                      <td className="border border-gray-200 p-3 text-right">{item.newPatientCount.toLocaleString()}</td>
                      <td className="border border-gray-200 p-3 text-right">{item.revisitCount.toLocaleString()}</td>
                      <td className="border border-gray-200 p-3 text-right">{item.paymentAmount.toLocaleString()}</td>
                      <td className="border border-gray-200 p-3 text-right">{item.totalConsultationAmount.toLocaleString()}</td>
                      
                      {Array.from(selectedPeriods).map(period => {
                        const comparison = comparisonData[period]?.find(comp => {
                          if (item.isGroup && comp.isGroup) {
                            return comp.groupId === item.groupId;
                          } else if (!item.isGroup && !comp.isGroup) {
                            return comp.visitPath === item.visitPath;
                          }
                          return false;
                        });

                        const totalComp = generateComparisonCell(item.totalPatientCount, comparison?.totalPatientCount || 0);
                        const newComp = generateComparisonCell(item.newPatientCount, comparison?.newPatientCount || 0);
                        const revisitComp = generateComparisonCell(item.revisitCount, comparison?.revisitCount || 0);
                        const paymentComp = generateComparisonCell(item.paymentAmount, comparison?.paymentAmount || 0);
                        const consultComp = generateComparisonCell(item.totalConsultationAmount, comparison?.totalConsultationAmount || 0);

                        return (
                          <React.Fragment key={period}>
                            <td className={`border border-gray-200 p-3 text-right ${totalComp.changeClass}`}>
                              <div>{totalComp.value}</div>
                              {totalComp.changeRate && <div className="text-sm">{totalComp.changeRate}</div>}
                            </td>
                            <td className={`border border-gray-200 p-3 text-right ${newComp.changeClass}`}>
                              <div>{newComp.value}</div>
                              {newComp.changeRate && <div className="text-sm">{newComp.changeRate}</div>}
                            </td>
                            <td className={`border border-gray-200 p-3 text-right ${revisitComp.changeClass}`}>
                              <div>{revisitComp.value}</div>
                              {revisitComp.changeRate && <div className="text-sm">{revisitComp.changeRate}</div>}
                            </td>
                            <td className={`border border-gray-200 p-3 text-right ${paymentComp.changeClass}`}>
                              <div>{paymentComp.value}</div>
                              {paymentComp.changeRate && <div className="text-sm">{paymentComp.changeRate}</div>}
                            </td>
                            <td className={`border border-gray-200 p-3 text-right ${consultComp.changeClass}`}>
                              <div>{consultComp.value}</div>
                              {consultComp.changeRate && <div className="text-sm">{consultComp.changeRate}</div>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    
                    {/* 그룹 상세 데이터 */}
                    {item.isGroup && expandedGroups.has(item.groupId!) && item.details && (
                      item.details.map((detail, detailIndex) => (
                        <tr key={`${index}-${detailIndex}`} className="bg-gray-50">
                          <td className="border border-gray-200 p-3 pl-8">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3 h-3 text-gray-500" />
                              <span className="text-sm text-gray-700">{detail.visitPath}</span>
                            </div>
                          </td>
                          <td className="border border-gray-200 p-3 text-right text-sm">{detail.totalPatientCount.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right text-sm">{detail.newPatientCount.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right text-sm">{detail.revisitCount.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right text-sm">{detail.paymentAmount.toLocaleString()}</td>
                          <td className="border border-gray-200 p-3 text-right text-sm">{detail.totalConsultationAmount.toLocaleString()}</td>
                          
                          {Array.from(selectedPeriods).map(period => {
                            const detailComparison = comparisonData[period]?.find(comp => {
                              if (comp.isGroup) {
                                return comp.details?.some(d => d.visitPath === detail.visitPath);
                              } else {
                                return comp.visitPath === detail.visitPath;
                              }
                            });

                            let actualComparison = detailComparison;
                            if (detailComparison?.isGroup) {
                              actualComparison = detailComparison.details?.find(d => d.visitPath === detail.visitPath);
                            }

                            const totalComp = generateComparisonCell(detail.totalPatientCount, actualComparison?.totalPatientCount || 0);
                            const newComp = generateComparisonCell(detail.newPatientCount, actualComparison?.newPatientCount || 0);
                            const revisitComp = generateComparisonCell(detail.revisitCount, actualComparison?.revisitCount || 0);
                            const paymentComp = generateComparisonCell(detail.paymentAmount, actualComparison?.paymentAmount || 0);
                            const consultComp = generateComparisonCell(detail.totalConsultationAmount, actualComparison?.totalConsultationAmount || 0);

                            return (
                              <React.Fragment key={period}>
                                <td className={`border border-gray-200 p-3 text-right text-sm ${totalComp.changeClass}`}>
                                  <div>{totalComp.value}</div>
                                  {totalComp.changeRate && <div className="text-xs">{totalComp.changeRate}</div>}
                                </td>
                                <td className={`border border-gray-200 p-3 text-right text-sm ${newComp.changeClass}`}>
                                  <div>{newComp.value}</div>
                                  {newComp.changeRate && <div className="text-xs">{newComp.changeRate}</div>}
                                </td>
                                <td className={`border border-gray-200 p-3 text-right text-sm ${revisitComp.changeClass}`}>
                                  <div>{revisitComp.value}</div>
                                  {revisitComp.changeRate && <div className="text-xs">{revisitComp.changeRate}</div>}
                                </td>
                                <td className={`border border-gray-200 p-3 text-right text-sm ${paymentComp.changeClass}`}>
                                  <div>{paymentComp.value}</div>
                                  {paymentComp.changeRate && <div className="text-xs">{paymentComp.changeRate}</div>}
                                </td>
                                <td className={`border border-gray-200 p-3 text-right text-sm ${consultComp.changeClass}`}>
                                  <div>{consultComp.value}</div>
                                  {consultComp.changeRate && <div className="text-xs">{consultComp.changeRate}</div>}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                ))}
                
                {/* 합계 행 */}
                <tr className="bg-blue-100 font-semibold">
                  <td className="border border-gray-200 p-3">합계</td>
                  <td className="border border-gray-200 p-3 text-right">{currentTotals.totalPatientCount.toLocaleString()}</td>
                  <td className="border border-gray-200 p-3 text-right">{currentTotals.newPatientCount.toLocaleString()}</td>
                  <td className="border border-gray-200 p-3 text-right">{currentTotals.revisitCount.toLocaleString()}</td>
                  <td className="border border-gray-200 p-3 text-right">{currentTotals.paymentAmount.toLocaleString()}</td>
                  <td className="border border-gray-200 p-3 text-right">{currentTotals.totalConsultationAmount.toLocaleString()}</td>
                  
                  {Array.from(selectedPeriods).map(period => {
                    const periodTotal = comparisonTotals[period] || {
                      totalPatientCount: 0, newPatientCount: 0, revisitCount: 0, 
                      paymentAmount: 0, totalConsultationAmount: 0
                    };
                    
                    return (
                      <React.Fragment key={period}>
                        <td className="border border-gray-200 p-3 text-right">{periodTotal.totalPatientCount.toLocaleString()}</td>
                        <td className="border border-gray-200 p-3 text-right">{periodTotal.newPatientCount.toLocaleString()}</td>
                        <td className="border border-gray-200 p-3 text-right">{periodTotal.revisitCount.toLocaleString()}</td>
                        <td className="border border-gray-200 p-3 text-right">{periodTotal.paymentAmount.toLocaleString()}</td>
                        <td className="border border-gray-200 p-3 text-right">{periodTotal.totalConsultationAmount.toLocaleString()}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 그룹 관리 모달 */}
        <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5" />
                대분류 그룹 관리
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => openEditModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  그룹 추가
                </Button>
              </div>
              
              {groups.length > 0 ? (
                <div className="space-y-4">
                  {groups.map(group => (
                    <Card key={group._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <Folder className="w-4 h-4" />
                              {group.name}
                            </h3>
                            {group.description && (
                              <p className="text-gray-600 mt-1">{group.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {group.visitPaths.map(path => (
                                <Badge key={path} variant="secondary" className="text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {path}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditModal(group)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteGroup(group)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>아직 생성된 그룹이 없습니다.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 그룹 편집 모달 */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentGroup ? '그룹 수정' : '새 그룹 추가'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">그룹명</Label>
                <Input
                  id="groupName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="그룹 이름을 입력하세요"
                />
              </div>
              
              <div>
                <Label htmlFor="groupDescription">설명</Label>
                <Textarea
                  id="groupDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="그룹에 대한 설명을 입력하세요"
                />
              </div>
              
              <div>
                <Label>내원경로 선택</Label>
                <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                  {visitPaths.map(path => {
                    const isUsed = usedPaths.usedPaths.includes(path);
                    const isInCurrentGroup = currentGroup?.visitPaths.includes(path);
                    const isDisabled = isUsed && !isInCurrentGroup;
                    const usedInGroup = usedPaths.groupMap[path];
                    
                    return (
                      <div key={path} className={`flex items-center gap-2 ${isDisabled ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          id={`path-${path}`}
                          checked={formData.visitPaths.includes(path)}
                          onChange={() => !isDisabled && handleVisitPathToggle(path)}
                          disabled={isDisabled}
                          className="rounded border-gray-300"
                        />
                        <Label 
                          htmlFor={`path-${path}`}
                          className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {path}
                          {isDisabled && usedInGroup && (
                            <span className="text-sm text-amber-600 ml-2">
                              ({usedInGroup.groupName}에서 사용 중)
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  취소
                </Button>
                <Button 
                  onClick={handleSaveGroup}
                  disabled={!formData.name || formData.visitPaths.length === 0}
                >
                  저장하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 