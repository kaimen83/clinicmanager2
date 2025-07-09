'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Patient {
  _id: string;
  chartNumber: string;
  name: string;
  visitPath: string;
  createdAt: string;
}

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelect: (chartNumber: string) => void;
}

export default function PatientSearchModal({ isOpen, onClose, onPatientSelect }: PatientSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 검색 실행
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/patients?query=${encodeURIComponent(searchQuery.trim())}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('환자 검색 오류:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // 엔터키로 검색
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 환자 선택
  const handlePatientClick = (chartNumber: string) => {
    onPatientSelect(chartNumber);
    onClose();
  };

  // 모달 초기화
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setPatients([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            환자 검색
          </DialogTitle>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="flex gap-2">
          <Input
            placeholder="차트번호 또는 환자명을 입력하세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* 검색 결과 */}
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : hasSearched ? (
            patients.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <p className="text-sm text-muted-foreground mb-3">
                  {patients.length}명의 환자를 찾았습니다.
                </p>
                {patients.map((patient) => (
                  <div
                    key={patient._id}
                    onClick={() => handlePatientClick(patient.chartNumber)}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{patient.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {patient.chartNumber}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{patient.visitPath}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        등록일: {format(new Date(patient.createdAt), 'yyyy-MM-dd')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>검색 결과가 없습니다.</p>
                <p className="text-sm">다른 검색어를 시도해보세요.</p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>차트번호 또는 환자명으로 검색하세요.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}