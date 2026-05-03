import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Image as RNImage,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCameraPermission } from 'react-native-vision-camera';

import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/src/constants/theme';
import { useGabaritoStore } from '@/src/store/gabaritoStore';
import OmrProcessor, { OmrProcessorRef } from '@/src/components/OmrProcessor';
import NativeOmrScanner from '@/src/components/NativeOmrScanner';
import ScanResultModal from '@/src/components/ScanResultModal';
import { OmrCorrectionResult } from '@/src/types/omr';

// TAB ENTRANCE FOI DEFINITIVAMENTE REMOVIDO PARA EVITAR CONGELAMENTOS NO ANDROID

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { gabaritos } = useGabaritoStore();
  const { hasPermission, requestPermission } = useCameraPermission();
  
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [selectedGabaritoId, setSelectedGabaritoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<OmrCorrectionResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [debugImage, setDebugImage] = useState<string | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState({ markers: 0, columns: 0 });
  
  const omrProcessorRef = useRef<OmrProcessorRef>(null);
  const timeoutRef = useRef<any>(null);

  const selectedGabarito = gabaritos.find(g => g.id === selectedGabaritoId);

  const handleStartScanFlow = () => {
    console.log('[Scan] Iniciar Scanner pressed. Gabaritos count:', gabaritos.length);
    if (gabaritos.length === 0) {
      Alert.alert('Nenhum Gabarito', 'Você precisa criar um gabarito antes de escanear.', [
        { text: 'Criar Agora', onPress: () => router.push('/wizard') },
        { text: 'OK' }
      ]);
      return;
    }
    setIsSelectionModalVisible(true);
  };

  const handleSelectGabarito = async (id: string) => {
    console.log('[Scan] Gabarito selected:', id);
    setIsSelectionModalVisible(false);
    
    // Handoff Seguro para evitar conflitos de Modal no Android
    setTimeout(async () => {
      setSelectedGabaritoId(id);
      
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert('Permissão Negada', 'O acesso à câmera é necessário para escanear gabaritos.');
          return;
        }
      }
      
      console.log('[Scan] Opening camera modal...');
      setIsCameraVisible(true);
    }, 280);
  };

  const onOmrResult = (result: OmrCorrectionResult) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsProcessing(false);
    setScanResult(result);
    setShowResultModal(true);
  };

  const onOmrError = (error: string, dbgImg?: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsProcessing(false);
    console.log('[OMR Error]', error);
    setDebugImage(dbgImg || null);
    
    const markerMatch = error.match(/\((\d+)\)/);
    setDiagnosticInfo({
      markers: markerMatch ? parseInt(markerMatch[1]) : 0,
      columns: 0 
    });

    setShowDebugModal(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const renderModals = () => (
    <>
      {/* OMR Processor stays mounted but hidden for stability (V19.0) */}
      <OmrProcessor 
        ref={omrProcessorRef} 
        onResult={onOmrResult} 
        onError={onOmrError} 
        onReady={() => {}}
      />

      {/* Result Modal */}
      <ScanResultModal
        visible={showResultModal}
        result={scanResult}
        imageUri={scanResult?.imageUri || capturedImage}
        onClose={() => {
          setShowResultModal(false);
          setScanResult(null);
        }}
        onSave={async () => {
          if (!scanResult || !selectedGabarito) return;

          const correctionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
          
          let permanentImageUri = scanResult.imageUri || capturedImage;
          
          if (permanentImageUri) {
            try {
              const FileSystem = require('expo-file-system');
              const newPath = FileSystem.documentDirectory + `correction_${correctionId}.jpg`;
              await FileSystem.copyAsync({ from: permanentImageUri, to: newPath });
              permanentImageUri = newPath;
            } catch(e) {
              console.log('[Scan] Could not persist image securely:', e);
            }
          }

          const questionResults = scanResult.questions.map(q => ({
            questionNumber: q.number,
            correctAnswer: q.correctAnswer as any,
            studentAnswer: q.detectedAnswer as any,
            isCorrect: q.isCorrect || false,
            isAnnulled: q.isAnnulled || false,
            points: q.points || 0,
            earnedPoints: q.earnedPoints || 0
          }));

          const correction = {
            id: correctionId,
            gabaritoId: selectedGabarito.id,
            gabaritoName: selectedGabarito.name,
            createdAt: new Date().toISOString(),
            totalQuestions: scanResult.totalQuestions,
            totalCorrect: scanResult.totalCorrect,
            totalWrong: scanResult.questions.filter(q => q.detectedAnswer === null).length,
            totalAnnulled: 0,
            totalPoints: scanResult.totalPoints || 0,
            earnedPoints: scanResult.earnedPoints || 0,
            percentage: (scanResult.earnedPoints || 0) / (scanResult.totalPoints || 1) * 100,
            questionResults,
            imageUri: permanentImageUri,
            omrGeoPayload: {
              anchors: {
                imageWidth: scanResult.anchors.imageWidth || 1080,
                imageHeight: scanResult.anchors.imageHeight || 1440,
                all: scanResult.anchors.all || [],
                detected: scanResult.anchors.all || [],
              },
              questions: scanResult.questions
            }
          };

          useGabaritoStore.getState().addCorrection(correction as any);

          setShowResultModal(false);
          setScanResult(null);
          
          Alert.alert(
            'Sucesso!', 
            'Correção arquivada no histórico.',
            [{ text: 'OK', onPress: () => router.push('/history') }]
          );
        }}
      />

      {/* Gabarito Selection Modal */}
      <Modal
        visible={isSelectionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSelectionModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsSelectionModalVisible(false)}
        >
          <View style={styles.selectionSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Escolha o Modelo</Text>
              <Text style={styles.sheetSubtitle}>Qual gabarito você deseja corrigir?</Text>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent}>
              {gabaritos.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.selectionItem}
                  onPress={() => handleSelectGabarito(item.id)}
                >
                  <View style={styles.itemIconBox}>
                    <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.questions.length} questões • {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.addNewItem}
                onPress={() => {
                  setIsSelectionModalVisible(false);
                  useGabaritoStore.getState().resetBuilder(); 
                  router.push('/wizard');
                }}
              >
                <Ionicons name="add-circle-outline" size={24} color={Colors.secondary} />
                <Text style={styles.addNewText}>Criar Novo Gabarito</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Processing Loader */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingText}>Processando OMR...</Text>
          </View>
        </View>
      </Modal>

      {/* Native JSI Camera Modal - (STRICT LAZY LOAD V14.0) */}
      <Modal visible={isCameraVisible} animationType="slide">
        {isCameraVisible && selectedGabarito && (
          <NativeOmrScanner
            gabarito={selectedGabarito}
            isActive={isCameraVisible}
            onScanComplete={(result, photoUri) => {
              setIsCameraVisible(false);
              setCapturedImage(photoUri);
              // Delay de handoff (V40.3) para garantir abertura do modal de resultado
              setTimeout(() => {
                onOmrResult(result);
              }, 500);
            }}
            onCancel={() => setIsCameraVisible(false)}
          />
        )}
      </Modal>

      {/* Debug Modal */}
      <Modal visible={showDebugModal} transparent animationType="fade">
        <View style={styles.debugOverlay}>
          <View style={styles.debugContent}>
            <Text style={styles.debugTitle}>Diagnóstico do Motor</Text>
            <Text style={styles.debugText}>
              O motor detectou <Text style={{ color: diagnosticInfo.markers >= 14 ? Colors.success : Colors.warning }}>{diagnosticInfo.markers} marcas</Text>. 
            </Text>
            
            {debugImage && (
              <RNImage 
                source={{ uri: debugImage }} 
                style={styles.debugImage} 
                resizeMode="contain"
              />
            )}
            
            <TouchableOpacity 
              style={styles.debugCloseBtn}
              onPress={() => setShowDebugModal(false)}
            >
              <Text style={styles.debugCloseText}>Entendi, vou tentar de novo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  return (
    <View style={styles.container}>
      {renderModals()}
      
      <View style={[styles.contentArea, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scanner OMR</Text>
          <Text style={styles.headerSubtitle}>
            Correção instantânea com inteligência artificial
          </Text>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.heroCircle}>
            <LinearGradient
              colors={['rgba(0, 196, 113, 0.1)', 'rgba(37, 99, 235, 0.1)']}
              style={styles.heroGradientCircle}
            >
              <Ionicons name="scan-outline" size={80} color={Colors.primary} />
            </LinearGradient>
          </View>
          
          <Text style={styles.heroMainTitle}>Pronto para começar?</Text>
          <Text style={styles.heroSubTitle}>
            Aponte a câmera para as marcas laterais do gabarito.
          </Text>

          <TouchableOpacity 
            style={styles.mainStartBtn}
            onPress={handleStartScanFlow}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LinearGradient
              colors={Gradients.primary}
              style={styles.mainStartGradient}
            >
              <Ionicons name="camera" size={28} color={Colors.white} />
              <Text style={styles.mainStartText}>Iniciar Scanner</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  heroCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.lg,
  },
  heroGradientCircle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMainTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
    textAlign: 'center',
  },
  heroSubTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  mainStartBtn: {
    width: '100%',
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.lg,
    marginBottom: Spacing.xl,
  },
  mainStartGradient: {
    flexDirection: 'row',
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStartText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.md,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  selectionSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    paddingBottom: 40,
    ...Shadows.lg,
  },
  sheetHeader: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
  },
  sheetSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sheetContent: {
    padding: Spacing.lg,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.sm,
  },
  itemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  itemMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  addNewText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.secondary,
    marginLeft: Spacing.sm,
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: Colors.card,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    ...Shadows.lg,
  },
  processingText: {
    marginTop: 15,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  debugOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debugContent: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  debugTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: Colors.text,
    marginBottom: 10,
  },
  debugText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  debugImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#000',
  },
  debugCloseBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  debugCloseText: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.white,
    fontSize: 16,
  },
});
