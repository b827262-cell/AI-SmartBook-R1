import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BookFile,
  ChapterPreviewApplyStatus,
  ChapterPreviewEntryType,
  ChapterPreviewRow,
  PdfJsonIndex,
  PdfJsonIndexLevel,
  StoredJsonIndexSummary
} from "@ai-smartbook/schema";
import { adminApi } from "../../api";

const ENTRY_TYPE_OPTIONS: ChapterPreviewEntryType[] = [
  "front_matter",
  "toc",
  "chapter",
  "appendix",
  "copyright",
  "back_matter",
  "group",
  "unknown"
];

const JSON_INDEX_LEVEL_OPTIONS: Array<{ value: PdfJsonIndexLevel; label: string }> = [
  { value: "page", label: "簡單：分頁數" },
  { value: "chapter", label: "進階：分章節" },
  { value: "clause", label: "複雜：分逗號" },
  { value: "line", label: "高階：分行" },
  { value: "sentence", label: "頂級：分句" }
];

type FileRowKind = "pdf_source" | "reference_image" | "misclassified_image" | "unsupported_source";

function isPdfFile(file: Pick<BookFile, "fileName" | "fileType">): boolean {
  return file.fileType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: Pick<BookFile, "fileName" | "fileType">): boolean {
  return /^image\//.test(file.fileType) || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.fileName);
}

function getFileRowKind(file: BookFile): FileRowKind {
  if (file.role === "reference_image") return "reference_image";
  if (isPdfFile(file)) return "pdf_source";
  if (isImageFile(file)) return "misclassified_image";
  return "unsupported_source";
}

function getApplyStatus(row: ChapterPreviewRow): ChapterPreviewApplyStatus {
  if (!row.enabled) return "disabled";
  if (row.pageStart == null || row.pageEnd == null) return "missing_page";
  if (row.pageEnd < row.pageStart) return "invalid_range";
  return "ready";
}

function withApplyStatus(row: ChapterPreviewRow): ChapterPreviewRow {
  return { ...row, applyStatus: getApplyStatus(row) };
}

function parseNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function FilesTab({ bookId }: { bookId: string }) {
  const [files, setFiles] = useState<BookFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [previewRows, setPreviewRows] = useState<ChapterPreviewRow[]>([]);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewPageCount, setPreviewPageCount] = useState(0);
  const [jsonLevels, setJsonLevels] = useState<Record<string, PdfJsonIndexLevel>>({});
  const [generatedIndex, setGeneratedIndex] = useState<PdfJsonIndex | null>(null);
  const [jsonIndexes, setJsonIndexes] = useState<StoredJsonIndexSummary[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const jsonUploadRef = useRef<HTMLInputElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const jsonResultRef = useRef<HTMLDivElement>(null);

  async function reload() {
    const [data, idx] = await Promise.all([
      adminApi.getBook(bookId),
      adminApi.listJsonIndexes(bookId)
    ]);
    setFiles(data.files);
    setJsonIndexes(idx.indexes);
  }

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [bookId]);

  const previewFile = previewFileId ? files.find((file) => file.id === previewFileId) ?? null : null;
  // The main table lists PDF sources / reference images; stored JSON indexes are
  // managed in their own "JSON Index / QA Reference" section below.
  const documentFiles = files.filter((file) => file.role !== "json_index");
  const generatedJsonText = useMemo(
    () => (generatedIndex ? JSON.stringify(generatedIndex, null, 2) : ""),
    [generatedIndex]
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUploadPdf() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      setError("Upload PDF accepts PDF files only.");
      setMsg("");
      return;
    }
    await run(async () => {
      await adminApi.uploadFile(bookId, file, { role: "source_document" });
      setMsg(`Uploaded PDF: ${file.name}`);
      if (inputRef.current) inputRef.current.value = "";
      await reload();
    });
  }

  async function onParseContent(fileId: string) {
    await run(async () => {
      const result = await adminApi.parseContent(bookId, fileId);
      setMsg(`Parsed ${result.parsed} content blocks from ${result.pageCount} PDF pages.`);
      await reload();
    });
  }

  async function onParseOutline(fileId: string) {
    await run(async () => {
      const result = await adminApi.parseOutlinePreview(bookId, fileId);
      setPreviewFileId(fileId);
      setPreviewPageCount(result.pageCount);
      setPreviewRows(result.rows.map(withApplyStatus));
      setMsg(
        result.rows.length > 0
          ? `Loaded outline preview with ${result.rows.length} rows from ${result.pageCount} PDF pages.`
          : "No embedded PDF outline was found. You can add rows manually before Apply."
      );
      await reload();
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    });
  }

  async function onGenerateJsonIndex(fileId: string) {
    const level = jsonLevels[fileId] ?? "page";
    await run(async () => {
      const result = await adminApi.generateJsonIndex(bookId, fileId, level);
      setGeneratedIndex(result.index);
      setMsg(
        `Generated ${result.index.level} JSON index with ${result.index.itemCount} items from ${result.index.pageCount} PDF pages.`
      );
      setTimeout(() => {
        jsonResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    });
  }

  async function onDelete(fileId: string, fileName: string) {
    if (!window.confirm(`Delete file "${fileName}"?`)) return;

    await run(async () => {
      await adminApi.deleteFile(bookId, fileId);
      setMsg(`Deleted file: ${fileName}`);
      if (previewFileId === fileId) {
        setPreviewFileId(null);
        setPreviewRows([]);
        setPreviewPageCount(0);
      }
      if (generatedIndex?.fileId === fileId) {
        setGeneratedIndex(null);
      }
      await reload();
    });
  }

  function onViewJsonResult(fileId: string) {
    if (generatedIndex?.fileId !== fileId) return;
    jsonResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onViewImageFile(fileId: string) {
    window.open(adminApi.getBookFileUrl(bookId, fileId), "_blank", "noopener,noreferrer");
  }

  function onDownloadJsonResult(fileId: string) {
    if (generatedIndex?.fileId !== fileId) return;
    const blob = new Blob([JSON.stringify(generatedIndex, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${generatedIndex.fileName.replace(/\.pdf$/i, "")}-${generatedIndex.level}-index.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ---- JSON index / QA reference management --------------------------------
  async function onSaveAsQaReference() {
    if (!generatedIndex) return;
    // Send only the level/source metadata; the server regenerates and stores the
    // index so a large item array is never uploaded (avoids 413 Payload Too Large).
    const { fileId, level } = generatedIndex;
    await run(async () => {
      const result = await adminApi.saveJsonIndex(bookId, fileId, level, true);
      setMsg(`Saved JSON index as active QA reference: ${result.index.fileName}`);
      await reload();
    });
  }

  async function onUploadJsonIndex() {
    const file = jsonUploadRef.current?.files?.[0];
    if (!file) return;
    await run(async () => {
      const result = await adminApi.uploadJsonIndex(bookId, file);
      setMsg(`Uploaded JSON index: ${result.index.fileName}`);
      if (jsonUploadRef.current) jsonUploadRef.current.value = "";
      await reload();
    });
  }

  async function onSetActiveJsonIndex(indexFileId: string) {
    await run(async () => {
      await adminApi.setActiveQaReference(bookId, indexFileId);
      setMsg("Active QA reference updated.");
      await reload();
    });
  }

  function onViewJsonIndex(indexFileId: string) {
    window.open(adminApi.getJsonIndexRawUrl(bookId, indexFileId), "_blank", "noopener,noreferrer");
  }

  function onDownloadJsonIndex(indexFileId: string, fileName: string) {
    const link = document.createElement("a");
    link.href = adminApi.getJsonIndexRawUrl(bookId, indexFileId);
    link.download = fileName;
    link.click();
  }

  async function onDeleteJsonIndex(indexFileId: string, fileName: string) {
    if (!window.confirm(`Delete JSON index "${fileName}"? The source PDF is not affected.`)) return;
    await run(async () => {
      await adminApi.deleteJsonIndex(bookId, indexFileId);
      setMsg(`Deleted JSON index: ${fileName}`);
      await reload();
    });
  }

  function updateRow(index: number, next: ChapterPreviewRow) {
    setPreviewRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? withApplyStatus(next) : row))
    );
  }

  function onAddRow() {
    setPreviewRows((current) => [
      ...current,
      withApplyStatus({
        id: `manual-${Date.now()}`,
        outlineLevel: 0,
        enabled: false,
        originalTitle: "",
        referenceTitle: null,
        suggestedTitle: "",
        printedPageLabel: null,
        printedPageStart: null,
        printedPageEnd: null,
        pageStart: null,
        pageEnd: null,
        entryType: "chapter",
        sortOrder: current.length + 1,
        adminNote: null
      })
    ]);
  }

  function onRemoveRow(index: number) {
    setPreviewRows((current) =>
      current
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => withApplyStatus({ ...row, sortOrder: rowIndex + 1 }))
    );
  }

  async function onApplyChapters() {
    if (!previewFileId) return;

    await run(async () => {
      const result = await adminApi.applyChapterPreview(bookId, previewFileId, previewRows);
      setMsg(
        `Applied ${result.applied} chapter rows, skipped ${result.skipped}, and linked ${result.linked} content blocks.`
      );
      await reload();
    });
  }

  function statusText(status: ChapterPreviewApplyStatus | undefined): string {
    switch (status) {
      case "ready":
        return "Ready";
      case "disabled":
        return "Disabled";
      case "missing_page":
        return "Missing page";
      case "invalid_range":
        return "Invalid range";
      default:
        return "Pending";
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Upload PDF</h3>
        <div className="row">
          <input ref={inputRef} type="file" accept="application/pdf" style={{ maxWidth: 360 }} />
          <button className="btn" onClick={() => void onUploadPdf()} disabled={busy}>
            Upload
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Files</h3>
        {documentFiles.length === 0 ? (
          <p className="muted">No files uploaded yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Related PDF</th>
                  <th>Size</th>
                  <th>Parse status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentFiles.map((file) => {
                  const rowKind = getFileRowKind(file);
                  const relatedPdf =
                    file.relatedFileId != null
                      ? files.find((candidate) => candidate.id === file.relatedFileId) ?? null
                      : null;
                  const isPdfRow = rowKind === "pdf_source";
                  const isReferenceImageRow = rowKind === "reference_image";
                  const isMisclassifiedImageRow = rowKind === "misclassified_image";
                  const contentActionLabel = file.parseStatus === "parsed" ? "Re-parse Content" : "Parse Content";
                  const outlineActionLabel = file.parseStatus === "parsed" ? "Re-parse Outline" : "Parse Outline";
                  const selectedJsonLevel = jsonLevels[file.id] ?? "page";
                  const hasGeneratedJson = generatedIndex?.fileId === file.id;

                  return (
                    <tr key={file.id}>
                      <td>
                        <div>{file.fileName}</div>
                        {isMisclassifiedImageRow ? (
                          <div className="error" style={{ marginTop: 6 }}>
                            Image file is not a valid PDF parsing source on this page.
                          </div>
                        ) : null}
                        {isReferenceImageRow ? (
                          <div className="muted" style={{ marginTop: 6 }}>
                            Legacy reference image row. Upload is removed from this page.
                          </div>
                        ) : null}
                        {rowKind === "unsupported_source" ? (
                          <div className="error" style={{ marginTop: 6 }}>
                            Unsupported source file type. Only PDF source files are parseable here.
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {isPdfRow
                          ? "PDF source"
                          : isReferenceImageRow
                            ? "Reference image"
                            : isMisclassifiedImageRow
                              ? "Misclassified image"
                              : "Unsupported source"}
                      </td>
                      <td>{relatedPdf?.fileName ?? "—"}</td>
                      <td>{(file.fileSize / 1024).toFixed(1)} KB</td>
                      <td>
                        {isPdfRow ? (
                          <span className={`badge ${file.parseStatus}`}>{file.parseStatus}</span>
                        ) : (
                          <span className="muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          {isPdfRow ? (
                            <>
                              <button
                                className="btn secondary"
                                onClick={() => void onParseContent(file.id)}
                                disabled={busy}
                              >
                                {contentActionLabel}
                              </button>
                              <button
                                className="btn secondary"
                                onClick={() => void onParseOutline(file.id)}
                                disabled={busy}
                              >
                                {outlineActionLabel}
                              </button>
                              <button
                                className="btn secondary"
                                onClick={() => void onGenerateJsonIndex(file.id)}
                                disabled={busy}
                              >
                                Generate JSON Index
                              </button>
                              <select
                                value={selectedJsonLevel}
                                onChange={(e) =>
                                  setJsonLevels((current) => ({
                                    ...current,
                                    [file.id]: e.target.value as PdfJsonIndexLevel
                                  }))
                                }
                                disabled={busy}
                                style={{ width: 180 }}
                              >
                                {JSON_INDEX_LEVEL_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn secondary"
                                onClick={() => onViewJsonResult(file.id)}
                                disabled={busy || !hasGeneratedJson}
                              >
                                View JSON
                              </button>
                              <button
                                className="btn secondary"
                                onClick={() => onDownloadJsonResult(file.id)}
                                disabled={busy || !hasGeneratedJson}
                              >
                                Download JSON
                              </button>
                            </>
                          ) : null}
                          {isReferenceImageRow ? (
                            <button
                              className="btn secondary"
                              onClick={() => onViewImageFile(file.id)}
                              disabled={busy}
                            >
                              View
                            </button>
                          ) : null}
                          {isMisclassifiedImageRow ? (
                            <button
                              className="btn secondary"
                              onClick={() => onViewImageFile(file.id)}
                              disabled={busy}
                            >
                              View
                            </button>
                          ) : null}
                          <button
                            className="btn secondary"
                            onClick={() => void onDelete(file.id, file.fileName)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewFileId ? (
        <div className="card" ref={previewSectionRef}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>Preview Chapters</h3>
              <p className="muted" style={{ margin: 0 }}>
                File: <strong>{previewFile?.fileName ?? previewFileId}</strong> · Physical PDF pages:{" "}
                <strong>{previewPageCount}</strong> · Preview rows: <strong>{previewRows.length}</strong>
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn secondary" onClick={onAddRow} disabled={busy}>
                Add Row
              </button>
              <button className="btn" onClick={() => void onApplyChapters()} disabled={busy}>
                Apply Chapters
              </button>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 12 }}>
            Physical PDF page numbers remain the canonical `pageStart` and `pageEnd`. Printed labels
            are display metadata only.
          </p>

          <div className="files-preview-table">
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Enabled</th>
                    <th>Original PDF Outline Title</th>
                    <th>Suggested Chapter Title</th>
                    <th>Printed Label / Range</th>
                    <th>PDF Start</th>
                    <th>PDF End</th>
                    <th>Entry Type</th>
                    <th>Sort</th>
                    <th>Admin Note</th>
                    <th>Apply Status</th>
                    <th>Row</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={row.id ?? `${row.originalTitle}-${index}`}>
                      <td>
                        <input
                          type="checkbox"
                          style={{ width: "auto" }}
                          checked={row.enabled}
                          onChange={(e) => updateRow(index, { ...row, enabled: e.target.checked })}
                        />
                      </td>
                      <td>
                        <div style={{ paddingLeft: `${Math.min(row.outlineLevel, 4) * 12}px` }}>
                          {row.originalTitle || <span className="muted">Manual row</span>}
                        </div>
                      </td>
                      <td>
                        <input
                          value={row.suggestedTitle}
                          onChange={(e) =>
                            updateRow(index, { ...row, suggestedTitle: e.target.value })
                          }
                          placeholder="Chapter title"
                        />
                      </td>
                      <td>
                        <input
                          value={row.printedPageLabel ?? ""}
                          onChange={(e) =>
                            updateRow(index, { ...row, printedPageLabel: e.target.value || null })
                          }
                          placeholder="Printed page label"
                        />
                      </td>
                      <td>
                        <input
                          value={row.pageStart ?? ""}
                          onChange={(e) =>
                            updateRow(index, { ...row, pageStart: parseNullableInt(e.target.value) })
                          }
                          placeholder="10"
                        />
                      </td>
                      <td>
                        <input
                          value={row.pageEnd ?? ""}
                          onChange={(e) =>
                            updateRow(index, { ...row, pageEnd: parseNullableInt(e.target.value) })
                          }
                          placeholder="47"
                        />
                      </td>
                      <td>
                        <select
                          value={row.entryType}
                          onChange={(e) =>
                            updateRow(index, {
                              ...row,
                              entryType: e.target.value as ChapterPreviewEntryType
                            })
                          }
                        >
                          {ENTRY_TYPE_OPTIONS.map((entryType) => (
                            <option key={entryType} value={entryType}>
                              {entryType}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={row.sortOrder}
                          onChange={(e) =>
                            updateRow(index, {
                              ...row,
                              sortOrder: parseNullableInt(e.target.value) ?? row.sortOrder
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={row.adminNote ?? ""}
                          onChange={(e) =>
                            updateRow(index, { ...row, adminNote: e.target.value || null })
                          }
                          placeholder="Optional note"
                        />
                      </td>
                      <td>
                        <span className={`badge ${row.applyStatus === "ready" ? "parsed" : "draft"}`}>
                          {statusText(row.applyStatus)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="admin-link-btn"
                          onClick={() => onRemoveRow(index)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {generatedIndex ? (
        <div className="card" ref={jsonResultRef}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>JSON Index Result</h3>
              <p className="muted" style={{ margin: 0 }}>
                File: <strong>{generatedIndex.fileName}</strong> · Level:{" "}
                <strong>
                  {generatedIndex.level} / {generatedIndex.levelLabel}
                </strong>{" "}
                · Pages: <strong>{generatedIndex.pageCount}</strong> · Items:{" "}
                <strong>{generatedIndex.itemCount}</strong>
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={() => void onSaveAsQaReference()} disabled={busy}>
                Save as QA Reference
              </button>
              <button
                className="btn secondary"
                onClick={() => onDownloadJsonResult(generatedIndex.fileId)}
                disabled={busy}
              >
                Download JSON
              </button>
            </div>
          </div>

          {generatedIndex.notes?.length ? (
            <div style={{ marginTop: 12 }}>
              {generatedIndex.notes.map((note) => (
                <p key={note} className="muted" style={{ margin: "4px 0" }}>
                  {note}
                </p>
              ))}
            </div>
          ) : null}

          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>View JSON</summary>
            <pre className="files-json-preview">{generatedJsonText}</pre>
          </details>
        </div>
      ) : null}

      <div className="card">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>JSON Index / QA Reference</h3>
            <p className="muted" style={{ margin: 0 }}>
              Stored JSON indexes persist across refreshes. The active one is used as the Knowledge QA
              structured reference; with none active, QA falls back to content-based search.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input
              ref={jsonUploadRef}
              type="file"
              accept="application/json,.json"
              style={{ maxWidth: 280 }}
            />
            <button className="btn secondary" onClick={() => void onUploadJsonIndex()} disabled={busy}>
              Upload JSON
            </button>
          </div>
        </div>

        {jsonIndexes.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            No stored JSON index yet. Generate an index above and click “Save as QA Reference”, or
            upload a JSON index file.
          </p>
        ) : (
          <div className="admin-table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>File name</th>
                  <th>Level / Label</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>QA Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jsonIndexes.map((idx) => (
                  <tr key={idx.fileId}>
                    <td>
                      <div>{idx.fileName}</div>
                      {!idx.valid ? (
                        <span className="badge failed">invalid / unreadable</span>
                      ) : null}
                    </td>
                    <td>
                      {idx.level ?? "—"}
                      {idx.levelLabel ? ` / ${idx.levelLabel}` : ""}
                    </td>
                    <td>{idx.itemCount ?? "—"}</td>
                    <td className="muted">{new Date(idx.createdAt).toLocaleString("zh-Hant")}</td>
                    <td>
                      {idx.isActive ? (
                        <span className="badge parsed">Active QA Reference</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn secondary"
                          onClick={() => void onSetActiveJsonIndex(idx.fileId)}
                          disabled={busy || idx.isActive || !idx.valid}
                        >
                          Set as QA Reference
                        </button>
                        <button className="btn secondary" onClick={() => onViewJsonIndex(idx.fileId)}>
                          View JSON
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => onDownloadJsonIndex(idx.fileId, idx.fileName)}
                        >
                          Download JSON
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => void onDeleteJsonIndex(idx.fileId, idx.fileName)}
                          disabled={busy}
                        >
                          Delete JSON
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
