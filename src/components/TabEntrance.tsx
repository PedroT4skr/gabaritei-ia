import React, { useEffect } from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  interpolate
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

interface TabEntranceProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export default function TabEntrance({ 
  children, 
  delay = 0, 
  duration = 400,
  style,
  ...props 
}: TabEntranceProps) {
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      // Direct spring to 1 (it was already at 0 from blur)
      progress.value = withSpring(1, {
        damping: 20,
        stiffness: 100,
        mass: 1,
      });
    } else {
      // Immediate reset to 0 when losing focus so it's ready for next visit
      progress.value = 0;
    }
  }, [isFocused, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [10, 0]),
        }
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
