import { Platform } from 'react-native';

// MODERN CYBER-FOCUS PALETTE
const PALETTE = {
  // Bases (The "Void")
  deepVoid: '#050508',     // Almost pure black, slight blue tint
  surface: '#12121A',      // Dark Navy surface for cards
  border: '#272735',       // Subtle separator

  // Accents (The "Energy")
  electricBlue: '#2563EB', // Primary Brand (Vibrant)
  neonCyan: '#06B6D4',     // Secondary / Info
  roseAlert: '#F43F5E',    // Blocked / Error (Modern Red)
  successTeal: '#10B981',  // Success

  // Text
  white: '#FFFFFF',
  mist: '#A1A1AA',         // Secondary text
};

export const Colors = {
  // We prioritize Dark Mode for this aesthetic
  light: {
    text: '#09090B',
    background: '#FFFFFF',
    tint: PALETTE.electricBlue,
    icon: '#71717A',
    tabIconDefault: '#71717A',
    tabIconSelected: PALETTE.electricBlue,
    primary: PALETTE.electricBlue,
    surface: '#F4F4F5',
    accent: PALETTE.roseAlert,
    success: PALETTE.successTeal,
    border: '#E4E4E7',
  },
  dark: {
    text: PALETTE.white,
    background: PALETTE.deepVoid,
    tint: PALETTE.neonCyan,
    icon: PALETTE.mist,
    tabIconDefault: PALETTE.mist,
    tabIconSelected: PALETTE.neonCyan,
    primary: PALETTE.electricBlue,
    surface: PALETTE.surface,
    accent: PALETTE.roseAlert,
    success: PALETTE.successTeal,
    border: PALETTE.border,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});