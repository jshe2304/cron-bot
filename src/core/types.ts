export type WakeReason =
  | {
      kind: "heartbeat";
    }
  | {
      kind: "delayed_followup";
      followupId: string;
    }
  | {
      kind: "user_message";
      messageId: string;
    }
  | {
      kind: "job_state_change";
      jobId: string;
    }
  | {
      kind: "validation_complete";
      validationRunId: string;
    }
  | {
      kind: "wake_retry";
      failedWakeId: string;
    };

export type ApprovalMode =
  | "observe_only"
  | "ask_before_edit"
  | "ask_before_resubmit"
  | "bounded_auto";

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export type JobRecord = {
  id: string;
  schedulerId?: string;
  name: string;
  status: JobStatus;
  scriptPath?: string;
  workdir?: string;
  lastObservedAt: string;
};

export type FollowupRecord = {
  id: string;
  reason: string;
  notBefore: string;
  contextRef?: string;
};

export type CampaignViewWindow = {
  recentIncidentLimit: number;
  recentSummaryLimit: number;
  recentObservationLimit?: number;
};

export type IncidentRecord = {
  id: string;
  summary: string;
  status: "open" | "resolved" | "escalated";
  createdAt: string;
  updatedAt: string;
};

export type SummaryRecord = {
  id: string;
  kind: "progress" | "incident" | "completion";
  body: string;
  createdAt: string;
};

export type CampaignState = {
  campaignId: string;
  goal: string;
  approvalMode: ApprovalMode;
  viewWindow: CampaignViewWindow;
  activeJobs: JobRecord[];
  pendingFollowups: FollowupRecord[];
  recentIncidents: IncidentRecord[];
  recentSummaries: SummaryRecord[];
};

export type ObservationEvent = {
  type: "observation";
  summary: string;
  createdAt: string;
  jobId?: string;
  logPath?: string;
};

export type AssessmentEvent = {
  type: "assessment";
  summary: string;
  createdAt: string;
  outcome: "healthy" | "watch" | "incident";
};

export type IncidentEvent = {
  type: "incident";
  incidentId: string;
  summary: string;
  createdAt: string;
};

export type RepairProposalEvent = {
  type: "repair_proposal";
  summary: string;
  createdAt: string;
};

export type RepairAppliedEvent = {
  type: "repair_applied";
  summary: string;
  createdAt: string;
  changedPaths: string[];
  commitRef?: string;
};

export type ValidationResultEvent = {
  type: "validation_result";
  validationRunId: string;
  createdAt: string;
  status: "passed" | "failed" | "skipped";
  summary: string;
  reason?: string;
};

export type ApprovalRequestedEvent = {
  type: "approval_requested";
  createdAt: string;
  actionSummary: string;
};

export type ApprovalResolvedEvent = {
  type: "approval_resolved";
  createdAt: string;
  outcome: "approved" | "rejected";
  actionSummary: string;
};

export type ClarificationRequestedEvent = {
  type: "clarification_requested";
  createdAt: string;
  question: string;
  blockingReason: string;
};

export type JobSubmittedEvent = {
  type: "job_submitted";
  createdAt: string;
  jobId: string;
};

export type JobResubmittedEvent = {
  type: "job_resubmitted";
  createdAt: string;
  jobId: string;
};

export type SummaryPostedEvent = {
  type: "summary_posted";
  createdAt: string;
  summaryId: string;
};

export type WakeDegradedEvent = {
  type: "wake_degraded";
  createdAt: string;
  reason: string;
  fallbackMode: ApprovalMode;
};

export type WakeLifecycleEvent = {
  type: "wake_lifecycle";
  createdAt: string;
  wakeId: string;
  phase: "start" | "end";
  wakeReason: WakeReason;
  summary?: string;
};

export type CampaignEvent =
  | ObservationEvent
  | AssessmentEvent
  | IncidentEvent
  | RepairProposalEvent
  | RepairAppliedEvent
  | ValidationResultEvent
  | ApprovalRequestedEvent
  | ApprovalResolvedEvent
  | ClarificationRequestedEvent
  | JobSubmittedEvent
  | JobResubmittedEvent
  | SummaryPostedEvent
  | WakeDegradedEvent
  | WakeLifecycleEvent;

