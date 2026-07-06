# Gabaritei - OMR Inteligente



## 📌 Sobre o Projeto

**Gabaritei** é um aplicativo móvel avançado desenvolvido para estudantes e professores. Ele automatiza a correção de provas e simulados usando a tecnologia OMR (Optical Mark Recognition) através da câmera do dispositivo. Com um design premium focado em UX (User Experience) e dark mode nativo, oferece correção inteligente e feedback em tempo real.

## 🚀 Principais Funcionalidades

- **Montagem de Gabaritos**: Crie gabaritos personalizados para simulados (ex: ENEM, vestibulares) de forma intuitiva.
- **Escaneamento por Câmera (OMR)**: Leitura rápida e precisa de folhas de respostas preenchidas usando algoritmos de visão computacional.
- **Histórico e Desempenho**: Acompanhe o histórico de correções, veja estatísticas de acertos/erros.
- **Design Premium**: Interface fluida, moderna (Glassmorphism), transições suaves sem "white flashes", e tipografia limpa (Inter & Outfit).
- **Offline First**: A maior parte da correção OMR acontece no próprio dispositivo, garantindo privacidade e velocidade.

## 🛠️ Stack Tecnológica

O projeto foi construído utilizando as melhores práticas do ecossistema mobile atual:

- **[React Native](https://reactnative.dev/)** & **[Expo Router](https://expo.dev/)**: Roteamento baseado em arquivos com transições nativas.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estática rigorosa para prevenir erros e melhorar a escalabilidade do código.
- **[Zustand](https://github.com/pmndrs/zustand)**: Gerenciamento de estado global leve e performático.
- **[Reanimated 3](https://docs.swmansion.com/react-native-reanimated/)**: Animações nativas com 60fps para uma interface viva e responsiva.
- **[Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)** & Processamento OMR customizado: Captura e análise de imagens no client-side.

## 📁 Arquitetura do Projeto

A arquitetura segue os princípios de separação de responsabilidades (SOLID), mantendo a pasta `app/` exclusivamente para roteamento e a `src/` para lógica de negócios.

```text
├── app/                  # Rotas do Expo Router (Telas e Layouts)
│   ├── (tabs)/           # Telas com Bottom Tab Navigation
│   ├── gabarito/         # Telas de detalhes e correção
│   └── _layout.tsx       # Root layout com providers e configuração de tema
├── assets/               # Imagens, fontes e screenshots
├── src/                  # Código-fonte principal (Lógica e UI)
│   ├── components/       # Componentes React reutilizáveis
│   ├── constants/        # Temas, cores, e constantes globais (ex: enem.ts)
│   ├── hooks/            # Custom hooks (ex: useGabarito.ts)
│   ├── lib/              # Bibliotecas utilitárias (Image Processing)
│   ├── services/         # Serviços de API, exportação de dados
│   ├── store/            # Gerenciamento de estado (Zustand)
│   ├── types/            # Tipagens globais do TypeScript
│   └── utils/            # Ferramentas auxiliares, engine OMR (OpenCV)
```

## ⚙️ Instalação e Uso

### Pré-requisitos
- Node.js (v18+)
- Gerenciador de pacotes (npm, yarn, ou bun)
- Expo Go instalado no celular físico (ou emulador configurado).

### Passos para rodar localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/gabaritei-ia.git
   cd gabaritei-ia
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npx expo start -c
   ```

4. **Abra o app:**
   Escaneie o QR Code gerado no terminal usando o aplicativo Expo Go no seu smartphone ou pressione `a` para abrir no Android Emulator e `i` para iOS Simulator.

