/**
 * Design Token System - Typography
 * 치과 클리닉 관리 시스템 UI 현대화를 위한 타이포그래피 시스템
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ],
    mono: [
      '"JetBrains Mono"',
      'Monaco',
      'Consolas',
      '"Liberation Mono"',
      '"Courier New"',
      'monospace',
    ],
  },

  // Font Sizes - 제목 계층
  fontSize: {
    xs: '0.75rem',     // 12px - 라벨/캡션
    sm: '0.875rem',    // 14px - 작은 텍스트
    base: '1rem',      // 16px - 기본
    lg: '1.125rem',    // 18px - 중간 텍스트
    xl: '1.25rem',     // 20px - 서브섹션 (h3)
    '2xl': '1.5rem',   // 24px - 섹션 제목 (h2)
    '3xl': '1.875rem', // 30px - 페이지 제목 (h1)
    '4xl': '2.25rem',  // 36px - 대형 제목
    '5xl': '3rem',     // 48px - 특별한 경우
  },

  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Predefined Text Styles
  textStyles: {
    // Headings
    h1: {
      fontSize: '1.875rem', // 30px
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.5rem', // 24px
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.25rem', // 20px
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: 'normal',
    },
    h4: {
      fontSize: '1.125rem', // 18px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },

    // Body Text
    bodyLarge: {
      fontSize: '1.125rem', // 18px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: 'normal',
    },
    body: {
      fontSize: '1rem', // 16px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },
    bodySmall: {
      fontSize: '0.875rem', // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },

    // UI Text
    button: {
      fontSize: '0.875rem', // 14px
      fontWeight: '500',
      lineHeight: '1.25',
      letterSpacing: '0.025em',
    },
    buttonLarge: {
      fontSize: '1rem', // 16px
      fontWeight: '500',
      lineHeight: '1.25',
      letterSpacing: '0.025em',
    },
    label: {
      fontSize: '0.875rem', // 14px
      fontWeight: '500',
      lineHeight: '1.25',
      letterSpacing: 'normal',
    },
    caption: {
      fontSize: '0.75rem', // 12px
      fontWeight: '400',
      lineHeight: '1.25',
      letterSpacing: 'wide',
    },

    // Special
    code: {
      fontSize: '0.875rem', // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
      fontFamily: '"JetBrains Mono", Monaco, Consolas, monospace',
    },
  },
} as const;

// Typography utility types
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LineHeight = keyof typeof typography.lineHeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;
export type TextStyle = keyof typeof typography.textStyles;

// CSS Custom Properties generator
export const generateTypographyCSSVars = () => {
  const cssVars: Record<string, string> = {};

  // Font Sizes
  Object.entries(typography.fontSize).forEach(([size, value]) => {
    cssVars[`--font-size-${size}`] = value;
  });

  // Font Weights
  Object.entries(typography.fontWeight).forEach(([weight, value]) => {
    cssVars[`--font-weight-${weight}`] = value;
  });

  // Line Heights
  Object.entries(typography.lineHeight).forEach(([height, value]) => {
    cssVars[`--line-height-${height}`] = value;
  });

  // Letter Spacing
  Object.entries(typography.letterSpacing).forEach(([spacing, value]) => {
    cssVars[`--letter-spacing-${spacing}`] = value;
  });

  return cssVars;
};

export default typography; 