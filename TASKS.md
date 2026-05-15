# TASKS — Gabarito IA - Correção ENEM

## 📋 Backlog por Fases

---

### Fase 1: Setup + Estrutura + Navegação + Tela de Montar Gabarito
| # | Tarefa | Status |
|---|--------|--------|
| 1.1 | Criar projeto Expo SDK 54 | ✅ CONCLUÍDO |
| 1.2 | Instalar dependências | ✅ CONCLUÍDO |
| 1.3 | Criar CONTEXT.md e TASKS.md | ✅ CONCLUÍDO |
| 1.4 | Configurar app.json | ✅ CONCLUÍDO |
| 1.5 | Criar estrutura de pastas /src | ✅ CONCLUÍDO |
| 1.6 | Tipos TypeScript | ✅ CONCLUÍDO |
| 1.7 | Constantes (tema, cores ENEM, presets) | ✅ CONCLUÍDO |
| 1.8 | Store Zustand com persistência | ✅ CONCLUÍDO |
| 1.9 | Navegação (expo-router + bottom tabs) | ✅ CONCLUÍDO |
| 1.10 | Tela Inicial (Home) | ✅ CONCLUÍDO |
| 1.11 | Tela Montar Gabarito (wizard step-by-step) | ✅ CONCLUÍDO |
| 1.12 | QuestionGrid + BubbleRow | ✅ CONCLUÍDO |
| 1.13 | Pontuação dinâmica e anulação | ✅ CONCLUÍDO |
| 1.14 | Tela Scanner (placeholder) | ✅ CONCLUÍDO |
| 1.15 | Tela Histórico | ✅ CONCLUÍDO |
| 1.16 | Dark theme + animações | ✅ CONCLUÍDO |

---

### Fase 1.5: Reestruturação do Fluxo de Montagem (Wizard)
| # | Tarefa | Status |
|---|--------|--------|
| 1.5.1 | Criar wizard layout (app/wizard/_layout.tsx) | ✅ CONCLUÍDO |
| 1.5.2 | Componentes WizardHeader + WizardFooter | ✅ CONCLUÍDO |
| 1.5.3 | Passo 1: Escolher Modelo (preset.tsx) | ✅ CONCLUÍDO |
| 1.5.4 | Passo 2: Configurar (configure.tsx) | ✅ CONCLUÍDO |
| 1.5.5 | Passo 3: Preencher Gabarito (fill.tsx) | ✅ CONCLUÍDO |
| 1.5.6 | Passo 4: Revisar & Salvar (review.tsx) | ✅ CONCLUÍDO |
| 1.5.7 | Aba "Montar" → Lista de gabaritos salvos + FAB | ✅ CONCLUÍDO |

---

### Fase 2: Exportação do Gabarito
| # | Tarefa | Status |
|---|--------|--------|
| 2.1 | Serviço de exportação (exportService.ts) | ✅ CONCLUÍDO |
| 2.2 | Geração de PDF com HTML formatado (expo-print) | ✅ CONCLUÍDO |
| 2.3 | Captura de view como imagem (react-native-view-shot) | ✅ CONCLUÍDO |
| 2.4 | Tela de exportação (wizard/export.tsx) | ✅ CONCLUÍDO |
| 2.5 | Compartilhamento via expo-sharing | ✅ CONCLUÍDO |
| 2.6 | Salvar na galeria via expo-media-library | ✅ CONCLUÍDO |

---

### Fase 3: Câmera + OMR (Advanced Structural Engine)
| # | Tarefa | Status |
|---|--------|--------|
| 3.1 | Tela de câmera com expo-camera | ✅ CONCLUÍDO |
| 3.2 | Overlay de câmera com guias de alinhamento A4 | ✅ CONCLUÍDO |
| 3.3 | Captura com correção de EXIF Orientation (Android) | ✅ CONCLUÍDO |
| 3.4 | Motor OMR: Homografia (Transformada de Perspectiva) | ✅ CONCLUÍDO |
| 3.5 | Motor OMR: Adaptive Local Thresholding (Luz Ambiental) | ✅ CONCLUÍDO |
| 3.6 | Motor OMR: RANSAC Anchor Validation | ✅ CONCLUÍDO |
| 3.7 | Detecção de Múltiplas Marcações e Anulações | ✅ CONCLUÍDO |
| 3.8 | Tela de resultados com markers 1:1 SVG | ✅ CONCLUÍDO |

---

### Fase 4: Resultado Detalhado + Histórico
| # | Tarefa | Status |
|---|--------|--------|
| 4.1 | Cálculo Real: Pontos Ganhos vs Total (Pesos) | ✅ CONCLUÍDO |
| 4.2 | Lista detalhada questão a questão (Modal) | 🕒 PRÓXIMO PASSO |
| 4.3 | Persistência do Histórico de Correções (Store) | ⬜ PENDENTE |
| 4.4 | Suporte a múltiplos cadernos (Cores ENEM) | ⬜ PENDENTE |
| 4.5 | Exportação de Relatório de Correção (PDF/CSV) | ⬜ PENDENTE |

