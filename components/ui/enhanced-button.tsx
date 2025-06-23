import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { spacing, type SpacingScale } from "@/lib/tokens/spacing";
import { colors } from "@/lib/tokens/colors";
import { shadows } from "@/lib/tokens/shadows";
import { borders } from "@/lib/tokens/borders";

// Enhanced Button variant and size types
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'text';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Enhanced Button Component Interface
export interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
  asChild?: boolean;
  children?: React.ReactNode;
}

// Button variant styles using design tokens
const buttonVariants = {
  primary: 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600 hover:border-primary-600 focus:ring-primary-500 active:bg-primary-700',
  secondary: 'bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200 hover:border-gray-300 focus:ring-gray-500 active:bg-gray-300',
  outline: 'bg-transparent text-primary-500 border-primary-500 hover:bg-primary-50 hover:text-primary-600 focus:ring-primary-500 active:bg-primary-100',
  ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500 active:bg-gray-200',
  destructive: 'bg-error-500 text-white border-error-500 hover:bg-error-600 hover:border-error-600 focus:ring-error-500 active:bg-error-700',
  text: 'bg-transparent text-primary-500 border-transparent hover:text-primary-600 hover:bg-primary-50 focus:ring-primary-500 active:text-primary-700 active:bg-primary-100',
};

// Button size styles using design tokens
const buttonSizes = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5', 
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-lg gap-2.5',
  xl: 'h-14 px-8 text-xl gap-3',
};

// Icon-only button sizes
const iconOnlySizes = {
  xs: 'h-6 w-6 p-1',
  sm: 'h-8 w-8 p-1.5',
  md: 'h-10 w-10 p-2',
  lg: 'h-12 w-12 p-2.5',
  xl: 'h-14 w-14 p-3',
};

// Loading spinner component
const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const spinnerSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        spinnerSizes[size]
      )}
      aria-hidden="true"
    />
  );
};

// Enhanced Button Component
export const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    iconOnly = false,
    asChild = false,
    className, 
    children, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || isLoading;
    const hasContent = children && !iconOnly;
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center font-medium transition-all duration-200',
          'border rounded-button focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          
          // Variant styles
          buttonVariants[variant],
          
          // Size styles
          iconOnly ? iconOnlySizes[size] : buttonSizes[size],
          
          // Loading styles
          isLoading && 'cursor-wait',
          
          className
        )}
        disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size} />
        ) : (
          <>
            {leftIcon && (
              <span className={cn('flex-shrink-0', hasContent && 'mr-1')}>
                {leftIcon}
              </span>
            )}
            {hasContent && <span className="truncate">{children}</span>}
            {rightIcon && (
              <span className={cn('flex-shrink-0', hasContent && 'ml-1')}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </Comp>
    );
  }
);
EnhancedButton.displayName = 'EnhancedButton';

// Button Group Component for related actions
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = 'horizontal', variant, size, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(
          'inline-flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          '[&>button]:rounded-none [&>button:first-child]:rounded-l-button [&>button:last-child]:rounded-r-button',
          orientation === 'vertical' && '[&>button:first-child]:rounded-t-button [&>button:first-child]:rounded-l-none [&>button:last-child]:rounded-b-button [&>button:last-child]:rounded-r-none',
          '[&>button:not(:first-child)]:border-l-0',
          orientation === 'vertical' && '[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement<EnhancedButtonProps>(child) && child.type === EnhancedButton) {
            return React.cloneElement(child, {
              variant: child.props.variant || variant,
              size: child.props.size || size,
            });
          }
          return child;
        })}
      </div>
    );
  }
);
ButtonGroup.displayName = 'ButtonGroup';

// Icon Button Component for easier icon-only usage
export interface IconButtonProps extends Omit<EnhancedButtonProps, 'leftIcon' | 'rightIcon' | 'iconOnly' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, ...props }, ref) => (
    <EnhancedButton ref={ref} iconOnly leftIcon={icon} {...props} />
  )
);
IconButton.displayName = 'IconButton';

// Floating Action Button Component
export interface FABProps extends Omit<EnhancedButtonProps, 'variant' | 'size'> {
  size?: 'md' | 'lg';
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ size = 'lg', className, ...props }, ref) => (
    <EnhancedButton
      ref={ref}
      variant="primary"
      size={size}
      className={cn(
        'fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl rounded-full',
        'transition-all duration-300 transform hover:scale-105',
        className
      )}
      {...props}
    />
  )
);
FloatingActionButton.displayName = 'FloatingActionButton';

// Split Button Component
export interface SplitButtonProps extends Omit<EnhancedButtonProps, 'rightIcon'> {
  dropdownIcon?: React.ReactNode;
  onDropdownClick?: () => void;
}

export const SplitButton = React.forwardRef<HTMLButtonElement, SplitButtonProps>(
  ({ 
    dropdownIcon = '▼', 
    onDropdownClick, 
    className, 
    variant = 'primary',
    size = 'md',
    ...props 
  }, ref) => {
    return (
      <ButtonGroup orientation="horizontal" className={className}>
        <EnhancedButton ref={ref} variant={variant} size={size} {...props} />
        <EnhancedButton
          variant={variant}
          size={size}
          iconOnly
          leftIcon={dropdownIcon}
          onClick={onDropdownClick}
          aria-label="More options"
          className="border-l-0"
        />
      </ButtonGroup>
    );
  }
);
SplitButton.displayName = 'SplitButton';

// Export utility functions and constants
export {
  buttonVariants,
  buttonSizes,
  iconOnlySizes,
}; 