import { readFileSync, writeFileSync } from "node:fs";
import { exportStudentSync, importStudentSync } from "./index";

/**
 * Minimal CLI used by deploy/scripts/sync-student-db.sh.
 *
 *   tsx src/cli.ts export <adminDb> <out.json>
 *   tsx src/cli.ts import <studentDb> <in.json>
 */
function main() {
  const [cmd, a, b] = process.argv.slice(2);

  if (cmd === "export") {
    if (!a || !b) throw new Error("usage: export <adminDb> <out.json>");
    const pkg = exportStudentSync(a);
    writeFileSync(b, JSON.stringify(pkg, null, 2), "utf8");
    console.log(`[sync] exported ${pkg.books.length} books to ${b}`);
    return;
  }

  if (cmd === "import") {
    if (!a || !b) throw new Error("usage: import <studentDb> <in.json>");
    const raw = JSON.parse(readFileSync(b, "utf8"));
    importStudentSync(a, raw);
    console.log(`[sync] imported sync package into ${a}`);
    return;
  }

  throw new Error("usage: tsx src/cli.ts <export|import> ...");
}

main();
