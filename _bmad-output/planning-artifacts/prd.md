---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: ['/Users/apple/Documents/whatsappAPI/_bmad-output/analysis/brainstorming-session-2026-01-14.md', '/Users/apple/.gemini/antigravity/brain/ff6e1447-2a9f-4c09-a0c0-46e622e266f8/product-brief.md']
workflowType: 'prd'
classification:
  projectType: 'SaaS API / Developer Tool'
  domain: 'Messaging & Telecommunications'
  complexity: 'Medium-High'
  projectContext: 'Greenfield'
---

# Product Requirements Document - whatsappAPI

**Author:** patrick
**Date:** 2026-01-14

## Executive Summary

**whatsappAPI** est une Gateway WhatsApp "Unofficial" conçue pour les développeurs et les entreprises SaaS. Elle permet d'intégrer des notifications WhatsApp transactionnelles et des réponses automatiques via une API REST simple, en utilisant une architecture hybride (FastAPI + Node.js/Baileys) pour contourner les limitations officielles tout en garantissant la sécurité (Zero-Trust Auth) et la fiabilité (Anti-Ban Rate Limiting).

## Success Criteria

### User Success
*   **Connexion Instantanée :** Un développeur peut connecter un numéro WhatsApp via QR Code en moins de 30 secondes.
*   **Fiabilité "No-Ban" :** Les messages transactionnels sont délivrés sans déclencher de blocage immédiat grâce au lissage automatique (Rate Limiting).
*   **"It Just Works" pour les Médias :** Envoyer une vidéo ou un audio est aussi simple que d'envoyer du texte (pas de prise de tête avec l'encodage).

### Business Success
*   **Stabilité Multi-Tenant :** La plateforme peut gérer 50+ sessions simultanées sur un seul petit VPS grâce à l'optimisation Baileys/Redis.
*   **Zéro Maintenance Manuelle :** Les reconnexions sont gérées automatiquement ou via alerte utilisateur, sans intervention du support.

### Technical Success
*   **Architecture Hybride Fluide :** Python reçoit la requête -> Redis transmet -> Node exécute en < 500ms.
*   **Sécurité Zero-Trust :** Aucun token de session n'est accessible publiquement, tout est chiffré.

## Product Scope & Roadmap

### MVP Strategy (Phase 1)
**Philosophie :** "Lean Gateway" - Priorité absolue à la fiabilité du "tuyau" (Pipe) et à l'autonomie du développeur.

**Fonctionnalités Clés :**
*   **SaaS Core :** Inscription, Gestion Clé API, Abonnement (Stripe/Flutterwave).
*   **WhatsApp Engine :** Connexion QR Code, Auto-Reconnection.
*   **Messaging API :** Envoi Texte, Image, Audio, Vidéo.
*   **Webhooks :** Reception Messages, Statut Session.
*   **Sécurité :** Rate Limiting Configurable & Global API Limits.

### Growth Features (Phase 2)
*   **Dashboard Avancé :** Analytics, Visualisation Logs.
*   **File Support :** Envoi PDF/Docx.
*   **Group Management :** API pour gérer les groupes.

### Vision (Phase 3)
*   **Marketing Campaigns :** Séquences et campagnes programmées.
*   **Bot Builder :** Automatisation basique intégrée.
*   **Multi-Agent UI :** Interface de chat pour le handoff humain.

## User Journeys

### 1. Parcours "Le Setup Éclair" (The Maker)
*   **Persona :** Alex, dev SaaS.
*   **Action :** S'inscrit -> Génère Clé API -> Appelle `POST /sessions` -> Scanne QR.
*   **Résultat :** Reçoit webhook `session.connected`. Teste `POST /messages`. Ça marche immédiatement.

### 2. Parcours "L'Incident Invisible" (System Reliability)
*   **Persona :** Le Système (Automate).
*   **Action :** Détecte une déconnexion WhatsApp inattendue. Tente reconnexion auto.
*   **Résultat :** Si échec, notifie Alex (Email + Webhook) pour re-scan. Pas de perte silencieuse.

### 3. Parcours "Le Média Riche" (API Consumer)
*   **Persona :** CRM Client.
*   **Action :** Envoi une facture PDF via URL.
*   **Résultat :** API télécharge, chiffre, et transmet. Le client final reçoit le PDF natif.

## Domain-Specific Requirements (Messaging/Compliance)

### Compliance (Meta Policy)
*   **Anti-Ban :** Queueing strict avec délais aléatoires pour simuler un comportement humain.
*   **Protocol Integrity :** Pas de modification des headers officiels (géré par Baileys).
*   **Abuse Prevention :** Capacité "Kill Switch" pour couper un tenant spammeur.

### Security & Privacy
*   **Zero-Knowledge Auth :** Clés de session chiffrées (AES-256) au repos.
*   **Data Retention :** Suppression auto des logs de contenu après 7 jours.

## Functional Requirements

### User Management & Payments
*   **FR1:** Création de compte (Email/Password).
*   **FR2:** Gestion Clé API (Génération/Révocation).
*   **FR3:** Configuration Webhook URL.
*   **FR4:** Abonnement aux plans **Starter**, **Pro**, **Entreprise**.
*   **FR22:** Paiement Récurrent **Stripe**.
*   **FR23:** Paiement **Flutterwave** (Mobile Money).

### WhatsApp Engine
*   **FR5:** Initier Connexion (`POST /sessions`).
*   **FR6:** Stream QR Code temps réel.
*   **FR7:** Persistance Session (Baileys Auth State).
*   **FR8:** Monitoring État Connexion.
*   **FR9:** Auto-Reconnexion.
*   **FR10:** Déconnexion Manuelle.

### Messaging API
*   **FR11:** Envoi Texte.
*   **FR12:** Envoi Image (URL).
*   **FR13:** Envoi Audio (URL).
*   **FR14:** Envoi Vidéo (URL).
*   **FR15:** Ack Synchrone (202 Accepted).

### Webhooks
*   **FR16:** Event `message.received` (Payload enrichi).
*   **FR17:** Event `session.status` (connected/disconnected).
*   **FR19:** Signature HMAC (Sécurité).

### Configuration & Sécurité
*   **FR20:** Config "Speed" (Délai min/max entre messages) par session.
*   **FR21:** Blocage si quota session atteint.
*   **FR24:** Sandbox UI pour test manuel.
*   **FR25:** Test Webhook Trigger UI.

### Public Site
*   **FR26:** Landing Page (Conversion).
*   **FR27:** Pricing Page (Offres détaillées).
*   **FR28:** Support Section.

## Non-Functional Requirements

### Performance
*   **QR Gen :** < 200ms.
*   **Message Dispatch :** < 50ms (interne).
*   **Webhook Latency :** < 1s.

### Reliability
*   **Auto-Healing :** Redémarrage automatique des workers (Supervisor/Docker).
*   **Queue Persistence :** Redis AOF pour ne jamais perdre un message en attente.

### Scalability
*   **Vertical :** Support 50 sessions/VPS (4GB RAM).
