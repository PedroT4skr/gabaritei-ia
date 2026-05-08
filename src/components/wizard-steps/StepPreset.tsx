import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { PRESETS } from '../../store/gabaritoStore';

interface StepPresetProps {
  selectedPreset: string | null;
  loadingId?: string | null;
  onSelect: (id: string) => void;
}

function StepPreset({ selectedPreset, loadingId, onSelect }: StepPresetProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetCard,
                selectedPreset === preset.id && styles.presetCardActive,
              ]}
              onPress={() => onSelect(preset.id)}
              activeOpacity={0.7}
              disabled={loadingId !== null && loadingId !== undefined}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, selectedPreset === preset.id && styles.iconContainerActive]}>
                  <Ionicons 
                    name={preset.icon as any} 
                    size={24} 
                    color={selectedPreset === preset.id ? Colors.white : Colors.primary} 
                  />
                </View>
                {loadingId === preset.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : selectedPreset === preset.id && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={Colors.white} />
                  </View>
                )}
              </View>
              
              <Text style={styles.presetName}>{preset.name}</Text>
              <Text style={styles.presetDescription}>{preset.description}</Text>
              
              <View style={styles.tagContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{preset.config.totalQuestions} questões</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{preset.config.groups[0].alternatives.length} alt.</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default memo(StepPreset);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  contentInner: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.base,
  },
  presetCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.md,
  },
  presetCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: Colors.primary,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    marginBottom: 4,
  },
  presetDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
});
