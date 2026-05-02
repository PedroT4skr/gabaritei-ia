// ===== HomeScreen — Tela Inicial =====

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/src/constants/theme';
import { useGabaritoStore } from '@/src/store/gabaritoStore';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void;
  delay: number;
}

function ActionCard({ title, subtitle, icon, gradient, onPress, delay }: ActionCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.actionCard}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardGradient}
        >
          <View style={styles.actionCardIcon}>
            <Ionicons name={icon} size={28} color={Colors.white} />
          </View>
          <Text style={styles.actionCardTitle}>{title}</Text>
          <Text style={styles.actionCardSubtitle}>{subtitle}</Text>
          <View style={styles.actionCardArrow}>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { gabaritos } = useGabaritoStore();
  
  const [focusKey, setFocusKey] = React.useState(0);

  React.useEffect(() => {
    if (isFocused) {
      setFocusKey(prev => prev + 1);
    }
  }, [isFocused]);

  return (
    <Animated.View 
      key={`home-${focusKey}`}
      entering={FadeInDown.duration(400).springify()} 
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Brand Header */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text style={styles.appName}>
            Gabaritei
            <Text style={{ color: Colors.primary }}>.</Text>
          </Text>
          <Text style={styles.tagline}>Sua correção inteligente de gabaritos</Text>
        </Animated.View>

        {/* Action Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        </View>

        <ActionCard
          title="Montar Gabarito"
          subtitle="Crie um gabarito personalizado com suas questões"
          icon="grid"
          gradient={['#00C471', '#059669']}
          onPress={() => router.push('/(tabs)/build')}
          delay={200}
        />

        <ActionCard
          title="Escanear Gabarito"
          subtitle="Use a câmera para corrigir automaticamente"
          icon="scan"
          gradient={['#2563EB', '#1D4ED8']}
          onPress={() => router.push('/(tabs)/scan')}
          delay={300}
        />

        <ActionCard
          title="Histórico"
          subtitle="Veja todas as correções anteriores"
          icon="time"
          gradient={['#8B5CF6', '#7C3AED']}
          onPress={() => router.push('/(tabs)/history')}
          delay={400}
        />

        {/* Saved Gabaritos */}
        {gabaritos.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gabaritos Salvos</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/build')}>
                <Text style={styles.seeAll}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {gabaritos.slice(0, 3).map((g, idx) => (
              <Animated.View 
                key={g.id} 
                entering={FadeInDown.delay(500 + idx * 50).duration(400)}
              >
                <TouchableOpacity
                  style={styles.savedCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/gabarito/${g.id}`)}
                >
                  <View style={styles.savedCardLeft}>
                    <View style={styles.savedCardIcon}>
                      <Ionicons name="document-text" size={20} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.savedCardName} numberOfLines={1}>{g.name}</Text>
                      <Text style={styles.savedCardInfo}>
                        {g.config.totalQuestions} questões • {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // Header
  header: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontFamily: Typography.fontFamily.brand,
    fontSize: 48,
    color: Colors.white,
    letterSpacing: -1.5,
  },
  tagline: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  seeAll: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
  },

  // Action Cards
  actionCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  actionCardGradient: {
    padding: Spacing.lg,
    minHeight: 110,
    justifyContent: 'center',
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.white,
  },
  actionCardSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  actionCardArrow: {
    position: 'absolute',
    right: Spacing.lg,
    top: '50%',
    marginTop: -9,
  },

  // Saved
  savedCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  savedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  savedCardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedCardName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  savedCardInfo: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
