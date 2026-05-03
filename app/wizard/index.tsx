import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import PagerView from 'react-native-pager-view';
import { router, useFocusEffect } from 'expo-router';

import WizardHeader from '../../src/components/WizardHeader';
import WizardFooter from '../../src/components/WizardFooter';
import { Colors } from '../../src/constants/theme';
import { useGabaritoStore, PRESETS } from '../../src/store/gabaritoStore';

// Step Components
import StepPreset from '../../src/components/wizard-steps/StepPreset';
import StepConfigure from '../../src/components/wizard-steps/StepConfigure';
import StepFill from '../../src/components/wizard-steps/StepFill';
import StepReview from '../../src/components/wizard-steps/StepReview';

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  'Escolher Modelo',
  'Configurar Gabarito',
  'Preencher Respostas',
  'Revisar e Salvar',
];

const STEP_SUBTITLES = [
  'Selecione um preset ou crie do zero',
  'Defina questões, alternativas e pontuação',
  'Toque nas bolinhas para definir o gabarito oficial',
  'Confira os dados antes de gerar o OMR',
];

export default function WizardScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  
  const builderConfig = useGabaritoStore(s => s.builderConfig);
  const builderName = useGabaritoStore(s => s.builderName);
  const builderQuestions = useGabaritoStore(s => s.builderQuestions);
  const setBuilderName = useGabaritoStore(s => s.setBuilderName);
  const setTotalQuestions = useGabaritoStore(s => s.setTotalQuestions);
  const updateGroup = useGabaritoStore(s => s.updateGroup);
  const addGroup = useGabaritoStore(s => s.addGroup);
  const removeGroup = useGabaritoStore(s => s.removeGroup);
  const setSheetTitle = useGabaritoStore(s => s.setSheetTitle);
  const setInstructions = useGabaritoStore(s => s.setInstructions);
  const setCorrectAnswer = useGabaritoStore(s => s.setCorrectAnswer);
  const toggleQuestionStatus = useGabaritoStore(s => s.toggleQuestionStatus);
  const saveGabarito = useGabaritoStore(s => s.saveGabarito);
  const loadPreset = useGabaritoStore(s => s.loadPreset);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (currentPage > 0) {
          pagerRef.current?.setPage(currentPage - 1);
          setCurrentPage(currentPage - 1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [currentPage])
  );

  const onPageSelected = useCallback((e: any) => {
    setCurrentPage(e.nativeEvent.position);
  }, []);

  const handleNext = () => {
    if (currentPage === 1) {
      if (!builderName.trim()) {
        Alert.alert('Nome obrigatório', 'Dê um nome ao gabarito para continuar.');
        return;
      }
    }

    if (currentPage === 2) {
      const unanswered = builderQuestions.filter(
        (q) => q.status === 'normal' && q.correctAnswer === null
      );
      if (unanswered.length > 0) {
        const firstFew = unanswered.slice(0, 5).map(q => q.number).join(', ');
        const moreText = unanswered.length > 5 ? '...' : '';
        Alert.alert(
          'Questões pendentes ⚠️',
          `Preencha todas as respostas antes de prosseguir.\n\nQuestões: ${firstFew}${moreText}`,
          [{ text: 'Entendido' }]
        );
        return;
      }
    }
    
    if (currentPage === 0) {
      if (!selectedPresetId) {
        Alert.alert('Selecione um modelo', 'Escolha um modelo de gabarito para continuar.');
        return;
      }
      
      const preset = PRESETS.find(p => p.id === selectedPresetId);
      if (preset) {
        loadPreset(preset.config.totalQuestions, preset.config.groups as any, preset.name);
      }
      
      pagerRef.current?.setPage(currentPage + 1);
      setCurrentPage(currentPage + 1);
      return;
    }

    if (currentPage < TOTAL_STEPS - 1) {
      pagerRef.current?.setPage(currentPage + 1);
      setCurrentPage(currentPage + 1);
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      pagerRef.current?.setPage(currentPage - 1);
      setCurrentPage(currentPage - 1);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        setIsExiting(true);
        setTimeout(() => router.replace('/'), 150);
      }
    }
  };

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
  };

  const handleSaveAndExport = () => {
    const unansweredQuestions = builderQuestions.filter(
      (q) => q.status === 'normal' && q.correctAnswer === null
    );

    if (unansweredQuestions.length > 0) {
      handleFinalSave();
      return;
    }

    const gabarito = saveGabarito();
    
    // Give the UI thread a moment to finish state updates before navigating
    setTimeout(() => {
      router.push(`/wizard/export?id=${gabarito.id}`);
    }, 150);
  };

  const handleFinalSave = () => {
    const unansweredQuestions = builderQuestions.filter(
      (q) => q.status === 'normal' && q.correctAnswer === null
    );

    if (unansweredQuestions.length > 0) {
      const questionNumbers = unansweredQuestions
        .slice(0, 5)
        .map((q) => q.number)
        .join(', ');
      
      const moreText = unansweredQuestions.length > 5 ? '...' : '';

      Alert.alert(
        'Questões pendentes ⚠️',
        `Por favor, preencha todas as respostas antes de salvar. \n\nQuestões: ${questionNumbers}${moreText}`,
        [{ text: 'Entendido' }]
      );
      
      pagerRef.current?.setPage(2);
      setCurrentPage(2);
      return;
    }

    const gabarito = saveGabarito();
    
    setTimeout(() => {
      Alert.alert(
        'Gabarito salvo! ✅',
        `"${gabarito.name}" disponível para impressão e correção.`,
        [
          {
            text: 'Exportar PDF',
            onPress: () => router.push(`/wizard/export?id=${gabarito.id}`),
          },
          {
            text: 'Ir para Início',
            onPress: () => {
              setIsExiting(true);
              setTimeout(() => router.dismissAll(), 150);
            },
          },
        ]
      );
    }, 100);
  };

  if (isExiting) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <WizardHeader
        step={currentPage + 1}
        totalSteps={TOTAL_STEPS}
        title={STEP_TITLES[currentPage]}
        subtitle={STEP_SUBTITLES[currentPage]}
        onBack={handleBack}
        onClose={() => {
          Alert.alert(
            'Sair do Wizard? ⚠️',
            'As alterações não salvas serão perdidas.',
            [
              { text: 'Continuar editando', style: 'cancel' },
              { 
                text: 'Sair e descartar', 
                style: 'destructive',
                onPress: () => {
                  setIsExiting(true);
                  // Brief timeout to let React unmount PagerView natively before Route transition targets it
                  setTimeout(() => router.replace('/'), 180);
                }
              },
            ]
          );
        }}
      />

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
        scrollEnabled={true}
        offscreenPageLimit={1}
      >
        <View key="step-0" style={styles.stepContainer}>
          <StepPreset 
            selectedPreset={selectedPresetId} 
            loadingId={null}
            onSelect={handleSelectPreset} 
          />
        </View>

        <View key="step-1" style={styles.stepContainer}>
          <StepConfigure
            builderName={builderName}
            builderConfig={builderConfig}
            setBuilderName={setBuilderName}
            setTotalQuestions={setTotalQuestions}
            updateGroup={updateGroup}
            addGroup={addGroup}
            removeGroup={removeGroup}
            setSheetTitle={setSheetTitle}
            setInstructions={setInstructions}
          />
        </View>

        <View key="step-2" style={styles.stepContainer}>
          {currentPage >= 1 ? (
            <StepFill
              builderQuestions={builderQuestions}
              builderConfig={builderConfig}
              setCorrectAnswer={setCorrectAnswer}
              toggleQuestionStatus={toggleQuestionStatus}
            />
          ) : null}
        </View>

        <View key="step-3" style={styles.stepContainer}>
          {currentPage >= 2 ? (
            <StepReview
              builderName={builderName}
              builderConfig={builderConfig}
              builderQuestions={builderQuestions}
              onSave={handleFinalSave}
              onSaveAndExport={handleSaveAndExport}
            />
          ) : null}
        </View>
      </PagerView>

      {currentPage < TOTAL_STEPS - 1 && (
        <WizardFooter
          onNext={handleNext}
          onBack={handleBack}
          nextDisabled={
            (currentPage === 0 && !selectedPresetId) ||
            (currentPage === 1 && (!builderName.trim() || builderConfig.totalQuestions < 1))
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pager: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
});
