import { Worklets } from 'react-native-worklets-core';
import { withTiming } from 'react-native-reanimated';

/**
 * MOTOR OMR ISOLADO (V30.0)
 * Este arquivo existe para garantir que o plugin do Babel não se perca 
 * com o escopo do React e de outros componentes.
 */

export function createOmrWorklet(
  displayCount: { value: number },
  progress: { value: number },
  updateUI: (count: number) => void,
  triggerResult: (res: any) => void,
  gabaritoId: string
) {
  'worklet';

  const updateUIBridge = Worklets.createRunOnJS(updateUI);
  const triggerResultBridge = Worklets.createRunOnJS(triggerResult);

  return (frame: any) => {
    'worklet';
    
    // Incremento de alta performance
    displayCount.value = displayCount.value + 1;

    // Reportar à UI em intervalos seguros
    if (displayCount.value % 15 === 0) {
      updateUIBridge(displayCount.value);
      
      // Simulação de preenchimento (V30.0)
      if (displayCount.value > 60 && progress.value === 0) {
        progress.value = withTiming(1, { duration: 3000 });
      }
    }

    if (progress.value === 1) {
      triggerResultBridge({ success: true, gabaritoId, mode: 'v30-isolated-module' });
    }
  };
}
