import type { Db } from "../client";
import { makeBookRepo } from "./book.repo";
import { makeBookFileRepo } from "./bookFile.repo";
import { makeBookContentRepo } from "./bookContent.repo";
import { makeChapterRepo } from "./chapter.repo";
import { makeChatRepo } from "./chat.repo";
import { makeAiJobRepo } from "./aiJob.repo";
import { makeQaLogRepo } from "./qaLog.repo";
import { makeSettingsRepo } from "./settings.repo";

export * from "./book.repo";
export * from "./bookFile.repo";
export * from "./bookContent.repo";
export * from "./chapter.repo";
export * from "./chat.repo";
export * from "./aiJob.repo";
export * from "./qaLog.repo";
export * from "./settings.repo";

export interface Repositories {
  books: ReturnType<typeof makeBookRepo>;
  files: ReturnType<typeof makeBookFileRepo>;
  contents: ReturnType<typeof makeBookContentRepo>;
  chapters: ReturnType<typeof makeChapterRepo>;
  chat: ReturnType<typeof makeChatRepo>;
  aiJobs: ReturnType<typeof makeAiJobRepo>;
  qaLogs: ReturnType<typeof makeQaLogRepo>;
  settings: ReturnType<typeof makeSettingsRepo>;
}

/** Build all repositories bound to a single Db handle. */
export function createRepositories(db: Db): Repositories {
  return {
    books: makeBookRepo(db),
    files: makeBookFileRepo(db),
    contents: makeBookContentRepo(db),
    chapters: makeChapterRepo(db),
    chat: makeChatRepo(db),
    aiJobs: makeAiJobRepo(db),
    qaLogs: makeQaLogRepo(db),
    settings: makeSettingsRepo(db)
  };
}
