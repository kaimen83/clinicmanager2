import * as React from "react";
import { cn } from "@/lib/utils";
import { spacing, type SpacingScale } from "@/lib/tokens/spacing";
import { colors } from "@/lib/tokens/colors";
import { shadows } from "@/lib/tokens/shadows";
import { borders } from "@/lib/tokens/borders";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from "./select";

// Enhanced Form Field types
export type FormFieldSize = 'sm' | 'md' | 'lg';
export type FormFieldVariant = 'default' | 'outlined' | 'filled';
export type ValidationState = 'default' | 'error' | 'success' | 'warning';

// Base Form Field Props
interface BaseFormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  required?: boolean;
  size?: FormFieldSize;
  variant?: FormFieldVariant;
  className?: string;
  fieldClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
}

// Enhanced Input Component
export interface EnhancedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseFormFieldProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftIconClick?: () => void;
  onRightIconClick?: () => void;
}

export const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    label,
    description,
    error,
    success,
    warning,
    required = false,
    size = 'md',
    variant = 'default',
    leftIcon,
    rightIcon,
    onLeftIconClick,
    onRightIconClick,
    className,
    fieldClassName,
    labelClassName,
    disabled = false,
    id,
    ...props 
  }, ref) => {
    const inputId = id || React.useId();
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;
    
    const validationState: ValidationState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';
    
    const sizeStyles = {
      sm: 'h-8 text-sm px-3',
      md: 'h-10 text-base px-4',
      lg: 'h-12 text-lg px-5',
    };
    
    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    
    const getIconContainerPadding = (size: FormFieldSize) => {
      if (leftIcon) {
        return size === 'sm' ? 'pl-9' : size === 'md' ? 'pl-11' : 'pl-13';
      }
      if (rightIcon) {
        return size === 'sm' ? 'pr-9' : size === 'md' ? 'pr-11' : 'pr-13';
      }
      return '';
    };
    
    const validationStyles = {
      default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
      error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
      success: 'border-success-500 focus:border-success-500 focus:ring-success-500',
      warning: 'border-warning-500 focus:border-warning-500 focus:ring-warning-500',
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label 
            htmlFor={inputId} 
            className={cn(
              "block text-sm font-medium text-gray-700",
              disabled && "text-gray-400",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div 
              className={cn(
                "absolute inset-y-0 left-0 flex items-center pl-3",
                onLeftIconClick ? "cursor-pointer" : "pointer-events-none",
                "text-gray-400"
              )}
              onClick={onLeftIconClick}
            >
              <span className={iconSizes[size]}>{leftIcon}</span>
            </div>
          )}
          
          <Input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-describedby={description ? descriptionId : undefined}
            aria-invalid={validationState === 'error'}
            aria-errormessage={error ? errorId : undefined}
            className={cn(
              sizeStyles[size],
              validationStyles[validationState],
              getIconContainerPadding(size),
              disabled && "bg-gray-50 cursor-not-allowed",
              fieldClassName
            )}
            {...props}
          />
          
          {rightIcon && (
            <div 
              className={cn(
                "absolute inset-y-0 right-0 flex items-center pr-3",
                onRightIconClick ? "cursor-pointer" : "pointer-events-none",
                "text-gray-400"
              )}
              onClick={onRightIconClick}
            >
              <span className={iconSizes[size]}>{rightIcon}</span>
            </div>
          )}
        </div>
        
        {description && !error && !success && !warning && (
          <p id={descriptionId} className="text-xs text-gray-500">
            {description}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="text-xs text-error-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-xs text-success-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {warning && (
          <p className="text-xs text-warning-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {warning}
          </p>
        )}
      </div>
    );
  }
);
EnhancedInput.displayName = 'EnhancedInput';

