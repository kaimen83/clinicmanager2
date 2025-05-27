'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Search, 
  Plus, 
  Minus, 
  Edit, 
  Trash2, 
  Package, 
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { toISODateString, getCurrentKstDate } from '@/lib/utils';

interface DentalProduct {
  _id: string;
  name: string;
  manufacturer: string;
  specification?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryLog {
  _id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  price: number;
  notes?: string;
  userId: string;
}

interface SaleRecord {
  _id: string;
  date: string;
  chartNumber: string;
  patientName: string;
  doctor: string;
  products: Array<{
    productId: string;
    name: string;
    manufacturer: string;
    quantity: number;
    salePrice: number;
  }>;
  totalAmount: number;
  userId: string;
}

interface StatisticsData {
  totalSales: number;
  totalQuantity: number;
  totalProfit: number;
  activities: Array<{
    type: 'SALE' | 'IN' | 'OUT';
    date: string;
    patientName?: string;
    userName: string;
    products: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
      amount: number;
    }>;
    totalAmount: number;
    notes?: string;
    _id: string;
  }>;
  productStats?: Array<{
    _id: string;
    name: string;
    specification?: string;
    totalQuantity: number;
    totalAmount: number;
    profit: number;
    activities: Array<{
      _id: string;
      date: string;
      type: 'SALE' | 'IN' | 'OUT';
      quantity: number;
      price: number;
      amount: number;
      notes?: string;
      patientName?: string;
    }>;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DentalProductInventoryModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState<DentalProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DentalProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 입고/출고 모달 상태
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalType, setStockModalType] = useState<'IN' | 'OUT'>('IN');
  const [selectedProduct, setSelectedProduct] = useState<DentalProduct | null>(null);
  const [stockFormData, setStockFormData] = useState({
    quantity: '',
    price: '',
    reason: '판매',
    notes: ''
  });

  // 통계 관련 상태
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [statisticsView, setStatisticsView] = useState<'date' | 'product'>('date');
  const [dateRange, setDateRange] = useState({
    start: toISODateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30일 전
    end: toISODateString(getCurrentKstDate())
  });

