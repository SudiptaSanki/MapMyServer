# Changelog

All notable changes to the MapMyServer project will be documented in this file.

---

## [1.1.0] - 2026-11-06

### Enhanced Private Channel Intelligence, In-Discord Scraping Guide & Live Implementation Roadmap

#### New Features & Improvements
- **Private vs. Common/Public Channel & Category Intelligence**:
  - Direct DOM padlock detection (`detectPadlock`) identifying restricted channels and categories even prior to opening Discord channel permissions modals.
  - Automatic Private Audience inference (`inferPrivateAudience`), categorizing private areas into Server Administration Only, Staff & Moderation Team, Bot Logs & System Audits, Server Boosters & VIP, Developers & Tech Staff, and Private Voice & Meetings.
  - Prominent visual lock badges and audience pills across Server Tree, Architecture Graph, and Smart Cloner.
  - Enhanced channel visibility evaluation prioritizing padlock cues into `role-restricted` status with explanatory audience reasoning.
- **Deep Architecture Scraping & In-Discord Settings Guide**:
  - Interactive deep-scraping checklist in `ServerOverview.tsx` guiding server owners to exact Discord settings:
    - *Roles & Hierarchy*: Server Settings ➔ Roles
    - *Private Channel Overwrites*: Right-click Channel ➔ Edit Channel ➔ Permissions
    - *Server Description & Details*: Server Settings ➔ Overview
  - Real-time DOM watcher monitoring Server Settings ➔ Overview to auto-extract server descriptions and dispatch `SERVER_OVERVIEW_COLLECTED`.
  - Contextual in-Discord tips in `ChannelDetail.tsx` when explicit overrides have not yet been scanned.
- **AI Architecture Suggestions with True Grounded Context**:
  - Grounded prompt construction (`aiContextBuilder.ts`) embedding true channel privacy classifications (`[PRIVATE: Audience]` vs `[PUBLIC/COMMON]`), full role hierarchy, overwrites, and security posture.
  - BYOK onboarding callout in AI Advisor guiding users to connect OpenAI, Anthropic, Gemini, Groq, or local Ollama credentials.
- **Server Implementation Roadmap & Live Progress Tracker**:
  - Persistent architecture roadmap storage (`roadmapService.ts`) in `chrome.storage.local` with survival across browser and window restarts.
  - One-click "Adopt Proposal as Implementation Roadmap" from the AI Architecture Planning Sandbox.
  - Real-time progress evaluation (`evaluateRoadmapProgress`) with percentage metrics and completed vs pending counters.
  - **Green Light Highlights**: Verified categories, channels, and roles light up in glowing emerald `[✓ COMPLETED] / [✓ Live in Discord]`.
  - Actionable pending cards detailing Discord recreation steps (channel type, category placement, and private role access).
  - Cross-Server Comparison & Tracking: verify progress against the active Discord server or any saved secondary server.
  - One-click "Re-scan & Verify Discord Changes" triggering live DOM sweeps.
  - Markdown checklist export and reset/delete plan safeguards.

---

## [1.0.0] - 2026-11-05

### Major Release — Stable Public Release v1.0

MapMyServer v1.0.0 is the first stable public release of the standalone, open-source Discord Server Architecture and Management Intelligence Chrome extension.

#### Highlights & Capabilities
- **Real-World Discord Scanning Pipeline**:
  - Automated detection of Discord guilds, channels, categories, and active channel topics.
  - Virtualized scroller sweep scan for large communities with 50+ categories and hundreds of channels.
  - Multi-slice incremental parsing with non-intrusive DOM observation and zero jitter.
  - Auto-reloading and graceful recovery during server switching and network interruptions.
- **Permission Intelligence Engine**:
  - Full bitfield evaluation for Discord channel and role permissions.
  - Support for `@everyone` base permissions, role aggregates, member overwrites, and Administrator bypass.
  - Category permission synchronization and inheritance checking.
  - 5-tier channel visibility classification (`broadly-accessible`, `role-restricted`, `member-restricted`, `inaccessible`, `unknown`).
- **Security Audit Center & Server Health Score**:
  - Deterministic 100-point server health and security posture scoring.
  - Detection of public @everyone mentions, administrative role sprawl, unlinked channels, and permissive overwrites.
  - Step-by-step remediation advice for administrators.
- **AI Server Architect (Multi-Provider BYOK)**:
  - Bring-Your-Own-Key support for OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), Google Gemini (2.0 Flash), OpenRouter, and Custom/Local Ollama endpoints.
  - 100% local client-side credential storage with zero telemetry.
  - Grounded architecture advisor distinguishing observed facts from suggestions.
  - What-If Planning Mode with visual diff generation.
  - Multi-audience documentation generator (Developer, Moderator, Community formats in MD, HTML, JSON, CSV).
- **Curated Server Templates & Version History**:
  - 9 production templates across Developer Communities, Gaming Guilds, Creator Spaces, Startups, and Education.
  - Custom template builder with sensitive channel sanitization.
  - Architecture version snapshots with rollback comparison and timeline diffs.
- **Smart Server Cloner (8-Step Guided Workflow)**:
  - Automatic detection of Mode A (Full Admin) vs Mode B (Accessible Member) with mandatory transparency disclosures.
  - Granular category and channel picking with inline renaming and description toggling.
  - Safe recreation planning with atomic dependencies (`CREATE_CATEGORY` before `CREATE_CHANNEL`).
  - Selective Merge into existing destination servers with duplicate skipping without mutations.
  - Production automation script generation for `discord.js` v14 and `discord.py` v2 with `--dry-run` safety, idempotency, and environment-variable bot tokens.
  - Step-by-step manual Markdown checklist generator.
- **Zero-Telemetry Local Privacy & Data Backup**:
  - Comprehensive JSON data export and one-click backup restoration.
  - Emergency data wipe controls with confirmation safeguards.
  - Interactive 5-step First-Time User Walkthrough and Quick Guide modal.
- **Testing & Quality Assurance**:
  - 63 automated unit and integration tests across 9 test suites passing 100%.
  - Clean TypeScript compilation across `@mapmyserver/shared`, `discord-server-blueprint-extension`, and `@mapmyserver/backend`.

