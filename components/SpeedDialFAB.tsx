'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface SpeedDialFABProps {
  actions: FABAction[];
  className?: string;
}

export default function SpeedDialFAB({ actions, className }: SpeedDialFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Action buttons */}
      {isOpen && (
        <div className="mb-4 space-y-3">
          {actions.map((action, index) => (
            <div
              key={index}
              className="flex items-center justify-end animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              {/* Label */}
              <span className="mr-3 bg-gray-800 text-white px-3 py-1 rounded text-sm whitespace-nowrap shadow-lg">
                {action.label}
              </span>
              
              {/* Action button */}
              <button
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className="w-12 h-12 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={toggleOpen}
        className={cn(
          "w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          isOpen && "rotate-45"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}

    </div>
  );
}