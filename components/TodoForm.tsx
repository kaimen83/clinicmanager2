'use client';

import { useState, useEffect } from 'react';
import { Calendar, Flag, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Todo {
  _id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  dueDate?: string;
}

interface TodoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Todo>) => Promise<void>;
  initialData?: Todo;
  categories?: string[];
}

export default function TodoForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData,
  categories = ['환자관리', '재고관리', '회계', '일반업무', '개인']
}: TodoFormProps) {
  const [formData, setFormData] = useState<Partial<Todo>>({
    title: '',
    description: '',
    priority: 'medium',
    category: '일반업무',
    dueDate: undefined
  });
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        priority: initialData.priority,
        category: initialData.category,
        dueDate: initialData.dueDate
      });
      if (initialData.dueDate) {
        setDate(new Date(initialData.dueDate));
      }
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: '일반업무',
        dueDate: undefined
      });
      setDate(undefined);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        dueDate: date ? date.toISOString() : undefined
      });
      onClose();
    } catch (error) {
      console.error('Todo 저장 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '환자관리': return 'bg-blue-100 text-blue-700';
      case '재고관리': return 'bg-purple-100 text-purple-700';
      case '회계': return 'bg-green-100 text-green-700';
      case '일반업무': return 'bg-gray-100 text-gray-700';
      case '개인': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? '할 일 수정' : '새 할 일 추가'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="할 일을 입력하세요"
              required
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="상세 내용을 입력하세요 (선택사항)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 우선순위 */}
            <div className="space-y-2">
              <Label>우선순위</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Flag className={cn("w-4 h-4", getPriorityColor(formData.priority || 'medium'))} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-red-600" />
                      <span>높음</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-yellow-600" />
                      <span>보통</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-green-600" />
                      <span>낮음</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 카테고리 */}
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        getCategoryColor(category)
                      )}>
                        {category}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 마감일 */}
          <div className="space-y-2">
            <Label>마감일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, 'yyyy년 MM월 dd일', { locale: ko }) : '마감일 선택'}
                  {date && (
                    <X
                      className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDate(undefined);
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장중...' : (initialData ? '수정' : '추가')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}