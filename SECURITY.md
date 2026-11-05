# Security Policy

MapMyServer is committed to ensuring the security and privacy of our users. As a client-side browser extension dealing with community architecture data and Bring Your Own Key (BYOK) AI credentials, security is built into our core design principles.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Core Security & Privacy Principles

### 1. Local-Only Storage (Zero Telemetry)
- All scanned blueprints, server snapshots, templates, and AI conversation histories are stored strictly within your browser's `chrome.storage.local`.
- No user accounts, registration, or external MapMyServer backend servers are required or utilized.
- No telemetry, analytics, cookies, or tracking pixels are included in the extension.

### 2. Bring Your Own Key (BYOK) Credential Safety
- API keys entered for OpenAI, Anthropic, Google Gemini, OpenRouter, or Custom Ollama endpoints are stored solely in local client storage.
- Credentials are never logged to the browser console, transmitted to any third party, or embedded in exported blueprints.
- AI requests are initiated strictly upon explicit user interaction.

### 3. Discord Permission Boundary Enforcement
- **Mode A (Full Administrator)**: Activated only when the current account possesses genuine Administrator privileges or server ownership.
- **Mode B (Accessible Member)**: When scanning as a non-administrator, MapMyServer captures only channels and categories visibly accessible to that account. Inaccessible channels or restricted overwrites are never scraped, fabricated, or bypassed.

### 4. Discord Bot Token Safety in Automation Scripts
- Generated `discord.js` v14 and `discord.py` v2 recreation scripts strictly read credentials via `process.env.DISCORD_BOT_TOKEN`.
- MapMyServer never requests, captures, or stores Discord user tokens or self-bot automation credentials.

### 5. Prompt Injection Defense
- Scanned server text, channel names, descriptions, and topics are enclosed in security delimiter boundaries and sanitized before dispatch to LLM providers to defuse delimiter attacks and prompt injection.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability within MapMyServer, please report it privately:

1. **Email**: Open a security disclosure issue or contact the maintainers at `security@mapmyserver.org` (or directly via GitHub Security Advisories).
2. **Details**: Provide a detailed description of the vulnerability, steps to reproduce, and any relevant proof-of-concept code.
3. **Response Time**: Maintainers will acknowledge receipt within 48 hours and provide a remediation timeline.

Please do not disclose security issues publicly until a fix has been released.
