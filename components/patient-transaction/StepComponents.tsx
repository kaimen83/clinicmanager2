import { Check } from 'lucide-react';
import { StepIndicatorProps, StepTitleProps } from '@/types/patient-transaction';

// 스텝 인디케이터 컴포넌트
export const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center mb-6 gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`
            flex items-center justify-center w-8 h-8 rounded-full border 
            ${
              index + 1 === currentStep
                ? 'bg-primary text-white border-primary'
                : index + 1 < currentStep
                ? 'bg-primary/20 border-primary/20'
                : 'bg-gray-100 border-gray-200'
            }
          `}
        >
          {index + 1 < currentStep ? (
            <Check className="h-4 w-4" />
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// 단계별 제목 컴포넌트
export const StepTitle = ({ step }: StepTitleProps) => {
  const titles = [
    '환자 정보',
    '진료 및 수납 정보'
  ];
  
  return <h3 className="text-lg font-medium mb-4">{titles[step - 1]}</h3>;
}; 