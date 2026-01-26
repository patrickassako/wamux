# Story 2.2: Media Handling Architecture (URL-Based)

Status: ready-for-dev

## Story

As a system architect,
I want the Node.js Engine to handle media downloads from URLs directly,
So that the Python API remains lightweight and avoids bottlenecking on file streaming.

## Acceptance Criteria

**Given** a message payload containing a media URL
**When** the Node.js worker receives the command
**Then** it should download the file from the URL into a temporary buffer
**And** detect the MIME type automatically
**And** fail gracefully if the file is too large (>64MB) or the URL is unreachable

## Tasks / Subtasks

- [ ] Task 1: Design Media Download Architecture (AC: Architecture documented)
  - [ ] Document URL-based vs upload-based approach
  - [ ] Define max file sizes: Image 16MB, Video 64MB, Audio 16MB
  - [ ] Define supported MIME types per media type
  - [ ] Design temporary file handling strategy
  - [ ] Define error handling for unreachable URLs

- [ ] Task 2: Implement Media Downloader Service (AC: Downloads work reliably)
  - [ ] Create `apps/engine/src/media/downloader.ts`
  - [ ] Implement `downloadFromUrl()` with streaming
  - [ ] Add timeout handling (30 seconds max)
  - [ ] Validate file size during download (abort if too large)
  - [ ] Detect MIME type from headers and content
  - [ ] Return buffer for Baileys processing

- [ ] Task 3: Add MIME Type Validation (AC: Only valid types accepted)
  - [ ] Create MIME type whitelist per media type
  - [ ] Images: image/jpeg, image/png, image/webp
  - [ ] Videos: video/mp4, video/3gpp, video/quicktime
  - [ ] Audio: audio/mpeg, audio/ogg, audio/aac, audio/wav
  - [ ] Reject unsupported MIME types with clear error
  - [ ] Log rejected files for monitoring

- [ ] Task 4: Implement Temporary File Cleanup (AC: No disk space leaks)
  - [ ] Create temp directory structure: `./temp/{session_id}/`
  - [ ] Implement automatic cleanup after message sent
  - [ ] Add cleanup on error/failure
  - [ ] Implement periodic cleanup job (every hour)
  - [ ] Delete files older than 1 hour

- [ ] Task 5: Add Media Validation Utilities (AC: Validation helpers ready)
  - [ ] Create `apps/engine/src/media/validator.ts`
  - [ ] Implement `validateImageUrl()`
  - [ ] Implement `validateVideoUrl()`
  - [ ] Implement `validateAudioUrl()`
  - [ ] Check URL accessibility (HEAD request)
  - [ ] Validate content-length header

- [ ] Task 6: Add Comprehensive Tests (AC: All scenarios tested)
  - [ ] Test successful download from valid URL
  - [ ] Test file too large (should abort)
  - [ ] Test unreachable URL (should fail gracefully)
  - [ ] Test invalid MIME type (should reject)
  - [ ] Test timeout handling
  - [ ] Mock HTTP requests to avoid external dependencies

## Dev Notes

### Architecture Decision

**Why URL-Based (not file upload):**
- ✅ Python API stays lightweight (no file buffering)
- ✅ Node.js handles download in parallel (better performance)
- ✅ Simpler API (just send URL)
- ✅ Client can use CDN/S3 URLs
- ❌ Requires publicly accessible URLs

**Media Download Flow:**
```
Client uploads to CDN/S3 → Gets URL
  ↓
POST /v1/messages with media_url
  ↓
Python validates and publishes command
  ↓
Node.js downloads from URL
  ↓
Baileys sends to WhatsApp
```

### Technical Implementation

**Media Downloader:**

```typescript
// apps/engine/src/media/downloader.ts
import axios from 'axios';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface DownloadResult {
  buffer: Buffer;
  mimeType: string;
  size: number;
  tempPath: string;
}

export class MediaDownloader {
  private maxSizes = {
    image: 16 * 1024 * 1024, // 16MB
    video: 64 * 1024 * 1024, // 64MB
    audio: 16 * 1024 * 1024  // 16MB
  };

  async downloadFromUrl(
    url: string,
    mediaType: 'image' | 'video' | 'audio',
    sessionId: string
  ): Promise<DownloadResult> {
    logger.info('Downloading media from URL', { url, mediaType });

    try {
      // Create temp directory
      const tempDir = path.join('./temp', sessionId);
      await fs.mkdir(tempDir, { recursive: true });

      // Generate temp filename
      const filename = `${crypto.randomUUID()}.tmp`;
      const tempPath = path.join(tempDir, filename);

      // Download with streaming
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 30000, // 30 seconds
        maxContentLength: this.maxSizes[mediaType]
      });

      const mimeType = response.headers['content-type'] || '';
      const contentLength = parseInt(response.headers['content-length'] || '0');

      // Validate MIME type
      if (!this.isValidMimeType(mimeType, mediaType)) {
        throw new Error(`Invalid MIME type: ${mimeType} for ${mediaType}`);
      }

      // Validate size
      if (contentLength > this.maxSizes[mediaType]) {
        throw new Error(`File too large: ${contentLength} bytes (max: ${this.maxSizes[mediaType]})`);
      }

      // Write to temp file
      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Read into buffer
      const buffer = await fs.readFile(tempPath);

      logger.info('Media downloaded successfully', {
        url,
        size: buffer.length,
        mimeType
      });

      return {
        buffer,
        mimeType,
        size: buffer.length,
        tempPath
      };

    } catch (error: any) {
      logger.error('Failed to download media', {
        url,
        error: error.message
      });
      throw error;
    }
  }

  private isValidMimeType(mimeType: string, mediaType: string): boolean {
    const validTypes = {
      image: ['image/jpeg', 'image/png', 'image/webp'],
      video: ['video/mp4', 'video/3gpp', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/wav', 'audio/mp4']
    };

    return validTypes[mediaType].includes(mimeType.toLowerCase());
  }

  async cleanup(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath);
      logger.debug('Temp file cleaned up', { tempPath });
    } catch (error: any) {
      logger.warn('Failed to cleanup temp file', {
        tempPath,
        error: error.message
      });
    }
  }

  async cleanupOldFiles(): Promise<void> {
    const tempDir = './temp';
    const maxAge = 60 * 60 * 1000; // 1 hour

    try {
      const sessions = await fs.readdir(tempDir);

      for (const session of sessions) {
        const sessionDir = path.join(tempDir, session);
        const files = await fs.readdir(sessionDir);

        for (const file of files) {
          const filePath = path.join(sessionDir, file);
          const stats = await fs.stat(filePath);

          if (Date.now() - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            logger.debug('Cleaned up old temp file', { filePath });
          }
        }
      }
    } catch (error: any) {
      logger.error('Cleanup job failed', { error: error.message });
    }
  }
}
```

### References

- [epics.md#L213-L226](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L213-L226) - Story 2.2 context
- FR12-14: Envoi Média - [epics.md#L32-L34](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L32-L34)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
