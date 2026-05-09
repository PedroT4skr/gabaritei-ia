import React, { useMemo, useState, memo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import OmrPNGPreview from '../OmrPNGPreview';

import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import QuestionGrid from '../QuestionGrid';
import type { Question, GabaritoConfig } from '../../types/gabarito';

interface StepReviewProps {
  builderQuestions: Question[];
  builderConfig: GabaritoConfig;
  builderName: string;
  onSave: () => void;
  onSaveAndExport: () => void;
}

function StepReview({ 
  builderQuestions, 
  builderConfig, 
  builderName, 
  onSave,
  onSaveAndExport
}: StepReviewProps) {
  const insets = useSafeAreaInsets();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const stats = useMemo(() => {
    const total = builderQuestions.length;
    const answered = builderQuestions.filter((q) => q.correctAnswer !== null).length;
    const annulled = builderQuestions.filter((q) => q.status === 'annulled').length;
    return { total, answered, annulled };
  }, [builderQuestions]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Native Static Preview Overlay */}
      {showPreviewModal && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay, { zIndex: 9999 }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setShowPreviewModal(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>Prévia da Folha OMR</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.previewContainer}>
            <OmrPNGPreview 
              questions={builderQuestions}
              config={builderConfig}
              name={builderName}
            />
          </View>
        </View>
      )}

      <QuestionGrid
        questions={builderQuestions}
        onSelectAnswer={() => {}} // Read-only but keeps same UI
        onToggleAnnul={() => {}} // Read-only but keeps same UI
        compact={builderQuestions.length > 50}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {/* Stats Card (Detail Style) */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Questões</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.answered}</Text>
                <Text style={styles.statLabel}>Definidas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: stats.annulled > 0 ? Colors.warning : Colors.textMuted }]}>
                  {stats.annulled}
                </Text>
                <Text style={styles.statLabel}>Anuladas</Text>
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => setShowPreviewModal(true)}
              >
                <Ionicons name="eye-outline" size={20} color={Colors.white} />
                <Text style={styles.actionBtnText}>Ver Prévia da Folha</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.saveExportBtn]}
                onPress={onSaveAndExport}
              >
                <Ionicons name="cloud-download-outline" size={20} color={Colors.white} />
                <Text style={styles.actionBtnText}>Salvar e Exportar</Text>
              </TouchableOpacity>
            </View>

            {/* List Header */}
            <View>
              <Text style={styles.sectionTitle}>Revisão das Respostas</Text>
              <Text style={styles.sectionSubtitle}>
                Confira se todas as marcações estão corretas antes de finalizar.
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

export default memo(StepReview);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.base,
  },
  headerWrapper: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.base,
  },

  // Stats Card matching Detail Screen
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },

  // Action Row
  actionRow: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Shadows.sm,
  },
  saveExportBtn: {
    backgroundColor: Colors.success,
  },
  actionBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.white,
  },

  // Section Headers
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#E2E8F0', // Light blue-gray for paper contrast
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#E2E8F0', // Contrast for the paper WebView
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