// Enhanced Textarea Component
export interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFormFieldProps {
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    label,
    description,
    error,
    success,
    warning,
    required = false,
    size = 'md',
    resize = 'vertical',
    className,
    fieldClassName,
    labelClassName,
    disabled = false,
    id,
    ...props 
  }, ref) => {
    const textareaId = id || React.useId();
    const descriptionId = `${textareaId}-description`;
    const errorId = `${textareaId}-error`;
    
    const validationState: ValidationState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';
    
    const sizeStyles = {
      sm: 'min-h-[60px] text-sm px-3 py-2',
      md: 'min-h-[80px] text-base px-4 py-3',
      lg: 'min-h-[100px] text-lg px-5 py-4',
    };
    
    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };
    
    const validationStyles = {
      default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
      error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
      success: 'border-success-500 focus:border-success-500 focus:ring-success-500',
      warning: 'border-warning-500 focus:border-warning-500 focus:ring-warning-500',
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label 
            htmlFor={textareaId} 
            className={cn(
              "block text-sm font-medium text-gray-700",
              disabled && "text-gray-400",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <Textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          aria-describedby={description ? descriptionId : undefined}
          aria-invalid={validationState === 'error'}
          aria-errormessage={error ? errorId : undefined}
          className={cn(
            sizeStyles[size],
            resizeStyles[resize],
            validationStyles[validationState],
            disabled && "bg-gray-50 cursor-not-allowed",
            fieldClassName
          )}
          {...props}
        />
        
        {description && !error && !success && !warning && (
          <p id={descriptionId} className="text-xs text-gray-500">
            {description}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="text-xs text-error-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-xs text-success-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {warning && (
          <p className="text-xs text-warning-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {warning}
          </p>
        )}
      </div>
    );
  }
);
EnhancedTextarea.displayName = 'EnhancedTextarea';

// Enhanced Select Component
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface EnhancedSelectProps extends BaseFormFieldProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  disabled?: boolean;
  name?: string;
}

