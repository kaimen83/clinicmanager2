'use client';

import { useState, ChangeEvent, useRef } from 'react';
import { Button } from './ui/button';
import { FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

type ExcelImporterProps = {
  title: string;
  onImportComplete?: () => void;
};

export default function ExcelImporter({ title, onImportComplete }: ExcelImporterProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [importType, setImportType] = useState<string>('patients');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "파일 없음",
        description: "업로드할 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', importType);
    
    try {
      setFileUploading(true);
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '엑셀 파일 가져오기에 실패했습니다');
      }
      
      const result = await response.json();
      toast({
        title: "가져오기 성공",
        description: `${result.count}개의 항목이 성공적으로 가져와졌습니다.`,
      });
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 필요한 경우 다른 컴포넌트의 데이터를 새로고침할 수 있는 콜백 함수 호출
      if (typeof onImportComplete === 'function') {
        onImportComplete();
      }
    } catch (err) {
      toast({
        title: "가져오기 실패",
        description: err instanceof Error ? err.message : '엑셀 파일 가져오기 중 오류가 발생했습니다',
        variant: "destructive"
      });
    } finally {
      setFileUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <p className="mb-3 text-gray-600">엑셀 파일에서 데이터를 가져옵니다. 다음 유형의 데이터를 지원합니다:</p>
      
      <RadioGroup 
        value={importType} 
        onValueChange={setImportType}
        className="mb-6 space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="patients" id="patients" />
          <Label htmlFor="patients">환자 데이터</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="treatments" id="treatments" />
          <Label htmlFor="treatments">진료 기록</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="payments" id="payments" />
          <Label htmlFor="payments">결제 내역</Label>
        </div>
      </RadioGroup>
      
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          className="w-full sm:w-auto gap-2"
          onClick={handleFileSelect}
          disabled={fileUploading}
        >
          <FileUp className="h-4 w-4" />
          파일 선택
        </Button>
        
        {selectedFile && (
          <Button 
            className="w-full sm:w-auto"
            onClick={handleFileUpload}
            disabled={fileUploading}
          >
            {fileUploading ? '가져오는 중...' : '가져오기 시작'}
          </Button>
        )}
      </div>
      
      {selectedFile && (
        <p className="mt-4 text-sm text-gray-600">
          선택한 파일: {selectedFile.name}
        </p>
      )}
    </div>
  );
} 