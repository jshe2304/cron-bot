import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FileFollowupStore } from "../memory/file-stores.js";
import { DeterministicScheduler, type SchedulerClock, type SchedulerIdGenerator } from "./index.js";

class FixedClock implements SchedulerClock {
  private now: string;

  constructor(nowIso: string) {
    this.now = nowIso;
  }

  nowIso(): string {
    return this.now;
  }

  set(nowIso: string): void {
    this.now = nowIso;
  }
}

class SequentialIds implements SchedulerIdGenerator {
  private nextId = 1;

  nextWakeId(): string {
    const id = `wake-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}

test("DeterministicScheduler emits heartbeat wakes on interval", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-scheduler-heartbeat-"));
  const followupStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const clock = new FixedClock("2026-04-10T00:00:00.000Z");
  const scheduler = new DeterministicScheduler({
    followupStore,
    heartbeatIntervalMs: 60_000,
    clock,
    idGenerator: new SequentialIds(),
  });

  await scheduler.start();

  const noneDueYet = await scheduler.drainDueWakes("2026-04-10T00:00:59.000Z");
  assert.deepEqual(noneDueYet, []);

  const firstHeartbeat = await scheduler.drainDueWakes("2026-04-10T00:01:00.000Z");
  assert.equal(firstHeartbeat.length, 1);
  assert.equal(firstHeartbeat[0].reason.kind, "heartbeat");
  assert.equal(firstHeartbeat[0].scheduledAt, "2026-04-10T00:01:00.000Z");

  const secondHeartbeat = await scheduler.drainDueWakes("2026-04-10T00:02:00.000Z");
  assert.equal(secondHeartbeat.length, 1);
  assert.equal(secondHeartbeat[0].reason.kind, "heartbeat");
  assert.equal(secondHeartbeat[0].scheduledAt, "2026-04-10T00:02:00.000Z");
});

test("DeterministicScheduler catches up missed heartbeat intervals in a single drain", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-scheduler-heartbeat-catchup-"));
  const followupStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const scheduler = new DeterministicScheduler({
    followupStore,
    heartbeatIntervalMs: 60_000,
    clock: new FixedClock("2026-04-10T00:00:00.000Z"),
    idGenerator: new SequentialIds(),
  });

  await scheduler.start();

  const overdueHeartbeats = await scheduler.drainDueWakes("2026-04-10T00:03:05.000Z");
  assert.equal(overdueHeartbeats.length, 3);
  assert.deepEqual(
    overdueHeartbeats.map((wake) => wake.scheduledAt),
    ["2026-04-10T00:01:00.000Z", "2026-04-10T00:02:00.000Z", "2026-04-10T00:03:00.000Z"],
  );
  assert.deepEqual(
    overdueHeartbeats.map((wake) => wake.reason.kind),
    ["heartbeat", "heartbeat", "heartbeat"],
  );
});

test("DeterministicScheduler delivers delayed followups and removes them", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-scheduler-followup-"));
  const followupStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const scheduler = new DeterministicScheduler({
    followupStore,
    heartbeatIntervalMs: 10 * 60_000,
    clock: new FixedClock("2026-04-10T00:00:00.000Z"),
    idGenerator: new SequentialIds(),
  });

  await scheduler.start();
  await scheduler.scheduleFollowup({
    id: "fup-1",
    reason: "check logs",
    notBefore: "2026-04-10T00:03:00.000Z",
  });

  const notDue = await scheduler.drainDueWakes("2026-04-10T00:02:59.000Z");
  assert.deepEqual(notDue, []);

  const due = await scheduler.drainDueWakes("2026-04-10T00:03:00.000Z");
  assert.equal(due.length, 1);
  assert.deepEqual(due[0].reason, {
    kind: "delayed_followup",
    followupId: "fup-1",
  });

  const followupDoesNotRepeat = await scheduler.drainDueWakes("2026-04-10T00:04:00.000Z");
  assert.deepEqual(followupDoesNotRepeat, []);
});

test("DeterministicScheduler supports restart recovery for persisted followups", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-scheduler-recovery-"));
  const followupStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const firstScheduler = new DeterministicScheduler({
    followupStore,
    heartbeatIntervalMs: 10 * 60_000,
    clock: new FixedClock("2026-04-10T00:00:00.000Z"),
    idGenerator: new SequentialIds(),
  });

  await firstScheduler.start();
  await firstScheduler.scheduleFollowup({
    id: "fup-recover",
    reason: "recover after restart",
    notBefore: "2026-04-10T00:05:00.000Z",
  });
  await firstScheduler.stop();

  const recoveredScheduler = new DeterministicScheduler({
    followupStore: new FileFollowupStore({
      campaignId: "campaign-a",
      rootDir,
    }),
    heartbeatIntervalMs: 10 * 60_000,
    clock: new FixedClock("2026-04-10T00:05:00.000Z"),
    idGenerator: new SequentialIds(),
  });

  await recoveredScheduler.start();

  const wakes = await recoveredScheduler.drainDueWakes("2026-04-10T00:05:00.000Z");
  assert.equal(wakes.length, 1);
  assert.deepEqual(wakes[0].reason, {
    kind: "delayed_followup",
    followupId: "fup-recover",
  });
});

test("DeterministicScheduler schedules bounded retry backoff wakes", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-scheduler-retry-"));
  const followupStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const clock = new FixedClock("2026-04-10T00:00:00.000Z");
  const scheduler = new DeterministicScheduler({
    followupStore,
    heartbeatIntervalMs: 10 * 60_000,
    retryBackoff: {
      baseDelayMs: 15_000,
      maxDelayMs: 45_000,
    },
    clock,
    idGenerator: new SequentialIds(),
  });

  await scheduler.start();

  await scheduler.scheduleWakeRetry("wake-failed-1", 1);
  await scheduler.scheduleWakeRetry("wake-failed-2", 3);

  const beforeDue = await scheduler.drainDueWakes("2026-04-10T00:00:14.000Z");
  assert.deepEqual(beforeDue, []);

  const firstRetry = await scheduler.drainDueWakes("2026-04-10T00:00:15.000Z");
  assert.equal(firstRetry.length, 1);
  assert.deepEqual(firstRetry[0].reason, {
    kind: "wake_retry",
    failedWakeId: "wake-failed-1",
  });
  assert.equal(firstRetry[0].scheduledAt, "2026-04-10T00:00:15.000Z");

  const secondRetry = await scheduler.drainDueWakes("2026-04-10T00:00:45.000Z");
  assert.equal(secondRetry.length, 1);
  assert.deepEqual(secondRetry[0].reason, {
    kind: "wake_retry",
    failedWakeId: "wake-failed-2",
  });
  assert.equal(secondRetry[0].scheduledAt, "2026-04-10T00:00:45.000Z");
});

test("DeterministicScheduler returns no wakes when stopped", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-scheduler-stop-"));
  const followupStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const scheduler = new DeterministicScheduler({
    followupStore,
    clock: new FixedClock("2026-04-10T00:00:00.000Z"),
    idGenerator: new SequentialIds(),
  });

  await scheduler.start();
  await scheduler.stop();

  const wakes = await scheduler.drainDueWakes("2026-04-10T00:10:00.000Z");
  assert.deepEqual(wakes, []);
});
