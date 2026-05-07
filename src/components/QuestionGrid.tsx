// ===== QuestionGrid — Grid interativo de questões =====

import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';

import { Colors, Typography, Spacing } from '@/src/constants/theme';
import BubbleRow from './BubbleRow';
import type { Question, Alternative } from '@/src/types/gabarito';

interface QuestionGridProps {
  questions: Question[];
  onSelectAnswer: (questionNumber: number, answer: Alternative) => void;
  onToggleAnnul: (questionNumber: number) => void;
  compact?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

interface GroupHeaderData {
  type: 'header';
  groupId: string;
  groupLabel: string;
  questionCount: number;
  answeredCount: number;
}

interface QuestionItemData {
  type: 'question';
  question: Question;
}

type ListItem = GroupHeaderData | QuestionItemData;

const GroupHeader = memo(function GroupHeader({ label, answered, total }: { label: string; answered: number; total: number }) {
  const progress = total > 0 ? (answered / total) * 100 : 0;

  return (
    <View style={styles.groupHeader}>
      <View style={styles.groupHeaderLeft}>
        <View style={styles.groupDot} />
        <Text style={styles.groupLabel}>{label}</Text>
      </View>
      <View style={styles.groupProgress}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {answered}/{total}
        </Text>
      </View>
    </View>
  );
});

function QuestionGrid({
  questions,
  onSelectAnswer,
  onToggleAnnul,
  compact = false,
  ListHeaderComponent,
}: QuestionGridProps) {
  // Build list data with group headers in O(N)
  const listData = useMemo<ListItem[]>(() => {
    if (questions.length === 0) return [];

    const items: ListItem[] = [];
    
    // Pass 1: Map group progress in O(N)
    const stats = new Map<string, { total: number; answered: number; start: number; end: number }>();
    for (const q of questions) {
      if (!stats.has(q.groupId)) {
        stats.set(q.groupId, { total: 0, answered: 0, start: q.number, end: q.number });
      }
      const s = stats.get(q.groupId)!;
      s.total++;
      if (q.correctAnswer !== null) s.answered++;
      s.start = Math.min(s.start, q.number);
      s.end = Math.max(s.end, q.number);
    }

    // Pass 2: Build final list items in O(N)
    let currentGroupId = '';
    for (const q of questions) {
      if (q.groupId !== currentGroupId) {
        currentGroupId = q.groupId;
        const s = stats.get(q.groupId)!;
        items.push({
          type: 'header',
          groupId: q.groupId,
          groupLabel: formatGroupLabel(q.groupId, s.start, s.end),
          questionCount: s.total,
          answeredCount: s.answered,
        });
      }
      items.push({ type: 'question', question: q });
    }

    return items;
  }, [questions]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return (
          <GroupHeader
            label={item.groupLabel}
            answered={item.answeredCount}
            total={item.questionCount}
          />
        );
      }

      return (
        <BubbleRow
          questionNumber={item.question.number}
          alternatives={item.question.alternatives}
          selectedAnswer={item.question.correctAnswer}
          status={item.question.status}
          points={item.question.points}
          onSelectAnswer={onSelectAnswer}
          onToggleAnnul={onToggleAnnul}
          compact={compact}
        />
      );
    },
    [onSelectAnswer, onToggleAnnul, compact]
  );

  const keyExtractor = useCallback(
    (item: ListItem) =>
      item.type === 'header' ? `h-${item.groupId}` : `q-${item.question.groupId}-${item.question.number}`,
    []
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<ListItem> | null | undefined, index: number) => {
      // Very strict height calculation for virtualization stabilization
      // Bounds check: if index is out of range, default to standard height to avoid crash
      const item = _data && index >= 0 && index < _data.length ? _data[index] : null;
      const height = item?.type === 'header' ? 56 : 56;
      
      return {
        length: height,
        offset: height * index,
        index,
      };
    },
    []
  );

  if (questions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Configure as questões para ver o gabarito
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ListHeaderComponent={ListHeaderComponent}
      maxToRenderPerBatch={20}
      windowSize={21}
      initialNumToRender={40}
      updateCellsBatchingPeriod={30}
      removeClippedSubviews={Platform.OS === 'android'} // Usually worth it on Android
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      decelerationRate="fast"
    />
  );
}

function formatGroupLabel(groupId: string, start?: number, end?: number): string {
  const names: Record<string, string> = {
    default: 'Todas as Questões',
    linguagens: 'Linguagens e Códigos',
    humanas: 'Ciências Humanas',
    natureza: 'Ciências da Natureza',
    matematica: 'Matemática',
  };
  const label = names[groupId] || `Grupo: ${groupId}`;
  if (start !== undefined && end !== undefined) {
    return `${label} (${start}–${end})`;
  }
  return label;
}

export default memo(QuestionGrid);

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },

  // Group header
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginTop: Spacing.xs,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  groupLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  groupProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    minWidth: 36,
    textAlign: 'right',
  },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
