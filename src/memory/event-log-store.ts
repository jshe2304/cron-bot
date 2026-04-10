import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { CampaignEvent, EventLogStore } from "../core/types.js";

const DEFAULT_LOG_FILE_NAME = "events.jsonl";

export class FileEventLogStore implements EventLogStore {
  private readonly campaignId: string;
  private readonly logFilePath: string;

  constructor(options: { campaignId: string; rootDir: string; logFileName?: string }) {
    this.campaignId = options.campaignId;
    const logFileName = options.logFileName ?? DEFAULT_LOG_FILE_NAME;
    this.logFilePath = join(options.rootDir, options.campaignId, logFileName);
  }

  async append(events: CampaignEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const serialized = events.map((event) => JSON.stringify(event)).join("\n");
    const payload = `${serialized}\n`;

    await mkdir(dirname(this.logFilePath), { recursive: true });
    await appendFile(this.logFilePath, payload, "utf8");
  }

  async list(campaignId: string, limit?: number): Promise<CampaignEvent[]> {
    if (campaignId !== this.campaignId) {
      return [];
    }

    const content = await this.readLogFileOrEmpty();
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const events = lines.map((line) => JSON.parse(line) as CampaignEvent);

    if (limit === undefined) {
      return events;
    }

    if (limit <= 0) {
      return [];
    }

    return events.slice(-limit);
  }

  private async readLogFileOrEmpty(): Promise<string> {
    try {
      return await readFile(this.logFilePath, "utf8");
    } catch (error) {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno.code === "ENOENT") {
        return "";
      }

      throw error;
    }
  }
}