  // 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (activeTab === 'statistics') {
        loadStatistics();
      }
    }
  }, [isOpen, activeTab]);

  // 제품 필터링
  useEffect(() => {
    let filtered = products;
    
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.specification && product.specification.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (showLowStockOnly) {
      filtered = filtered.filter(product => product.stock <= 5);
    }
    
    setFilteredProducts(filtered);
  }, [products, searchQuery, showLowStockOnly]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dentalProducts');
      if (!response.ok) throw new Error('구강용품 목록 조회 실패');
      
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('구강용품 목록 로드 오류:', error);
      toast.error('구강용품 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        view: statisticsView
      });

      const response = await fetch(`/api/dentalProducts/statistics?${params}`);
      if (!response.ok) throw new Error('통계 데이터 조회 실패');
      
      const data = await response.json();
      setStatisticsData(data);
    } catch (error) {
      console.error('통계 데이터 로드 오류:', error);
      toast.error('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockModalOpen = (product: DentalProduct, type: 'IN' | 'OUT') => {
    setSelectedProduct(product);
    setStockModalType(type);
    setStockFormData({
      quantity: '',
      price: type === 'IN' ? product.purchasePrice.toString() : product.sellingPrice.toString(),
      reason: '판매',
      notes: ''
    });
    setShowStockModal(true);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const endpoint = stockModalType === 'IN' ? 'stock-in' : 'stock-out';
      const body = stockModalType === 'IN' 
        ? {
            quantity: parseInt(stockFormData.quantity),
            purchasePrice: stockFormData.price ? parseInt(stockFormData.price) : null,
            notes: stockFormData.notes
          }
        : {
            quantity: parseInt(stockFormData.quantity),
            reason: stockFormData.reason,
            notes: stockFormData.notes
          };

      const response = await fetch(`/api/dentalProducts/${selectedProduct._id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`${stockModalType === 'IN' ? '입고' : '출고'} 처리 실패`);

      toast.success(`${stockModalType === 'IN' ? '입고' : '출고'}가 완료되었습니다.`);
      setShowStockModal(false);
      loadProducts();
    } catch (error) {
      console.error('재고 처리 오류:', error);
      toast.error(error instanceof Error ? error.message : '재고 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteActivity = async (activityId: string, activityType: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/dentalProducts/activities/${activityId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('활동 내역 삭제 실패');

      toast.success('삭제가 완료되었습니다.');
      loadStatistics();
      if (activityType === 'IN' || activityType === 'OUT') {
        loadProducts(); // 재고 데이터도 새로고침
      }
    } catch (error) {
      console.error('활동 삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              구강용품 수불부
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inventory">재고관리</TabsTrigger>
              <TabsTrigger value="statistics">판매통계</TabsTrigger>
            </TabsList>

            {/* 재고관리 탭 */}
            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>재고 현황</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 검색 및 필터 */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="품목명, 제조사, 규격 검색..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="lowStockFilter"
                        checked={showLowStockOnly}
                        onChange={(e) => setShowLowStockOnly(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="lowStockFilter">재고 부족 상품만</Label>
                    </div>
                  </div>

                  {/* 재고 테이블 */}
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>품목명</TableHead>
                          <TableHead>규격</TableHead>
                          <TableHead>제조사</TableHead>
                          <TableHead>현재재고</TableHead>
                          <TableHead>매입가</TableHead>
                          <TableHead>판매가</TableHead>
                          <TableHead>재고가액</TableHead>
                          <TableHead>관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              로딩 중...
                            </TableCell>
                          </TableRow>
                        ) : filteredProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              데이터가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProducts.map((product) => {
                            const isLowStock = product.stock <= 5;
                            const stockValue = product.stock * product.purchasePrice;
                            
                            return (
                              <TableRow key={product._id} className={isLowStock ? 'bg-red-50' : ''}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>{product.specification || '-'}</TableCell>
                                <TableCell>{product.manufacturer}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                                      {product.stock}
                                    </span>
                                    {isLowStock && (
                                      <Badge variant="destructive" className="text-xs">
                                        부족
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>₩{formatAmount(product.purchasePrice)}</TableCell>
                                <TableCell>₩{formatAmount(product.sellingPrice)}</TableCell>
                                <TableCell>₩{formatAmount(stockValue)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStockModalOpen(product, 'IN')}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      입고
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStockModalOpen(product, 'OUT')}
                                    >
                                      <Minus className="w-3 h-3 mr-1" />
                                      출고
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 요약 정보 */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">총 품목 수:</span> {filteredProducts.length}개
                      </div>
                      <div>
                        <span className="font-medium">총 재고가액:</span> ₩{formatAmount(
                          filteredProducts.reduce((sum, product) => sum + (product.stock * product.purchasePrice), 0)
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 판매통계 탭 */}
            <TabsContent value="statistics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    판매 통계
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 기간 선택 및 뷰 전환 */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex gap-2 items-center">
                        <Label>기간:</Label>
                        <Input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="w-40"
                        />
                        <span>~</span>
                        <Input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="w-40"
                        />
                      </div>
                      <Button onClick={loadStatistics} size="sm">
                        조회
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={statisticsView === 'date' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatisticsView('date')}
                      >
                        날짜별 보기
                      </Button>
                      <Button
                        variant={statisticsView === 'product' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatisticsView('product')}
                      >
                        품목별 보기
                      </Button>
                    </div>
                  </div>

                  {/* 통계 요약 */}
                  {statisticsData && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">총 판매금액</div>
                          <div className="text-2xl font-bold text-blue-600">
                            ₩{formatAmount(statisticsData.totalSales)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">총 판매수량</div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatAmount(statisticsData.totalQuantity)}개
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">순이익</div>
                          <div className="text-2xl font-bold text-purple-600">
                            ₩{formatAmount(statisticsData.totalProfit)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">입고액</div>
                          <div className="text-2xl font-bold text-orange-600">
                            ₩{formatAmount(
                              statisticsData.activities
                                ?.filter(activity => activity.type === 'IN')
                                .reduce((sum, activity) => sum + activity.totalAmount, 0) || 0
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* 통계 테이블 */}
                  <div className="border rounded-md">
                    {statisticsView === 'date' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead>유형</TableHead>
                            <TableHead>환자명</TableHead>
                            <TableHead>품목</TableHead>
                            <TableHead>수량</TableHead>
                            <TableHead>금액</TableHead>
                            <TableHead>비고</TableHead>
                            <TableHead>관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                로딩 중...
                              </TableCell>
                            </TableRow>
                          ) : !statisticsData?.activities?.length ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                데이터가 없습니다.
                              </TableCell>
                            </TableRow>
                          ) : (
                            statisticsData.activities.map((activity) => (
                              <TableRow key={activity._id}>
                                <TableCell>{formatDate(activity.date)}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      activity.type === 'SALE' ? 'default' : 
                                      activity.type === 'IN' ? 'secondary' : 'destructive'
                                    }
                                  >
                                    {activity.type === 'SALE' ? '판매' : 
                                     activity.type === 'IN' ? '입고' : '출고'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{activity.patientName || '-'}</TableCell>
                                <TableCell>
                                  {activity.products.map(p => p.name).join(', ')}
                                </TableCell>
                                <TableCell>
                                  {activity.products.reduce((sum, p) => sum + p.quantity, 0)}개
                                </TableCell>
                                <TableCell>₩{formatAmount(activity.totalAmount)}</TableCell>
                                <TableCell>{activity.notes || '-'}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteActivity(activity._id, activity.type)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>품목명</TableHead>
                            <TableHead>규격</TableHead>
                            <TableHead>판매수량</TableHead>
                            <TableHead>판매금액</TableHead>
                            <TableHead>순이익</TableHead>
                            <TableHead>상세내역</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8">
                                로딩 중...
                              </TableCell>
                            </TableRow>
                          ) : !statisticsData?.productStats?.length ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8">
                                데이터가 없습니다.
                              </TableCell>
                            </TableRow>
                          ) : (
                            statisticsData.productStats.map((stat) => (
                              <TableRow key={stat._id}>
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell>{stat.specification || '-'}</TableCell>
                                <TableCell>{stat.totalQuantity}개</TableCell>
                                <TableCell>₩{formatAmount(stat.totalAmount)}</TableCell>
                                <TableCell>₩{formatAmount(stat.profit)}</TableCell>
                                <TableCell>
                                  <Button size="sm" variant="outline">
                                    상세보기
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 입고/출고 모달 */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockModalType === 'IN' ? '입고 등록' : '출고 등록'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <div>
              <Label>품목명</Label>
              <Input value={selectedProduct?.name || ''} disabled />
            </div>
            
            <div>
              <Label htmlFor="quantity">수량 *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={stockFormData.quantity}
                onChange={(e) => setStockFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
            
            {stockModalType === 'IN' ? (
              <div>
                <Label htmlFor="price">매입가 (선택)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={stockFormData.price}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="reason">출고사유 *</Label>
                <Select 
                  value={stockFormData.reason} 
                  onValueChange={(value) => setStockFormData(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="판매">판매</SelectItem>
                    <SelectItem value="폐기">폐기</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="notes">비고</Label>
              <Textarea
                id="notes"
                value={stockFormData.notes}
                onChange={(e) => setStockFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                저장
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowStockModal(false)}
                className="flex-1"
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