// ===== Tema Visual — Gabarito IA =====
// Inspirado nas cores oficiais do ENEM com dark mode premium

export const Colors = {
  // Cores primárias (ENEM-inspired)
  primary: '#00C471',        // Verde vibrante
  primaryDark: '#00A85C',
  primaryLight: '#33D68C',
  primaryMuted: 'rgba(0, 196, 113, 0.15)',

  secondary: '#2563EB',      // Azul royal
  secondaryDark: '#1D4ED8',
  secondaryLight: '#3B82F6',
  secondaryMuted: 'rgba(37, 99, 235, 0.15)',

  accent: '#F59E0B',         // Amarelo/dourado
  accentDark: '#D97706',
  accentMuted: 'rgba(245, 158, 11, 0.15)',

  // Feedback
  success: '#10B981',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Backgrounds (dark mode)
  background: '#0A0E1A',
  backgroundSecondary: '#111827',
  backgroundTertiary: '#1F2937',
  card: '#161D2E',
  cardHover: '#1C2540',
  cardBorder: '#2A3350',

  // Surfaces
  surface: '#1A2236',
  surfaceLight: '#243049',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',

  // Text
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0A0E1A',

  // Bubbles (para o grid de questões)
  bubbleEmpty: '#2A3350',
  bubbleEmptyBorder: '#3D4B6B',
  bubbleSelected: '#00C471',
  bubbleSelectedBorder: '#00E080',
  bubbleCorrect: '#10B981',
  bubbleWrong: '#EF4444',
  bubbleAnnulled: '#4B5563',
  bubbleAnnulledBorder: '#6B7280',

  // Tab bar
  tabActive: '#00C471',
  tabInactive: '#6B7280',
  tabBackground: '#0F1525',
  tabBorder: '#1F2937',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  divider: 'rgba(255, 255, 255, 0.06)',
  shimmer: 'rgba(255, 255, 255, 0.04)',
} as const;

export const Gradients = {
  primary: ['#00C471', '#00A85C'] as const,
  secondary: ['#2563EB', '#1D4ED8'] as const,
  accent: ['#F59E0B', '#D97706'] as const,
  header: ['#0F1A30', '#0A0E1A'] as const,
  card: ['#1A2236', '#161D2E'] as const,
  hero: ['#00C471', '#2563EB'] as const,
  dark: ['#111827', '#0A0E1A'] as const,
} as const;

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    black: 'Inter_900Black',
    brand: 'Outfit_900Black',
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 20,
  lg: 24,
  xl: 28,
  screenPadding: 32,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;
