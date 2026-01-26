# ### Story 3.3: Webhook Configuration UI

As a user,
I want to select exactly which of the 20+ events I receive via a checklist,
So that I don't flood my server with noise.

**Acceptance Criteria:**

**Given** the "Webhook Settings" dashboard page
**When** I enter my Webhook URL
**Then** I should see a comprehensive checklist matching Story 3.2
**And** "messages.received" should be checked by default
**When** I save my preferences
**Then** the Python Dispatcher should accept/drop events based on this configuration

