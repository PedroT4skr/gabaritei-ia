// ===== WizardFooter — Botões Avançar/Voltar reutilizáveis =====

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';

interface WizardFooterProps {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  nextIcon?: keyof typeof Ionicons.glyphMap;
  nextGradient?: readonly [string, string, ...string[]];
  showBack?: boolean;
}

export default function WizardFooter({
  onNext,
  onBack,
  nextLabel = 'Avançar',
  backLabel = 'Voltar',
  nextDisabled = false,
  nextIcon = 'arrow-forward',
  nextGradient = ['#00C471', '#059669'],
  showBack = true,
}: WizardFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24 }]}>
      {showBack && onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}

      <TouchableOpacity
        style={[styles.nextButton, nextDisabled && styles.nextButtonDisabled]}
        onPress={onNext}
        disabled={nextDisabled}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={nextDisabled ? ['#374151', '#374151'] : nextGradient}
          style={styles.nextGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.nextText, nextDisabled && styles.nextTextDisabled]}>
            {nextLabel}
          </Text>
          <Ionicons
            name={nextIcon}
            size={18}
            color={nextDisabled ? Colors.textMuted : Colors.white}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    backgroundColor: '#0A0E1A', // Forcing solid dark color
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minWidth: 80,
  },
  backText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
  },
  nextButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  nextText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.white,
  },
  nextTextDisabled: {
    color: Colors.textMuted,
  },
});
