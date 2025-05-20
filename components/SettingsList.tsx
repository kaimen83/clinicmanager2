'use client';

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from './ui/dialog';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Label } from './ui/label';

export type Setting = {
  _id: string;
  type: string;
  value: string;
  order: number;
  feeRate?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type SettingsListProps = {
  title: string;
  type: string;
  includesFeeRate?: boolean;
};

export default function SettingsList({ title, type, includesFeeRate = false }: SettingsListProps) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<Setting | null>(null);
  const [newValue, setNewValue] = useState('');
  const [newFeeRate, setNewFeeRate] = useState<number | undefined>(undefined);
  const [updatingOrder, setUpdatingOrder] = useState(false);

  // useCallback 대신 일반 함수로 변경
  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    // 다이얼로그가 닫힐 때 입력값 초기화
    if (!open) {
      setNewValue('');
      setNewFeeRate(undefined);
    }
  };

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    // 다이얼로그가 닫힐 때 입력값 초기화
    if (!open) {
      setCurrentSetting(null);
      setNewValue('');
      setNewFeeRate(undefined);
    }
  };

  const fetchSettings = useCallback(async () => {
    if (!type) return; // type이 없으면 API 호출 방지
    
    setLoading(true);
    try {
      const response = await fetch(`/api/settings?type=${type}`, {
        // next.js에서는 기본 캐시 옵션 사용
        cache: 'default', 
        // next.js 13 이상에서는 다음과 같이 사용할 수도 있음
        // next: { revalidate: 0 }
      });
      if (!response.ok) {
        throw new Error('설정 데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      // order 값으로 정렬
      const sortedSettings = data.settings.sort((a: Setting, b: Setting) => a.order - b.order);
      setSettings(sortedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [type]);

  // 컴포넌트 마운트 시 한 번만 데이터 로드
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleAddSetting = async () => {
    if (!newValue.trim()) return;

    try {
      // 새 항목의 order는 현재 항목 중 가장 큰 order + 1로 설정
      const maxOrder = settings.length > 0 
        ? Math.max(...settings.map(s => s.order)) 
        : 0;
      
      const payload: any = {
        type,
        value: newValue,
        order: maxOrder + 1
      };

      if (includesFeeRate && newFeeRate !== undefined) {
        payload.feeRate = newFeeRate;
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'default'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 추가하는데 실패했습니다');
      }

      // 응답에서 새로 추가된 설정 데이터 가져오기
      const data = await response.json();
      
      // 로컬 상태에 추가
      setSettings(prevSettings => [...prevSettings, data.setting]);
      
      setNewValue('');
      setNewFeeRate(undefined);
      setIsAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 추가하는데 오류가 발생했습니다');
    }
  };

  const handleEditSetting = async () => {
    if (!currentSetting || !newValue.trim()) return;

    try {
      const payload: any = {
        id: currentSetting._id,
        value: newValue
      };

      if (includesFeeRate && newFeeRate !== undefined) {
        payload.feeRate = newFeeRate;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'default'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 수정하는데 실패했습니다');
      }

      // 로컬 상태 업데이트
      setSettings(prevSettings => 
        prevSettings.map(setting => 
          setting._id === currentSetting._id 
            ? {
                ...currentSetting,
                value: newValue,
                feeRate: includesFeeRate ? newFeeRate : setting.feeRate
              } 
            : setting
        )
      );
      
      setCurrentSetting(null);
      setNewValue('');
      setNewFeeRate(undefined);
      setIsEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 수정하는데 오류가 발생했습니다');
    }
  };

  const handleToggleActive = async (setting: Setting) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: setting._id,
          isActive: !setting.isActive
        }),
        cache: 'default'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 토글하는데 실패했습니다');
      }

      // 로컬 상태 업데이트
      setSettings(prevSettings => 
        prevSettings.map(item => 
          item._id === setting._id
            ? { ...item, isActive: !item.isActive }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 토글하는데 오류가 발생했습니다');
    }
  };

  const handleDeleteSetting = async (id: string) => {
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/settings?id=${id}`, {
        method: 'DELETE',
        cache: 'default'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 삭제하는데 실패했습니다');
      }

      // 로컬 상태에서 삭제된 항목 제거
      setSettings(prevSettings => prevSettings.filter(setting => setting._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 삭제하는데 오류가 발생했습니다');
    }
  };

  const handleMoveUp = async (setting: Setting, index: number) => {
    if (index === 0) return; // 이미 첫 번째 항목이면 이동할 수 없음
    
    setUpdatingOrder(true);
    try {
      // 현재 항목과 이전 항목의 순서를 교환
      const prevSetting = settings[index - 1];
      
      // API 호출로 현재 항목의 순서 변경
      const response1 = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: setting._id,
          order: prevSetting.order
        }),
        cache: 'default'
      });
      
      // API 호출로 이전 항목의 순서 변경
      const response2 = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: prevSetting._id,
          order: setting.order
        }),
        cache: 'default'
      });

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경에 실패했습니다');
      }

      // 로컬 상태 업데이트
      const updatedSettings = [...settings];
      updatedSettings[index] = { ...prevSetting, order: setting.order };
      updatedSettings[index - 1] = { ...setting, order: prevSetting.order };
      
      // 순서를 기준으로 정렬
      updatedSettings.sort((a, b) => a.order - b.order);
      setSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '순서 변경에 실패했습니다');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleMoveDown = async (setting: Setting, index: number) => {
    if (index === settings.length - 1) return; // 이미 마지막 항목이면 이동할 수 없음
    
    setUpdatingOrder(true);
    try {
      // 현재 항목과 다음 항목의 순서를 교환
      const nextSetting = settings[index + 1];
      
      // API 호출로 현재 항목의 순서 변경
      const response1 = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: setting._id,
          order: nextSetting.order
        }),
        cache: 'default'
      });
      
      // API 호출로 다음 항목의 순서 변경
      const response2 = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: nextSetting._id,
          order: setting.order
        }),
        cache: 'default'
      });

      if (!response1.ok || !response2.ok) {
        throw new Error('순서 변경에 실패했습니다');
      }

      // 로컬 상태 업데이트
      const updatedSettings = [...settings];
      updatedSettings[index] = { ...nextSetting, order: setting.order };
      updatedSettings[index + 1] = { ...setting, order: nextSetting.order };
      
      // 순서를 기준으로 정렬
      updatedSettings.sort((a, b) => a.order - b.order);
      setSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '순서 변경에 실패했습니다');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const openEditDialog = (setting: Setting) => {
    setCurrentSetting(setting);
    setNewValue(setting.value);
    setNewFeeRate(setting.feeRate);
    handleEditDialogChange(true);
  };

  if (loading) return <div className="p-4 text-center">로딩 중...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>추가</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title} 추가</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  이름
                </Label>
                <Input
                  id="name"
                  value={newValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewValue(e.target.value)}
                  className="col-span-3"
                />
              </div>
              {includesFeeRate && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feeRate" className="text-right">
                    수수료율 (%)
                  </Label>
                  <Input
                    id="feeRate"
                    type="number"
                    min="0"
                    max="100"
                    value={newFeeRate ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      setNewFeeRate(value);
                    }}
                    className="col-span-3"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleAddSetting}>추가</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            {includesFeeRate && <TableHead>수수료율 (%)</TableHead>}
            <TableHead>사용</TableHead>
            <TableHead>순서</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={includesFeeRate ? 5 : 4} className="text-center">
                등록된 항목이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            settings.map((setting, index) => (
              <TableRow key={setting._id}>
                <TableCell>{setting.value}</TableCell>
                {includesFeeRate && (
                  <TableCell>{setting.feeRate !== undefined ? setting.feeRate : '-'}</TableCell>
                )}
                <TableCell>
                  <Switch
                    checked={setting.isActive}
                    onCheckedChange={() => handleToggleActive(setting)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(setting, index)}
                      disabled={index === 0 || updatingOrder}
                      title="위로 이동"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(setting, index)}
                      disabled={index === settings.length - 1 || updatingOrder}
                      title="아래로 이동"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(setting)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSetting(setting._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title} 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                이름
              </Label>
              <Input
                id="edit-name"
                value={newValue}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewValue(e.target.value)}
                className="col-span-3"
              />
            </div>
            {includesFeeRate && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-feeRate" className="text-right">
                  수수료율 (%)
                </Label>
                <Input
                  id="edit-feeRate"
                  type="number"
                  min="0"
                  max="100"
                  value={newFeeRate ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                    setNewFeeRate(value);
                  }}
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleEditSetting}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 