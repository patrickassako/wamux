# ### Story 3.6: Advanced Session Behavior Settings

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


