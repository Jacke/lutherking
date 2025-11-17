/**
 * Centralized Telemetry Logger
 *
 * Provides methods for logging events across the application:
 * - API calls
 * - User actions
 * - System operations
 * - External service calls
 */

import { db } from '@/drizzle/db';
import { telemetry } from '@/drizzle/schema';
import type {
  TelemetryEvent,
  TelemetryLevel,
  TelemetryCategory,
  APIEventMetadata,
  UserEventMetadata,
  SystemEventMetadata,
  ExternalEventMetadata,
} from './types';

/**
 * Base telemetry logger
 */
class TelemetryLogger {
  /**
   * Write event to database
   * @param event Telemetry event to log
   */
  private async writeEvent(event: TelemetryEvent): Promise<void> {
    try {
      await db.insert(telemetry).values({
        timestamp: event.timestamp,
        level: event.level,
        category: event.category,
        action: event.action,
        userId: event.userId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        duration: event.duration,
        error: event.error,
        errorStack: event.errorStack,
      }).run();
    } catch (error) {
      // Don't throw errors from telemetry - just log to console
      console.error('[Telemetry] Failed to write event:', error);
      console.error('[Telemetry] Event data:', event);
    }
  }

  /**
   * Log API endpoint call
   */
  async logAPI(
    action: string,
    metadata: APIEventMetadata,
    options: {
      level?: TelemetryLevel;
      userId?: number;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      duration?: number;
      error?: string;
      errorStack?: string;
    } = {}
  ): Promise<void> {
    await this.writeEvent({
      timestamp: new Date(),
      level: options.level || 'info',
      category: 'api',
      action,
      userId: options.userId,
      sessionId: options.sessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata,
      duration: options.duration,
      error: options.error,
      errorStack: options.errorStack,
    });
  }

  /**
   * Log user action
   */
  async logUser(
    action: string,
    metadata: UserEventMetadata,
    options: {
      level?: TelemetryLevel;
      userId?: number;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      duration?: number;
    } = {}
  ): Promise<void> {
    await this.writeEvent({
      timestamp: new Date(),
      level: options.level || 'info',
      category: 'user',
      action,
      userId: options.userId,
      sessionId: options.sessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata,
      duration: options.duration,
    });
  }

  /**
   * Log system operation
   */
  async logSystem(
    action: string,
    metadata: SystemEventMetadata,
    options: {
      level?: TelemetryLevel;
      userId?: number;
      sessionId?: string;
      duration?: number;
      error?: string;
      errorStack?: string;
    } = {}
  ): Promise<void> {
    await this.writeEvent({
      timestamp: new Date(),
      level: options.level || 'info',
      category: 'system',
      action,
      userId: options.userId,
      sessionId: options.sessionId,
      metadata,
      duration: options.duration,
      error: options.error,
      errorStack: options.errorStack,
    });
  }

  /**
   * Log external API call
   */
  async logExternal(
    action: string,
    metadata: ExternalEventMetadata,
    options: {
      level?: TelemetryLevel;
      userId?: number;
      sessionId?: string;
      duration?: number;
      error?: string;
      errorStack?: string;
    } = {}
  ): Promise<void> {
    await this.writeEvent({
      timestamp: new Date(),
      level: options.level || 'info',
      category: 'external',
      action,
      userId: options.userId,
      sessionId: options.sessionId,
      metadata,
      duration: options.duration,
      error: options.error,
      errorStack: options.errorStack,
    });
  }

  /**
   * Cleanup old telemetry events (90-day retention)
   * Should be called periodically (e.g., daily cron job)
   */
  async cleanup(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await db
        .delete(telemetry)
        .where(telemetry.timestamp < ninetyDaysAgo)
        .run();

      console.log(`[Telemetry] Cleaned up ${result.changes} old events`);
      return result.changes;
    } catch (error) {
      console.error('[Telemetry] Cleanup failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const logger = new TelemetryLogger();

// Export helper for timing operations
export function createTimer() {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
  };
}
