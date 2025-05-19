'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from './ui/dialog';
import { Label } from './ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type DentalProduct = {
  _id: string;
  name: string;
  manufacturer: string;
  specification: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

type DentalProductsListProps = {
  title: string;
};

export default function DentalProductsList({ title }: DentalProductsListProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<DentalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<DentalProduct | null>(null);
  
  // 새 제품 관련 상태
  const [newName, setNewName] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newSpecification, setNewSpecification] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<number | ''>('');
  const [newSellingPrice, setNewSellingPrice] = useState<number | ''>('');
  const [newStock, setNewStock] = useState<number | ''>('');
  
  // 다이얼로그 핸들러
  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    // 다이얼로그가 닫힐 때 입력값 초기화
    if (!open) {
      resetNewProductFields();
    }
  };

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    // 다이얼로그가 닫힐 때 입력값 초기화
    if (!open) {
      setCurrentProduct(null);
    }
  };
  
  // 새 제품 필드 초기화
  const resetNewProductFields = () => {
    setNewName('');
    setNewManufacturer('');
    setNewSpecification('');
    setNewPurchasePrice('');
    setNewSellingPrice('');
    setNewStock('');
  };

  // 제품 목록 불러오기
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dentalProducts', {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('구강용품 데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 제품 추가
  const handleAddProduct = async () => {
    if (!newName.trim() || !newManufacturer.trim() || newPurchasePrice === '' || newSellingPrice === '') {
      toast({
        title: "필수 정보 누락",
        description: "이름, 제조사, 구매가격, 판매가격은 필수 입력사항입니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/dentalProducts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          manufacturer: newManufacturer,
          specification: newSpecification,
          purchasePrice: newPurchasePrice,
          sellingPrice: newSellingPrice,
          stock: newStock === '' ? 0 : newStock
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '구강용품을 추가하는데 실패했습니다');
      }

      const data = await response.json();
      
      // 성공적으로 추가된 경우 로컬 상태에 새 제품 추가
      setProducts(prevProducts => [...prevProducts, data.product]);
      
      resetNewProductFields();
      setIsAddDialogOpen(false);
      toast({
        title: "추가 완료",
        description: "구강용품이 성공적으로 추가되었습니다.",
      });
    } catch (err) {
      toast({
        title: "추가 실패",
        description: err instanceof Error ? err.message : '구강용품을 추가하는데 오류가 발생했습니다',
        variant: "destructive"
      });
    }
  };

  // 제품 수정
  const handleEditProduct = async () => {
    if (!currentProduct) return;
    
    if (!currentProduct.name.trim() || !currentProduct.manufacturer.trim()) {
      toast({
        title: "필수 정보 누락",
        description: "이름과 제조사는 필수 입력사항입니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/dentalProducts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentProduct._id,
          name: currentProduct.name,
          manufacturer: currentProduct.manufacturer,
          specification: currentProduct.specification,
          purchasePrice: currentProduct.purchasePrice,
          sellingPrice: currentProduct.sellingPrice,
          stock: currentProduct.stock
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '구강용품을 수정하는데 실패했습니다');
      }

      // 성공적으로 수정된 경우 로컬 상태 업데이트
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product._id === currentProduct._id ? currentProduct : product
        )
      );
      
      setCurrentProduct(null);
      setIsEditDialogOpen(false);
      toast({
        title: "수정 완료",
        description: "구강용품이 성공적으로 수정되었습니다.",
      });
    } catch (err) {
      toast({
        title: "수정 실패",
        description: err instanceof Error ? err.message : '구강용품을 수정하는데 오류가 발생했습니다',
        variant: "destructive"
      });
    }
  };

  // 제품 삭제
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말로 이 제품을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/dentalProducts?id=${id}`, {
        method: 'DELETE',
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '구강용품을 삭제하는데 실패했습니다');
      }

      setProducts(prevProducts => prevProducts.filter(product => product._id !== id));
      
      toast({
        title: "삭제 완료",
        description: "구강용품이 성공적으로 삭제되었습니다.",
      });
    } catch (err) {
      toast({
        title: "삭제 실패",
        description: err instanceof Error ? err.message : '구강용품을 삭제하는데 오류가 발생했습니다',
        variant: "destructive"
      });
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (product: DentalProduct) => {
    setCurrentProduct({...product});
    setIsEditDialogOpen(true);
  };

  // 가격 형식화
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (loading) return <div className="p-4 text-center">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>추가</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>구강용품 추가</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  이름*
                </Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                  className="col-span-3"
                  placeholder="제품명"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="manufacturer" className="text-right">
                  제조사*
                </Label>
                <Input
                  id="manufacturer"
                  value={newManufacturer}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewManufacturer(e.target.value)}
                  className="col-span-3"
                  placeholder="제조사"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="specification" className="text-right">
                  규격
                </Label>
                <Input
                  id="specification"
                  value={newSpecification}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSpecification(e.target.value)}
                  className="col-span-3"
                  placeholder="규격 (선택사항)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchasePrice" className="text-right">
                  구매가격*
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  value={newPurchasePrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? Number(e.target.value) : '';
                    setNewPurchasePrice(value);
                  }}
                  className="col-span-3"
                  placeholder="구매가격 (원)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sellingPrice" className="text-right">
                  판매가격*
                </Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  min="0"
                  value={newSellingPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? Number(e.target.value) : '';
                    setNewSellingPrice(value);
                  }}
                  className="col-span-3"
                  placeholder="판매가격 (원)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">
                  재고
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? Number(e.target.value) : '';
                    setNewStock(value);
                  }}
                  className="col-span-3"
                  placeholder="재고 수량"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleAddProduct}>추가</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>제조사</TableHead>
              <TableHead>규격</TableHead>
              <TableHead className="text-right">구매가격</TableHead>
              <TableHead className="text-right">판매가격</TableHead>
              <TableHead className="text-right">재고</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  등록된 구강용품이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.manufacturer}</TableCell>
                  <TableCell>{product.specification || '-'}</TableCell>
                  <TableCell className="text-right">{formatPrice(product.purchasePrice)}원</TableCell>
                  <TableCell className="text-right">{formatPrice(product.sellingPrice)}원</TableCell>
                  <TableCell className="text-right">{product.stock}개</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProduct(product._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>구강용품 수정</DialogTitle>
          </DialogHeader>
          {currentProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  이름*
                </Label>
                <Input
                  id="edit-name"
                  value={currentProduct.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => 
                    setCurrentProduct({...currentProduct, name: e.target.value})
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-manufacturer" className="text-right">
                  제조사*
                </Label>
                <Input
                  id="edit-manufacturer"
                  value={currentProduct.manufacturer}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => 
                    setCurrentProduct({...currentProduct, manufacturer: e.target.value})
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-specification" className="text-right">
                  규격
                </Label>
                <Input
                  id="edit-specification"
                  value={currentProduct.specification}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => 
                    setCurrentProduct({...currentProduct, specification: e.target.value})
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchasePrice" className="text-right">
                  구매가격*
                </Label>
                <Input
                  id="edit-purchasePrice"
                  type="number"
                  min="0"
                  value={currentProduct.purchasePrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? Number(e.target.value) : 0;
                    setCurrentProduct({...currentProduct, purchasePrice: value});
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-sellingPrice" className="text-right">
                  판매가격*
                </Label>
                <Input
                  id="edit-sellingPrice"
                  type="number"
                  min="0"
                  value={currentProduct.sellingPrice}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? Number(e.target.value) : 0;
                    setCurrentProduct({...currentProduct, sellingPrice: value});
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-stock" className="text-right">
                  재고
                </Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  value={currentProduct.stock}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? Number(e.target.value) : 0;
                    setCurrentProduct({...currentProduct, stock: value});
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleEditProduct}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 