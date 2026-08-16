<p align="center">
  <img src="logo.jpg" alt="MapMyServer Logo" width="180" />
</p>

<h1 align="center">MapMyServer</h1>

<p align="center">
  <strong>Discord Server Blueprint Analyzer</strong><br/>
  A Chrome Extension + Backend that maps, analyzes, and visualizes the full architecture of Discord communities.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=google-chrome&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## What Is This?

**MapMyServer** turns any Discord server into a structured, analyzable blueprint. Instead of manually browsing through dozens of categories and channels, you get:

- A **collapsible tree** of the entire server hierarchy
- A **node graph** (React Flow) showing how categories and channels connect
- **Channel purpose classification** (Onboarding, Governance, Support, Events, etc.)
- **Rich channel detail cards** with topics, instructions, templates, and rules
- **Source tracking** — every piece of extracted data knows exactly where it came from
- **Statistics dashboard** with content coverage, purpose distribution, and structural metrics

---

## Security Boundary

> **This extension only collects data the current user/application is authorized to access.**

- ✅ Reads page-visible DOM elements on `discord.com`
- ✅ Uses official Discord OAuth2 API for authorized data collection
- ✅ Tags all data with provenance metadata (`page-visible`, `discord-api`, etc.)
- ❌ Does **NOT** extract authentication tokens or cookies
- ❌ Does **NOT** use self-bot patterns or unauthorized API calls
- ❌ Does **NOT** intercept network requests or scrape member lists

---

## Features by Phase

### ✅ Phase 1 — Chrome Extension & Rich Data Model

| Feature | Status |
|---|---|
| Chrome Extension (Manifest V3, Side Panel, Popup) | ✅ |
| React 19 + TypeScript + Vite + CRXJS | ✅ |
| Discord-themed Tailwind CSS design system | ✅ |
| `ServerBlueprint` data model with full type safety | ✅ |
| Categories, Channels (text/voice/stage/forum/announcement/media) | ✅ |
| Threads with `messageCount`, `locked`, `autoArchiveDuration` | ✅ |
| Roles with `managed`, `mentionable`, `hoist`, `permissions` | ✅ |
| **Channel Purpose Classification** (12-purpose taxonomy) | ✅ |
| **Source Tracking** (`ExtractedContent` with full provenance) | ✅ |
| **Structured Channel Content** (instructions, templates, rules, pinned messages) | ✅ |
| **Server Rules** as a first-class feature | ✅ |
| Interactive Tree View with purpose badges & content indicators | ✅ |
| **Channel Detail Slide-Over Panel** with provenance inspector | ✅ |
| Statistics Dashboard (type distribution, purpose coverage, content metrics) | ✅ |
| Change History & Snapshot management | ✅ |
| Rich Mock Data (GDG Community model with templates, rules, instructions) | ✅ |
| DOM-based server detection & structure parsing | ✅ |

### ✅ Phase 2 — Graph UI, Backend & Discord OAuth2

| Feature | Status |
|---|---|
| **Monorepo** (NPM workspaces: `extension`, `backend`, `shared`) | ✅ |
| **Shared Types** (`@mapmyserver/shared` package) | ✅ |
| **React Flow Graph UI** (Dagre auto-layout, interactive pan/zoom) | ✅ |
| **Node.js/Express Backend** with TypeScript | ✅ |
| **Discord OAuth2** (`/api/auth/login`, `/api/auth/callback`) | ✅ |
| **JWT Session Management** | ✅ |
| **Discord API Client** (Guilds, Channels, Roles) | ✅ |
| **Normalizer** (Discord API → `ServerBlueprint` with purpose heuristics) | ✅ |
| **Server List UI** (Login with Discord → select authorized servers) | ✅ |
| Backend `/api/servers` and `/api/servers/:id/blueprint` endpoints | ✅ |

### 🔲 Phase 3 — Search, Filters, Snapshots & Change Detection

| Feature | Status |
|---|---|
| Advanced search (by purpose, content, topic) | 🔲 |
| Export (JSON / CSV / PNG) | 🔲 |
| Snapshot diffing & change detection | 🔲 |
| Server comparison (side-by-side) | 🔲 |

### 🔲 Phase 4 — AI-Powered Analysis

