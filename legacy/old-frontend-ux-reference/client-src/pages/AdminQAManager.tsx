import { useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Plus, Trash2, Save, X, ChevronDown, ChevronRight,
  Loader2, RefreshCw, BookOpen, MessageSquare, CheckSquare, Square, EyeOff, Eye
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
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
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
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
  minHeight = 120,
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
      TextStyle,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────
export default function AdminQAManager() {
  const [, params] = useRoute("/admin/smart-books/:bookId/qa");
  const [, navigate] = useLocation();
  const bookId = parseInt(params?.bookId ?? "0");

  const [search, setSearch] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [editingQAId, setEditingQAId] = useState<number | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [addingChapterId, setAddingChapterId] = useState<number | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

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

  // 取得全書 QA（chapterId=0 表示全部）
  const { data: qaList, refetch: refetchQA, isLoading } = trpc.smartBookAdmin.getChapterQA.useQuery(
    { bookId, chapterId: 0 },
    { enabled: bookId > 0 }
  );

  const updateQA = trpc.smartBookAdmin.updateQA.useMutation({
    onSuccess: () => { refetchQA(); toast.success("已更新"); setEditingQAId(null); }
  });
  const deleteQA = trpc.smartBookAdmin.deleteQA.useMutation({
    onSuccess: () => { refetchQA(); toast.success("已刪除"); }
  });
  const addQA = trpc.smartBookAdmin.addQA.useMutation({
    onSuccess: () => { refetchQA(); toast.success("已新增"); setAddingChapterId(null); setNewQ(""); setNewA(""); }
  });
  const batchDeleteQA = trpc.smartBookAdmin.batchDeleteQA.useMutation({
    onSuccess: (result) => {
      refetchQA();
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

  // 依章節分組 QA
  const qaByChapter = useCallback(() => {
    const map = new Map<number, typeof qaList>();
    (qaList ?? []).forEach(qa => {
      const key = qa.chapterId ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(qa);
    });
    return map;
  }, [qaList]);

  // 過濾搜尋
  const filteredQA = (chapterId: number) => {
    const all = qaByChapter().get(chapterId) ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(qa =>
      qa.question.toLowerCase().includes(q) || qa.answer.toLowerCase().includes(q)
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

  const startEdit = (qa: { id: number; question: string; answer: string }) => {
    setEditingQAId(qa.id);
    setEditQ(qa.question);
    setEditA(qa.answer);
  };

  const handleSave = () => {
    if (!editingQAId) return;
    updateQA.mutate({
      qaId: editingQAId,
      question: htmlToText(editQ),
      answer: htmlToText(editA),
    });
  };

  const handleAdd = (chapterId: number) => {
    if (!newQ.trim() || !newA.trim()) { toast.error("問題和答案不能為空"); return; }
    addQA.mutate({
      bookId,
      chapterId,
      question: htmlToText(newQ),
      answer: htmlToText(newA),
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
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));
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

  // 是否為「前言」章節
  const isPrologue = (title: string) =>
    /前言|序言|導言|introduction/i.test(title);

  // 頂層章節（parentChapterId 為 null）
  const topChapters = chapters.filter(c => !c.parentChapterId);
  const totalQA = qaList?.length ?? 0;

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
            <BookOpen className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">
                {book?.title ?? "載入中..."}
              </h1>
              <p className="text-xs text-gray-500">QA 管理 · 共 {totalQA} 題</p>
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
            onClick={() => refetchQA()}
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
            placeholder="搜尋問題或答案..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : topChapters.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>尚無章節資料</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topChapters.map(chapter => {
              // 隱藏前言章節
              if (hidePrologue && isPrologue(chapter.title)) return null;

              const isExpanded = expandedChapters.has(chapter.id);
              const subChapters = chapters.filter(c => c.parentChapterId === chapter.id);
              const allChapterIds = [chapter.id, ...subChapters.map(c => c.id)];
              const chapterQAs = allChapterIds.flatMap(id => filteredQA(id));
              const chapterQAIds = chapterQAs.map(qa => qa.id);
              const allChapterSelected = chapterQAIds.length > 0 && chapterQAIds.every(id => selectedIds.has(id));

              const qas = filteredQA(chapter.id);

              return (
                <div key={chapter.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {/* 章節標題列 */}
                  <div className="flex items-center gap-2 px-4 hover:bg-gray-50 transition-colors">
                    {/* 全選此章節 checkbox */}
                    <button
                      onClick={() => toggleSelectAll(chapterQAIds)}
                      className="py-4 text-gray-400 hover:text-purple-600 flex-shrink-0"
                      title={allChapterSelected ? "取消全選此章節" : "全選此章節"}
                    >
                      {allChapterSelected
                        ? <CheckSquare className="w-4 h-4 text-purple-600" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChapter(chapter.id)}
                      className="flex items-center gap-3 flex-1 py-4 text-left"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                      <span className="font-semibold text-gray-800 flex-1">{chapter.title}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                        {chapterQAs.length} 題
                      </span>
                    </button>
                  </div>

                  {/* 展開內容 */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* 子章節 */}
                      {subChapters.map(sub => {
                        const subQAs = filteredQA(sub.id);
                        const subExpanded = expandedChapters.has(sub.id);
                        const subQAIds = subQAs.map(qa => qa.id);
                        const allSubSelected = subQAIds.length > 0 && subQAIds.every(id => selectedIds.has(id));
                        return (
                          <div key={sub.id} className="border-b last:border-b-0">
                            <div className="flex items-center gap-2 px-6 bg-gray-50/50">
                              <button
                                onClick={() => toggleSelectAll(subQAIds)}
                                className="py-3 text-gray-400 hover:text-purple-600 flex-shrink-0"
                              >
                                {allSubSelected
                                  ? <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                                  : <Square className="w-3.5 h-3.5" />
                                }
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleChapter(sub.id)}
                                className="flex items-center gap-3 flex-1 py-3 text-left"
                              >
                                {subExpanded
                                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                }
                                <span className="text-sm font-medium text-gray-700 flex-1">{sub.title}</span>
                                <span className="text-xs text-gray-400 mr-2">{subQAs.length} 題</span>
                              </button>
                            </div>
                            {subExpanded && (
                              <QAList
                                qas={subQAs}
                                chapterId={sub.id}
                                bookId={bookId}
                                editingQAId={editingQAId}
                                editQ={editQ}
                                editA={editA}
                                setEditQ={setEditQ}
                                setEditA={setEditA}
                                onStartEdit={startEdit}
                                onSave={handleSave}
                                onCancelEdit={() => setEditingQAId(null)}
                                onDelete={id => { if (confirm("確定刪除此 Q&A？")) deleteQA.mutate({ qaId: id }); }}
                                addingChapterId={addingChapterId}
                                newQ={newQ}
                                newA={newA}
                                setNewQ={setNewQ}
                                setNewA={setNewA}
                                onStartAdd={() => { setAddingChapterId(sub.id); setNewQ(""); setNewA(""); }}
                                onAdd={() => handleAdd(sub.id)}
                                onCancelAdd={() => setAddingChapterId(null)}
                                isSaving={updateQA.isPending}
                                isDeleting={deleteQA.isPending}
                                isAdding={addQA.isPending}
                                selectedIds={selectedIds}
                                onToggleSelect={toggleSelect}
                                indent
                              />
                            )}
                          </div>
                        );
                      })}

                      {/* 本章節的 QA（非子章節） */}
                      <QAList
                        qas={qas}
                        chapterId={chapter.id}
                        bookId={bookId}
                        editingQAId={editingQAId}
                        editQ={editQ}
                        editA={editA}
                        setEditQ={setEditQ}
                        setEditA={setEditA}
                        onStartEdit={startEdit}
                        onSave={handleSave}
                        onCancelEdit={() => setEditingQAId(null)}
                        onDelete={id => { if (confirm("確定刪除此 Q&A？")) deleteQA.mutate({ qaId: id }); }}
                        addingChapterId={addingChapterId}
                        newQ={newQ}
                        newA={newA}
                        setNewQ={setNewQ}
                        setNewA={setNewA}
                        onStartAdd={() => { setAddingChapterId(chapter.id); setNewQ(""); setNewA(""); }}
                        onAdd={() => handleAdd(chapter.id)}
                        onCancelAdd={() => setAddingChapterId(null)}
                        isSaving={updateQA.isPending}
                        isDeleting={deleteQA.isPending}
                        isAdding={addQA.isPending}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                      />
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
          <span className="text-sm font-medium text-purple-700">已勾選 {selectedIds.size} 題</span>
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
              即將刪除已勾選的 <strong>{selectedIds.size} 題</strong> Q&A，此操作不可逆。
              <br />確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => batchDeleteQA.mutate({ qaIds: Array.from(selectedIds) })}
              disabled={batchDeleteQA.isPending}
            >
              {batchDeleteQA.isPending ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── QA 列表子組件 ─────────────────────────────────────────────────────────────
function QAList({
  qas, chapterId, bookId,
  editingQAId, editQ, editA, setEditQ, setEditA,
  onStartEdit, onSave, onCancelEdit, onDelete,
  addingChapterId, newQ, newA, setNewQ, setNewA,
  onStartAdd, onAdd, onCancelAdd,
  isSaving, isDeleting, isAdding,
  selectedIds, onToggleSelect,
  indent = false,
}: {
  qas: Array<{ id: number; question: string; answer: string }>;
  chapterId: number;
  bookId: number;
  editingQAId: number | null;
  editQ: string;
  editA: string;
  setEditQ: (v: string) => void;
  setEditA: (v: string) => void;
  onStartEdit: (qa: { id: number; question: string; answer: string }) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
  addingChapterId: number | null;
  newQ: string;
  newA: string;
  setNewQ: (v: string) => void;
  setNewA: (v: string) => void;
  onStartAdd: () => void;
  onAdd: () => void;
  onCancelAdd: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  isAdding: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  indent?: boolean;
}) {
  const px = indent ? "px-10" : "px-6";

  return (
    <div>
      {qas.map((qa, idx) => {
        const isSelected = selectedIds.has(qa.id);
        return (
          <div key={qa.id} className={`${px} py-4 border-b last:border-b-0 ${isSelected ? "bg-purple-50/40" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
            {editingQAId === qa.id ? (
              /* 編輯模式 */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">問題</label>
                  <RichEditor value={editQ} onChange={setEditQ} placeholder="輸入問題..." minHeight={80} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">答案</label>
                  <RichEditor value={editA} onChange={setEditA} placeholder="輸入答案..." minHeight={140} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1" onClick={onSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    儲存
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit} className="gap-1">
                    <X className="w-3 h-3" /> 取消
                  </Button>
                </div>
              </div>
            ) : (
              /* 顯示模式 */
              <div className="flex gap-3 group">
                {/* 勾選 checkbox */}
                <button
                  onClick={() => onToggleSelect(qa.id)}
                  className="mt-1 flex-shrink-0 text-gray-400 hover:text-purple-600"
                >
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 text-purple-600" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 mb-1.5 leading-relaxed">
                    <span className="text-purple-600 font-bold mr-1">Q:</span>
                    {cleanMarkdown(qa.question)}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    <span className="text-blue-600 font-bold mr-1">A:</span>
                    {cleanMarkdown(qa.answer)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => onStartEdit(qa)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="編輯"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(qa.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="刪除"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 新增 QA 區塊 */}
      {addingChapterId === chapterId ? (
        <div className={`${px} py-4 bg-green-50 border-t`}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">新問題</label>
              <RichEditor value={newQ} onChange={setNewQ} placeholder="輸入問題..." minHeight={80} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">新答案</label>
              <RichEditor value={newA} onChange={setNewA} placeholder="輸入答案..." minHeight={140} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={onAdd} disabled={isAdding}>
                {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                新增
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelAdd} className="gap-1">
                <X className="w-3 h-3" /> 取消
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${px} py-3 border-t`}>
          <button
            type="button"
            onClick={onStartAdd}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增 Q&A
          </button>
        </div>
      )}
    </div>
  );
}
