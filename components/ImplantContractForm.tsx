'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { ImplantContract, ImplantContractFormData, ProductPrice } from '@/types/implantContract';
import { toast } from 'sonner';

interface ImplantContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: ImplantContract | null;
  onSuccess: () => void;
}

interface CompanyOption {
  _id: string;
  value: string;
}

export default function ImplantContractForm({ isOpen, onClose, contract, onSuccess }: ImplantContractFormProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [formData, setFormData] = useState<ImplantContractFormData>({
    companyName: '',
    contractDate: new Date().toISOString().split('T')[0],
    promotionAmount: 0,
    markupRate: 0,
    paymentMethod: '',
    paymentTerms: '',
    benefits: '',
    productPrices: [],
    isActive: true
  });

  // 회사 목록 가져오기
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/settings?type=implantManufacturer');
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.settings || []);
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      }
    };
    fetchCompanies();
  }, []);

  // 계약 정보로 폼 초기화
  useEffect(() => {
    if (isOpen) {
      if (contract) {
        setFormData({
          companyName: contract.companyName,
          contractDate: contract.contractDate.split('T')[0],
          promotionAmount: contract.promotionAmount,
          markupRate: contract.markupRate,
          paymentMethod: contract.paymentMethod,
          paymentTerms: contract.paymentTerms,
          benefits: contract.benefits,
          productPrices: contract.productPrices || [],
          isActive: contract.isActive
        });
      } else {
        setFormData({
          companyName: '',
          contractDate: new Date().toISOString().split('T')[0],
          promotionAmount: 0,
          markupRate: 0,
          paymentMethod: '',
          paymentTerms: '',
          benefits: '',
          productPrices: [],
          isActive: true
        });
      }
    }
  }, [contract, isOpen]);

  // 제품 단가 추가
  const addProductPrice = () => {
    setFormData(prev => ({
      ...prev,
      productPrices: [...prev.productPrices, { productName: '', specification: '', price: 0 }]
    }));
  };

  // 제품 단가 삭제
  const removeProductPrice = (index: number) => {
    setFormData(prev => ({
      ...prev,
      productPrices: prev.productPrices.filter((_, i) => i !== index)
    }));
  };

  // 제품 단가 수정
  const updateProductPrice = (index: number, field: keyof ProductPrice, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      productPrices: prev.productPrices.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contractDate) {
      toast.error('회사명과 계약일은 필수입니다.');
      return;
    }

    setLoading(true);
    try {
      const url = contract 
        ? `/api/implant-contracts/${contract._id}`
        : '/api/implant-contracts';
      
      const method = contract ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '계약 저장에 실패했습니다.');
      }

      toast.success(contract ? '계약이 수정되었습니다.' : '계약이 등록되었습니다.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error(error instanceof Error ? error.message : '계약 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? '계약 수정' : '계약 등록'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">회사명*</Label>
              <Select
                value={formData.companyName}
                onValueChange={(value) => setFormData(prev => ({ ...prev, companyName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="회사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company._id} value={company.value}>
                      {company.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractDate">계약일*</Label>
              <Input
                type="date"
                value={formData.contractDate}
                onChange={(e) => setFormData(prev => ({ ...prev, contractDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promotionAmount">프로모션 금액</Label>
              <Input
                type="text"
                placeholder="0"
                value={formData.promotionAmount === 0 ? '' : formData.promotionAmount.toLocaleString()}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  setFormData(prev => ({ ...prev, promotionAmount: Number(value) || 0 }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="markupRate">할증률 (%)</Label>
              <Input
                type="number"
                min="0"
                value={formData.markupRate}
                onChange={(e) => setFormData(prev => ({ ...prev, markupRate: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">결제방법</Label>
              <Input
                type="text"
                placeholder="현금, 카드, 계좌이체 등"
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">결제조건</Label>
              <Input
                type="text"
                placeholder="즉시결제, 월말결제 등"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">혜택</Label>
            <Textarea
              placeholder="계약에 따른 혜택 내용을 입력하세요"
              value={formData.benefits}
              onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>제품 단가</Label>
              <Button type="button" size="sm" onClick={addProductPrice}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            
            <div className="space-y-2">
              {formData.productPrices.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="제품명"
                        value={item.productName}
                        onChange={(e) => updateProductPrice(index, 'productName', e.target.value)}
                      />
                      <Input
                        placeholder="규격"
                        value={item.specification}
                        onChange={(e) => updateProductPrice(index, 'specification', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="단가"
                          value={item.price === 0 ? '' : item.price.toLocaleString()}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '');
                            updateProductPrice(index, 'price', Number(value) || 0);
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeProductPrice(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {formData.productPrices.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  제품 단가를 추가하려면 추가 버튼을 클릭하세요
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="isActive">활성 계약</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}