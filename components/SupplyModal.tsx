'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
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
import { toISODateString, cn } from '@/lib/utils';
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
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [supplies, setSupplies] = useState<SupplyType[]>([]);
  const [vendors, setVendors] = useState<VendorType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: toISODateString(initialDate),
    end: toISODateString(initialDate)
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
  }, [isOpen, selectedDate, dateRange, filterVendor, filterPaid]);

  // 날짜 변경 시 폼 데이터 업데이트
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: toISODateString(selectedDate)
    }));
    setDateRange({
      start: toISODateString(selectedDate),
      end: toISODateString(selectedDate)
    });
  }, [selectedDate]);

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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendor || !formData.amount) {
      toast.error('거래처와 금액은 필수 입력사항입니다.');
      return;
    }

    try {
      const response = await fetch('/api/supplies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          vendor: formData.vendor,
          amount: Number(formData.amount),
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
        date: toISODateString(selectedDate),
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
      const response = await fetch('/api/supplies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId,
          date: formData.date,
          vendor: formData.vendor,
          amount: Number(formData.amount),
          note: formData.note,
          isPaid: formData.isPaid
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '매입 내역 수정 실패');
      }

      toast.success('매입 내역이 수정되었습니다.');
      setEditingId(null);
      setFormData({
        date: toISODateString(selectedDate),
        vendor: '',
        amount: '',
        note: '',
        isPaid: false
      });
      setShowAddForm(false);
      loadSupplies();
    } catch (error: any) {
      console.error('매입 내역 수정 오류:', error);
      toast.error(error.message || '매입 내역 수정에 실패했습니다.');
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (!confirm('정말로 이 매입 내역을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/supplies?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '매입 내역 삭제 실패');
      }

      toast.success('매입 내역이 삭제되었습니다.');
      loadSupplies();
    } catch (error: any) {
      console.error('매입 내역 삭제 오류:', error);
      toast.error(error.message || '매입 내역 삭제에 실패했습니다.');
    }
  };

  const startEdit = (supply: SupplyType) => {
    setEditingId(supply._id);
    setFormData({
      date: toISODateString(supply.date),
      vendor: supply.vendor,
      amount: supply.amount.toString(),
      note: supply.note || '',
      isPaid: supply.isPaid
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      date: toISODateString(selectedDate),
      vendor: '',
      amount: '',
      note: '',
      isPaid: false
    });
    setShowAddForm(false);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'yyyy-MM-dd', { locale: ko });
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              매입원장
            </DialogTitle>
            
            {/* 날짜 선택 컨트롤 */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPreviousDay}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "min-w-[200px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNextDay}
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">총 매입액</p>
                    <p className="text-xl font-bold text-blue-900">
                      ₩{formatAmount(totalAmount)}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-200 rounded-full">
                    <ShoppingCart className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">결제완료</p>
                    <p className="text-xl font-bold text-green-900">
                      ₩{formatAmount(paidAmount)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-200 rounded-full">
                    <Check className="w-5 h-5 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">미결제</p>
                    <p className="text-xl font-bold text-red-900">
                      ₩{formatAmount(unpaidAmount)}
                    </p>
                  </div>
                  <div className="p-2 bg-red-200 rounded-full">
                    <X className="w-5 h-5 text-red-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 검색 및 필터 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                검색 및 필터
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">검색</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                  <Label htmlFor="filterVendor">거래처</Label>
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
                  <Label htmlFor="filterPaid">결제상태</Label>
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

                <div className="flex items-end">
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                    disabled={showAddForm}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    매입 추가
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 매입 추가/수정 폼 */}
          {showAddForm && (
            <Card className="border-blue-200 shadow-md">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg text-blue-900 flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  {editingId ? '매입 내역 수정' : '매입 내역 추가'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={editingId ? handleEditSupply : handleAddSupply} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="date">날짜 *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="vendor">거래처 *</Label>
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
                      <Label htmlFor="amount">금액 *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0"
                        required
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
                      <Label htmlFor="isPaid">결제완료</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="note">메모</Label>
                    <Textarea
                      id="note"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="메모를 입력하세요..."
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">매입 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p>로딩 중...</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">날짜</TableHead>
                        <TableHead>거래처</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>결제상태</TableHead>
                        <TableHead>메모</TableHead>
                        <TableHead className="text-center w-24">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSupplies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            매입 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSupplies.map((supply) => (
                          <TableRow key={supply._id}>
                            <TableCell>{formatDate(supply.date)}</TableCell>
                            <TableCell>{supply.vendor}</TableCell>
                            <TableCell className="text-right">₩{formatAmount(supply.amount)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                supply.isPaid 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {supply.isPaid ? '결제완료' : '미결제'}
                              </span>
                            </TableCell>
                            <TableCell>{supply.note || '-'}</TableCell>
                            <TableCell>
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
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 