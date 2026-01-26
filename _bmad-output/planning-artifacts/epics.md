---
stepsCompleted: ['step-01-validate-prerequisites']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/project-context.md']
---

# whatsappAPI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for whatsappAPI, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**User Management & Payments**
- FR1: Création de compte (Email/Password).
- FR2: Gestion Clé API (Génération/Révocation).
- FR3: Configuration Webhook URL.
- FR4: Abonnement aux plans Starter, Pro, Entreprise.
- FR22: Paiement Récurrent Stripe.
- FR23: Paiement Flutterwave (Mobile Money).

**WhatsApp Engine**
- FR5: Initier Connexion (POST /sessions).
- FR6: Stream QR Code temps réel.
- FR7: Persistance Session (Baileys Auth State).
- FR8: Monitoring État Connexion.
- FR9: Auto-Reconnexion.
- FR10: Déconnexion Manuelle.

**Messaging API**
- FR11: Envoi Texte.
- FR12: Envoi Image (URL).
- FR13: Envoi Audio (URL).
- FR14: Envoi Vidéo (URL).
- FR15: Ack Synchrone (202 Accepted).

**Webhooks**
- FR16: Event `message.received` (Payload enrichi).
- FR17: Event `session.status` (connected/disconnected).
- FR19: Signature HMAC (Sécurité).

**Configuration & Sécurité**
- FR20: Config "Speed" (Délai min/max entre messages) par session.
- FR21: Blocage si quota session atteint.
- FR24: Sandbox UI pour test manuel.
- FR25: Test Webhook Trigger UI.

**Public Site (Cœur Business)**
- FR26: Landing Page (Optimisée Conversion). Headers, Hero, Social Proof, CTA.
- FR27: Pricing Page (Offres détaillées). Table de comparaison, FAQ, Toggle Monthly/Yearly.
- FR28: Support Section (Docs + Contact).



### NonFunctional Requirements

**Performance**
- NFR1: QR Gen < 200ms.
- NFR2: Message Dispatch < 50ms (interne).
- NFR3: Webhook Latency < 1s.

**Reliability**
- NFR4: Auto-Healing (Redémarrage auto des workers).
- NFR5: Queue Persistence (Redis AOF).

**Scalability**
- NFR6: Vertical Scalability (50 sessions/VPS 4GB RAM).

### Additional Requirements

**From Architecture:**
- **Stack:** Custom Hybrid Monorepo (Python/FastAPI, Node.js/Baileys, Redis, Supabase).
- **Security:** Zero-Trust Auth (Supabase RLS), Pydantic First (Sync TYPES).
- **Anti-Ban Patches:**
    - Token Bucket Limiter (Node.js).
    - Exponential Backoff & Active Healthcheck.
    - Presence Simulation ('composing').
- **Implementation Rules:**
    - Snake_case (Python/Redis) vs CamelCase (Node/API).
    - Redis Streams for IPC (JSON payloads).
    - Docker Multi-stage builds.

**From Project Context:**
- **Testing:** Unit (pytest/vitest) + E2E (manual/curl).
- **Workflow:** Conventional Commits, Monorepo Makefiles.
- **Constraints:** No shared code between Python/Node services.

### FR Coverage Map

- FR1, FR2: Epic 1 (Foundation)
- FR3: Epic 3 (Webhooks)
- FR4: Epic 4 (Billing)
- FR5, FR6, FR7, FR8, FR9, FR10: Epic 1 (Foundation)
- FR11, FR12, FR13, FR14, FR15: Epic 2 (Core Messaging)
- FR16, FR17, FR19, FR25: Epic 3 (Webhooks)
- FR20, FR21, FR24: Epic 4 (Billing & Limits)
- FR22, FR23: Epic 4 (Billing)
- FR26, FR27, FR28: Epic 5 (Public Site)

## Epic List

### Epic 1: Foundation & Onboarding
**Goal:** Enable secure user registration, API key management, and WhatsApp session connection via QR Code.
**FRs covered:** FR1, FR2, FR5, FR6, FR7, FR8, FR9, FR10

### Story 1.1: Project Initialization & Monorepo Setup

