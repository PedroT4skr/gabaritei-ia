import React from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Image, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect } from 'react-native-svg';

import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { OmrCorrectionResult } from '../types/omr';

interface ScanResultModalProps {
  visible: boolean;
  result: OmrCorrectionResult | null;
  imageUri: string | null;
  onClose: () => void;
  onSave: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanResultModal({ visible, result, imageUri, onClose, onSave }: ScanResultModalProps) {
  const insets = useSafeAreaInsets();
  
  if (!result) return null;
  const multipleCount = result.questions.filter((q) => q.status === 'multiple').length;

  // We need the image dimensions to scale the SVG overlay
  // For now we assume the image fits the screen width

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Resultado da Correção</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Result Card */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{result.totalCorrect}</Text>
              <Text style={styles.statLabel}>Acertos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {Number(result.earnedPoints || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                <Text style={styles.statLabelSmall}>/{Number(result.totalPoints || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</Text>
              </Text>
              <Text style={styles.statLabel}>Pontos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>
                {result.totalQuestions > 0 
                  ? Math.round(((result.earnedPoints || 0) / (result.totalPoints || 1)) * 100) 
                  : 0}%
              </Text>
              <Text style={styles.statLabel}>Desempenho</Text>
            </View>
          </View>
          {multipleCount > 0 && (
            <View style={styles.multipleAlert}>
              <Ionicons name="alert-circle" size={16} color="#FFCC00" />
              <Text style={styles.multipleAlertText}>
                {multipleCount} questao(oes) com multipla marcacao detectada.
              </Text>
            </View>
          )}

          {/* Image with Visual Markers */}
          <View style={styles.imageContainer}>
            <Text style={styles.sectionTitle}>Confirmação Visual</Text>
            <Text style={styles.sectionSubtitle}>Confira se as marcações do app batem com a folha</Text>
            
            {imageUri && (
              <View style={styles.imageWrapper}>
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.capturedImage} 
                  resizeMode="contain"
                />
                {/* SVG Overlay — viewBox matches the dynamic processed image space */}
                <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${result.anchors.imageWidth || 1080} ${result.anchors.imageHeight || 1440}`}>
                  {result.anchors.all.map((anchor, i) => (
                    <Rect
                      key={`anchor-${i}`}
                      x={anchor.x - 8}
                      y={anchor.y - 8}
                      width={16}
                      height={16}
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="#2563EB"
                    />
                  ))}
                  
                  {result.questions.map((q) => 
                    q.alternatives.map((alt, i) => {
                      const isSelected = alt.isDetected;
                      const isCorrectAnswer = alt.label === q.correctAnswer;
                      
                      let strokeColor = '';
                      let strokeWidth = 2.5;
                      let fillColor = 'transparent';

                      if (q.status === 'multiple' && isSelected) {
                        strokeColor = '#FF9800'; // Orange for multiple selections
                        fillColor = 'rgba(255,152,0,0.24)';
                        strokeWidth = 3.5;
                      } else if (isSelected && isCorrectAnswer) {
                        strokeColor = '#00C853'; // Green
                        fillColor = 'rgba(0,200,83,0.22)';
                        strokeWidth = 3.5;
                      } else if (isSelected && !isCorrectAnswer) {
                        strokeColor = '#FF3B30'; // Red
                        fillColor = 'rgba(255,59,48,0.2)';
                        strokeWidth = 3.5;
                      } else if (!isSelected && isCorrectAnswer) {
                        strokeColor = '#FFCC00'; // Yellow (Missed)
                        fillColor = 'rgba(255,204,0,0.18)';
                        strokeWidth = 3.5;
                      } else {
                        return null; // Empty grey bubble not needed to be re-drawn
                      }

                      return (
                        <Circle
                          key={`q-${q.number}-alt-${i}`}
                          cx={alt.center.x}
                          cy={alt.center.y}
                          r={13}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                        />
                      );
                    })
                  )}
                </Svg>
              </View>
            )}
          </View>

          {/* Details list section */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Conferência de Questões</Text>
            <Text style={styles.sectionSubtitle}>Confira os acertos e erros detalhadamente</Text>
            
            <View style={styles.detailsList}>
              {result.questions.map((q) => {
                let statusIcon = "ellipse-outline";
                let statusColor: string = Colors.textMuted;
                
                if (q.status === 'correct') {
                  statusIcon = "checkmark-circle";
                  statusColor = Colors.secondary;
                } else if (q.status === 'wrong') {
                  statusIcon = "close-circle";
                  statusColor = Colors.error;
                } else if (q.status === 'multiple') {
                  statusIcon = "alert-circle";
                  statusColor = "#FFCC00";
                } else if (q.status === 'annulled') {
                  statusIcon = "information-circle";
                  statusColor = "#007AFF";
                } else if (q.status === 'none') {
                  statusIcon = "ellipse-outline";
                  statusColor = Colors.textMuted;
                }

                return (
                  <View key={`detail-q-${q.number}`} style={styles.detailRow}>
                    <View style={styles.qNumBox}>
                      <Text style={styles.qNumText}>{String(q.number).padStart(2, '0')}</Text>
                    </View>
                    
                    <View style={styles.answerCompare}>
                      <View style={styles.answerBox}>
                        <Text style={styles.answerLabel}>ALUNO</Text>
                        <Text style={[styles.answerValue, q.status === 'multiple' && { fontSize: 10 }]}>
                          {q.status === 'multiple'
                            ? (q.multipleDetectedAnswers?.join('/') || 'MULT')
                            : (q.detectedAnswer || '—')}
                        </Text>
                      </View>
                      
                      <Ionicons name="arrow-forward" size={12} color={Colors.divider} style={{ marginHorizontal: 8 }} />
                      
                      <View style={styles.answerBox}>
                        <Text style={styles.answerLabel}>CORRETO</Text>
                        <Text style={styles.answerValue}>
                          {q.status === 'annulled' ? '—' : (q.correctAnswer || '—')}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={[styles.statusIndicator, { backgroundColor: statusColor + '15' }]}>
                      <Ionicons name={statusIcon as any} size={20} color={statusColor} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { paddingBottom: Math.max(Spacing.lg, insets.bottom) }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Confirmar e Salvar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeBtn: {
    padding: 8,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xl,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.divider,
  },
  statLabelSmall: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  multipleAlert: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,204,0,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multipleAlertText: {
    color: '#FFE082',
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
  },
  imageContainer: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  imageWrapper: {
    width: SCREEN_WIDTH - (Spacing.lg * 2),
    aspectRatio: 1 / 1.414,
    backgroundColor: 'black',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  saveBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.md,
    color: Colors.white,
  },
  detailsContainer: {
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  detailsList: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.sm,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  qNumBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  qNumText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  answerCompare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerBox: {
    alignItems: 'center',
    minWidth: 40,
  },
  answerLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 8,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  answerValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
});
