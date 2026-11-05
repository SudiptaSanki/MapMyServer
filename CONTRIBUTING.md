# Contributing to MapMyServer

Thank you for your interest in contributing to MapMyServer! MapMyServer is an open-source, client-side Discord Server Architecture and Management Intelligence platform.

---

## Architecture Overview

MapMyServer is built as a TypeScript monorepo with three packages:

- **`shared/`**: Universal pure-TypeScript business logic, models, permission engine, security audit center, cloner engine, comparison algorithms, and script generators. Zero DOM dependencies.
- **`extension/`**: Chrome Manifest V3 extension containing:
  - `src/content/`: Content scripts and DOM parsers for Discord's web client.
  - `src/background/`: MV3 background service worker for state orchestration and storage.
  - `src/sidepanel/`: React 19 UI dashboard with Tailwind CSS.
  - `src/ai/`: Multi-provider BYOK LLM integration engine.
- **`backend/`**: Optional headless API bridge for automated server deployments.

---

## Development Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Google Chrome** (or Chromium-based browser)

### 2. Installation
```bash
git clone https://github.com/SudiptaSanki/MapMyServer.git
cd MapMyServer
npm install
```

### 3. Build & Test
```bash
# Build all workspaces
npm run build

# Run unit and integration tests
npm test

# Run tests in watch mode
npx vitest
```

### 4. Load the Extension in Chrome
1. Navigate to `chrome://extensions/` in Google Chrome.
2. Toggle **Developer mode** (top-right corner) to **ON**.
3. Click **Load unpacked** (top-left corner).
4. Select the `extension/dist` directory.

---

## Coding Guidelines

1. **Icons**: Use **Lucide React** icons exclusively for UI elements. Never use raw Unicode emoji icons.
2. **Access Control**: Never bypass Discord permissions or scrape private/inaccessible channels. Treat DOM parsing as a best-effort, non-intrusive fallback.
3. **Privacy**: Never introduce external analytics, tracking pixels, or mandatory backend accounts. Keep all credentials strictly client-side in `chrome.storage.local`.
4. **Deterministic Testing**: All algorithms (permission calculation, cloner plan generation, security auditing, comparison diffs) must have unit tests with deterministic fixtures.
5. **Linting & Formatting**: Ensure code adheres to TypeScript strict configuration with zero compiler errors.

---

## Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-feature-name
   ```
2. Verify all test suites pass:
   ```bash
   npm test
   ```
3. Verify that the production build succeeds cleanly:
   ```bash
   npm run build
   ```
4. Commit your changes with descriptive commit messages following the Conventional Commits specification (e.g., `feat:`, `fix:`, `docs:`, `test:`).
5. Open a Pull Request against the `main` branch.
