import React, { useEffect } from 'react';
import { StyleSheet, ViewProps, ViewStyle } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence 
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

interface ShimmerProps extends ViewProps {
  width?: ViewStyle['width'];
  height?: ViewStyle['height'];
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Componente de Shimmer para estados de carregamento (Skeleton Screens).
 * Usa Reanimated para uma animação de pulsação suave e performática.
 */
export default function Shimmer({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8, 
  style,
  ...props 
}: ShimmerProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1, // Loop infinito
      true // Reverte a animação
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.shimmer, 
        { width, height, borderRadius }, 
        animatedStyle, 
        style
      ]} 
      {...props} 
    />
  );
}

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: Colors.surfaceLight,
  },
});
