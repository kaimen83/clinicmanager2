'use client';

import { Megaphone } from 'lucide-react';

interface NoticeCreateButtonProps {
  onClick: () => void;
}

export default function NoticeCreateButton({ onClick }: NoticeCreateButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50 group"
      title="공지사항 작성"
    >
      <Megaphone size={24} />
      <span className="absolute right-16 bg-gray-800 text-white px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        공지사항 작성
      </span>
    </button>
  );
}