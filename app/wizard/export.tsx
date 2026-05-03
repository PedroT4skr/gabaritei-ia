// ===== Export Screen — Tela de Exportação (Fase 2) =====

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { useGabaritoStore } from '../../src/store/gabaritoStore';
import {
  generatePDF,
  shareFile,
} from '../../src/services/exportService';

type ExportOption = 'png' | 'jpg' | 'pdf';

interface ExportButtonProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  loading: boolean;
  onPress: () => void;
  delay: number;
}

function ExportButton({ title, subtitle, icon, color, loading, onPress, delay }: ExportButtonProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <TouchableOpacity
        style={styles.exportCard}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View style={[styles.exportIcon, { backgroundColor: color + '20' }]}>
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name={icon} size={24} color={color} />
          )}
        </View>
        <View style={styles.exportInfo}>
          <Text style={styles.exportTitle}>{title}</Text>
          <Text style={styles.exportSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="share-outline" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loadingFormat, setLoadingFormat] = useState<ExportOption | null>(null);
  const { currentGabarito, gabaritos, builderName } = useGabaritoStore();
  
  // Use id from params, then current store gabarito, then fallback searches
  const gabarito = (id ? gabaritos.find(g => g.id === id) : null) || 
                   currentGabarito || 
                   gabaritos.find((g) => g.name === builderName) || 
                   (gabaritos.length > 0 ? gabaritos[gabaritos.length - 1] : null);

  const handleExportPDF = async () => {
    if (!gabarito) {
      Alert.alert('Erro', 'Nenhum gabarito encontrado para exportar.');
      return;
    }
    setLoadingFormat('pdf');
    try {
      const result = await generatePDF(gabarito);
      if (result.success) {
        await shareFile(result.uri, 'application/pdf');
      } else {
        Alert.alert('Erro', result.error || 'Erro ao gerar PDF');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpg') => {
    if (!gabarito) {
      Alert.alert('Erro', 'Nenhum gabarito encontrado para exportar.');
      return;
    }
    setLoadingFormat(format);
    try {
      const result = await generatePDF(gabarito);
      if (result.success) {
        // Share the PDF
        await shareFile(result.uri, 'application/pdf');
      } else {
        Alert.alert('Erro', result.error || 'Erro ao gerar imagem');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleSaveToGallery = async () => {
    if (!gabarito) return;
    setLoadingFormat('png');
    try {
      const result = await generatePDF(gabarito);
      if (result.success) {
        Alert.alert(
          'PDF gerado',
          'O gabarito foi gerado como PDF. Use o botão de compartilhar para salvar no local desejado.',
          [
            { text: 'Compartilhar', onPress: () => shareFile(result.uri, 'application/pdf') },
            { text: 'OK' },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Exportar Gabarito</Text>
          <Text style={styles.headerSubtitle}>
            {gabarito ? gabarito.name : 'Nenhum gabarito selecionado'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.dismissAll()}
        >
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview info */}
        {gabarito && (
          <Animated.View entering={FadeInDown.delay(0).duration(300)}>
            <View style={styles.previewCard}>
              <LinearGradient
                colors={['#00C471', '#059669']}
                style={styles.previewBadge}
              >
                <Ionicons name="document-text" size={36} color={Colors.white} />
              </LinearGradient>
              <Text style={styles.previewName}>{gabarito.name}</Text>
              <Text style={styles.previewInfo}>
                {gabarito.config?.totalQuestions || 0} questões •{' '}
                {gabarito.questions?.filter((q) => q.correctAnswer !== null).length || 0} preenchidas
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Export options */}
        <Text style={styles.sectionTitle}>Formato de Exportação</Text>

        <ExportButton
          title="Exportar como PDF"
          subtitle="Layout profissional com cores e design ENEM"
          icon="document"
          color="#EF4444"
          loading={loadingFormat === 'pdf'}
          onPress={handleExportPDF}
          delay={100}
        />

        <ExportButton
          title="Exportar como PNG"
          subtitle="Imagem de alta qualidade do gabarito"
          icon="image"
          color="#3B82F6"
          loading={loadingFormat === 'png'}
          onPress={() => handleExportImage('png')}
          delay={200}
        />

        <ExportButton
          title="Exportar como JPG"
          subtitle="Imagem compactada, ideal para compartilhar"
          icon="image-outline"
          color="#8B5CF6"
          loading={loadingFormat === 'jpg'}
          onPress={() => handleExportImage('jpg')}
          delay={300}
        />

        {/* Divider */}
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Outras Ações</Text>

        <ExportButton
          title="Salvar no Dispositivo"
          subtitle="Salvar uma cópia localmente"
          icon="download-outline"
          color="#10B981"
          loading={false}
          onPress={handleSaveToGallery}
          delay={400}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Done button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24 }]}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <Text style={styles.doneText}>Concluído</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.base, gap: Spacing.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.sizes.xl, color: Colors.text },
  headerSubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Preview
  previewCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius['2xl'], padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  previewBadge: { width: 72, height: 72, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  previewName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.sizes.lg, color: Colors.text },
  previewInfo: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.sm, color: Colors.textSecondary },

  // Section
  sectionTitle: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.sizes.base, color: Colors.text, marginTop: Spacing.sm },

  // Export card
  exportCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  exportIcon: { width: 48, height: 48, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  exportInfo: { flex: 1, gap: 2 },
  exportTitle: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.sizes.base, color: Colors.text },
  exportSubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.xs, color: Colors.textSecondary },

  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },

  // Footer
  footer: {
    paddingHorizontal: Spacing.screenPadding, 
    paddingTop: Spacing.md,
    borderTopWidth: 1, 
    borderTopColor: Colors.divider,
  },
  doneButton: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, paddingVertical: Spacing.base,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  doneText: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.sizes.base, color: Colors.text },
});
