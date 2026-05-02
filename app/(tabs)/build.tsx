import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import { useGabaritoStore } from '@/src/store/gabaritoStore';
import type { Gabarito } from '@/src/types/gabarito';
import TabEntrance from '@/src/components/TabEntrance';

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="grid-outline" size={48} color={Colors.textMuted} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Nenhum gabarito criado</Text>
      <Text style={styles.emptyText}>
        Toque no botão abaixo para criar seu primeiro gabarito personalizado.
      </Text>
    </View>
  );
}

function GabaritoCard({ item, index, onPress }: { 
  item: Gabarito; 
  index: number;
  onPress: () => void; 
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Left accent */}
      <View style={styles.cardAccent} />

      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardChip}>
              <Ionicons name="list" size={12} color={Colors.primary} />
              <Text style={styles.cardChipText}>{item.config.totalQuestions} questões</Text>
            </View>
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const { gabaritos, resetBuilder } = useGabaritoStore();
  
  const [isCreating, setIsCreating] = React.useState(false);
  
  useFocusEffect(
    React.useCallback(() => {
      setIsCreating(false);
      return () => {};
    }, [])
  );

  const handleCreateNew = () => {
    setIsCreating(true);
    setTimeout(() => {
      resetBuilder();
      router.push('/wizard');
    }, 50);
  };

  return (
    <TabEntrance 
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Meus Gabaritos</Text>
          <Text style={styles.headerSubtitle}>
            {gabaritos.length} {gabaritos.length === 1 ? 'gabarito' : 'gabaritos'} salvos
          </Text>
        </View>
      </View>

      {/* List */}
      {gabaritos.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={gabaritos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <GabaritoCard
              item={item}
              index={index}
              onPress={() => router.push({ pathname: '/gabarito/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — Criar Novo */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.85}
        disabled={isCreating}
      >
        <LinearGradient
          colors={['#00C471', '#059669']}
          style={styles.fabGradient}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="add" size={28} color={Colors.white} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </TabEntrance>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 140,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardAccent: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  cardInfo: {
    flex: 1,
    gap: 8,
  },
  cardName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  cardChipText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
  },
  cardDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },



  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.screenPadding,
    bottom: Spacing.xl + 75, // above tab bar + safe area buffer
    borderRadius: 30,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
