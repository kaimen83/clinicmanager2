'use client';

import { useState } from 'react';
import { Notice } from '@/types/notice';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface NoticeItemProps {
  notice: Notice;
  onDismiss: (noticeId: string, dismissType: 'today' | 'permanent') => void;
  onUpdate: (noticeId: string, content: string) => void;
  onDelete: (noticeId: string) => void;
}

export default function NoticeItem({ notice, onDismiss, onUpdate, onDelete }: NoticeItemProps) {
  const { userId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(notice.content);
  const [showSettings, setShowSettings] = useState(false);
  const isAuthor = userId === notice.authorId;

  const handleSave = () => {
    onUpdate(notice._id!, editContent);
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className={`relative ${notice.isPrivate ? 'bg-[#E8F5E8] border-[#4CAF50]' : 'bg-[#FFF59D] border-[#F9A825]'} rounded-lg p-4 w-[250px] shadow-md`}>
      {isAuthor && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-2 p-1 hover:bg-yellow-200 rounded"
        >
          <Settings size={16} />
        </button>
      )}
      
      {showSettings && (
        <div className="absolute top-8 right-2 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10">
          <button
            onClick={() => {
              setIsEditing(true);
              setShowSettings(false);
            }}
            className="block w-full text-left px-3 py-1 hover:bg-gray-100 rounded text-sm"
          >
            수정
          </button>
          <button
            onClick={() => {
              if (confirm('정말 삭제하시겠습니까?')) {
                onDelete(notice._id!);
              }
            }}
            className="block w-full text-left px-3 py-1 hover:bg-gray-100 rounded text-sm text-red-600"
          >
            삭제
          </button>
        </div>
      )}

      <div className="mb-4 pr-6">
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(notice.content);
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{notice.content}</p>
        )}
      </div>

      <div className="text-xs text-gray-600 mb-2">
        <div className="flex items-center gap-1">
          <span>작성: {notice.authorName}</span>
          {notice.isPrivate && <span className="text-green-600">🔒</span>}
        </div>
        <div>{formatDate(notice.createdAt)}</div>
      </div>

      <div className="border-t border-[#F9A825] pt-2 flex gap-2">
        <Button
          onClick={() => onDismiss(notice._id!, 'today')}
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
        >
          오늘만 닫기
        </Button>
        <Button
          onClick={() => onDismiss(notice._id!, 'permanent')}
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
        >
          영구 닫기
        </Button>
      </div>
    </div>
  );
}