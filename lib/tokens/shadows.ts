/**
 * Design Token System - Shadows
 * 치과 클리닉 관리 시스템 UI 현대화를 위한 그림자 시스템
 */

export const shadows = {
  // Base shadow definitions
  base: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Inner shadows
  inner: {
    sm: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    default: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
    md: 'inset 0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },

  // Component-specific shadows
  component: {
    // Card shadows
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    cardHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
    cardActive: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

    // Modal shadows
    modal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
    modalBackdrop: '0 0 0 1px rgb(0 0 0 / 0.05)',

    // Button shadows
    button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    buttonHover: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    buttonActive: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',

    // Input shadows
    input: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    inputFocus: '0 0 0 3px rgb(59 130 246 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.05)',
    inputError: '0 0 0 3px rgb(239 68 68 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.05)',

    // Dropdown shadows
    dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    dropdownItem: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

    // Table shadows
    table: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    tableRow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

    // Navigation shadows
    nav: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    navItem: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

    // Tooltip shadows
    tooltip: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',

    // Floating elements
    floating: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    floatingFocus: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
  },

  // Colored shadows for different states
  colored: {
    primary: '0 4px 6px -1px rgb(59 130 246 / 0.1), 0 2px 4px -1px rgb(59 130 246 / 0.06)',
    success: '0 4px 6px -1px rgb(34 197 94 / 0.1), 0 2px 4px -1px rgb(34 197 94 / 0.06)',
    warning: '0 4px 6px -1px rgb(245 158 11 / 0.1), 0 2px 4px -1px rgb(245 158 11 / 0.06)',
    error: '0 4px 6px -1px rgb(239 68 68 / 0.1), 0 2px 4px -1px rgb(239 68 68 / 0.06)',
  },

  // Focus ring styles
  focus: {
    default: '0 0 0 3px rgb(59 130 246 / 0.1)',
    primary: '0 0 0 3px rgb(59 130 246 / 0.1)',
    success: '0 0 0 3px rgb(34 197 94 / 0.1)',
    warning: '0 0 0 3px rgb(245 158 11 / 0.1)',
    error: '0 0 0 3px rgb(239 68 68 / 0.1)',
  },
} as const;

// Shadow utility types
export type BaseShadow = keyof typeof shadows.base;
export type InnerShadow = keyof typeof shadows.inner;
export type ComponentShadow = keyof typeof shadows.component;
export type ColoredShadow = keyof typeof shadows.colored;
export type FocusShadow = keyof typeof shadows.focus;

// Helper functions
export const getBaseShadow = (shadow: BaseShadow) => shadows.base[shadow];
export const getComponentShadow = (shadow: ComponentShadow) => shadows.component[shadow];
export const getColoredShadow = (shadow: ColoredShadow) => shadows.colored[shadow];
export const getFocusShadow = (shadow: FocusShadow) => shadows.focus[shadow];

// CSS Custom Properties generator
export const generateShadowCSSVars = () => {
  const cssVars: Record<string, string> = {};

  // Base shadows
  Object.entries(shadows.base).forEach(([shadow, value]) => {
    cssVars[`--shadow-${shadow}`] = value;
  });

  // Inner shadows
  Object.entries(shadows.inner).forEach(([shadow, value]) => {
    cssVars[`--shadow-inner-${shadow}`] = value;
  });

  // Component shadows
  Object.entries(shadows.component).forEach(([shadow, value]) => {
    // Convert camelCase to kebab-case
    const kebabCase = shadow.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    cssVars[`--shadow-${kebabCase}`] = value;
  });

  // Colored shadows
  Object.entries(shadows.colored).forEach(([shadow, value]) => {
    cssVars[`--shadow-${shadow}`] = value;
  });

  // Focus shadows
  Object.entries(shadows.focus).forEach(([shadow, value]) => {
    cssVars[`--shadow-focus-${shadow}`] = value;
  });

  return cssVars;
};

export default shadows; 