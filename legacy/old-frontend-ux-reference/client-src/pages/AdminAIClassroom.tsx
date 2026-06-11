import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Edit2, Trash2, RefreshCw, Eye, BookOpen, CheckCircle2, Clock, AlertCircle } from "lucide-react";

// ==================== 型別 ====================
interface KnowledgePoint {
  title: string;
  content: string;
}

interface LessonData {
  id?: number;
  bookId: number;
  chapterId: number;
  intro?: string | null;
  knowledgePoints: KnowledgePoint[];
  lessonSummary?: string | null;
  status: string;
  isEdited: number;
  updatedAt?: number;
  chapterTitle?: string | null;
  bookTitle?: string | null;
}

// ==================== 主頁面 ====================
export default function AdminAIClassroom() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [editingLesson, setEditingLesson] = useState<LessonData | null>(null);
  const [viewingLesson, setViewingLesson] = useState<LessonData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState<number | null>(null); // chapterId
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // 取得書本列表
  const { data: booksData } = trpc.smartBookAdmin.list.useQuery();
  const books = Array.isArray(booksData) ? booksData : [];

  // 取得章節列表（含課堂內容狀態）
  const { data: chaptersWithStatus, refetch: refetchChapters } = trpc.aiClassroomAdmin.getChaptersWithStatus.useQuery(
    { bookId: selectedBookId! },
    { enabled: !!selectedBookId }
  );

  // 更新課堂內容
  const updateLessonMutation = trpc.aiClassroomAdmin.updateLesson.useMutation({
    onSuccess: () => {
      toast.success("✅ 已儲存：課堂內容已成功更新");
      setIsEditDialogOpen(false);
      refetchChapters();
    },
    onError: (err) => {
      toast.error("❌ 儲存失敗：" + err.message);
    },
  });

  // 刪除課堂內容（觸發重新生成）
  const deleteLessonMutation = trpc.aiClassroomAdmin.deleteLesson.useMutation({
    onSuccess: () => {
      toast.success("🗑️ 已刪除：課堂內容已刪除，下次上課將重新生成");
      refetchChapters();
    },
    onError: (err) => {
      toast.error("❌ 刪除失敗：" + err.message);
    },
  });

  // 批次生成
  const batchGenerateMutation = trpc.aiClassroomAdmin.batchGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ 批次生成完成：共生成 ${data.generated} 個章節，跳過 ${data.skipped} 個已有內容`);
      setIsBatchGenerating(false);
      refetchChapters();
    },
    onError: (err) => {
      toast.error("❌ 批次生成失敗：" + err.message);
      setIsBatchGenerating(false);
    },
  });

  const handleBatchGenerate = (forceAll = false) => {
    if (!selectedBookId) return;
    setIsBatchGenerating(true);
    batchGenerateMutation.mutate({ bookId: selectedBookId, forceAll });
  };

  // 強制重新生成（呼叫 startLesson 並傳 forceRegenerate=true）
  const startLessonMutation = trpc.aiClassroom.startLesson.useMutation({
    onSuccess: () => {
      toast.success("✅ 已重新生成：課堂內容已成功重新生成並儲存");
      setIsGenerating(null);
      refetchChapters();
    },
    onError: (err) => {
      toast.error("❌ 生成失敗：" + err.message);
      setIsGenerating(null);
    },
  });

  const handleRegenerate = (chapterId: number) => {
    if (!selectedBookId) return;
    setIsGenerating(chapterId);
    startLessonMutation.mutate({ bookId: selectedBookId, chapterId, forceRegenerate: true });
  };

  const handleEdit = (chapter: { id: number; title: string }, lesson: LessonData | null) => {
    const defaultLesson: LessonData = {
      bookId: selectedBookId!,
      chapterId: chapter.id,
      intro: "",
      knowledgePoints: [{ title: "", content: "" }],
      lessonSummary: "",
      status: "ready",
      isEdited: 0,
      chapterTitle: chapter.title,
    };
    setEditingLesson(lesson ?? defaultLesson);
    setIsEditDialogOpen(true);
  };

  const handleView = (lesson: LessonData) => {
    setViewingLesson(lesson);
    setIsViewDialogOpen(true);
  };

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  // 計算統計
  const totalChapters = chaptersWithStatus?.length ?? 0;
  const readyCount = chaptersWithStatus?.filter(c => c.lesson?.status === "ready").length ?? 0;
  const editedCount = chaptersWithStatus?.filter(c => c.lesson?.isEdited === 1).length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI 課堂內容管理</h1>
        <p className="text-gray-500 mt-1 text-sm">管理各章節的 AI 課堂教學內容，可查看、編輯或重新生成</p>
      </div>

      {/* 書本選擇 */}
      <div className="mb-6 flex items-center gap-4">
        <Select
          value={selectedBookId?.toString() ?? ""}
          onValueChange={(v) => { setSelectedBookId(Number(v)); setExpandedChapters(new Set()); }}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="選擇書本..." />
          </SelectTrigger>
          <SelectContent>
            {books.map(b => (
              <SelectItem key={b.id} value={b.id.toString()}>{b.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedBookId && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                共 {totalChapters} 章節
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {readyCount} 已生成
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <Edit2 className="w-4 h-4" />
                {editedCount} 已編輯
              </span>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                disabled={isBatchGenerating}
                onClick={() => handleBatchGenerate(false)}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBatchGenerating ? 'animate-spin' : ''}`} />
                {isBatchGenerating ? '生成中...' : '批次生成未生成章節'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBatchGenerating}
                onClick={() => {
                  if (confirm(`確定要重新生成所有 ${totalChapters} 個章節的課堂內容？已編輯的內容也會被覆蓋。`)) handleBatchGenerate(true);
                }}
                className="gap-1.5 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                全部重新生成
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 章節列表 */}
      {!selectedBookId && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>請先選擇一本書</p>
        </div>
      )}

      {selectedBookId && chaptersWithStatus && (
        <div className="space-y-2">
          {chaptersWithStatus.map((ch) => {
            const lesson = ch.lesson;
            const isExpanded = expandedChapters.has(ch.id);
            const isGen = isGenerating === ch.id;

            return (
              <div key={ch.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* 章節標題列 */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleChapter(ch.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-medium text-gray-800">{ch.chapterNumber ? `${ch.chapterNumber}. ` : ""}{ch.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 狀態標籤 */}
                    {!lesson && (
                      <Badge variant="outline" className="text-gray-400 border-gray-300">
                        <Clock className="w-3 h-3 mr-1" />
                        未生成
                      </Badge>
                    )}
                    {lesson?.status === "ready" && lesson.isEdited === 0 && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        AI 生成
                      </Badge>
                    )}
                    {lesson?.status === "ready" && lesson.isEdited === 1 && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        <Edit2 className="w-3 h-3 mr-1" />
                        已編輯
                      </Badge>
                    )}
                    {lesson?.status === "pending" && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        生成中
                      </Badge>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {lesson?.status === "ready" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-500 hover:text-blue-600"
                          onClick={() => handleView(lesson as LessonData)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-500 hover:text-green-600"
                        onClick={() => handleEdit(ch, lesson ? (lesson as unknown as LessonData) : null)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-500 hover:text-purple-600"
                        disabled={isGen}
                        onClick={() => handleRegenerate(ch.id)}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGen ? "animate-spin" : ""}`} />
                      </Button>
                      {lesson && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-500 hover:text-red-500"
                          onClick={() => {
                            if (confirm("確定要刪除此章節的課堂內容嗎？下次上課將重新生成。")) {
                              if (selectedBookId) deleteLessonMutation.mutate({ bookId: selectedBookId, chapterId: ch.id });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 展開內容預覽 */}
                {isExpanded && lesson?.status === "ready" && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    {lesson.intro && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">開場白</p>
                        <p className="text-sm text-gray-700">{lesson.intro as string}</p>
                      </div>
                    )}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">知識點</p>
                      <div className="space-y-1">
                        {((lesson.knowledgePoints ?? []) as KnowledgePoint[]).map((kp, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium text-gray-700">【{i + 1}】{kp.title}</span>
                            <span className="text-gray-500 ml-2 text-xs">{kp.content.slice(0, 60)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lesson.updatedAt && (
                      <p className="text-xs text-gray-400">
                        最後更新：{new Date(lesson.updatedAt as number).toLocaleString("zh-TW")}
                      </p>
                    )}
                  </div>
                )}

                {isExpanded && !lesson && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    尚未生成課堂內容。點擊 <RefreshCw className="w-3.5 h-3.5 inline" /> 重新生成，或點擊 <Edit2 className="w-3.5 h-3.5 inline" /> 手動建立。
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 編輯 Dialog */}
      {editingLesson && (
        <EditLessonDialog
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          lesson={editingLesson}
          onSave={(data) => {
            updateLessonMutation.mutate({
              bookId: editingLesson.bookId,
              chapterId: editingLesson.chapterId,
              intro: data.intro,
              knowledgePoints: data.knowledgePoints,
              lessonSummary: data.lessonSummary,
            });
          }}
          isSaving={updateLessonMutation.isPending}
        />
      )}

      {/* 查看 Dialog */}
      {viewingLesson && (
        <ViewLessonDialog
          open={isViewDialogOpen}
          onClose={() => setIsViewDialogOpen(false)}
          lesson={viewingLesson}
        />
      )}
    </div>
  );
}

// ==================== 編輯 Dialog ====================
function EditLessonDialog({
  open, onClose, lesson, onSave, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  lesson: LessonData;
  onSave: (data: { intro: string; knowledgePoints: KnowledgePoint[]; lessonSummary: string }) => void;
  isSaving: boolean;
}) {
  const [intro, setIntro] = useState(lesson.intro ?? "");
  const [kps, setKps] = useState<KnowledgePoint[]>(
    ((lesson.knowledgePoints as KnowledgePoint[]) ?? []).length > 0
      ? lesson.knowledgePoints as KnowledgePoint[]
      : [{ title: "", content: "" }]
  );
  const [summary, setSummary] = useState(lesson.lessonSummary ?? "");

  const addKP = () => setKps(prev => [...prev, { title: "", content: "" }]);
  const removeKP = (i: number) => setKps(prev => prev.filter((_, idx) => idx !== i));
  const updateKP = (i: number, field: keyof KnowledgePoint, value: string) => {
    setKps(prev => prev.map((kp, idx) => idx === i ? { ...kp, [field]: value } : kp));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯課堂內容 — {lesson.chapterTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 開場白 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">開場白</label>
            <Textarea
              value={intro}
              onChange={e => setIntro(e.target.value)}
              placeholder="2-3 句話介紹這堂課要學什麼..."
              rows={3}
            />
          </div>

          {/* 知識點 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">知識點</label>
              <Button variant="outline" size="sm" onClick={addKP}>+ 新增知識點</Button>
            </div>
            <div className="space-y-3">
              {kps.map((kp, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">知識點 {i + 1}</span>
                    {kps.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-red-400" onClick={() => removeKP(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={kp.title}
                    onChange={e => updateKP(i, "title", e.target.value)}
                    placeholder="知識點標題..."
                  />
                  <Textarea
                    value={kp.content}
                    onChange={e => updateKP(i, "content", e.target.value)}
                    placeholder="知識點講解內容（100-150字）..."
                    rows={4}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 課程總結 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">課程總結</label>
            <Textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="條列式重點整理（3-5點）..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={() => onSave({ intro, knowledgePoints: kps, lessonSummary: summary })}
            disabled={isSaving || kps.some(kp => !kp.title || !kp.content)}
          >
            {isSaving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 查看 Dialog ====================
function ViewLessonDialog({
  open, onClose, lesson,
}: {
  open: boolean;
  onClose: () => void;
  lesson: LessonData;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>課堂內容預覽 — {lesson.chapterTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {lesson.intro && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-600 mb-1">📢 開場白</p>
              <p className="text-gray-700">{lesson.intro as string}</p>
            </div>
          )}

          {((lesson.knowledgePoints ?? []) as KnowledgePoint[]).map((kp, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-800 mb-1">【知識點 {i + 1}】{kp.title}</p>
              <p className="text-gray-600 leading-relaxed">{kp.content}</p>
            </div>
          ))}

          {lesson.lessonSummary && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-600 mb-1">📚 課程總結</p>
              <p className="text-gray-700 whitespace-pre-line">{lesson.lessonSummary as string}</p>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2 border-t">
            {lesson.isEdited ? "✏️ 已由管理員編輯" : "🤖 AI 自動生成"}
            {lesson.updatedAt && ` · ${new Date(lesson.updatedAt).toLocaleString("zh-TW")}`}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
