// ===== OMR Template Interface — V44.0 =====

export interface TemplateAnchor {
  id: string;
  x: number; // center X in template CSS-pixel space (595px wide)
  y: number;
}

export interface TemplateBubble {
  questionNumber: number;
  alternativeIndex: number;
  alternativeLabel: string;
  x: number;
  y: number;
}

export interface OmrTemplate {
  anchors: TemplateAnchor[];
  bubbles: TemplateBubble[];
  templateWidth: number; // always 595
}
