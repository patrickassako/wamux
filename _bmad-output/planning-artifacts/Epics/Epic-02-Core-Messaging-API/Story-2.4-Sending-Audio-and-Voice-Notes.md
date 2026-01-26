# ### Story 2.4: Sending Audio & Voice Notes

As a developer,
I want to send audio files and optionally mark them as Voice Notes,
So that the recipient sees a playable waveform.

**Acceptance Criteria:**

**Given** an audio URL (MP3/OGG)
**When** I send it with `ptt: true` (Push-to-Talk)
**Then** it should appear as a Voice Note on the recipient's phone
**When** I send it with `ptt: false`
**Then** it should appear as a standard audio file attachment

