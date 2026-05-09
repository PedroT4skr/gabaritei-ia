// ===== Serviço de Exportação — PNG, JPG, PDF =====

import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import type { Gabarito } from '../types/gabarito';

type ExportFormat = 'png' | 'jpg' | 'pdf';

interface ExportResult {
  uri: string;
  format: ExportFormat;
  success: boolean;
  error?: string;
}

/**
 * Captura uma View como imagem PNG ou JPG
 */
export async function captureViewAsImage(
  viewRef: React.RefObject<any>,
  format: 'png' | 'jpg' = 'png',
  quality: number = 1
): Promise<ExportResult> {
  try {
    const uri = await captureRef(viewRef, {
      format,
      quality,
      result: 'tmpfile',
    });
    return { uri, format, success: true };
  } catch (error: any) {
    return { uri: '', format, success: false, error: error.message };
  }
}

/**
 * Gera PDF a partir de HTML do gabarito
 */
export async function generatePDF(gabarito: Gabarito): Promise<ExportResult> {
  try {
    const html = generateGabaritoHTML(gabarito);
    const { uri } = await Print.printToFileAsync({
      html,
      width: 595,  // A4 width in points
      height: 842, // A4 height in points
    });
    return { uri, format: 'pdf', success: true };
  } catch (error: any) {
    return { uri: '', format: 'pdf', success: false, error: error.message };
  }
}

/**
 * Compartilha um arquivo via share nativo
 */
export async function shareFile(uri: string, mimeType: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Compartilhamento não disponível neste dispositivo');
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Exportar Gabarito',
  });
}

/**
 * Salva imagem na galeria
 */
export async function saveToGallery(uri: string): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão para acessar a galeria negada');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

/**
 * Gera HTML formatado do gabarito para exportação como PDF (Modelo Aluno/OMR)
 */
