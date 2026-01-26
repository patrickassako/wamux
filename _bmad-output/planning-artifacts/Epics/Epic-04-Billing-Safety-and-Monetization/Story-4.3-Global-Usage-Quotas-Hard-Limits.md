# ### Story 4.3: Global Usage Quotas (Hard Limits)

As a system owner,
I want to enforce monthly message limits based on the user's plan,
So that free tier users don't abuse the server resources.

**Acceptance Criteria:**

**Given** a 'Starter' plan with 1,000 messages/month
**When** the user sends their 1,001st message
**Then** the API should reject it with `403 Quota Exceeded`
**And** the user should receive an email alert at 80% and 100% usage

