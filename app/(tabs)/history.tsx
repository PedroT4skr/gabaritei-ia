// ===== HistoryScreen — Tela de Histórico =====

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Svg, Circle, Rect } from 'react-native-svg';
import { Colors, Typography, Spacing, BorderRadius } from '@/src/constants/theme';
import { useGabaritoStore } from '@/src/store/gabaritoStore';
import type { CorrectionResult } from '@/src/types/gabarito';
import TabEntrance from '@/src/components/TabEntrance';

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="time-outline" size={48} color={Colors.textMuted} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Nenhuma correção ainda</Text>
      <Text style={styles.emptyText}>
        Quando você escanear e corrigir um gabarito, os resultados aparecerão aqui.
      </Text>
    </View>
  );
}

function CorrectionCard({ item, index, onPress, onDelete }: { item: CorrectionResult; index: number; onPress: () => void; onDelete: () => void }) {
  const percentColor =
    item.percentage >= 70
      ? Colors.success
      : item.percentage >= 50
        ? Colors.accent
        : Colors.error;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      {/* Percentage badge */}
      <View style={[styles.percentBadge, { backgroundColor: percentColor + '20' }]}>
        <Text style={[styles.percentText, { color: percentColor }]}>
          {Math.round(item.percentage)}%
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>
          {item.gabaritoName}
          {item.studentName ? ` — ${item.studentName}` : ''}
        </Text>
        <Text style={styles.cardDetails}>
          ✅ {item.totalCorrect} acertos • ❌ {item.totalWrong} erros • ⚪ {item.totalAnnulled} anuladas
        </Text>
        <Text style={styles.cardDate}>
          {new Date(item.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Score */}
      <View style={styles.cardScore}>
        <Text style={styles.cardScoreValue}>{item.earnedPoints}</Text>
        <Text style={styles.cardScoreMax}>/{item.totalPoints}</Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { corrections, deleteCorrection, clearHistory } = useGabaritoStore();

  const handleDelete = (id: string) => {
    Alert.alert('Excluir correção', 'Deseja excluir esta correção?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteCorrection(id) },
    ]);
  };

  const handleClearAll = () => {
    if (corrections.length === 0) return;
    Alert.alert(
      'Limpar histórico',
      'Isso vai excluir todas as correções salvas. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar tudo', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const [selectedCorrection, setSelectedCorrection] = React.useState<CorrectionResult | null>(null);
  const anchorsForOverlay = selectedCorrection?.omrGeoPayload
    ? (selectedCorrection.omrGeoPayload.anchors.all ??
      selectedCorrection.omrGeoPayload.anchors.detected ??
      [])
    : [];
  const questionOverlay = selectedCorrection?.omrGeoPayload?.questions ?? [];
  const confidenceValues = questionOverlay
    .map((q: any) => typeof q?.confidence === 'number' ? q.confidence : null)
    .filter((v: number | null): v is number => v !== null);
  const avgConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((s: number, v: number) => s + v, 0) / confidenceValues.length
    : null;
  const uncertainCount = questionOverlay.filter((q: any) => q?.status === 'none' || q?.status === 'multiple').length;

  return (
    <TabEntrance 
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Histórico</Text>
          <Text style={styles.headerSubtitle}>
            {corrections.length} {corrections.length === 1 ? 'correção' : 'correções'} salvas
          </Text>
        </View>
        {corrections.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.clearButtonText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {corrections.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={corrections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <CorrectionCard
              item={item}
              index={index}
              onPress={() => setSelectedCorrection(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal Visualizador da Folha Corrigida */}
      {selectedCorrection && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99, padding: 20 }]}>
          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: insets.top + 10, marginBottom: 10 }} onPress={() => setSelectedCorrection(null)}>
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 18, alignSelf: 'center', fontWeight: 'bold', marginBottom: 10 }}>Correção: {selectedCorrection.percentage.toFixed(0)}% de Acertos</Text>
          <Text style={{ color: '#d1d5db', fontSize: 13, alignSelf: 'center', marginBottom: 12 }}>
            {avgConfidence !== null ? `Confianca media do scan: ${(avgConfidence * 100).toFixed(0)}%` : 'Confianca nao registrada neste scan'}
            {questionOverlay.length > 0 ? `  |  Questoes incertas: ${uncertainCount}/${questionOverlay.length}` : ''}
          </Text>
          {selectedCorrection.imageUri ? (
            <View style={{ flex: 1, backgroundColor: '#111', borderRadius: 12, overflow: 'hidden' }}>
              <Image source={{ uri: selectedCorrection.imageUri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
              {selectedCorrection.omrGeoPayload && (
                <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${selectedCorrection.omrGeoPayload.anchors.imageWidth || 1080} ${selectedCorrection.omrGeoPayload.anchors.imageHeight || 1440}`}>
                  {anchorsForOverlay.map((anchor, i) => (
                    <Rect
                      key={`h-anchor-${i}`}
                      x={anchor.x - 8}
                      y={anchor.y - 8}
                      width={16}
                      height={16}
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="#2563EB"
                    />
                  ))}
                  {questionOverlay.map((q) =>
                    (q?.alternatives ?? []).map((alt: any, i: number) => {
                      const isSelected = alt.isDetected;
                      const isCorrectAnswer = alt.label === q.correctAnswer;
                      let strokeColor = '';
                      let fillColor = 'transparent';
                      let strokeWidth = 2.5;
                      if (q?.status === 'multiple' && isSelected) { strokeColor = '#FF9800'; fillColor = 'rgba(255,152,0,0.24)'; strokeWidth = 3.5; }
                      else if (isSelected && isCorrectAnswer) { strokeColor = '#00C853'; fillColor = 'rgba(0,200,83,0.22)'; strokeWidth = 3.5; }
                      else if (isSelected && !isCorrectAnswer) { strokeColor = '#FF3B30'; fillColor = 'rgba(255,59,48,0.2)'; strokeWidth = 3.5; }
                      else if (!isSelected && isCorrectAnswer) { strokeColor = '#FFCC00'; fillColor = 'rgba(255,204,0,0.18)'; strokeWidth = 3.5; }
                      else { return null; }
                      return <Circle key={`hq-${q.number}-alt-${i}`} cx={alt.center.x} cy={alt.center.y} r={13} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />;
                    })
                  )}
                </Svg>
              )}
            </View>
          ) : (
            <Text style={{ color: 'gray', textAlign: 'center', marginTop: 100 }}>Esta correção antiga não possui imagem arquivada.</Text>
          )}
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorMuted,
  },
  clearButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.error,
  },

  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 100,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  percentBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  cardDetails: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  cardDate: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardScoreValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
  },
  cardScoreMax: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  deleteButton: {
    padding: 4,
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
