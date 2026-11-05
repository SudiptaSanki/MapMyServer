# Changelog

All notable changes to the MapMyServer project will be documented in this file.

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
