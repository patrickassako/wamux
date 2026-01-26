# ### Story 1.2: User Authentication & Profile Management

As a new user,
I want to register via Email/Password and have a profile created,
So that I can securely access the platform.

**Acceptance Criteria:**

**Given** the Supabase Auth service is running
**When** I call the registration endpoint with valid credentials
**Then** a new user is created in Supabase Auth
**And** a corresponding row is inserted into the public `profiles` table via Trigger
**And** I receive a valid JWT for future requests

