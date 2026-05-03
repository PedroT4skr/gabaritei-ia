import React, { useEffect, useMemo, useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Platform,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import OmrPNGPreview from '@/src/components/OmrPNGPreview';

import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import { useGabaritoStore } from '@/src/store/gabaritoStore';
import { generateGabaritoHTML } from '@/src/services/exportService';
import Shimmer from '@/src/components/Shimmer';
import BubbleRow from '@/src/components/BubbleRow';
import TabEntrance from '@/src/components/TabEntrance';
import type { Question } from '@/src/types/gabarito';

// Memoized Question Item for maximum performance
const QuestionItem = memo(function QuestionItem({ 
  q, 
  index,
  setCorrectAnswer,
  setAnnulled,
  setPointsBenefited,
  disabled
}: { 
  q: Question; 
  index: number;
  setCorrectAnswer: any;
  setAnnulled: any;
  setPointsBenefited: any;
  disabled: boolean;
}) {
  return (
    <View style={[styles.questionItem, !disabled && styles.questionItemEdit]}>
      <BubbleRow
        questionNumber={q.number}
        alternatives={q.alternatives}
        selectedAnswer={q.correctAnswer}
        status={q.status}
        points={q.points}
        onSelectAnswer={setCorrectAnswer}
        onToggleAnnul={(num) => {
          const isAnnulled = q.status === 'annulled';
          setAnnulled(num, !isAnnulled);
        }}
        compact={q.number > 50}
        disabled={disabled}
      />
      
      {q.status === 'annulled' && (
        <View style={styles.annulmentOptions}>
          <Text style={styles.annulmentText}>Atribuir pontos a todos?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity 
              style={[styles.toggleBtn, q.pointsBenefited && styles.toggleBtnActive]}
              onPress={() => setPointsBenefited(q.number, true)}
            >
              <Text style={[styles.toggleText, q.pointsBenefited && styles.toggleTextActive]}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, !q.pointsBenefited && styles.toggleBtnActiveError]}
              onPress={() => setPointsBenefited(q.number, false)}
            >
              <Text style={[styles.toggleText, !q.pointsBenefited && styles.toggleTextActive]}>Não</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

export default function GabaritoDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { 
    gabaritos, 
    loadGabarito, 
    builderQuestions, 
    builderName, 
    builderConfig,
    setCorrectAnswer,
    setAnnulled,
    setPointsBenefited,
    saveGabarito,
    deleteGabarito 
  } = useGabaritoStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Encontrar o gabarito e carregar no builder ao entrar
  useEffect(() => {
    let isMounted = true;
    if (id) {
      const exists = gabaritos.find((g: any) => g.id === id);
      if (exists) {
        // Load data immediately into the store
        loadGabarito(id as string);
        
        // Delay the heavy list rendering until AFTER the animation finishes
        const task = InteractionManager.runAfterInteractions(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
        return () => {
          isMounted = false;
          task.cancel();
        };
      } else {
        router.back();
      }
    }
  }, [id, loadGabarito]); // Removed 'gabaritos' to prevent infinite loops

  const stats = useMemo(() => {
    const total = builderQuestions.length;
    const answered = builderQuestions.filter((q: any) => q.correctAnswer !== null).length;
    const annulled = builderQuestions.filter((q: any) => q.status === 'annulled').length;
    return { total, answered, annulled };
  }, [builderQuestions]);

  const htmlContent = useMemo(() => {
    if (!showPreview) return '';
    const tempGabarito = {
      id: id as string,
      name: builderName,
      config: builderConfig,
      questions: builderQuestions,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    return generateGabaritoHTML(tempGabarito);
  }, [showPreview, builderQuestions, builderConfig, builderName, id]);

  const handleDelete = () => {
    Alert.alert(
      'Excluir Gabarito',
      'Tem certeza que deseja excluir este gabarito permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: () => {
            deleteGabarito(id as string);
            router.back();
          } 
        },
      ]
    );
  };

  const handleSave = () => {
    saveGabarito();
    setIsEditing(false);
    Alert.alert('Sucesso', 'Alterações salvas com sucesso!');
  };

  const handleCancel = () => {
    loadGabarito(id as string);
    setIsEditing(false);
  };

  const renderQuestion = useCallback(({ item, index }: { item: Question; index: number }) => (
    <View style={styles.questionItemWrapper}>
      <QuestionItem
        q={item}
        index={index}
        setCorrectAnswer={setCorrectAnswer}
        setAnnulled={setAnnulled}
        setPointsBenefited={setPointsBenefited}
        disabled={!isEditing}
      />
    </View>
  ), [isEditing, setCorrectAnswer, setAnnulled, setPointsBenefited]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Shimmer width={40} height={40} borderRadius={20} />
          <Shimmer width={150} height={24} style={{ marginLeft: 16 }} />
        </View>
        <View style={styles.content}>
          <Shimmer width="100%" height={120} style={{ marginBottom: 20 }} />
          <Shimmer width="100%" height={60} style={{ marginBottom: 12 }} />
          <Shimmer width="100%" height={60} style={{ marginBottom: 12 }} />
        </View>
      </View>
    );
  }

  return (
    <TabEntrance style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{builderName}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={builderQuestions}
        renderItem={renderQuestion}
        keyExtractor={(item) => `detail-q-${item.number}`}
        maxToRenderPerBatch={20}
        windowSize={21}
        initialNumToRender={40}
        updateCellsBatchingPeriod={30}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(_data, index) => ({
          length: 56, // BubbleRow height
          offset: 56 * index,
          index,
        })}
        ListHeaderComponent={
          <View>
            {/* Stats Card */}
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

            {/* Primary Actions */}
            <View style={styles.actionRow}>
              {!isEditing ? (
                <>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => setShowPreview(true)}
                  >
                    <Ionicons name="eye-outline" size={20} color={Colors.white} />
                    <Text style={styles.actionBtnText}>Ver Prévia</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: Colors.surface }]}
                    onPress={() => setIsEditing(true)}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Editar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                    onPress={handleSave}
                  >
                    <Ionicons name="save-outline" size={20} color={Colors.white} />
                    <Text style={styles.actionBtnText}>Salvar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: 'transparent' }]}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.actionBtnText, { color: Colors.textMuted }]}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>
              {isEditing ? 'Editando Respostas' : 'Respostas e Anulações'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isEditing 
                ? 'Altere as respostas ou anule questões conforme necessário.' 
                : 'Visualize as respostas corretas e questões anuladas.'}
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Preview Modal */}
      <Modal visible={showPreview} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Prévia da Folha OMR</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.previewContainer}>
            {showPreview && <OmrPNGPreview html={htmlContent} />}
          </View>
        </View>
      </Modal>
    </TabEntrance>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    marginHorizontal: Spacing.sm,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.base,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Shadows.md,
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
    backgroundColor: Colors.surfaceBorder,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.white,
  },
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
  questionItemWrapper: {
    marginBottom: Spacing.sm,
  },
  questionItem: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  questionItemEdit: {
    backgroundColor: Colors.surface,
    borderColor: 'rgba(59, 130, 246, 0.3)', // Subtle primary border
    ...Shadows.md,
  },
  annulmentOptions: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  annulmentText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleBtnActiveError: {
    backgroundColor: Colors.error,
  },
  toggleText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  previewModal: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  previewTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
  },
  previewContainer: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
