---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
inputDocuments: ['/Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/prd.md', '/Users/apple/Documents/whatsappAPI/_bmad-output/analysis/brainstorming-session-2026-01-14.md']
workflowType: 'architecture'
project_name: 'whatsappAPI'
user_name: 'patrick'
date: '2026-01-14'
status: 'complete'
completedAt: '2026-01-14'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Analyse du Contexte du Projet

### Aperçu des Exigences

**Exigences Fonctionnelles :**
Le projet est une Gateway WhatsApp "Unofficial" de type SaaS API.
Les composants architecturaux majeurs sont :
1.  **Core SaaS & API (Python/FastAPI) :** Gestion des utilisateurs, facturation (Stripe/Flutterwave), clés API, et l'API publique REST pour l'envoi de messages (Texte, Média).
2.  **WhatsApp Engine (Node.js/Baileys) :** Microservices "dumb" gérant la connexion WebSocket avec WhatsApp, la sérialisation des sessions (Multi-device), et l'exécution des envois.
3.  **Bridge & State (Redis) :** Communication inter-processus et files d'attente pour le lissage du trafic (Anti-ban).
4.  **Webhooks System :** Dispatching des événements entrants vers les clients finaux.

**Exigences Non-Fonctionnelles (Architectural Drivers) :**
-   **Anti-Ban Reliability :** L'architecture doit imposer un Rate Limiting strict et aléatoire par session pour simuler un comportement humain.
-   **Zero-Trust Security :** Les clés de session ne doivent jamais être exposées ; chiffrement au repos obligatoire.
-   **Auto-Healing :** Redémarrage automatique des processus Baileys en cas de crash ou déconnexion.
-   **Scalabilité Verticale :** Optimisation RAM pour tenir 50+ sessions sur un petit VPS.

