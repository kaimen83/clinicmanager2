'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Filter, MoreVertical, Calendar, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
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

interface TodoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TodoPanel({ isOpen, onClose }: TodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Todo 목록 불러오기
  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos');
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (error) {
      console.error('Todo 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTodos();
    }
  }, [isOpen]);

  // 새 Todo 추가
  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTodoTitle })
      });

      if (response.ok) {
        const newTodo = await response.json();
        setTodos([newTodo, ...todos]);
        setNewTodoTitle('');
      }
    } catch (error) {
      console.error('Todo 추가 실패:', error);
    }
  };

  // Todo 완료 상태 토글
  const handleToggleTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH'
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos(todos.map(todo => 
          todo._id === id ? updatedTodo : todo
        ));
      }
    } catch (error) {
      console.error('Todo 상태 변경 실패:', error);
    }
  };

  // Todo 삭제
  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTodos(todos.filter(todo => todo._id !== id));
      }
    } catch (error) {
      console.error('Todo 삭제 실패:', error);
    }
  };

  // 필터링된 Todo 목록
  const filteredTodos = todos.filter(todo => {
    let matchesFilter = true;
    if (filter === 'active') matchesFilter = !todo.completed;
    if (filter === 'completed') matchesFilter = todo.completed;
    
    let matchesPriority = true;
    if (selectedPriority !== 'all') matchesPriority = todo.priority === selectedPriority;
    
    return matchesFilter && matchesPriority;
  });

  // 우선순위 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>체크리스트</span>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPriority} onValueChange={(value: any) => setSelectedPriority(value)}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 우선순위</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="p-6">
          {/* 새 Todo 입력 */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="새로운 할 일을 입력하세요..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
              className="flex-1"
            />
            <Button onClick={handleAddTodo} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Todo 목록 */}
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩중...</div>
            ) : filteredTodos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filter === 'all' ? '할 일이 없습니다' : '해당하는 할 일이 없습니다'}
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo._id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    todo.completed ? "bg-gray-50 opacity-60" : "bg-white hover:bg-gray-50"
                  )}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => handleToggleTodo(todo._id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      todo.completed && "line-through text-gray-500"
                    )}>
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="text-xs text-gray-500 mt-1">{todo.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        getPriorityColor(todo.priority)
                      )}>
                        <Flag className="w-3 h-3 mr-1" />
                        {todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '보통' : '낮음'}
                      </span>
                      {todo.dueDate && (
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(todo.dueDate), 'MM/dd', { locale: ko })}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTodo(todo._id)}
                        className="text-red-600"
                      >
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>

          {/* 통계 */}
          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            전체 {todos.length}개 중 {todos.filter(t => t.completed).length}개 완료
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}