/**
 * Design Token System - Main Index
 * 치과 클리닉 관리 시스템 UI 현대화를 위한 통합 디자인 토큰 시스템
 */

import { colors, generateColorCSSVars } from './colors';
import { typography, generateTypographyCSSVars } from './typography';
import { spacing, generateSpacingCSSVars } from './spacing';
import { shadows, generateShadowCSSVars } from './shadows';
import { borders, generateBorderCSSVars } from './borders';

// Export all tokens
export { colors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { shadows } from './shadows';
export { borders } from './borders';

// Export all types
export type {
  ColorScale,
  ColorName,
  ColorValue,
} from './colors';

export type {
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
  TextStyle,
} from './typography';

export type {
  SpacingScale,
  ComponentSpacing,
  LayoutSpacing,
} from './spacing';

export type {
  BaseShadow,
  InnerShadow,
  ComponentShadow,
  ColoredShadow,
  FocusShadow,
} from './shadows';

export type {
  BorderRadius,
  BorderWidth,
  BorderStyle,
  ComponentBorderRadius,
  BorderColor,
  CompleteBorder,
} from './borders';

// Main tokens object
export const tokens = {
  colors,
  typography,
  spacing,
  shadows,
  borders,
} as const;

// Generate all CSS custom properties
export const generateAllCSSVars = () => {
  return {
    ...generateColorCSSVars(),
    ...generateTypographyCSSVars(),
    ...generateSpacingCSSVars(),
    ...generateShadowCSSVars(),
    ...generateBorderCSSVars(),
  };
};

// Generate CSS string for injection
export const generateCSSString = () => {
  const cssVars = generateAllCSSVars();
  const cssProperties = Object.entries(cssVars)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n');

  return `:root {\n${cssProperties}\n}`;
};

// Utility functions for easy access
export const getToken = {
  color: (name: keyof typeof colors, shade?: string) => {
    const colorGroup = colors[name];
    if (typeof colorGroup === 'object' && shade) {
      return (colorGroup as any)[shade];
    }
    return colorGroup;
  },
  
  fontSize: (size: keyof typeof typography.fontSize) => typography.fontSize[size],
  
  fontWeight: (weight: keyof typeof typography.fontWeight) => typography.fontWeight[weight],
  
  spacing: (scale: keyof typeof spacing.scale) => spacing.scale[scale],
  
  shadow: (shadow: keyof typeof shadows.base) => shadows.base[shadow],
  
  borderRadius: (radius: keyof typeof borders.radius) => borders.radius[radius],
};

// Theme configuration
export const theme = {
  // Primary brand colors
  primary: {
    50: colors.primary[50],
    100: colors.primary[100],
    500: colors.primary[500],
    600: colors.primary[600],
    700: colors.primary[700],
  },
  
  // Semantic colors
  semantic: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.primary[500],
  },
  
  // Background colors
  background: {
    primary: colors.background.primary,
    secondary: colors.background.secondary,
    tertiary: colors.background.tertiary,
  },
  
  // Text colors
  text: {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    tertiary: colors.text.tertiary,
    muted: colors.text.muted,
    inverse: colors.text.inverse,
  },
  
  // Border colors
  border: {
    light: colors.border.light,
    medium: colors.border.medium,
    dark: colors.border.dark,
  },
  
  // Component sizes
  components: {
    button: {
      padding: {
        x: spacing.component.buttonPaddingX,
        y: spacing.component.buttonPaddingY,
      },
      borderRadius: borders.component.button,
      shadow: shadows.component.button,
    },
    
    card: {
      padding: spacing.component.cardPadding,
      borderRadius: borders.component.card,
      shadow: shadows.component.card,
    },
    
    modal: {
      padding: spacing.component.modalPadding,
      borderRadius: borders.component.modal,
      shadow: shadows.component.modal,
    },
    
    input: {
      borderRadius: borders.component.input,
      shadow: shadows.component.input,
    },
  },
} as const;

// Export theme type
export type Theme = typeof theme;

export default tokens; 