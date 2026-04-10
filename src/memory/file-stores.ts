import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  CampaignProfileStore,
  CampaignState,
  FollowupRecord,
  FollowupStore,
  TrajectoryRecord,
  TrajectoryStore,
} from "../core/types.js";

type JsonStoreOptions = {
  campaignId: string;
  rootDir: string;
};

const PROFILE_FILE_NAME = "profile.json";
const FOLLOWUPS_FILE_NAME = "followups.json";
const TRAJECTORIES_FILE_NAME = "trajectories.json";

export class FileCampaignProfileStore implements CampaignProfileStore {
  private readonly campaignId: string;
  private readonly profilePath: string;

  constructor(options: JsonStoreOptions) {
    this.campaignId = options.campaignId;
    this.profilePath = join(options.rootDir, options.campaignId, PROFILE_FILE_NAME);
  }

  async load(campaignId: string): Promise<CampaignState | null> {
    if (campaignId !== this.campaignId) {
      return null;
    }

    return this.readJsonOrNull<CampaignState>(this.profilePath);
  }

  async save(state: CampaignState): Promise<void> {
    if (state.campaignId !== this.campaignId) {
      throw new Error(`campaign id mismatch: expected ${this.campaignId}, got ${state.campaignId}`);
    }

    await this.writeJson(this.profilePath, state);
  }

  private async readJsonOrNull<T>(path: string): Promise<T | null> {
    try {
      const content = await readFile(path, "utf8");
      return JSON.parse(content) as T;
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2), "utf8");
  }
}

export class FileFollowupStore implements FollowupStore {
  private readonly followupsPath: string;

  constructor(options: JsonStoreOptions) {
    this.followupsPath = join(options.rootDir, options.campaignId, FOLLOWUPS_FILE_NAME);
  }

  async listDue(nowIso: string): Promise<FollowupRecord[]> {
    const records = await this.readAll();

    return records
      .filter((record) => record.notBefore <= nowIso)
      .sort((left, right) => left.notBefore.localeCompare(right.notBefore));
  }

  async upsert(record: FollowupRecord): Promise<void> {
    const records = await this.readAll();
    const filtered = records.filter((existingRecord) => existingRecord.id !== record.id);
    filtered.push(record);
    await this.writeAll(filtered);
  }

  async remove(followupId: string): Promise<void> {
    const records = await this.readAll();
    const filtered = records.filter((record) => record.id !== followupId);

    if (filtered.length === 0) {
      await this.removeFileIfPresent(this.followupsPath);
      return;
    }

    await this.writeAll(filtered);
  }

  private async readAll(): Promise<FollowupRecord[]> {
    try {
      const content = await readFile(this.followupsPath, "utf8");
      const parsed = JSON.parse(content) as FollowupRecord[];
      return parsed;
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  private async writeAll(records: FollowupRecord[]): Promise<void> {
    await mkdir(dirname(this.followupsPath), { recursive: true });
    await writeFile(this.followupsPath, JSON.stringify(records, null, 2), "utf8");
  }

  private async removeFileIfPresent(path: string): Promise<void> {
    try {
      await rm(path);
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export class FileTrajectoryStore implements TrajectoryStore {
  private readonly trajectoriesPath: string;

  constructor(options: JsonStoreOptions) {
    this.trajectoriesPath = join(options.rootDir, options.campaignId, TRAJECTORIES_FILE_NAME);
  }

  async save(record: TrajectoryRecord): Promise<void> {
    const records = await this.readAll();
    const filtered = records.filter((existingRecord) => existingRecord.incidentId !== record.incidentId);
    filtered.push(record);
    await this.writeAll(filtered);
  }

  async getByIncidentId(incidentId: string): Promise<TrajectoryRecord | null> {
    const records = await this.readAll();
    const match = records.find((record) => record.incidentId === incidentId);
    return match ?? null;
  }

  private async readAll(): Promise<TrajectoryRecord[]> {
    try {
      const content = await readFile(this.trajectoriesPath, "utf8");
      const parsed = JSON.parse(content) as TrajectoryRecord[];
      return parsed;
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  private async writeAll(records: TrajectoryRecord[]): Promise<void> {
    await mkdir(dirname(this.trajectoriesPath), { recursive: true });
    await writeFile(this.trajectoriesPath, JSON.stringify(records, null, 2), "utf8");
  }
}
