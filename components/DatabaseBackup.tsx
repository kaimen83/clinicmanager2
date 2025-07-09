'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { HardDrive, Clock, Download, AlertCircle, CheckCircle, Calendar, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DatabaseBackupProps = {
  title: string;
};

type BackupFile = {
  name: string;
  path: string;
  size: number;
  created: string;
  modified: string;
};

type ScheduleStatus = {
  isScheduled: boolean;
  isBackupInProgress: boolean;
  backupDir: string;
};

type BackupLog = {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
};

export default function DatabaseBackup({ title }: DatabaseBackupProps) {
  const { toast } = useToast();
  const [backupLoading, setBackupLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [showBackupProgress, setShowBackupProgress] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    loadBackupFiles();
    loadScheduleStatus();
  }, []);

  // 백업 파일 목록 로드
  const loadBackupFiles = async () => {
    try {
      const response = await fetch('/api/backup', {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackupFiles(data.files || []);
      }
    } catch (error) {
      console.error('백업 파일 목록 로드 실패:', error);
    }
  };

  // 스케줄 상태 로드
  const loadScheduleStatus = async () => {
    try {
      const response = await fetch('/api/backup/schedule', {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setScheduleStatus(data);
        setAutoBackupEnabled(data.isScheduled);
      }
    } catch (error) {
      console.error('스케줄 상태 로드 실패:', error);
    }
  };

  // 수동 백업 실행 - SSE로 실시간 진행 상황 표시
  const handleManualBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupProgress(0);
      setBackupLogs([]);
      setShowBackupProgress(true);
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('백업 요청에 실패했습니다');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('응답 스트림을 읽을 수 없습니다');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 마지막 줄은 불완전할 수 있으므로 버퍼에 보관
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'status') {
                setBackupProgress(data.progress || 0);
                setBackupLogs(prev => [...prev, {
                  timestamp: new Date().toLocaleTimeString(),
                  message: data.message,
                  type: 'info'
                }]);
              } else if (data.type === 'success') {
                setBackupProgress(100);
                setBackupLogs(prev => [...prev, {
                  timestamp: new Date().toLocaleTimeString(),
                  message: data.message,
                  type: 'success'
                }]);
                
                toast({
                  title: "백업 성공",
                  description: `백업이 완료되었습니다. (${(data.fileSize / 1024 / 1024).toFixed(2)}MB)`,
                });
                
                // 백업 파일 목록 새로고침
                await loadBackupFiles();
                
                // 3초 후 진행창 숨기기
                setTimeout(() => {
                  setShowBackupProgress(false);
                }, 3000);
                
              } else if (data.type === 'error') {
                setBackupLogs(prev => [...prev, {
                  timestamp: new Date().toLocaleTimeString(),
                  message: data.message,
                  type: 'error'
                }]);
                
                toast({
                  title: "백업 실패",
                  description: data.message,
                  variant: "destructive"
                });
              }
            } catch (parseError) {
              console.error('SSE 데이터 파싱 오류:', parseError);
            }
          }
        }
      }
    } catch (err) {
      toast({
        title: "백업 실패",
        description: err instanceof Error ? err.message : '백업 중 오류가 발생했습니다',
        variant: "destructive"
      });
      
      setBackupLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        message: err instanceof Error ? err.message : '백업 중 오류가 발생했습니다',
        type: 'error'
      }]);
    } finally {
      setBackupLoading(false);
    }
  };

  // 자동 백업 스케줄 토글
  const handleScheduleToggle = async (enabled: boolean) => {
    const previousState = autoBackupEnabled; // 이전 상태 저장
    
    try {
      setScheduleLoading(true);
      
      const response = await fetch('/api/backup/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: enabled ? 'start' : 'stop',
          schedule: '0 2 * * *' // 매일 새벽 2시
        }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '스케줄 설정에 실패했습니다');
      }
      
      const result = await response.json();
      console.log('스케줄 토글 응답:', result); // 디버깅용
      
      // API 응답의 실제 상태를 사용
      const actualState = result.isScheduled === true;
      setAutoBackupEnabled(actualState);
      
      toast({
        title: actualState ? "자동 백업 시작" : "자동 백업 중지",
        description: result.message,
      });
      
      // 스케줄 상태 새로고침
      await loadScheduleStatus();
    } catch (err) {
      console.error('스케줄 토글 에러:', err); // 디버깅용
      
      // 에러 발생 시 이전 상태로 복원
      setAutoBackupEnabled(previousState);
      
      toast({
        title: "스케줄 설정 실패",
        description: err instanceof Error ? err.message : '스케줄 설정 중 오류가 발생했습니다',
        variant: "destructive"
      });
    } finally {
      setScheduleLoading(false);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">
          hospital_accounting 데이터베이스의 백업을 수행하고 자동 백업을 설정할 수 있습니다.
        </p>
      </div>

      {/* 수동 백업 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            수동 백업
          </CardTitle>
          <CardDescription>
            즉시 hospital_accounting 데이터베이스를 백업합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleManualBackup}
            disabled={backupLoading || (scheduleStatus?.isBackupInProgress ?? false)}
            className="w-full sm:w-auto gap-2"
          >
            <HardDrive className="h-4 w-4" />
            {backupLoading ? '백업 중...' : '백업 시작'}
          </Button>
          
          {scheduleStatus?.isBackupInProgress && (
            <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              다른 백업이 진행 중입니다.
            </div>
          )}

          {/* 백업 진행 상황 표시 */}
          {showBackupProgress && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">백업 진행 상황</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBackupProgress(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>진행률</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <Progress value={backupProgress} className="w-full" />
                </div>
                
                <div className="max-h-32 overflow-y-auto">
                  <div className="space-y-1">
                    {backupLogs.map((log, index) => (
                      <div key={index} className="text-xs flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">{log.timestamp}</span>
                        <span className={
                          log.type === 'error' ? 'text-red-600' :
                          log.type === 'success' ? 'text-green-600' :
                          'text-gray-700'
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 자동 백업 스케줄 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            자동 백업 스케줄
          </CardTitle>
          <CardDescription>
            매일 새벽 2시에 자동으로 백업을 수행합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={autoBackupEnabled}
                onCheckedChange={handleScheduleToggle}
                disabled={scheduleLoading}
              />
              <div>
                <div className="font-medium">자동 백업</div>
                <div className="text-sm text-muted-foreground">매일 새벽 2:00</div>
              </div>
            </div>
            <Badge variant={autoBackupEnabled ? "default" : "secondary"}>
              {autoBackupEnabled ? '활성' : '비활성'}
            </Badge>
          </div>
          
          {scheduleStatus && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span>상태:</span>
                  <span className={autoBackupEnabled ? 'text-green-600' : 'text-gray-500'}>
                    {autoBackupEnabled ? '실행 중' : '중지됨'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>백업 디렉토리:</span>
                  <span className="text-xs font-mono">{scheduleStatus.backupDir}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 백업 파일 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                백업 파일 목록
              </CardTitle>
              <CardDescription>
                최근 백업된 파일들을 확인할 수 있습니다.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadBackupFiles}>
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {backupFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              백업 파일이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {backupFiles.slice(0, 10).map((file, index) => ( // 최근 10개만 표시
                <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(file.created)} • {formatFileSize(file.size)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="outline" className="text-xs">완료</Badge>
                  </div>
                </div>
              ))}
              
              {backupFiles.length > 10 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  총 {backupFiles.length}개 파일 중 10개 표시
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 