# ### Story 2.5: Message Acknowledgement System

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

