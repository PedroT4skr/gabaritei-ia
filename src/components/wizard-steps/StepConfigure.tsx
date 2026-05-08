// ===== Wizard Step 2 Component: Configurar Gabarito =====

import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { ALL_ALTERNATIVES, DEFAULTS } from '../../constants/enem';
import type { QuestionGroup, Alternative } from '../../types/gabarito';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (v: number) => void;
}

function Stepper({ value, min, max, step = 1, label, onChange }: StepperProps) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={18} color={value <= min ? Colors.textMuted : Colors.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.stepperInput}
          value={String(value)}
          onChangeText={(t: string) => {
            // Replace comma with dot for international compatibility
            const normalized = t.replace(',', '.');
            // Allow trailing dot for typing
            if (normalized.endsWith('.') || normalized === '') {
               // We keep it as is if they are still typing the decimal part
               // But we need to handle the state. For now, let's just parse.
            }
            const n = parseFloat(normalized);
            if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
            else if (t === '') onChange(min);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
        >
          <Ionicons name="add" size={18} color={value >= max ? Colors.textMuted : Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface GroupCardProps {
  group: QuestionGroup;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

function GroupCard({ group, index, onEdit, onRemove, canRemove }: GroupCardProps) {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupCardHeader}>
        <View style={styles.groupBadge}>
          <Text style={styles.groupBadgeText}>{index + 1}</Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupTitle}>
            Questões {group.startQuestion}–{group.endQuestion}
          </Text>
          <Text style={styles.groupSub}>
            {group.alternatives.length} alternativas ({group.alternatives[0]}–{group.alternatives[group.alternatives.length - 1]}) • {group.pointsPerQuestion} pt
          </Text>
        </View>
        <View style={styles.groupActions}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          {canRemove && (
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

interface StepConfigureProps {
  builderName: string;
  builderConfig: any;
  setBuilderName: (v: string) => void;
  setTotalQuestions: (v: number) => void;
  updateGroup: (id: string, data: any) => void;
  addGroup: (data: any) => void;
  removeGroup: (id: string) => void;
  setSheetTitle: (v: string) => void;
  setInstructions: (v: string) => void;
}

function StepConfigure({
  builderName,
  builderConfig,
  setBuilderName,
  setTotalQuestions,
  updateGroup,
  addGroup,
  removeGroup,
  setSheetTitle,
  setInstructions,
}: StepConfigureProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Local states for inputs to avoid Store/Persistence lag during typing
  const [localName, setLocalName] = useState(builderName);
  const [localTitle, setLocalTitle] = useState(builderConfig.sheetTitle || '');
  const [localInstructions, setLocalInstructions] = useState(builderConfig.instructions || '');
  const [localTotal, setLocalTotal] = useState(builderConfig.totalQuestions);

  // Synchronize local states when store changes (e.g. Preset load)
  React.useEffect(() => {
    setLocalName(builderName);
    setLocalTitle(builderConfig.sheetTitle || '');
    setLocalInstructions(builderConfig.instructions || '');
    setLocalTotal(builderConfig.totalQuestions);
  }, [builderName, builderConfig.sheetTitle, builderConfig.instructions, builderConfig.totalQuestions]);

  // Debounced sync for totalQuestions to avoid UI freeze during typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localTotal !== builderConfig.totalQuestions) {
        setTotalQuestions(localTotal);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [localTotal, builderConfig.totalQuestions, setTotalQuestions]);

  const editGroup = editingGroupId
    ? builderConfig.groups.find((g: any) => g.id === editingGroupId)
    : null;

  const handleAddGroup = () => {
    const last = builderConfig.groups[builderConfig.groups.length - 1];
    const newStart = last ? last.endQuestion + 1 : 1;
    addGroup({
      id: `group-${Date.now()}`,
      startQuestion: newStart,
      endQuestion: newStart + 9,
      alternatives: ALL_ALTERNATIVES.slice(0, 5),
      pointsPerQuestion: DEFAULTS.pointsPerQuestion,
    });
  };

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {editGroup ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.contentInner}>
            <View>
              <Text style={styles.sectionTitle}>Editando Grupo</Text>
              <View style={styles.section}>
                <Stepper
                  label="Questão inicial"
                  value={editGroup.startQuestion}
                  min={1}
                  max={editGroup.endQuestion}
                  onChange={(v) => updateGroup(editGroup.id, { startQuestion: v })}
                />
                <Stepper
                  label="Questão final"
                  value={editGroup.endQuestion}
                  min={editGroup.startQuestion}
                  max={DEFAULTS.maxQuestions}
                  onChange={(v) => updateGroup(editGroup.id, { endQuestion: v })}
                />
                <Stepper
                  label="Nº de alternativas"
                  value={editGroup.alternatives.length}
                  min={2}
                  max={10}
                  onChange={(v) =>
                    updateGroup(editGroup.id, {
                      alternatives: ALL_ALTERNATIVES.slice(0, v) as Alternative[],
                    })
                  }
                />
                <Stepper
                  label="Pontos por questão"
                  value={editGroup.pointsPerQuestion}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={(v) => updateGroup(editGroup.id, { pointsPerQuestion: v })}
                />

                <View style={styles.altPreview}>
                  <Text style={styles.altPreviewLabel}>Alternativas:</Text>
                  <View style={styles.altRow}>
                    {editGroup.alternatives.map((a: string) => (
                      <View key={a} style={styles.altBubble}>
                        <Text style={styles.altBubbleText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.doneBtn} onPress={() => setEditingGroupId(null)}>
                <Text style={styles.doneBtnText}>✓ Concluído</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={styles.sectionTitle}>Nome do Gabarito</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: ENEM 2025 — 1º Dia"
                placeholderTextColor={Colors.textMuted}
                value={localName}
                onChangeText={setLocalName}
                onBlur={() => setBuilderName(localName)}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Total de Questões</Text>
              <View style={styles.section}>
                <Stepper
                  label="Questões"
                  value={localTotal}
                  min={DEFAULTS.minQuestions}
                  max={DEFAULTS.maxQuestions}
                  step={5}
                  onChange={setLocalTotal}
                />
              </View>
            </View>

            <View>
              <Text style={styles.sectionTitle}>Grupos de Alternativas</Text>
              {builderConfig.groups.map((group: any, idx: number) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={idx}
                  onEdit={() => setEditingGroupId(group.id)}
                  onRemove={() => removeGroup(group.id)}
                  canRemove={builderConfig.groups.length > 1}
                />
              ))}
              <TouchableOpacity style={styles.addGroupBtn} onPress={handleAddGroup}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.addGroupText}>Adicionar grupo</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={styles.sectionTitle}>Pontuação</Text>
              <View style={styles.section}>
                <Stepper
                  label="Pontos por questão (todos)"
                  value={builderConfig.groups[0]?.pointsPerQuestion || 1}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={(v) =>
                    builderConfig.groups.forEach((g: any) => updateGroup(g.id, { pointsPerQuestion: v }))
                  }
                />
                <Text style={styles.totalPoints}>
                  Pontuação máxima:{' '}
                  <Text style={styles.totalPointsValue}>
                    {Number(builderConfig.totalQuestions * (builderConfig.groups[0]?.pointsPerQuestion || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}{' '}
                    pontos
                  </Text>
                </Text>
              </View>
            </View>

            <View>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Personalização da Folha (Impressão)</Text>
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Título na Folha (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={builderName || "Ex: SIMULADO ENEM — DIA 1"}
                  placeholderTextColor={Colors.textMuted}
                  value={localTitle}
                  onChangeText={setLocalTitle}
                  onBlur={() => setSheetTitle(localTitle)}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Instruções aos Alunos</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ex: Use caneta preta..."
                  placeholderTextColor={Colors.textMuted}
                  value={localInstructions}
                  onChangeText={setLocalInstructions}
                  onBlur={() => setInstructions(localInstructions)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentInner: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.base, paddingBottom: 100, gap: Spacing.lg },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.md },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: 6, marginLeft: 4 },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: Spacing.sm },
  sectionTitle: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.sizes.base, color: Colors.text, marginBottom: Spacing.sm },
  section: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.base, borderWidth: 1, borderColor: Colors.cardBorder },
  textInput: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.base, fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.base, color: Colors.text, borderWidth: 1, borderColor: Colors.cardBorder },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  stepperLabel: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.sm, color: Colors.textSecondary, flex: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepperBtn: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperInput: { width: 58, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, textAlign: 'center', fontFamily: Typography.fontFamily.bold, fontSize: Typography.sizes.base, color: Colors.text, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingVertical: 0, paddingHorizontal: 4 },
  groupCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  groupCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  groupBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  groupBadgeText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.sizes.sm, color: Colors.primary },
  groupInfo: { flex: 1, gap: 2 },
  groupTitle: { fontFamily: Typography.fontFamily.semibold, fontSize: Typography.sizes.base, color: Colors.text },
  groupSub: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  groupActions: { flexDirection: 'row', gap: Spacing.md },
  addGroupBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.primaryMuted, borderStyle: 'dashed' },
  addGroupText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.sizes.sm, color: Colors.primary },
  totalPoints: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  totalPointsValue: { fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  altPreview: { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg },
  altPreviewLabel: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  altRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  altBubble: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primaryMuted, borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  altBubbleText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.sizes.xs, color: Colors.primary },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  doneBtnText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.sizes.base, color: Colors.white },
});

export default memo(StepConfigure);
