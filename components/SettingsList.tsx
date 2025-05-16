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
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
      const response = await fetch(`/api/settings?type=${type}`);
      if (!response.ok) {
        throw new Error('설정 데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleAddSetting = async () => {
    if (!newValue.trim()) return;

    try {
      const payload: any = {
        type,
        value: newValue
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 추가하는데 실패했습니다');
      }

      await fetchSettings();
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 수정하는데 실패했습니다');
      }

      await fetchSettings();
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 토글하는데 실패했습니다');
      }

      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 토글하는데 오류가 발생했습니다');
    }
  };

  const handleDeleteSetting = async (id: string) => {
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/settings?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정을 삭제하는데 실패했습니다');
      }

      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 삭제하는데 오류가 발생했습니다');
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
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={includesFeeRate ? 4 : 3} className="text-center">
                등록된 항목이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            settings.map((setting) => (
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