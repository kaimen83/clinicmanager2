import React from 'react';
import { cn } from '@/lib/utils';
import { typography, type TextStyle } from '@/lib/tokens/typography';

// Typography variant mapping
const typographyVariants = {
  h1: 'h1',
  h2: 'h2', 
  h3: 'h3',
  h4: 'h4',
  bodyLarge: 'p',
  body: 'p',
  bodySmall: 'p',
  button: 'span',
  buttonLarge: 'span',
  label: 'label',
  caption: 'span',
  code: 'code',
} as const;

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant: TextStyle;
  as?: React.ElementType;
  children: React.ReactNode;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ variant, as, className, children, ...props }, ref) => {
    const Component = as || typographyVariants[variant] as React.ElementType;
    const style = typography.textStyles[variant];

    return (
      <Component
        ref={ref}
        className={cn(`text-${variant}`, className)}
        style={{
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          fontFamily: 'fontFamily' in style ? style.fontFamily : undefined,
        }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Typography.displayName = 'Typography';

// Predefined typography components for convenience
export const H1 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h1" className={cn('text-gray-900', className)} {...props} />
);

export const H2 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h2" className={cn('text-gray-900', className)} {...props} />
);

export const H3 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h3" className={cn('text-gray-900', className)} {...props} />
);

export const H4 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h4" className={cn('text-gray-900', className)} {...props} />
);

export const Body = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="body" className={cn('text-gray-700', className)} {...props} />
);

export const BodyLarge = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="bodyLarge" className={cn('text-gray-700', className)} {...props} />
);

export const BodySmall = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="bodySmall" className={cn('text-gray-600', className)} {...props} />
);

export const Label = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="label" className={cn('text-gray-700', className)} {...props} />
);

export const Caption = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="caption" className={cn('text-gray-500', className)} {...props} />
);

export const Code = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography 
    variant="code" 
    className={cn('bg-gray-100 text-gray-800 px-1 py-0.5 rounded font-mono', className)} 
    {...props} 
  />
); 