'use client';

import { Calendar, Flag, Tag, MoreVertical, Edit3, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Todo {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  dueDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '환자관리': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '재고관리': return 'bg-purple-100 text-purple-700 border-purple-200';
      case '회계': return 'bg-green-100 text-green-700 border-green-200';
      case '일반업무': return 'bg-gray-100 text-gray-700 border-gray-200';
      case '개인': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDueDateDisplay = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) {
      return { text: '오늘', color: 'text-red-600 bg-red-50' };
    } else if (isTomorrow(date)) {
      return { text: '내일', color: 'text-orange-600 bg-orange-50' };
    } else if (isPast(date)) {
      return { text: '지연', color: 'text-red-600 bg-red-50' };
    } else {
      return { 
        text: format(date, 'MM/dd', { locale: ko }), 
        color: 'text-blue-600 bg-blue-50' 
      };
    }
  };

  const dueDateInfo = todo.dueDate ? getDueDateDisplay(todo.dueDate) : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 hover:shadow-sm",
        todo.completed 
          ? "bg-gray-50 opacity-70 border-gray-200" 
          : "bg-white hover:bg-gray-50 border-gray-200"
      )}
    >
      {/* 체크박스 */}
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo._id)}
        className="mt-1"
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 제목 */}
        <h4 className={cn(
          "text-sm font-medium leading-5",
          todo.completed && "line-through text-gray-500"
        )}>
          {todo.title}
        </h4>

        {/* 설명 */}
        {todo.description && (
          <p className={cn(
            "text-xs text-gray-600 mt-1 leading-4",
            todo.completed && "line-through"
          )}>
            {todo.description}
          </p>
        )}

        {/* 메타 정보 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* 우선순위 */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium border",
              getPriorityColor(todo.priority)
            )}
          >
            <Flag className="w-3 h-3 mr-1" />
            {todo.priority === 'high' ? '높음' : 
             todo.priority === 'medium' ? '보통' : '낮음'}
          </Badge>

          {/* 카테고리 */}
          {todo.category && (
            <Badge 
              variant="outline"
              className={cn(
                "text-xs font-medium border",
                getCategoryColor(todo.category)
              )}
            >
              <Tag className="w-3 h-3 mr-1" />
              {todo.category}
            </Badge>
          )}

          {/* 마감일 */}
          {dueDateInfo && (
            <Badge 
              variant="outline"
              className={cn(
                "text-xs font-medium border",
                dueDateInfo.color,
                isPast(new Date(todo.dueDate!)) && !todo.completed && "animate-pulse"
              )}
            >
              <CalendarIcon className="w-3 h-3 mr-1" />
              {dueDateInfo.text}
            </Badge>
          )}
        </div>
      </div>

      {/* 액션 메뉴 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem 
            onClick={() => onEdit(todo)}
            className="cursor-pointer"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            편집
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(todo._id)}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}