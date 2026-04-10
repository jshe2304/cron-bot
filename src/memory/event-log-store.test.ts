import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { CampaignEvent } from "../core/types.js";
import { FileEventLogStore } from "./event-log-store.js";

function makeEvent(index: number): CampaignEvent {
  return {
    type: "observation",
    summary: `observation-${index}`,
    createdAt: `2026-04-10T00:00:0${index}.000Z`,
  };
}

test("FileEventLogStore appends events as jsonl", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-event-log-"));
  const store = new FileEventLogStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const events = [makeEvent(1), makeEvent(2)];
  await store.append(events);

  const filePath = join(rootDir, "campaign-a", "events.jsonl");
  const content = await readFile(filePath, "utf8");
  const lines = content.trimEnd().split("\n");

  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]) as CampaignEvent, events[0]);
  assert.deepEqual(JSON.parse(lines[1]) as CampaignEvent, events[1]);
});

test("FileEventLogStore returns full event history in append order", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-event-log-"));
  const store = new FileEventLogStore({
    campaignId: "campaign-a",
    rootDir,
  });

  await store.append([makeEvent(1)]);
  await store.append([makeEvent(2), makeEvent(3)]);

  const events = await store.list("campaign-a");
  assert.deepEqual(events, [makeEvent(1), makeEvent(2), makeEvent(3)]);
});

test("FileEventLogStore supports bounded listing", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-event-log-"));
  const store = new FileEventLogStore({
    campaignId: "campaign-a",
    rootDir,
  });

  await store.append([makeEvent(1), makeEvent(2), makeEvent(3)]);

  const events = await store.list("campaign-a", 2);
  assert.deepEqual(events, [makeEvent(2), makeEvent(3)]);
});

test("FileEventLogStore returns empty list for missing or mismatched campaign", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "cron-bot-event-log-"));
  const store = new FileEventLogStore({
    campaignId: "campaign-a",
    rootDir,
  });

  const noEventsYet = await store.list("campaign-a");
  assert.deepEqual(noEventsYet, []);

  await store.append([makeEvent(1)]);
  const mismatchedCampaignEvents = await store.list("campaign-b");
  assert.deepEqual(mismatchedCampaignEvents, []);
});
