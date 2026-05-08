import React, { useCallback, useMemo, memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, InteractionManager, ActivityIndicator } from 'react-native';
import QuestionGrid from '../QuestionGrid';
import { Colors, Typography, Spacing } from '../../constants/theme';
import type { Alternative, Question, GabaritoConfig } from '../../types/gabarito';

interface StepFillProps {
  builderQuestions: Question[];
  builderConfig: GabaritoConfig;
  setCorrectAnswer: (questionNumber: number, answer: Alternative) => void;
  toggleQuestionStatus: (questionNumber: number) => void;
}

function StepFill({ 
  builderQuestions, 
  builderConfig, 
  setCorrectAnswer, 
  toggleQuestionStatus 
}: StepFillProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const answeredCount = useMemo(
    () => builderQuestions.filter((q) => q.correctAnswer !== null).length,
    [builderQuestions]
  );
  const annulledCount = useMemo(
    () => builderQuestions.filter((q) => q.status === 'annulled').length,
    [builderQuestions]
  );
  const remainingCount = builderConfig.totalQuestions - answeredCount - annulledCount;

  const handleSelectAnswer = useCallback(
    (questionNumber: number, answer: Alternative) => setCorrectAnswer(questionNumber, answer),
    [setCorrectAnswer]
  );
  const handleToggleAnnul = useCallback(
    (questionNumber: number) => toggleQuestionStatus(questionNumber),
    [toggleQuestionStatus]
  );

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.statText}>{answeredCount} preenchidas</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.textMuted }]} />
          <Text style={styles.statText}>{remainingCount} vazias</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.statText}>{annulledCount} anuladas</Text>
        </View>
      </View>

      {/* Grid - Only mount after interactions to avoid transition lag */}
      {isReady ? (
        <QuestionGrid
          questions={builderQuestions}
          onSelectAnswer={handleSelectAnswer}
          onToggleAnnul={handleToggleAnnul}
          compact={builderConfig.totalQuestions > 100}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

export default memo(StepFill);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
