import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/src/constants/theme';

interface WizardHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  showClose?: boolean;
}

const DOT_SIZE = 8;
const DOT_GAP = 6;
const ACTIVE_DOT_WIDTH = 24;

export default function WizardHeader({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onClose,
  showClose = true,
}: WizardHeaderProps) {
  const insets = useSafeAreaInsets();
  const animatedStep = useSharedValue(step);

  useEffect(() => {
    animatedStep.value = withSpring(step, { damping: 15, stiffness: 120 });
  }, [step, animatedStep]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    // Calculate position based on step
    // Each dot is DOT_SIZE + DOT_GAP
    const stepPos = (animatedStep.value - 1) * (DOT_SIZE + DOT_GAP);
    
    return {
      left: stepPos,
      width: ACTIVE_DOT_WIDTH,
    };
  });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Definitive exit to root to resolve navigation stack crashes on Android
      router.replace('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top row: back + close */}
      <View style={styles.topRow}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        ) : (
          /* On Step 1, we don't show a back button in the header to avoid redundancy */
          <View style={styles.backButton} />
        )}

        {/* Step indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.dotsBackground}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  i + 1 < step && styles.stepDotDone,
                ]}
              />
            ))}
          </View>
          {/* Animated active indicator */}
          <Animated.View style={[styles.activeIndicator, animatedIndicatorStyle]} />
        </View>

        {showClose ? (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.closeButton} />
        )}
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.stepLabel}>Passo {step} de {totalSteps}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // New indicators
  stepIndicatorContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    minWidth: (DOT_SIZE + DOT_GAP) * 3 + ACTIVE_DOT_WIDTH, // enough for dots + indicator
  },
  dotsBackground: {
    flexDirection: 'row',
    gap: DOT_GAP,
    alignItems: 'center',
  },
  stepDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.surfaceLight,
  },
  stepDotDone: {
    backgroundColor: Colors.primaryDark,
  },
  activeIndicator: {
    position: 'absolute',
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },

  titleRow: {
    gap: 2,
  },
  stepLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
