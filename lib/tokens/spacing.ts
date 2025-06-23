/**
 * Design Token System - Spacing
 * 치과 클리닉 관리 시스템 UI 현대화를 위한 간격 시스템
 */

export const spacing = {
  // Base spacing scale (rem units)
  scale: {
    0: '0rem',         // 0px
    px: '0.0625rem',   // 1px
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px
    3.5: '0.875rem',   // 14px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    7: '1.75rem',      // 28px
    8: '2rem',         // 32px
    9: '2.25rem',      // 36px
    10: '2.5rem',      // 40px
    11: '2.75rem',     // 44px
    12: '3rem',        // 48px
    14: '3.5rem',      // 56px
    16: '4rem',        // 64px
    20: '5rem',        // 80px
    24: '6rem',        // 96px
    28: '7rem',        // 112px
    32: '8rem',        // 128px
  },

  // Component-specific spacing
  component: {
    // Card padding
    cardPadding: '1.5rem',      // 24px
    cardPaddingSmall: '1rem',   // 16px
    cardPaddingLarge: '2rem',   // 32px

    // Modal padding
    modalPadding: '2rem',       // 32px
    modalPaddingSmall: '1.5rem', // 24px

    // Section spacing
    sectionGap: '3rem',         // 48px
    sectionGapSmall: '2rem',    // 32px

    // Form spacing
    formFieldGap: '1rem',       // 16px
    formSectionGap: '1.5rem',   // 24px

    // Button spacing
    buttonPaddingX: '1rem',     // 16px
    buttonPaddingY: '0.5rem',   // 8px
    buttonPaddingXLarge: '1.5rem', // 24px
    buttonPaddingYLarge: '0.75rem', // 12px

    // Table spacing
    tableCellPadding: '0.75rem', // 12px
    tableRowGap: '0.5rem',      // 8px

    // Navigation spacing
    navItemPadding: '0.75rem',  // 12px
    navGap: '0.5rem',          // 8px
  },

  // Layout spacing
  layout: {
    // Container margins
    containerMargin: '1rem',    // 16px
    containerMarginLarge: '2rem', // 32px

    // Grid gaps
    gridGap: '1rem',           // 16px
    gridGapLarge: '1.5rem',    // 24px
    gridGapSmall: '0.5rem',    // 8px

    // Page margins
    pageMarginX: '1rem',       // 16px
    pageMarginY: '2rem',       // 32px

    // Header/Footer spacing
    headerPadding: '1rem',     // 16px
    footerPadding: '2rem',     // 32px
  },

  // Responsive breakpoint margins
  responsive: {
    mobile: {
      margin: '1rem',          // 16px
      padding: '1rem',         // 16px
      gap: '0.75rem',         // 12px
    },
    tablet: {
      margin: '1.5rem',        // 24px
      padding: '1.5rem',       // 24px
      gap: '1rem',            // 16px
    },
    desktop: {
      margin: '2rem',          // 32px
      padding: '2rem',         // 32px
      gap: '1.5rem',          // 24px
    },
  },
} as const;

// Spacing utility types
export type SpacingScale = keyof typeof spacing.scale;
export type ComponentSpacing = keyof typeof spacing.component;
export type LayoutSpacing = keyof typeof spacing.layout;

// Helper functions
export const getSpacing = (scale: SpacingScale) => spacing.scale[scale];
export const getComponentSpacing = (component: ComponentSpacing) => spacing.component[component];
export const getLayoutSpacing = (layout: LayoutSpacing) => spacing.layout[layout];

// CSS Custom Properties generator
export const generateSpacingCSSVars = () => {
  const cssVars: Record<string, string> = {};

  // Base scale
  Object.entries(spacing.scale).forEach(([scale, value]) => {
    cssVars[`--space-${scale}`] = value;
  });

  // Component spacing
  Object.entries(spacing.component).forEach(([component, value]) => {
    // Convert camelCase to kebab-case
    const kebabCase = component.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    cssVars[`--space-${kebabCase}`] = value;
  });

  // Layout spacing
  Object.entries(spacing.layout).forEach(([layout, value]) => {
    // Convert camelCase to kebab-case
    const kebabCase = layout.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    cssVars[`--space-${kebabCase}`] = value;
  });

  return cssVars;
};

export default spacing; 