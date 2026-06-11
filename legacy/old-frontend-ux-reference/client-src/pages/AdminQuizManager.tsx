import { useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Trash2, Save, X, ChevronDown, ChevronRight,
  Loader2, RefreshCw, BookOpen, BookOpenCheck, Pencil, CheckSquare, Square, EyeOff, Eye
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { stripOptionPrefix } from "@/lib/stripOptionPrefix";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Markdown 符號清理 ────────────────────────────────────────────────────────
function cleanMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^[\*\-]\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── 將純文字轉為 TipTap HTML ──────────────────────────────────────────────────
function textToHtml(text: string): string {
  if (!text) return "<p></p>";
  const cleaned = cleanMarkdown(text);
  return cleaned
    .split("\n\n")
    .map(para => {
      const lines = para.split("\n").join("<br>");
      return `<p>${lines}</p>`;
    })
    .join("");
}

// ── 將 TipTap HTML 轉為純文字（儲存用）────────────────────────────────────────
function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p><p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// ── TipTap 工具列 ─────────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-purple-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 rounded-t-md">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "粗")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "斜")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "底線")}
      {btn(editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), "螢光")}
      <div className="w-px bg-gray-300 mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• 列表")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. 列表")}
      <div className="w-px bg-gray-300 mx-1" />
      {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "左")}
      {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "中")}
      {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "右")}
    </div>
  );
}

// ── 富文字編輯器組件 ──────────────────────────────────────────────────────────
function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 100,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Highlight,
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 focus:outline-none"
        style={{ minHeight }}
      />
      {!editor?.getText() && placeholder && (
        <div className="absolute top-12 left-3 text-gray-400 text-sm pointer-events-none select-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}

// ── 選項行 ────────────────────────────────────────────────────────────────────
function OptionRow({
  index,
  value,
  isCorrect,
  onValueChange,
  onSetCorrect,
}: {
  index: number;
  value: string;
  isCorrect: boolean;
  onValueChange: (v: string) => void;
  onSetCorrect: () => void;
}) {
  const labels = ["A", "B", "C", "D"];
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onSetCorrect}
        className={`mt-2 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
          isCorrect
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 text-gray-400 hover:border-green-400"
        }`}
        title="設為正確答案"
      >
        {labels[index]}
      </button>
      <div className="flex-1">
        <RichEditor
          value={value}
          onChange={onValueChange}
          placeholder={`選項 ${labels[index]}`}
          minHeight={60}
        />
      </div>
    </div>
  );
}

