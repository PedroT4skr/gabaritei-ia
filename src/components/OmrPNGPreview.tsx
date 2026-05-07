import React, { memo } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions } from 'react-native';

import { Colors, Typography, Spacing, Shadows } from '../constants/theme';
import type { Question, GabaritoConfig } from '../types/gabarito';

interface OmrPNGPreviewProps {
  questions: Question[];
  config: GabaritoConfig;
  name: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const A4_ASPECT_RATIO = 1.414;

// Native version of the OMR sheet preview
const OmrPNGPreview = memo(({ questions, config, name }: OmrPNGPreviewProps) => {
  const questionsPerColumn = 30;
  const columnsCount = Math.ceil(questions.length / questionsPerColumn);

  const renderColumn = (colIndex: number) => {
    const start = colIndex * questionsPerColumn;
    const end = Math.min(start + questionsPerColumn, questions.length);
    const colQuestions = questions.slice(start, end);

    // Calculate marker indices for this specific column length
    const colLen = colQuestions.length;
    const numIntervals = Math.max(1, Math.round((colLen - 1) / 5));
    const step = (colLen - 1) / numIntervals;
    const markerIndices = Array.from({ length: numIntervals + 1 }, (_, k) => Math.round(k * step));

    return (
      <View key={`col-${colIndex}`} style={styles.column}>
        {/* Column Header (A B C D E) */}
        <View style={styles.rowHeader}>
           <View style={styles.anchorPlaceholder} />
           <View style={styles.numPlaceholder} />
           <View style={styles.bubblesHeaderRow}>
             {['A', 'B', 'C', 'D', 'E'].map(l => (
               <Text key={l} style={styles.altLabel}>{l}</Text>
             ))}
           </View>
           <View style={styles.anchorPlaceholder} />
        </View>

        {colQuestions.map((q, idx) => {
          const isAnchorRow = markerIndices.includes(idx);
          return (
            <View key={`q-${q.number}`} style={styles.questionRow}>
              <View style={styles.anchorContainer}>
                {isAnchorRow && <View style={styles.marker} />}
              </View>
              
              <Text style={styles.questionNum}>{q.number}</Text>
              
              <View style={styles.bubblesRow}>
                {q.alternatives.map((_, aIdx) => (
                  <View 
                    key={`q-${q.number}-a-${aIdx}`} 
                    style={styles.bubble} 
                  />
                ))}
              </View>

              <View style={styles.anchorContainer}>
                {isAnchorRow && <View style={styles.marker} />}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.paper}>
          {/* Header */}
          <Text style={styles.sheetTitle}>{config.sheetTitle || name}</Text>
          
          {/* Instructions Box */}
          <View style={styles.instructionsBox}>
             <View style={styles.instrTop}>
                <Text style={styles.instrText}>
                  {config.instructions || 'Para responder às questões, preencha completamente o círculo correspondente à alternativa correta.'}
                </Text>
                
                {/* Visual Marking Guide Mockup */}
                <View style={styles.markingGuide}>
                  <Text style={styles.guideText}>MÉTODO CORRETO</Text>
                  <View style={styles.guideSymbols}>
                    <View style={styles.bubbleMini} />
                    <View style={[styles.bubbleMini, styles.bubbleFilledMini]} />
                    <View style={styles.bubbleMini} />
                  </View>
                </View>
             </View>
             <View style={styles.instrBottom}>
                <Text style={styles.nameLine}>Nome: _____________________________________________</Text>
             </View>
          </View>

          {/* Questions Grid */}
          <View style={styles.gridContainer}>
            {Array.from({ length: columnsCount }).map((_, i) => renderColumn(i))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>Gabaritei<Text style={{color: Colors.primary}}>.</Text></Text>
          </View>
        </View>
        
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>ESTA É UMA PRÉVIA FIEL DO DOCUMENTO FINAL</Text>
        </View>
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if essential data changed
  return (
    prevProps.name === nextProps.name &&
    prevProps.config.totalQuestions === nextProps.config.totalQuestions &&
    prevProps.config.sheetTitle === nextProps.config.sheetTitle &&
    prevProps.questions.length === nextProps.questions.length
  );
});

OmrPNGPreview.displayName = 'OmrPNGPreview';

export default OmrPNGPreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  paper: {
    width: SCREEN_WIDTH - 40,
    minHeight: (SCREEN_WIDTH - 40) * A4_ASPECT_RATIO,
    backgroundColor: 'white',
    padding: Spacing.md,
    borderRadius: 2,
    ...Shadows.lg,
    elevation: 10,
  },
  sheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 10,
    color: 'black',
  },
  instructionsBox: {
    borderWidth: 1.5,
    borderColor: 'black',
    marginBottom: 15,
  },
  instrTop: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: 'black',
    gap: 10,
  },
  instrText: {
    flex: 1,
    fontSize: 8,
    color: 'black',
    fontFamily: Typography.fontFamily.regular,
  },
  markingGuide: {
    width: 80,
    alignItems: 'center',
  },
  guideText: {
    fontSize: 6,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 4,
    color: 'black',
  },
  guideSymbols: {
    flexDirection: 'row',
    gap: 4,
  },
  bubbleMini: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'black',
  },
  bubbleFilledMini: {
    backgroundColor: 'black',
  },
  instrBottom: {
    padding: 8,
  },
  nameLine: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: 'black',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    marginBottom: 2,
  },
  anchorPlaceholder: { width: 14 },
  numPlaceholder: { width: 16, marginRight: 4 },
  bubblesHeaderRow: {
    flexDirection: 'row',
    gap: 3,
  },
  altLabel: {
    width: 13,
    textAlign: 'center',
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: 'black',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14,
    marginBottom: 3,
  },
  anchorContainer: {
    width: 14,
    alignItems: 'center',
  },
  marker: {
    width: 8,
    height: 8,
    backgroundColor: 'black',
  },
  questionNum: {
    width: 16,
    fontSize: 8,
    textAlign: 'right',
    marginRight: 4,
    fontFamily: Typography.fontFamily.bold,
    color: 'black',
  },
  bubblesRow: {
    flexDirection: 'row',
    gap: 3,
  },
  bubble: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1,
    borderColor: 'black',
  },
  bubbleFilled: {
    backgroundColor: 'black',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 10,
  },
  footerLogo: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: 'black',
  },
  previewBadge: {
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '20',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  previewBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  }
});
