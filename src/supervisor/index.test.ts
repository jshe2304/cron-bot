import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { CampaignState, MemoryStore, SchedulerWake, SupervisorInput } from "../core/types.js";
import { FileEventLogStore } from "../memory/event-log-store.js";
import { FileCampaignProfileStore, FileFollowupStore, FileTrajectoryStore } from "../memory/file-stores.js";
import { DeterministicScheduler } from "../scheduler/index.js";
import { StubSupervisor, SupervisorRuntime } from "./index.js";

class SequenceClock {
  private readonly values: string[];
  private index = 0;

  constructor(values: string[]) {
    this.values = values;
  }

  nowIso(): string {
    const current = this.values[Math.min(this.index, this.values.length - 1)];
    this.index += 1;
    return current;
  }
}

const createCampaignState = (): CampaignState => {
  return {
    campaignId: "campaign-a",
    goal: "Train model with periodic health checks",
    approvalMode: "ask_before_resubmit",
    viewWindow: {
      recentIncidentLimit: 20,
      recentSummaryLimit: 10,
      recentObservationLimit: 25,
    },
    activeJobs: [],
    pendingFollowups: [],
    recentIncidents: [],
    recentSummaries: [],
  };
};

const createMemoryStore = (rootDir: string): MemoryStore => {
  return {
    events: new FileEventLogStore({
      campaignId: "campaign-a",
      rootDir,
    }),
    profile: new FileCampaignProfileStore({
      campaignId: "campaign-a",
      rootDir,
    }),
    followups: new FileFollowupStore({
      campaignId: "campaign-a",
      rootDir,
    }),
    trajectories: new FileTrajectoryStore({
      campaignId: "campaign-a",
      rootDir,
    }),
  };
};

test("SupervisorRuntime records wake lifecycle and persists followup output", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-supervisor-wake-"));
  const memory = createMemoryStore(rootDir);

  const runtime = new SupervisorRuntime({
    campaignId: "campaign-a",
    memory,
    initialCampaign: createCampaignState(),
    supervisor: new StubSupervisor({
      decisionFactory: (input: SupervisorInput) => ({
        events: [
          {
            type: "assessment",
            createdAt: "2026-04-10T00:00:02.000Z",
            summary: `handled ${input.wake.kind}`,
            outcome: "healthy",
          },
        ],
        actionRecords: [],
        followups: [
          {
            id: "fup-1",
            reason: "re-check stdout for completion marker",
            notBefore: "2026-04-10T00:10:00.000Z",
          },
        ],
        summary: "wake completed",
      }),
    }),
    clock: new SequenceClock([
      "2026-04-10T00:00:00.000Z",
      "2026-04-10T00:00:03.000Z",
      "2026-04-10T00:00:04.000Z",
    ]),
  });

  const wake: SchedulerWake = {
    wakeId: "wake-1",
    reason: {
      kind: "heartbeat",
    },
    scheduledAt: "2026-04-10T00:00:00.000Z",
  };

  await runtime.runWake(wake);

  const events = await memory.events.list("campaign-a");
  assert.equal(events.length, 3);

  assert.deepEqual(events[0], {
    type: "wake_lifecycle",
    createdAt: "2026-04-10T00:00:00.000Z",
    wakeId: "wake-1",
    phase: "start",
    wakeReason: {
      kind: "heartbeat",
    },
  });

  assert.deepEqual(events[1], {
    type: "assessment",
    createdAt: "2026-04-10T00:00:02.000Z",
    summary: "handled heartbeat",
    outcome: "healthy",
  });

  assert.deepEqual(events[2], {
    type: "wake_lifecycle",
    createdAt: "2026-04-10T00:00:03.000Z",
    wakeId: "wake-1",
    phase: "end",
    wakeReason: {
      kind: "heartbeat",
    },
    summary: "wake completed",
  });

  const dueFollowups = await memory.followups.listDue("2026-04-10T00:10:00.000Z");
  assert.equal(dueFollowups.length, 1);
  assert.equal(dueFollowups[0].id, "fup-1");

  const campaign = await memory.profile.load("campaign-a");
  assert.notEqual(campaign, null);
  if (campaign === null) {
    throw new Error("campaign should be present");
  }

  assert.equal(campaign.pendingFollowups.length, 1);
  assert.equal(campaign.pendingFollowups[0].id, "fup-1");
});

