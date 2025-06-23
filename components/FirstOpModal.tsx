'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { IImplantItem, IFixtureItem } from '@/lib/models/FirstOp';

// 거래 데이터 타입 정의
interface TransactionData {
  chartNumber: string;
  patientName: string;
  date: string;
  doctor: string;
}

// 임플란트 행 타입
interface ImplantRow {
  id: string;
  manufacturer: string;
  specification: string;
  quantity: number;
}

// 이식재 행 타입
interface FixtureRow {
  id: string;
  type: string;
  specification: string;
  quantity: number;
}

// 컴포넌트 Props
interface FirstOpModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionData: TransactionData;
}

export default function FirstOpModal({ isOpen, onClose, transactionData }: FirstOpModalProps) {
  // 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [fixtures, setFixtures] = useState<string[]>([]);
  const [implantRows, setImplantRows] = useState<ImplantRow[]>([]);
  const [fixtureRows, setFixtureRows] = useState<FixtureRow[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, string[]>>({});

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // 초기 데이터 로드
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // 제조사 목록 가져오기
      const manufacturersResponse = await fetch('/api/implant-products/manufacturers');
      if (!manufacturersResponse.ok) {
        throw new Error('제조사 목록을 가져오는데 실패했습니다.');
      }
      const { manufacturers: manufacturersList } = await manufacturersResponse.json();
      setManufacturers(manufacturersList || []);

      // 이식재 목록 가져오기
      const fixturesResponse = await fetch('/api/implant-products/fixtures');
      if (!fixturesResponse.ok) {
        throw new Error('이식재 목록을 가져오는데 실패했습니다.');
      }
      const { fixtures: fixturesList } = await fixturesResponse.json();
      setFixtures(fixturesList || []);

      // 초기 행 추가
      addImplantRow();
      addFixtureRow();
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
      toast({
        title: "데이터 로드 실패",
        description: "제조사 및 이식재 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 임플란트 행 추가
  const addImplantRow = () => {
    const newRow: ImplantRow = {
      id: `implant-${Date.now()}-${Math.random()}`,
      manufacturer: '',
      specification: '',
      quantity: 0
    };
    setImplantRows(prev => [...prev, newRow]);
  };

  // 이식재 행 추가
  const addFixtureRow = () => {
    const newRow: FixtureRow = {
      id: `fixture-${Date.now()}-${Math.random()}`,
      type: '',
      specification: '',
      quantity: 0
    };
    setFixtureRows(prev => [...prev, newRow]);
  };

  // 임플란트 행 제거
  const removeImplantRow = (id: string) => {
    setImplantRows(prev => prev.filter(row => row.id !== id));
  };

  // 이식재 행 제거
  const removeFixtureRow = (id: string) => {
    setFixtureRows(prev => prev.filter(row => row.id !== id));
  };

  // 임플란트 행 업데이트
  const updateImplantRow = (id: string, field: keyof ImplantRow, value: string | number) => {
    setImplantRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // 이식재 행 업데이트
  const updateFixtureRow = (id: string, field: keyof FixtureRow, value: string | number) => {
    setFixtureRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // 제조사 변경 시 규격 로드
  const handleManufacturerChange = async (id: string, manufacturer: string) => {
    updateImplantRow(id, 'manufacturer', manufacturer);
    updateImplantRow(id, 'specification', ''); // 규격 초기화

    if (manufacturer) {
      try {
        const response = await fetch(`/api/implant-products/specifications/${manufacturer}`);
        if (response.ok) {
          const specs = await response.json();
          setSpecifications(prev => ({
            ...prev,
            [manufacturer]: specs
          }));
        }
      } catch (error) {
        console.error('규격 목록 로드 실패:', error);
      }
    }
  };

  // 이식재 타입 변경 시 규격 로드
  const handleFixtureTypeChange = async (id: string, type: string) => {
    updateFixtureRow(id, 'type', type);
    updateFixtureRow(id, 'specification', ''); // 규격 초기화

    if (type) {
      try {
        // 전체 임플란트 제품 목록에서 해당 이식재 정보 조회
        const response = await fetch('/api/implantProducts');
        if (response.ok) {
          const products = await response.json();
          const selectedFixtures = products.filter((p: any) => 
            p.category === '이식재' && p.name === type
          );

          const specs = selectedFixtures
            .filter((p: any) => p.specification)
            .map((p: any) => p.specification);

          setSpecifications(prev => ({
            ...prev,
            [type]: specs
          }));
        }
      } catch (error) {
        console.error('이식재 규격 목록 로드 실패:', error);
      }
    }
  };

  // 폼 제출 처리
  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // 유효한 임플란트 데이터만 필터링
      const validImplants = implantRows.filter(row => 
        row.manufacturer && row.quantity > 0
      );

      // 유효한 이식재 데이터만 필터링
      const validFixtures = fixtureRows.filter(row => 
        row.type && row.quantity > 0
      );

      // 최소 하나의 데이터는 있어야 함
      if (validImplants.length === 0 && validFixtures.length === 0) {
        throw new Error('임플란트 또는 이식재 정보 중 최소 하나는 입력해야 합니다.');
      }

      // 각 제품에 대해 재고 출고 처리
      for (const implant of validImplants) {
        await processImplantStockOut(implant);
      }

      for (const fixture of validFixtures) {
        await processFixtureStockOut(fixture);
      }

      // 1st OP 정보 저장
      const firstOpData = {
        date: transactionData.date,
        chartNumber: transactionData.chartNumber,
        patientName: transactionData.patientName,
        doctor: transactionData.doctor,
        implants: validImplants.map(item => ({
          manufacturer: item.manufacturer,
          specification: item.specification || undefined,
          quantity: item.quantity
        })),
        fixtures: validFixtures.map(item => ({
          type: item.type,
          specification: item.specification || undefined,
          quantity: item.quantity
        }))
      };

      const response = await fetch('/api/first-op', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firstOpData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '1st OP 정보 저장에 실패했습니다.');
      }

      toast({
        title: "저장 완료",
        description: "1st OP 정보가 성공적으로 저장되었습니다.",
      });

      onClose();
    } catch (error) {
      console.error('1st OP 저장 실패:', error);
      toast({
        title: "저장 실패",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 임플란트 재고 출고 처리
  const processImplantStockOut = async (implant: ImplantRow) => {
    try {
      // 제품 ID 조회
      const response = await fetch('/api/implantProducts');
      const products = await response.json();
      const product = products.find((p: any) => 
        p.category === 'fixture' && 
        p.name === implant.manufacturer && 
        (!implant.specification || p.specification === implant.specification)
      );

      if (!product) {
        throw new Error(`임플란트 제품을 찾을 수 없습니다: ${implant.manufacturer}${implant.specification ? ` ${implant.specification}` : ''}`);
      }

      // 재고 출고 처리
      const stockOutResponse = await fetch(`/api/implantProducts/${product._id}/stock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: implant.quantity,
          chartNumber: transactionData.chartNumber,
          patientName: transactionData.patientName,
          doctor: transactionData.doctor,
          outReason: '환자사용',
          notes: '1st OP 사용',
          date: transactionData.date
        })
      });

      if (!stockOutResponse.ok) {
        const errorData = await stockOutResponse.json();
        throw new Error(errorData.message || '임플란트 출고 처리 실패');
      }
    } catch (error) {
      throw new Error(`임플란트 출고 처리 중 오류: ${(error as Error).message}`);
    }
  };

  // 이식재 재고 출고 처리
  const processFixtureStockOut = async (fixture: FixtureRow) => {
    try {
      // 제품 ID 조회
      const response = await fetch('/api/implantProducts');
      const products = await response.json();
      const product = products.find((p: any) => 
        p.category === '이식재' && 
        p.name === fixture.type && 
        (!fixture.specification || p.specification === fixture.specification)
      );

      if (!product) {
        throw new Error(`이식재 제품을 찾을 수 없습니다: ${fixture.type}${fixture.specification ? ` ${fixture.specification}` : ''}`);
      }

      // 재고 출고 처리
      const stockOutResponse = await fetch(`/api/implantProducts/${product._id}/stock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: fixture.quantity,
          chartNumber: transactionData.chartNumber,
          patientName: transactionData.patientName,
          doctor: transactionData.doctor,
          outReason: '환자사용',
          notes: '1st OP 사용',
          date: transactionData.date
        })
      });

      if (!stockOutResponse.ok) {
        const errorData = await stockOutResponse.json();
        throw new Error(errorData.message || '이식재 출고 처리 실패');
      }
    } catch (error) {
      throw new Error(`이식재 출고 처리 중 오류: ${(error as Error).message}`);
    }
  };

  // 모달 닫기 처리
  const handleClose = () => {
    // 상태 초기화
    setImplantRows([]);
    setFixtureRows([]);
    setSpecifications({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
              <Plus className="w-4 h-4 text-red-600" />
            </div>
            1st OP 정보
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>날짜</Label>
              <Input value={transactionData.date} readOnly className="bg-gray-50" />
            </div>
            <div>
              <Label>차트번호</Label>
              <Input value={transactionData.chartNumber} readOnly className="bg-gray-50" />
            </div>
            <div>
              <Label>환자명</Label>
              <Input value={transactionData.patientName} readOnly className="bg-gray-50" />
            </div>
            <div>
              <Label>진료의사</Label>
              <Input value={transactionData.doctor} readOnly className="bg-gray-50" />
            </div>
          </div>

          {/* 임플란트 섹션 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">임플란트 사용량</CardTitle>
                <Button type="button" onClick={addImplantRow} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  임플란트 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {implantRows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm text-gray-600">제조사</Label>
                    <Select 
                      value={row.manufacturer} 
                      onValueChange={(value) => handleManufacturerChange(row.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="제조사 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {manufacturers.map(manufacturer => (
                          <SelectItem key={manufacturer} value={manufacturer}>
                            {manufacturer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-sm text-gray-600">규격</Label>
                    <Select 
                      value={row.specification} 
                      onValueChange={(value) => updateImplantRow(row.id, 'specification', value)}
                      disabled={!row.manufacturer || !specifications[row.manufacturer]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="규격 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {specifications[row.manufacturer]?.map(spec => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-24">
                    <Label className="text-sm text-gray-600">수량</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={row.quantity || ''} 
                      onChange={(e) => updateImplantRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="수량"
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => removeImplantRow(row.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 이식재 섹션 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">이식재 사용량</CardTitle>
                <Button type="button" onClick={addFixtureRow} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  이식재 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fixtureRows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm text-gray-600">이식재</Label>
                    <Select 
                      value={row.type} 
                      onValueChange={(value) => handleFixtureTypeChange(row.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="이식재 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {fixtures.map(fixture => (
                          <SelectItem key={fixture} value={fixture}>
                            {fixture}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-sm text-gray-600">규격</Label>
                    <Select 
                      value={row.specification} 
                      onValueChange={(value) => updateFixtureRow(row.id, 'specification', value)}
                      disabled={!row.type || !specifications[row.type]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="규격 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {specifications[row.type]?.map(spec => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-24">
                    <Label className="text-sm text-gray-600">수량</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={row.quantity || ''} 
                      onChange={(e) => updateFixtureRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="수량"
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => removeFixtureRow(row.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? '처리 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 