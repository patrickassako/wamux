# ### Story 1.5: Session Connection & QR Stream (SSE)

As a user,
I want to see a real-time QR code via a standard HTTP stream,
So that I can link my WhatsApp device without complex WebSocket logic.

**Acceptance Criteria:**

**Given** a comprehensive API Client
**When** I POST to `/v1/sessions`
**Then** the API returns a `session_id` and a `stream_url`
**When** I connect to the `stream_url` (SSE)
**Then** I should receive `qr` events containing Key-Value JSON with Base64 image data
**And** The connection should automatically close upon `connected` event

