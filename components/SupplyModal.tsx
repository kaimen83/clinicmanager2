'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


import { toast } from 'sonner';
import { toISODateString, cn, getCurrentKstDate, createNewDate } from '@/lib/utils';
import { SupplyType } from '@/lib/models/Supply';
import { VendorType } from '@/lib/models/Vendor';
import { 
  Trash2, 
  Edit, 
  Plus, 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Save,
  X,
  Check,
  ShoppingCart,
  Filter
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
}

interface FormData {
  date: string;
  vendor: string;
  amount: string;
  note: string;
  isPaid: boolean;
}

export default function SupplyModal({ isOpen, onClose, date: initialDate }: Props) {
  const [supplies, setSupplies] = useState<SupplyType[]>([]);
  const [vendors, setVendors] = useState<VendorType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  
  // 날짜 범위 필터링 (reference 파일 참고)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = getCurrentKstDate();
    const oneMonthAgo = subMonths(today, 1);
    return {
      start: toISODateString(oneMonthAgo),
      end: toISODateString(today)
    };
  });

  const [formData, setFormData] = useState<FormData>({
    date: toISODateString(initialDate),
    vendor: '',
    amount: '',
    note: '',
    isPaid: false
  });

  // 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadSupplies();
      loadVendors();
    }
  }, [isOpen, dateRange, filterVendor, filterPaid]);

  const loadSupplies = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        dateStart: dateRange.start,
        dateEnd: dateRange.end
      });

      if (filterVendor && filterVendor !== 'all') {
        params.append('vendor', filterVendor);
      }

      if (filterPaid !== 'all') {
        params.append('isPaid', filterPaid);
      }

      const response = await fetch(`/api/supplies?${params}`);
      if (!response.ok) {
        throw new Error('매입 내역 조회 실패');
      }

      const data = await response.json();
      setSupplies(data);
    } catch (error) {
      console.error('매입 내역 로드 오류:', error);
      toast.error('매입 내역을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/vendors?onlyActive=true');
      if (!response.ok) {
        throw new Error('거래처 조회 실패');
      }

      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('거래처 로드 오류:', error);
      toast.error('거래처 목록을 불러오는데 실패했습니다.');
    }
  };

  // 금액 입력 포맷팅 (reference 파일 참고)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // 마이너스 부호는 맨 앞에만 허용하고, 나머지는 숫자만 허용
    value = value.replace(/[^\d-]|(?!^)-/g, '');
    
    if (value) {
      const isNegative = value.startsWith('-');
      const numStr = value.replace(/[^\d]/g, '');
      if (numStr) {
        const num = parseInt(numStr, 10);
        const formattedValue = (isNegative ? '-' : '') + num.toLocaleString();
        setFormData({ ...formData, amount: formattedValue });
      } else {
        setFormData({ ...formData, amount: isNegative ? '-' : '' });
      }
    } else {
      setFormData({ ...formData, amount: '' });
    }
  };

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendor || !formData.amount) {
      toast.error('거래처와 금액은 필수 입력사항입니다.');
      return;
    }

    try {
      // 천단위 구분자 제거하고 숫자로 변환
      const amountStr = formData.amount;
      const isNegative = amountStr.startsWith('-');
      const amount = Number(amountStr.replace(/[^\d]/g, ''));
      
      const response = await fetch('/api/supplies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          vendor: formData.vendor,
          amount: isNegative ? -amount : amount,
          note: formData.note,
          isPaid: formData.isPaid
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '매입 내역 등록 실패');
      }

      toast.success('매입 내역이 등록되었습니다.');
      setFormData({
        date: toISODateString(getCurrentKstDate()),
        vendor: '',
        amount: '',
        note: '',
        isPaid: false
      });
      setShowAddForm(false);
      loadSupplies();
    } catch (error: any) {
      console.error('매입 내역 등록 오류:', error);
      toast.error(error.message || '매입 내역 등록에 실패했습니다.');
    }
  };

  const handleEditSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId || !formData.vendor || !formData.amount) {
      toast.error('거래처와 금액은 필수 입력사항입니다.');
      return;
    }

    try {
      // 천단위 구분자 제거하고 숫자로 변환
      const amountStr = formData.amount;
      const isNegative = amountStr.startsWith('-');
      const amount = Number(amountStr.replace(/[^\d]/g, ''));

      const response = await fetch(`/api/supplies/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          vendor: formData.vendor,
          amount: isNegative ? -amount : amount,
          note: formData.note,
          isPaid: formData.isPaid
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '매입 내역 수정 실패');
      }

      toast.success('매입 내역이 수정되었습니다.');
      cancelEdit();
      loadSupplies();
    } catch (error: any) {
      console.error('매입 내역 수정 오류:', error);
      toast.error(error.message || '매입 내역 수정에 실패했습니다.');
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/supplies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 실패');
      }

      toast.success('매입 내역이 삭제되었습니다.');
      loadSupplies();
    } catch (error) {
      console.error('삭제 오류:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const startEdit = (supply: SupplyType) => {
    setEditingId(supply._id);
    setFormData({
      date: toISODateString(new Date(supply.date)),
      vendor: supply.vendor,
      amount: supply.amount.toLocaleString(),
      note: supply.note || '',
      isPaid: supply.isPaid
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      date: toISODateString(getCurrentKstDate()),
      vendor: '',
      amount: '',
      note: '',
      isPaid: false
    });
  };

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString();
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'yyyy.MM.dd', { locale: ko });
  };

  // 검색 및 필터링된 매입 내역
  const filteredSupplies = supplies.filter(supply => {
    const matchesSearch = searchTerm === '' || 
      supply.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supply.note && supply.note.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  // 통계 계산
  const totalAmount = filteredSupplies.reduce((sum, supply) => sum + supply.amount, 0);
  const paidAmount = filteredSupplies.filter(s => s.isPaid).reduce((sum, supply) => sum + supply.amount, 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            매입원장
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">총 매입액</p>
                    <p className="text-xl font-bold text-foreground">
                      ₩{formatAmount(totalAmount)}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">결제완료</p>
                    <p className="text-xl font-bold text-green-900">
                      ₩{formatAmount(paidAmount)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">미결제</p>
                    <p className="text-xl font-bold text-red-900">
                      ₩{formatAmount(unpaidAmount)}
                    </p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-full">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 날짜 필터 및 검색 */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" />
                필터 및 검색
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 날짜 범위 필터 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm font-medium">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate" className="text-sm font-medium">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="search" className="text-sm font-medium">검색</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="거래처명, 메모 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="filterVendor" className="text-sm font-medium">거래처</Label>
                  <Select value={filterVendor} onValueChange={setFilterVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder="전체 거래처" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 거래처</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor._id} value={vendor.name}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filterPaid" className="text-sm font-medium">결제상태</Label>
                  <Select value={filterPaid} onValueChange={setFilterPaid}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="true">결제완료</SelectItem>
                      <SelectItem value="false">미결제</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowAddForm(true)}
                  disabled={showAddForm}
                  className="shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  매입 추가
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 매입 추가/수정 폼 */}
          {showAddForm && (
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-base font-medium text-foreground flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  {editingId ? '매입 내역 수정' : '매입 내역 추가'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={editingId ? handleEditSupply : handleAddSupply} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="date" className="text-sm font-medium">
                        날짜 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="vendor" className="text-sm font-medium">
                        거래처 <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.vendor} 
                        onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="거래처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor._id} value={vendor.name}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium">
                        금액 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="amount"
                        type="text"
                        value={formData.amount}
                        onChange={handleAmountChange}
                        placeholder="0"
                        required
                        className="text-right"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="isPaid"
                        checked={formData.isPaid}
                        onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="isPaid" className="text-sm">결제완료</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="note" className="text-sm font-medium">메모</Label>
                    <Textarea
                      id="note"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="메모를 입력하세요..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <Button type="submit" className="shadow-sm">
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? '수정' : '저장'}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      취소
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 매입 내역 테이블 */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">
                매입 내역 ({filteredSupplies.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">로딩 중...</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  {/* 헤더 */}
                  <div className="bg-muted/50 border-b grid grid-cols-6 gap-4 p-3 font-medium text-sm text-foreground">
                    <div>날짜</div>
                    <div>거래처</div>
                    <div className="text-right">금액</div>
                    <div className="text-center">결제여부</div>
                    <div>비고</div>
                    <div className="text-center">작업</div>
                  </div>
                  
                  {filteredSupplies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      매입 내역이 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredSupplies
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((supply) => (
                          <div key={supply._id} className="grid grid-cols-6 gap-4 p-3 hover:bg-muted/50 transition-colors">
                            <div className="text-sm">{formatDate(supply.date)}</div>
                            <div className="text-sm font-medium">{supply.vendor}</div>
                            <div className="text-sm text-right font-mono">
                              {supply.amount < 0 ? '-' : ''}₩{formatAmount(supply.amount)}
                            </div>
                            <div className="text-center">
                              <input
                                type="checkbox"
                                checked={supply.isPaid}
                                disabled
                                className="opacity-60 rounded"
                              />
                            </div>
                            <div className="text-sm text-muted-foreground truncate" title={supply.note || ''}>
                              {supply.note || '-'}
                            </div>
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(supply)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteSupply(supply._id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 