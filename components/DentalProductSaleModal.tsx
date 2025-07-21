'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Search, Package, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

interface DentalProduct {
  _id: string;
  name: string;
  manufacturer: string;
  specification?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
}

interface SelectedProduct extends DentalProduct {
  quantity: number;
  salePrice: number;
}

interface SaleRecord {
  _id: string;
  date: string;
  products: Array<{
    name: string;
    manufacturer: string;
    quantity: number;
    salePrice: number;
  }>;
  totalAmount: number;
}

interface TransactionData {
  chartNumber: string;
  patientName: string;
  date: string;
  doctor: string;
}

interface DentalProductSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionData: TransactionData;
}

export default function DentalProductSaleModal({ 
  isOpen, 
  onClose, 
  transactionData 
}: DentalProductSaleModalProps) {
  const [products, setProducts] = useState<DentalProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DentalProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map());
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // 구강용품 목록 로드
  const loadProducts = async () => {
    try {
      const response = await fetch('/api/dentalProducts');
      if (!response.ok) throw new Error('구강용품 목록을 불러오는데 실패했습니다.');
      
      const data = await response.json();
      // API가 { products: [...] } 형태로 반환하므로 products 배열을 추출
      const productsArray = data.products || [];
      setProducts(productsArray);
      setFilteredProducts(productsArray);
    } catch (error) {
      console.error('구강용품 로드 오류:', error);
      toast({
        title: "오류",
        description: "구강용품 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 판매 내역 로드
  const loadSalesHistory = async () => {
    try {
      const response = await fetch(`/api/dental-product-sales?chartNumber=${transactionData.chartNumber}`);
      if (!response.ok) throw new Error('판매 내역을 불러오는데 실패했습니다.');
      
      const data = await response.json();
      setSalesHistory(data);
    } catch (error) {
      console.error('판매 내역 로드 오류:', error);
      toast({
        title: "오류",
        description: "판매 내역을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      loadSalesHistory();
      setSelectedProducts(new Map());
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [isOpen, transactionData.chartNumber]);

  // 검색 필터링
  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  // 제품 선택/해제
  const toggleProduct = (product: DentalProduct) => {
    const newSelected = new Map(selectedProducts);
    
    if (newSelected.has(product._id)) {
      newSelected.delete(product._id);
    } else {
      newSelected.set(product._id, {
        ...product,
        quantity: 1,
        salePrice: product.sellingPrice
      });
    }
    
    setSelectedProducts(newSelected);
  };

  // 수량 변경
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    
    const newSelected = new Map(selectedProducts);
    const product = newSelected.get(productId);
    if (product) {
      product.quantity = quantity;
      setSelectedProducts(newSelected);
    }
  };

  // 판매가 변경
  const updateSalePrice = (productId: string, price: number) => {
    if (price < 0) return;
    
    const newSelected = new Map(selectedProducts);
    const product = newSelected.get(productId);
    if (product) {
      product.salePrice = price;
      setSelectedProducts(newSelected);
    }
  };

  // 총액 계산
  const getTotalAmount = () => {
    return Array.from(selectedProducts.values())
      .reduce((sum, product) => sum + (product.quantity * product.salePrice), 0);
  };

  // 판매 저장
  const handleSave = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "구강용품 선택 필요",
        description: "구강용품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const saleData = {
        date: transactionData.date,
        chartNumber: transactionData.chartNumber,
        patientName: transactionData.patientName,
        doctor: transactionData.doctor,
        products: Array.from(selectedProducts.values()).map(product => ({
          productId: product._id,
          name: product.name,
          manufacturer: product.manufacturer,
          quantity: product.quantity,
          salePrice: product.salePrice
        }))
      };

      const response = await fetch('/api/dental-product-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '판매 등록에 실패했습니다.');
      }

      toast({
        title: "판매 완료",
        description: "구강용품 판매가 등록되었습니다.",
      });

      // 데이터 새로고침
      loadProducts();
      loadSalesHistory();
      setSelectedProducts(new Map());
      
      // 모달 닫기
      onClose();
      
    } catch (error) {
      console.error('판매 저장 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "판매 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 페이징된 제품 목록
  const paginatedProducts = filteredProducts.slice(0, currentPage * itemsPerPage);
  const hasMore = paginatedProducts.length < filteredProducts.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            구강용품 판매
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sale" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sale">판매 등록</TabsTrigger>
            <TabsTrigger value="history">판매 내역</TabsTrigger>
          </TabsList>

          <TabsContent value="sale" className="space-y-4">
            {/* 기본 정보 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">환자 정보</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">날짜</Label>
                    <div className="font-medium">{transactionData.date}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">차트번호</Label>
                    <div className="font-medium">{transactionData.chartNumber}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">환자명</Label>
                    <div className="font-medium">{transactionData.patientName}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">진료의사</Label>
                    <div className="font-medium">{transactionData.doctor}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 h-[500px]">
              {/* 구강용품 선택 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">구강용품 선택</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="구강용품 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-48 h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[350px]">
                    <div className="grid grid-cols-1 gap-2">
                      {paginatedProducts.map((product) => (
                        <Card
                          key={product._id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedProducts.has(product._id) 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleProduct(product)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.manufacturer} {product.specification && `/ ${product.specification}`}
                                </div>
                                <div className="text-xs font-medium text-primary mt-1">
                                  판매가: {product.sellingPrice.toLocaleString()}원
                                </div>
                              </div>
                              <Badge variant={product.stock > 0 ? "default" : "destructive"} className="text-xs">
                                재고: {product.stock}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {hasMore && (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="w-full mt-2"
                      >
                        더보기
                      </Button>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 선택된 제품 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">선택된 구강용품</CardTitle>
                    <Badge variant="outline">{selectedProducts.size}개</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[300px]">
                    {selectedProducts.size === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        선택된 구강용품이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Array.from(selectedProducts.values()).map((product) => (
                          <Card key={product._id}>
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {product.manufacturer}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newSelected = new Map(selectedProducts);
                                      newSelected.delete(product._id);
                                      setSelectedProducts(newSelected);
                                    }}
                                    className="h-6 w-6 p-0 text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">수량</Label>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateQuantity(product._id, product.quantity - 1)}
                                        disabled={product.quantity <= 1}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        value={product.quantity}
                                        onChange={(e) => updateQuantity(product._id, parseInt(e.target.value) || 1)}
                                        className="h-7 text-center text-xs"
                                        min="1"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateQuantity(product._id, product.quantity + 1)}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">판매가</Label>
                                    <Input
                                      type="number"
                                      value={product.salePrice}
                                      onChange={(e) => updateSalePrice(product._id, parseInt(e.target.value) || 0)}
                                      className="h-7 text-xs"
                                      min="0"
                                    />
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <span className="text-sm font-medium">
                                    소계: {(product.quantity * product.salePrice).toLocaleString()}원
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  {selectedProducts.size > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">총 금액:</span>
                        <span className="text-lg font-bold text-primary">
                          {getTotalAmount().toLocaleString()}원
                        </span>
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full mt-2"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {isLoading ? '저장 중...' : '판매 등록'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">판매 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {salesHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      판매 내역이 없습니다.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>날짜</TableHead>
                          <TableHead>구강용품</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>판매금액</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesHistory.map((sale) => (
                          <TableRow key={sale._id}>
                            <TableCell>
                              {new Date(sale.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {sale.products.map((product, index) => (
                                  <div key={index} className="text-xs">
                                    {product.name} ({product.manufacturer})
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sale.products.reduce((sum, product) => sum + product.quantity, 0)}개
                            </TableCell>
                            <TableCell className="font-medium">
                              {sale.totalAmount.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 