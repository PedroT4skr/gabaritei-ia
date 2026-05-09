// ===== Zustand Store — Estado global do gabarito =====

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Gabarito,
  GabaritoConfig,
  Question,
  QuestionGroup,
  CorrectionResult,
  Alternative,
  QuestionStatus,
} from '../types/gabarito';
import { DEFAULT_ALTERNATIVES, DEFAULTS, ALL_ALTERNATIVES } from '../constants/enem';

// ===== Helper: gera ID único =====
const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// ===== Helper: cria questões a partir de grupos =====
const createQuestionsFromGroups = (groups: QuestionGroup[]): Question[] => {
  const questions: Question[] = [];
  for (const group of groups) {
    for (let i = group.startQuestion; i <= group.endQuestion; i++) {
      questions.push({
        number: i,
        alternatives: group.alternatives,
        correctAnswer: null,
        status: 'normal',
        points: group.pointsPerQuestion,
        groupId: group.id,
      });
    }
  }
  return questions.sort((a, b) => a.number - b.number);
};

// ===== Presets de Gabarito (ENEM, etc) =====
export const PRESETS = [
  {
    id: 'enem-90',
    name: 'ENEM 90 Questões',
    icon: 'school',
    description: 'Padrão oficial do ENEM (1 dia). 5 alternativas (A-E).',
    config: {
      totalQuestions: 90,
      groups: [
        {
          id: 'enem-1',
          startQuestion: 1,
          endQuestion: 90,
          alternatives: ALL_ALTERNATIVES.slice(0, 5),
          pointsPerQuestion: 10,
        }
      ]
    }
  },
  {
    id: 'simulado-45',
    name: 'Simulado 45 Questões',
    icon: 'library',
    description: 'Meia prova oficial. Ideal para simulados rápidos.',
    config: {
      totalQuestions: 45,
      groups: [
        {
          id: 'sim-1',
          startQuestion: 1,
          endQuestion: 45,
          alternatives: ALL_ALTERNATIVES.slice(0, 5),
          pointsPerQuestion: 10,
        }
      ]
    }
  },
  {
    id: 'custom',
    name: 'Gabarito Personalizado',
    icon: 'options',
    description: 'Defina o número de questões e alternativas do seu jeito.',
    config: {
      totalQuestions: 20,
      groups: [
        {
          id: 'custom-1',
          startQuestion: 1,
          endQuestion: 20,
          alternatives: ALL_ALTERNATIVES.slice(0, 5),
          pointsPerQuestion: 1,
        }
      ]
    }
  }
];

// ===== Helper: cria grupo padrão =====
const createDefaultGroup = (
  total: number,
  alternatives: Alternative[] = DEFAULT_ALTERNATIVES,
  points: number = DEFAULTS.pointsPerQuestion
): QuestionGroup => ({
  id: 'default',
  startQuestion: 1,
  endQuestion: total,
  alternatives,
  pointsPerQuestion: points,
});

// ===== Interface do Store =====
interface GabaritoState {
  // Estado
  gabaritos: Gabarito[];
  currentGabarito: Gabarito | null;
  corrections: CorrectionResult[];

  // Builder state (temporário, para a tela de montar)
  builderConfig: GabaritoConfig;
  builderQuestions: Question[];
  builderName: string;

  // Ações do Builder
  setBuilderName: (name: string) => void;
  setTotalQuestions: (total: number) => void;
  setBuilderGroups: (groups: QuestionGroup[]) => void;
  addGroup: (group: QuestionGroup) => void;
  updateGroup: (groupId: string, updates: Partial<QuestionGroup>) => void;
  removeGroup: (groupId: string) => void;
  setCorrectAnswer: (questionNumber: number, answer: Alternative) => void;
  toggleQuestionStatus: (questionNumber: number) => void;
  setAnnulled: (questionNumber: number, isAnnulled: boolean) => void;
  setPointsBenefited: (questionNumber: number, benefited: boolean) => void;
  setQuestionPoints: (questionNumber: number, points: number) => void;
  resetBuilder: () => void;
  loadPreset: (
    totalQuestions: number,
    groups: QuestionGroup[],
    name: string
  ) => void;
  setSheetTitle: (title: string) => void;
  setInstructions: (instructions: string) => void;

  // Ações CRUD do Gabarito
  saveGabarito: () => Gabarito;
  loadGabarito: (id: string) => void;
  deleteGabarito: (id: string) => void;
  duplicateGabarito: (id: string) => void;

  // Ações de Correção
  addCorrection: (correction: CorrectionResult) => void;
  deleteCorrection: (id: string) => void;
  clearHistory: () => void;
}

// ===== Builder Config Padrão =====
const defaultBuilderConfig: GabaritoConfig = {
  totalQuestions: DEFAULTS.totalQuestions,
  groups: [createDefaultGroup(DEFAULTS.totalQuestions)],
  cadernos: [],
  defaultPointsPerQuestion: DEFAULTS.pointsPerQuestion,
  sheetTitle: '',
  instructions: 'Preencha a bolinha completamente com caneta azul ou preta.',
};

