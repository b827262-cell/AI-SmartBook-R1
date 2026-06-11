import React, { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Search, Bookmark, Trash2, Pencil, Check, X,
  BookOpen, Calendar, FileText, NotebookPen, CheckSquare,
  Square, AlertTriangle, Tag, ImagePlus, MessageSquare,
  Highlighter, Folder, FolderOpen,
  FolderPlus,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

// ─── 型別 ───────────────────────────────────────────────
type MarkType = "highlight" | "color" | "underline" | "bold";

interface Highlight {
  id: string;
  start: number;
  end: number;
  color: string;        // 螢光筆顏色 or 文字顏色
  markType?: MarkType;  // 標記類型（預設 highlight）
  bold?: boolean;       // 加粗（可疊加）
  annotation?: string;  // 行內旁注
  text: string;         // 被標記的原始文字（用於比對）
}

// ─── 去除 Markdown 符號，顯示純文字 ───────────────────────
function stripMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

// ─── 台灣時間格式化 ──────────────────────────────────────
function formatTW(dateStr: string) {
  const d = new Date(dateStr + "Z");
  return d.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── 螢光筆顏色選項 ──────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { label: "黃色", value: "#fef08a", text: "#713f12" },
  { label: "綠色", value: "#bbf7d0", text: "#14532d" },
  { label: "藍色", value: "#bfdbfe", text: "#1e3a8a" },
  { label: "粉色", value: "#fbcfe8", text: "#831843" },
  { label: "橘色", value: "#fed7aa", text: "#7c2d12" },
];

const TEXT_COLORS = [
  { label: "紅色", value: "#dc2626" },
  { label: "藍色", value: "#2563eb" },
  { label: "綠色", value: "#16a34a" },
  { label: "橘色", value: "#ea580c" },
  { label: "紫色", value: "#9333ea" },
];

// ─── 帶螢光筆標記的文字渲染元件 ─────────────────────────
function HighlightedContent({
  content,
  highlights,
  onAddHighlight,
}: {
  content: string;
  highlights: Highlight[];
  onAddHighlight: (h: Highlight) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{
    x: number; y: number; selectedText: string;
    startOffset: number; endOffset: number;
  } | null>(null);
  const [annotationInput, setAnnotationInput] = useState("");
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState<Highlight | null>(null);
  const [annotationPos, setAnnotationPos] = useState({ x: 0, y: 0 });

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;
    const range = sel.getRangeAt(0);
    const containerText = containerRef.current.innerText;
    // 計算在純文字中的 offset
    const preRange = range.cloneRange();
    preRange.selectNodeContents(containerRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + range.toString().length;
    if (end <= start) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setToolbar({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      selectedText: containerText.slice(start, end),
      startOffset: start,
      endOffset: end,
    });
    setAnnotationInput("");
    setShowAnnotation(false);
  }, []);

  const [boldToggle, setBoldToggle] = useState(false);

  const applyMark = (markType: MarkType, color: string) => {
    if (!toolbar) return;
    const h: Highlight = {
      id: Date.now().toString(),
      start: toolbar.startOffset,
      end: toolbar.endOffset,
      color,
      markType,
      bold: boldToggle || undefined,
      text: toolbar.selectedText,
      annotation: annotationInput.trim() || undefined,
    };
    onAddHighlight(h);
    setToolbar(null);
    setBoldToggle(false);
    window.getSelection()?.removeAllRanges();
  };

  // 把 content 依 highlights 分段渲染
  const renderSegments = () => {
    if (!highlights.length) return <span>{content}</span>;

    // 排序並去重疊
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const segments: JSX.Element[] = [];
    let cursor = 0;

    sorted.forEach((h) => {
      const s = Math.max(h.start, cursor);
      const e = h.end;
      if (s >= e) return;
      // 未標記段
      if (cursor < s) {
        segments.push(<span key={`plain-${cursor}`}>{content.slice(cursor, s)}</span>);
      }
      // 標記段
      const markType = h.markType || "highlight";
      const colorObj = HIGHLIGHT_COLORS.find(c => c.value === h.color) || HIGHLIGHT_COLORS[0];
      const markStyle: React.CSSProperties = {
        borderRadius: "2px",
        padding: "0 1px",
        cursor: h.annotation ? "pointer" : "default",
        fontWeight: h.bold ? "bold" : undefined,
        ...(markType === "highlight" ? {
          backgroundColor: h.color,
          color: colorObj.text,
        } : markType === "color" ? {
          color: h.color,
          backgroundColor: "transparent",
        } : markType === "underline" ? {
          textDecoration: "underline",
          textDecorationColor: h.color,
          backgroundColor: "transparent",
          color: "inherit",
        } : markType === "bold" ? {
          fontWeight: "bold",
          backgroundColor: "transparent",
          color: "inherit",
        } : {}),
      };
      segments.push(
        <span key={h.id} style={{ position: "relative", display: "inline" }}>
          <mark
            style={markStyle}
            onClick={(e) => {
              if (!h.annotation) return;
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const containerRect = containerRef.current!.getBoundingClientRect();
              setAnnotationPos({ x: rect.left - containerRect.left, y: rect.bottom - containerRect.top + 4 });
              setActiveAnnotation(activeAnnotation?.id === h.id ? null : h);
            }}
          >
            {content.slice(s, e)}
            {h.annotation && (
              <MessageSquare
                style={{ display: "inline", width: 12, height: 12, marginLeft: 2, verticalAlign: "middle", opacity: 0.7 }}
              />
            )}
          </mark>
          {/* 行內氣泡旁注 */}
          {activeAnnotation?.id === h.id && (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "100%",
                zIndex: 50,
                background: "#1d4ed8",
                color: "#ffffff",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                maxWidth: 260,
                whiteSpace: "pre-wrap",
                boxShadow: "0 4px 16px rgba(29,78,216,0.5)",
                border: "2px solid #3b82f6",
                marginTop: 6,
              }}
            >
              💬 {h.annotation}
            </span>
          )}
        </span>
      );
      cursor = e;
    });

    if (cursor < content.length) {
      segments.push(<span key={`plain-end`}>{content.slice(cursor)}</span>);
    }
    return <>{segments}</>;
  };

  return (
    <div style={{ position: "relative" }}>
      {/* 工具列 */}
      {toolbar && (
        <div
          style={{
            position: "absolute",
            left: toolbar.x - 120,
            top: toolbar.y - 80,
            zIndex: 100,
            background: "#1e293b",
            borderRadius: 10,
            padding: "8px 10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            minWidth: 240,
          }}
        >
          {/* 第一行：螢光筆 + 文字變色 + 工具按鈕 */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginBottom: showAnnotation ? 8 : 0 }}>
            {/* 螢光筆區 */}
            <span style={{ color: "#94a3b8", fontSize: 10, minWidth: 28 }}>螢光筆</span>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => applyMark("highlight", c.value)}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: c.value, border: "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer", flexShrink: 0,
                }}
                title={`螢光筆—${c.label}`}
              />
            ))}
            {/* 分隔線 */}
            <span style={{ width: 1, height: 16, background: "#475569", margin: "0 2px" }} />
            {/* 文字變色區 */}
            <span style={{ color: "#94a3b8", fontSize: 10, minWidth: 28 }}>變色</span>
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => applyMark("color", c.value)}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: c.value, border: "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer", flexShrink: 0,
                }}
                title={`文字變色—${c.label}`}
              />
            ))}
            {/* 分隔線 */}
            <span style={{ width: 1, height: 16, background: "#475569", margin: "0 2px" }} />
            {/* 底線按鈕 */}
            <button
              onClick={() => applyMark("underline", "#60a5fa")}
              style={{
                color: "#94a3b8", background: "none", border: "1px solid #475569",
                borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "1px 6px",
                textDecoration: "underline", fontWeight: 600,
              }}
              title="底線"
            >U</button>
            {/* 加粗 toggle */}
            <button
              onClick={() => setBoldToggle(b => !b)}
              style={{
                color: boldToggle ? "#f8fafc" : "#94a3b8",
                background: boldToggle ? "#3b82f6" : "none",
                border: "1px solid " + (boldToggle ? "#3b82f6" : "#475569"),
                borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "1px 6px",
                fontWeight: 700,
              }}
              title="加粗（可疊加）"
            >B</button>
            {/* 分隔線 */}
            <span style={{ width: 1, height: 16, background: "#475569", margin: "0 2px" }} />
            {/* 旁注按鈕 */}
            <button
              onClick={() => setShowAnnotation(!showAnnotation)}
              style={{
                color: showAnnotation ? "#60a5fa" : "#94a3b8",
                background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2,
              }}
              title="加旁注"
            >
              <MessageSquare size={13} />
              <span style={{ fontSize: 10 }}>旁注</span>
            </button>
            <button
              onClick={() => setToolbar(null)}
              style={{ marginLeft: "auto", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>
          {showAnnotation && (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                autoFocus
                value={annotationInput}
                onChange={(e) => setAnnotationInput(e.target.value)}
                placeholder="輸入補充說明..."
                style={{
                  flex: 1, background: "#334155", border: "1px solid #475569",
                  borderRadius: 6, padding: "4px 8px", color: "#f1f5f9", fontSize: 12,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyMark("highlight", HIGHLIGHT_COLORS[0].value);
                  if (e.key === "Escape") setToolbar(null);
                }}
              />
              <button
                onClick={() => applyMark("highlight", HIGHLIGHT_COLORS[0].value)}
                style={{
                  background: "#3b82f6", color: "white", border: "none",
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                }}
              >確認</button>
            </div>
          )}
        </div>
      )}

      {/* 點擊空白處關閉氣泡 */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== "MARK") setActiveAnnotation(null);
        }}
        style={{ lineHeight: 1.8, userSelect: "text", cursor: "text" }}
      >
        {renderSegments()}
      </div>
    </div>
  );
}

