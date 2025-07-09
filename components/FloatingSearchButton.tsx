'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingSearchButtonProps {
  onClick: () => void;
}

export default function FloatingSearchButton({ onClick }: FloatingSearchButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed left-6 top-1/2 transform -translate-y-1/2 z-50 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
      title="환자 검색"
    >
      <Search className="w-6 h-6" />
    </Button>
  );
}