# ### Story 4.4: Admin Dashboard & Kill Switch

As an admin,
I want to view all users and forcefully ban/pause suspicious accounts,
So that I can protect the platform's reputation and IP reputation.

**Acceptance Criteria:**

**Given** I am logged into the Admin Panel
**When** I search for a user
**Then** I can see their message stats and active sessions
**When** I click "Ban User"
**Then** all their sessions should be disconnected immediately
**And** their API keys should be revoked

