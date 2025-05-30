import { Check, User, CreditCard } from 'lucide-react';
import { StepIndicatorProps, StepTitleProps } from '@/types/patient-transaction';

// 스텝 인디케이터 컴포넌트
export const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-200
              ${
                index + 1 === currentStep
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                  : index + 1 < currentStep
                  ? 'bg-purple-100 text-purple-600 border-purple-300'
                  : 'bg-gray-100 text-gray-400 border-gray-300'
              }
            `}
          >
            {index + 1 < currentStep ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="font-semibold text-sm">{index + 1}</span>
            )}
          </div>
          
          {index < totalSteps - 1 && (
            <div 
              className={`
                w-12 h-0.5 mx-1 transition-all duration-200
                ${
                  index + 1 < currentStep 
                    ? 'bg-purple-300' 
                    : 'bg-gray-300'
                }
              `}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// 단계별 제목 컴포넌트
export const StepTitle = ({ step }: StepTitleProps) => {
  const stepInfo = [
    { title: '환자 정보', icon: User, description: '환자의 기본 정보를 입력하세요' },
    { title: '진료 및 수납 정보', icon: CreditCard, description: '진료 내역과 수납 정보를 입력하세요' }
  ];
  
  const currentStepInfo = stepInfo[step - 1];
  const IconComponent = currentStepInfo.icon;
  
  return (
    <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
      <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
        <IconComponent className="w-4 h-4 text-purple-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{currentStepInfo.title}</h3>
        <p className="text-sm text-gray-600">{currentStepInfo.description}</p>
      </div>
    </div>
  );
}; 