import axios from 'axios';
import { MediaType } from './downloader.js';

export interface ValidationResult {
    valid: boolean;
    error?: string;
    contentLength?: number;
    contentType?: string;
}

const MAX_SIZES: Record<MediaType, number> = {
    image: 16 * 1024 * 1024,
    video: 64 * 1024 * 1024,
    audio: 16 * 1024 * 1024
};

const VALID_MIME_TYPES: Record<MediaType, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/3gpp', 'video/quicktime', 'video/webm'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/wav', 'audio/mp4', 'audio/opus']
};

/**
 * Validate a URL for media download
 * Performs HEAD request to check accessibility, size, and MIME type
 */
export async function validateMediaUrl(
    url: string,
    mediaType: MediaType
): Promise<ValidationResult> {
    try {
        // Validate URL format
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return { valid: false, error: 'Invalid URL protocol. Must be HTTP or HTTPS.' };
        }

        // Perform HEAD request
        const response = await axios.head(url, {
            timeout: 10000,
            validateStatus: (status) => status < 400
        });

        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        const contentType = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();

        // Validate content type
        if (contentType && !VALID_MIME_TYPES[mediaType].includes(contentType)) {
            return {
                valid: false,
                error: `Invalid content type: ${contentType}. Expected: ${VALID_MIME_TYPES[mediaType].join(', ')}`,
                contentLength,
                contentType
            };
        }

        // Validate size
        if (contentLength > 0 && contentLength > MAX_SIZES[mediaType]) {
            return {
                valid: false,
                error: `File too large: ${formatBytes(contentLength)}. Max: ${formatBytes(MAX_SIZES[mediaType])}`,
                contentLength,
                contentType
            };
        }

        return {
            valid: true,
            contentLength,
            contentType
        };

    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return { valid: false, error: 'URL validation timeout' };
            }
            if (error.response?.status === 404) {
                return { valid: false, error: 'URL not found (404)' };
            }
            if (error.response?.status === 403) {
                return { valid: false, error: 'Access denied (403)' };
            }
            if (error.response?.status === 401) {
                return { valid: false, error: 'Authentication required (401)' };
            }
            return { valid: false, error: `URL not accessible: ${error.message}` };
        }

        if (error instanceof TypeError) {
            return { valid: false, error: 'Invalid URL format' };
        }

        return { valid: false, error: `Validation failed: ${error.message}` };
    }
}

/**
 * Validate image URL specifically
 */
export async function validateImageUrl(url: string): Promise<ValidationResult> {
    return validateMediaUrl(url, 'image');
}

/**
 * Validate video URL specifically
 */
export async function validateVideoUrl(url: string): Promise<ValidationResult> {
    return validateMediaUrl(url, 'video');
}

/**
 * Validate audio URL specifically
 */
export async function validateAudioUrl(url: string): Promise<ValidationResult> {
    return validateMediaUrl(url, 'audio');
}

/**
 * Check if a MIME type is valid for the given media type
 */
export function isValidMimeType(mimeType: string, mediaType: MediaType): boolean {
    const normalizedMime = (mimeType.toLowerCase().split(';')[0] || '').trim();
    return VALID_MIME_TYPES[mediaType]?.includes(normalizedMime) ?? false;
}

/**
 * Get max size in bytes for a media type
 */
export function getMaxSize(mediaType: MediaType): number {
    return MAX_SIZES[mediaType];
}

/**
 * Get valid MIME types for a media type
 */
export function getValidMimeTypes(mediaType: MediaType): string[] {
    return [...VALID_MIME_TYPES[mediaType]];
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
