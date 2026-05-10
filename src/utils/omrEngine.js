/**
 * MOTOR OMR HÍBRIDO V39.2 (PROGRESSO CALIBRADO)
 */

export const omrFrameProcessor = (
  frame, 
  displayCount, 
  progress, 
  updateUIBridge, 
  triggerResultBridge, 
  gabaritoId,
  resizePlugin
) => {
  'worklet';

  // 1. Contador de Frames
  displayCount.value = displayCount.value + 1;

  // 2. Lógica de Estabilização V39.2 (Início Imediato)
  // Reduzimos o delay inicial para a barra encher assim que o app abre.
  if (displayCount.value > 5) {
    if (progress.value < 1) {
      // barra enche em aprox 1.8 segundos
      progress.value = progress.value + 0.018; 
    }
  } else {
    progress.value = 0;
  }

  // 3. Reportar Status
  if (displayCount.value % 15 === 0) {
    updateUIBridge(displayCount.value);
  }

  // 4. Gatilho de Captura (STABLE)
  if (progress.value >= 1) {
    // LOCK: Evitar repetições enquanto a foto é tirada
    displayCount.value = -100; // Recuo de segurança (delay de hardware)

    triggerResultBridge({ 
      type: 'STABLE',
      timestamp: Date.now()
    });
  }
};
