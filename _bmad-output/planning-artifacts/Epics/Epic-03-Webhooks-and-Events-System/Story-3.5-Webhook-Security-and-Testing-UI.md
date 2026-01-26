# ### Story 3.5: Webhook Security & Testing UI

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

