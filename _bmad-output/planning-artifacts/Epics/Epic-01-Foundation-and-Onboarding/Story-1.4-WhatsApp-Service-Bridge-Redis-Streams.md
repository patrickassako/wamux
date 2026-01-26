# ### Story 1.4: WhatsApp Service Bridge (Redis Streams)

As a system architect,
I want a reliable communication bridge between Python and Node.js,
So that the API can control the WhatsApp Engine without direct coupling.

**Acceptance Criteria:**

**Given** the Redis container is running
**When** Python publishes a command to `whatsapp:commands` stream
**Then** the Node.js worker should consume it within 50ms
**And** the Worker should inspect the payload type and log reception
**And** Any malformed JSON payload should be rejected and logged to `whatsapp:errors`

