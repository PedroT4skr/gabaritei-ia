// ===== Tipos fundamentais do Gabarito IA =====

/** Uma alternativa (A, B, C, D, E...) */
export type Alternative = string;

/** Status de uma questão */
export type QuestionStatus = 'normal' | 'annulled';

/** Configuração de um grupo de questões com mesmas alternativas */
export interface QuestionGroup {
  id: string;
  startQuestion: number;
  endQuestion: number;
  alternatives: Alternative[];  // ex: ['A', 'B', 'C', 'D', 'E']
  pointsPerQuestion: number;    // valor de cada questão neste grupo
}

/** Uma questão individual do gabarito */
export interface Question {
  number: number;
  alternatives: Alternative[];
  correctAnswer: Alternative | null;
  status: QuestionStatus;
  points: number;
  groupId: string;
  pointsBenefited?: boolean; // Se anulada, o aluno ganha os pontos? (Padrão: true)
}

/** Caderno ENEM (Linguagens, Humanas, Natureza, Matemática) */
export interface Caderno {
  id: string;
  name: string;
  color: string;
  icon: string;
  questionRange: { start: number; end: number };
}

/** Configuração completa de um gabarito */
export interface GabaritoConfig {
  totalQuestions: number;
  groups: QuestionGroup[];
  presetId?: string;
  cadernos: string[];
  defaultPointsPerQuestion: number;
  sheetTitle?: string;
  instructions?: string;
}

/** Gabarito completo salvo */
export interface Gabarito {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: GabaritoConfig;
  questions: Question[];
}

/** Resposta do aluno para uma questão */
export interface StudentAnswer {
  questionNumber: number;
  selectedAnswer: Alternative | null;
}

/** Resultado de uma questão corrigida */
export interface QuestionResult {
  questionNumber: number;
  correctAnswer: Alternative | null;
  studentAnswer: Alternative | null;
  isCorrect: boolean;
  isAnnulled: boolean;
  pointsBenefited?: boolean;
  points: number;
  earnedPoints: number;
}

/** Resultado completo de uma correção */
export interface CorrectionResult {
  id: string;
  gabaritoId: string;
  gabaritoName: string;
  createdAt: string;
  studentName?: string;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalAnnulled: number;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  questionResults: QuestionResult[];
  imageUri?: string;
  omrGeoPayload?: {
    anchors: {
      imageWidth: number;
      imageHeight: number;
      detected?: { x: number; y: number }[];
      all?: { x: number; y: number }[];
    };
    questions?: any[];
  }
}

/** Resultado de escaneamento OMR */
export interface ScanResult {
  imageUri: string;
  detectedAnswers: StudentAnswer[];
  confidence: number;
  processedAt: string;
}
