import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface DownloadResult {
    buffer: Buffer;
    mimeType: string;
    size: number;
    tempPath: string;
}

export type MediaType = 'image' | 'video' | 'audio';

interface MaxSizes {
    image: number;
    video: number;
    audio: number;
}

const MAX_SIZES: MaxSizes = {
    image: 16 * 1024 * 1024, // 16MB
    video: 64 * 1024 * 1024, // 64MB
    audio: 16 * 1024 * 1024  // 16MB
};

const VALID_MIME_TYPES: Record<MediaType, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/3gpp', 'video/quicktime', 'video/webm'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/wav', 'audio/mp4', 'audio/opus']
};

const DOWNLOAD_TIMEOUT = 30000; // 30 seconds

/**
 * Media Downloader class for downloading media from URLs
 * Handles streaming downloads with size and MIME type validation
 */
export class MediaDownloader {
    private tempBaseDir: string;

    constructor(tempBaseDir: string = './temp') {
        this.tempBaseDir = tempBaseDir;
    }

    /**
     * Download media from a URL with validation
     */
    async downloadFromUrl(
        url: string,
        mediaType: MediaType,
        sessionId: string
    ): Promise<DownloadResult> {
        console.log(`[MediaDownloader] Downloading ${mediaType} from: ${url}`);

        const maxSize = MAX_SIZES[mediaType];

        // Create temp directory for session
        const tempDir = path.join(this.tempBaseDir, sessionId);
        await fs.promises.mkdir(tempDir, { recursive: true });

        // Generate unique temp filename
        const filename = `${randomUUID()}.tmp`;
        const tempPath = path.join(tempDir, filename);

        try {
            // First, do a HEAD request to check content-length and type
            const headResponse = await axios.head(url, { timeout: 10000 });
            const contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);
            const contentType = (headResponse.headers['content-type'] || '').split(';')[0].trim();

            // Pre-validate size if content-length is available
            if (contentLength > 0 && contentLength > maxSize) {
                throw new Error(
                    `File too large: ${this.formatBytes(contentLength)} (max: ${this.formatBytes(maxSize)})`
                );
            }

            // Validate MIME type from headers
            if (contentType && !this.isValidMimeType(contentType, mediaType)) {
                throw new Error(
                    `Invalid MIME type: ${contentType}. Expected one of: ${VALID_MIME_TYPES[mediaType].join(', ')}`
                );
            }

            // Download with streaming
            const response: AxiosResponse<NodeJS.ReadableStream> = await axios({
                method: 'GET',
                url,
                responseType: 'stream',
                timeout: DOWNLOAD_TIMEOUT,
                maxContentLength: maxSize,
                maxBodyLength: maxSize
            });

            // Get actual MIME type from response
            const mimeType = (response.headers['content-type'] || contentType || '').split(';')[0].trim();

            // Create write stream
            const writeStream = fs.createWriteStream(tempPath);
            let downloadedSize = 0;

            // Pipe with size tracking
            await new Promise<void>((resolve, reject) => {
                response.data.on('data', (chunk: Buffer) => {
                    downloadedSize += chunk.length;

                    // Check size during download
                    if (downloadedSize > maxSize) {
                        (response.data as any).destroy?.();
                        writeStream.destroy();
                        reject(new Error(
                            `Download aborted: File exceeds ${this.formatBytes(maxSize)} limit`
                        ));
                    }
                });

                response.data.pipe(writeStream);

                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                response.data.on('error', reject);
            });

            // Read the downloaded file into buffer
            const buffer = await fs.promises.readFile(tempPath);

            console.log(`[MediaDownloader] Downloaded successfully: ${this.formatBytes(buffer.length)}, MIME: ${mimeType}`);

            return {
                buffer,
                mimeType: mimeType || this.detectMimeTypeFromExtension(url, mediaType),
                size: buffer.length,
                tempPath
            };

        } catch (error: any) {
            // Cleanup temp file on error
            await this.cleanup(tempPath).catch(() => { });

            // Re-throw with better error message
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error(`Download timeout: URL took longer than ${DOWNLOAD_TIMEOUT / 1000}s to respond`);
                }
                if (error.response?.status === 404) {
                    throw new Error(`URL not found: ${url}`);
                }
                if (error.response?.status === 403) {
                    throw new Error(`Access denied to URL: ${url}`);
                }
                throw new Error(`Failed to download media: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Check if MIME type is valid for the given media type
     */
    isValidMimeType(mimeType: string, mediaType: MediaType): boolean {
        const normalizedMime = (mimeType.toLowerCase().split(';')[0] || '').trim();
        return VALID_MIME_TYPES[mediaType]?.includes(normalizedMime) ?? false;
    }

    /**
     * Get valid MIME types for a media type
     */
    getValidMimeTypes(mediaType: MediaType): string[] {
        return VALID_MIME_TYPES[mediaType];
    }

    /**
     * Get max size for a media type
     */
    getMaxSize(mediaType: MediaType): number {
        return MAX_SIZES[mediaType];
    }

    /**
     * Cleanup a temp file
     */
    async cleanup(tempPath: string): Promise<void> {
        try {
            await fs.promises.unlink(tempPath);
            console.log(`[MediaDownloader] Cleaned up temp file: ${tempPath}`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.warn(`[MediaDownloader] Failed to cleanup: ${tempPath}`, error.message);
            }
        }
    }

    /**
     * Cleanup old temp files (older than maxAge)
     */
    async cleanupOldFiles(maxAgeMs: number = 60 * 60 * 1000): Promise<number> {
        let cleanedCount = 0;
        const now = Date.now();

        try {
            const sessions = await fs.promises.readdir(this.tempBaseDir);

            for (const session of sessions) {
                const sessionDir = path.join(this.tempBaseDir, session);
                const stat = await fs.promises.stat(sessionDir);

                if (!stat.isDirectory()) continue;

                const files = await fs.promises.readdir(sessionDir);

                for (const file of files) {
                    const filePath = path.join(sessionDir, file);
                    const fileStat = await fs.promises.stat(filePath);

                    if (now - fileStat.mtimeMs > maxAgeMs) {
                        await fs.promises.unlink(filePath);
                        cleanedCount++;
                        console.log(`[MediaDownloader] Cleaned up old file: ${filePath}`);
                    }
                }

                // Remove empty session directories
                const remainingFiles = await fs.promises.readdir(sessionDir);
                if (remainingFiles.length === 0) {
                    await fs.promises.rmdir(sessionDir);
                }
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('[MediaDownloader] Cleanup job failed:', error.message);
            }
        }

        return cleanedCount;
    }

    /**
     * Format bytes to human-readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Detect MIME type from URL extension (fallback)
     */
    private detectMimeTypeFromExtension(url: string, mediaType: MediaType): string {
        const ext = path.extname(new URL(url).pathname).toLowerCase();

        const extensionMap: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4',
            '.3gp': 'video/3gpp',
            '.mov': 'video/quicktime',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.ogg': 'audio/ogg',
            '.aac': 'audio/aac',
            '.wav': 'audio/wav',
            '.opus': 'audio/opus'
        };

        const defaultType = VALID_MIME_TYPES[mediaType]?.[0] || 'application/octet-stream';
        return extensionMap[ext] || defaultType;
    }
}

// Export singleton instance
export const mediaDownloader = new MediaDownloader();
