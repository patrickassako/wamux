# ### Story 2.3: Sending Images & Videos

As a developer,
I want to send images and videos by providing a URL,
So that I can share rich visual content.

**Acceptance Criteria:**

**Given** a accessible image URL (JPEG/PNG)
**When** I POST to `/v1/messages` with `type: "image"`
**Then** the final WhatsApp message should be rendered as a native image (not a link)
**And** if I provide a `caption`, it should be attached to the image
**And** the same logic should apply for `video` type (MP4)

