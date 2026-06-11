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

  // Library demo fixture: enough published books to exercise the category
  // grouping UX (中級會計學 => 5 本, 刑法 => 3 本). Idempotent by title so the
  // seed is safe to re-run. coverUrl is intentionally null for some books to
  // exercise the front-end fallback cover.
  const libraryFixture: Array<{ title: string; category: string; coverUrl: string | null }> = [
    ...Array.from({ length: 5 }, (_, i) => ({
      title: `中級會計學（第 ${i + 1} 冊）`,
      category: "中級會計學",
      coverUrl: i % 2 === 0 ? `https://picsum.photos/seed/acct-${i + 1}/240/320` : null
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      title: `刑法（第 ${i + 1} 冊）`,
      category: "刑法",
      coverUrl: i === 0 ? `https://picsum.photos/seed/crim-${i + 1}/240/320` : null
    }))
  ];

  const existingTitles = new Set(repos.books.findAll().map((b) => b.title));
  let createdFixture = 0;
  for (const item of libraryFixture) {
    if (existingTitles.has(item.title)) continue;
    repos.books.create({
      title: item.title,
      subtitle: item.category,
      description: `${item.category} 範例教材，用於前台類科統計與封面 fallback 測試。`,
      category: item.category,
      coverUrl: item.coverUrl,
      status: "published"
    });
    createdFixture += 1;
  }
  if (createdFixture > 0) {
    console.log(`[db] seed: created ${createdFixture} library fixture books`);
  }

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
