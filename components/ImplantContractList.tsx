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
      {/* 컴팩트 헤더 및 필터 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">임플란트 계약 관리</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
                <Select value={searchCompany} onValueChange={setSearchCompany}>
                  <SelectTrigger className="h-9 border-gray-200 hover:bg-gray-50">
                    <SelectValue placeholder="회사" />
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
                  <SelectTrigger className="h-9 border-gray-200 hover:bg-gray-50">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="true">활성 계약</SelectItem>
                    <SelectItem value="false">비활성 계약</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => {
                  setSelectedContract(null);
                  setIsFormOpen(true);
                }}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> 계약 등록
              </Button>
            </div>
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
        <div className="space-y-3">
          {Object.entries(groupedContracts).map(([company, companyContracts]) => (
            <Card key={company} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-gray-900">{company}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {companyContracts.length}건
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[100px]">계약일</TableHead>
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">프로모션</TableHead>
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">할증률</TableHead>
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">결제방법</TableHead>
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">결제조건</TableHead>
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[80px]">상태</TableHead>
                        <TableHead className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[100px]">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-200">
                      {companyContracts.map(contract => (
                        <React.Fragment key={contract._id}>
                          <TableRow className="hover:bg-gray-50">
                            <TableCell className="px-4 py-3 text-sm text-gray-900">
                              {new Date(contract.contractDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-600">
                              {contract.promotionAmount > 0 
                                ? `${contract.promotionAmount.toLocaleString()}원` 
                                : '-'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-600">
                              {contract.markupRate > 0 ? `${contract.markupRate}%` : '-'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-600">{contract.paymentMethod || '-'}</TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-600">{contract.paymentTerms || '-'}</TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge 
                                variant={contract.isActive ? 'default' : 'secondary'}
                                className={`text-xs px-2 py-1 ${
                                  contract.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {contract.isActive ? '활성' : '비활성'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleRowExpansion(contract._id)}
                                  className="h-7 w-7 p-0 hover:bg-blue-50"
                                >
                                  {expandedRows.has(contract._id) ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setIsFormOpen(true);
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-blue-50"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(contract._id)}
                                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {expandedRows.has(contract._id) && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                                <div className="p-4 space-y-3">
                                  {contract.benefits && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="font-semibold text-sm text-gray-900 mb-2">혜택 내용</h4>
                                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                        {contract.benefits}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {contract.productPrices.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="font-semibold text-sm text-gray-900 mb-3">제품 단가 정보</h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b border-gray-200">
                                              <th className="text-left py-2 font-medium text-gray-700">제품명</th>
                                              <th className="text-left py-2 font-medium text-gray-700">규격</th>
                                              <th className="text-right py-2 font-medium text-gray-700">단가</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {contract.productPrices.map((price, index) => (
                                              <tr key={index} className="hover:bg-gray-50">
                                                <td className="py-2 text-gray-900 font-medium">{price.productName}</td>
                                                <td className="py-2 text-gray-600">{price.specification || '-'}</td>
                                                <td className="py-2 text-right font-semibold text-gray-900">
                                                  {price.price.toLocaleString()}원
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
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
                </div>
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