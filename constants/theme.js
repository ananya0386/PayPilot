// PayPilot design system: every colour, size and spacing value lives here so
// screens stay consistent. Change a value once and the whole app follows.
import { Platform } from 'react-native';

export const colors = {
  background: '#F7F8FA',
  primary: '#173B63',
  primaryDark: '#0F2A48',
  primarySoft: '#E8EEF5',
  accent: '#45D6A0',
  accentSoft: '#E3F8EF',
  card: '#FFFFFF',
  text: '#17202A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F0F1F4',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  error: '#DC2626',
  errorSoft: '#FEE2E2',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.55)',
  // Text/lines drawn on top of the dark primary colour
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255, 255, 255, 0.72)',
  onPrimaryFaint: 'rgba(255, 255, 255, 0.14)',
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };

export const typography = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text, lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 13, fontWeight: '400', color: colors.textSecondary, lineHeight: 18 },
  smallStrong: { fontSize: 13, fontWeight: '600', color: colors.text },
  caption: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  amountXL: { fontSize: 38, fontWeight: '800', letterSpacing: -1, color: colors.text },
  amountL: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
};

// Soft card shadow (Android uses elevation, iOS uses shadow*).
export const shadow = Platform.select({
  android: { elevation: 2 },
  default: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
});

// Minimum touch target recommended for accessibility.
export const touchTarget = 44;

export default { colors, spacing, radius, typography, shadow, touchTarget };
