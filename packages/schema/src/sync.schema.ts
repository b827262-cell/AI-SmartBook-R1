import { z } from "zod";
import { bookSchema } from "./book.schema";
import { bookChapterSchema } from "./chapter.schema";
import { bookContentSchema } from "./bookContent.schema";

export const SYNC_SCHEMA_VERSION = 1;

export const syncPackageSchema = z.object({
  version: z.string(),
  schemaVersion: z.number(),
  exportedAt: z.string(),
  books: z.array(bookSchema),
  chapters: z.array(bookChapterSchema),
  contents: z.array(bookContentSchema)
});
export type SyncPackage = z.infer<typeof syncPackageSchema>;