As a developer,
I want a configured Monorepo with Docker Compose and Makefiles,
So that I can start the development environment with a single command.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `make dev`
**Then** Docker containers for API (Python), Engine (Node.js), Redis, and Supabase (local) should start
**And** `make test` should run both pytest and vitest successfully
**And** Pre-commit hooks (Ruff, Prettier) should be active

### Story 1.2: User Authentication & Profile Management

As a new user,
I want to register via Email/Password and have a profile created,
So that I can securely access the platform.

**Acceptance Criteria:**

**Given** the Supabase Auth service is running
**When** I call the registration endpoint with valid credentials
**Then** a new user is created in Supabase Auth
**And** a corresponding row is inserted into the public `profiles` table via Trigger
**And** I receive a valid JWT for future requests

### Story 1.3: API Key Management System

As a registered user,
I want to generate and revoke API Keys,
So that I can authenticate my API requests programmatically.

**Acceptance Criteria:**

**Given** I am logged in with a Bearer Token
**When** I POST to `/v1/keys`
**Then** a new API Key (sk_...) is generated and hashed in the database
**And** I can see the key only once in the response
**When** I DELETE the key
**Then** it should no longer be valid for authentication

### Story 1.4: WhatsApp Service Bridge (Redis Streams)

As a system architect,
I want a reliable communication bridge between Python and Node.js,
So that the API can control the WhatsApp Engine without direct coupling.

**Acceptance Criteria:**

**Given** the Redis container is running
**When** Python publishes a command to `whatsapp:commands` stream
**Then** the Node.js worker should consume it within 50ms
**And** the Worker should inspect the payload type and log reception
**And** Any malformed JSON payload should be rejected and logged to `whatsapp:errors`

### Story 1.5: Session Connection & QR Stream (SSE)

As a user,
I want to see a real-time QR code via a standard HTTP stream,
So that I can link my WhatsApp device without complex WebSocket logic.

**Acceptance Criteria:**

**Given** a comprehensive API Client
**When** I POST to `/v1/sessions`
**Then** the API returns a `session_id` and a `stream_url`
**When** I connect to the `stream_url` (SSE)
**Then** I should receive `qr` events containing Key-Value JSON with Base64 image data
**And** The connection should automatically close upon `connected` event

### Story 1.6: Session Persistence & Auto-Reconnect

As a user,
I want my WhatsApp session to remain active after server restarts,
So that I don't have to rescan the QR code every day.

**Acceptance Criteria:**

**Given** an active connected session
**When** the Node.js container is restarted
**Then** the session should automatically attempt reconnection using saved credentials
**And** The status in Redis should move from `connecting` to `connected` automatically
**And** No user intervention should be required

### Epic 2: Core Messaging API
**Goal:** Provide a reliable API for sending text and rich media messages through the connected WhatsApp session.
**FRs covered:** FR11, FR12, FR13, FR14, FR15

### Story 2.1: Basic Text Messaging Endpoint

As a developer,
I want to send a text message via a simple API call,
So that I can communicate with my customers programmatically.

**Acceptance Criteria:**

**Given** a valid authenticated session
**When** I POST to `/v1/messages` with `type: "text"`
**Then** the API should validate the payload (Pydantic)
**And** publish the command to Redis
**And** return a `202 Accepted` with a `message_id`
**And** the Recipient should receive the message on WhatsApp

### Story 2.2: Media Handling Architecture (URL-Based)

As a system architect,
I want the Node.js Engine to handle media downloads from URLs directly,
So that the Python API remains lightweight and avoids bottlenecking on file streaming.

**Acceptance Criteria:**

**Given** a message payload containing a media URL
**When** the Node.js worker receives the command
**Then** it should download the file from the URL into a temporary buffer
**And** detect the MIME type automatically
**And** fail gracefully if the file is too large (>64MB) or the URL is unreachable

### Story 2.3: Sending Images & Videos

As a developer,
I want to send images and videos by providing a URL,
So that I can share rich visual content.

**Acceptance Criteria:**

**Given** a accessible image URL (JPEG/PNG)
**When** I POST to `/v1/messages` with `type: "image"`
**Then** the final WhatsApp message should be rendered as a native image (not a link)
**And** if I provide a `caption`, it should be attached to the image
**And** the same logic should apply for `video` type (MP4)

### Story 2.4: Sending Audio & Voice Notes

