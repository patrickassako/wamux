# ### Story 1.3: API Key Management System

As a registered user,
I want to generate and revoke API Keys,
So that I can authenticate my API requests programmatically.

**Acceptance Criteria:**

**Given** I am logged in with a Bearer Token
**When** I POST to `/v1/keys`
**Then** a new API Key (sk_...) is generated and hashed in the database
**And** I can see the key only once in the response
**When** I DELETE the key
**Then** it should no longer be valid for authentication

