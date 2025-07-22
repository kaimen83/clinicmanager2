'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, SortAsc, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import TodoForm from './TodoForm';
import TodoItem from './TodoItem';
import SortableTodoList from './SortableTodoList';

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

type FilterType = 'all' | 'active' | 'completed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
type SortType = 'created' | 'priority' | 'dueDate' | 'category';

export default function TodoPanel({ isOpen, onClose }: TodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 필터 상태
  const [filter, setFilter] = useState<FilterType>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortType>('created');
  
  // 폼 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>();

  // 카테고리 목록
  const categories = ['환자관리', '재고관리', '회계', '일반업무', '개인'];
  const availableCategories = Array.from(new Set([
    ...categories,
    ...todos.map(todo => todo.category).filter(Boolean)
  ]));

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

  // Todo 추가/수정
  const handleSubmitTodo = async (data: Partial<Todo>) => {
    try {
      const method = editingTodo ? 'PUT' : 'POST';
      const url = editingTodo ? `/api/todos/${editingTodo._id}` : '/api/todos';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        if (editingTodo) {
          setTodos(todos.map(todo => 
            todo._id === editingTodo._id ? result : todo
          ));
        } else {
          setTodos([result, ...todos]);
        }
        setIsFormOpen(false);
        setEditingTodo(undefined);
      }
    } catch (error) {
      console.error('Todo 저장 실패:', error);
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

  // Todo 편집
  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setIsFormOpen(true);
  };

  // Todo 삭제
  const handleDeleteTodo = async (id: string) => {
    if (!confirm('이 할 일을 삭제하시겠습니까?')) return;

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

  // Todo 순서 변경
  const handleReorderTodos = async (todoIds: string[]) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoIds })
      });

      if (response.ok) {
        // 로컬 상태 업데이트
        const reorderedTodos = todoIds.map((id, index) => {
          const todo = todos.find(t => t._id === id);
          return todo ? { ...todo, order: index } : null;
        }).filter(Boolean) as Todo[];
        
        setTodos(reorderedTodos);
      }
    } catch (error) {
      console.error('Todo 순서 변경 실패:', error);
    }
  };

  // 필터링 및 정렬
  const filteredAndSortedTodos = todos
    .filter(todo => {
      // 검색 필터
      if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !todo.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 완료 상태 필터
      if (filter === 'active' && todo.completed) return false;
      if (filter === 'completed' && !todo.completed) return false;

      // 우선순위 필터
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;

      // 카테고리 필터
      if (categoryFilter !== 'all' && todo.category !== categoryFilter) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default: // created
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // 통계
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
    overdue: todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>체크리스트</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{stats.active}개 진행중</Badge>
                <Button 
                  onClick={() => {
                    setEditingTodo(undefined);
                    setIsFormOpen(true);
                  }}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 flex-1 flex flex-col">
            {/* 검색 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="할 일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 필터 및 정렬 */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 ({stats.total})</SelectItem>
                  <SelectItem value="active">진행중 ({stats.active})</SelectItem>
                  <SelectItem value="completed">완료 ({stats.completed})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value: PriorityFilter) => setPriorityFilter(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 우선순위</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortType) => setSortBy(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">생성일순</SelectItem>
                  <SelectItem value="priority">우선순위순</SelectItem>
                  <SelectItem value="dueDate">마감일순</SelectItem>
                  <SelectItem value="category">카테고리순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="mb-4" />

            {/* Todo 목록 */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">로딩중...</div>
              ) : filteredAndSortedTodos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery || filter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                    ? '조건에 맞는 할 일이 없습니다'
                    : '할 일이 없습니다'
                  }
                </div>
              ) : (
                // 드래그 앤 드롭은 필터가 없고 기본 정렬일 때만 활성화
                (sortBy === 'created' && filter === 'all' && priorityFilter === 'all' && 
                 categoryFilter === 'all' && !searchQuery) ? (
                  <SortableTodoList
                    todos={filteredAndSortedTodos}
                    onToggle={handleToggleTodo}
                    onEdit={handleEditTodo}
                    onDelete={handleDeleteTodo}
                    onReorder={handleReorderTodos}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredAndSortedTodos.map((todo) => (
                      <TodoItem
                        key={todo._id}
                        todo={todo}
                        onToggle={handleToggleTodo}
                        onEdit={handleEditTodo}
                        onDelete={handleDeleteTodo}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* 통계 */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500">전체</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-blue-600">{stats.active}</div>
                  <div className="text-xs text-gray-500">진행중</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-green-600">{stats.completed}</div>
                  <div className="text-xs text-gray-500">완료</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-red-600">{stats.overdue}</div>
                  <div className="text-xs text-gray-500">지연</div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Todo 폼 */}
      <TodoForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTodo(undefined);
        }}
        onSubmit={handleSubmitTodo}
        initialData={editingTodo}
        categories={categories}
      />
    </>
  );
}