As a developer,
I want to send audio files and optionally mark them as Voice Notes,
So that the recipient sees a playable waveform.

**Acceptance Criteria:**

**Given** an audio URL (MP3/OGG)
**When** I send it with `ptt: true` (Push-to-Talk)
**Then** it should appear as a Voice Note on the recipient's phone
**When** I send it with `ptt: false`
**Then** it should appear as a standard audio file attachment

### Story 2.5: Message Acknowledgement System

As a developer,
I want to know if my message was accepted by the system,
So that I can retry if something failed immediately.

**Acceptance Criteria:**

**Given** an invalid phone number
**When** I try to send a message
**Then** the API should NOT fail (async), BUT a later webhook should report failure
**Given** a disconnected session
**When** I try to send
**Then** the API should return `409 Conflict` (Session not connected) immediately

### Epic 3: Webhooks & Events System
**Goal:** Deliver real-time feedback on message status and session health to the user's system.
**FRs covered:** FR3, FR16, FR17, FR19, FR25

### Story 3.1: Webhook Dispatcher Service (Backend)

As a system architect,
I want a centralized service that dispatches events to client URLs,
So that I can handle retries and failures reliably.

**Acceptance Criteria:**

**Given** an event emitted by the Node.js engine
**When** the Python Dispatcher receives it via Redis
**Then** it should look up the user's filtered preferences (SQL)
**And** if enabled, POST the JSON payload to the user's configured URL
**And** sign the payload with HMAC-SHA256 using the user's API Secret

### Story 3.2: Granular Event Catalog

As a developer,
I want a comprehensive list of events to subscribe to,
So that I can build precise integrations (e.g., only listen for incoming messages).

**Acceptance Criteria:**

**Given** the Baileys engine
**When** specific internal events occur
**Then** they should be mapped to the following standard events:
- **Messages:** `message.sent`, `messages.upsert`, `messages.update`, `messages.delete`, `messages.reaction`, `message-receipt.update`
- **Reception Types:** `messages.received`, `messages-group.received`, `messages-personal.received`, `messages-newsletter.received`
- **Chats & Groups:** `chats.upsert`, `chats.update`, `chats.delete`, `groups.upsert`, `groups.update`, `group-participants.update`
- **Session & State:** `session.status`, `qrcode.updated`, `contacts.upsert`, `contacts.update`, `poll.results`, `call`

### Story 3.3: Webhook Configuration UI

As a user,
I want to select exactly which of the 20+ events I receive via a checklist,
So that I don't flood my server with noise.

**Acceptance Criteria:**

**Given** the "Webhook Settings" dashboard page
**When** I enter my Webhook URL
**Then** I should see a comprehensive checklist matching Story 3.2
**And** "messages.received" should be checked by default
**When** I save my preferences
**Then** the Python Dispatcher should accept/drop events based on this configuration

### Story 3.4: Inbound Message Handling & Formatting

As a developer,
I want incoming messages to be formatted in clean JSON,
So that I can easily parse text, location, and media.

**Acceptance Criteria:**

**Given** a contact sends a message to the connected WhatsApp
**When** the `message.received` webhook is fired
**Then** the payload should contain normalized fields: `from` (phone), `body` (text), `type` (image/text), `timestamp`
**And** if it is Media, it should include a download URL or Base64 (depending on config)
**And** it should filter out "Status Broadcasts" unless explicitly subscribed

### Story 3.5: Webhook Security & Testing UI

As a developer,
I want to verify that requests come from your server and test my endpoint,
So that I can secure my integration.

**Acceptance Criteria:**

**Given** a received webhook
**When** I inspect the `X-Hub-Signature` header
**Then** it should match the HMAC-SHA256 of the body + my API Secret
**Given** the dashboard "Test Webhook" button
**When** I click it
**Then** it should send a dummy `ping` event to my URL and show the response (200 OK or Error)

### Story 3.6: Advanced Session Behavior Settings

As a user,
I want to configure automation rules for my WhatsApp session,
So that it behaves more like a bot or a specialized agent.

**Acceptance Criteria:**

**Given** the "Session Settings" page
**When** I toggle "Always Online"
**Then** the engine should emit `presence.update('available')` periodically
**When** I toggle "Read Incoming Messages"
**Then** the engine should automatically mark incoming messages as read
**When** I toggle "Reject Calls"
**Then** incoming calls should be rejected instantly


