'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  Package,
  ChevronDown,
  ChevronUp,
  Search 
} from 'lucide-react';
import { ImplantContract } from '@/types/implantContract';
import ImplantContractForm from './ImplantContractForm';
import { toast } from 'sonner';

interface CompanyOption {
  _id: string;
  value: string;
}

export default function ImplantContractList() {
  const [contracts, setContracts] = useState<ImplantContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  
  // 필터 상태
  const [searchCompany, setSearchCompany] = useState('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  // 모달 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ImplantContract | null>(null);
  
  // 확장된 행 상태 (제품 단가 보기)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  // 계약 목록 가져오기
  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchCompany && searchCompany !== 'all') params.append('companyName', searchCompany);
      if (filterActive !== 'all') params.append('isActive', filterActive);

      const response = await fetch(`/api/implant-contracts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch contracts');
      
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('계약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [searchCompany, filterActive]);

  // 계약 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 계약을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/implant-contracts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete contract');

      toast.success('계약이 삭제되었습니다.');
      fetchContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('계약 삭제에 실패했습니다.');
    }
  };

  // 행 확장 토글
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // 계약별 그룹화
  const groupedContracts = contracts.reduce((acc, contract) => {
    const company = contract.companyName;
    if (!acc[company]) {
      acc[company] = [];
    }
    acc[company].push(contract);
    return acc;
  }, {} as Record<string, ImplantContract[]>);

  return (
    <div className="space-y-4">
      {/* 헤더 및 필터 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              임플란트 계약 관리
            </CardTitle>
            <Button onClick={() => {
              setSelectedContract(null);
              setIsFormOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-1" /> 계약 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={searchCompany} onValueChange={setSearchCompany}>
              <SelectTrigger>
                <SelectValue placeholder="전체 회사" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 회사</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company._id} value={company.value}>
                    {company.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="true">활성 계약</SelectItem>
                <SelectItem value="false">비활성 계약</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 계약 목록 */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">로딩 중...</p>
          </CardContent>
        </Card>
      ) : contracts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 계약이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedContracts).map(([company, companyContracts]) => (
            <Card key={company} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{company}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">계약일</TableHead>
                      <TableHead>프로모션</TableHead>
                      <TableHead>할증률</TableHead>
                      <TableHead>결제방법</TableHead>
                      <TableHead>결제조건</TableHead>
                      <TableHead className="w-[100px]">상태</TableHead>
                      <TableHead className="w-[120px]">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyContracts.map(contract => (
                      <React.Fragment key={contract._id}>
                        <TableRow>
                          <TableCell>
                            {new Date(contract.contractDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {contract.promotionAmount > 0 
                              ? `${contract.promotionAmount.toLocaleString()}원` 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {contract.markupRate > 0 ? `${contract.markupRate}%` : '-'}
                          </TableCell>
                          <TableCell>{contract.paymentMethod || '-'}</TableCell>
                          <TableCell>{contract.paymentTerms || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={contract.isActive ? 'default' : 'secondary'}>
                              {contract.isActive ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleRowExpansion(contract._id)}
                              >
                                {expandedRows.has(contract._id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(contract._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {expandedRows.has(contract._id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-gray-50">
                              <div className="p-4 space-y-4">
                                {contract.benefits && (
                                  <div>
                                    <h4 className="font-medium mb-1">혜택</h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                      {contract.benefits}
                                    </p>
                                  </div>
                                )}
                                
                                {contract.productPrices.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">제품 단가</h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>제품명</TableHead>
                                          <TableHead>규격</TableHead>
                                          <TableHead className="text-right">단가</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {contract.productPrices.map((price, index) => (
                                          <TableRow key={index}>
                                            <TableCell>{price.productName}</TableCell>
                                            <TableCell>{price.specification || '-'}</TableCell>
                                            <TableCell className="text-right">
                                              {price.price.toLocaleString()}원
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 계약 등록/수정 폼 */}
      <ImplantContractForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onSuccess={fetchContracts}
      />
    </div>
  );
}