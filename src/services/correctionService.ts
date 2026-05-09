// ===== Placeholder — services/correctionService.ts =====
// Será implementado na Fase 3 (OMR) e Fase 4 (Resultados)

import type {
  Gabarito,
  StudentAnswer,
  CorrectionResult,
  QuestionResult,
} from '../types/gabarito';

/** Gera ID único */
const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

/**
 * Corrige as respostas do aluno contra o gabarito oficial.
 */
export function correctAnswers(
  gabarito: Gabarito,
  studentAnswers: StudentAnswer[],
  studentName?: string
): CorrectionResult {
  const questionResults: QuestionResult[] = gabarito.questions.map((q) => {
    const studentAnswer =
      studentAnswers.find((sa) => sa.questionNumber === q.number)?.selectedAnswer || null;
    const isAnnulled = q.status === 'annulled';
    const isCorrect = !isAnnulled && studentAnswer === q.correctAnswer;

    return {
      questionNumber: q.number,
      correctAnswer: q.correctAnswer,
      studentAnswer,
      isCorrect,
      isAnnulled,
      points: q.points,
      earnedPoints: isAnnulled ? 0 : isCorrect ? q.points : 0,
    };
  });

  const totalCorrect = questionResults.filter((r) => r.isCorrect).length;
  const totalAnnulled = questionResults.filter((r) => r.isAnnulled).length;
  const totalWrong = gabarito.questions.length - totalCorrect - totalAnnulled;
  const totalPoints = questionResults.reduce(
    (sum, r) => sum + (r.isAnnulled ? 0 : r.points),
    0
  );
  const earnedPoints = questionResults.reduce((sum, r) => sum + r.earnedPoints, 0);
  const percentage =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    id: generateId(),
    gabaritoId: gabarito.id,
    gabaritoName: gabarito.name,
    createdAt: new Date().toISOString(),
    studentName,
    totalQuestions: gabarito.questions.length,
    totalCorrect,
    totalWrong,
    totalAnnulled,
    totalPoints,
    earnedPoints,
    percentage,
    questionResults,
  };
}