// ── 難度標籤 ──────────────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    easy: { label: "簡單", cls: "bg-green-100 text-green-700" },
    medium: { label: "中度", cls: "bg-yellow-100 text-yellow-700" },
    hard: { label: "困難", cls: "bg-red-100 text-red-700" },
  };
  const d = map[difficulty ?? "medium"] ?? map["medium"];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${d.cls}`}>
      {d.label}
    </span>
  );
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────
export default function AdminQuizManager() {
  const [, params] = useRoute("/admin/smart-books/:bookId/quiz");
  const [, navigate] = useLocation();
  const bookId = parseInt(params?.bookId ?? "0");

  const [search, setSearch] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
    hint: string;
    difficulty: string;
  } | null>(null);

  // ── 批次刪除相關 state ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  // ── 隱藏前言 state ──
  const [hidePrologue, setHidePrologue] = useState(true);

  // 取得書本資訊
  const { data: bookData } = trpc.smartBookAdmin.getById.useQuery(
    { id: bookId },
    { enabled: bookId > 0 }
  );

  // 取得全書題目
  const { data: allQuestions, refetch: refetchQuestions, isLoading } = trpc.smartBookAdmin.getBookQuestions.useQuery(
    { bookId },
    { enabled: bookId > 0 }
  );

  const updateQuestion = trpc.smartBookAdmin.updateQuestion.useMutation({
    onSuccess: () => {
      refetchQuestions();
      toast.success("已更新");
      setEditingId(null);
      setEditData(null);
    },
    onError: (err) => toast.error("更新失敗：" + err.message),
  });
  const deleteQuestion = trpc.smartBookAdmin.deleteQuestion.useMutation({
    onSuccess: () => { refetchQuestions(); toast.success("已刪除"); },
    onError: (err) => toast.error("刪除失敗：" + err.message),
  });
  const batchDeleteQuestions = trpc.smartBookAdmin.batchDeleteQuestions.useMutation({
    onSuccess: (result) => {
      refetchQuestions();
      setSelectedIds(new Set());
      setBatchConfirmOpen(false);
      toast.success(`已刪除 ${result.deletedCount} 題`);
    },
    onError: (err) => {
      setBatchConfirmOpen(false);
      toast.error("批次刪除失敗：" + err.message);
    },
  });

  const book = bookData?.book;
  const chapters = bookData?.chapters ?? [];

  // 依章節分組題目
  const questionsByChapter = useCallback(() => {
    const map = new Map<number, typeof allQuestions>();
    (allQuestions ?? []).forEach(q => {
      const key = q.chapterId ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    });
    return map;
  }, [allQuestions]);

  // 過濾搜尋
  const filteredQuestions = (chapterId: number) => {
    const all = questionsByChapter().get(chapterId) ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(item =>
      item.question.toLowerCase().includes(q) ||
      (item.options as string[]).some(opt => opt.toLowerCase().includes(q)) ||
      (item.hint ?? "").toLowerCase().includes(q)
    );
  };

  const toggleChapter = (id: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (q: {
    id: number;
    question: string;
    options: unknown;
    correctIndex: number;
    hint?: string | null;
    difficulty?: string | null;
  }) => {
    setEditingId(q.id);
    setEditData({
      question: q.question,
      options: (q.options as string[]).slice(0, 4),
      correctIndex: q.correctIndex,
      hint: q.hint ?? "",
      difficulty: q.difficulty ?? "medium",
    });
  };

  const handleSave = () => {
    if (!editingId || !editData) return;
    const cleanedOptions = editData.options.map(opt => htmlToText(opt));
    const cleanedQuestion = htmlToText(editData.question);
    const cleanedHint = htmlToText(editData.hint);
    updateQuestion.mutate({
      questionId: editingId,
      question: cleanedQuestion,
      options: cleanedOptions as [string, string, string, string],
      correctIndex: editData.correctIndex,
      hint: cleanedHint || undefined,
      difficulty: editData.difficulty as "easy" | "medium" | "hard",
    });
  };

  // ── checkbox 勾選邏輯 ──
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: number[]) => {
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // 頂層章節
  const topChapters = chapters.filter(c => !c.parentChapterId);
  const totalQuestions = allQuestions?.length ?? 0;

  // 是否為「前言」章節（標題包含「前言」）
  const isPrologue = (title: string) =>
    /前言|序言|導言|introduction/i.test(title);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導覽 */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/smart-books`)}
            className="gap-1 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
            返回書本管理
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BookOpenCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">
                {book?.title ?? "載入中..."}
              </h1>
              <p className="text-xs text-gray-500">選擇題管理 · 共 {totalQuestions} 題</p>
            </div>
          </div>
          {/* 隱藏前言開關 */}
          <Button
            variant={hidePrologue ? "default" : "outline"}
            size="sm"
            onClick={() => setHidePrologue(v => !v)}
            className="gap-1 flex-shrink-0"
            title={hidePrologue ? "目前已隱藏前言章節" : "目前顯示前言章節"}
          >
            {hidePrologue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {hidePrologue ? "前言已隱藏" : "顯示前言"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchQuestions()}
            className="gap-1 flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            重新整理
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 搜尋列 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋題目、選項或解析..."
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 載入中 */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            載入中...
          </div>
        )}

        {/* 章節列表 */}
        {!isLoading && (
          <div className="space-y-4">
            {topChapters.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>尚無章節資料</p>
              </div>
            )}

            {topChapters.map(chapter => {
              // 隱藏前言章節
              if (hidePrologue && isPrologue(chapter.title)) return null;

              // 收集此頂層章節及其子章節的所有題目
              const subChapters = chapters.filter(c => c.parentChapterId === chapter.id);
              const allChapterIds = [chapter.id, ...subChapters.map(c => c.id)];
              const chapterQuestions = allChapterIds.flatMap(id => filteredQuestions(id));
              if (chapterQuestions.length === 0 && search) return null;

              const isExpanded = expandedChapters.has(chapter.id);
              const chapterQIds = chapterQuestions.map(q => q.id);
              const allChapterSelected = chapterQIds.length > 0 && chapterQIds.every(id => selectedIds.has(id));

              return (
                <div key={chapter.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  {/* 章節標題列 */}
                  <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* 全選此章節 checkbox */}
                    <button
                      onClick={() => toggleSelectAll(chapterQIds)}
                      className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                      title={allChapterSelected ? "取消全選此章節" : "全選此章節"}
                    >
                      {allChapterSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                      <span className="font-medium text-gray-800 flex-1 truncate">{chapter.title}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                        {chapterQuestions.length} 題
                      </span>
                    </button>
                  </div>

                  {/* 展開的題目列表 */}
                  {isExpanded && (
                    <div className="border-t divide-y">
                      {chapterQuestions.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-400 text-sm">此章節尚無題目</div>
                      ) : (
                        chapterQuestions.map((q, idx) => {
                          const isEditing = editingId === q.id;
                          const isSelected = selectedIds.has(q.id);
                          return (
                            <div key={q.id} className={`px-4 py-4 ${isEditing ? "bg-blue-50" : isSelected ? "bg-blue-50/40" : "hover:bg-gray-50"}`}>
                              {isEditing && editData ? (
                                /* ── 編輯模式 ── */
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-blue-700">編輯題目 #{idx + 1}</span>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-gray-500">難度：</label>
                                      <select
                                        value={editData.difficulty}
                                        onChange={e => setEditData(d => d ? { ...d, difficulty: e.target.value } : d)}
                                        className="text-xs border rounded px-2 py-1 bg-white"
                                      >
                                        <option value="easy">簡單</option>
                                        <option value="medium">中度</option>
                                        <option value="hard">困難</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* 題目 */}
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">題目</label>
                                    <RichEditor
                                      value={editData.question}
                                      onChange={v => setEditData(d => d ? { ...d, question: v } : d)}
                                      placeholder="輸入題目內容..."
                                      minHeight={80}
                                    />
                                  </div>

                                  {/* 選項 */}
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-2 block">
                                      選項（點擊圓圈設為正確答案）
                                    </label>
                                    <div className="space-y-3">
                                      {editData.options.map((opt, i) => (
                                        <OptionRow
                                          key={i}
                                          index={i}
                                          value={opt}
                                          isCorrect={editData.correctIndex === i}
                                          onValueChange={v => setEditData(d => {
                                            if (!d) return d;
                                            const opts = [...d.options];
                                            opts[i] = v;
                                            return { ...d, options: opts };
                                          })}
                                          onSetCorrect={() => setEditData(d => d ? { ...d, correctIndex: i } : d)}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {/* 解析 */}
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">解析提示（可空）</label>
                                    <RichEditor
                                      value={editData.hint}
                                      onChange={v => setEditData(d => d ? { ...d, hint: v } : d)}
                                      placeholder="輸入解析說明..."
                                      minHeight={80}
                                    />
                                  </div>

                                  {/* 操作按鈕 */}
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      onClick={handleSave}
                                      disabled={updateQuestion.isPending}
                                      className="gap-1"
                                    >
                                      {updateQuestion.isPending
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <Save className="w-3 h-3" />
                                      }
                                      儲存
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => { setEditingId(null); setEditData(null); }}
                                    >
                                      <X className="w-3 h-3 mr-1" />取消
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* ── 顯示模式 ── */
                                <div className="flex gap-3">
                                  {/* 勾選 checkbox */}
                                  <button
                                    onClick={() => toggleSelect(q.id)}
                                    className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-600"
                                  >
                                    {isSelected
                                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                                      : <Square className="w-4 h-4" />
                                    }
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    {/* 題目 */}
                                    <div className="flex items-start gap-2 mb-2">
                                      <p className="text-sm font-medium text-gray-800 flex-1 leading-relaxed">
                                        {idx + 1}. {cleanMarkdown(q.question)}
                                      </p>
                                      <DifficultyBadge difficulty={q.difficulty} />
                                    </div>
                                    {/* 選項 */}
                                    <div className="space-y-1 mb-2">
                                      {(q.options as string[]).map((opt, i) => (
                                        <p
                                          key={i}
                                          className={`text-sm px-2 py-1 rounded ${
                                            i === q.correctIndex
                                              ? "bg-green-50 text-green-700 font-medium"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          {String.fromCharCode(65 + i)}. {cleanMarkdown(stripOptionPrefix(opt))}
                                        </p>
                                      ))}
                                    </div>
                                    {/* 解析 */}
                                    {q.hint && (
                                      <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1.5 rounded leading-relaxed">
                                        解析：{cleanMarkdown(q.hint)}
                                      </p>
                                    )}
                                  </div>
                                  {/* 操作 */}
                                  <div className="flex flex-col gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => startEdit(q)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                      title="編輯"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm("確定刪除此題？")) {
                                          deleteQuestion.mutate({ questionId: q.id });
                                        }
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                                      title="刪除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 批次操作浮動工具列 */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border shadow-xl rounded-full px-5 py-3">
          <span className="text-sm font-medium text-blue-700">已勾選 {selectedIds.size} 題</span>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-full gap-1"
            onClick={() => setBatchConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            批次刪除
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-gray-500"
            onClick={() => setSelectedIds(new Set())}
          >
            取消選取
          </Button>
        </div>
      )}

      {/* 批次刪除確認對話框 */}
      <AlertDialog open={batchConfirmOpen} onOpenChange={setBatchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              確認批次刪除
            </AlertDialogTitle>
            <AlertDialogDescription>
              即將刪除已勾選的 <strong>{selectedIds.size} 題</strong>，此操作不可逆。
              <br />確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => batchDeleteQuestions.mutate({ questionIds: Array.from(selectedIds) })}
              disabled={batchDeleteQuestions.isPending}
            >
              {batchDeleteQuestions.isPending ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
