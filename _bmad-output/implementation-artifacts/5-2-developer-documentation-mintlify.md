# Story 5.2: Developer Documentation (Mintlify)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want beautiful, searchable documentation with code snippets,
so that I can integrate the API quickly without guessing.

## Acceptance Criteria

1. **Given** a Mintlify-hosted documentation site
   **When** I visit `/docs`
   **Then** I should see the "Authentication", "Sending Messages", and "Webhooks" sections
   
2. **And** each endpoint should have curl/Node/Python examples

3. **And** I should be able to "Try it out" (if Mintlify API playground is enabled)

## Tasks / Subtasks

- [ ] Task 1: Initialize Mintlify documentation structure (AC: #1)
  - [ ] Install Mintlify CLI and initialize docs folder
  - [ ] Configure `mint.json` with project branding and navigation structure
  - [ ] Set up documentation deployment (Mintlify hosting or custom domain)
  
- [ ] Task 2: Create Authentication documentation section (AC: #1, #2)
  - [ ] Document API key generation process with examples
  - [ ] Add code snippets for authentication in curl, Node.js, and Python
  - [ ] Include security best practices and error handling
  
- [ ] Task 3: Create Sending Messages documentation section (AC: #1, #2)
  - [ ] Document text message endpoint with full request/response examples
  - [ ] Document media message endpoints (image, video, audio) with examples
  - [ ] Add code snippets in curl, Node.js, and Python for each message type
  - [ ] Include rate limiting and quota information
  
- [ ] Task 4: Create Webhooks documentation section (AC: #1, #2)
  - [ ] Document webhook configuration and event types
  - [ ] Add webhook payload examples for all event types
  - [ ] Document webhook signature verification with code examples
  - [ ] Include webhook testing and debugging tips
  
- [ ] Task 5: Configure API playground (AC: #3)
  - [ ] Enable Mintlify API playground feature
  - [ ] Configure OpenAPI/Swagger spec for interactive testing
  - [ ] Test "Try it out" functionality for key endpoints

## Dev Notes

### Architecture Context

**Technology Stack:**
- **Documentation Platform:** Mintlify (Modern documentation framework)
- **API Specification:** OpenAPI 3.0 (for interactive playground)
- **Deployment:** Mintlify Cloud or custom domain via Railway/Vercel

**Integration Points:**
- Documentation must reference the FastAPI endpoints from `apps/api`
- Code examples should align with the actual API implementation
- Webhook examples must match the event catalog from Story 3.2

### Technical Requirements

**Mintlify Configuration (`mint.json`):**
```json
{
  "name": "WhatsApp API Gateway",
  "logo": {
    "light": "/logo/light.svg",
    "dark": "/logo/dark.svg"
  },
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart"]
    },
    {
      "group": "API Reference",
      "pages": [
        "api-reference/authentication",
        "api-reference/sending-messages",
        "api-reference/webhooks"
      ]
    }
  ],
  "api": {
    "baseUrl": "https://api.yourdomain.com/v1",
    "playground": {
      "mode": "simple"
    }
  }
}
```

**Code Example Standards:**
- **curl:** Include full headers and authentication
- **Node.js:** Use modern async/await syntax with axios or fetch
- **Python:** Use requests library with type hints

**Example Structure (per endpoint):**
```markdown
## Send Text Message

POST /v1/messages

### Request Body
\`\`\`json
{
  "to": "+237XXXXXXXXX",
  "type": "text",
  "content": {
    "body": "Hello from WhatsApp API!"
  }
}
\`\`\`

### Code Examples

<CodeGroup>
```bash curl
curl -X POST https://api.yourdomain.com/v1/messages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+237XXXXXXXXX",
    "type": "text",
    "content": {"body": "Hello!"}
  }'
```

```javascript Node.js
const axios = require('axios');

const response = await axios.post('https://api.yourdomain.com/v1/messages', {
  to: '+237XXXXXXXXX',
  type: 'text',
  content: { body: 'Hello!' }
}, {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});
```

```python Python
import requests

response = requests.post(
    'https://api.yourdomain.com/v1/messages',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'to': '+237XXXXXXXXX',
        'type': 'text',
        'content': {'body': 'Hello!'}
    }
)
```
</CodeGroup>
```

### File Structure Requirements

```
docs/
├── mint.json                 # Main configuration
├── introduction.mdx          # Getting started
├── quickstart.mdx           # Quick start guide
├── api-reference/
│   ├── authentication.mdx   # Auth docs
│   ├── sending-messages.mdx # Messaging endpoints
│   └── webhooks.mdx         # Webhook configuration
├── images/
│   └── logo/
│       ├── light.svg
│       └── dark.svg
└── openapi.json             # OpenAPI spec (optional, for playground)
```

### Testing Requirements

**Manual Testing Checklist:**
- [ ] All code examples are copy-pasteable and work
- [ ] Navigation structure is intuitive
- [ ] Search functionality works correctly
- [ ] API playground (if enabled) successfully calls endpoints
- [ ] Mobile responsive design works
- [ ] Dark mode displays correctly

**Documentation Quality:**
- All endpoints from Epic 1-4 are documented
- Error responses are documented with examples
- Rate limits and quotas are clearly explained
- Webhook signature verification is detailed

### Project Context Reference

From `project-context.md`:
- **API Naming:** CamelCase for JSON payloads (external API)
- **Code Style:** Follow language-specific conventions in examples
- **Security:** Never expose real API keys in documentation examples

### References

- [Mintlify Documentation](https://mintlify.com/docs)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Source: architecture.md#API Patterns] - API structure and conventions
- [Source: epics.md#Epic 5] - Public site requirements
- [Source: project-context.md] - Coding standards and conventions

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled during implementation_

### Completion Notes List

_To be filled during implementation_

### File List

_To be filled during implementation_

### Change Log

- 2026-01-17: Story created with comprehensive context for Mintlify documentation implementation
