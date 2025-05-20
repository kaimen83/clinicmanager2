'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toISODateString } from '@/lib/utils';

type DatabaseBackupProps = {
  title: string;
};

export default function DatabaseBackup({ title }: DatabaseBackupProps) {
  const { toast } = useToast();
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackupDatabase = async () => {
    try {
      setBackupLoading(true);
      const response = await fetch('/api/backup', {
        method: 'POST',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('데이터베이스 백업에 실패했습니다');
      }
      
      // 성공적으로 백업 파일을 받았으면 다운로드 처리
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinic_backup_${toISODateString(null)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "백업 성공",
        description: "데이터베이스 백업이 성공적으로 완료되었습니다.",
      });
    } catch (err) {
      toast({
        title: "백업 실패",
        description: err instanceof Error ? err.message : '데이터베이스 백업 중 오류가 발생했습니다',
        variant: "destructive"
      });
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <p className="mb-6 text-gray-600">데이터베이스 백업을 수행하려면 아래 버튼을 클릭하세요. 백업 파일은 자동으로 다운로드됩니다.</p>
      <Button 
        className="w-full sm:w-auto gap-2"
        onClick={handleBackupDatabase}
        disabled={backupLoading}
      >
        <HardDrive className="h-4 w-4" />
        {backupLoading ? '백업 중...' : '백업 시작'}
      </Button>
    </div>
  );
} 