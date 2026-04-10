import test from "node:test";
import assert from "node:assert/strict";

import type {
  CampaignEvent,
  CampaignState,
  PolicyDecision,
  SchedulerWake,
  SupervisorDecision,
  WakeReason,
} from "./types.js";

test("WakeReason serializes and deserializes", () => {
  const wakeReason: WakeReason = {
    kind: "delayed_followup",
    followupId: "followup-123",
  };

  const json = JSON.stringify(wakeReason);
  const parsed = JSON.parse(json) as WakeReason;

  assert.deepEqual(parsed, wakeReason);
});

test("CampaignEvent union serializes and deserializes", () => {
  const event: CampaignEvent = {
    type: "wake_lifecycle",
    createdAt: "2026-04-10T00:00:00.000Z",
    wakeId: "wake-42",
    phase: "start",
    wakeReason: {
      kind: "heartbeat",
    },
  };

  const json = JSON.stringify(event);
  const parsed = JSON.parse(json) as CampaignEvent;

  assert.deepEqual(parsed, event);
});

test("PolicyDecision serializes and deserializes", () => {
  const decision: PolicyDecision = {
    outcome: "approval_required",
    reason: "resubmission is gated in ask_before_resubmit mode",
    approvalScope: "resubmit_job",
  };

  const json = JSON.stringify(decision);
  const parsed = JSON.parse(json) as PolicyDecision;

  assert.deepEqual(parsed, decision);
});

test("SupervisorDecision captures events, actions, and followups", () => {
  const decision: SupervisorDecision = {
    events: [
      {
        type: "observation",
        summary: "job output is stable",
        createdAt: "2026-04-10T00:00:00.000Z",
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
        id: "fup-1",
        reason: "check completion",
        notBefore: "2026-04-10T00:10:00.000Z",
      },
    ],
    summary: "No intervention needed.",
  };

  const json = JSON.stringify(decision);
  const parsed = JSON.parse(json) as SupervisorDecision;

  assert.deepEqual(parsed, decision);
});

test("CampaignState and SchedulerWake keep stable JSON shape", () => {
  const campaign: CampaignState = {
    campaignId: "campaign-1",
    goal: "Run parameter sweep",
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

  const wake: SchedulerWake = {
    wakeId: "wake-99",
    reason: {
      kind: "user_message",
      messageId: "msg-9",
    },
    scheduledAt: "2026-04-10T00:00:00.000Z",
  };

  const payload = { campaign, wake };
  const json = JSON.stringify(payload);
  const parsed = JSON.parse(json) as { campaign: CampaignState; wake: SchedulerWake };

  assert.deepEqual(parsed, payload);
});
