# Story 5.3: Interactive Onboarding Guide

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want a step-by-step wizard after signing up,
So that I don't feel lost in the dashboard.

## Acceptance Criteria

**Given** a newly registered user
**When** they first login
**Then** a 3-step wizard should appear:
1. "Create API Key"
2. "Connect WhatsApp Session" (with QR code display)
3. "Send Test Message"
**And** completion of the wizard should unlock the full dashboard

## Tasks / Subtasks

- [ ] Task 1: Create Dashboard Layout (AC: Protected dashboard page)
  - [ ] Create `/dashboard` route with auth protection
  - [ ] Add layout with sidebar navigation
  - [ ] Detect `onboarding_completed` flag from user profile

- [ ] Task 2: Create Onboarding Wizard Component (AC: 3-step wizard)
  - [ ] Step indicator component (1/3, 2/3, 3/3)
  - [ ] Modal/overlay wizard container
  - [ ] State management for current step and completion

- [ ] Task 3: Step 1 - Create API Key (AC: API key generated)
  - [ ] Explain what API keys are for
  - [ ] Button to call `POST /api/v1/keys`
  - [ ] Display generated key with copy button
  - [ ] "Next" button when key is created

- [ ] Task 4: Step 2 - Connect WhatsApp Session (AC: QR displayed)
  - [ ] Create session via `POST /api/v1/sessions`
  - [ ] Connect to SSE stream for QR code
  - [ ] Display QR code image (Base64 decoded)
  - [ ] Show "Scan with WhatsApp" instructions
  - [ ] Detect `SESSION_CONNECTED` event → auto-advance

- [ ] Task 5: Step 3 - Send Test Message (AC: Message sent)
  - [ ] Input field for recipient phone number
  - [ ] Pre-filled test message
  - [ ] Send via `POST /api/v1/messages`
  - [ ] Show success confirmation
  - [ ] "Complete Setup" button

- [ ] Task 6: Complete Onboarding (AC: Dashboard unlocked)
  - [ ] Update user profile `onboarding_completed: true`
  - [ ] Dismiss wizard
  - [ ] Show full dashboard with sessions list

## Dev Notes

### Architecture Compliance

**CRITICAL: This story integrates with existing API endpoints from Epic 1 & 2**

**API Endpoints Used (Already Implemented):**
- `POST /api/v1/keys` → Create API key (Story 1.3)
- `POST /api/v1/sessions` → Create session (Story 1.5)
- `GET /api/v1/sessions/{id}/stream` → SSE QR stream (Story 1.5)
- `POST /api/v1/messages` → Send text message (Story 2.1)

**User Profile Extension:**
Add `onboarding_completed` boolean to `profiles` table (if not exists)

### Technical Requirements

**Dashboard Route Protection:**
```typescript
// Middleware or layout.tsx
const user = await getSession();
if (!user) redirect('/login');
if (!user.onboarding_completed) showOnboardingWizard();
```

**QR Code Display from SSE:**
```typescript
// Step 2 component
const eventSource = new EventSource(
  `${API_URL}/api/v1/sessions/${sessionId}/stream`,
  { headers: { Authorization: `Bearer ${token}` } }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'QR_CODE_UPDATED') {
    setQrCode(data.payload.qr_data); // Base64 image
  }
  if (data.type === 'SESSION_CONNECTED') {
    setStep(3); // Auto-advance to step 3
  }
};
```

### File Structure Requirements

```
apps/web/src/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx        # Protected layout
│   │   └── page.tsx          # Dashboard home
│   └── (auth)/
│       ├── login/page.tsx
│       └── register/page.tsx
└── components/
    ├── onboarding/
    │   ├── OnboardingWizard.tsx
    │   ├── StepIndicator.tsx
    │   ├── Step1APIKey.tsx
    │   ├── Step2QRSession.tsx
    │   └── Step3TestMessage.tsx
    └── dashboard/
        ├── Sidebar.tsx
        └── SessionsList.tsx
```

### Database Addition

```sql
-- Add to profiles table if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
```

### Project Structure Notes

**Depends on Story 5.1:**
- Must have Next.js app (`apps/web`) initialized
- Uses same auth/API configuration

**API Integration:**
- All API calls use `NEXT_PUBLIC_API_URL` env var
- Auth token stored in cookies/localStorage after login

### References

**Epic Context:**
- [Story 5.3 Planning](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/Epics/Epic-05-Public-Site-and-Growth/Story-5.3-Interactive-Onboarding-Guide.md)

**API Endpoints (From Previous Stories):**
- [Story 1.3 - API Keys](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-3-api-key-management-system.md)
- [Story 1.5 - SSE Sessions](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-5-session-connection-qr-stream-sse.md)
- [Story 2.1 - Messages](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/2-1-basic-text-messaging-endpoint.md)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