test("system scenario: scheduler + memory + supervisor process heartbeat and delayed followup wakes", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-system-phase4-"));
  const memory = createMemoryStore(rootDir);
  await memory.profile.save(createCampaignState());

  const runtime = new SupervisorRuntime({
    campaignId: "campaign-a",
    memory,
    supervisor: new StubSupervisor({
      decisionFactory: (input: SupervisorInput) => {
        if (input.wake.kind === "heartbeat") {
          return {
            events: [
              {
                type: "observation",
                createdAt: "2026-04-10T00:01:01.000Z",
                summary: "heartbeat observed healthy campaign",
              },
            ],
            actionRecords: [
              {
                kind: "query_job",
                summary: "checked scheduler state",
                jobId: "job-100",
              },
            ],
            followups: [
              {
                id: "fup-heartbeat-1",
                reason: "verify training still advancing",
                notBefore: "2026-04-10T00:02:00.000Z",
              },
            ],
            summary: "scheduled followup",
          };
        }

        return {
          events: [
            {
              type: "observation",
              createdAt: "2026-04-10T00:02:01.000Z",
              summary: "delayed followup completed",
            },
          ],
          actionRecords: [],
          followups: [],
          summary: "followup complete",
        };
      },
    }),
    clock: new SequenceClock([
      "2026-04-10T00:01:00.000Z",
      "2026-04-10T00:01:05.000Z",
      "2026-04-10T00:02:00.000Z",
      "2026-04-10T00:02:05.000Z",
    ]),
  });

  const scheduler = new DeterministicScheduler({
    followupStore: memory.followups,
    heartbeatIntervalMs: 60_000,
    clock: {
      nowIso: () => "2026-04-10T00:00:00.000Z",
    },
    idGenerator: {
      nextWakeId: () => "wake-heartbeat",
    },
  });

  await scheduler.start();

  const heartbeatWakes = await scheduler.drainDueWakes("2026-04-10T00:01:00.000Z");
  assert.equal(heartbeatWakes.length, 1);
  await runtime.runWake(heartbeatWakes[0]);

  const schedulerWithFollowup = new DeterministicScheduler({
    followupStore: memory.followups,
    heartbeatIntervalMs: 30 * 60_000,
    clock: {
      nowIso: () => "2026-04-10T00:02:00.000Z",
    },
    idGenerator: {
      nextWakeId: () => "wake-followup",
    },
  });

  await schedulerWithFollowup.start();

  const delayedWakes = await schedulerWithFollowup.drainDueWakes("2026-04-10T00:02:00.000Z");
  assert.equal(delayedWakes.length, 1);
  assert.deepEqual(delayedWakes[0].reason, {
    kind: "delayed_followup",
    followupId: "fup-heartbeat-1",
  });

  await runtime.runWake(delayedWakes[0]);

  const dueAfterFollowup = await memory.followups.listDue("2026-04-10T00:03:00.000Z");
  assert.deepEqual(dueAfterFollowup, []);

  const campaign = await memory.profile.load("campaign-a");
  assert.notEqual(campaign, null);
  if (campaign === null) {
    throw new Error("campaign should be present");
  }

  assert.deepEqual(campaign.pendingFollowups, []);

  const lifecycleEvents = (await memory.events.list("campaign-a")).filter((event) => event.type === "wake_lifecycle");
  assert.equal(lifecycleEvents.length, 4);
  assert.equal(lifecycleEvents[0].phase, "start");
  assert.equal(lifecycleEvents[3].phase, "end");
});
