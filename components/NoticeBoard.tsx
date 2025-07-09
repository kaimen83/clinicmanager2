'use client';

import { useState, useEffect, useRef } from 'react';
import { Notice } from '@/types/notice';
import NoticeItem from './NoticeItem';
import NoticeCreateButton from './NoticeCreateButton';
import NoticeCreateModal from './NoticeCreateModal';
import { useUserActivity } from '@/hooks/useUserActivity';

export default function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newNoticeCount, setNewNoticeCount] = useState(0);
  const lastFetchRef = useRef<number>(Date.now());

  const fetchNotices = async (showNewNoticeAlert = false) => {
    try {
      const response = await fetch('/api/notices');
      if (response.ok) {
        const data = await response.json();
        
        // 새 공지사항 감지
        if (showNewNoticeAlert && data.length > notices.length) {
          const newCount = data.length - notices.length;
          setNewNoticeCount(newCount);
          
          // 3초 후 알림 숨기기
          setTimeout(() => setNewNoticeCount(0), 3000);
        }
        
        setNotices(data);
        lastFetchRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 활동 감지 시 공지사항 새로고침
  const handleUserActivity = () => {
    // 마지막 fetch로부터 10초 이상 지났을 때만 새로고침
    if (Date.now() - lastFetchRef.current > 10000) {
      fetchNotices(true);
    }
  };

  useUserActivity({
    onActivity: handleUserActivity,
    throttleMs: 5000 // 5초 간격으로 제한
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleDismiss = async (noticeId: string, dismissType: 'today' | 'permanent') => {
    try {
      const response = await fetch(`/api/notices/${noticeId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissType })
      });

      if (response.ok) {
        setNotices(notices.filter(notice => notice._id !== noticeId));
      }
    } catch (error) {
      console.error('Error dismissing notice:', error);
    }
  };

  const handleUpdate = async (noticeId: string, content: string) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        const updatedNotice = await response.json();
        setNotices(notices.map(notice => 
          notice._id === noticeId ? updatedNotice : notice
        ));
      }
    } catch (error) {
      console.error('Error updating notice:', error);
    }
  };

  const handleDelete = async (noticeId: string) => {
    try {
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotices(notices.filter(notice => notice._id !== noticeId));
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
    }
  };

  const handleCreate = async (content: string, expiresAt?: string) => {
    try {
      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, expiresAt })
      });

      if (response.ok) {
        // 새 공지사항 생성 후 즉시 갱신
        await fetchNotices(false);
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Error creating notice:', error);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* 새 공지사항 알림 */}
      {newNoticeCount > 0 && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-[10000] animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <span>새 공지사항 {newNoticeCount}개가 등록되었습니다!</span>
          </div>
        </div>
      )}

      {/* 공지사항 목록 */}
      <div className="fixed top-24 right-4 flex flex-row-reverse gap-4 z-[9999] max-w-[calc(100vw-2rem)] pointer-events-none">
        <div className="pointer-events-auto">
        {notices.map((notice) => (
          <NoticeItem
            key={notice._id}
            notice={notice}
            onDismiss={handleDismiss}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
        </div>
      </div>
      
      <NoticeCreateButton onClick={() => setIsCreateModalOpen(true)} />
      
      <NoticeCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}