export type InspectLogTailRecord = {
  kind: "inspect_log_tail";
  summary: string;
  logPath: string;
  jobId?: string;
  lines?: number;
};

export type QueryJobRecord = {
  kind: "query_job";
  summary: string;
  jobId: string;
};

export type PatchFileRecord = {
  kind: "patch_file";
  path: string;
  summary: string;
};

export type RunValidationRecord = {
  kind: "run_validation";
  summary: string;
};

export type RequestApprovalRecord = {
  kind: "request_approval";
  summary: string;
};

export type ResubmitJobRecord = {
  kind: "resubmit_job";
  jobId: string;
  reason: string;
};

export type PostSlackSummaryRecord = {
  kind: "post_slack_summary";
  summary: string;
};

export type ToolCallRecord = {
  kind: "pi_tool_call";
  toolName: string;
  summary: string;
  startedAt: string;
  finishedAt?: string;
  outcome?: "succeeded" | "failed" | "blocked";
};

export type ActionRecord =
  | InspectLogTailRecord
  | QueryJobRecord
  | PatchFileRecord
  | RunValidationRecord
  | RequestApprovalRecord
  | ResubmitJobRecord
  | PostSlackSummaryRecord
  | ToolCallRecord;

export type RiskyActionKind =
  | "edit_files"
  | "cancel_job"
  | "resubmit_job"
  | "destructive_command";

export type PolicyDecision =
  | {
      outcome: "allow";
      reason: string;
    }
  | {
      outcome: "approval_required";
      reason: string;
      approvalScope: RiskyActionKind;
    }
  | {
      outcome: "deny";
      reason: string;
      escalationHint?: string;
    };

export type PolicyInput = {
  approvalMode: ApprovalMode;
  action: RiskyActionKind;
  summary: string;
};

export interface PolicyEngine {
  evaluate(input: PolicyInput): PolicyDecision;
}

export type SupervisorInput = {
  wake: WakeReason;
  campaign: CampaignState;
};

export type SupervisorDecision = {
  events: CampaignEvent[];
  actionRecords: ActionRecord[];
  followups: FollowupRecord[];
  summary?: string;
};

export type SupervisorWakeStart = {
  wakeId: string;
  reason: WakeReason;
  startedAt: string;
};

export type SupervisorWakeEnd = {
  wakeId: string;
  endedAt: string;
  summary?: string;
};

export interface Supervisor {
  run(input: SupervisorInput): Promise<SupervisorDecision>;
}

export interface EventLogStore {
  append(events: CampaignEvent[]): Promise<void>;
  list(campaignId: string, limit?: number): Promise<CampaignEvent[]>;
}

export interface CampaignProfileStore {
  load(campaignId: string): Promise<CampaignState | null>;
  save(state: CampaignState): Promise<void>;
}

export interface TrajectoryRecord {
  incidentId: string;
  inputsConsidered: string[];
  observations: string[];
  reasoningSummary: string;
  commandsRun: string[];
  diffsApplied: string[];
  validationResults: string[];
  approvalOutcomes: string[];
  schedulerActions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrajectoryStore {
  save(record: TrajectoryRecord): Promise<void>;
  getByIncidentId(incidentId: string): Promise<TrajectoryRecord | null>;
}

export interface FollowupStore {
  listDue(nowIso: string): Promise<FollowupRecord[]>;
  upsert(record: FollowupRecord): Promise<void>;
  remove(followupId: string): Promise<void>;
}

export interface MemoryStore {
  events: EventLogStore;
  profile: CampaignProfileStore;
  followups: FollowupStore;
  trajectories: TrajectoryStore;
}

export type SchedulerWake = {
  wakeId: string;
  reason: WakeReason;
  scheduledAt: string;
};

export interface Scheduler {
  start(): Promise<void>;
  stop(): Promise<void>;
  scheduleFollowup(record: FollowupRecord): Promise<void>;
}
