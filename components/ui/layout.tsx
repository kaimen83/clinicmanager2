import React from 'react';
import { cn } from '@/lib/utils';
import { spacing, type SpacingScale } from '@/lib/tokens/spacing';

// Breakpoint types for responsive props
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
export type BreakpointWithBase = 'base' | Breakpoint;
export type ResponsiveValue<T> = T | Partial<Record<BreakpointWithBase, T>>;

// Helper function to generate responsive classes
const generateResponsiveClasses = <T extends string | number>(
  property: string,
  value: ResponsiveValue<T>
): string => {
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([breakpoint, val]) => `${breakpoint}:${property}-${val}`)
      .join(' ');
  }
  return `${property}-${value}`;
};

// Grid Component
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: ResponsiveValue<1 | 2 | 3 | 4 | 6 | 12>;
  gap?: ResponsiveValue<SpacingScale>;
  children: React.ReactNode;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ cols = 1, gap = 4, className, children, ...props }, ref) => {
    const colsClasses = generateResponsiveClasses('grid-cols', cols);
    const gapClasses = generateResponsiveClasses('gap', gap);
    
    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          colsClasses,
          gapClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Grid.displayName = 'Grid';

// Grid Item Component with responsive column spans
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: ResponsiveValue<1 | 2 | 3 | 4 | 6 | 8 | 12 | 'full'>;
  children: React.ReactNode;
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ colSpan = 1, className, children, ...props }, ref) => {
    const colSpanClasses = generateResponsiveClasses('col-span', colSpan);
    
    return (
      <div
        ref={ref}
        className={cn(colSpanClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GridItem.displayName = 'GridItem';

// Container Component with responsive system integration
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fluid';
  centered?: boolean;
  children: React.ReactNode;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = 'full', centered = true, className, children, ...props }, ref) => {
    const getContainerClass = () => {
      switch (size) {
        case 'sm':
          return 'max-w-screen-sm';
        case 'md':
          return 'max-w-screen-md';
        case 'lg':
          return 'max-w-screen-lg';
        case 'xl':
          return 'max-w-screen-xl';
        case 'fluid':
          return 'container-fluid';
        case 'full':
        default:
          return 'container';
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          getContainerClass(),
          centered && 'mx-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Container.displayName = 'Container';

// Stack Component (Flexbox) with responsive support
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: ResponsiveValue<'row' | 'col'>;
  gap?: ResponsiveValue<SpacingScale>;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  children: React.ReactNode;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ 
    direction = 'col', 
    gap = 4, 
    align = 'stretch', 
    justify = 'start', 
    wrap = false,
    className, 
    children, 
    ...props 
  }, ref) => {
    const directionClasses = generateResponsiveClasses('flex', direction);
    const gapClasses = generateResponsiveClasses('gap', gap);
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionClasses,
          gapClasses,
          `items-${align}`,
          `justify-${justify}`,
          wrap ? 'flex-wrap' : 'flex-nowrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Stack.displayName = 'Stack';

// HStack (Horizontal Stack) - convenience component
export const HStack = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  ({ ...props }, ref) => <Stack ref={ref} direction="row" {...props} />
);
HStack.displayName = 'HStack';

// VStack (Vertical Stack) - convenience component
export const VStack = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  ({ ...props }, ref) => <Stack ref={ref} direction="col" {...props} />
);
VStack.displayName = 'VStack';

// Spacer Component
export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpacingScale;
  direction?: 'horizontal' | 'vertical' | 'both';
}

export const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 4, direction = 'both', className, ...props }, ref) => {
    const spacingClasses = {
      horizontal: `mx-${size}`,
      vertical: `my-${size}`,
      both: `m-${size}`,
    };

    return (
      <div
        ref={ref}
        className={cn(spacingClasses[direction], className)}
        {...props}
      />
    );
  }
);
Spacer.displayName = 'Spacer';

// Section Component (semantic layout)
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article' | 'aside';
  padding?: SpacingScale;
  gap?: boolean; // whether to add section-gap class
  children: React.ReactNode;
}