export function generateGabaritoHTML(gabarito: Gabarito): string {
  const { config, name, questions } = gabarito;
  const sheetTitle = config.sheetTitle || name;

  // Logic to split questions into columns
  const questionsPerColumn = 30;
  const columnsCount = Math.ceil(questions.length / questionsPerColumn);
  
  let columnsHTML = '';
  for (let i = 0; i < columnsCount; i++) {
    const start = i * questionsPerColumn;
    const end = Math.min(start + questionsPerColumn, questions.length);
    const columnQuestions = questions.slice(start, end);

    let rowsHTML = '';
    
    // Add header A B C D E for the column
    if (columnQuestions.length > 0) {
      const firstQ = columnQuestions[0];
      const headerAlts = firstQ.alternatives
        .map(alt => `<div class="alt-label">${alt}</div>`)
        .join('');
      rowsHTML += `
        <div class="q-row-header">
          <div class="row-anchor-left"></div>
          <div class="q-num-placeholder"></div>
          <div class="bubbles-row-header">${headerAlts}</div>
          <div class="row-anchor-right"></div>
        </div>
      `;
    }

    // Calculate marker indices for this specific column length
    const colLen = columnQuestions.length;
    const numIntervals = Math.max(1, Math.round((colLen - 1) / 5));
    const step = (colLen - 1) / numIntervals;
    const markerIndices = Array.from({ length: numIntervals + 1 }, (_, k) => Math.round(k * step));

    for (let j = 0; j < colLen; j++) {
      const q = columnQuestions[j];
      const isAnchorRow = markerIndices.includes(j);
      const altsHTML = q.alternatives
        .map(() => `<div class="bubble"></div>`)
        .join('');

      rowsHTML += `
        <div class="q-row">
          <div class="row-anchor-left">${isAnchorRow ? '<div class="marker"></div>' : ''}</div>
          <div class="q-num">${q.number}</div>
          <div class="bubbles-row">${altsHTML}</div>
          <div class="row-anchor-right">${isAnchorRow ? '<div class="marker"></div>' : ''}</div>
        </div>
      `;
    }

    columnsHTML += `
      <div class="column">
        ${rowsHTML}
      </div>
    `;
  }

  // Marking guide HTML (SVG symbols)
  const markingGuideHTML = `
    <div class="marking-guide">
      <div class="guide-item">
        <div class="guide-label">MÉTODO INCORRETO</div>
        <div class="guide-symbols">
          <div class="symbol symbol-x"><span>✕</span></div>
          <div class="symbol symbol-check"><span>✓</span></div>
          <div class="symbol symbol-dot"><span>●</span></div>
          <div class="symbol symbol-half"><span>◐</span></div>
        </div>
      </div>
      <div class="guide-item">
        <div class="guide-label">MÉTODO CORRETO</div>
        <div class="guide-symbols">
          <div class="bubble-example"></div>
          <div class="bubble-example filled"></div>
          <div class="bubble-example"></div>
          <div class="bubble-example"></div>
        </div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=794, user-scalable=no, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; 
            font-family: 'Outfit', sans-serif; color: black; font-weight: 700; }
        
        body {
          width: 595pt;
          height: 842pt;
          background: white;
          padding: 10pt 20pt;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .omr-sheet {
          position: relative;
          padding: 5pt;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 540pt;
          border: 1pt solid transparent;
        }

        /* 4 Corner Master Fiducials (Evalbee Style) */
        .corner-marker {
          position: absolute;
          width: 32pt;
          height: 32pt;
          background: #000;
        }
        .top-left { top: -5pt; left: -10pt; }
        .top-right { top: -5pt; right: -10pt; }
        .bottom-left { bottom: -5pt; left: -10pt; }
        .bottom-right { bottom: -5pt; right: -10pt; }

        .header {
          text-align: center;
          margin-bottom: 5pt;
          width: 100%;
        }
        .header-title {
          font-size: 18pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.5pt;
        }

        /* Instructions Box (Matches Reference Image) */
        .instructions-box {
          border: 1.5pt solid #000;
          margin: 0 0 5pt 0;
          width: 100%;
        }
        .instr-top {
          display: flex;
          padding: 6pt;
          border-bottom: 1.5pt solid #000;
        }
        .instr-text {
          flex: 1;
          font-size: 9pt;
          line-height: 1.3;
          padding-right: 15pt;
        }
        .instr-bottom {
          padding: 6pt;
          font-size: 11pt;
          font-weight: 900;
        }

        /* Marking Guide Styles */
        .marking-guide {
          display: flex;
          flex-direction: column;
          gap: 4pt;
          align-items: center;
          min-width: 110pt;
        }
        .guide-item { text-align: center; }
        .guide-label { font-size: 7pt; font-weight: 900; margin-bottom: 2pt; color: #000; }
        .guide-symbols { display: flex; gap: 4pt; justify-content: center; }
        
        .symbol {
          width: 12pt; height: 12pt; border: 1.2pt solid #000; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 8pt;
        }
        .bubble-example {
          width: 12pt; height: 12pt; border: 1.2pt solid #000; border-radius: 50%;
        }
        .bubble-example.filled { background: #000; }

        .questions-container {
          display: flex;
          justify-content: center;
          gap: 15pt;
          margin-bottom: 5pt;
          width: 100%;
        }
        .column { display: flex; flex-direction: column; }
        
        /* Row Anchor Positioning (Every 5 rows) */
        .row-anchor-left { width: 18pt; display: flex; justify-content: center; align-items: center; margin-right: 2pt; }
        .row-anchor-right { width: 18pt; display: flex; justify-content: center; align-items: center; margin-left: 2pt; }
        /* Fiducial Solid Square Marker */
        .marker { 
          width: 14pt; 
          height: 14pt; 
          background: #000; 
          border: 1pt solid #000;
          display: flex;
        }

        /* Perfect alignment header letters */
        .q-row-header { display: flex; align-items: center; height: 16.5pt; margin-bottom: 4pt; }
        .q-num-placeholder { width: 22pt; margin-right: 6pt; }
        .bubbles-row-header { display: flex; gap: 4pt; }
        .alt-label { width: 17pt; text-align: center; font-size: 9pt; font-weight: 900; }

        .q-row { display: flex; align-items: center; height: 16.5pt; margin-bottom: 4pt; }
        .q-num { font-size: 9pt; width: 22pt; margin-right: 6pt; text-align: right; font-weight: 900; }
        .bubbles-row { display: flex; gap: 4pt; }
        .bubble { width: 17pt; height: 17pt; border: 1.2pt solid #000; border-radius: 50%; }

        /* Compact Footer Signature */
        .footer {
          margin-top: 5pt;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2pt;
          width: 100%;
        }
        .footer-logo {
          font-family: 'Outfit', sans-serif;
          font-size: 13pt;
          font-weight: 900;
          color: black;
          letter-spacing: -0.5pt;
        }
        .footer-logo span {
          color: #00C471;
        }
        .footer-tagline {
          font-size: 8pt;
          color: #666;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="omr-sheet">
        <div class="header">
          <div class="header-title">${sheetTitle}</div>
        </div>

        <div class="instructions-box">
          <div class="instr-top">
            <div class="instr-text">
              ${config.instructions ? config.instructions : 'Para responder às questões, preencha completamente o círculo correspondente à alternativa que você julgar correta. Use caneta preta ou azul obrigatóriamente.'}
            </div>
            ${markingGuideHTML}
          </div>
          <div class="instr-bottom">
            Nome: ____________________________________________________________________
          </div>
        </div>

        <div class="questions-container">
          ${columnsHTML}
        </div>

        <div class="footer">
          <div class="footer-logo">Gabaritei<span>.</span></div>
        </div>
      </div>
    </body>
    </html>
  `;
}