**Échelle et Complexité :**
-   Domaine principal : API Backend & Systèmes Distribués (Messaging).
-   Niveau de complexité : Moyen-Élevé (Dû à la nature hybride Python/Node et à la gestion d'état WebSocket instable).
-   Composants architecturaux estimés : 3 principaux (API Controller, Worker Engine, Redis Broker) + Base de données (Supabase).

### Contraintes Techniques et Dépendances

-   **Stack Imposée :** Python (FastAPI) pour le Back-office/API Business + Supabase (Postgres).
-   **Moteur WhatsApp :** Node.js avec la librairie Baileys (Contrainte forte car pas d'équivalent Python stable).
-   **Communication :** Redis Pub/Sub obligatoire pour le pont entre Python et Node.js.
-   **Déploiement :** Dockerisation nécessaire pour orchestrer les conteneurs hétérogènes.

### Préoccupations Transversales (Cross-Cutting Concerns)

-   **Gestion des Erreurs & Monitoring :** Détection des déconnexions WhatsApp et notification immédiate via Webhook/Email.
-   **Sécurité des Données :** Chiffrement des crédentials de session Auth (AES-256).
-   **Logging & Traçabilité :** Suivi précis des messages de l'API jusqu'à la livraison WhatsApp.
-   **Maintenance des processus :** Cycle de vie des processus Node.js (Zombie processes, memory leaks).

## Évaluation du Modèle de Démarrage (Starter)

### Domaine Technologique Principal
**Architecture Hybride Monorepo** (Python Backend + Node.js Workers)

### Options de Démarrage Analysées

1.  **Option A : Starters Séparés (FastAPI Supabase + Baileys Docker)**
    *   *FastAPI :* Templates existants souvent datés ou trop complexes.
    *   *Baileys :* Nécessite le fork maintenu `@whiskeysockets/baileys`, souvent absent des vieux starters.

2.  **Option B : Générateur Polyglotte**
    *   Souvent trop générique pour nos besoins spécifiques (Supabase/Redis).

3.  **Option C : Assemblage Sur-Mesure "Golden Stack" (Sélectionné)**
    *   Création manuelle d'un monorepo propre `apps/api` (FastAPI) et `apps/engine` (Node.js).
    *   Orchestration unifiée via Docker Compose.

### Starter Sélectionné : Custom Hybrid Monorepo

**Raison du choix :**
Cette approche garantit l'utilisation des versions à jour et maintenues : **FastAPI (0.128.0+)** et **@whiskeysockets/baileys** (seul fork actif). Elle permet une séparation propre des responsabilités sans dette technique inutile. C'est le meilleur compromis pour gagner en temps, sécurité et qualité.

**Commande d'Initialisation (Plan) :**

```bash
# Structure recommandée
mkdir whatsappAPI
cd whatsappAPI
mkdir -p apps/api apps/engine
touch docker-compose.yml
# Initialisation progressive des services
```

**Décisions Architecturales Fournies :**

**Langage & Runtime :**
- **Core:** Python 3.12+ avec gestionnaire **UV** (ultra-rapide) ou Poetry.
- **Engine:** Node.js 20 LTS (Alpine).

**Build & Deploy :**
- **Containerisation :** Docker Multi-stage builds optimisés.
- **Orchestration :** Docker Compose V2 pour le dev (incluant Redis & Supabase Local/Remote).

**Organisation :**
- Monorepo "Services Isolés" (Pas de code partagé complexe, communication par Redis).

## Décisions Architecturales Critiques

### Analyse de Priorité
Les décisions suivantes forment le squelette technique du projet et bloquent le développement si elles ne sont pas tranchées.

### Architecture de Données & Validation
**Décision :** Pydantic First ("Single Source of Truth")
- **Approche :** Définir tous les modèles de données (Schemas) dans Python avec **Pydantic**.
- **Synchronisation :** Génération automatique des interfaces TypeScript/Zod pour le service Node.js via `datamodel-code-generator` dans la CI.
- **Raison :** Évite la duplication de code et garantit que l'API et le Worker parlent exactement la même langue (Strong Typing cross-service).

### Architecture Backend & Communication
**Décision :** Redis Streams (Event Sourcing Light)
- **Choix Technologique :** Redis Streams (vs Pub/Sub vs BullMQ).
- **Implémentation :**
  - **Producer (Python) :** Ajoute les commandes (`SEND_MESSAGE`, `LOGOUT`) dans un Stream Redis (`whatsapp:commands`).
  - **Consumer Group (Node.js) :** Les workers consomment le stream, exécutent l'action Baileys, et ACK le message.
- **Avantage Anti-Ban :** Permet un traitement asynchrone avec contrôle de flux (Backpressure) et garantie de livraison (contrairement au Pub/Sub qui perd les messages si le worker redémarre).

### Authentification & Sécurité
**Décision :** Supabase Auth Middleware (Zero-Trust)
- **Méthode :** Utilisation de l'authentification native Supabase.
- **Middleware :** FastAPI utilise `supabase-py` pour valider le JWT `Bearer` à chaque requête entrante.
- **Sécurité :** Aucune clé privée stockée dans le code. Les RLS (Row Level Security) Postgres sont utilisées comme seconde couche de sécurité.

### Infrastructure & Déploiement
**Décision :** Railway (Monorepo Isolated)
- **Plateforme :** Railway.app.
- **Configuration :**
  - 1 Projet Railway.
  - Service 1 : `apps/api` (Python/FastAPI) exposant le port public.
  - Service 2 : `apps/engine` (Node.js) en mode Worker (Pas d'exposition HTTP publique nécessaire sauf webhook interne).
  - Service 3 : Redis Managed (Supporte Redis Streams).
- **Raison :** Support natif des Monorepos, simplicité de déploiement Docker, et coûts prédictibles.

### Analyse d'Impact
**Séquence d'Implémentation :**
1. **Infra Locale :** `docker-compose` avec Redis et les squelettes Python/Node.
2. **Core API :** Auth Supabase et définition des modèles Pydantic.
3. **Bridge Redis :** Test de l'envoi d'un message Python -> Redis -> Node Log.
4. **Engine Baileys :** Connexion réelle WhatsApp et traitement du Stream.

## Patterns d'Implémentation & Règles de Cohérence

### Points de Conflit Identifiés
Le projet étant hybride (Python/Node), la cohérence de nommage et de communication est critique.

### Patterns de Nammage

**Convention Hybride (API First) :**
- **Interne Python :** Utiliser `snake_case` (standard PEP8). Ex: `user_id`, `created_at`.
- **Interne Node.js :** Utiliser `camelCase` (standard JS). Ex: `userId`, `createdAt`.
- **API Publique (JSON) :** **CamelCase**.
    - Pydantic doit être configuré avec `alias_generator=to_camel, populate_by_name=True`.
    - *Pourquoi ?* Pour que les clients API (souvent JS/Frontend) consomment du JSON naturel.
- **Events Redis :** **Snake_case** (pour matcher la DB).
  - Ex: `{"event": "message_received", "payload": {"chat_id": "...", "timestamp": 123}}`.

### Patterns de Communication

**Payloads Events :**
- Tout payload Redis doit être une chaîne **JSON Valid**. Pas de format binaire propriétaire (sauf Média).
- Structure Standard :
  ```json
  {
    "id": "uuid4",
    "type": "COMMAND_SEND_TEXT",
    "version": "1.0",
    "timestamp": "ISO8601",
    "payload": { ... }
  }
  ```

### Patterns de Processus

**Gestion des Erreurs (API) :**
Toutes les réponses d'erreur API doivent suivre ce format unique :
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_UPPERCASE",
    "message": "Message lisible pour humain",
    "details": { "field": "value" } // Optionnel
  }
}
```

**Workflow Pydantic-to-Zod :**
- **Action :** Tout changement de modèle dans `apps/api/models` doit déclencher la commande `npm run generate:types` dans `apps/engine`.
- **Outil :** `datamodel-code-generator` ou script custom.

### Directives d'Application

**Tous les agents IA DOIVENT :**
1. Vérifier si un modèle Pydantic existe avant de créer une interface TS manuelle.
2. Utiliser `orjson` pour la sérialisation JSON en Python (Performance).
3. Ne jamais hardcoder de credentials, toujours utiliser `os.getenv` / `process.env`.

## Structure du Projet & Frontières

### Structure Complète du Monorepo
```text
whatsappAPI/
├── docker-compose.yml       # Orchestration locale (API + Engine + Redis + Mock DB)
├── Makefile                 # Commandes unifiées (make dev, make test, make deploy)
├── .env.example             # Template de configuration
├── apps/
│   ├── api/                 # Le Cerveau (Python FastAPI)
│   │   ├── pyproject.toml   # Dépendances Python (UV/Poetry)
│   │   ├── Dockerfile       # Image API
│   │   └── src/             # Code Source Python
│   │       ├── main.py      # Point d'entrée FastAPI
│   │       ├── api/         # Routes REST (v1/sessions, v1/messages)
│   │       ├── core/        # Config, Auth Middleware, Events Consumer
│   │       ├── services/    # Logique Métier (Stripe, Billing, CRM)
│   │       └── models/      # Modèles Pydantic (Single Source of Truth)
│   └── engine/              # Le Muscle (Node.js Baileys)
│       ├── package.json     # Dépendances Node (Baileys, Redis)
│       ├── Dockerfile       # Image Worker
│       └── src/
│           ├── main.ts      # Point d'entrée Worker
│           ├── listeners/   # Consommateurs Redis Streams (Command handlers)
│           ├── whatsapp/    # Gestionnaire Socket Baileys
│           └── generated/   # Types TypeScript générés depuis Pydantic
└── infra/                   # Configuration Infrastructure
    ├── nginx/               # Reverse Proxy Local (Optionnel)
    └── redis/               # Config Redis (Persistence, Users)
```

### Frontières Architecturales (Boundaries)

**API Boundary (Publique) :**
- Seul le service **`apps/api`** expose un port HTTP public (8000).
- Le service **`apps/engine`** est un service backend privé ("Headless worker"). Il n'est pas accessible depuis internet.

**Data Boundary (Persistence) :**
- **Postgres (Supabase) :** Seul **`apps/api`** a le droit de lire/écrire dans la base de données principale. Le Moteur (Node) est "Stateless" du point de vue DB (il ne connait pas les utilisateurs, il ne connait que les sessions WhatsApp qu'on lui donne).
- **Redis (Ephemeral) :** C'est le terrain de jeu partagé.
    - `api` écrit des Commandes.
    - `engine` écrit des Events/Logs.
    - `engine` stocke l'état de session WhatsApp (Baileys Auth State) dans Redis ou Filesystem (selon config), mais c'est son domaine privé.

**Logique Métier vs Logique Protocole :**
- **Logique Métier (Python) :** "Est-ce que cet utilisateur a payé ?", "Est-ce que ce message est du spam ?", "Sauvegarder ce contact dans le CRM".
- **Logique Protocole (Node) :** "Comment encoder cette image pour WhatsApp ?", "Gérer la reconnexion socket", "Déchiffrer le message entrant".

## Validation de l'Architecture & Sécurité Avancée

### Résultats de la Validation Standard
- ✅ **Cohérence :** Architecture découplée via Redis. Pas de conflits de dépendances.
- ✅ **Couverture :** Tous les besoins (Anti-Ban, Sécurité, Perf) sont couverts.
- ✅ **Infrastructure :** Structure Monorepo validée.

### Patches de Sécurité "Red Team" (Critique)
Suite à une simulation d'attaque, les contre-mesures suivantes sont **obligatoires** :

1.  **Anti-Ban "Rapid Fire" :**
    - **Patch :** Token Bucket Limiter dans le Worker Node.js.
    - **Règle :** Max 1 message toutes les 5-10s (avec Jitter aléatoire). Ne jamais dépiler la queue Redis instantanément.

2.  **Stabilité "Ghost Session" :**
    - **Patch :** Exponential Backoff sur les reconnexions Baileys + Healthcheck actif.
    - **Règle :** Si échec connexion > 3 fois, redémarrage propre du conteneur Docker.

3.  **Comportement "Bot Fingerprint" :**
    - **Patch :** Simulation de "Presence" (Typing...).
    - **Règle :** Toujours émettre `presence.update('composing')` pendant 1-3s avant l'envoi d'un message texte.

**Statut Final :** ARCHITECTURE VALIDÉE ET DURCIE.

## Résumé de Complétion de l'Architecture

### Statut du Workflow
**Architecture Decision Workflow:** COMPLETED ✅
**Étapes Terminées:** 8/8
**Date:** 2026-01-14
**Document:** `_bmad-output/planning-artifacts/architecture.md`

### Livrables Finaux
- 📋 **Document d'Architecture Complet :** Décisions, Patterns, Structure, Validation.
- 🏗️ **Fondation Prête :** Monorepo Hybride (Python/Node) + Redis.
- 🔐 **Sécurité Durcie :** Patches Anti-Ban et Zero-Trust validés.

### Guide de Handoff pour Implémentation

**Pour les Agents IA :**
Ce document est la source unique de vérité. Suivez strictement :
1. Les versions technologiques (FastAPI 0.128+, Node 20).
2. Les patterns de nommage (Snake vs Camel).
3. Les frontières de sécurité (Redis only bridge).

**Première Priorité :** Initialisation du Monorepo (Step 1 Implémentation).

**Statut Final :** PRÊT POUR IMPLÉMENTATION ✅