| Feature | Status |
|---|---|
| AI-assisted channel purpose classification | 🔲 |
| Server architecture analysis & recommendations | 🔲 |
| Professional community pattern detection | 🔲 |
| Blueprint recommendations for server optimization | 🔲 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Extension** | React 19, TypeScript, Vite, CRXJS, Tailwind CSS v3, Zustand v5 |
| **Graph UI** | @xyflow/react, dagre (auto-layout) |
| **Backend** | Node.js, Express, Axios, JWT, dotenv |
| **Shared Types** | Pure TypeScript package (`@mapmyserver/shared`) |
| **Browser** | Chrome Manifest V3, Side Panel API, chrome.storage.local |

---

## Project Structure

```
MapMyServer/
├── extension/                     # Chrome Extension (React + Vite)
│   ├── manifest.json              # Chrome Manifest V3
│   ├── sidepanel.html             # Side Panel entry
│   ├── popup.html                 # Popup entry
│   ├── public/icons/              # Extension icons
│   └── src/
│       ├── background/            # Service worker
│       ├── content/               # Discord page observer
│       │   └── parsers/           # DOM parsers
│       ├── services/              # Blueprint builder, statistics, mock data
│       ├── store/                 # Zustand state (server + UI)
│       ├── types/                 # Message types
│       ├── styles/                # Tailwind + global CSS
│       ├── sidepanel/
│       │   └── components/        # All dashboard components
│       │       ├── ServerOverview  # Overview + server rules card
│       │       ├── ServerTree      # Collapsible tree with purpose badges
│       │       ├── ServerGraph     # React Flow node graph
│       │       ├── ChannelDetail   # Slide-over with provenance inspector
│       │       ├── Statistics      # Charts & metrics
│       │       ├── ChangeHistory   # Snapshots & diffs
│       │       ├── ServerList      # Authorized servers (OAuth2)
│       │       └── ...
│       └── popup/                 # Quick overview popup
│
├── backend/                       # Node.js Express API
│   └── src/
│       ├── auth/discord.ts        # OAuth2 login & callback
│       ├── services/
│       │   ├── discordApi.ts      # Discord API client
│       │   └── normalizer.ts      # Discord → ServerBlueprint
│       ├── routes/api.ts          # /api/servers endpoints
│       └── server.ts              # Express entry point
│
├── shared/                        # Shared TypeScript types
│   └── src/index.ts               # ServerBlueprint, Channel, ExtractedContent, etc.
│
├── logo.jpg                       # Project logo
└── package.json                   # NPM workspaces root
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install Dependencies

```bash
npm install
```

### 2. Build All Workspaces

```bash
cd shared && npm run build && cd ..
cd extension && npm run build && cd ..
cd backend && npm run build && cd ..
```

### 3. Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist` folder

### 4. Test with Mock Data

1. Click the extension icon → **Open Side Panel**
2. Click **"🧪 Load Rich Mock Community"**
3. Explore the Tree, Graph, Stats, and Channel Detail panels

### 5. (Optional) Run the Backend for OAuth2

```bash
# Set up Discord app credentials
cp backend/.env.example backend/.env
# Edit backend/.env with your Discord Client ID & Secret

cd backend
npm run dev
```

---

## Data Model Overview

The core `ServerBlueprint` schema captures the full architecture of a Discord community:

```
ServerBlueprint
├── server          → Name, description, features, boost level, member count
├── categories[]    → Ordered category list with channel IDs
├── channels[]      → Name, type, topic, description, content, purpose, permissions
│   ├── content     → welcomeMessage, instructions[], rules[], template, pinnedMessages[]
│   └── purpose     → ONBOARDING | GOVERNANCE | COMMUNITY | SUPPORT | ... (12 types)
├── threads[]       → Name, archived, locked, messageCount
├── roles[]         → Name, color, position, managed, hoist, mentionable
├── rules           → First-class server rules with source provenance
├── statistics      → Type counts, purpose distribution, content coverage
├── collectedAt     → Timestamp
└── version         → Schema version (currently 2)
```

Every piece of extracted content includes full **source tracking**:

```typescript
interface ExtractedContent {
  text: string;
  source: {
    type: "channel-topic" | "message" | "pinned-message" | "welcome-message" | ...;
    channelId: string;
    messageId?: string;
    authorName?: string;
    collectedAt: string;
    visibility: { source: "discord-api" | "page-visible"; accessibleToUser: boolean };
  };
}
```

---

## License

MIT
