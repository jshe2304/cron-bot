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
};

export type ValidationResultEvent = {
  type: "validation_result";
  validationRunId: string;
  createdAt: string;
  status: "passed" | "failed" | "skipped";
  summary: string;
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

export type CampaignEvent =
  | ObservationEvent
  | AssessmentEvent
  | IncidentEvent
  | RepairProposalEvent
  | RepairAppliedEvent
  | ValidationResultEvent
  | ApprovalRequestedEvent
  | ApprovalResolvedEvent
  | JobSubmittedEvent
  | JobResubmittedEvent
  | SummaryPostedEvent;

export type InspectLogTailAction = {
  kind: "inspect_log_tail";
  logPath: string;
  lines?: number;
};

export type QueryJobAction = {
  kind: "query_job";
  jobId: string;
};

export type PatchFileAction = {
  kind: "patch_file";
  path: string;
  summary: string;
};

export type RunValidationAction = {
  kind: "run_validation";
  summary: string;
};

export type RequestApprovalAction = {
  kind: "request_approval";
  summary: string;
};

export type ResubmitJobAction = {
  kind: "resubmit_job";
  jobId: string;
  reason: string;
};

export type PostSlackSummaryAction = {
  kind: "post_slack_summary";
  summary: string;
};

export type PlannedAction =
  | InspectLogTailAction
  | QueryJobAction
  | PatchFileAction
  | RunValidationAction
  | RequestApprovalAction
  | ResubmitJobAction
  | PostSlackSummaryAction;

export type SupervisorInput = {
  wake: WakeReason;
  campaign: CampaignState;
};

export type SupervisorDecision = {
  observations: ObservationEvent[];
  actions: PlannedAction[];
  followups: FollowupRecord[];
  summary?: string;
};
