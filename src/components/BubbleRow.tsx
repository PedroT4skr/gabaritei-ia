// ===== BubbleRow — Uma linha de questão com bolinhas interativas =====

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '@/src/constants/theme';
import type { Alternative, QuestionStatus } from '@/src/types/gabarito';

interface BubbleRowProps {
  questionNumber: number;
  alternatives: Alternative[];
  selectedAnswer: Alternative | null;
  status: QuestionStatus;
  points: number;
  onSelectAnswer: (questionNumber: number, answer: Alternative) => void;
  onToggleAnnul: (questionNumber: number) => void;
  compact?: boolean;
  disabled?: boolean;
}

interface BubbleProps {
  letter: Alternative;
  isSelected: boolean;
  isAnnulled: boolean;
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
}

const Bubble = memo(function Bubble({
  letter,
  isSelected,
  isAnnulled,
  onPress,
  compact,
  disabled = false,
}: BubbleProps) {
  const size = compact ? 32 : 38;
  const fontSize = compact ? Typography.sizes.xs : Typography.sizes.sm;

  return (
    <Pressable
      onPress={() => {
        if (!isAnnulled && !disabled) onPress();
      }}
      disabled={disabled || isAnnulled}
      style={({ pressed }) => [
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        isAnnulled && styles.bubbleAnnulled,
        isSelected && !isAnnulled && styles.bubbleSelected,
        !isSelected && !isAnnulled && (disabled ? styles.bubbleGhost : styles.bubbleEmpty),
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          { fontSize },
          isSelected && !isAnnulled && styles.bubbleTextSelected,
          isAnnulled && styles.bubbleTextAnnulled,
          disabled && !isSelected && !isAnnulled && { color: Colors.textMuted, opacity: 0.5 },
        ]}
      >
        {letter}
      </Text>
    </Pressable>
  );
});

function BubbleRow({
  questionNumber,
  alternatives,
  selectedAnswer,
  status,
  points,
  onSelectAnswer,
  onToggleAnnul,
  compact = false,
  disabled = false,
}: BubbleRowProps) {
  const isAnnulled = status === 'annulled';

  return (
    <View style={[
      styles.row, 
      isAnnulled && styles.rowAnnulled,
      disabled && styles.rowDisabled
    ]}>
      {/* Número da questão */}
      <View style={[styles.questionNumberContainer, compact && styles.questionNumberCompact]}>
        <Text
          style={[
            styles.questionNumber,
            isAnnulled && styles.questionNumberAnnulled,
            compact && styles.questionNumberTextCompact,
            disabled && { color: Colors.textSecondary }
          ]}
        >
          {String(questionNumber).padStart(2, '0')}
        </Text>
      </View>

      {/* Bolinhas */}
      <View style={styles.bubblesContainer}>
        {alternatives.map((alt) => (
          <Bubble
            key={alt}
            letter={alt}
            isSelected={selectedAnswer === alt}
            isAnnulled={isAnnulled}
            onPress={() => onSelectAnswer(questionNumber, alt)}
            compact={compact}
            disabled={disabled}
          />
        ))}
      </View>

      {/* Botão anular */}
      {!disabled && (
        <TouchableOpacity
          onPress={() => onToggleAnnul(questionNumber)}
          style={[styles.annulButton, isAnnulled && styles.annulButtonActive]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isAnnulled ? 'close-circle' : 'close-circle-outline'}
            size={18}
            color={isAnnulled ? Colors.error : Colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default memo(BubbleRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowAnnulled: {
    opacity: 0.5,
    backgroundColor: 'rgba(75, 85, 99, 0.1)',
  },
  rowDisabled: {
    opacity: 0.85,
    borderBottomColor: 'transparent',
  },

  questionNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  questionNumberCompact: {
    width: 30,
    height: 30,
    marginRight: Spacing.sm,
  },
  questionNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
  },
  questionNumberAnnulled: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  questionNumberTextCompact: {
    fontSize: Typography.sizes.xs,
  },

  bubblesContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },

  bubble: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  bubbleEmpty: {
    backgroundColor: Colors.bubbleEmpty,
    borderColor: Colors.bubbleEmptyBorder,
  },
  bubbleGhost: {
    backgroundColor: 'transparent',
    borderColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
  },
  bubbleSelected: {
    backgroundColor: Colors.bubbleSelected,
    borderColor: Colors.bubbleSelectedBorder,
  },
  bubbleAnnulled: {
    backgroundColor: Colors.bubbleAnnulled,
    borderColor: Colors.bubbleAnnulledBorder,
  },

  bubbleText: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
  },
  bubbleTextSelected: {
    color: Colors.white,
  },
  bubbleTextAnnulled: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },

  annulButton: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  annulButtonActive: {
    opacity: 1,
  },
});
