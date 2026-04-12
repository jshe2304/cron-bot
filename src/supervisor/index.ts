import { randomUUID } from "node:crypto";

import type {
  CampaignEvent,
  CampaignState,
  FollowupRecord,
  MemoryStore,
  SchedulerWake,
  Supervisor,
  SupervisorDecision,
  SupervisorInput,
} from "../core/types.js";

export type SupervisorClock = {
  nowIso(): string;
};

export type SupervisorRuntimeOptions = {
  campaignId: string;
  memory: MemoryStore;
  supervisor: Supervisor;
  initialCampaign?: CampaignState;
  clock?: SupervisorClock;
};

export class SupervisorRuntime {
  private readonly campaignId: string;
  private readonly memory: MemoryStore;
  private readonly supervisor: Supervisor;
  private readonly initialCampaign?: CampaignState;
  private readonly clock: SupervisorClock;

  constructor(options: SupervisorRuntimeOptions) {
    this.campaignId = options.campaignId;
    this.memory = options.memory;
    this.supervisor = options.supervisor;
    this.initialCampaign = options.initialCampaign;
    this.clock =
      options.clock ?? {
        nowIso: () => new Date().toISOString(),
      };
  }

  async runWake(wake: SchedulerWake): Promise<SupervisorDecision> {
    const startEvent: CampaignEvent = {
      type: "wake_lifecycle",
      createdAt: this.clock.nowIso(),
      wakeId: wake.wakeId,
      phase: "start",
      wakeReason: wake.reason,
    };

    await this.memory.events.append([startEvent]);

    const campaign = await this.loadCampaignState();

    const input: SupervisorInput = {
      wake: wake.reason,
      campaign,
    };

    try {
      const decision = await this.supervisor.run(input);
      const nextCampaign = this.applyFollowups(campaign, wake, decision.followups);

      await this.memory.profile.save(nextCampaign);
      await this.persistFollowups(decision.followups);

      const endEvent: CampaignEvent = {
        type: "wake_lifecycle",
        createdAt: this.clock.nowIso(),
        wakeId: wake.wakeId,
        phase: "end",
        wakeReason: wake.reason,
        summary: decision.summary,
      };

      await this.memory.events.append([...decision.events, endEvent]);

      return decision;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown wake failure";

      const degradedEvent: CampaignEvent = {
        type: "wake_degraded",
        createdAt: this.clock.nowIso(),
        reason,
        fallbackMode: campaign.approvalMode,
      };

      const endEvent: CampaignEvent = {
        type: "wake_lifecycle",
        createdAt: this.clock.nowIso(),
        wakeId: wake.wakeId,
        phase: "end",
        wakeReason: wake.reason,
        summary: `wake failed: ${reason}`,
      };

      await this.memory.events.append([degradedEvent, endEvent]);

      throw error;
    }
  }

  private async loadCampaignState(): Promise<CampaignState> {
    const loaded = await this.memory.profile.load(this.campaignId);

    if (loaded !== null) {
      return loaded;
    }

    if (this.initialCampaign === undefined) {
      throw new Error(`campaign state not found for ${this.campaignId}`);
    }

    await this.memory.profile.save(this.initialCampaign);
    return this.initialCampaign;
  }

  private async persistFollowups(followups: FollowupRecord[]): Promise<void> {
    for (const followup of followups) {
      await this.memory.followups.upsert(followup);
    }
  }

  private applyFollowups(campaign: CampaignState, wake: SchedulerWake, followups: FollowupRecord[]): CampaignState {
    let pendingFollowups = campaign.pendingFollowups;

    if (wake.reason.kind === "delayed_followup") {
      const delayedFollowupId = wake.reason.followupId;
      pendingFollowups = pendingFollowups.filter((record) => record.id !== delayedFollowupId);
    }

    for (const followup of followups) {
      pendingFollowups = pendingFollowups.filter((record) => record.id !== followup.id);
      pendingFollowups.push(followup);
    }

    return {
      ...campaign,
      pendingFollowups,
    };
  }
}

export type StubSupervisorOptions = {
  decisionFactory?: (input: SupervisorInput) => SupervisorDecision | Promise<SupervisorDecision>;
};

export class StubSupervisor implements Supervisor {
  private readonly decisionFactory?: StubSupervisorOptions["decisionFactory"];

  constructor(options: StubSupervisorOptions = {}) {
    this.decisionFactory = options.decisionFactory;
  }

  async run(input: SupervisorInput): Promise<SupervisorDecision> {
    if (this.decisionFactory !== undefined) {
      return this.decisionFactory(input);
    }

    return {
      events: [
        {
          type: "observation",
          createdAt: new Date().toISOString(),
          summary: `stub wake handled for ${input.wake.kind}`,
        },
      ],
      actionRecords: [],
      followups: [],
      summary: "Stub supervisor completed without intervention.",
    };
  }
}

export const createWakeId = (): string => {
  return randomUUID();
};
