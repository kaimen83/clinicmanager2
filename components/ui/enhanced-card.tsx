import * as React from "react";
import { cn } from "@/lib/utils";
import { spacing, type SpacingScale } from "@/lib/tokens/spacing";
import { shadows } from "@/lib/tokens/shadows";
import { borders } from "@/lib/tokens/borders";
import { colors } from "@/lib/tokens/colors";

// Enhanced Card variant types
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type CardSize = 'sm' | 'md' | 'lg';

// Base Enhanced Card Component
export interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const cardVariants = {
  default: 'bg-white border-0',
  elevated: 'bg-white border-0 shadow-card',
  outlined: 'bg-white border border-gray-200',
  ghost: 'bg-transparent border-0',
};

const cardSizes = {
  sm: 'p-4',
  md: 'p-6', 
  lg: 'p-8',
};

const cardInteractiveStates = 'cursor-pointer transition-all duration-200 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98]';

export const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ 
    variant = 'default', 
    size = 'md', 
    interactive = false, 
    loading = false,
    disabled = false,
    className, 
    children, 
    onClick,
    onKeyDown,
    ...props 
  }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (interactive && onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick();
      }
      if (onKeyDown) onKeyDown(event);
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-card overflow-hidden transition-colors',
          
          // Variant styles
          cardVariants[variant],
          
          // Size styles  
          cardSizes[size],
          
          // Interactive styles
          interactive && !disabled && cardInteractiveStates,
          
          // Disabled styles
          disabled && 'opacity-50 cursor-not-allowed',
          
          // Loading styles
          loading && 'animate-pulse',
          
          className
        )}
        onClick={interactive && !disabled && !loading && onClick ? () => onClick() : undefined}
        onKeyDown={interactive && !disabled && !loading ? handleKeyDown : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive && !disabled ? 0 : undefined}
        aria-disabled={disabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[100px]">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);
EnhancedCard.displayName = 'EnhancedCard';

// Enhanced Card Header Component
export interface EnhancedCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  bordered?: boolean;
}

export const EnhancedCardHeader = React.forwardRef<HTMLDivElement, EnhancedCardHeaderProps>(
  ({ className, children, bordered = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-2',
        bordered && 'border-b border-gray-200 pb-4 mb-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
EnhancedCardHeader.displayName = 'EnhancedCardHeader';

// Enhanced Card Title Component
export interface EnhancedCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
}

export const EnhancedCardTitle = React.forwardRef<HTMLHeadingElement, EnhancedCardTitleProps>(
  ({ className, children, level = 3, ...props }, ref) => {
    const titleClasses = {
      1: 'text-h1',
      2: 'text-h2', 
      3: 'text-h3',
      4: 'text-h4',
    };

    const commonClasses = cn(
      'font-semibold leading-none tracking-tight text-gray-900',
      titleClasses[level],
      className
    );

    switch (level) {
      case 1:
        return <h1 ref={ref as React.ForwardedRef<HTMLHeadingElement>} className={commonClasses} {...props}>{children}</h1>;
      case 2:
        return <h2 ref={ref as React.ForwardedRef<HTMLHeadingElement>} className={commonClasses} {...props}>{children}</h2>;
      case 4:
        return <h4 ref={ref as React.ForwardedRef<HTMLHeadingElement>} className={commonClasses} {...props}>{children}</h4>;
      default:
        return <h3 ref={ref as React.ForwardedRef<HTMLHeadingElement>} className={commonClasses} {...props}>{children}</h3>;
    }
  }
);
EnhancedCardTitle.displayName = 'EnhancedCardTitle';

// Enhanced Card Description Component  
export interface EnhancedCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const EnhancedCardDescription = React.forwardRef<HTMLParagraphElement, EnhancedCardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-bodySmall text-gray-600 leading-relaxed',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
);
EnhancedCardDescription.displayName = 'EnhancedCardDescription';

// Enhanced Card Content Component
export interface EnhancedCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const EnhancedCardContent = React.forwardRef<HTMLDivElement, EnhancedCardContentProps>(
  ({ className, children, noPadding = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        !noPadding && 'space-y-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
EnhancedCardContent.displayName = 'EnhancedCardContent';

// Enhanced Card Footer Component
export interface EnhancedCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  bordered?: boolean;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const EnhancedCardFooter = React.forwardRef<HTMLDivElement, EnhancedCardFooterProps>(
  ({ className, children, bordered = false, align = 'right', ...props }, ref) => {
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center', 
      right: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3',
          alignClasses[align],
          bordered && 'border-t border-gray-200 pt-4 mt-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
EnhancedCardFooter.displayName = 'EnhancedCardFooter';

// Specialized Card Components

// Stats Card Component
export interface StatsCardProps extends Omit<EnhancedCardProps, 'children'> {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
}

export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, change, icon, ...props }, ref) => {
    const changeColor = change
      ? change.direction === 'up'
        ? 'text-success-600'
        : change.direction === 'down'
        ? 'text-error-600'
        : 'text-gray-600'
      : '';

    return (
      <EnhancedCard ref={ref} variant="outlined" {...props}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-bodySmall text-gray-600 font-medium">{title}</p>
            <p className="text-h2 font-bold text-gray-900">{value}</p>
            {change && (
              <div className={cn('flex items-center gap-1', changeColor)}>
                <span className="text-caption font-medium">
                  {change.direction === 'up' ? '↗' : change.direction === 'down' ? '↘' : '→'} 
                  {change.value}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 bg-gray-50 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </EnhancedCard>
    );
  }
);
StatsCard.displayName = 'StatsCard';

// Feature Card Component
export interface FeatureCardProps extends Omit<EnhancedCardProps, 'children'> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, description, icon, action, ...props }, ref) => (
    <EnhancedCard ref={ref} variant="outlined" {...props}>
      <EnhancedCardHeader>
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 bg-primary-50 rounded-lg">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <EnhancedCardTitle level={4}>{title}</EnhancedCardTitle>
            <EnhancedCardDescription>{description}</EnhancedCardDescription>
          </div>
        </div>
      </EnhancedCardHeader>
      {action && (
        <EnhancedCardFooter align="right">
          {action}
        </EnhancedCardFooter>
      )}
    </EnhancedCard>
  )
);
FeatureCard.displayName = 'FeatureCard';

export {
  cardVariants,
  cardSizes,
  cardInteractiveStates,
}; 