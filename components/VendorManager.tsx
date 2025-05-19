'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from './ui/dialog';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Label } from './ui/label';
import { VendorType } from '@/lib/models/Vendor';

type VendorManagerProps = {
  title: string;
};

export default function VendorManager({ title }: VendorManagerProps) {
  const [vendors, setVendors] = useState<VendorType[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentVendor, setCurrentVendor] = useState<VendorType | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newBusinessNumber, setNewBusinessNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 데이터 가져오기
  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/vendors?onlyActive=true', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '거래처 정보를 가져오는데 실패했습니다');
      }
      
      const data = await response.json();
      setVendors(data);
      setFilteredVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '거래처 목록을 가져오는데 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchVendors();
  }, []);

  // 검색 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(lowercasedSearch) || 
      (vendor.businessNumber && vendor.businessNumber.includes(lowercasedSearch)) ||
      (vendor.phoneNumber && vendor.phoneNumber.includes(lowercasedSearch))
    );
    
    setFilteredVendors(filtered);
  }, [searchTerm, vendors]);

  // 다이얼로그 상태 관리
  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setNewName('');
    setNewBusinessNumber('');
    setNewPhoneNumber('');
    setCurrentVendor(null);
  };

  // 거래처 추가
  const handleAddVendor = async () => {
    if (!newName.trim()) return;

    try {
      const payload = {
        name: newName.trim(),
        businessNumber: newBusinessNumber.trim() || null,
        phoneNumber: newPhoneNumber.trim() || null
      };

      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '거래처를 추가하는데 실패했습니다');
      }

      // 새로 추가된 거래처 데이터 가져오기
      const newVendor = await response.json();
      
      // 로컬 상태 업데이트
      setVendors(prevVendors => [...prevVendors, newVendor]);
      setFilteredVendors(prevFilteredVendors => [...prevFilteredVendors, newVendor]);
      
      resetForm();
      setIsAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '거래처를 추가하는데 오류가 발생했습니다');
    }
  };

  // 거래처 수정
  const handleEditVendor = async () => {
    if (!currentVendor || !newName.trim()) return;

    try {
      const payload = {
        id: currentVendor._id,
        name: newName.trim(),
        businessNumber: newBusinessNumber.trim() || null,
        phoneNumber: newPhoneNumber.trim() || null
      };

      const response = await fetch('/api/vendors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '거래처를 수정하는데 실패했습니다');
      }

      // 수정된 거래처 객체 생성
      const updatedVendor = {
        ...currentVendor,
        name: newName.trim(),
        businessNumber: newBusinessNumber.trim() || null,
        phoneNumber: newPhoneNumber.trim() || null
      };
      
      // 로컬 상태 업데이트
      setVendors(prevVendors => 
        prevVendors.map(vendor => 
          vendor._id === currentVendor._id ? updatedVendor : vendor
        )
      );
      
      setFilteredVendors(prevFilteredVendors => 
        prevFilteredVendors.map(vendor => 
          vendor._id === currentVendor._id ? updatedVendor : vendor
        )
      );
      
      resetForm();
      setIsEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '거래처를 수정하는데 오류가 발생했습니다');
    }
  };

  // 거래처 비활성화 (삭제)
  const handleDeleteVendor = async (id: string) => {
    if (!confirm('정말로 이 거래처를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/vendors?id=${id}`, {
        method: 'DELETE',
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '거래처를 삭제하는데 실패했습니다');
      }

      // 로컬 상태에서 삭제된 거래처 제거
      setVendors(prevVendors => prevVendors.filter(vendor => vendor._id !== id));
      setFilteredVendors(prevFilteredVendors => prevFilteredVendors.filter(vendor => vendor._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '거래처를 삭제하는데 오류가 발생했습니다');
    }
  };

  const openEditDialog = (vendor: VendorType) => {
    setCurrentVendor(vendor);
    setNewName(vendor.name);
    setNewBusinessNumber(vendor.businessNumber || '');
    setNewPhoneNumber(vendor.phoneNumber || '');
    handleEditDialogChange(true);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title} 추가</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  상호명*
                </Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                  className="col-span-3"
                  placeholder="상호명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="businessNumber" className="text-right">
                  사업자번호
                </Label>
                <Input
                  id="businessNumber"
                  value={newBusinessNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewBusinessNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="예: 123-45-67890"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phoneNumber" className="text-right">
                  전화번호
                </Label>
                <Input
                  id="phoneNumber"
                  value={newPhoneNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPhoneNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="예: 02-1234-5678"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleAddVendor}>추가</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="거래처 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상호명</TableHead>
            <TableHead>사업자번호</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredVendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                등록된 거래처가 없습니다
              </TableCell>
            </TableRow>
          ) : (
            filteredVendors.map((vendor) => (
              <TableRow key={vendor._id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>{vendor.businessNumber || '-'}</TableCell>
                <TableCell>{vendor.phoneNumber || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(vendor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteVendor(vendor._id)}
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

      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title} 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                상호명*
              </Label>
              <Input
                id="edit-name"
                value={newName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-businessNumber" className="text-right">
                사업자번호
              </Label>
              <Input
                id="edit-businessNumber"
                value={newBusinessNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewBusinessNumber(e.target.value)}
                className="col-span-3"
                placeholder="예: 123-45-67890"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phoneNumber" className="text-right">
                전화번호
              </Label>
              <Input
                id="edit-phoneNumber"
                value={newPhoneNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPhoneNumber(e.target.value)}
                className="col-span-3"
                placeholder="예: 02-1234-5678"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleEditVendor}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 