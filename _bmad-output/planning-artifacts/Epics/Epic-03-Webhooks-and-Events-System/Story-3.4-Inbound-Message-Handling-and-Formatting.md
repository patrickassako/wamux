# ### Story 3.4: Inbound Message Handling & Formatting

As a developer,
I want incoming messages to be formatted in clean JSON,
So that I can easily parse text, location, and media.

**Acceptance Criteria:**

**Given** a contact sends a message to the connected WhatsApp
**When** the `message.received` webhook is fired
**Then** the payload should contain normalized fields: `from` (phone), `body` (text), `type` (image/text), `timestamp`
**And** if it is Media, it should include a download URL or Base64 (depending on config)
**And** it should filter out "Status Broadcasts" unless explicitly subscribed