---

### Fase 5: Polimento + Avançado
| # | Tarefa | Status |
|---|--------|--------|
| 5.1 | Performance com 200+ questões | ⬜ PENDENTE |
| 5.2 | Micro-animações e transições | ⬜ PENDENTE |
| 5.3 | Acessibilidade | ⬜ PENDENTE |
| 5.4 | Ícone e splash screen | ⬜ PENDENTE |

---

## 📝 Log de Iterações

### Iteração 1 — Fase 1 Completa ✅
**Data:** 2026-04-02
- Projeto criado com Expo SDK 54 (React 19, RN 0.81)
- Todas as funcionalidades da Fase 1 implementadas

### Iteration 2 — Reestruturação Wizard + Fase 2 ✅
**Data:** 2026-04-02

**Mudanças principais:**
- **Reestruturação do fluxo "Montar Gabarito"**: removidos os cards expansíveis, substituídos por um wizard passo-a-passo com navegação entre telas:
  - Passo 1: Escolher Modelo (presets ENEM ou personalizado)
  - Passo 2: Configurar (nome, questões, grupos, pontuação)
  - Passo 3: Preencher Gabarito (grid interativo com bolinhas)
  - Passo 4: Revisar & Salvar (resumo completo + botão salvar)
- **Componentes novos**: WizardHeader (com indicador de passos), WizardFooter (botões Avançar/Voltar)
- **Aba "Montar" redesenhada**: agora mostra lista de gabaritos salvos com cards (editar, exportar, excluir) + FAB "+" para criar novo
- **Fase 2 (Exportação)** implementada:
  - Serviço de exportação com suporte a PNG, JPG e PDF
  - PDF gerado a partir de HTML com layout dark profissional (cores ENEM)
  - Tela de exportação com opções de formato + compartilhamento + salvar no dispositivo
- **Estabilização Técnica**:
  - TSConfig e Dependências SDK 54 resolvidas
  - Importações padronizadas para relativos (melhor suporte no IDE)

### Iteration 3 — Customização Avançada + Preview (OMR Ready) ✅
**Data:** 2026-04-02

**Mudanças principais:**
- **Folha de Respostas OMR (ZipGrade Style)**:
  - O PDF agora é gerado em Branco e Preto puro para impressão.
  - Adicionados **Âncoras (Fiduciary Markers)** nos 4 cantos e laterais para o scanner.
  - Layout otimizado em colunas (max 30q por coluna).
- **Personalização Total**:
  - Novo título customizado na folha (ex: SIMULADO X).
  - Quadro de **Instruções ao Aluno** (ex: "Use caneta preta").
  - Rodapé customizável.
- **Preview Inteligente**:
  - Novo botão "Visualizar Folha" na Revisão (Passo 4).
  - Gera uma prévia exata do PDF final antes do salvamento.
- **Estabilização**:
  - Limpeza de Warnings de tipagem e lint.

---

### Iteration 4 — Industrial Computer Vision (Homography) ✅
**Data:** 2026-04-03
- **Motor OMR Industrial (Upgrade 3.1)**:
  - Implementada **Transformada de Homografia**: Corrige perspectiva 3D (trapezoidal skew) permitindo scans inclinados.
  - **Adaptive Thresholding**: Detecção de bolhas imune a sombras pesadas e luz irregular.
  - **Filtro RANSAC**: Busca estrutural de âncoras (ignora sujeiras e textos nas bordas).
- **Correção de Hardware**:
  - Resolvido bug de rotação EXIF do Android (ImageManipulator stripping).
  - Clamping matemático rigoroso para evitar `IllegalArgumentException` no sensor nativo.
- **Lógica de Negócio**:
  - Suporte a múltiplas marcações (cor amarela) e questões anuladas (cor azul).
  - Cálculo de nota baseado no peso real dos grupos de questões do gabarito.

---

## 📈 Status Atual
- **Fase 1 (Estrutura)**: ✅ CONCLUÍDO
- **Fase 2 (Exportação)**: ✅ CONCLUÍDO
- **Fase 3 (OMR 3.1)**: ✅ CONCLUÍDO
- **Fase 4 (Histórico)**: 🕒 PRÓXIMO PASSO
- **Fase 5 (Polimento)**: ⬜ PENDENTE
ac<!-- sync chunk 33 -->
<!-- sync chunk 34 -->
<!-- sync chunk 35 -->
<!-- sync chunk 36 -->
<!-- sync chunk 37 -->
<!-- sync chunk 38 -->
<!-- sync chunk 39 -->
<!-- sync chunk 40 -->
<!-- sync chunk 41 -->
<!-- sync chunk 42 -->
<!-- sync chunk 43 -->
<!-- sync chunk 44 -->
<!-- sync chunk 45 -->
<!-- sync chunk 46 -->
<!-- sync chunk 47 -->
<!-- sync chunk 48 -->
