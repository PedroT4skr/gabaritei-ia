import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { OmrCorrectionResult } from '../types/omr';
import { Gabarito } from '../types/gabarito';
import { AnchorDetectionCorner, OpenCVEngine } from '../utils/opencvEngine';
import Constants from 'expo-constants';

export interface OmrProcessorRef {
  processImage: (imageUri: string, gabarito: Gabarito, lockedCorners?: AnchorDetectionCorner[]) => void;
}

interface OmrProcessorProps {
  onResult: (result: OmrCorrectionResult) => void;
  onError: (error: string, debugImage?: string) => void;
  onReady?: () => void;
}

const styles = StyleSheet.create({
  hidden: { width: 1, height: 1, position: 'absolute', opacity: 0, overflow: 'hidden' },
});

const OmrProcessor = forwardRef<OmrProcessorRef, OmrProcessorProps>(({ onResult, onError, onReady }, ref) => {
  
  // Sinalizar que está pronto (sem precisar esperar webview)
  React.useEffect(() => {
    onReady?.();
  }, [onReady]);

  useImperativeHandle(ref, () => ({
    processImage: async (base64Uri, gabarito, lockedCorners) => {
      try {
        try {
          const packagerIp = Constants?.expoConfig?.hostUri?.split(':')[0];
          if (packagerIp) {
            fetch(`http://${packagerIp}:4000/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Uri, name: 'camera_raw' })
            }).catch(e => console.log('Telemetria offline'));
          }
        } catch(e){}

        const result = await OpenCVEngine.processBase64(base64Uri, gabarito, lockedCorners);
        onResult(result);
      } catch (e: any) {
        // Envia fallback de imagem crua se houver erro pra depuração visual
        onError(e.message, base64Uri);
      }
    },
  }));

  // Renderiza vazio, o OpenCV não tem UI Elements ocultos na DOM = 0 RAM cost.
  return <View style={styles.hidden} />;
});

OmrProcessor.displayName = 'OmrProcessor';
export default OmrProcessor;