### Epic 4: Billing, Safety & Monetization
**Goal:** Implement subscription plans, payment processing, and rate limiting to secure and monetize the platform.
**FRs covered:** FR4, FR20, FR21, FR22, FR23, FR24
**Value:** Business sustainability and platform stability (Anti-abuse).

### Story 4.1: Subscription Plans & Payment (Hosted Checkout)

As a system owner,
I want to offer recurring subscription plans (Starter/Pro) via Stripe/Flutterwave,
So that users pay automatically to access the platform.

**Acceptance Criteria:**

**Given** a user selects a plan on the dashboard
**When** they click "Subscribe"
**Then** they should be redirected to a Hosted Checkout Page (Stripe/Flutterwave)
**When** payment is successful
**Then** a webhook (`checkout.session.completed`) should update the user's `subscription_status` to `active` in the DB

### Story 4.2: Rate Limiting (Anti-Ban Protection)

As a user,
I want my message rate to be automatically throttled,
So that my WhatsApp number doesn't get banned for spamming.

**Acceptance Criteria:**

**Given** a "Token Bucket" limit of 1 message/10 seconds (configurable per plan)
**When** I try to send 50 messages consistently in 1 second
**Then** the API should queue them and process them at the safe rate
**And** excess requests beyond the queue buffer should return `429 Too Many Requests`

### Story 4.3: Global Usage Quotas (Hard Limits)

As a system owner,
I want to enforce monthly message limits based on the user's plan,
So that free tier users don't abuse the server resources.

**Acceptance Criteria:**

**Given** a 'Starter' plan with 1,000 messages/month
**When** the user sends their 1,001st message
**Then** the API should reject it with `403 Quota Exceeded`
**And** the user should receive an email alert at 80% and 100% usage

### Story 4.4: Admin Dashboard & Kill Switch

As an admin,
I want to view all users and forcefully ban/pause suspicious accounts,
So that I can protect the platform's reputation and IP reputation.

**Acceptance Criteria:**

**Given** I am logged into the Admin Panel
**When** I search for a user
**Then** I can see their message stats and active sessions
**When** I click "Ban User"
**Then** all their sessions should be disconnected immediately
**And** their API keys should be revoked

### Epic 5: Public Site & Growth
**Goal:** Convert visitors into users with a high-converting landing page and self-serve documentation.
**FRs covered:** FR26, FR27, FR28
**Value:** User acquisition and self-service support.

### Story 5.1: Public Landing Page (Next.js)

As a visitor,
I want to understand the product's value proposition immediately,
So that I am convinced to sign up for a trial.

**Acceptance Criteria:**

**Given** I visit the root domain
**When** the page loads
**Then** I should see a Hero Section with "Connect WhatsApp in 30s"
**And** a Pricing Grid comparing Free vs Pro plans
**And** a "Get Started" cta that links to the Registration Page (Epic 1)

### Story 5.2: Developer Documentation (Mintlify)

As a developer,
I want beautiful, searchable documentation with code snippets,
So that I can integrate the API quickly without guessing.

**Acceptance Criteria:**

**Given** a Mintlify-hosted documentation site
**When** I visit `/docs`
**Then** I should see the "Authentication", "Sending Messages", and "Webhooks" sections
**And** each endpoint should have curl/Node/Python examples
**And** I should be able to "Try it out" (if Mintlify API playground is enabled)

### Story 5.3: Interactive Onboarding Guide

As a new user,
I want a step-by-step wizard after signing up,
So that I don't feel lost in the dashboard.

**Acceptance Criteria:**

**Given** a newly registered user
**When** they first login
**Then** a 3-step wizard should appear:
1. "Create API Key"
2. "Connect WhatsApp Session"
3. "Send Test Message"
**And** completion of the wizard should unlock the full dashboard

### Story 5.4: Blog & SEO Resources

As a marketing lead,
I want a blog section to publish articles about "WhatsApp API for Business",
So that we attract organic search traffic (SEO).

**Acceptance Criteria:**

**Given** the Next.js public site
**When** I access `/blog`
**Then** I should see a list of articles fetched from markdown files
**And** each article should have proper meta tags (Title, Description, OG Image)