export const EnhancedSelect = React.forwardRef<HTMLButtonElement, EnhancedSelectProps>(
  ({ 
    label,
    description,
    error,
    success,
    warning,
    required = false,
    size = 'md',
    value,
    defaultValue,
    onValueChange,
    placeholder = "선택하세요",
    options = [],
    groups = [],
    className,
    fieldClassName,
    labelClassName,
    disabled = false,
    name,
    ...props 
  }, ref) => {
    const selectId = React.useId();
    const descriptionId = `${selectId}-description`;
    const errorId = `${selectId}-error`;
    
    const validationState: ValidationState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';
    
    const sizeStyles = {
      sm: 'h-8 text-sm px-3',
      md: 'h-10 text-base px-4',
      lg: 'h-12 text-lg px-5',
    };
    
    const validationStyles = {
      default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
      error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
      success: 'border-success-500 focus:border-success-500 focus:ring-success-500',
      warning: 'border-warning-500 focus:border-warning-500 focus:ring-warning-500',
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label 
            htmlFor={selectId} 
            className={cn(
              "block text-sm font-medium text-gray-700",
              disabled && "text-gray-400",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <Select
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
          name={name}
        >
          <SelectTrigger
            ref={ref}
            id={selectId}
            aria-describedby={description ? descriptionId : undefined}
            aria-invalid={validationState === 'error'}
            aria-errormessage={error ? errorId : undefined}
            className={cn(
              sizeStyles[size],
              validationStyles[validationState],
              disabled && "bg-gray-50 cursor-not-allowed",
              fieldClassName
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {groups.length > 0 ? (
              groups.map((group, groupIndex) => (
                <SelectGroup key={groupIndex}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            ) : (
              options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        {description && !error && !success && !warning && (
          <p id={descriptionId} className="text-xs text-gray-500">
            {description}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="text-xs text-error-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-xs text-success-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {warning && (
          <p className="text-xs text-warning-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {warning}
          </p>
        )}
      </div>
    );
  }
);
EnhancedSelect.displayName = 'EnhancedSelect';

// Enhanced Checkbox Component
export interface EnhancedCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseFormFieldProps {
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

export const EnhancedCheckbox = React.forwardRef<HTMLInputElement, EnhancedCheckboxProps>(
  ({ 
    label,
    description,
    error,
    success,
    warning,
    required = false,
    size = 'md',
    checked,
    defaultChecked,
    onCheckedChange,
    indeterminate = false,
    className,
    fieldClassName,
    labelClassName,
    disabled = false,
    id,
    ...props 
  }, ref) => {
    const checkboxId = id || React.useId();
    const descriptionId = `${checkboxId}-description`;
    const errorId = `${checkboxId}-error`;
    
    const validationState: ValidationState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';
    
    const sizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    
    const validationStyles = {
      default: 'border-gray-300 text-primary-600 focus:ring-primary-500',
      error: 'border-error-500 text-error-600 focus:ring-error-500',
      success: 'border-success-500 text-success-600 focus:ring-success-500',
      warning: 'border-warning-500 text-warning-600 focus:ring-warning-500',
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              checked={checked}
              defaultChecked={defaultChecked}
              onChange={handleChange}
              disabled={disabled}
              aria-describedby={description ? descriptionId : undefined}
              aria-invalid={validationState === 'error'}
              aria-errormessage={error ? errorId : undefined}
              className={cn(
                sizeStyles[size],
                validationStyles[validationState],
                'rounded border focus:ring-2 focus:ring-offset-2',
                disabled && "opacity-50 cursor-not-allowed",
                fieldClassName
              )}
              {...props}
            />
          </div>
          {label && (
            <div className="ml-3 text-sm">
              <label 
                htmlFor={checkboxId} 
                className={cn(
                  "font-medium text-gray-700",
                  disabled && "text-gray-400",
                  labelClassName
                )}
              >
                {label}
                {required && <span className="text-error-500 ml-1">*</span>}
              </label>
            </div>
          )}
        </div>
        
        {description && !error && !success && !warning && (
          <p id={descriptionId} className="text-xs text-gray-500 ml-8">
            {description}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="text-xs text-error-500 flex items-center ml-8">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-xs text-success-500 flex items-center ml-8">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {warning && (
          <p className="text-xs text-warning-500 flex items-center ml-8">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {warning}
          </p>
        )}
      </div>
    );
  }
);
EnhancedCheckbox.displayName = 'EnhancedCheckbox';

// Enhanced Radio Group Component
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface EnhancedRadioGroupProps extends BaseFormFieldProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  orientation?: 'horizontal' | 'vertical';
  name: string;
}

export const EnhancedRadioGroup = React.forwardRef<HTMLDivElement, EnhancedRadioGroupProps>(
  ({ 
    label,
    description,
    error,
    success,
    warning,
    required = false,
    size = 'md',
    value,
    defaultValue,
    onValueChange,
    options,
    orientation = 'vertical',
    name,
    className,
    fieldClassName,
    labelClassName,
    disabled = false,
    ...props 
  }, ref) => {
    const radioGroupId = React.useId();
    const descriptionId = `${radioGroupId}-description`;
    const errorId = `${radioGroupId}-error`;
    
    const validationState: ValidationState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';
    
    const sizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    
    const validationStyles = {
      default: 'border-gray-300 text-primary-600 focus:ring-primary-500',
      error: 'border-error-500 text-error-600 focus:ring-error-500',
      success: 'border-success-500 text-success-600 focus:ring-success-500',
      warning: 'border-warning-500 text-warning-600 focus:ring-warning-500',
    };

    const handleChange = (optionValue: string) => {
      onValueChange?.(optionValue);
    };

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <label 
            className={cn(
              "block text-sm font-medium text-gray-700",
              disabled && "text-gray-400",
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div 
          role="radiogroup"
          aria-describedby={description ? descriptionId : undefined}
          aria-invalid={validationState === 'error'}
          aria-errormessage={error ? errorId : undefined}
          className={cn(
            orientation === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-3',
            fieldClassName
          )}
        >
          {options.map((option) => {
            const optionId = `${radioGroupId}-${option.value}`;
            const isChecked = value ? value === option.value : defaultValue === option.value;
            
            return (
              <div key={option.value} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    id={optionId}
                    name={name}
                    value={option.value}
                    checked={isChecked}
                    onChange={() => handleChange(option.value)}
                    disabled={disabled || option.disabled}
                    className={cn(
                      sizeStyles[size],
                      validationStyles[validationState],
                      'focus:ring-2 focus:ring-offset-2',
                      (disabled || option.disabled) && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label 
                    htmlFor={optionId} 
                    className={cn(
                      "font-medium text-gray-700",
                      (disabled || option.disabled) && "text-gray-400"
                    )}
                  >
                    {option.label}
                  </label>
                  {option.description && (
                    <p className="text-gray-500">{option.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {description && !error && !success && !warning && (
          <p id={descriptionId} className="text-xs text-gray-500">
            {description}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="text-xs text-error-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-xs text-success-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {warning && (
          <p className="text-xs text-warning-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {warning}
          </p>
        )}
      </div>
    );
  }
);
EnhancedRadioGroup.displayName = 'EnhancedRadioGroup';

// Form Group Component for organizing multiple form fields
export interface FormGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  spacing?: number;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  title,
  description,
  children,
  className,
  orientation = 'vertical',
  spacing = 4
}) => {
  return (
    <div className={cn("form-group", className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div 
        className={cn(
          orientation === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-6',
          `gap-${spacing}`
        )}
      >
        {children}
      </div>
    </div>
  );
};

// Export all components
export default {
  EnhancedInput,
  EnhancedTextarea,
  EnhancedSelect,
  EnhancedCheckbox,
  EnhancedRadioGroup,
  FormGroup
}; 