'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface NoticeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (content: string, expiresAt?: string, isPrivate?: boolean) => void;
}

export default function NoticeCreateModal({ isOpen, onClose, onCreate }: NoticeCreateModalProps) {
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onCreate(content, expiresAt || undefined, isPrivate);
      setContent('');
      setExpiresAt('');
      setIsPrivate(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>공지사항 작성</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="content">내용</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요"
              className="min-h-[100px] mt-1"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="expiresAt">만료일 (선택사항)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="isPrivate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              나만 보기 (개인 메모)
            </Label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">등록</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}