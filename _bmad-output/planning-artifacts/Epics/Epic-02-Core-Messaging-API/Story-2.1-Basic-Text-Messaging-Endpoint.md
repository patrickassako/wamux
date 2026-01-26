# ### Story 2.1: Basic Text Messaging Endpoint

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

