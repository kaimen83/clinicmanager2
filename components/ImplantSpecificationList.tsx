'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ImplantProduct = {
  _id: string;
  category: string;
  name: string;
  specification: string;
  price: number;
  stock: number;
  usage: string;
  createdAt: string;
  updatedAt: string;
};

// Setting 타입 정의 추가
type Setting = {
  _id: string;
  type: string;
  value: string;
  order: number;
  feeRate?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type ImplantSpecificationListProps = {
  title: string;
};

export default function ImplantSpecificationList({ title }: ImplantSpecificationListProps) {
  const [products, setProducts] = useState<ImplantProduct[]>([]);
  const [fixtureOptions, setFixtureOptions] = useState<Setting[]>([]);
  const [implantOptions, setImplantOptions] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ImplantProduct | null>(null);
  
  // 신규 제품 상태
  const [newCategory, setNewCategory] = useState('fixture');
  const [newName, setNewName] = useState('');
  const [newSpecification, setNewSpecification] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newUsage, setNewUsage] = useState('원내');

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

  const resetNewProductFields = () => {
    setNewCategory('fixture');
    setNewName('');
    setNewSpecification('');
    setNewPrice(0);
    setNewUsage('원내');
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/implantProducts', {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('임플란트 규격 데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Fixture 옵션을 가져오는 함수
  const fetchFixtureOptions = async () => {
    try {
      const response = await fetch('/api/settings?type=implantManufacturer', {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Fixture 데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setFixtureOptions(data.settings || []);
    } catch (err) {
      console.error('Fixture 데이터 로드 중 오류:', err);
      toast.error('Fixture 데이터를 불러오는데 실패했습니다');
    }
  };

  // 이식재 옵션을 가져오는 함수
  const fetchImplantOptions = async () => {
    try {
      const response = await fetch('/api/settings?type=implantFixture', {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('이식재 데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setImplantOptions(data.settings || []);
    } catch (err) {
      console.error('이식재 데이터 로드 중 오류:', err);
      toast.error('이식재 데이터를 불러오는데 실패했습니다');
    }
  };

  // 카테고리 변경 핸들러
  const handleCategoryChange = (value: string) => {
    setNewCategory(value);
    setNewName(''); // 카테고리 변경 시 선택된 품명 초기화
  };

  useEffect(() => {
    fetchProducts();
    fetchFixtureOptions();
    fetchImplantOptions();
  }, []);

  const handleAddProduct = async () => {
    if (!newName.trim() || !newPrice) {
      toast.error('품명과 가격은 필수입니다');
      return;
    }

    try {
      const response = await fetch('/api/implantProducts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: newCategory,
          name: newName,
          specification: newSpecification,
          price: newPrice,
          usage: newUsage,
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '임플란트 규격을 추가하는데 실패했습니다');
      }

      // 새로 추가된 제품 데이터 가져오기
      const data = await response.json();
      // 로컬 상태 업데이트
      setProducts(prevProducts => [...prevProducts, data]);
      
      resetNewProductFields();
      setIsAddDialogOpen(false);
      toast.success('임플란트 규격이 추가되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '임플란트 규격을 추가하는데 오류가 발생했습니다');
    }
  };

  const handleEditProduct = async () => {
    if (!currentProduct || !currentProduct.name.trim()) return;

    try {
      const response = await fetch(`/api/implantProducts/${currentProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: currentProduct.category,
          name: currentProduct.name,
          specification: currentProduct.specification,
          price: currentProduct.price,
          usage: currentProduct.usage,
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '임플란트 규격을 수정하는데 실패했습니다');
      }

      // 로컬 상태 업데이트
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product._id === currentProduct._id ? currentProduct : product
        )
      );
      
      setCurrentProduct(null);
      setIsEditDialogOpen(false);
      toast.success('임플란트 규격이 수정되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '임플란트 규격을 수정하는데 오류가 발생했습니다');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/implantProducts/${id}`, {
        method: 'DELETE',
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '임플란트 규격을 삭제하는데 실패했습니다');
      }

      // 로컬 상태에서 삭제된 항목 제거
      setProducts(prevProducts => prevProducts.filter(product => product._id !== id));
      
      toast.success('임플란트 규격이 삭제되었습니다');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '임플란트 규격을 삭제하는데 오류가 발생했습니다');
    }
  };

  const openEditDialog = (product: ImplantProduct) => {
    setCurrentProduct(product);
    setIsEditDialogOpen(true);
  };

  // 수정 모달에서 카테고리 변경 핸들러 추가
  const handleEditCategoryChange = (value: string) => {
    if (currentProduct) {
      setCurrentProduct({
        ...currentProduct,
        category: value,
        name: '' // 카테고리 변경 시 선택된 품명 초기화
      });
    }
  };

  if (loading) return <div className="p-4 text-center">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  // 현재 카테고리에 맞는 옵션 반환
  const getCurrentOptions = () => {
    return newCategory === 'fixture' ? fixtureOptions : implantOptions;
  };

  // 수정 모달에서 현재 카테고리에 맞는 옵션 반환
  const getEditOptions = () => {
    return currentProduct?.category === 'fixture' ? fixtureOptions : implantOptions;
  };

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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>임플란트 규격 추가</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  카테고리
                </Label>
                <Select value={newCategory} onValueChange={(value: string) => handleCategoryChange(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixture">Fixture</SelectItem>
                    <SelectItem value="이식재">이식재</SelectItem>
                    <SelectItem value="소모품">소모품</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  품명
                </Label>
                {(newCategory === 'fixture' || newCategory === '이식재') ? (
                  <Select value={newName} onValueChange={(value: string) => setNewName(value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="품명 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCurrentOptions().map((option) => (
                        <SelectItem key={option._id} value={option.value}>
                          {option.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="col-span-3"
                  />
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="specification" className="text-right">
                  규격
                </Label>
                <Input
                  id="specification"
                  value={newSpecification}
                  onChange={(e) => setNewSpecification(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  가격
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="usage" className="text-right">
                  사용처
                </Label>
                <Select value={newUsage} onValueChange={(value: string) => setNewUsage(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="사용처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="원내">원내</SelectItem>
                    <SelectItem value="기공소">기공소</SelectItem>
                  </SelectContent>
                </Select>
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>카테고리</TableHead>
              <TableHead>품명</TableHead>
              <TableHead>규격</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>사용처</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  등록된 임플란트 규격이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.specification}</TableCell>
                  <TableCell>{product.price.toLocaleString()}원</TableCell>
                  <TableCell>{product.usage}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>임플란트 규격 수정</DialogTitle>
          </DialogHeader>
          {currentProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  카테고리
                </Label>
                <Select
                  value={currentProduct.category}
                  onValueChange={(value: string) =>
                    handleEditCategoryChange(value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixture">Fixture</SelectItem>
                    <SelectItem value="이식재">이식재</SelectItem>
                    <SelectItem value="소모품">소모품</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  품명
                </Label>
                {(currentProduct.category === 'fixture' || currentProduct.category === '이식재') ? (
                  <Select 
                    value={currentProduct.name} 
                    onValueChange={(value: string) =>
                      setCurrentProduct({ ...currentProduct, name: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="품명 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEditOptions().map((option) => (
                        <SelectItem key={option._id} value={option.value}>
                          {option.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-name"
                    value={currentProduct.name}
                    onChange={(e) =>
                      setCurrentProduct({ ...currentProduct, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-specification" className="text-right">
                  규격
                </Label>
                <Input
                  id="edit-specification"
                  value={currentProduct.specification}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      specification: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  가격
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  value={currentProduct.price}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      price: Number(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-usage" className="text-right">
                  사용처
                </Label>
                <Select
                  value={currentProduct.usage}
                  onValueChange={(value: string) =>
                    setCurrentProduct({ ...currentProduct, usage: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="사용처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="원내">원내</SelectItem>
                    <SelectItem value="기공소">기공소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleEditProduct}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 