import { createDbHandle, resolveDbPath } from "./client";
import { runMigrations } from "./migrate";
import { createRepositories } from "./repositories";

/**
 * Seed a demo published book with one chapter and three content rows.
 * Safe to re-run: it is a no-op if a seeded demo book already exists.
 */
export function runSeed(dbPath = resolveDbPath()): void {
  const { db, sqlite } = createDbHandle(dbPath);
  runMigrations(sqlite);
  const repos = createRepositories(db);

  const existing = repos.books.findAll();
  if (existing.some((b) => b.title === "智能書本範例：學習導論")) {
    console.log("[db] seed skipped: demo book already exists");
    sqlite.close();
    return;
  }

  const book = repos.books.create({
    title: "智能書本範例：學習導論",
    subtitle: "AI SmartBook Demo",
    description: "這是一本由 seed 產生的範例智能書本，用於驗證前後台流程。",
    status: "published"
  });

  const chapter = repos.chapters.create({
    bookId: book.id,
    title: "第一章 智能書本概論",
    summary: "介紹智能書本的概念、組成與學習方式。",
    orderIndex: 0,
    pageStart: 1,
    pageEnd: 3,
    status: "published"
  });

  repos.contents.createMany([
    {
      bookId: book.id,
      chapterId: chapter.id,
      pageNumber: 1,
      orderIndex: 0,
      contentText:
        "智能書本是一種結合文字內容與 AI 問答的數位學習教材。讀者可以閱讀章節，也可以直接向書本提問。"
    },
    {
      bookId: book.id,
      chapterId: chapter.id,
      pageNumber: 2,
      orderIndex: 1,
      contentText:
        "本系統將 PDF 解析為段落內容，透過 AI 拆書建立章節，並提供以書本內容為基礎的知識問答。"
    },
    {
      bookId: book.id,
      chapterId: chapter.id,
      pageNumber: 3,
      orderIndex: 2,
      contentText:
        "在 1GB 部署模式下，前台使用 SQLite 與關鍵字檢索回答問題，不需要連線到外部 AI 服務。"
    }
  ]);

  console.log(`[db] seed complete: book=${book.id} chapter=${chapter.id}`);
  sqlite.close();
}

const invokedDirectly = process.argv[1]?.includes("seed");
if (invokedDirectly) {
  try {
    runSeed();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
