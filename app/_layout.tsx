import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, Platform, AppState } from 'react-native';
import 'react-native-reanimated';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { Colors } from '@/src/constants/theme';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom theme to eliminate white flashes during transitions
const AntigravityTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.tabBackground,
    text: Colors.text,
    border: Colors.tabBorder,
    primary: Colors.primary,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
  });

  useEffect(() => {
    // Configure system navigation bar for Android
    const configureSystemUI = async () => {
      try {
        // Set OS-level window background to prevent white flashes during transitions
        await SystemUI.setBackgroundColorAsync(Colors.background);
        
        if (Platform.OS === 'android') {
          await NavigationBar.setButtonStyleAsync('light');
          await NavigationBar.setBackgroundColorAsync(Colors.background);
        }
      } catch (e) {
        console.log('Error configuring System UI:', e);
      }
    };

    if (loaded) {
      configureSystemUI().then(() => {
        SplashScreen.hideAsync();
      });

      // Maintain settings when app returns from background
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          configureSystemUI();
        }
      });

      return () => subscription.remove();
    }
  }, [loaded]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={AntigravityTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="wizard"
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="gabarito/[id]"
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