// ===== Debounced Storage Wrapper (Fim do Lag) =====
const createDebouncedStorage = (storage: any, delay: number) => {
  let timeoutId: any;
  const pendingSetItems = new Map<string, string>();

  return {
    getItem: (name: string) => storage.getItem(name),
    removeItem: (name: string) => storage.removeItem(name),
    setItem: (name: string, value: string) => {
      pendingSetItems.set(name, value);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        pendingSetItems.forEach((v, k) => {
          storage.setItem(k, v);
        });
        pendingSetItems.clear();
      }, delay);
    },
  };
};

// ===== Store =====
export const useGabaritoStore = create<GabaritoState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      gabaritos: [],
      currentGabarito: null,
      corrections: [],

      builderConfig: { ...defaultBuilderConfig },
      builderQuestions: createQuestionsFromGroups(defaultBuilderConfig.groups),
      builderName: '',

      // ===== Builder =====
      setBuilderName: (name) => set({ builderName: name }),

      setTotalQuestions: (total) => {
        const clamped = Math.max(
          DEFAULTS.minQuestions,
          Math.min(DEFAULTS.maxQuestions, total)
        );
        const config = get().builderConfig;
        const newGroups = [
          createDefaultGroup(
            clamped,
            config.groups[0]?.alternatives || DEFAULT_ALTERNATIVES,
            config.defaultPointsPerQuestion
          ),
        ];
        const newConfig: GabaritoConfig = {
          ...config,
          totalQuestions: clamped,
          groups: newGroups,
        };
        set({
          builderConfig: newConfig,
          builderQuestions: createQuestionsFromGroups(newGroups),
        });
      },

      setBuilderGroups: (groups) => {
        const config = get().builderConfig;
        const total = groups.reduce(
          (sum, g) => sum + (g.endQuestion - g.startQuestion + 1),
          0
        );
        set({
          builderConfig: { ...config, groups, totalQuestions: total },
          builderQuestions: createQuestionsFromGroups(groups),
        });
      },

      addGroup: (group) => {
        const config = get().builderConfig;
        const newGroups = [...config.groups, group];
        const total = newGroups.reduce(
          (sum, g) => sum + (g.endQuestion - g.startQuestion + 1),
          0
        );
        set({
          builderConfig: { ...config, groups: newGroups, totalQuestions: total },
          builderQuestions: createQuestionsFromGroups(newGroups),
        });
      },

      updateGroup: (groupId, updates) => {
        const config = get().builderConfig;
        const newGroups = config.groups.map((g) =>
          g.id === groupId ? { ...g, ...updates } : g
        );
        const total = newGroups.reduce(
          (sum, g) => sum + (g.endQuestion - g.startQuestion + 1),
          0
        );
        // Preserve existing answers when updating group
        const oldQuestions = get().builderQuestions;
        const newQuestions = createQuestionsFromGroups(newGroups).map((nq) => {
          const existing = oldQuestions.find((oq) => oq.number === nq.number);
          if (existing && nq.alternatives.includes(existing.correctAnswer as Alternative)) {
            return { ...nq, correctAnswer: existing.correctAnswer, status: existing.status };
          }
          return nq;
        });
        set({
          builderConfig: { ...config, groups: newGroups, totalQuestions: total },
          builderQuestions: newQuestions,
        });
      },

      removeGroup: (groupId) => {
        const config = get().builderConfig;
        const newGroups = config.groups.filter((g) => g.id !== groupId);
        const total = newGroups.reduce(
          (sum, g) => sum + (g.endQuestion - g.startQuestion + 1),
          0
        );

        const oldQuestions = get().builderQuestions;
        const newQuestions = createQuestionsFromGroups(newGroups).map((nq) => {
          const existing = oldQuestions.find((oq) => oq.number === nq.number);
          if (existing && nq.alternatives.includes(existing.correctAnswer as Alternative)) {
            return { ...nq, correctAnswer: existing.correctAnswer, status: existing.status };
          }
          return nq;
        });

        set({
          builderConfig: { ...config, groups: newGroups, totalQuestions: total },
          builderQuestions: newQuestions,
        });
      },

      setCorrectAnswer: (questionNumber, answer) => {
        set((state) => ({
          builderQuestions: state.builderQuestions.map((q) =>
            q.number === questionNumber
              ? { ...q, correctAnswer: q.correctAnswer === answer ? null : answer }
              : q
          ),
        }));
      },

      toggleQuestionStatus: (questionNumber) => {
        set((state) => ({
          builderQuestions: state.builderQuestions.map((q) =>
            q.number === questionNumber
              ? {
                  ...q,
                  status:
                    q.status === 'normal'
                      ? ('annulled' as QuestionStatus)
                      : ('normal' as QuestionStatus),
                  pointsBenefited: q.status === 'normal' ? true : q.pointsBenefited,
                }
              : q
          ),
        }));
      },

      setAnnulled: (questionNumber, isAnnulled) => {
        set((state) => ({
          builderQuestions: state.builderQuestions.map((q) =>
            q.number === questionNumber
              ? {
                  ...q,
                  status: isAnnulled ? 'annulled' : 'normal',
                  pointsBenefited: isAnnulled ? true : undefined,
                }
              : q
          ),
        }));
      },

      setPointsBenefited: (questionNumber, benefited) => {
        set((state) => ({
          builderQuestions: state.builderQuestions.map((q) =>
            q.number === questionNumber ? { ...q, pointsBenefited: benefited } : q
          ),
        }));
      },

      setQuestionPoints: (questionNumber, points) => {
        set((state) => ({
          builderQuestions: state.builderQuestions.map((q) =>
            q.number === questionNumber ? { ...q, points } : q
          ),
        }));
      },

      resetBuilder: () => {
        set({
          builderConfig: { ...defaultBuilderConfig },
          builderQuestions: createQuestionsFromGroups(
            defaultBuilderConfig.groups
          ),
          builderName: '',
          currentGabarito: null, // Critical: fix stale ID when creating new
        });
      },

      loadPreset: (totalQuestions, groups, name) => {
        const presetId = PRESETS.find(p => p.name === name)?.id;
        const config: GabaritoConfig = {
          ...defaultBuilderConfig,
          totalQuestions,
          groups,
          presetId,
        };
        set({
          builderConfig: config,
          builderQuestions: createQuestionsFromGroups(groups),
          builderName: name,
        });
      },

      setSheetTitle: (title) => {
        set((state) => ({
          builderConfig: { ...state.builderConfig, sheetTitle: title },
        }));
      },

      setInstructions: (instructions) => {
        set((state) => ({
          builderConfig: { ...state.builderConfig, instructions },
        }));
      },



      // ===== CRUD =====
      saveGabarito: () => {
        const state = get();
        const now = new Date().toISOString();
        
        // 1. Identify context: Update existing ID or create New
        const existingById = state.currentGabarito ? state.gabaritos.find(g => g.id === state.currentGabarito?.id) : null;
        
        // 2. Prepare Name with Deduplication (#2, #3...)
        let targetName = state.builderName.trim() || `Gabarito ${state.gabaritos.length + 1}`;
        let finalName = targetName;
        
        // Only deduplicate against OTHER gabaritos
        const others = state.gabaritos.filter(g => g.id !== existingById?.id);
        
        let counter = 2;
        while (others.some(g => g.name.toLowerCase() === finalName.toLowerCase())) {
          finalName = `${targetName} #${counter}`;
          counter++;
        }

        const gabarito: Gabarito = {
          id: existingById?.id || generateId(),
          name: finalName,
          createdAt: existingById?.createdAt || now,
          updatedAt: now,
          config: { ...state.builderConfig },
          questions: [...state.builderQuestions],
        };

        const newGabaritos = existingById
          ? state.gabaritos.map((g) => (g.id === existingById.id ? gabarito : g))
          : [...state.gabaritos, gabarito];

        set({
          gabaritos: newGabaritos,
          currentGabarito: gabarito,
        });

        return gabarito;
      },

      loadGabarito: (id) => {
        const gabarito = get().gabaritos.find((g) => g.id === id);
        if (gabarito) {
          set({
            currentGabarito: gabarito,
            builderConfig: { ...gabarito.config },
            builderQuestions: [...gabarito.questions],
            builderName: gabarito.name,
          });
        }
      },

      deleteGabarito: (id) => {
        set((state) => ({
          gabaritos: state.gabaritos.filter((g) => g.id !== id),
          currentGabarito:
            state.currentGabarito?.id === id ? null : state.currentGabarito,
        }));
      },

      duplicateGabarito: (id) => {
        const original = get().gabaritos.find((g) => g.id === id);
        if (original) {
          const copy: Gabarito = {
            ...original,
            id: generateId(),
            name: `${original.name} (cópia)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((state) => ({
            gabaritos: [...state.gabaritos, copy],
          }));
        }
      },

      // ===== Correções =====
      addCorrection: (correction) => {
        set((state) => ({
          corrections: [correction, ...state.corrections],
        }));
      },

      deleteCorrection: (id) => {
        set((state) => ({
          corrections: state.corrections.filter((c) => c.id !== id),
        }));
      },

      clearHistory: () => {
        set({ corrections: [] });
      },
    }),
    {
      name: 'gabarito-ia-storage',
      storage: createJSONStorage(() => createDebouncedStorage(AsyncStorage, 2000)),
      partialize: (state) => ({
        gabaritos: state.gabaritos,
        corrections: state.corrections,
      }),
    }
  )
);
