import { randomUUID } from "node:crypto";

import type { FollowupStore, Scheduler, SchedulerWake } from "../core/types.js";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 30_000;
const DEFAULT_RETRY_MAX_DELAY_MS = 15 * 60_000;

export type SchedulerClock = {
  nowIso(): string;
};

export type SchedulerIdGenerator = {
  nextWakeId(): string;
};

export type RetryBackoffConfig = {
  baseDelayMs: number;
  maxDelayMs: number;
};

export type DeterministicSchedulerOptions = {
  followupStore: FollowupStore;
  heartbeatIntervalMs?: number;
  retryBackoff?: Partial<RetryBackoffConfig>;
  clock?: SchedulerClock;
  idGenerator?: SchedulerIdGenerator;
};

export class DeterministicScheduler implements Scheduler {
  private readonly followupStore: FollowupStore;
  private readonly heartbeatIntervalMs: number;
  private readonly retryBackoff: RetryBackoffConfig;
  private readonly clock: SchedulerClock;
  private readonly idGenerator: SchedulerIdGenerator;

  private started = false;
  private nextHeartbeatAt: string | null = null;
  private pendingRetries: Array<{ failedWakeId: string; notBefore: string }> = [];

  constructor(options: DeterministicSchedulerOptions) {
    this.followupStore = options.followupStore;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.retryBackoff = {
      baseDelayMs: options.retryBackoff?.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
      maxDelayMs: options.retryBackoff?.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
    };
    this.clock = options.clock ?? {
      nowIso: () => new Date().toISOString(),
    };
    this.idGenerator = options.idGenerator ?? {
      nextWakeId: () => randomUUID(),
    };
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.nextHeartbeatAt = this.addMilliseconds(this.clock.nowIso(), this.heartbeatIntervalMs);
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async scheduleFollowup(record: { id: string; reason: string; notBefore: string; contextRef?: string }): Promise<void> {
    await this.followupStore.upsert(record);
  }

  async scheduleWakeRetry(failedWakeId: string, attempt: number): Promise<void> {
    if (attempt < 1) {
      throw new Error(`retry attempt must be >= 1. got ${attempt}`);
    }

    const delayMs = this.computeRetryDelayMs(attempt);
    const notBefore = this.addMilliseconds(this.clock.nowIso(), delayMs);

    this.pendingRetries.push({ failedWakeId, notBefore });
    this.pendingRetries.sort((left, right) => left.notBefore.localeCompare(right.notBefore));
  }

  async drainDueWakes(nowIso?: string): Promise<SchedulerWake[]> {
    if (!this.started) {
      return [];
    }

    const effectiveNowIso = nowIso ?? this.clock.nowIso();
    const wakes: SchedulerWake[] = [];

    if (this.nextHeartbeatAt !== null && this.nextHeartbeatAt <= effectiveNowIso) {
      wakes.push({
        wakeId: this.idGenerator.nextWakeId(),
        reason: {
          kind: "heartbeat",
        },
        scheduledAt: this.nextHeartbeatAt,
      });

      this.nextHeartbeatAt = this.addMilliseconds(this.nextHeartbeatAt, this.heartbeatIntervalMs);
    }

    const dueFollowups = await this.followupStore.listDue(effectiveNowIso);
    for (const followup of dueFollowups) {
      wakes.push({
        wakeId: this.idGenerator.nextWakeId(),
        reason: {
          kind: "delayed_followup",
          followupId: followup.id,
        },
        scheduledAt: followup.notBefore,
      });

      await this.followupStore.remove(followup.id);
    }

    const dueRetries = this.pendingRetries.filter((retry) => retry.notBefore <= effectiveNowIso);
    this.pendingRetries = this.pendingRetries.filter((retry) => retry.notBefore > effectiveNowIso);

    for (const retry of dueRetries) {
      wakes.push({
        wakeId: this.idGenerator.nextWakeId(),
        reason: {
          kind: "wake_retry",
          failedWakeId: retry.failedWakeId,
        },
        scheduledAt: retry.notBefore,
      });
    }

    wakes.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
    return wakes;
  }

  private computeRetryDelayMs(attempt: number): number {
    const multiplier = 2 ** (attempt - 1);
    const proposedDelayMs = this.retryBackoff.baseDelayMs * multiplier;

    return Math.min(proposedDelayMs, this.retryBackoff.maxDelayMs);
  }

  private addMilliseconds(isoTime: string, millisecondsToAdd: number): string {
    const timestamp = Date.parse(isoTime);

    if (Number.isNaN(timestamp)) {
      throw new Error(`invalid iso timestamp: ${isoTime}`);
    }

    return new Date(timestamp + millisecondsToAdd).toISOString();
  }
}
