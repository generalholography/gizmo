/**
 * Editor Design Tokens
 * Consistent design system for the "Figma for 3D" editor UI
 */

/**
 * Color palette for the editor
 */
export const EDITOR_COLORS = {
  // Backgrounds
  panel: 'rgba(0, 0, 0, 0.9)',
  panelSecondary: 'rgba(0, 0, 0, 0.85)',
  field: 'rgba(255, 255, 255, 0.05)',
  fieldHover: 'rgba(255, 255, 255, 0.08)',
  fieldActive: 'rgba(255, 255, 255, 0.12)',
  activeBg: 'rgba(24, 144, 255, 0.1)',
  primaryBg: 'rgba(24, 144, 255, 0.15)',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderHover: 'rgba(255, 255, 255, 0.2)',
  borderActive: '#1890ff',
  divider: '#444444',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textTertiary: '#999999',
  textMuted: '#666666',

  // Semantic
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',

  // Component-specific
  headerBg: 'rgba(255, 255, 255, 0.02)',
} as const;

/**
 * Spacing system for consistent gaps and padding
 */
export const EDITOR_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,

  // Specific uses
  fieldGap: 4,
  sectionGap: 12,
  panelPadding: 16,
  headerPadding: 8,
} as const;

/**
 * Height system for consistent component sizes
 */
export const EDITOR_HEIGHTS = {
  // Row heights
  rowCompact: 24,
  rowStandard: 28,
  rowExpanded: 32,
  rowModule: 48,

  // Component heights
  input: 28,
  button: 28,
  buttonSmall: 24,
  iconButton: 24,
  header: 32,
} as const;

/**
 * Typography system
 */
export const EDITOR_TYPOGRAPHY = {
  // Font sizes
  fontSizeXs: 10,
  fontSizeSm: 11,
  fontSizeMd: 12,
  fontSizeLg: 14,
  fontSizeXl: 16,

  // Font weights
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.4,
  lineHeightRelaxed: 1.6,
} as const;

/**
 * Border radius values
 */
export const EDITOR_RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
} as const;
