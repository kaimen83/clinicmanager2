/**
 * Design Token System - Borders
 * 치과 클리닉 관리 시스템 UI 현대화를 위한 보더 시스템
 */

export const borders = {
  // Border radius values
  radius: {
    none: '0',
    sm: '0.375rem',    // 6px - 버튼
    default: '0.5rem', // 8px - 기본
    md: '0.5rem',      // 8px - 카드
    lg: '0.75rem',     // 12px - 모달
    xl: '1rem',        // 16px - 특별한 컨테이너
    '2xl': '1.5rem',   // 24px - 특별한 경우
    full: '9999px',    // 완전히 둥근 모양
  },

  // Border widths
  width: {
    0: '0px',
    1: '1px',
    2: '2px',
    4: '4px',
    8: '8px',
  },

  // Border styles
  style: {
    none: 'none',
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
  },

  // Component-specific border radius
  component: {
    // Buttons
    button: '0.375rem',       // 6px
    buttonLarge: '0.5rem',    // 8px
    buttonSmall: '0.25rem',   // 4px

    // Cards
    card: '0.5rem',           // 8px
    cardLarge: '0.75rem',     // 12px

    // Modals
    modal: '0.75rem',         // 12px
    modalLarge: '1rem',       // 16px

    // Inputs
    input: '0.375rem',        // 6px
    inputLarge: '0.5rem',     // 8px

    // Tables
    table: '0.5rem',          // 8px
    tableCell: '0',           // No radius

    // Navigation
    nav: '0.5rem',            // 8px
    navItem: '0.375rem',      // 6px

    // Badges
    badge: '0.25rem',         // 4px
    badgeRound: '9999px',     // Fully rounded

    // Images
    image: '0.5rem',          // 8px
    avatar: '9999px',         // Fully rounded

    // Tooltips
    tooltip: '0.375rem',      // 6px

    // Dropdowns
    dropdown: '0.5rem',       // 8px
    dropdownItem: '0.25rem',  // 4px
  },

  // Border color values (referencing color tokens)
  color: {
    // Default borders
    default: 'var(--color-gray-200)',
    light: 'var(--color-gray-100)',
    medium: 'var(--color-gray-300)',
    dark: 'var(--color-gray-400)',

    // State borders
    primary: 'var(--color-primary-500)',
    success: 'var(--color-success-500)',
    warning: 'var(--color-warning-500)',
    error: 'var(--color-error-500)',

    // Interactive states
    hover: 'var(--color-gray-300)',
    focus: 'var(--color-primary-500)',
    active: 'var(--color-primary-600)',
    disabled: 'var(--color-gray-200)',

    // Transparent borders
    transparent: 'transparent',
  },

  // Complete border definitions for components
  complete: {
    // Default borders
    default: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-gray-200)',
    },
    light: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-gray-100)',
    },
    medium: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-gray-300)',
    },

    // State borders
    primary: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-primary-500)',
    },
    success: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-success-500)',
    },
    warning: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-warning-500)',
    },
    error: {
      width: '1px',
      style: 'solid',
      color: 'var(--color-error-500)',
    },

    // Focus states
    focus: {
      width: '2px',
      style: 'solid',
      color: 'var(--color-primary-500)',
    },
  },
} as const;

// Border utility types
export type BorderRadius = keyof typeof borders.radius;
export type BorderWidth = keyof typeof borders.width;
export type BorderStyle = keyof typeof borders.style;
export type ComponentBorderRadius = keyof typeof borders.component;
export type BorderColor = keyof typeof borders.color;
export type CompleteBorder = keyof typeof borders.complete;

// Helper functions
export const getBorderRadius = (radius: BorderRadius) => borders.radius[radius];
export const getComponentBorderRadius = (component: ComponentBorderRadius) => borders.component[component];
export const getBorderColor = (color: BorderColor) => borders.color[color];
export const getCompleteBorder = (border: CompleteBorder) => borders.complete[border];

// Border utility function
export const createBorder = (
  width: BorderWidth = 1,
  style: BorderStyle = 'solid',
  color: BorderColor = 'default'
) => {
  return `${borders.width[width]} ${borders.style[style]} ${borders.color[color]}`;
};

// CSS Custom Properties generator
export const generateBorderCSSVars = () => {
  const cssVars: Record<string, string> = {};

  // Border radius
  Object.entries(borders.radius).forEach(([radius, value]) => {
    cssVars[`--border-radius-${radius}`] = value;
  });

  // Border widths
  Object.entries(borders.width).forEach(([width, value]) => {
    cssVars[`--border-width-${width}`] = value;
  });

  // Component border radius
  Object.entries(borders.component).forEach(([component, value]) => {
    // Convert camelCase to kebab-case
    const kebabCase = component.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    cssVars[`--border-radius-${kebabCase}`] = value;
  });

  // Border colors
  Object.entries(borders.color).forEach(([color, value]) => {
    cssVars[`--border-color-${color}`] = value;
  });

  return cssVars;
};

export default borders; 