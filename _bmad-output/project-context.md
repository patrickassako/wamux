---
project_name: 'whatsappAPI'
user_name: 'patrick'
date: '2026-01-14'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
existing_patterns_found: 3
status: 'complete'
rule_count: 35
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Core API:** Python 3.12+ (FastAPI 0.128+, Pydantic v2)
- **WhatsApp Engine:** Node.js 20 LTS (@whiskeysockets/baileys v6+)
- **Database:** Supabase (Postgres 15+, PL/pgSQL)
- **Broker:** Redis 7+ (Streams enabled, persistence required)
- **Infra:** Docker (Alpine based), Railway (Monorepo deployment)

## Critical Implementation Rules

### Language-Specific Rules

**Python (FastAPI Core):**
- **Style:** Strict PEP8. `snake_case` pour variables/fonctions.
- **Typing:** Type Hints obligatoires partout (`def func(a: int) -> str:`).
- **JSON Output:** DOIT utiliser `alias_generator=to_camel` dans Pydantic. L'API parle CamelCase au monde extérieur.

**Node.js (WhatsApp Engine):**
- **Style:** Standard JS/TS. `camelCase` pour tout.
- **TypeScript:** `strict: true`. Pas de `any`.
- **Async:** Utiliser `async/await`, pas de "Callback Hell".

**Data Interchange (The Critical Rule):**
- **Redis Payloads:** `snake_case` (Pour matcher la structure DB Postgres).
- **API Payloads:** `camelCase` (Pour matcher les standards Web/Frontend).

### Framework & Database Rules

### Framework & Database Rules

**FastAPI & Pydantic (v2):**
- **Config:** Utiliser `model_config = ConfigDict(populate_by_name=True)` dans tous les modèles.
- **DB Session:** Toujours utiliser Dependency Injection (`Depends(get_db)`). Jamais de session globale.
- **Auth:** `Depends(get_current_user)` pour toutes les routes protégées.

**Baileys (WhatsApp Engine):**
- **Auth:** Utiliser `useMultiFileAuthState`. NE JAMAIS stocker les crédentials en RAM uniquement.
- **Socket:** `makeWASocket` doit toujours avoir `printQRInTerminal: false` en prod (le QR sort via API).
- **Events:** Gérer `connection.update` pour détecter `DisconnectReason.loggedOut` (Critical).

**Supabase (Postgres):**
- **Security:** RLS (Row Level Security) OBLIGATOIRE sur toutes les tables publiques.
- **Access:** SEUL le service Python a le droit de lire/écrire la DB. Node.js est "DB-Blind".

### Testing Rules

### Testing Rules

**Python (Backend):**
- **Unit:** `pytest`.
- **Integration:** Utiliser `TestClient(app)` de FastAPI.
- **Mocking:** Mocker systématiquement les appels Redis et Stripe.

**Node.js (Engine):**
- **Unit:** `vitest` (Plus rapide que Jest, support natif TS).
- **Golden Rule:** NE JAMAIS lancer de connexion réelle WhatsApp (Socket) dans les tests CI/CD. Toujours mocker `makeWASocket`.

**E2E (Global):**
- Tests de bout en bout manuels ou via scripts `curl` locaux pour vérifier le flux complet (API -> Redis -> Node).

### Code Quality & Style Rules

### Code Quality & Style Rules

**Linters & Formatters:**
- **Python:** `Ruff` (Tout-en-un: remplace Flake8, Black, Isort). Config ultra-stricte.
- **Node.js:** `ESLint` + `Prettier`. Standard TS.

**Naming Conventions (Rappel Critique):**
- **Python:** `snake_case` (fichiers, variables). Classes en `PascalCase`.
- **Node.js:** `camelCase` (variables). Fichiers en `kebab-case` (ex: `auth-service.ts`).

**Documentation:**
- **Python:** Docstrings Google-style obligatoires pour toutes les fonctions publiques.
- **Node.js:** JSDoc pour les interfaces exportées.

### Development Workflow Rules

### Development Workflow Rules

**Git Process:**
- **Branche:** `feature/nom-de-feature`.
- **Commit:** Conventional Commits OBLIGATOIRE (ex: `feat(api): add stripe webhook`, `fix(engine): reconnect logic`).

**Monorepo Helpers (Makefiles):**
- Ne jamais lancer les commandes `npm` ou `uv` manuellement si possible.
- Utiliser le `Makefile` racine :
  - `make dev` -> Lance toute la stack (Docker Compose).
  - `make test` -> Lance pytest + vitest.
  - `make format` -> Lance Ruff + Prettier.

### Critical Don't-Miss Rules

### Critical Don't-Miss Rules

**Anti-Patterns (A NE JAMAIS FAIRE):**
- ❌ **Shared Code:** Ne JAMAIS essayer de partager du code entre `apps/api` (Python) et `apps/engine` (Node). Ils sont étrangers.
- ❌ **Direct DB Access:** Le Node.js ne doit JAMAIS importer `pg` ou toucher à Supabase directement.
- ❌ **Secrets:** Ne jamais committer `.env` ou `auth_info_baileys/`.

**Edge Cases:**
- **Reconnexion:** Si Redis tombe, les deux services doivent retry (Backoff) et ne pas crasher.
- **Zombie Sessions:** Si un container Node est tué, il doit release ses locks Redis/Filesystem.

**Security:**
- Toujours valider les payloads Webhook Stripe/WhatsApp avec la signature cryptographique.

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-01-14
