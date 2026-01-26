# ### Story 2.2: Media Handling Architecture (URL-Based)

As a system architect,
I want the Node.js Engine to handle media downloads from URLs directly,
So that the Python API remains lightweight and avoids bottlenecking on file streaming.

**Acceptance Criteria:**

**Given** a message payload containing a media URL
**When** the Node.js worker receives the command
**Then** it should download the file from the URL into a temporary buffer
**And** detect the MIME type automatically
**And** fail gracefully if the file is too large (>64MB) or the URL is unreachable