// ─── 主頁面 ──────────────────────────────────────────────
export default function MyNotes() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  // 讀取 from 參數，返回來源頁
  const fromUrl = new URLSearchParams(window.location.search).get("from") ?? "/";
  // 從 from 參數解析來源科目，自動篩選
  const fromSubject = (() => {
    try {
      if (!fromUrl || fromUrl === "/") return null;
      const fromSearch = new URL(fromUrl, window.location.origin).searchParams;
      return fromSearch.get("subjectName") || null;
    } catch { return null; }
  })();

  // 搜尋 & 分類
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(fromSubject); // null = 全部，預設從來源科目
  const [activeFolder, setActiveFolder] = useState<string | null | undefined>(undefined); // undefined = 全部, null = 未分類, string = 資料夾名

  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null); // 正在更名的資料夾
  const [renameInput, setRenameInput] = useState("");

  // 多選批次
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 詳情
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [editingNote, setEditingNote] = useState(false);

  // 螢光筆標記
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const highlightSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 截圖貼上（S3 永久保存）
  const [noteImages, setNoteImages] = useState<string[]>([]); // 已儲存的 S3 URL
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // ── 查詢 ──
  const { data: categories = [] } = trpc.savedNotes.getCategories.useQuery(undefined, { enabled: !!user });
  const { data: folderRows = [] } = trpc.savedNotes.getFolders.useQuery(
    activeCategory ? { subjectName: activeCategory } : undefined,
    { enabled: !!user }
  );

  const { data: notes = [], isLoading } = trpc.savedNotes.list.useQuery(
    {
      keyword: keyword || undefined,
      subjectName: activeCategory || undefined,
      folderName: activeFolder,
      pageSize: 50,
    },
    { enabled: !!user }
  );

  const { data: selectedNote, isLoading: noteLoading } = trpc.savedNotes.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  // 載入筆記時還原 highlights 和 noteImages
  useEffect(() => {
    if (selectedNote?.highlights) {
      try {
        setHighlights(JSON.parse(selectedNote.highlights));
      } catch {
        setHighlights([]);
      }
    } else {
      setHighlights([]);
    }
    if (selectedNote?.noteImages) {
      try {
        setNoteImages(JSON.parse(selectedNote.noteImages));
      } catch {
        setNoteImages([]);
      }
    } else {
      setNoteImages([]);
    }
  }, [selectedNote?.id]);

  // ── Mutations ──
  const updateMutation = trpc.savedNotes.update.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate();
      utils.savedNotes.get.invalidate({ id: selectedId! });
      utils.savedNotes.getFolders.invalidate();
      utils.savedNotes.getCategories.invalidate();
      setEditingTitle(false);
      setEditingNote(false);

    },
  });

  const deleteMutation = trpc.savedNotes.delete.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate();
      utils.savedNotes.getCategories.invalidate();
      setSelectedId(null);
      toast.success("已刪除");
    },
  });

  const batchDeleteMutation = trpc.savedNotes.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.savedNotes.list.invalidate();
      utils.savedNotes.getCategories.invalidate();
      setSelectedIds(new Set());
      setSelectMode(false);
      if (selectedIds.has(selectedId!)) setSelectedId(null);
      toast.success(`已刪除 ${data.count} 則筆記`);
    },
  });

  const deleteAllMutation = trpc.savedNotes.deleteAll.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate();
      utils.savedNotes.getCategories.invalidate();
      setSelectedId(null);
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success("已清空");
    },
  });

  const deleteFolderMutation = trpc.savedNotes.deleteFolder.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate();
      utils.savedNotes.getFolders.invalidate();
      utils.savedNotes.getCategories.invalidate();
      if (activeFolder !== null) setActiveFolder(null);
      toast.success("資料夾已刪除，筆記已移回未分類");
    },
  });

  const createFolderMutation = trpc.savedNotes.createFolder.useMutation({
    onSuccess: (_data, variables) => {
      utils.savedNotes.getFolders.invalidate();
      setActiveFolder(variables.folderName);
      setNewFolderName("");
      setShowNewFolderInput(false);
      toast.success(`資料夾「${variables.folderName}」已建立`);
    },
    onError: () => toast.error("資料夾建立失敗"),
  });

  const renameFolderMutation = trpc.savedNotes.renameFolder.useMutation({
    onSuccess: (_data, variables) => {
      utils.savedNotes.getFolders.invalidate();
      utils.savedNotes.list.invalidate();
      utils.savedNotes.getCategories.invalidate();
      if (activeFolder === variables.oldName) setActiveFolder(variables.newName);
      setRenamingFolder(null);
      setRenameInput("");
      toast.success(`資料夾已更名為「${variables.newName}」`);
    },
    onError: () => toast.error("更名失敗"),
  });

  // ── 螢光筆：自動儲存 ──
  const handleAddHighlight = useCallback((h: Highlight) => {
    setHighlights((prev) => {
      const next = [...prev, h];
      // debounce 儲存
      if (highlightSaveTimer.current) clearTimeout(highlightSaveTimer.current);
      highlightSaveTimer.current = setTimeout(() => {
        if (selectedId) {
          updateMutation.mutate({ id: selectedId, highlights: JSON.stringify(next) });
        }
      }, 800);
      return next;
    });
    toast.success("標記已儲存", { duration: 1200 });
  }, [selectedId]);

  const removeHighlight = (id: string) => {
    setHighlights((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (selectedId) updateMutation.mutate({ id: selectedId, highlights: JSON.stringify(next) });
      return next;
    });
  };

  // ── 上傳截圖到 S3 ──
  // AI 問答相關 state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiHistory, setAiHistory] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  const askAiMutation = trpc.savedNotes.askAI.useMutation({
    onSuccess: (data) => {
      setAiHistory(prev => [...prev, { role: "ai", content: data.answer }]);
      setAiAnswer("");
      setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err) => toast.error("失敗：" + err.message),
  });

  const handleAskAi = () => {
    if (!aiQuestion.trim() || !selectedNote) return;
    const q = aiQuestion.trim();
    setAiHistory(prev => [...prev, { role: "user", content: q }]);
    setAiQuestion("");
    setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    askAiMutation.mutate({
      noteId: selectedNote.id,
      question: q,
      noteContent: selectedNote.content || "",
      noteTitle: selectedNote.title || "",
    });
  };

  const uploadNoteImageMutation = trpc.savedNotes.uploadNoteImage.useMutation({
    onSuccess: (data) => {
      setNoteImages(data.images);
      setUploadingImage(false);
      utils.savedNotes.get.invalidate({ id: selectedId! });
      toast.success("截圖已儲存");
    },
    onError: () => {
      setUploadingImage(false);
      toast.error("截圖上傳失敗");
    },
  });

  const uploadImageBase64 = (base64: string, mimeType: string) => {
    if (!selectedId) return;
    setUploadingImage(true);
    uploadNoteImageMutation.mutate({ noteId: selectedId, imageBase64: base64, mimeType });
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((i) => i.type.startsWith("image/"));
    if (!imgItem) return;
    const blob = imgItem.getAsFile();
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = () => uploadImageBase64(reader.result as string, imgItem.type);
    reader.readAsDataURL(blob);
    toast.info("截圖上傳中...");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => uploadImageBase64(reader.result as string, f.type);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const removeNoteImage = (url: string) => {
    if (!selectedId) return;
    const updated = noteImages.filter((u) => u !== url);
    setNoteImages(updated);
    updateMutation.mutate({ id: selectedId, noteImages: JSON.stringify(updated) });
  };

  // ── 多選 ──
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(notes.map((n) => n.id)));
  const clearSelect = () => setSelectedIds(new Set());

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">請先登入</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(fromUrl)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <NotebookPen className="w-5 h-5 text-primary" />
        <h1 className="font-semibold text-base">學習筆記本</h1>
        <Badge variant="secondary" className="ml-auto">{notes.length} 則筆記</Badge>
        {/* 批次管理按鈕 */}
        {!selectMode ? (
          <Button size="sm" variant="outline" onClick={() => setSelectMode(true)} className="flex items-center gap-1">
            <CheckSquare className="w-4 h-4" />
            批次管理
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">已選 {selectedIds.size} 則</span>
            <Button size="sm" variant="ghost" onClick={selectAll}>全選</Button>
            <Button size="sm" variant="ghost" onClick={clearSelect}>取消</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0 || batchDeleteMutation.isPending}
              onClick={() => {
                if (confirm(`確定要刪除選取的 ${selectedIds.size} 則筆記嗎？`)) {
                  batchDeleteMutation.mutate({ ids: Array.from(selectedIds) });
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              刪除 ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40"
              onClick={() => {
                const msg = activeCategory
                  ? `確定要刪除「${activeCategory}」分類下的所有 ${notes.length} 則筆記嗎？`
                  : `確定要刪除全部 ${notes.length} 則筆記嗎？此操作無法復原！`;
                if (confirm(msg)) {
                  deleteAllMutation.mutate({ subjectName: activeCategory || undefined });
                }
              }}
              disabled={deleteAllMutation.isPending}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              一鍵全刪
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectMode(false); clearSelect(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── 左側列表 ── */}
        <div className="w-full md:w-80 border-r border-border flex flex-col bg-card">
          {/* 搜尋 */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setKeyword(searchInput); }}
                placeholder="搜尋標題、問題、筆記..."
                className="pl-9 text-sm"
              />
              {keyword && (
                <button onClick={() => { setKeyword(""); setSearchInput(""); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* 資料夾區（固定，不 scroll） */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">資料夾</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewFolderInput(v => !v)} title="新增資料夾">
                <FolderPlus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {showNewFolderInput && (
              <div className="flex gap-1 mb-1.5">
                <Input
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="資料夾名稱"
                  className="h-7 text-xs flex-1"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter" && newFolderName.trim()) {
                      createFolderMutation.mutate({ folderName: newFolderName.trim() });
                    } else if (e.key === "Escape") {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" disabled={createFolderMutation.isPending} onClick={() => {
                  if (newFolderName.trim()) {
                    createFolderMutation.mutate({ folderName: newFolderName.trim() });
                  }
                }}><Check className="w-3.5 h-3.5" /></Button>
              </div>
            )}
            {/* 全部筆記 */}
            <button
              onClick={() => { setActiveFolder(undefined); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                activeFolder === undefined
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
              全部筆記
              <span className="ml-auto">{categories.reduce((s, c) => s + Number(c.count), 0)}</span>
            </button>
            {/* 未分類 */}
            <button
              onClick={() => { setActiveFolder(null); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                activeFolder === null
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Folder className="w-3.5 h-3.5 flex-shrink-0" />
              未分類
              <span className="ml-auto">{folderRows.filter(r => r.folderName === null).reduce((s, r) => s + Number(r.count), 0)}</span>
            </button>
            {/* 自訂資料夾列表 */}
            {[...new Set(folderRows.filter(r => r.folderName !== null).map(r => r.folderName as string))].map(folder => (
              <div key={folder} className="group">
                {renamingFolder === folder ? (
                  /* 更名輸入框 */
                  <div className="flex items-center gap-1 px-2 py-1">
                    <Input
                      autoFocus
                      value={renameInput}
                      onChange={e => setRenameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && renameInput.trim() && renameInput.trim() !== folder) {
                          renameFolderMutation.mutate({ oldName: folder, newName: renameInput.trim() });
                        } else if (e.key === 'Escape') {
                          setRenamingFolder(null);
                          setRenameInput("");
                        }
                      }}
                      className="h-6 text-xs flex-1 px-1.5"
                      placeholder="新資料夾名稱"
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-primary flex-shrink-0"
                      disabled={!renameInput.trim() || renameInput.trim() === folder || renameFolderMutation.isPending}
                      onClick={() => renameFolderMutation.mutate({ oldName: folder, newName: renameInput.trim() })}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                      onClick={() => { setRenamingFolder(null); setRenameInput(""); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setActiveFolder(folder); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        activeFolder === folder
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {activeFolder === folder ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className="truncate">{folder}</span>
                      <span className="ml-auto">{folderRows.filter(r => r.folderName === folder).reduce((s, r) => s + Number(r.count), 0)}</span>
                    </button>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => {
                        e.stopPropagation();
                        setRenamingFolder(folder);
                        setRenameInput(folder);
                      }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`刪除資料夾「${folder}」？筆記將移回未分類。`)) {
                          deleteFolderMutation.mutate({ folderName: folder });
                        }
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 筆記列表（可 scroll） */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">載入中...</div>
            ) : notes.length === 0 ? (
              <div className="p-8 text-center">
                <Bookmark className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {keyword ? "找不到符合的筆記" : "還沒有收藏的筆記"}
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <React.Fragment key={note.id}>
                <div
                  className={`flex items-start gap-2 px-3 py-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${
                    selectedId === note.id && !selectMode ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  } ${selectedIds.has(note.id) ? "bg-blue-500/10" : ""}`}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(note.id);
                    } else {
                      setSelectedId(note.id);
                    }
                  }}
                >
                  {/* 多選 checkbox */}
                  {selectMode && (
                    <div className="mt-0.5 flex-shrink-0">
                      {selectedIds.has(note.id)
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                  )}
                  <Bookmark className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedId === note.id ? "text-primary fill-primary/20" : "text-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{note.title || "（無標題）"}</p>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {note.subjectName && (
                        <span className="text-xs text-primary/70">{note.subjectName}</span>
                      )}
                      {(note as { folderName?: string | null }).folderName && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                          <Folder className="w-3 h-3" />
                          {(note as { folderName?: string | null }).folderName}
                        </span>
                      )}
                    </div>
                    {note.question && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">Q: {note.question}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground/60">{formatTW(note.createdAt)}</span>
                    </div>
                  </div>
                  {/* 移至資料夾：直接 select 下拉 */}
                  {!selectMode && (
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <select
                        className="text-[10px] border border-border rounded px-1 py-0.5 bg-background cursor-pointer text-muted-foreground"
                        value={(note as { folderName?: string | null }).folderName ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateMutation.mutate({ id: note.id, folderName: val === "" ? null : val });
                        }}
                      >
                        <option value="">未分類</option>
                        {[...new Set(folderRows.filter(r => r.folderName !== null).map(r => r.folderName as string))].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* ── 右側詳情 ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">選擇左側筆記查看內容</p>
              </div>
            </div>
          ) : noteLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-muted-foreground text-sm">載入中...</div>
            </div>
          ) : selectedNote ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* 標題列 */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {editingTitle ? (
                    <div className="flex gap-2">
                      <Input
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        className="text-lg font-semibold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateMutation.mutate({ id: selectedNote.id, title: titleInput });
                          if (e.key === "Escape") setEditingTitle(false);
                        }}
                      />
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: selectedNote.id, title: titleInput })}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{selectedNote.title || "（無標題）"}</h2>
                      <button
                        onClick={() => { setTitleInput(selectedNote.title || ""); setEditingTitle(true); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {selectedNote.subjectName && (
                      <Badge variant="secondary" className="text-xs">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {selectedNote.subjectName}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatTW(selectedNote.createdAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("確定要刪除這則筆記嗎？")) deleteMutation.mutate({ id: selectedNote.id });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 原始問題 */}
              {selectedNote.question && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-primary mb-1">原始問題</p>
                  <p className="text-sm text-foreground">{selectedNote.question}</p>
                </div>
              )}

              {/* AI 回覆內容（螢光筆區） */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    AI 回覆內容
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                      <Highlighter className="w-3 h-3" />
                      框選文字可標記螢光筆或加旁注
                    </span>
                    {highlights.length > 0 && (
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("清除所有螢光筆標記？")) {
                            setHighlights([]);
                            updateMutation.mutate({ id: selectedNote.id, highlights: "[]" });
                          }
                        }}
                      >
                        清除標記
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed">
                  <HighlightedContent
                    content={selectedNote.content}
                    highlights={highlights}
                    onAddHighlight={handleAddHighlight}
                  />
                </div>

                {/* 標記彙整（底部） */}
                {highlights.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Highlighter className="w-3.5 h-3.5" />
                      標記彙整
                    </p>
                    <div className="space-y-1.5">
                      {highlights.map((h) => (
                         <div key={h.id} className="flex items-center gap-1.5 text-xs flex-wrap">
                           {/* 標記類型圖示 */}
                           <span className="text-muted-foreground/50 flex-shrink-0">
                             {h.markType === "color" ? "🎨" : h.markType === "underline" ? "̲A" : h.markType === "bold" ? "🇧" : "📌"}
                           </span>
                           {/* 被標記的文字 */}
                           <span
                             style={{
                               ...(h.markType === "color" ? {
                                 color: h.color, fontWeight: 600,
                               } : h.markType === "underline" ? {
                                 textDecoration: "underline", textDecorationColor: h.color,
                               } : h.markType === "bold" ? {
                                 fontWeight: 700,
                               } : {
                                 background: h.color, borderRadius: 3, padding: "1px 5px",
                               }),
                               maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                             }}
                           >
                             {(() => { const clean = stripMd(h.text); return clean.slice(0, 30) + (clean.length > 30 ? '…' : ''); })()}
                           </span>
                           {/* 旁注 */}
                           {h.annotation && (
                             <span className="text-muted-foreground flex items-center gap-0.5 italic">
                               <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0" />
                               {h.annotation}
                             </span>
                           )}
                           {/* X 緊跟在內容後面 */}
                           <button
                             onClick={() => removeHighlight(h.id)}
                             className="text-muted-foreground/50 hover:text-destructive flex-shrink-0"
                           >
                             <X className="w-3 h-3" />
                           </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 個人筆記（含截圖貼上） */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <NotebookPen className="w-3.5 h-3.5" />
                    我的筆記
                  </p>
                  <div className="flex items-center gap-2">
                    {/* 貼上截圖：直接讀取剪貼簿 */}
                    <button
                      onClick={async () => {
                        try {
                          const items = await navigator.clipboard.read();
                          let found = false;
                          for (const item of items) {
                            for (const type of item.types) {
                              if (type.startsWith("image/")) {
                                const blob = await item.getType(type);
                                const reader = new FileReader();
                                reader.onload = () => uploadImageBase64(reader.result as string, type);
                                reader.readAsDataURL(blob);
                                found = true;
                                break;
                              }
                            }
                            if (found) break;
                          }
                          if (!found) toast.info("剪貼簿中沒有圖片，請先截圖再點此按鈕");
                        } catch {
                          // Clipboard API 被拒絕（最常見於非 HTTPS 或權限問題）
                          // 提示用戶直接在筆記輸入框使用 Ctrl+V
                          toast.info("請點擊下方筆記框，再按 Ctrl+V 貼上截圖");
                        }
                      }}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      title="貼上剪貼簿截圖"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
                      貼上截圖
                    </button>
                    {/* 上傳圖片：開啟檔案選擇器 */}
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      title="上傳圖片"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      上傳圖片
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    {!editingNote && (
                      <button
                        onClick={() => { setNoteInput(selectedNote.note || ""); setEditingNote(true); }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        {selectedNote.note ? "編輯" : "新增筆記"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 截圖預覽 */}
                {(noteImages.length > 0 || uploadingImage) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {noteImages.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt={`截圖 ${i + 1}`} className="max-h-48 rounded-lg border border-border object-contain cursor-pointer" onClick={() => window.open(src, '_blank')} />
                        <button
                          onClick={() => removeNoteImage(src)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {uploadingImage && (
                      <div className="w-24 h-24 rounded-lg border border-border flex items-center justify-center bg-muted">
                        <span className="text-xs text-muted-foreground">上傳中...</span>
                      </div>
                    )}
                  </div>
                )}

                {editingNote ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="在這裡寫下你的筆記、重點整理或心得...（也可直接 Ctrl+V 貼上截圖）"
                      className="min-h-[120px] text-sm resize-none"
                      autoFocus
                      onPaste={handleImagePaste}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingNote(false)}>取消</Button>
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: selectedNote.id, note: noteInput })}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? "儲存中..." : "儲存"}
                      </Button>
                    </div>
                  </div>
                ) : selectedNote.note ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedNote.note}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">尚未新增筆記</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
