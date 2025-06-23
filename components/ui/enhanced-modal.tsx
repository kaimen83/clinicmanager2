import * as React from "react";
import { cn } from "@/lib/utils";
import { spacing, type SpacingScale } from "@/lib/tokens/spacing";
import { colors } from "@/lib/tokens/colors";
import { shadows } from "@/lib/tokens/shadows";
import { borders } from "@/lib/tokens/borders";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay
} from "./dialog";
import { EnhancedButton } from "./enhanced-button";
import { X } from "lucide-react";

// Enhanced Modal types
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalVariant = 'default' | 'elevated' | 'centered' | 'fullscreen';

// Modal Props
export interface EnhancedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscapeKey?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  overlayClassName?: string;
}

// Size styles
const modalSizeStyles: Record<ModalSize, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-[95vw] max-h-[95vh]"
};

// Variant styles
const modalVariantStyles: Record<ModalVariant, string> = {
  default: "bg-white border border-gray-200",
  elevated: "bg-white shadow-2xl border-0",
  centered: "bg-white border border-gray-200 my-auto",
  fullscreen: "w-screen h-screen max-w-none max-h-none m-0 rounded-none"
};

// Enhanced Modal Component
export const EnhancedModal = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  EnhancedModalProps
>(({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscapeKey = true,
  children,
  footer,
  className,
  contentClassName,
  headerClassName,
  footerClassName,
  overlayClassName,
  ...props
}, ref) => {
  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      {/* Enhanced Overlay */}
      <DialogOverlay 
        className={cn(
          "bg-black/60 backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          overlayClassName
        )}
        onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined}
      />
      
      {/* Enhanced Content */}
      <DialogContent
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 w-full",
          "translate-x-[-50%] translate-y-[-50%]",
          "gap-0 p-0 overflow-hidden",
          "duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "rounded-modal",
          modalSizeStyles[size],
          modalVariantStyles[variant],
          contentClassName,
          className
        )}
        onEscapeKeyDown={closeOnEscapeKey ? undefined : (e) => e.preventDefault()}
        {...props}
      >
        {/* Header */}
        {(title || description || showCloseButton) && (
          <DialogHeader className={cn(
            "flex flex-row items-start justify-between",
            "px-6 py-4 border-b border-gray-200",
            "space-y-0",
            headerClassName
          )}>
            <div className="flex flex-col space-y-1.5 text-left min-w-0 flex-1">
              {title && (
                <DialogTitle className="text-lg font-semibold text-gray-900 pr-8">
                  {title}
                </DialogTitle>
              )}
              {description && (
                <DialogDescription className="text-sm text-gray-600">
                  {description}
                </DialogDescription>
              )}
            </div>
            
            {showCloseButton && (
              <DialogClose asChild>
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0 ml-2"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">닫기</span>
                </EnhancedButton>
              </DialogClose>
            )}
          </DialogHeader>
        )}

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <DialogFooter className={cn(
            "px-6 py-4 border-t border-gray-200",
            "flex flex-row justify-end space-x-2 space-y-0",
            footerClassName
          )}>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
});

EnhancedModal.displayName = "EnhancedModal";

// Modal Hook for easier state management
export const useModal = (initialOpen = false) => {
  const [open, setOpen] = React.useState(initialOpen);

  const openModal = React.useCallback(() => setOpen(true), []);
  const closeModal = React.useCallback(() => setOpen(false), []);
  const toggleModal = React.useCallback(() => setOpen(prev => !prev), []);

  return {
    open,
    setOpen,
    openModal,
    closeModal,
    toggleModal
  };
};

// Confirmation Modal
export interface ConfirmationModalProps extends Omit<EnhancedModalProps, 'footer' | 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmVariant?: 'primary' | 'destructive';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  isLoading = false,
  ...props
}) => {
  const handleCancel = () => {
    onCancel?.();
    props.onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <EnhancedModal
      {...props}
      footer={
        <>
          <EnhancedButton
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </EnhancedButton>
          <EnhancedButton
            variant={confirmVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </EnhancedButton>
        </>
      }
    >
      <p className="text-gray-700">{message}</p>
    </EnhancedModal>
  );
};

// Info Modal
export interface InfoModalProps extends Omit<EnhancedModalProps, 'footer' | 'children'> {
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  message,
  confirmText = "확인",
  onConfirm,
  ...props
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    props.onOpenChange(false);
  };

  return (
    <EnhancedModal
      {...props}
      footer={
        <EnhancedButton
          variant="primary"
          onClick={handleConfirm}
        >
          {confirmText}
        </EnhancedButton>
      }
    >
      <p className="text-gray-700">{message}</p>
    </EnhancedModal>
  );
};

// Form Modal
export interface FormModalProps extends EnhancedModalProps {
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitVariant?: 'primary' | 'destructive';
  showCancelButton?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  onSubmit,
  submitText = "저장",
  cancelText = "취소",
  onCancel,
  isSubmitting = false,
  submitVariant = 'primary',
  showCancelButton = true,
  children,
  ...props
}) => {
  const handleCancel = () => {
    onCancel?.();
    props.onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <EnhancedModal
      {...props}
      footer={
        <>
          {showCancelButton && (
            <EnhancedButton
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {cancelText}
            </EnhancedButton>
          )}
          <EnhancedButton
            type="submit"
            variant={submitVariant}
            isLoading={isSubmitting}
            form="modal-form"
          >
            {submitText}
          </EnhancedButton>
        </>
      }
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </EnhancedModal>
  );
};

// Loading Modal
export interface LoadingModalProps extends Omit<EnhancedModalProps, 'children' | 'footer'> {
  message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  message = "처리 중입니다...",
  ...props
}) => {
  return (
    <EnhancedModal
      {...props}
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscapeKey={false}
      size="sm"
    >
      <div className="flex flex-col items-center space-y-4 py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-gray-700">{message}</p>
      </div>
    </EnhancedModal>
  );
};

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay
}; 