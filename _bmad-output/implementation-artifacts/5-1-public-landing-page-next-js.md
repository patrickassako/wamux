# Story 5.1: Public Landing Page (Next.js)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to understand the product's value proposition immediately,
So that I am convinced to sign up for a trial.

## Acceptance Criteria

**Given** I visit the root domain
**When** the page loads
**Then** I should see a Hero Section with "Connect WhatsApp in 30s"
**And** a Pricing Grid comparing Free vs Pro plans
**And** a "Get Started" CTA that links to the Registration Page (Epic 1)

## Tasks / Subtasks

- [ ] Task 1: Initialize Next.js App in apps/web (AC: Project structure created)
  - [ ] Create `apps/web` folder with Next.js 14+ (App Router)
  - [ ] Configure TypeScript strict mode
  - [ ] Add to docker-compose.yml (port 3000)
  - [ ] Configure shared environment variables (.env)

- [ ] Task 2: Implement Landing Page Layout (AC: Responsive layout)
  - [ ] Create root layout with SEO metadata
  - [ ] Add global CSS with design system (colors, fonts)
  - [ ] Implement responsive breakpoints (mobile-first)

- [ ] Task 3: Create Hero Section (AC: Hero visible on load)
  - [ ] Headline: "Connect WhatsApp in 30 Seconds"
  - [ ] Subheadline explaining value proposition
  - [ ] Primary CTA button → /register
  - [ ] Hero image/illustration (WhatsApp integration visual)

- [ ] Task 4: Create Pricing Grid (AC: Plans clearly compared)
  - [ ] Free Plan card (10 sessions, 100 msg/day)
  - [ ] Pro Plan card (price, unlimited, webhooks)
  - [ ] Feature comparison list
  - [ ] CTA buttons linking to /register

- [ ] Task 5: Create Navigation & Footer (AC: Complete page)
  - [ ] Header with logo and navigation links
  - [ ] Footer with legal links, social links
  - [ ] Login/Register links in header

- [ ] Task 6: Configure API Integration Endpoints (AC: Registration accessible)
  - [ ] Verify /register links to API auth flow (Epic 1)
  - [ ] Add environment variable for API_URL
  - [ ] Configure CORS if needed

## Dev Notes

### Architecture Compliance

**CRITICAL: Technology Stack**

Source: [architecture.md](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md)

**Frontend Stack (New for Epic 5):**
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS (recommended for rapid UI development)
- Internal port: 3000

**Monorepo Path:**
```
apps/
├── api/      # Python FastAPI (existing)
├── engine/   # Node.js Baileys (existing)
└── web/      # Next.js Landing (NEW)
```

### Library & Framework Requirements

**Next.js Setup:**
```bash
npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir
```

**Key Dependencies:**
- `next@14+` - React framework with App Router
- `tailwindcss` - Utility-first CSS
- `@heroicons/react` - Icons (optional)
- `framer-motion` - Animations (optional)

### File Structure Requirements

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with SEO
│   │   ├── page.tsx           # Landing page (Hero + Pricing)
│   │   ├── globals.css        # Tailwind base + custom styles
│   │   └── favicon.ico
│   └── components/
│       ├── Hero.tsx           # Hero section component
│       ├── PricingGrid.tsx    # Pricing cards component
│       ├── Header.tsx         # Navigation header
│       └── Footer.tsx         # Page footer
├── public/
│   └── images/                # Static assets
├── tailwind.config.ts
├── next.config.js
└── package.json
```

### Technical Requirements

**SEO Metadata (Required):**
```typescript
// app/layout.tsx
export const metadata = {
  title: 'WhatsApp API Gateway - Connect in 30 Seconds',
  description: 'Send WhatsApp messages via simple API. No QR scanning hassle. Free tier available.',
  openGraph: { ... },
  twitter: { ... }
};
```

**Pricing Plans (Content):**
| Feature | Free | Pro |
|---------|------|-----|
| Sessions | 10 | Unlimited |
| Messages/day | 100 | 10,000 |
| Webhooks | ❌ | ✅ |
| Support | Community | Priority |
| Price | $0 | $29/month |

**CTA Behavior:**
- "Get Started Free" → `{API_URL}/register` or `/auth/register`
- "Upgrade to Pro" → `{API_URL}/register?plan=pro`

### Project Structure Notes

**Docker Compose Addition:**
```yaml
# docker-compose.yml
services:
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Environment Variables:**
```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### References

**Epic Context:**
- [Epic 5 Overview](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/Epics/Epic-05-Public-Site-and-Growth/00-Epic-Overview.md)
- Goal: Convert visitors into users with high-converting landing page

**Architecture:**
- [architecture.md#L199-L228](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L199-L228) - Project structure

**Design Principles:**
- Mobile-first responsive design
- Premium aesthetic (Hero, Pricing, CTA)
- Fast load times (Next.js SSG)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
