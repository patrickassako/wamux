# ### Story 3.2: Granular Event Catalog

As a developer,
I want a comprehensive list of events to subscribe to,
So that I can build precise integrations (e.g., only listen for incoming messages).

**Acceptance Criteria:**

**Given** the Baileys engine
**When** specific internal events occur
**Then** they should be mapped to the following standard events:
- **Messages:** `message.sent`, `messages.upsert`, `messages.update`, `messages.delete`, `messages.reaction`, `message-receipt.update`
- **Reception Types:** `messages.received`, `messages-group.received`, `messages-personal.received`, `messages-newsletter.received`
- **Chats & Groups:** `chats.upsert`, `chats.update`, `chats.delete`, `groups.upsert`, `groups.update`, `group-participants.update`
- **Session & State:** `session.status`, `qrcode.updated`, `contacts.upsert`, `contacts.update`, `poll.results`, `call`

