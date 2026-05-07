import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Svg, Circle, Polyline, Rect } from 'react-native-svg';

import { Colors, Typography } from '@/src/constants/theme';
import { Gabarito } from '@/src/types/gabarito';
import OmrProcessor, { OmrProcessorRef } from './OmrProcessor';
import { OpenCVEngine, AnchorDetectionCorner, AnchorDetectionResult } from '../utils/opencvEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GRID_WIDTH = SCREEN_WIDTH * 0.85;
const GRID_HEIGHT = GRID_WIDTH * 1.414;
const GRID_LEFT = (SCREEN_WIDTH - GRID_WIDTH) / 2;
const GRID_TOP = (SCREEN_HEIGHT - GRID_HEIGHT) / 2 - 20;
const CORNER_GRID_SIZE = 84;
const STABILITY_FRAMES_REQUIRED = 1;
const AUTO_PROCESS_CONFIDENCE = 0.70;
const SYNC_TOLERANCE_MS = 66;
const DETECTION_INTERVAL_MS = 180;

type ScreenPoint = { x: number; y: number };

interface NativeOmrScannerProps {
  gabarito: Gabarito;
  onScanComplete: (result: any, photoUri: string) => void;
  onCancel: () => void;
  isActive?: boolean;
}

const NativeOmrScanner: React.FC<NativeOmrScannerProps> = ({
  gabarito,
  onScanComplete,
  onCancel,
  isActive = true,
}) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const cameraRef = useRef<Camera>(null);
  const processorRef = useRef<OmrProcessorRef>(null);

  const [statusText, setStatusText] = useState('Posicione as 4 ancoras nos grids dos cantos');
  const [isProcessing, setIsProcessing] = useState(false);
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const [omrReady, setOmrReady] = useState(false);
  const [anchorDetection, setAnchorDetection] = useState<AnchorDetectionResult | null>(null);
  const [stability, setStability] = useState(0);
  const [syncedCorners, setSyncedCorners] = useState(0);

  const lastPhotoUriRef = useRef<string>('');
  const analyzingRef = useRef(false);
  const stableCountRef = useRef(0);
  const autoCaptureCooldownRef = useRef(false);
  const lastQualifiedAtRef = useRef(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const guideCenters: ScreenPoint[] = useMemo(() => ([
    { x: GRID_LEFT + CORNER_GRID_SIZE / 2, y: GRID_TOP + CORNER_GRID_SIZE / 2 },
    { x: GRID_LEFT + GRID_WIDTH - CORNER_GRID_SIZE / 2, y: GRID_TOP + CORNER_GRID_SIZE / 2 },
    { x: GRID_LEFT + GRID_WIDTH - CORNER_GRID_SIZE / 2, y: GRID_TOP + GRID_HEIGHT - CORNER_GRID_SIZE / 2 },
    { x: GRID_LEFT + CORNER_GRID_SIZE / 2, y: GRID_TOP + GRID_HEIGHT - CORNER_GRID_SIZE / 2 },
  ]), []);
  const questionCount = Array.isArray(gabarito?.questions) ? gabarito.questions.length : 0;

  const getCoverTransform = useCallback((imageWidth: number, imageHeight: number) => {
    const safeW = Math.max(1, imageWidth);
    const safeH = Math.max(1, imageHeight);
    const scale = Math.max(SCREEN_WIDTH / safeW, SCREEN_HEIGHT / safeH);
    const drawnW = safeW * scale;
    const drawnH = safeH * scale;
    const offsetX = (SCREEN_WIDTH - drawnW) / 2;
    const offsetY = (SCREEN_HEIGHT - drawnH) / 2;
    return { scale, offsetX, offsetY };
  }, []);

  const imageToScreen = useCallback((p: { x: number; y: number }, imageWidth: number, imageHeight: number) => {
    const { scale, offsetX, offsetY } = getCoverTransform(imageWidth, imageHeight);
    return {
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    };
  }, [getCoverTransform]);

  const screenToImage = useCallback((p: ScreenPoint, imageWidth: number, imageHeight: number) => {
    const { scale, offsetX, offsetY } = getCoverTransform(imageWidth, imageHeight);
    return {
      x: (p.x - offsetX) / scale,
      y: (p.y - offsetY) / scale,
    };
  }, [getCoverTransform]);

  const mapDetectionToScreen = useCallback((detection: AnchorDetectionResult | null) => {
    if (!detection || !detection.corners || detection.corners.length !== 4 || detection.imageWidth <= 0 || detection.imageHeight <= 0) {
      return [] as ScreenPoint[];
    }
    return detection.corners.map((p) => imageToScreen(p, detection.imageWidth, detection.imageHeight));
  }, [imageToScreen]);

  const scoreGridSync = useCallback((screenCorners: ScreenPoint[]) => {
    if (screenCorners.length !== 4) return { synced: 0, allSynced: false };
    const tolerance = CORNER_GRID_SIZE * 1.75;
    let synced = 0;

    for (let i = 0; i < 4; i++) {
      const dx = screenCorners[i].x - guideCenters[i].x;
      const dy = screenCorners[i].y - guideCenters[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tolerance) synced++;
    }

    return { synced, allSynced: synced === 4 };
  }, [guideCenters]);

  const processSnapshotDirect = useCallback(async (
    snapshotUri: string,
    snapshotBase64: string,
    lockedCorners?: AnchorDetectionCorner[],
  ) => {
    if (isProcessing || !omrReady) return;
    setIsProcessing(true);
    setStatusText('Processando automaticamente...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setStatusText('Analisando respostas...');
      lastPhotoUriRef.current = snapshotUri;
      const dataUri = `data:image/jpeg;base64,${snapshotBase64}`;
      processorRef.current?.processImage(dataUri, gabarito, lockedCorners);
    } catch (e: any) {
      setStatusText(`Erro: ${e.message?.substring(0, 30) || 'Tente novamente'}`);
      setIsProcessing(false);
    }
  }, [gabarito, isProcessing, omrReady]);

  const detectLiveAnchors = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !omrReady || analyzingRef.current || autoCaptureCooldownRef.current) return;

    analyzingRef.current = true;
    try {
      const cameraAny = cameraRef.current as any;
      if (typeof cameraAny.takeSnapshot !== 'function') return;

      const snap = await cameraAny.takeSnapshot({ quality: 82, skipMetadata: true });
      const snapPath = typeof snap === 'string' ? snap : snap?.path;
      if (!snapPath) return;

      const snapUri = snapPath.startsWith('file://') ? snapPath : `file://${snapPath}`;
      const processed = await manipulateAsync(
        snapUri,
        [{ resize: { height: 1180 } }],
        { compress: 0.82, format: SaveFormat.JPEG, base64: true },
      );
      if (!processed.base64) return;

      const frameW = processed.width || 0;
      const frameH = processed.height || 0;
      const expectedCorners = frameW > 0 && frameH > 0
        ? guideCenters.map((p) => {
            const pi = screenToImage(p, frameW, frameH);
            return {
              x: Math.max(0, Math.min(1, pi.x / frameW)),
              y: Math.max(0, Math.min(1, pi.y / frameH)),
            };
          })
        : guideCenters.map((p) => ({
            x: Math.max(0, Math.min(1, p.x / SCREEN_WIDTH)),
            y: Math.max(0, Math.min(1, p.y / SCREEN_HEIGHT)),
          }));

      const detection = await OpenCVEngine.detectAnchors(
        `data:image/jpeg;base64,${processed.base64}`,
        questionCount,
        expectedCorners,
      );
      setAnchorDetection(detection);

      const cornersOnScreen = mapDetectionToScreen(detection);
      const sync = scoreGridSync(cornersOnScreen);
      setSyncedCorners(sync.synced);

      const stableFrame = detection.found && detection.confidence >= AUTO_PROCESS_CONFIDENCE && sync.allSynced;
      if (stableFrame) {
        stableCountRef.current += 1;
        lastQualifiedAtRef.current = Date.now();
      } else {
        const elapsed = Date.now() - lastQualifiedAtRef.current;
        if (elapsed > SYNC_TOLERANCE_MS) {
          stableCountRef.current = 0;
        }
      }

      const currentStability = Math.min(1, stableCountRef.current / STABILITY_FRAMES_REQUIRED);
      setStability(currentStability);

      if (stableCountRef.current >= STABILITY_FRAMES_REQUIRED && !isProcessing) {
        autoCaptureCooldownRef.current = true;
        stableCountRef.current = 0;
        setStatusText('4 ancoras sincronizadas. Processando...');
        await processSnapshotDirect(processed.uri, processed.base64, detection.corners);
        setTimeout(() => {
          autoCaptureCooldownRef.current = false;
        }, 1800);
      }
    } catch {
      stableCountRef.current = 0;
      setStability(0);
      setSyncedCorners(0);
      setStatusText('Falha ao ler frame. Ajuste distancia/angulo e tente novamente.');
    } finally {
      analyzingRef.current = false;
    }
  }, [guideCenters, isProcessing, mapDetectionToScreen, omrReady, processSnapshotDirect, questionCount, scoreGridSync, screenToImage]);

  useEffect(() => {
    if (!isActive || !omrReady) return;
    const interval = setInterval(() => {
      detectLiveAnchors();
    }, DETECTION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [detectLiveAnchors, isActive, omrReady]);

  if (!device || !hasPermission) return null;

  const overlayPoints = mapDetectionToScreen(anchorDetection);

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device} isActive={isActive} torch={torch} photo={true} />

      <OmrProcessor
        ref={processorRef}
        onReady={() => {
          setOmrReady(true);
          setStatusText('Buscando ancoras nos 4 grids...');
        }}
        onResult={(res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsProcessing(false);
          onScanComplete(res, lastPhotoUriRef.current);
        }}
        onError={(err) => {
          setStatusText(`Erro: ${err.substring(0, 35)}...`);
          setIsProcessing(false);
        }}
      />

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onCancel}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch(prev => prev === 'on' ? 'off' : 'on')}>
          <Ionicons name={torch === 'on' ? 'flash' : 'flash-off'} size={24} color={torch === 'on' ? Colors.secondary : 'white'} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>
          {anchorDetection
            ? `Sincronizacao: ${syncedCorners}/4 | confianca ${Math.round(anchorDetection.confidence * 100)}%${anchorDetection.found ? '' : ` | buscando (${anchorDetection.reason || 'ajustando'})`} | estabilidade ${Math.round(stability * 100)}%`
            : statusText}
        </Text>
      </View>

      <View style={styles.trackingOverlay}>
        <View style={styles.trackingCornerTopLeft} />
        <View style={styles.trackingCornerTopRight} />
        <View style={styles.trackingCornerBottomLeft} />
        <View style={styles.trackingCornerBottomRight} />

        <View style={[styles.cornerGrid, { left: 0, top: 0 }]} />
        <View style={[styles.cornerGrid, { right: 0, top: 0 }]} />
        <View style={[styles.cornerGrid, { right: 0, bottom: 0 }]} />
        <View style={[styles.cornerGrid, { left: 0, bottom: 0 }]} />
      </View>

      {overlayPoints.length === 4 && (
        <Svg style={StyleSheet.absoluteFill}>
          <Polyline
            points={overlayPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke={syncedCorners === 4 ? '#00E676' : '#FFC107'}
            strokeWidth={3}
            fill="none"
          />
          {overlayPoints.map((p, i) => (
            <Circle key={`anchor-live-${i}`} cx={p.x} cy={p.y} r={7} fill={syncedCorners === 4 ? '#00E676' : '#FFC107'} />
          ))}
        </Svg>
      )}

      <View style={styles.bottomContainer}>
        <View style={styles.processingIndicator}>
          {isProcessing ? <ActivityIndicator size="large" color={Colors.primary} /> : <Ionicons name="scan" size={34} color="white" />}
          <Text style={styles.processingText}>{isProcessing ? 'Processando...' : 'Aguardando sincronizacao 4/4'}</Text>
        </View>
        <Text style={styles.hint}>Sem botao manual. O app processa sozinho ao atingir 70%+ de confianca.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  headerActions: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  statusContainer: { position: 'absolute', top: 105, left: 0, right: 0, alignItems: 'center', zIndex: 6 },
  statusLabel: { color: 'white', fontFamily: Typography.fontFamily.bold, fontSize: 13, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
  trackingOverlay: { position: 'absolute', width: GRID_WIDTH, height: GRID_HEIGHT, left: GRID_LEFT, top: GRID_TOP },
  trackingCornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: 'lime' },
  trackingCornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: 'lime' },
  trackingCornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: 'lime' },
  trackingCornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: 'lime' },
  cornerGrid: {
    position: 'absolute',
    width: CORNER_GRID_SIZE,
    height: CORNER_GRID_SIZE,
    borderWidth: 2,
    borderColor: 'rgba(0,230,118,0.9)',
    backgroundColor: 'rgba(0,230,118,0.06)',
  },
  bottomContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  captureBtnDisabled: { opacity: 0.4 },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'white' },
  processingIndicator: { alignItems: 'center', marginBottom: 12 },
  processingText: { color: 'white', fontFamily: Typography.fontFamily.bold, fontSize: 14, marginTop: 8 },
  hint: { color: 'rgba(255,255,255,0.82)', fontFamily: Typography.fontFamily.medium, fontSize: 12, textAlign: 'center', maxWidth: 320 },
});

export default NativeOmrScanner;
