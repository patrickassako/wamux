import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_TEMP_DIR = './temp';
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Cleanup service for temporary media files
 */
export class CleanupService {
    private tempDir: string;
    private intervalId: NodeJS.Timeout | null = null;
    private running: boolean = false;

    constructor(tempDir: string = DEFAULT_TEMP_DIR) {
        this.tempDir = tempDir;
    }

    /**
     * Start the periodic cleanup job
     */
    start(intervalMs: number = CLEANUP_INTERVAL_MS): void {
        if (this.running) {
            console.log('[CleanupService] Already running');
            return;
        }

        console.log(`[CleanupService] Starting cleanup job (interval: ${intervalMs / 1000}s)`);

        this.running = true;

        // Run immediately on start
        this.cleanupOldFiles().catch(console.error);

        // Schedule periodic cleanup
        this.intervalId = setInterval(() => {
            this.cleanupOldFiles().catch(console.error);
        }, intervalMs);
    }

    /**
     * Stop the periodic cleanup job
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.running = false;
        console.log('[CleanupService] Stopped');
    }

    /**
     * Cleanup files older than maxAge
     */
    async cleanupOldFiles(maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<number> {
        let cleanedCount = 0;
        const now = Date.now();

        console.log('[CleanupService] Running cleanup...');

        try {
            // Check if temp directory exists
            try {
                await fs.promises.access(this.tempDir);
            } catch {
                // Temp dir doesn't exist, nothing to clean
                return 0;
            }

            const sessions = await fs.promises.readdir(this.tempDir);

            for (const session of sessions) {
                const sessionDir = path.join(this.tempDir, session);

                try {
                    const stat = await fs.promises.stat(sessionDir);
                    if (!stat.isDirectory()) continue;

                    const files = await fs.promises.readdir(sessionDir);

                    for (const file of files) {
                        const filePath = path.join(sessionDir, file);

                        try {
                            const fileStat = await fs.promises.stat(filePath);

                            if (now - fileStat.mtimeMs > maxAgeMs) {
                                await fs.promises.unlink(filePath);
                                cleanedCount++;
                                console.log(`[CleanupService] Cleaned: ${filePath}`);
                            }
                        } catch (err: any) {
                            if (err.code !== 'ENOENT') {
                                console.warn(`[CleanupService] Failed to check file: ${filePath}`, err.message);
                            }
                        }
                    }

                    // Remove empty session directories
                    const remainingFiles = await fs.promises.readdir(sessionDir);
                    if (remainingFiles.length === 0) {
                        await fs.promises.rmdir(sessionDir);
                        console.log(`[CleanupService] Removed empty dir: ${sessionDir}`);
                    }
                } catch (err: any) {
                    if (err.code !== 'ENOENT') {
                        console.warn(`[CleanupService] Failed to process session dir: ${sessionDir}`, err.message);
                    }
                }
            }

            if (cleanedCount > 0) {
                console.log(`[CleanupService] Cleaned ${cleanedCount} files`);
            }

        } catch (error: any) {
            console.error('[CleanupService] Cleanup job failed:', error.message);
        }

        return cleanedCount;
    }

    /**
     * Cleanup a specific temp file
     */
    async cleanupFile(filePath: string): Promise<boolean> {
        try {
            await fs.promises.unlink(filePath);
            console.log(`[CleanupService] Cleaned: ${filePath}`);
            return true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return true; // File already deleted
            }
            console.warn(`[CleanupService] Failed to clean: ${filePath}`, error.message);
            return false;
        }
    }

    /**
     * Cleanup all files for a session
     */
    async cleanupSession(sessionId: string): Promise<number> {
        const sessionDir = path.join(this.tempDir, sessionId);
        let cleanedCount = 0;

        try {
            const files = await fs.promises.readdir(sessionDir);

            for (const file of files) {
                const filePath = path.join(sessionDir, file);
                await fs.promises.unlink(filePath);
                cleanedCount++;
            }

            // Remove the session directory
            await fs.promises.rmdir(sessionDir);
            console.log(`[CleanupService] Cleaned session: ${sessionId} (${cleanedCount} files)`);

        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.warn(`[CleanupService] Failed to clean session: ${sessionId}`, error.message);
            }
        }

        return cleanedCount;
    }
}

// Export singleton instance
export const cleanupService = new CleanupService();
