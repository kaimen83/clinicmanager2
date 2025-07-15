'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Package, Minus, Plus } from 'lucide-react';
import { safeRestorePointerEvents, createSafeOnOpenChange } from '@/lib/pointer-events-fix';
import ImplantContractList from './ImplantContractList';

interface ImplantProduct {
  _id: string;
  category: string;
  name: string;
  specification: string;
  usage: string;
  stock: number;
  price: number;
}

interface Activity {
  _id: string;
  date: string;
  type: 'IN' | 'OUT';
  category: string;
  productName: string;
  specification: string;
  usage: string;
  quantity: number;
  patientName?: string;
  doctor?: string;
  outReason?: string;
  notes?: string;
}

interface ProductStat {
  _id: string;
  category: string;
  name: string;
  specification: string;
  usage: string;
  totalUsage: number;
  totalAmount: number;
  activities: Activity[];
}

interface Statistics {
  totalUsage: number;
  totalAmount: number;
  totalStockIn: number;
  totalStockInAmount: number;
  totalDisposal: number;
  activities: Activity[];
  productStats: ProductStat[];
}

interface ImplantInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImplantInventoryModal({ isOpen, onClose }: ImplantInventoryModalProps) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState<ImplantProduct[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  
  // 통계 필터 상태
  const [statCategoryFilter, setStatCategoryFilter] = useState('all');
  const [statNameFilter, setStatNameFilter] = useState('all');
  const [statUsageFilter, setStatUsageFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [view, setView] = useState('date');
  
  // 모달 상태
  const [stockInModal, setStockInModal] = useState(false);
  const [stockOutModal, setStockOutModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  // 폼 상태
  const [stockInForm, setStockInForm] = useState({
    date: '',
    quantity: '',
    notes: ''
  });
  
  const [stockOutForm, setStockOutForm] = useState({
    date: '',
    quantity: '',
    chartNumber: '',
    patientName: '',
    doctor: '',
    outReason: '',
    notes: ''
  });

  // 초기 날짜 설정
  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    setStartDate(oneMonthAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setStockInForm(prev => ({ ...prev, date: today.toISOString().split('T')[0] }));
    setStockOutForm(prev => ({ ...prev, date: today.toISOString().split('T')[0] }));
  }, []);

  // 재고 데이터 로드
  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/implantProducts');
      if (!response.ok) throw new Error('재고 데이터를 불러오는데 실패했습니다.');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('재고 데이터 로드 중 에러:', error);
      alert('재고 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 통계 데이터 로드
  const loadStatisticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
        category: statCategoryFilter === 'all' ? '' : statCategoryFilter,
        productName: statNameFilter === 'all' ? '' : statNameFilter,
        usage: statUsageFilter === 'all' ? '' : statUsageFilter,
        view
      });

      const response = await fetch(`/api/implantProducts/statistics?${params.toString()}`);
      if (!response.ok) throw new Error('통계 데이터를 불러오는데 실패했습니다.');
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('통계 데이터 로드 중 에러:', error);
      alert('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'inventory') {
        loadInventoryData();
      } else if (activeTab === 'statistics') {
        loadStatisticsData();
      }
    }
  }, [isOpen, activeTab, startDate, endDate, statCategoryFilter, statNameFilter, statUsageFilter, view]);

  // Radix UI Dialog pointer-events 버그 해결
  useEffect(() => {
    // 모달이 열릴 때와 닫힐 때 pointer-events 관리
    if (!isOpen && !stockInModal && !stockOutModal) {
      // 모든 모달이 닫혔을 때 안전하게 pointer-events 복원
      safeRestorePointerEvents();
    }
  }, [isOpen, stockInModal, stockOutModal]);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      safeRestorePointerEvents(100);
    };
  }, []);

  // 입고 처리
  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/implantProducts/${selectedProduct}/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stockInForm,
          quantity: Number(stockInForm.quantity)
        })
      });

      if (!response.ok) throw new Error('입고 처리에 실패했습니다.');
      
      setStockInModal(false);
      setStockInForm({ date: new Date().toISOString().split('T')[0], quantity: '', notes: '' });
      setSelectedProduct(null);
      
      // pointer-events 복원
      setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 50);
      
      loadInventoryData();
      alert('입고가 완료되었습니다.');
    } catch (error) {
      console.error('입고 처리 중 에러:', error);
      alert('입고 처리에 실패했습니다.');
    }
  };

  // 출고 처리
  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // 출고사유 필수 체크
    if (!stockOutForm.outReason) {
      alert('출고사유를 선택해주세요.');
      return;
    }

    // 환자사용 시 필수 필드 체크
    if (stockOutForm.outReason === '환자사용') {
      if (!stockOutForm.chartNumber || !stockOutForm.patientName || !stockOutForm.doctor) {
        alert('환자사용 시 차트번호, 환자명, 담당의는 필수입니다.');
        return;
      }
    }

    try {
      const response = await fetch(`/api/implantProducts/${selectedProduct}/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stockOutForm,
          quantity: Number(stockOutForm.quantity)
        })
      });

      if (!response.ok) throw new Error('출고 처리에 실패했습니다.');
      
      setStockOutModal(false);
      setStockOutForm({ 
        date: new Date().toISOString().split('T')[0], 
        quantity: '', 
        chartNumber: '', 
        patientName: '', 
        doctor: '', 
        outReason: '', 
        notes: '' 
      });
      setSelectedProduct(null);
      
      // pointer-events 복원
      setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 50);
      
      loadInventoryData();
      alert('출고가 완료되었습니다.');
    } catch (error) {
      console.error('출고 처리 중 에러:', error);
      alert('출고 처리에 실패했습니다.');
    }
  };

  // 활동 내역 삭제
  const handleActivityDelete = async (activityId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/implantProducts/activities/${activityId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('활동 내역 삭제에 실패했습니다.');
      
      loadInventoryData();
      loadStatisticsData();
      alert('삭제가 완료되었습니다.');
    } catch (error) {
      console.error('활동 내역 삭제 중 에러:', error);
      alert('활동 내역 삭제에 실패했습니다.');
    }
  };

  // 필터링된 제품 목록
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.specification.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || product.category === categoryFilter;
    const matchesName = !nameFilter || nameFilter === 'all' || product.name === nameFilter;
    const matchesUsage = !usageFilter || usageFilter === 'all' || product.usage === usageFilter;
    const matchesLowStock = !lowStockFilter || product.stock <= 4;

    return matchesSearch && matchesCategory && matchesName && matchesUsage && matchesLowStock;
  });

  // 고유 품목명 목록
  const uniqueNames = [...new Set(products
    .filter(p => !categoryFilter || categoryFilter === 'all' || p.category === categoryFilter)
    .map(p => p.name))];

  return (
    <>
      {/* 메인 임플란트 수불부 모달 */}
      <Dialog 
        open={isOpen && !stockInModal && !stockOutModal} 
        onOpenChange={createSafeOnOpenChange(onClose)}
        modal={true}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto border-0 shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              임플란트 수불부
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-50 border-0">
              <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">재고관리</TabsTrigger>
              <TabsTrigger value="statistics" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">사용통계</TabsTrigger>
              <TabsTrigger value="contract" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">임플란트 계약</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="space-y-4">
              {/* 요약 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">총 품목 수</div>
                      <div className="text-2xl font-bold text-blue-600">{filteredProducts.length}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">총 재고가액</div>
                      <div className="text-2xl font-bold text-green-600">
                        {filteredProducts.reduce((sum, p) => sum + (p.stock * p.price), 0).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 컴팩트 필터 섹션 */}
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <Input
                      placeholder="품목명 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9 border-gray-200 hover:bg-gray-50">
                        <SelectValue placeholder="카테고리" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-lg">
                        <SelectItem value="all">전체 카테고리</SelectItem>
                        <SelectItem value="fixture">Fixture</SelectItem>
                        <SelectItem value="이식재">이식재</SelectItem>
                        <SelectItem value="소모품">소모품</SelectItem>
                        <SelectItem value="기타">기타</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={nameFilter} onValueChange={setNameFilter}>
                      <SelectTrigger className="h-9 border-gray-200 hover:bg-gray-50">
                        <SelectValue placeholder="품목" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-lg">
                        <SelectItem value="all">전체 품목</SelectItem>
                        {uniqueNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={usageFilter} onValueChange={setUsageFilter}>
                      <SelectTrigger className="h-9 border-gray-200 hover:bg-gray-50">
                        <SelectValue placeholder="사용처" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-lg">
                        <SelectItem value="all">전체 사용처</SelectItem>
                        <SelectItem value="원내">원내</SelectItem>
                        <SelectItem value="기공소">기공소</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="lowStockFilter"
                        checked={lowStockFilter}
                        onChange={(e) => setLowStockFilter(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="lowStockFilter" className="text-sm text-gray-700">재고 부족</label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 컴팩트 재고 테이블 */}
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">카테고리</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">품목명</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">규격</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">사용처</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">재고</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">가격</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">재고가액</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredProducts.map(product => (
                          <tr key={product._id} className={`hover:bg-gray-50 ${product.stock <= 4 ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-2 text-sm text-gray-900">{product.category}</td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">{product.name}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{product.specification}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{product.usage}</td>
                            <td className="px-3 py-2 text-sm">
                              <div className="flex items-center">
                                <span className={`font-semibold ${product.stock <= 4 ? 'text-red-600' : 'text-gray-900'}`}>
                                  {product.stock}
                                </span>
                                {product.stock <= 4 && (
                                  <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0.5">부족</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">{product.price.toLocaleString()}원</td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">{(product.stock * product.price).toLocaleString()}원</td>
                            <td className="px-3 py-2">
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(product._id);
                                    setStockInModal(true);
                                  }}
                                  className="h-7 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  입고
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(product._id);
                                    setStockOutModal(true);
                                  }}
                                  className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  출고
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              {/* 통계 필터 섹션 */}
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div className="flex space-x-2">
                      <Button
                        variant={view === 'date' ? 'default' : 'outline'}
                        onClick={() => setView('date')}
                      >
                        날짜별 보기
                      </Button>
                      <Button
                        variant={view === 'product' ? 'default' : 'outline'}
                        onClick={() => setView('product')}
                      >
                        품목별 보기
                      </Button>
                    </div>
                    <Select value={statCategoryFilter} onValueChange={setStatCategoryFilter}>
                      <SelectTrigger className="border-gray-200 hover:bg-gray-50">
                        <SelectValue placeholder="전체 카테고리" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-lg">
                        <SelectItem value="all">전체 카테고리</SelectItem>
                        <SelectItem value="fixture">Fixture</SelectItem>
                        <SelectItem value="이식재">이식재</SelectItem>
                        <SelectItem value="소모품">소모품</SelectItem>
                        <SelectItem value="기타">기타</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 통계 요약 */}
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">총 사용수량</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.totalUsage.toLocaleString()}개</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">총 사용금액</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.totalAmount.toLocaleString()}원</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">입고금액</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.totalStockInAmount.toLocaleString()}원</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">폐기수량</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.totalDisposal.toLocaleString()}개</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 통계 테이블 */}
              {statistics && (
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      {view === 'date' ? (
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">날짜</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">유형</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">카테고리</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">품목명</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">규격</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">수량</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">환자명</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">담당의</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">사유</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statistics.activities.map(activity => (
                              <tr key={activity._id}>
                                <td className="px-3 py-1.5 text-sm">{new Date(activity.date).toLocaleDateString()}</td>
                                <td className="px-3 py-1.5">
                                  <Badge variant={activity.type === 'IN' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                                    {activity.type === 'IN' ? '입고' : '출고'}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1.5 text-sm">{activity.category}</td>
                                <td className="px-3 py-1.5 text-sm">{activity.productName}</td>
                                <td className="px-3 py-1.5 text-sm">{activity.specification || '-'}</td>
                                <td className="px-3 py-1.5 text-sm">{activity.quantity}개</td>
                                <td className="px-3 py-1.5 text-sm">{activity.patientName || '-'}</td>
                                <td className="px-3 py-1.5 text-sm">{activity.doctor || '-'}</td>
                                <td className="px-3 py-1.5 text-sm">{activity.outReason || '-'}</td>
                                <td className="px-3 py-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleActivityDelete(activity._id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">카테고리</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">품목명</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">규격</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">사용처</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">총 사용량</th>
                              <th className="px-3 py-1.5 text-left text-sm font-medium text-gray-700">총 금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statistics.productStats.map(stat => (
                              <tr key={stat._id}>
                                <td className="px-3 py-1.5 text-sm">{stat.category}</td>
                                <td className="px-3 py-1.5 text-sm">{stat.name}</td>
                                <td className="px-3 py-1.5 text-sm">{stat.specification}</td>
                                <td className="px-3 py-1.5 text-sm">{stat.usage}</td>
                                <td className="px-3 py-1.5 text-sm">{stat.totalUsage}개</td>
                                <td className="px-3 py-1.5 text-sm">{stat.totalAmount.toLocaleString()}원</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="contract" className="space-y-4">
              <ImplantContractList />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 입고 모달 - 메인 모달과 같은 레벨로 분리 */}
      <Dialog 
        open={stockInModal} 
        onOpenChange={createSafeOnOpenChange(() => setStockInModal(false), () => {
          // 입고 모달이 닫힐 때 폼 데이터 초기화
          setStockInForm({
            date: new Date().toISOString().split('T')[0],
            quantity: '',
            notes: ''
          });
          setSelectedProduct(null);
        })}
        modal={true}
      >
        <DialogContent className="max-w-md border-0 shadow-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              입고 등록
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockIn} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">날짜*</label>
              <Input
                type="date"
                value={stockInForm.date}
                onChange={(e) => setStockInForm(prev => ({ ...prev, date: e.target.value }))}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">수량*</label>
              <Input
                type="number"
                min="1"
                value={stockInForm.quantity}
                onChange={(e) => setStockInForm(prev => ({ ...prev, quantity: e.target.value }))}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">비고</label>
              <textarea
                className="w-full p-2 border border-gray-200 rounded-md resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                rows={3}
                value={stockInForm.notes}
                onChange={(e) => setStockInForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">저장</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setStockInModal(false);
                  setStockInForm({
                    date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    notes: ''
                  });
                  setSelectedProduct(null);
                  // pointer-events 복원
                  setTimeout(() => {
                    document.body.style.pointerEvents = '';
                  }, 50);
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                취소
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 출고 모달 - 메인 모달과 같은 레벨로 분리 */}
      <Dialog 
        open={stockOutModal} 
        onOpenChange={createSafeOnOpenChange(() => setStockOutModal(false), () => {
          // 출고 모달이 닫힐 때 폼 데이터 초기화
          setStockOutForm({
            date: new Date().toISOString().split('T')[0],
            quantity: '',
            chartNumber: '',
            patientName: '',
            doctor: '',
            outReason: '',
            notes: ''
          });
          setSelectedProduct(null);
        })}
        modal={true}
      >
        <DialogContent className="max-w-md border-0 shadow-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Minus className="w-5 h-5 text-red-600" />
              </div>
              출고 등록
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockOut} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">날짜*</label>
              <Input
                type="date"
                value={stockOutForm.date}
                onChange={(e) => setStockOutForm(prev => ({ ...prev, date: e.target.value }))}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">수량*</label>
              <Input
                type="number"
                min="1"
                value={stockOutForm.quantity}
                onChange={(e) => setStockOutForm(prev => ({ ...prev, quantity: e.target.value }))}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">출고사유*</label>
              <Select
                value={stockOutForm.outReason}
                onValueChange={(value) => setStockOutForm(prev => ({ ...prev, outReason: value }))}
                required
              >
                <SelectTrigger className="border-gray-200 hover:bg-gray-50">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent className="border-0 shadow-lg">
                  <SelectItem value="환자사용">환자사용</SelectItem>
                  <SelectItem value="폐기">폐기</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {stockOutForm.outReason === '환자사용' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">차트번호*</label>
                  <Input
                    value={stockOutForm.chartNumber}
                    onChange={(e) => setStockOutForm(prev => ({ ...prev, chartNumber: e.target.value }))}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">환자명*</label>
                  <Input
                    value={stockOutForm.patientName}
                    onChange={(e) => setStockOutForm(prev => ({ ...prev, patientName: e.target.value }))}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">담당의*</label>
                  <Input
                    value={stockOutForm.doctor}
                    onChange={(e) => setStockOutForm(prev => ({ ...prev, doctor: e.target.value }))}
                    required
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">비고</label>
              <textarea
                className="w-full p-2 border border-gray-200 rounded-md resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                rows={3}
                value={stockOutForm.notes}
                onChange={(e) => setStockOutForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">저장</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setStockOutModal(false);
                  setStockOutForm({
                    date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    chartNumber: '',
                    patientName: '',
                    doctor: '',
                    outReason: '',
                    notes: ''
                  });
                  setSelectedProduct(null);
                  // pointer-events 복원
                  setTimeout(() => {
                    document.body.style.pointerEvents = '';
                  }, 50);
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                취소
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 