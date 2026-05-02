import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '@/src/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBackground,
          borderTopColor: Colors.tabBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 100 : 85,
          paddingBottom: Platform.OS === 'ios' ? 40 : 16,
          paddingTop: 12,
          paddingHorizontal: 20, // Add horizontal padding for slightly more inward items
          elevation: 0,
          borderTopLeftRadius: 0, // Ensure no gaps
          borderTopRightRadius: 0,
        },
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.medium,
          fontSize: 12,
          marginTop: 6,
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
          letterSpacing: 0.5, // Spread names a bit more
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="build"
        options={{
          title: 'Montar',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color }) => (
            <Ionicons name="scan" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
