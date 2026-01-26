# ### Story 4.2: Rate Limiting (Anti-Ban Protection)

As a user,
I want my message rate to be automatically throttled,
So that my WhatsApp number doesn't get banned for spamming.

**Acceptance Criteria:**

**Given** a "Token Bucket" limit of 1 message/10 seconds (configurable per plan)
**When** I try to send 50 messages consistently in 1 second
**Then** the API should queue them and process them at the safe rate
**And** excess requests beyond the queue buffer should return `429 Too Many Requests`

