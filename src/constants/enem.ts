// ===== Constantes específicas do ENEM =====

import { Colors } from './theme';
import type { Caderno, QuestionGroup } from '../types/gabarito';

/** Alternativas padrão (A-E) */
export const DEFAULT_ALTERNATIVES = ['A', 'B', 'C', 'D', 'E'];

/** Todas as letras possíveis para alternativas */
export const ALL_ALTERNATIVES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Cadernos padrão do ENEM */
export const ENEM_CADERNOS: Caderno[] = [
  {
    id: 'linguagens',
    name: 'Linguagens e Códigos',
    color: '#F59E0B',
    icon: 'book-outline',
    questionRange: { start: 1, end: 45 },
  },
  {
    id: 'humanas',
    name: 'Ciências Humanas',
    color: '#8B5CF6',
    icon: 'earth-outline',
    questionRange: { start: 46, end: 90 },
  },
  {
    id: 'natureza',
    name: 'Ciências da Natureza',
    color: '#10B981',
    icon: 'leaf-outline',
    questionRange: { start: 91, end: 135 },
  },
  {
    id: 'matematica',
    name: 'Matemática',
    color: '#3B82F6',
    icon: 'calculator-outline',
    questionRange: { start: 136, end: 180 },
  },
];

/** Presets de gabarito */
export const GABARITO_PRESETS = [
  {
    id: 'enem-dia1',
    name: 'ENEM - 1º Dia',
    description: 'Linguagens (45) + Humanas (45) = 90 questões',
    totalQuestions: 90,
    groups: [
      {
        id: 'linguagens',
        startQuestion: 1,
        endQuestion: 45,
        alternatives: DEFAULT_ALTERNATIVES,
        pointsPerQuestion: 1,
      },
      {
        id: 'humanas',
        startQuestion: 46,
        endQuestion: 90,
        alternatives: DEFAULT_ALTERNATIVES,
        pointsPerQuestion: 1,
      },
    ] satisfies QuestionGroup[],
  },
  {
    id: 'enem-dia2',
    name: 'ENEM - 2º Dia',
    description: 'Natureza (45) + Matemática (45) = 90 questões',
    totalQuestions: 90,
    groups: [
      {
        id: 'natureza',
        startQuestion: 1,
        endQuestion: 45,
        alternatives: DEFAULT_ALTERNATIVES,
        pointsPerQuestion: 1,
      },
      {
        id: 'matematica',
        startQuestion: 46,
        endQuestion: 90,
        alternatives: DEFAULT_ALTERNATIVES,
        pointsPerQuestion: 1,
      },
    ] satisfies QuestionGroup[],
  },
  {
    id: 'simulado-45',
    name: 'Simulado 45 Questões',
    description: '45 questões com 5 alternativas',
    totalQuestions: 45,
    groups: [
      {
        id: 'default',
        startQuestion: 1,
        endQuestion: 45,
        alternatives: DEFAULT_ALTERNATIVES,
        pointsPerQuestion: 1,
      },
    ] satisfies QuestionGroup[],
  },
  {
    id: 'personalizado',
    name: 'Personalizado',
    description: 'Configure do seu jeito',
    totalQuestions: 0,
    groups: [],
  },
];

/** Configurações padrão */
export const DEFAULTS = {
  totalQuestions: 90,
  alternativesCount: 5,
  pointsPerQuestion: 1,
  startLetter: 'A',
  endLetter: 'E',
  maxQuestions: 200,
  minQuestions: 1,
} as const;
