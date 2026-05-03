import { Stack } from 'expo-router';
import { Colors } from '@/src/constants/theme';

export default function WizardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="export" />
    </Stack>
  );
}
