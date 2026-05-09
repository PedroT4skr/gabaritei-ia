// ===== Placeholder — hooks/useGabarito.ts =====
// Custom hook para operações comuns de gabarito
// Será expandido nas próximas fases

import { useCallback } from 'react';
import { useGabaritoStore } from '../store/gabaritoStore';
import type { Alternative } from '../types/gabarito';

/** Hook para interações com o gabarito atual */
export function useGabarito() {
  const store = useGabaritoStore();

  const fillRandomAnswers = useCallback(() => {
    for (const q of store.builderQuestions) {
      if (q.correctAnswer === null && q.status === 'normal') {
        const randomIdx = Math.floor(Math.random() * q.alternatives.length);
        store.setCorrectAnswer(q.number, q.alternatives[randomIdx]);
      }
    }
  }, [store]);

  const clearAllAnswers = useCallback(() => {
    for (const q of store.builderQuestions) {
      if (q.correctAnswer !== null) {
        store.setCorrectAnswer(q.number, q.correctAnswer); // toggle off
      }
    }
  }, [store]);

  const getProgress = useCallback(() => {
    const total = store.builderQuestions.length;
    const answered = store.builderQuestions.filter((q) => q.correctAnswer !== null).length;
    const annulled = store.builderQuestions.filter((q) => q.status === 'annulled').length;
    return { total, answered, annulled, percentage: total > 0 ? Math.round((answered / total) * 100) : 0 };
  }, [store.builderQuestions]);

  return {
    ...store,
    fillRandomAnswers,
    clearAllAnswers,
    getProgress,
  };
}
