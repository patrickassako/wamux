# ### Story 3.1: Webhook Dispatcher Service (Backend)

As a system architect,
I want a centralized service that dispatches events to client URLs,
So that I can handle retries and failures reliably.

**Acceptance Criteria:**

**Given** an event emitted by the Node.js engine
**When** the Python Dispatcher receives it via Redis
**Then** it should look up the user's filtered preferences (SQL)
**And** if enabled, POST the JSON payload to the user's configured URL
**And** sign the payload with HMAC-SHA256 using the user's API Secret

