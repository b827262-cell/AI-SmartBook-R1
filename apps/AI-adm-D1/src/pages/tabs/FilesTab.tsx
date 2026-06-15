import { useEffect, useRef, useState } from "react";
import type {
  BookFile,
  ChapterPreviewApplyStatus,
  ChapterPreviewEntryType,
  ChapterPreviewRow
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
  const [referenceTargetFileId, setReferenceTargetFileId] = useState<string | null>(null);
  const [selectedReferenceImageId, setSelectedReferenceImageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  async function reload() {
    const data = await adminApi.getBook(bookId);
    setFiles(data.files);
  }

  useEffect(() => {
    void reload().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [bookId]);

  const pdfFiles = files.filter((file) => file.role !== "reference_image");
  const referenceImages = files.filter((file) => file.role === "reference_image");
  const previewFile = previewFileId ? files.find((file) => file.id === previewFileId) ?? null : null;
  const previewReferenceImages = previewFileId
    ? referenceImages.filter((file) => file.relatedFileId === previewFileId)
    : [];
  const selectedReferenceImage =
    previewReferenceImages.find((file) => file.id === selectedReferenceImageId) ??
    previewReferenceImages[0] ??
    null;

  useEffect(() => {
    if (!previewFileId) return;
    if (previewReferenceImages.length === 0) {
      if (selectedReferenceImageId != null) setSelectedReferenceImageId(null);
      return;
    }
    if (!selectedReferenceImage || selectedReferenceImage.relatedFileId !== previewFileId) {
      setSelectedReferenceImageId(previewReferenceImages[0]?.id ?? null);
    }
  }, [previewFileId, previewReferenceImages, selectedReferenceImage, selectedReferenceImageId]);

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
    await run(async () => {
      await adminApi.uploadFile(bookId, file, { role: "source_document" });
      setMsg(`Uploaded PDF: ${file.name}`);
      if (inputRef.current) inputRef.current.value = "";
      await reload();
    });
  }

  function openReferenceUpload(fileId: string) {
    setReferenceTargetFileId(fileId);
    referenceInputRef.current?.click();
  }

  async function onReferenceUploadChange() {
    const file = referenceInputRef.current?.files?.[0];
    const targetFileId = referenceTargetFileId;
    if (!file || !targetFileId) return;
    await run(async () => {
      await adminApi.uploadFile(bookId, file, {
        role: "reference_image",
        relatedFileId: targetFileId
      });
      setMsg(`Uploaded reference image: ${file.name}`);
      if (referenceInputRef.current) referenceInputRef.current.value = "";
      setReferenceTargetFileId(null);
      await reload();
      if (previewFileId === targetFileId) {
        setSelectedReferenceImageId(null);
      }
    });
  }

  async function onParseOutline(fileId: string) {
    await run(async () => {
      const result = await adminApi.parseOutlinePreview(bookId, fileId);
      setPreviewFileId(fileId);
      setPreviewPageCount(result.pageCount);
      setPreviewRows(result.rows.map(withApplyStatus));
      setSelectedReferenceImageId(null);
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

  async function onDelete(fileId: string, fileName: string) {
    if (!window.confirm(`Delete file "${fileName}"?`)) return;

    await run(async () => {
      await adminApi.deleteFile(bookId, fileId);
      setMsg(`Deleted file: ${fileName}`);
      if (previewFileId === fileId) {
        setPreviewFileId(null);
        setPreviewRows([]);
        setPreviewPageCount(0);
        setSelectedReferenceImageId(null);
      }
      await reload();
    });
  }

  function onViewReferenceImage(fileId: string) {
    const firstReference = referenceImages.find((file) => file.relatedFileId === fileId);
    if (!firstReference) return;
    window.open(adminApi.getBookFileUrl(bookId, firstReference.id), "_blank", "noopener,noreferrer");
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
        <input
          ref={referenceInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={() => void onReferenceUploadChange()}
        />
        {msg && <p className="muted">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Files</h3>
        {files.length === 0 ? (
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
                {files.map((file) => {
                  const relatedPdf =
                    file.relatedFileId != null
                      ? files.find((candidate) => candidate.id === file.relatedFileId) ?? null
                      : null;
                  const fileReferenceCount = referenceImages.filter(
                    (candidate) => candidate.relatedFileId === file.id
                  ).length;
                  const isPdf = file.role !== "reference_image";

                  return (
                    <tr key={file.id}>
                      <td>{file.fileName}</td>
                      <td>{file.role === "reference_image" ? "Reference image" : "PDF source"}</td>
                      <td>{relatedPdf?.fileName ?? "—"}</td>
                      <td>{(file.fileSize / 1024).toFixed(1)} KB</td>
                      <td>
                        {isPdf ? (
                          <span className={`badge ${file.parseStatus}`}>{file.parseStatus}</span>
                        ) : (
                          <span className="muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          {isPdf ? (
                            <>
                              <button
                                className="btn secondary"
                                onClick={() => void onParseOutline(file.id)}
                                disabled={busy}
                              >
                                {file.parseStatus === "parsed" ? "Re-parse Outline" : "Parse Outline"}
                              </button>
                              <button
                                className="btn secondary"
                                onClick={() => openReferenceUpload(file.id)}
                                disabled={busy}
                              >
                                Upload Reference Image
                              </button>
                              <button
                                className="btn secondary"
                                onClick={() => onViewReferenceImage(file.id)}
                                disabled={busy || fileReferenceCount === 0}
                              >
                                View Reference Image
                              </button>
                            </>
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
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>Chapter Preview</h3>
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
            Reference images are visual hints for manual correction only. Physical PDF page numbers
            remain the canonical `pageStart` and `pageEnd`.
          </p>

          <div className="files-preview-grid">
            <div className="files-preview-table">
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Enabled</th>
                      <th>Original PDF Outline Title</th>
                      <th>Reference Hint</th>
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
                            value={row.referenceTitle ?? ""}
                            onChange={(e) =>
                              updateRow(index, { ...row, referenceTitle: e.target.value || null })
                            }
                            placeholder="Image note"
                          />
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

            <aside className="files-reference-panel">
              <h4 style={{ marginTop: 0 }}>Reference Image</h4>
              {previewReferenceImages.length === 0 ? (
                <p className="muted">No reference image attached to this PDF yet.</p>
              ) : (
                <>
                  <select
                    value={selectedReferenceImage?.id ?? ""}
                    onChange={(e) => setSelectedReferenceImageId(e.target.value || null)}
                  >
                    {previewReferenceImages.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.fileName}
                      </option>
                    ))}
                  </select>
                  {selectedReferenceImage ? (
                    <div className="files-reference-frame">
                      <img
                        src={adminApi.getBookFileUrl(bookId, selectedReferenceImage.id)}
                        alt={selectedReferenceImage.fileName}
                        className="files-reference-image"
                      />
                    </div>
                  ) : null}
                </>
              )}
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