export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  ({ as: Component = 'section', padding = 6, gap = true, className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn(
          `p-${padding}`,
          gap && 'section-gap',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Section.displayName = 'Section';

// Card Layout Component (using component spacing tokens)
export interface CardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'default' | 'lg';
  children: React.ReactNode;
}

export const CardLayout = React.forwardRef<HTMLDivElement, CardLayoutProps>(
  ({ padding = 'default', className, children, ...props }, ref) => {
    const paddingClasses = {
      sm: 'card-padding-sm',
      default: 'card-padding',
      lg: 'card-padding-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-gray-200 shadow-sm',
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardLayout.displayName = 'CardLayout';

// Modal Layout Component
export interface ModalLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'default';
  children: React.ReactNode;
}

export const ModalLayout = React.forwardRef<HTMLDivElement, ModalLayoutProps>(
  ({ padding = 'default', className, children, ...props }, ref) => {
    const paddingClasses = {
      sm: 'modal-padding-sm',
      default: 'modal-padding',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg shadow-xl',
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ModalLayout.displayName = 'ModalLayout';

// Enhanced Responsive utility component
export interface ResponsiveProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: Partial<Record<BreakpointWithBase, boolean>>;
  hide?: Partial<Record<BreakpointWithBase, boolean>>;
  children: React.ReactNode;
}

export const Responsive = React.forwardRef<HTMLDivElement, ResponsiveProps>(
  ({ show, hide, className, children, ...props }, ref) => {
    const generateVisibilityClasses = () => {
      const classes: string[] = [];
      
      // Handle show prop
      if (show) {
        // Start with hidden by default if show is specified
        classes.push('hidden');
        
        Object.entries(show).forEach(([breakpoint, shouldShow]) => {
          if (shouldShow) {
            if (breakpoint === 'base') {
              classes.push('block');
            } else {
              classes.push(`${breakpoint}:block`);
            }
          }
        });
      }
      
      // Handle hide prop
      if (hide) {
        Object.entries(hide).forEach(([breakpoint, shouldHide]) => {
          if (shouldHide) {
            if (breakpoint === 'base') {
              classes.push('hidden');
            } else {
              classes.push(`${breakpoint}:hidden`);
            }
          }
        });
      }
      
      return classes.join(' ');
    };

    return (
      <div
        ref={ref}
        className={cn(generateVisibilityClasses(), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Responsive.displayName = 'Responsive';

// Convenience components for common responsive patterns
export const ShowOnMobile = React.forwardRef<HTMLDivElement, Omit<ResponsiveProps, 'show' | 'hide'>>(
  ({ ...props }, ref) => (
    <Responsive ref={ref} show={{ base: true }} hide={{ sm: true }} {...props} />
  )
);
ShowOnMobile.displayName = 'ShowOnMobile';

export const ShowOnTablet = React.forwardRef<HTMLDivElement, Omit<ResponsiveProps, 'show' | 'hide'>>(
  ({ ...props }, ref) => (
    <Responsive ref={ref} show={{ md: true }} hide={{ base: true, lg: true }} {...props} />
  )
);
ShowOnTablet.displayName = 'ShowOnTablet';

export const ShowOnDesktop = React.forwardRef<HTMLDivElement, Omit<ResponsiveProps, 'show' | 'hide'>>(
  ({ ...props }, ref) => (
    <Responsive ref={ref} hide={{ base: true }} show={{ lg: true }} {...props} />
  )
);
ShowOnDesktop.displayName = 'ShowOnDesktop';

export const HideOnMobile = React.forwardRef<HTMLDivElement, Omit<ResponsiveProps, 'show' | 'hide'>>(
  ({ ...props }, ref) => (
    <Responsive ref={ref} hide={{ base: true }} show={{ sm: true }} {...props} />
  )
);
HideOnMobile.displayName = 'HideOnMobile';

// Layout presets for common responsive patterns
export const ResponsiveGrid = React.forwardRef<HTMLDivElement, Omit<GridProps, 'cols'>>(
  ({ ...props }, ref) => (
    <Grid 
      ref={ref} 
      cols={{ base: 1, sm: 2, md: 3, lg: 4 }} 
      {...props} 
    />
  )
);
ResponsiveGrid.displayName = 'ResponsiveGrid';

export const ResponsiveTwoColumn = React.forwardRef<HTMLDivElement, Omit<GridProps, 'cols'>>(
  ({ ...props }, ref) => (
    <Grid 
      ref={ref} 
      cols={{ base: 1, md: 2 }} 
      {...props} 
    />
  )
);
ResponsiveTwoColumn.displayName = 'ResponsiveTwoColumn';

export const ResponsiveThreeColumn = React.forwardRef<HTMLDivElement, Omit<GridProps, 'cols'>>(
  ({ ...props }, ref) => (
    <Grid 
      ref={ref} 
      cols={{ base: 1, sm: 2, lg: 3 }} 
      {...props} 
    />
  )
);
ResponsiveThreeColumn.displayName = 'ResponsiveThreeColumn'; 