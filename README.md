# MapMyServer
Discord Server Blueprint Analyzer

# Discord Server Blueprint

A Chrome Extension that analyzes, visualizes, and compares Discord server structures.

## What It Does

When you're browsing Discord, this extension:
1. **Detects** the server you're currently viewing
2. **Collects** the server structure visible to your account
3. **Normalizes** it into a structured data model
4. **Renders** it as an interactive tree, statistics dashboard, and change history

## Security Boundary

This extension:
- ✅ Reads only what's visible in the Discord UI (page-visible data)
- ✅ Tags all data with its provenance (`page-visible`, `discord-api`, etc.)
- ❌ Does NOT extract authentication tokens or cookies
- ❌ Does NOT use self-bot patterns or unauthorized API calls
- ❌ Does NOT intercept network requests

## Features (Phase 1)

- **Server Detection** — Automatically identifies the current Discord server from the URL
- **Structure Analysis** — Parses categories, channels (text, voice, stage, forum, announcement), and threads
- **Interactive Tree View** — Collapsible, searchable, filterable server structure tree
- **Statistics Dashboard** — Channel type distribution, category breakdowns, key metrics
- **Change History** — Save snapshots and track structural changes over time
- **Side Panel UI** — Persistent dashboard alongside the Discord page
- **Popup** — Quick overview with one-click analysis

## Tech Stack

- **TypeScript** + **React 19** + **Vite** + **CRXJS**
- **Tailwind CSS** v3 (Discord-inspired dark theme)
- **Zustand** v5 for state management
- **Chrome Manifest V3** with Side Panel API
- **chrome.storage.local** for persistence

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
cd extension
npm install

# Development (with HMR)
npm run dev

# Production build
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## Project Structure

```
extension/
├── manifest.json              # Chrome Manifest V3
├── sidepanel.html             # Side Panel entry
├── popup.html                 # Popup entry
├── public/icons/              # Extension icons
└── src/
    ├── background/            # Service worker
    ├── content/               # Discord page observer
    │   └── parsers/           # DOM parsers (isolated for maintenance)
    ├── services/              # Blueprint builder, storage, statistics
    ├── store/                 # Zustand state management
    ├── types/                 # TypeScript type definitions
    ├── styles/                # Tailwind + global CSS
    ├── sidepanel/             # Side Panel React app
    │   └── components/        # Dashboard components
    └── popup/                 # Popup React app
```

## Roadmap

- **Phase 2** — React Flow graph visualization, export (JSON/CSV/PNG), search enhancements
- **Phase 3** — Roles, permissions, change diffs, Discord OAuth2 backend
- **Phase 4** — Server comparison, structural analysis, pattern detection
- **Phase 5** — AI-powered analysis and recommendations

## License

MIT

