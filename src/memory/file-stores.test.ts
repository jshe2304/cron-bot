import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { CampaignState, FollowupRecord, TrajectoryRecord } from "../core/types.js";
import {
  FileCampaignProfileStore,
  FileFollowupStore,
  FileTrajectoryStore,
} from "./file-stores.js";

function makeCampaignState(campaignId: string): CampaignState {
  return {
    campaignId,
    goal: "Run campaign",
    approvalMode: "ask_before_resubmit",
    viewWindow: {
      recentIncidentLimit: 10,
      recentSummaryLimit: 10,
      recentObservationLimit: 20,
    },
    activeJobs: [],
    pendingFollowups: [],
    recentIncidents: [],
    recentSummaries: [],
  };
}

function makeFollowup(id: string, notBefore: string): FollowupRecord {
  return {
    id,
    reason: `reason-${id}`,
    notBefore,
  };
}

function makeTrajectory(incidentId: string): TrajectoryRecord {
  return {
    incidentId,
    inputsConsidered: ["scheduler", "logs"],
    observations: ["job failed"],
    reasoningSummary: "Likely missing module",
    commandsRun: ["sbatch run.sh"],
    diffsApplied: ["scripts/run.sh"],
    validationResults: ["bash -n scripts/run.sh"],
    approvalOutcomes: ["approved"],
    schedulerActions: ["resubmitted job-42"],
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
  };
}

test("FileCampaignProfileStore saves and reloads campaign state", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-profile-"));
  const store = new FileCampaignProfileStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const original = makeCampaignState("campaign-a");
  await store.save(original);

  const reloaded = await store.load("campaign-a");
  assert.deepEqual(reloaded, original);
});

test("FileCampaignProfileStore returns null for missing or mismatched campaign", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-profile-"));
  const store = new FileCampaignProfileStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const missing = await store.load("campaign-a");
  assert.equal(missing, null);

  await store.save(makeCampaignState("campaign-a"));
  const mismatched = await store.load("campaign-b");
  assert.equal(mismatched, null);
});

test("FileFollowupStore upserts, lists due records, and supports restart recovery", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-followup-"));
  const initialStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  await initialStore.upsert(makeFollowup("fup-1", "2026-04-10T00:01:00.000Z"));
  await initialStore.upsert(makeFollowup("fup-2", "2026-04-10T00:03:00.000Z"));
  await initialStore.upsert(makeFollowup("fup-1", "2026-04-10T00:02:00.000Z"));

  const restartedStore = new FileFollowupStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const due = await restartedStore.listDue("2026-04-10T00:02:30.000Z");
  assert.deepEqual(due, [makeFollowup("fup-1", "2026-04-10T00:02:00.000Z")]);

  await restartedStore.remove("fup-1");
  const remainingDue = await restartedStore.listDue("2026-04-10T00:05:00.000Z");
  assert.deepEqual(remainingDue, [makeFollowup("fup-2", "2026-04-10T00:03:00.000Z")]);
});

test("FileTrajectoryStore saves and fetches by incident id", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-trajectory-"));
  const store = new FileTrajectoryStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const trajectory = makeTrajectory("incident-1");
  await store.save(trajectory);

  const loaded = await store.getByIncidentId("incident-1");
  assert.deepEqual(loaded, trajectory);

  const missing = await store.getByIncidentId("incident-2");
  assert.equal(missing, null);
});
