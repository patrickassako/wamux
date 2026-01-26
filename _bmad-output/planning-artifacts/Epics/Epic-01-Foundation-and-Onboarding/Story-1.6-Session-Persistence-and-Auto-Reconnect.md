# ### Story 1.6: Session Persistence & Auto-Reconnect

As a user,
I want my WhatsApp session to remain active after server restarts,
So that I don't have to rescan the QR code every day.

**Acceptance Criteria:**

**Given** an active connected session
**When** the Node.js container is restarted
**Then** the session should automatically attempt reconnection using saved credentials
**And** The status in Redis should move from `connecting` to `connected` automatically
**And** No user intervention should be required

