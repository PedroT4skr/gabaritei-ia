# Gabaritei - OMR Correção Inteligente

## Visão Geral
Aplicativo mobile React Native (Expo) para Android e iOS que permite a criação, personalização e correção automatizada de gabaritos no padrão ENEM. Utiliza leitura óptica de marcas (OMR) via câmera do celular para corrigir provas de forma rápida e offline.

## Público-Alvo
- Estudantes brasileiros preparando-se para o ENEM
- Professores e cursinhos que aplicam simulados
- Qualquer pessoa que precise corrigir gabaritos de múltipla escolha

## Objetivos do Projeto
1. Permitir a montagem interativa de gabaritos personalizados (Passo-a-passo)
2. Customização total da folha (Título, Instruções, Rodapé)
3. Exportar folhas de respostas profissionais (estilo OMR/ZipGrade) em PDF, PNG e JPG
4. Pré-visualização inteligente antes da exportação
5. Corrigir gabaritos via câmera do celular usando OMR (Optical Mark Recognition)
6. Calcular resultados detalhados e armazenar histórico offline

## Stack Técnica

### Framework & Linguagem
- **Expo SDK 54** (React Native 0.81, React 19)
- **TypeScript** (strict mode)
- **expo-router** (file-based routing)

### Navegação
- **expo-router** com layout de tabs inferiores (Bottom Tabs)
- 4 abas: **Início** (DASHBOARD), **Montar** (LISTA/WIZARD), **Scanner** (OMR), **Histórico** (RESULTADOS)
- Fluxo de criação em **Full-screen Wizard** (independente das tabs)

### Estado Global
- **Zustand** com middleware `persist` + `@react-native-async-storage/async-storage`

### Câmera & Processamento de Imagem
- **expo-camera** (compatível com Expo Go)
- **expo-image-manipulator** (grayscale, resize, crop)
- Pipeline OMR em JavaScript: grayscale → threshold → detecção de bolhas

### Exportação & OMR
- **react-native-view-shot** (captura de view como PNG/JPG)
- **expo-print** (geração de PDF e **Preview** do gabarito)
- **Fiduciary Markers** (Anchor points nos 4 cantos para alinhamento via OpenCV/OMR)
- **expo-sharing** (compartilhamento nativo)
- **expo-file-system** (I/O de arquivos)
- **expo-media-library** (salvar na galeria)

### UI & Animações
- **react-native-reanimated** (animações fluidas)
- **react-native-gesture-handler** (gestos)
- **expo-linear-gradient** (gradientes)
- **@expo/vector-icons** (Ionicons, MaterialCommunityIcons)

### Qualidade
- TypeScript strict
- ESLint (via Expo)

## Arquitetura de Pastas
```
/app
  ├── (tabs)/           # Abas principais (Home, Build, Scanner, History)
  ├── wizard/           # Fluxo Step-by-Step de criação de gabarito
  │     ├── preset.tsx      # Passo 1: Escolha de modelo/preset
  │     ├── configure.tsx   # Passo 2: Configuração (nome, questões, grupos)
  │     ├── fill.tsx        # Passo 3: Preenchimento do gabarito
  │     ├── review.tsx      # Passo 4: Revisão e Salvamento
  │     └── export.tsx      # Tela de Exportação (PDF/Imagem)
  └── _layout.tsx       # Root layout com providers
/src
  ├── components/       # Componentes (WizardHeader, WizardFooter, QuestionGrid)
  ├── store/            # GabaritoStore (Zustand + Persist)
  ├── services/         # exportService.ts (Gerenciamento de PDF/PNG)
  ├── constants/        # theme.ts, enem.ts (Cores e presets)
  └── types/            # gabarito.ts (Interfaces)
```

## Decisões de Design
1. **UI em Português (pt-BR)** — Todo o app em português brasileiro
2. **Dark Mode** como padrão — Cores ENEM (verde #00A86B, azul #1B4D8E, branco)
3. **Expo Go compatível** — Sem necessidade de development build na fase inicial
4. **Offline-first** — Nenhuma funcionalidade requer internet
5. **expo-router** — Routing baseado em arquivos (padrão do Expo SDK 52)

## Requisitos Não-Funcionais
- Performance: renderização suave de grids com até 200 questões
- Responsivo: funciona em telas de 4.7" a tablets
- Acessibilidade: tamanhos de toque mínimo 44px
- Tempo de abertura: < 2 segundos
