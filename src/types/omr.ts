export interface OmrPoint {
  x: number;
  y: number;
}

export interface OmrAlternativeResult {
  label: string;
  density: number; // 0 to 1 (1 = black/filled)
  isDetected: boolean;
  center: OmrPoint; // Pixel coordinates in the raw image
}

export interface OmrQuestionResult {
  number: number;
  correctAnswer: string | null;
  detectedAnswer: string | null;
  multipleDetectedAnswers?: string[];
  alternatives: OmrAlternativeResult[];
  status: 'correct' | 'wrong' | 'annulled' | 'none' | 'multiple';
  isCorrect?: boolean;
  isMultiple?: boolean;
  isAnnulled?: boolean;
  earnedPoints?: number;
  points?: number;
  confidence?: number;
}

export interface OmrCorrectionResult {
  gabaritoId: string;
  totalQuestions: number;
  totalCorrect: number;
  totalPoints?: number;
  earnedPoints?: number;
  totalScore: number;
  imageUri?: string;
  questions: OmrQuestionResult[];
  anchors: {
    all: OmrPoint[];
    imageWidth?: number;
    imageHeight?: number;
  };
}
