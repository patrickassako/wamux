# Epic 2: Core Messaging API - Stories Détaillées Complètes

## Story 2.3: Sending Images & Videos

**Status:** ready-for-dev

### Acceptance Criteria
- User can send image with optional caption via POST /v1/messages
- User can send video with optional caption
- System validates MIME types and file sizes
- Node.js downloads media from URL and sends via Baileys
- Returns 202 Accepted with message_id

### Tasks (7 tasks)

1. **Extend Message Models for Media**
   - Add SendImageRequest, SendVideoRequest Pydantic models
   - Add media_url, caption fields
   - Validate URL format and accessibility

2. **Implement Image/Video Endpoints**
   - POST /v1/messages with type: "image" or "video"
   - Validate media_url is accessible (HEAD request)
   - Store message with pending status

3. **Implement SendImageHandler in Node.js**
   - Download image from URL using MediaDownloader
   - Validate MIME type (image/jpeg, png, webp)
   - Send via sock.sendMessage() with image buffer
   - Publish MESSAGE_SENT event

4. **Implement SendVideoHandler in Node.js**
   - Download video from URL
   - Validate MIME type (video/mp4, 3gpp)
   - Check file size < 64MB
   - Send via Baileys with caption

5. **Add Media Metadata Tracking**
   - Store media_url, mime_type in messages table
   - Track download time and size
   - Log media processing metrics

6. **Handle Media Errors**
   - Download timeout (30s)
   - File too large
   - Invalid MIME type
   - Unreachable URL

7. **Add Tests**
   - Test image sending flow
   - Test video sending flow
   - Test error scenarios
   - Mock media downloads

### Implementation Notes

**Pydantic Models:**
```python
class SendImageRequest(BaseModel):
    to: str
    image_url: str = Field(description="Publicly accessible image URL")
    caption: str | None = Field(None, max_length=1024)
    session_id: UUID | None = None

class SendVideoRequest(BaseModel):
    to: str
    video_url: str = Field(description="Publicly accessible video URL")
    caption: str | None = Field(None, max_length=1024)
    session_id: UUID | None = None
```

**Node.js Handler:**
```typescript
async handle(payload: any): Promise<void> {
  const { message_id, session_id, to, image_url, caption } = payload;
  
  const sock = this.sessionManager.getSession(session_id);
  const downloader = new MediaDownloader();
  
  // Download image
  const { buffer, mimeType } = await downloader.downloadFromUrl(
    image_url, 
    'image', 
    session_id
  );
  
  // Send via Baileys
  await sock.sendMessage(this.formatToJID(to), {
    image: buffer,
    caption: caption || '',
    mimetype: mimeType
  });
}
```

---

## Story 2.4: Sending Audio & Voice Notes

**Status:** ready-for-dev

### Acceptance Criteria
- User can send audio file via POST /v1/messages
- User can send voice note (PTT) with ptt: true flag
- System validates audio MIME types
- Baileys sends with correct audio type (audio vs PTT)

### Tasks (6 tasks)

1. **Create Audio Message Models**
   - Add SendAudioRequest Pydantic model
   - Add ptt (push-to-talk) boolean flag
   - Validate audio_url format

2. **Implement Audio Endpoint**
   - POST /v1/messages with type: "audio"
   - Support ptt flag for voice notes
   - Store message with audio metadata

3. **Implement SendAudioHandler**
   - Download audio from URL
   - Validate MIME type (audio/mpeg, ogg, aac, wav)
   - Check file size < 16MB
   - Send as audio or PTT based on flag

4. **Handle PTT (Voice Notes)**
   - Set ptt: true in Baileys message
   - Display as voice note in WhatsApp
   - Different UI than regular audio

5. **Add Audio Processing**
   - Detect audio duration (optional)
   - Store audio metadata
   - Track processing time

6. **Add Tests**
   - Test audio file sending
   - Test PTT voice note sending
   - Test MIME type validation
   - Mock audio downloads

### Implementation Notes

**Pydantic Model:**
```python
class SendAudioRequest(BaseModel):
    to: str
    audio_url: str = Field(description="Publicly accessible audio URL")
    ptt: bool = Field(False, description="Send as voice note (push-to-talk)")
    session_id: UUID | None = None
```

**Node.js Handler:**
```typescript
async handle(payload: any): Promise<void> {
  const { message_id, session_id, to, audio_url, ptt } = payload;
  
  const sock = this.sessionManager.getSession(session_id);
  const downloader = new MediaDownloader();
  
  const { buffer, mimeType } = await downloader.downloadFromUrl(
    audio_url,
    'audio',
    session_id
  );
  
  await sock.sendMessage(this.formatToJID(to), {
    audio: buffer,
    mimetype: mimeType,
    ptt: ptt || false // Voice note if true
  });
}
```

---

## Story 2.5: Message Acknowledgement System

**Status:** ready-for-dev

### Acceptance Criteria
- System tracks message status: pending → sent → delivered → read
- Listens to Baileys messages.update event
- Updates message status in database
- Publishes status events to webhooks

### Tasks (7 tasks)

1. **Listen to Baileys Status Events**
   - Subscribe to messages.update event
   - Extract status from update (sent, delivered, read)
   - Map to internal status enum

2. **Create Status Update Handler**
   - Parse Baileys status update
   - Find message by whatsapp_message_id
   - Update status in database

3. **Track Timestamps**
   - sent_at: When message sent
   - delivered_at: When delivered to recipient
   - read_at: When read by recipient
   - Store in messages table

4. **Publish Status Events**
   - Publish MESSAGE_STATUS_UPDATED to Redis
   - Include message_id, status, timestamp
   - Trigger webhook notifications

5. **Add Status Query Endpoint**
   - GET /v1/messages/{id}/status
   - Return current status and timestamps
   - Include delivery/read receipts

6. **Handle Edge Cases**
   - Message deleted before delivery
   - Status update for unknown message
   - Out-of-order status updates

7. **Add Tests**
   - Test status progression
   - Test timestamp tracking
   - Test webhook notifications
   - Mock Baileys events

### Implementation Notes

**Baileys Event Listener:**
```typescript
sock.ev.on('messages.update', async (updates) => {
  for (const update of updates) {
    const { key, update: statusUpdate } = update;
    
    // Extract status
    let status = 'sent';
    if (statusUpdate.status === 3) status = 'delivered';
    if (statusUpdate.status === 4) status = 'read';
    
    // Publish event
    await this.publishEvent('MESSAGE_STATUS_UPDATED', {
      whatsapp_message_id: key.id,
      status,
      timestamp: new Date().toISOString()
    });
  }
});
```

**Python Event Consumer:**
```python
async def handle_message_status_update(event: dict):
    payload = event['payload']
    
    # Find message
    result = supabase.table('messages')\
        .update({
            'status': payload['status'],
            f"{payload['status']}_at": payload['timestamp']
        })\
        .eq('whatsapp_message_id', payload['whatsapp_message_id'])\
        .execute()
    
    # Trigger webhook
    await webhook_dispatcher.dispatch(
        event_type='messages.update',
        payload=payload
    )
```

---

## References

- [epics.md#L198-L269](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L198-L269) - Epic 2 complete context
- FR11-15: Messaging features
- NFR2: Message Dispatch < 50ms

## Testing Strategy

**Integration Tests:**
1. End-to-end media sending (URL → Download → WhatsApp)
2. Status tracking (sent → delivered → read)
3. Error handling (invalid URLs, timeouts)
4. Webhook notifications for status updates

**Performance:**
- Media download < 5s
- Message dispatch < 50ms (NFR2)
- Status update latency < 100ms
