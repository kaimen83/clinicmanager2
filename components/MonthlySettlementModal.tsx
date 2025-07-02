'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calculator } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onDateChange?: (date: Date) => void;
};

export default function MonthlySettlementModal({ isOpen, onClose, date, onDateChange }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-green-700 bg-clip-text text-transparent">
                월간 결산
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {format(date, 'yyyy년 MM월', { locale: ko })} 결산 현황
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <div className="mb-4">
              <Calculator className="w-16 h-16 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">월간 결산 기능</h3>
            <p className="text-gray-500">
              월간 결산 기능이 곧 추가될 예정입니다.
            </p>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-end">
            <Button 
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}