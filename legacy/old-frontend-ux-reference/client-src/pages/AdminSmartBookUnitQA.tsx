import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, BookOpen, FileText, MessageSquare,
  ChevronUp, ChevronDown, ChevronLeft, Eye, EyeOff, Settings, GripVertical,
  CheckCircle, Circle, AlertCircle, Coins, Sparkles, Loader2,
  Image as ImageIcon, Upload, BookMarked, Layers, X, Camera,
} from "lucide-react";
import { useLocation, useParams } from "wouter";

type QAType = "case_study" | "question" | "notice";

interface Option {
  label: string;
  text: string;
  isCorrect: boolean;
}

interface UnitQA {
  id: number;
  qaType: QAType;
  pageRef: number | null;
  caseLabel: string | null;
  displayText: string;
  questionText: string | null;
  options: Option[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  sortOrder: number;
  isActive: number;
  chapterId: number | null;
}

// ===== PDF Canvas 預覽元件（使用 PDF.js，避免 iframe 安全限制）=====
function PdfViewerCanvas({
  pdfUrl,
  currentPage,
  onPageChange,
}: {
  pdfUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);
  const renderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef(false);

  // 載入 PDF 文件
  useEffect(() => {
    if (!pdfUrl) return;
    setLoading(true);
    setRenderError(null);
    pdfDocRef.current = null;
    // 透過後端代理載入 PDF，繞過 CORS 限制
    const proxiedUrl = pdfUrl.startsWith('/') || pdfUrl.includes('/api/pdf-proxy')
      ? pdfUrl
      : `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;
    pdfjsLib.getDocument({ url: proxiedUrl, withCredentials: false }).promise
      .then((doc: any) => {
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error('PDF load error:', err);
        setRenderError('無法載入 PDF，請確認網址是否正確');
        setLoading(false);
      });
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfUrl]);

  // 渲染頁面
  useEffect(() => {
    if (loading || !pdfDocRef.current || !canvasRef.current) return;
    const renderPage = async () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }
      isRenderingRef.current = true;
      try {
        const pageNum = Math.max(1, Math.min(pdfDocRef.current.numPages, currentPage));
        const page = await pdfDocRef.current.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', e);
        }
      } finally {
        isRenderingRef.current = false;
      }
    };
    renderPage();
  }, [loading, currentPage, scale, totalPages]);

  const goTo = (p: number) => onPageChange(Math.max(1, Math.min(totalPages || 1, p)));

  // +/- 鍵控制縮放
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))));
      } else if (e.key === "-") {
        e.preventDefault();
        setScale(s => Math.max(0.5, parseFloat((s - 0.2).toFixed(1))));
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: "100%" }}>
      {/* 頁碼控制列 */}
      <div className="flex items-center gap-1 px-2 py-1 bg-white border-b text-xs flex-shrink-0">
        <button className="px-1.5 py-0.5 hover:bg-gray-100 rounded" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>←</button>
        <input
          type="number" min={1} max={totalPages || 1}
          value={currentPage}
          onChange={e => goTo(parseInt(e.target.value) || 1)}
          className="w-12 text-center border border-gray-200 rounded px-1 py-0.5"
        />
        <span className="text-gray-400">/ {totalPages}</span>
        <button className="px-1.5 py-0.5 hover:bg-gray-100 rounded" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= (totalPages || 1)}>→</button>
        <div className="ml-auto flex items-center gap-1">
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded font-bold" onClick={() => setScale(s => Math.max(0.5, parseFloat((s - 0.2).toFixed(1))))}>-</button>
          <span className="text-gray-400 min-w-[36px] text-center">{Math.round(scale * 100)}%</span>
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded font-bold" onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))}>+</button>
        </div>
      </div>
      {/* PDF 畫布 */}
      <div style={{ flex: "1 1 0", overflow: "auto", minHeight: 0 }}>
        <div className="flex justify-center p-2">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 mt-16 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> 載入 PDF 中...
            </div>
          ) : renderError ? (
            <div className="flex flex-col items-center gap-2 text-red-400 mt-16 text-sm">
              <span>⚠️ {renderError}</span>
              <span className="text-xs text-gray-400 max-w-xs text-center break-all">{pdfUrl}</span>
            </div>
          ) : (
            <canvas ref={canvasRef} className="shadow" style={{ display: 'block', maxWidth: '100%' }} />
          )}
        </div>
      </div>
    </div>
  );
}
const QA_TYPE_LABELS: Record<QAType, { label: string; icon: any; color: string }> = {
  case_study: { label: "案例學習", icon: BookOpen, color: "bg-blue-100 text-blue-700 border-blue-200" },
  question: { label: "互動問答", icon: MessageSquare, color: "bg-green-100 text-green-700 border-green-200" },
  notice: { label: "提示說明", icon: AlertCircle, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

const DEFAULT_OPTIONS: Option[] = [
  { label: "A", text: "", isCorrect: false },
  { label: "B", text: "", isCorrect: false },
  { label: "C", text: "", isCorrect: false },
  { label: "D", text: "", isCorrect: false },
];

export default function AdminSmartBookUnitQA() {
  const [location, navigate] = useLocation();
  const routeParams = useParams<{ bookId?: string }>();
  const queryParams = new URLSearchParams(location.split("?")[1] || "");
  // 支援路徑參數 /admin/smart-book-unit-qa/:bookId 和 query string ?bookId=xxx
  const bookId = parseInt(routeParams.bookId || queryParams.get("bookId") || "0");
  const bookTitle = decodeURIComponent(queryParams.get("title") || "");

  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [editingQA, setEditingQA] = useState<UnitQA | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 表單狀態
  const [form, setForm] = useState({
    qaType: "question" as QAType,
    pageRef: "",
    caseLabel: "",
    displayText: "",
    questionText: "",
    options: DEFAULT_OPTIONS.map(o => ({ ...o })),
    correctAnswer: "",
    explanation: "",
    sortOrder: 0,
    isActive: true,
  });

  // 書本設定
  const [settingsForm, setSettingsForm] = useState({
    initialCredits: 30,
    verifyBonusCredits: 1,
    questionCost: 1,
    challengeEnabled: true,
    challengeQuestionCount: 5,
    challengeRewardCredits: 3,
    chapterVerifyEnabled: true,
  });

  const { data: chaptersData } = trpc.smartBookStudent.getChapters.useQuery(
    { bookId },
    { enabled: bookId > 0 }
  );
  const chapters = chaptersData?.chapters ?? [];

  const { data: qaList, refetch } = trpc.smartBookLearningAdmin.listUnitQA.useQuery(
    { bookId, chapterId: selectedChapterId },
    { enabled: bookId > 0 }
  );

  const { data: settings, refetch: refetchSettings } = trpc.smartBookLearningAdmin.getSettings.useQuery(
    { bookId },
    { enabled: bookId > 0 }
  );
  // 設定資料載入後同步到 form（tRPC v11 useQuery 不支援 onSuccess）
  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setSettingsForm({
      initialCredits: s.initialCredits,
      verifyBonusCredits: s.verifyBonusCredits,
      questionCost: s.questionCost,
      challengeEnabled: s.challengeEnabled === 1,
      challengeQuestionCount: s.challengeQuestionCount,
      challengeRewardCredits: s.challengeRewardCredits,
      chapterVerifyEnabled: s.chapterVerifyEnabled === 1,
    });
  }, [settings]);

  const createMutation = trpc.smartBookLearningAdmin.createUnitQA.useMutation({
    onSuccess: () => { toast.success("已新增"); setShowEditor(false); refetch(); },
    onError: (e) => toast.error("新增失敗：" + e.message),
  });

  const updateMutation = trpc.smartBookLearningAdmin.updateUnitQA.useMutation({
    onSuccess: () => { toast.success("已更新"); setShowEditor(false); setEditingQA(null); refetch(); },
    onError: (e) => toast.error("更新失敗：" + e.message),
  });

  const deleteMutation = trpc.smartBookLearningAdmin.deleteUnitQA.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetch(); },
    onError: (e) => toast.error("刪除失敗：" + e.message),
  });

  const updateSettingsMutation = trpc.smartBookLearningAdmin.updateSettings.useMutation({
    onSuccess: () => { toast.success("設定已儲存"); setShowSettings(false); refetchSettings(); },
    onError: (e) => toast.error("儲存失敗：" + e.message),
  });

  // 分頁切換
  const [activeTab, setActiveTab] = useState<"qa" | "lesson">("lesson");

  // 截圖貼上選擇視窗 state
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState<string>(""); // base64 data URL
  const [screenshotMimeType, setScreenshotMimeType] = useState("image/png");
  const [screenshotHint, setScreenshotHint] = useState(""); // 圖片重點觀念說明
  const [isGeneratingFromScreenshot, setIsGeneratingFromScreenshot] = useState(false);

  // 引導式知識點狀態
  const [showLessonEditor, setShowLessonEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const initialChapterId = parseInt(queryParams.get("chapterId") || "0") || undefined;
  const [lessonSelectedChapterId, setLessonSelectedChapterId] = useState<number | undefined>(initialChapterId);
  const [currentPdfPage, setCurrentPdfPage] = useState(1); // 目前 PDF 頁碼
  const [showPdfPanel, setShowPdfPanel] = useState(false); // 是否顯示 PDF 左側面板（預設關閉省效能）
  const pdfUrl = chaptersData?.book?.pdfUrl ?? "";
  const [lessonForm, setLessonForm] = useState({
    explanation: "",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A" as "A" | "B" | "C" | "D",
    hint: "",
    imageUrl: "",
    imageHint: "",
    sortOrder: 0,
    isPublished: false,
    sourcePage: 0, // 來源 PDF 頁碼
  });
  const [lessonImagePreview, setLessonImagePreview] = useState("");
  const [isUploadingLessonImage, setIsUploadingLessonImage] = useState(false);
  const [showLessonGenDialog, setShowLessonGenDialog] = useState(false);
  const [lessonGenReplaceExisting, setLessonGenReplaceExisting] = useState(true);
  const [lessonGenCount, setLessonGenCount] = useState(10); // 生成知識點數量，預設 10 個
  const [lessonGenAutoCount, setLessonGenAutoCount] = useState(true); // AI 自動判斷題數（預設開啟）
  // 全書批次生成相關 state
  const [showBatchGenDialog, setShowBatchGenDialog] = useState(false);
  const [batchGenCount, setBatchGenCount] = useState(10);
  const [batchGenAutoCount, setBatchGenAutoCount] = useState(true); // AI 自動判斷題數（預設開啟）
  const [batchGenSkipExisting, setBatchGenSkipExisting] = useState(true);
  const [batchGenReplaceExisting, setBatchGenReplaceExisting] = useState(false);
  const [batchGenResult, setBatchGenResult] = useState<any>(null);
  // 預生成引導學習腳本相關 state
  const [expandedScriptId, setExpandedScriptId] = useState<number | null>(null); // 展開腳本的知識點 ID
  const [filterNoScript, setFilterNoScript] = useState(false); // 篩選未生成腳本
  // AI 課堂選擇題相關 state
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null); // 展開選擇題的知識點 ID
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null); // 正在編輯選擇題的知識點 ID
  const [quizEditForm, setQuizEditForm] = useState<{ question: string; options: { label: string; text: string; explanation: string }[]; correctAnswer: string } | null>(null);
  const [generatingQuizId, setGeneratingQuizId] = useState<number | null>(null); // 正在 AI 生成選擇題的知識點 ID
  const [isBatchGeneratingQuiz, setIsBatchGeneratingQuiz] = useState(false);
  // 腳本編輯相關 state
  const [editingScriptLp, setEditingScriptLp] = useState<any | null>(null); // 目前編輯腳本的知識點
  const [scriptEditForm, setScriptEditForm] = useState({ scriptIntro: '', scriptIntroAfterCorrect: '', scriptCorrect: '', scriptWrong: '' });
  const updateScriptMutation = trpc.smartBookAdmin.updateLessonScript.useMutation({
    onSuccess: () => {
      toast.success('腳本已更新！');
      setEditingScriptLp(null);
      refetchLessonPoints();
    },
    onError: (e) => toast.error('腳本更新失敗：' + e.message),
  });
  // AI 課堂選擇題 mutations
  const generateClassroomQuizMutation = trpc.lessonPointsAdmin.generateClassroomQuiz.useMutation({
    onSuccess: () => { toast.success('選擇題已生成！'); refetchLessonPoints(); setGeneratingQuizId(null); },
    onError: (e) => { toast.error('生成失敗：' + e.message); setGeneratingQuizId(null); },
  });
  const saveClassroomQuizMutation = trpc.lessonPointsAdmin.saveClassroomQuiz.useMutation({
    onSuccess: () => { toast.success('選擇題已儲存！'); refetchLessonPoints(); setEditingQuizId(null); setQuizEditForm(null); },
    onError: (e) => toast.error('儲存失敗：' + e.message),
  });
  const batchGenerateClassroomQuizMutation = trpc.lessonPointsAdmin.batchGenerateClassroomQuiz.useMutation({
    onSuccess: (data: any) => {
      toast.success(`批次生成完成！成功 ${data.generated} 個，跳過 ${data.skipped} 個`);
      setIsBatchGeneratingQuiz(false);
      refetchLessonPoints();
    },
    onError: (e) => { toast.error('批次生成失敗：' + e.message); setIsBatchGeneratingQuiz(false); },
  });
  const [showScriptGenDialog, setShowScriptGenDialog] = useState(false);
  const [scriptGenForce, setScriptGenForce] = useState(false);
  const [scriptGenPolling, setScriptGenPolling] = useState(false);
  const [scriptGenProgress, setScriptGenProgress] = useState<{ current: number; total: number; status: string; success: number; failed: number } | null>(null);
  const generateScriptsMutation = trpc.smartBookAdmin.generateLessonScripts.useMutation({
    onSuccess: (data) => {
      toast.success(`腳本預生成完成！成功 ${data.success} 個，失敗 ${data.failed} 個`);
      setShowScriptGenDialog(false);
      setScriptGenPolling(false);
      setScriptGenProgress(null);
      refetchLessonPoints();
    },
    onError: (e) => {
      toast.error('腳本預生成失敗：' + e.message);
      setScriptGenPolling(false);
    },
  });
  // 輪詢腳本生成進度
  const { data: scriptProgressData } = trpc.smartBookAdmin.getLessonScriptProgress.useQuery(
    { bookId },
    { enabled: scriptGenPolling && bookId > 0, refetchInterval: scriptGenPolling ? 3000 : false }
  );
  // 同步進度資料
  useEffect(() => {
    if (scriptProgressData) {
      setScriptGenProgress(scriptProgressData);
      if (scriptProgressData.status === 'done_script') {
        setScriptGenPolling(false);
        toast.success(`腳本預生成完成！成功 ${scriptProgressData.success} 個，失敗 ${scriptProgressData.failed} 個`);
        refetchLessonPoints();
      }
    }
  }, [scriptProgressData]);

  const [showReformatDialog, setShowReformatDialog] = useState(false);
  const [reformatDryRun, setReformatDryRun] = useState(true);
  const [reformatResult, setReformatResult] = useState<any>(null);
  const reformatMutation = trpc.lessonPointsAdmin.reformatQuestions.useMutation({
    onSuccess: (data) => {
      setReformatResult(data);
      if (!reformatDryRun) {
        refetchLessonPoints();
        toast.success(`已重新整理 ${data.updated} 個知識點格式（去口語化）`);
      } else {
        toast.info(`預覽模式：將整理 ${data.total} 個知識點，本次預覽前 ${data.processed} 個`);
      }
    },
    onError: (e) => toast.error('重新整理失敗：' + e.message),
  });

  const batchGenerateMutation = trpc.lessonPointsAdmin.batchGenerateByBook.useMutation({
    onSuccess: (data) => {
      setBatchGenResult(data);
      refetchLessonPoints();
      toast.success(`全書批次生成完成！共生成 ${data.totalGenerated} 個知識點，跳過 ${data.totalSkipped} 個章節`);
    },
    onError: (e) => toast.error('批次生成失敗：' + e.message),
  });
  // 取得引導式知識點列表
  const { data: lessonPointsData, refetch: refetchLessonPoints } = trpc.lessonPointsAdmin.list.useQuery(
    { chapterId: lessonSelectedChapterId, bookId },
    { enabled: bookId > 0 && activeTab === "lesson" }
  );
  const lessonPointsList = lessonPointsData?.lessonPoints ?? [];

  // 引導式知識點 mutations
  const createLessonMutation = trpc.lessonPointsAdmin.create.useMutation({
    onSuccess: () => { toast.success("已新增知識點"); setShowLessonEditor(false); refetchLessonPoints(); },
    onError: (e) => toast.error("新增失敗：" + e.message),
  });
  const updateLessonMutation = trpc.lessonPointsAdmin.update.useMutation({
    onSuccess: () => { toast.success("已更新知識點"); setShowLessonEditor(false); setEditingLesson(null); refetchLessonPoints(); },
    onError: (e) => toast.error("更新失敗：" + e.message),
  });
  const deleteLessonMutation = trpc.lessonPointsAdmin.delete.useMutation({
    onSuccess: () => { toast.success("已刪除知識點"); refetchLessonPoints(); },
    onError: (e) => toast.error("刪除失敗：" + e.message),
  });
  const clearAllLessonsMutation = trpc.lessonPointsAdmin.clearAllByBook.useMutation({
    onSuccess: () => { toast.success("已清除所有知識點"); refetchLessonPoints(); },
    onError: (e) => toast.error("清除失敗：" + e.message),
  });
  const generateLessonsMutation = trpc.lessonPointsAdmin.generateByAI.useMutation({
    onSuccess: (data: any) => {
      toast.success(`AI 已生成 ${data.generated} 個知識點！`);
      setShowLessonGenDialog(false);
      refetchLessonPoints();
    },
    onError: (e) => toast.error("AI 生成失敗：" + e.message),
  });
  const publishChapterMutation = trpc.lessonPointsAdmin.publishChapter.useMutation({
    onSuccess: () => {
      toast.success("已發布所有知識點！學生現在可以看到引導式學習");
      refetchLessonPoints();
    },
    onError: (e) => toast.error("發布失敗：" + e.message),
  });
  const publishAllMutation = trpc.lessonPointsAdmin.publishAllChapters.useMutation({
    onSuccess: (data: any) => {
      toast.success(`全書一鍵發布完成！共 ${data.total} 個知識點已發布，學生現在可以看到引導式學習`);
      refetchLessonPoints();
    },
    onError: (e) => toast.error("全書發布失敗：" + e.message),
  });
  const uploadLessonImageMutation = trpc.lessonPointsAdmin.uploadImage.useMutation({
    onSuccess: (data: any) => {
      setLessonForm(f => ({ ...f, imageUrl: data.url }));
      setIsUploadingLessonImage(false);
      toast.success("圖片上傳成功");
    },
    onError: (e) => { setIsUploadingLessonImage(false); toast.error("圖片上傳失敗：" + e.message); },
  });

  // 截圖上傳到 S3 mutation
  const uploadScreenshotMutation = trpc.lessonPointsAdmin.uploadImage.useMutation({
    onError: (e) => toast.error("截圖上傳失敗：" + e.message),
  });

  // 全局 paste 事件監聽（在 lesson tab 下，或截圖 Dialog 已開啟時啟動）
  const handleGlobalPaste = React.useCallback((e: ClipboardEvent) => {
    if (activeTab !== "lesson" && !showScreenshotDialog) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setScreenshotBase64(dataUrl);
          setScreenshotMimeType(item.type);
          setScreenshotHint("");
          setShowScreenshotDialog(true);
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  }, [activeTab, showScreenshotDialog]);

  React.useEffect(() => {
    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, [handleGlobalPaste]);
  // 鍵盤快捷鍵：左右鍵翻頁，+/- 縮放（只在 PDF 面板顯示時有效）
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦點在輸入框，不攔截
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (!showPdfPanel || !pdfUrl) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPdfPage(prev => {
          const total = (chaptersData?.book as any)?.totalPages || 999;
          if (e.key === "ArrowLeft") return Math.max(1, prev - 1);
          return Math.min(total, prev + 1);
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showPdfPanel, pdfUrl, chaptersData]);

  // 用截圖 AI 生成新知識點
  const handleGenerateFromScreenshot = async () => {
    if (!lessonSelectedChapterId) {
      toast.error("請先選擇章節");
      return;
    }
    if (!screenshotBase64) return;
    setIsGeneratingFromScreenshot(true);
    try {
      // 1. 先上傳截圖到 S3
      const base64Data = screenshotBase64.split(",")[1];
      const uploadResult = await uploadScreenshotMutation.mutateAsync({ base64: base64Data, mimeType: screenshotMimeType });
      const imageUrl = uploadResult.url;
      // 2. 用圖片 URL 呼叫 AI 生成知識點
      await generateLessonsMutation.mutateAsync({
        bookId,
        chapterId: lessonSelectedChapterId,
        count: 1,
        imageUrl,
        imageHint: screenshotHint || undefined,
        replaceExisting: false,
      });
      setShowScreenshotDialog(false);
      setScreenshotBase64("");
      setScreenshotHint("");
      toast.success("已根據截圖生成新知識點！");
    } catch (e: any) {
      toast.error("生成失敗：" + e.message);
    } finally {
      setIsGeneratingFromScreenshot(false);
    }
  };

  // 用截圖貼入現有知識點的圖片
  const handlePasteToLesson = async (lessonId: number) => {
    if (!screenshotBase64) return;
    setIsGeneratingFromScreenshot(true);
    try {
      const base64Data = screenshotBase64.split(",")[1];
      const uploadResult = await uploadScreenshotMutation.mutateAsync({ base64: base64Data, mimeType: screenshotMimeType });
      const imageUrl = uploadResult.url;
      await updateLessonMutation.mutateAsync({
        id: lessonId,
        imageUrl,
        imageHint: screenshotHint || null,
      });
      setShowScreenshotDialog(false);
      setScreenshotBase64("");
      setScreenshotHint("");
      toast.success("圖片已更新到知識點！");
    } catch (e: any) {
      toast.error("更新失敗：" + e.message);
    } finally {
      setIsGeneratingFromScreenshot(false);
    }
  };

  const resetMyProgressMutation = trpc.lessonPointsAdmin.resetMyProgress.useMutation({
    onSuccess: (data: any) => {
      toast.success(`已清空 ${data.cleared} 筆學習進度，現在可以重新測試學生視角！`);
      refetchLessonPoints();
    },
    onError: (e) => toast.error("清空進度失敗：" + e.message),
  });

  const handleLessonImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLessonImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // 上傳圖片
    setIsUploadingLessonImage(true);
    const reader2 = new FileReader();
    reader2.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadLessonImageMutation.mutate({ base64, mimeType: file.type });
    };
    reader2.readAsDataURL(file);
  };

  const openCreateLesson = (chapterId?: number) => {
    setEditingLesson(null);
    setLessonImagePreview("");
    setLessonForm({
      explanation: "",
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
      hint: "",
      imageUrl: "",
      imageHint: "",
      sortOrder: lessonPointsList.length * 10,
      isPublished: false,
      sourcePage: currentPdfPage, // 自動帶入目前 PDF 頁碼
    });
    setShowLessonEditor(true);
  };

  const openEditLesson = (lp: any) => {
    setEditingLesson(lp);
    // options 已由 list API 解析為陣列，需過濾掉「我還不太懂」選項
    const opts = Array.isArray(lp.options)
      ? lp.options.filter((o: string) => !o.includes("我還不太懂"))
      : (typeof lp.options === 'string' ? JSON.parse(lp.options || '[]') : []).filter((o: string) => !o.includes("我還不太懂"));
    const correctIdx = lp.correctIndex ?? 0;
    const correctLetters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    setLessonImagePreview(lp.imageUrl || "");
    setLessonForm({
      explanation: lp.explanation || "",
      question: lp.question || "",
      optionA: opts[0] || "",
      optionB: opts[1] || "",
      optionC: opts[2] || "",
      optionD: opts[3] || "",
      correctOption: correctLetters[correctIdx] || "A",
      hint: lp.hint || "",
      imageUrl: lp.imageUrl || "",
      imageHint: lp.imageHint || "",
      sortOrder: lp.sortOrder || 0,
      isPublished: lp.isPublished === 1,
      sourcePage: lp.sourcePage || 0,
    });
    setShowLessonEditor(true);
  };

  const handleSaveLesson = () => {
    const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const opts = [lessonForm.optionA, lessonForm.optionB, lessonForm.optionC, lessonForm.optionD].filter(Boolean);
    const correctIndex = letterToIndex[lessonForm.correctOption] ?? 0;
    if (!lessonForm.explanation || !lessonForm.question || opts.length < 2) {
      toast.error("請填寫譛解、問題和至少 2 個選項");
      return;
    }
    if (editingLesson) {
      updateLessonMutation.mutate({
        id: editingLesson.id,
        explanation: lessonForm.explanation,
        question: lessonForm.question,
        options: opts,
        correctIndex,
        hint: lessonForm.hint || null,
        imageUrl: lessonForm.imageUrl || null,
        imageHint: lessonForm.imageHint || null,
        sortOrder: lessonForm.sortOrder,
        isPublished: lessonForm.isPublished,
        sourcePage: lessonForm.sourcePage || null,
      });
    } else {
      createLessonMutation.mutate({
        chapterId: lessonSelectedChapterId || (chapters?.[0]?.id ?? 0),
        bookId,
        explanation: lessonForm.explanation,
        question: lessonForm.question,
        options: opts,
        correctIndex,
        hint: lessonForm.hint || null,
        imageUrl: lessonForm.imageUrl || null,
        imageHint: lessonForm.imageHint || null,
        needsImage: false,
        sourcePage: lessonForm.sourcePage || null,
      });
    }
  };

  // AI 自動備課
  const [showAutoGenDialog, setShowAutoGenDialog] = useState(false);
  const [autoGenReplaceExisting, setAutoGenReplaceExisting] = useState(false);
  const [autoGenPolling, setAutoGenPolling] = useState(false);
  const autoGenMutation = trpc.smartBookLearningAdmin.autoGenerateUnitQA.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || `AI 備課任務已啟動！正在為 ${data.chaptersCount} 個章節生成學習腳本，請稍後刷新頁面查看結果。`);
      setShowAutoGenDialog(false);
      // 啟動輪詢：每 5 秒自動刷新一次，最多 12 次（1 分鐘）
      setAutoGenPolling(true);
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        refetch();
        if (pollCount >= 12) {
          clearInterval(pollInterval);
          setAutoGenPolling(false);
          toast.success('AI 備課完成！請查看生成的學習項目。');
        }
      }, 5000);
    },
    onError: (e: any) => toast.error("AI 備課失敗：" + e.message),
  });

  const openCreate = () => {
    setEditingQA(null);
    setForm({
      qaType: "question",
      pageRef: "",
      caseLabel: "",
      displayText: "",
      questionText: "",
      options: DEFAULT_OPTIONS.map(o => ({ ...o })),
      correctAnswer: "",
      explanation: "",
      sortOrder: (qaList?.length || 0) * 10,
      isActive: true,
    });
    setShowEditor(true);
  };

  const openEdit = (qa: UnitQA) => {
    setEditingQA(qa);
    setForm({
      qaType: qa.qaType,
      pageRef: qa.pageRef?.toString() || "",
      caseLabel: qa.caseLabel || "",
      displayText: qa.displayText,
      questionText: qa.questionText || "",
      options: qa.options ? qa.options.map(o => ({ ...o })) : DEFAULT_OPTIONS.map(o => ({ ...o })),
      correctAnswer: qa.correctAnswer || "",
      explanation: qa.explanation || "",
      sortOrder: qa.sortOrder,
      isActive: qa.isActive === 1,
    });
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!form.displayText.trim()) {
      toast.error("請填寫顯示文字");
      return;
    }
    if (form.qaType === "question") {
      if (!form.questionText.trim()) { toast.error("請填寫問題文字"); return; }
      if (!form.correctAnswer) { toast.error("請選擇正確答案"); return; }
      const hasEmptyOption = form.options.some(o => !o.text.trim());
      if (hasEmptyOption) { toast.error("請填寫所有選項內容"); return; }
    }

    const payload = {
      bookId,
      chapterId: selectedChapterId,
      qaType: form.qaType,
      pageRef: form.pageRef ? parseInt(form.pageRef) : undefined,
      caseLabel: form.caseLabel || undefined,
      displayText: form.displayText,
      questionText: form.qaType === "question" ? form.questionText : undefined,
      options: form.qaType === "question" ? form.options : undefined,
      correctAnswer: form.qaType === "question" ? form.correctAnswer : undefined,
      explanation: form.qaType === "question" ? form.explanation : undefined,
      sortOrder: form.sortOrder,
    };

    if (editingQA) {
      updateMutation.mutate({ id: editingQA.id, ...payload, isActive: form.isActive });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({ bookId, ...settingsForm });
  };

  if (!bookId) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex items-center justify-center py-32 text-gray-400">
          <AlertCircle className="w-6 h-6 mr-2" />請從書本管理頁面進入
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="px-4 py-4">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/smart-books?editBookId=${bookId}`)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />返回
            </button>
            <div>
            <h1 className="text-xl font-bold text-gray-900">單元互動QA備課</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {bookTitle ? `《${bookTitle}》` : `書本 #${bookId}`}
              　設計案例學習、互動問答、提示說明，學生用按鈕互動學習
            </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-1" />書本設定
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setShowAutoGenDialog(true)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-1" />AI 自動備課
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />新增項目
            </Button>
          </div>
        </div>

        {/* 分頁標題 */}
        <div className="flex items-center gap-2 mb-4">
          <BookMarked className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-indigo-700">引導式知識點</h2>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">新</span>
        </div>

        {/* ===== 引導式知識點 ===== */}
        {true && (
          <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 160px)' }}>
            {/* 左側：PDF 預覽面板 */}
            {showPdfPanel && pdfUrl && (
              <div className="flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ width: "50%", minHeight: 0 }}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">📄 PDF 對照</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">📸 截圖後按 Ctrl+V 貼上</span>
                    <button
                      className="text-xs text-gray-400 hover:text-red-400 ml-1"
                      onClick={() => setShowPdfPanel(false)}
                      title="隱藏 PDF 面板"
                    >✕</button>
                  </div>
                </div>
                <div style={{ flex: "1 1 0", overflow: "hidden", minHeight: 0 }}>
                  <PdfViewerCanvas
                    pdfUrl={pdfUrl}
                    currentPage={currentPdfPage}
                    onPageChange={setCurrentPdfPage}
                  />
                </div>
              </div>
            )}
            {/* 左側面板收起時的展開按鈕 */}
            {(!showPdfPanel || !pdfUrl) && (
              <div className="flex-shrink-0">
                {pdfUrl ? (
                  <button
                    className="h-full w-8 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-300 text-xs"
                    onClick={() => setShowPdfPanel(true)}
                    title="展開 PDF 面板"
                  >
                    <span style={{ writingMode: 'vertical-rl' }}>PDF 對照</span>
                  </button>
                ) : null}
              </div>
            )}
            {/* 右側：知識點列表 */}
            <div className="flex-1 min-w-0">
            {/* 工具列 */}
            <div className="flex items-center gap-2 mb-4">
              <Select
                value={lessonSelectedChapterId?.toString() || "all"}
                onValueChange={(v) => {
                  const newId = v === "all" ? undefined : parseInt(v);
                  setLessonSelectedChapterId(newId);
                  // 跳到對應章節的 PDF 頁碼
                  if (newId && chapters) {
                    const ch = (chapters as any[]).find((c: any) => c.id === newId);
                    if (ch?.startPage) setCurrentPdfPage(ch.startPage);
                  }
                }}
              >
                <SelectTrigger className="w-52 h-9">
                  <SelectValue placeholder="全部章節" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部章節</SelectItem>
                  {(chapters || []).filter((ch: any) => !ch.parentChapterId).map((mainCh: any) => {
                    const subTopics = (chapters || []).filter((ch: any) => ch.parentChapterId === mainCh.id);
                    return (
                      <React.Fragment key={mainCh.id}>
                        <SelectItem value={String(mainCh.id)}>
                          {mainCh.title}
                        </SelectItem>
                        {subTopics.map((sub: any) => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            　　{sub.title}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-400">共 {lessonPointsList.length} 個知識點</span>
              {(() => {
                const publishedPoints = lessonPointsList.filter((lp: any) => lp.isPublished && lp.publishedAt);
                if (publishedPoints.length === 0) return null;
                const latestPublishedAt = publishedPoints.reduce((latest: any, lp: any) => {
                  return !latest || lp.publishedAt > latest.publishedAt ? lp : latest;
                }, null)?.publishedAt;
                if (!latestPublishedAt) return null;
                const displayTime = new Date(latestPublishedAt + 'Z').toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
                return (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    最後發布：{displayTime}
                  </span>
                );
              })()}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setReformatResult(null); setReformatDryRun(true); setShowReformatDialog(true); }}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  disabled={reformatMutation.isPending}
                  title="將口語化的知識點問題批次改寫為正式學術格式"
                >
                  {reformatMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />整理中...</>
                  ) : (
                    <>✏️ 重新整理格式</>
                  )}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setBatchGenResult(null); setShowBatchGenDialog(true); }}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={batchGenerateMutation.isPending}
                >
                  {batchGenerateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />批次生成中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" />全書批次生成</>
                  )}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowLessonGenDialog(true)}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  disabled={generateLessonsMutation.isPending}
                >
                  {generateLessonsMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />AI 生成中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" />AI 一鍵生成知識點</>
                  )}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowScriptGenDialog(true)}
                  className="border-teal-300 text-teal-700 hover:bg-teal-50"
                  disabled={generateScriptsMutation.isPending || scriptGenPolling}
                >
                  {(generateScriptsMutation.isPending || scriptGenPolling) ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成腳本中... {scriptGenProgress ? `${scriptGenProgress.current}/${scriptGenProgress.total}` : ''}</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" />預生成對話腳本</>
                  )}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    const noQuizCount = lessonPointsList.filter((lp: any) => !(lp as any).classroomQuiz).length;
                    const msg = noQuizCount > 0
                      ? `確定要為 ${noQuizCount} 個未生成選擇題的知識點 AI 生成選擇題？`
                      : `所有知識點已有選擇題，確定要全部重新生成？`;
                    if (confirm(msg)) {
                      setIsBatchGeneratingQuiz(true);
                      batchGenerateClassroomQuizMutation.mutate({
                        bookId,
                        chapterId: lessonSelectedChapterId,
                        overwrite: noQuizCount === 0,
                      });
                    }
                  }}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={isBatchGeneratingQuiz}
                >
                  {isBatchGeneratingQuiz ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成選擇題中...</>
                  ) : (
                    <>🎯 批次生成選擇題</>
                  )}
                </Button>
                <Button size="sm" onClick={() => {
                  setScreenshotBase64("");
                  setScreenshotHint("");
                  setShowScreenshotDialog(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" />手動新增
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    const unpublishedCount = lessonPointsList.filter((lp: any) => !lp.isPublished).length;
                    if (unpublishedCount === 0) { toast.info("所有知識點已全部發布"); return; }
                    if (confirm(`確定要一鍵發布所有未發布的 ${unpublishedCount} 個知識點？發布後學生即可看到引導式學習。`)) {
                      publishAllMutation.mutate({ bookId });
                    }
                  }}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  disabled={publishAllMutation.isPending}
                >
                  {publishAllMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />發布中...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-1" />一鍵全部發布</>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs"
                  title="清空管理員自己的學習進度，方便測試學生視角"
                  onClick={() => {
                    const scope = lessonSelectedChapterId ? '此章節' : '整本書';
                    if (confirm(`確定清空「${scope}」的學習進度？（只清空管理員自己的進度，不影響學生）`))
                      resetMyProgressMutation.mutate({
                        bookId,
                        chapterId: lessonSelectedChapterId,
                      });
                  }}
                  disabled={resetMyProgressMutation.isPending}
                >
                  {resetMyProgressMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />清空中...</>
                  ) : (
                    <>🔄 清空我的進度</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 text-xs"
                  title="刪除所有知識點，方便重新生成"
                  onClick={() => {
                    const scope = lessonSelectedChapterId ? '此章節' : '整本書';
                    const count = lessonPointsList.length;
                    if (count === 0) { toast.info('目前沒有知識點可以清除'); return; }
                    if (confirm(`確定要刪除「${scope}」的全部 ${count} 個知識點？此操作無法復原。`)) {
                      clearAllLessonsMutation.mutate({
                        bookId,
                        chapterId: lessonSelectedChapterId,
                      });
                    }
                  }}
                  disabled={clearAllLessonsMutation.isPending}
                >
                  {clearAllLessonsMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />清除中...</>
                  ) : (
                    <>🗑️ 全部清除</>
                  )}
                </Button>
              </div>
            </div>

            {/* 知識點列表 */}
            {/* 腳本篩選列 */}
            {lessonPointsList.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setFilterNoScript(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                    filterNoScript
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-orange-400 hover:text-orange-500'
                  }`}
                >
                  <span>{filterNoScript ? '✖' : '🔍'}</span>
                  {filterNoScript ? '取消篩選' : '只顯示未生成腳本'}
                  {!filterNoScript && (
                    <span className="bg-orange-100 text-orange-600 px-1.5 rounded-full">
                      {lessonPointsList.filter((lp: any) => lp.scriptStatus !== 'done').length}
                    </span>
                  )}
                </button>
                {filterNoScript && (
                  <span className="text-xs text-gray-400">
                    顯示 {lessonPointsList.filter((lp: any) => lp.scriptStatus !== 'done').length} / {lessonPointsList.length} 個未生成腳本
                  </span>
                )}
              </div>
            )}
            {lessonPointsList.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>尚未建立引導式知識點</p>
                <p className="text-xs mt-1">點擊「AI 一鍵生成知識點」或「手動新增」開始備課</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessonPointsList.filter((lp: any) => !filterNoScript || lp.scriptStatus !== 'done').map((lp: any, idx: number) => (
                  <div key={lp.id} className={`bg-white rounded-xl border p-4 ${lp.isPublished ? "border-indigo-200" : "border-gray-200"}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-800">{lp.explanation?.slice(0, 30) || "（未命名知識點）"}{lp.explanation?.length > 30 ? "..." : ""}</span>
                          {lp.isPublished ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              已發布
                              {lp.publishedAt && (
                                <span className="text-green-500 font-normal">
                                  · {new Date(lp.publishedAt + 'Z').toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">草稿</span>
                          )}
                          {lp.imageUrl && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />有圖片
                            </span>
                          )}
                          {lp.imageHint && !lp.imageUrl && (
                            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">⚠️ 需要圖片</span>
                          )}
                          {lp.sourcePage > 0 && (
                            <button
                              onClick={() => { setCurrentPdfPage(lp.sourcePage); if (!showPdfPanel) setShowPdfPanel(true); }}
                              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                              title="點擊跳轉到 PDF 對應頁"
                            >
                              📄 P.{lp.sourcePage}
                            </button>
                          )}
                          {lp.hint && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full" title={lp.hint}>
                              💡 暗示
                            </span>
                          )}
                          {/* 腳本狀態 badge */}
                          {lp.scriptStatus === 'done' ? (
                            <button
                              onClick={() => setExpandedScriptId(expandedScriptId === lp.id ? null : lp.id)}
                              className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full hover:bg-teal-200 transition-colors flex items-center gap-1"
                              title="點擊查看腳本內容"
                            >
                              <Sparkles className="w-3 h-3" />腳本已生成 {expandedScriptId === lp.id ? '▲' : '▼'}
                            </button>
                          ) : lp.scriptStatus === 'generating' ? (
                            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />生成中
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">未生成腳本</span>
                          )}
                          {/* AI 課堂選擇題 badge */}
                          {(lp as any).classroomQuiz ? (
                            <button
                              onClick={() => setExpandedQuizId(expandedQuizId === lp.id ? null : lp.id)}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full hover:bg-purple-200 transition-colors flex items-center gap-1"
                              title="點擊查看 AI 課堂選擇題"
                            >
                              🎯選擇題已備課 {expandedQuizId === lp.id ? '▲' : '▼'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setExpandedQuizId(expandedQuizId === lp.id ? null : lp.id)}
                              className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full hover:bg-purple-100 hover:text-purple-600 transition-colors"
                              title="點擊生成 AI 課堂選擇題"
                            >
                              🎯未生成選擇題
                            </button>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{lp.explanation}</p>
                        {lp.question && (
                          <p className="text-indigo-700 text-sm mt-1 font-medium">❓ {lp.question}</p>
                        )}
                        {Array.isArray(lp.options) && lp.options.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(lp.options as string[]).map((opt, i) => (
                              <span key={i} className={`text-xs px-2 py-0.5 rounded border ${i === lp.correctIndex ? "bg-green-100 text-green-700 border-green-300 font-medium" : opt.includes("不太懂") ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                {opt.slice(0, 25)}{opt.length > 25 ? "..." : ""}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* 腳本展開區塊 */}
                        {expandedScriptId === lp.id && lp.scriptStatus === 'done' && (
                          <div className="mt-3 border-t border-teal-100 pt-3 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" />預生成對話腳本
                              </p>
                              <button
                                onClick={() => {
                                  setEditingScriptLp(lp);
                                  setScriptEditForm({
                                    scriptIntro: lp.scriptIntro || '',
                                    scriptIntroAfterCorrect: lp.scriptIntroAfterCorrect || '',
                                    scriptCorrect: lp.scriptCorrect || '',
                                    scriptWrong: lp.scriptWrong || '',
                                  });
                                }}
                                className="text-xs text-teal-600 hover:text-teal-800 underline flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />編輯腳本
                              </button>
                            </div>
                            {[
                              { label: '📚 開場白（第一次進入）', key: 'scriptIntro', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                              { label: '✅ 答對後進入下一題', key: 'scriptIntroAfterCorrect', color: 'bg-green-50 border-green-200 text-green-800' },
                              { label: '🎉 答對即時鼓勵', key: 'scriptCorrect', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                              { label: '💭 答錯提示', key: 'scriptWrong', color: 'bg-orange-50 border-orange-200 text-orange-800' },
                            ].map(({ label, key, color }) => (
                              <div key={key} className={`rounded-lg border p-2.5 ${color}`}>
                                <p className="text-xs font-medium mb-1 opacity-70">{label}</p>
                                <p className="text-xs leading-relaxed">{(lp as any)[key] || <span className="italic opacity-50">（未生成）</span>}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* AI 課堂選擇題區塊 */}
                        {expandedQuizId === lp.id && (
                          <div className="mt-3 border-t border-purple-100 pt-3">
                            {editingQuizId === lp.id && quizEditForm ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-purple-700 mb-2">✏️ 編輯選擇題</p>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">題目</label>
                                  <Textarea
                                    value={quizEditForm.question}
                                    onChange={e => setQuizEditForm(f => f ? { ...f, question: e.target.value } : f)}
                                    className="text-sm min-h-[60px]"
                                  />
                                </div>
                                {quizEditForm.options.map((opt, oi) => (
                                  <div key={opt.label} className="border rounded-lg p-2 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        quizEditForm.correctAnswer === opt.label ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                                      }`}>{opt.label}</span>
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={e => setQuizEditForm(f => f ? { ...f, options: f.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o) } : f)}
                                        className="flex-1 text-xs border rounded px-2 py-1"
                                        placeholder="選項文字"
                                      />
                                      <button
                                        onClick={() => setQuizEditForm(f => f ? { ...f, correctAnswer: opt.label } : f)}
                                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                          quizEditForm.correctAnswer === opt.label
                                            ? 'bg-green-100 text-green-700 border-green-300'
                                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-green-300'
                                        }`}
                                      >
                                        {quizEditForm.correctAnswer === opt.label ? '✓ 正確' : '設為正確'}
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={opt.explanation}
                                      onChange={e => setQuizEditForm(f => f ? { ...f, options: f.options.map((o, i) => i === oi ? { ...o, explanation: e.target.value } : o) } : f)}
                                      className="w-full text-xs border rounded px-2 py-1 text-gray-500"
                                      placeholder="選項解釋"
                                    />
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" className="text-xs h-7" onClick={() => saveClassroomQuizMutation.mutate({ id: lp.id, quiz: quizEditForm })} disabled={saveClassroomQuizMutation.isPending}>
                                    {saveClassroomQuizMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '儲存'}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setEditingQuizId(null); setQuizEditForm(null); }}>取消</Button>
                                </div>
                              </div>
                            ) : (lp as any).classroomQuiz ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-semibold text-purple-700">🎯 AI 課堂選擇題</p>
                                  <button
                                    onClick={() => { setEditingQuizId(lp.id); setQuizEditForm((lp as any).classroomQuiz); }}
                                    className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                                  >
                                    <Pencil className="w-3 h-3" />編輯
                                  </button>
                                </div>
                                <p className="text-sm font-medium text-gray-800">{(lp as any).classroomQuiz.question}</p>
                                <div className="space-y-1">
                                  {((lp as any).classroomQuiz.options as { label: string; text: string; explanation: string }[]).map(opt => (
                                    <div key={opt.label} className={`rounded-lg border p-2 ${
                                      (lp as any).classroomQuiz.correctAnswer === opt.label
                                        ? 'bg-green-50 border-green-300'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="flex items-start gap-2">
                                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                          (lp as any).classroomQuiz.correctAnswer === opt.label ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                                        }`}>{opt.label}</span>
                                        <div>
                                          <p className="text-xs font-medium text-gray-800">{opt.text}</p>
                                          <p className="text-xs text-gray-500 mt-0.5">{opt.explanation}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {(lp as any).classroomQuizGeneratedAt && (
                                  <p className="text-xs text-gray-400">生成時間：{new Date((lp as any).classroomQuizGeneratedAt + 'Z').toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-xs text-gray-400 mb-2">尚未生成 AI 課堂選擇題</p>
                                <Button
                                  size="sm" className="text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white"
                                  onClick={() => { setGeneratingQuizId(lp.id); generateClassroomQuizMutation.mutate({ id: lp.id }); }}
                                  disabled={generatingQuizId === lp.id}
                                >
                                  {generatingQuizId === lp.id ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />生成中...</> : <><Sparkles className="w-3 h-3 mr-1" />AI 生成選擇題</>}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          className={`h-8 w-8 p-0 ${!lessonSelectedChapterId ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title={!lessonSelectedChapterId ? '請先選擇章節才能編輯' : '編輯知識點'}
                          onClick={() => {
                            if (!lessonSelectedChapterId) {
                              toast.error('請先選擇章節才能編輯');
                              return;
                            }
                            navigate(`/admin/lesson-point-edit/${bookId}/${lp.id}`);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                          onClick={() => { if (confirm("確定刪除此知識點？")) deleteLessonMutation.mutate({ id: lp.id }); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

      </div>

      {/* 引導式知識點編輯 Dialog */}
      <Dialog open={showLessonEditor} onOpenChange={setShowLessonEditor}>
        <DialogContent
          className="!max-w-none !w-screen !h-screen !max-h-screen !rounded-none !border-0 p-0 overflow-hidden flex flex-col top-0 left-0 !translate-x-0 !translate-y-0"
          showCloseButton={false}
        >
          {/* 標題列 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-800">{editingLesson ? "編輯知識點" : "新增知識點"}</span>
            </div>
          </div>
          {/* 左右分割內容 */}
          <div className="flex flex-1 overflow-hidden">
            {/* 左側：PDF 預覽 */}
            {pdfUrl ? (
              <div className="w-1/2 flex flex-col border-r border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600">📄 PDF 對照</span>
                  <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">📸 截圖後按 Ctrl+V 貼上</span>
                </div>
                <div style={{ flex: "1 1 0", overflow: "hidden", minHeight: 0 }}>
                  <PdfViewerCanvas
                    pdfUrl={pdfUrl}
                    currentPage={currentPdfPage}
                    onPageChange={setCurrentPdfPage}
                  />
                </div>
              </div>
            ) : (
              <div className="w-1/2 flex items-center justify-center border-r border-gray-200 bg-gray-50 text-gray-400 text-sm">
                <div className="text-center">
                  <div className="text-3xl mb-2">📄</div>
                  <p>此書本尚未設定 PDF</p>
                  <p className="text-xs mt-1">可在「書本設定」中上傳 PDF</p>
                </div>
              </div>
            )}
            {/* 右側：編輯表單 */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {/* 章節選擇 */}
            {!editingLesson && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">所屬章節 <span className="text-red-500">*</span></label>
                <Select
                  value={lessonSelectedChapterId?.toString() || ""}
                  onValueChange={(v) => setLessonSelectedChapterId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇章節" />
                  </SelectTrigger>
                  <SelectContent>
                    {(chapters || []).map((ch: any, chIdx: number) => (
                      <SelectItem key={ch.id} value={String(ch.id)}>
                        第 {chIdx + 1} 章：{ch.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 圖片上傳 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                圖片 <span className="text-gray-400 font-normal">（選填，適合圖表多的科目）</span>
              </label>
              {lessonImagePreview ? (
                <div className="relative">
                  <img src={lessonImagePreview} alt="預覽" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
                  <button
                    onClick={() => { setLessonImagePreview(""); setLessonForm(f => ({ ...f, imageUrl: "" })); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  {isUploadingLessonImage ? (
                    <><Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-1" /><span className="text-xs text-gray-500">上傳中...</span></>
                  ) : (
                    <><Upload className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-500">點擊上傳圖表截圖</span></>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLessonImageSelect} />
                </label>
              )}
              <div className="mt-2">
                <Input
                  placeholder="圖片說明提示（選填，例如：第三章供需曲線圖）"
                  value={lessonForm.imageHint}
                  onChange={e => setLessonForm(f => ({ ...f, imageHint: e.target.value }))}
                />
              </div>
            </div>

            {/* 家教口吻講解 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                家教口吻講解 <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">（2～4 句，口語化說明重點）</span>
              </label>
              <Textarea
                placeholder="例如：成本原則說明資產要用當初買的時候花的錢來記，不是現在的市值。舉個例子：你 10 年前買了辦公室花了 500 萬，現在漲到 1000 萬，帳上還是記 500 萬，這樣才客觀可查。"
                value={lessonForm.explanation}
                onChange={e => setLessonForm(f => ({ ...f, explanation: e.target.value }))}
                rows={4}
              />
            </div>

            {/* 引導問題 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                引導問題 <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">（「你覺得...」語氣）</span>
              </label>
              <Input
                placeholder="例如：那你覺得，為什麼會計要用當初買的成本來記，而不是現在的市值呢？"
                value={lessonForm.question}
                onChange={e => setLessonForm(f => ({ ...f, question: e.target.value }))}
              />
            </div>

            {/* 選項設計 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                選項設計 <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">（點擊字母設定正確答案）</span>
              </label>
              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <button
                      onClick={() => setLessonForm(f => ({ ...f, correctOption: key }))}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${lessonForm.correctOption === key ? "bg-green-500 border-green-500 text-white" : "border-gray-300 text-gray-500 hover:border-green-400"}`}
                    >
                      {key}
                    </button>
                    <Input
                      placeholder={`選項 ${key} 的內容`}
                      value={lessonForm[`option${key}` as keyof typeof lessonForm] as string}
                      onChange={e => setLessonForm(f => ({ ...f, [`option${key}`]: e.target.value }))}
                      className={lessonForm.correctOption === key ? "border-green-300 bg-green-50" : ""}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">系統會自動加入「我還不懂，再解釋一次」選項</p>
            </div>

            {/* 暗示提示 (hint) */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                暗示提示 <span className="text-gray-400 font-normal">（選填，答錯時顯示給學生的暗示，不直接給答案）</span>
              </label>
              <Input
                placeholder="例如：提示一下，想想「客觀」是什麼意思？為什麼会計要用「成本」而不是「市値」來記載？"
                value={lessonForm.hint}
                onChange={e => setLessonForm(f => ({ ...f, hint: e.target.value }))}
              />
            </div>

            {/* 來源頁數 + 排序 + 發布 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  📄 PDF 來源頁數
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="頁碼"
                  value={lessonForm.sourcePage || ""}
                  onChange={e => setLessonForm(f => ({ ...f, sourcePage: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">排序數字（小的在前）</label>
                <Input
                  type="number"
                  value={lessonForm.sortOrder}
                  onChange={e => setLessonForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setLessonForm(f => ({ ...f, isPublished: !f.isPublished }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${lessonForm.isPublished ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                >
                  {lessonForm.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {lessonForm.isPublished ? "已發布" : "草稿"}
                </button>
              </div>
            </div>
          </div>
              </div>
              {/* 底部按鈕列 */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 flex-shrink-0">
                <Button variant="outline" onClick={() => setShowLessonEditor(false)}>取消</Button>
                <Button
                  onClick={handleSaveLesson}
                  disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingLesson ? "儲存修改" : "新增知識點"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI 生成知識點 Dialog */}
      <Dialog open={showLessonGenDialog} onOpenChange={setShowLessonGenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI 一鍵生成引導式知識點
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* AI 生成中進度動畫 */}
            {generateLessonsMutation.isPending && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex flex-col items-center gap-3">
                <div className="relative w-16 h-16">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                  <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-indigo-700">AI 正在分析課本內容...</p>
                  <p className="text-xs text-indigo-500 mt-1">生成 {lessonGenCount} 個知識點，請勿關閉此視窗</p>
                </div>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            {!generateLessonsMutation.isPending && <>
              <p className="text-sm text-gray-600">
                AI 將分析
                {lessonSelectedChapterId
                  ? `所選章節`
                  : `所有章節`
                }
                的課本內容，自動生成：
              </p>
              <ul className="text-sm text-gray-700 space-y-1 pl-4 list-disc">
                <li>知識點標題</li>
                <li>家教口吻講解（2～4 句）</li>
                <li>引導式問題（「你覺得...」語氣）</li>
                <li>A/B/C/D 四個選項 + 正確答案</li>
                <li>標記需要圖片的知識點（⚠️）</li>
              </ul>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700">
                💡 生成後可逐段微調文字，或上傳圖片補充圖表說明
              </div>
              {/* 數量控制 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  生成數量
                  {!lessonGenAutoCount && <span className="ml-2 text-indigo-600 font-bold text-base">{lessonGenCount} 個</span>}
                  {lessonGenAutoCount && <span className="ml-2 text-green-600 font-bold text-sm">AI 自動判斷（依章節重點，3~12 題）</span>}
                </label>
                {/* 自動依頁數計算選項 */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="lessonAutoCount"
                    checked={lessonGenAutoCount}
                    onChange={e => setLessonGenAutoCount(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="lessonAutoCount" className="text-sm text-green-700 cursor-pointer font-medium">
                    ✨ AI 自動判斷題數（依章節重點決定，3~12 題，建議）
                  </label>
                </div>
                {!lessonGenAutoCount && (
                  <>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={lessonGenCount}
                        onChange={e => setLessonGenCount(parseInt(e.target.value))}
                        className="flex-1 accent-indigo-600"
                      />
                      <div className="flex gap-1">
                        {[5, 10, 15, 20].map(n => (
                          <button
                            key={n}
                            onClick={() => setLessonGenCount(n)}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                              lessonGenCount === n
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">建議：5 個（精簡）、10 個（標準章節）、15–20 個（完整備課）</p>
                  </>
                )}
                {lessonGenAutoCount && (
                  <p className="text-xs text-green-600 mt-1">根據章節頁數自動計算，最少 3 個、最多 15 個，避免重複</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lessonReplaceExisting"
                  checked={lessonGenReplaceExisting}
                  onChange={e => setLessonGenReplaceExisting(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="lessonReplaceExisting" className="text-sm font-medium text-red-600 cursor-pointer">
                  🗑️ 清除現有知識點，重新生成（建議勾選）
                </label>
              </div>
            </>
            }
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLessonGenDialog(false)}>取消</Button>
            <Button
              onClick={() => generateLessonsMutation.mutate({
                bookId,
                chapterId: lessonSelectedChapterId ?? (chapters?.[0]?.id ?? 0),
                count: lessonGenCount,
                autoCount: lessonGenAutoCount,
                replaceExisting: lessonGenReplaceExisting
              })}
              disabled={generateLessonsMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {generateLessonsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />AI 生成中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" />開始生成</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 全書批次生成 Dialog */}
      <Dialog open={showBatchGenDialog} onOpenChange={(open) => { if (!batchGenerateMutation.isPending) setShowBatchGenDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              全書批次生成知識點
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!batchGenResult ? (
              <>
                {batchGenerateMutation.isPending ? (
                  /* 生成中等待畫面 */
                  <div className="py-6 flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-800">✨ AI 正在生成中，請耐心等候</p>
                      <p className="text-sm text-gray-500 mt-1">共 {(chapters || []).length} 個章節，預估需要 {Math.ceil((chapters || []).length * 5)} 秒</p>
                      <p className="text-xs text-amber-600 mt-2">請勿關閉此視窗，否則生成會中斷</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse" style={{ width: '100%' }} />
                    </div>
                  </div>
                ) : (
                <>
                <p className="text-sm text-gray-600">
                  AI 將自動為此書本的 <span className="font-semibold text-purple-700">{(chapters || []).length} 個章節</span>逐一生成引導式知識點。
                </p>
                {/* 數量控制 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    每章節生成數量
                    {!batchGenAutoCount && <span className="ml-2 text-purple-600 font-bold text-base">{batchGenCount} 個</span>}
                    {batchGenAutoCount && <span className="ml-2 text-green-600 font-bold text-sm">AI 自動判斷（依章節重點，3~12 題）</span>}
                  </label>
                  {/* 自動依頁數計算選項 */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="batchAutoCount"
                      checked={batchGenAutoCount}
                      onChange={e => setBatchGenAutoCount(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="batchAutoCount" className="text-sm text-green-700 cursor-pointer font-medium">
                      ✨ AI 自動判斷題數（依章節重點決定，3~12 題，建議）
                    </label>
                  </div>
                  {!batchGenAutoCount && (
                    <>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={1} max={30} step={1}
                          value={batchGenCount}
                          onChange={e => setBatchGenCount(parseInt(e.target.value))}
                          className="flex-1 accent-purple-600"
                        />
                        <div className="flex gap-1">
                          {[5, 10, 15, 20].map(n => (
                            <button key={n} onClick={() => setBatchGenCount(n)}
                              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                batchGenCount === n ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                              }`}>{n}</button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">預計共生成 <span className="text-purple-600 font-medium">{(chapters || []).length * batchGenCount} 個</span>知識點</p>
                    </>
                  )}
                  {batchGenAutoCount && (
                    <p className="text-xs text-green-600 mt-1">根據每個章節頁數自動計算，最少 5 個、最多 30 個，內容越多頁數越多知識點</p>
                  )}
                </div>
                {/* 跳過選項 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="batchSkipExisting"
                      checked={batchGenSkipExisting}
                      onChange={e => { setBatchGenSkipExisting(e.target.checked); if (e.target.checked) setBatchGenReplaceExisting(false); }}
                      className="rounded" />
                    <label htmlFor="batchSkipExisting" className="text-sm text-gray-600 cursor-pointer">
                      跳過已有知識點的章節（建議勾選）
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="batchReplaceExisting"
                      checked={batchGenReplaceExisting}
                      onChange={e => { setBatchGenReplaceExisting(e.target.checked); if (e.target.checked) setBatchGenSkipExisting(false); }}
                      className="rounded" />
                    <label htmlFor="batchReplaceExisting" className="text-sm text-red-600 cursor-pointer">
                      清除所有章節的現有知識點，全部重新生成（不可復原）
                    </label>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  ⚠️ 批次生成會逐章節呼叫 AI，章節越多時間越長。{(chapters || []).length} 個章節約需 {Math.ceil((chapters || []).length * 5)} 秒。
                </div>
                </>
                )}
              </>
            ) : (
              /* 生成結果 */
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{batchGenResult.totalGenerated}</div>
                    <div className="text-xs text-green-700">已生成知識點</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-500">{batchGenResult.totalSkipped}</div>
                    <div className="text-xs text-gray-600">跳過章節</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-500">{batchGenResult.totalErrors}</div>
                    <div className="text-xs text-red-600">失敗章節</div>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {batchGenResult.results.map((r: any) => (
                    <div key={r.chapterId} className="flex items-center gap-2 text-sm py-1 border-b border-gray-100">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                        r.error ? 'bg-red-100 text-red-600' : r.skipped ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'
                      }`}>
                        {r.error ? '✕' : r.skipped ? '−' : '✓'}
                      </span>
                      <span className="flex-1 truncate text-gray-700">{r.chapterTitle}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {r.error ? r.error : r.skipped ? '跳過' : `+${r.generated} 個`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {!batchGenResult ? (
              <>                
                <Button variant="outline" onClick={() => setShowBatchGenDialog(false)} disabled={batchGenerateMutation.isPending}>取消</Button>
                <Button
                  onClick={() => batchGenerateMutation.mutate({ bookId, count: batchGenCount, autoCount: batchGenAutoCount, replaceExisting: batchGenReplaceExisting, skipExisting: batchGenSkipExisting })}
                  disabled={batchGenerateMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {batchGenerateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />AI 生成中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" />開始全書生成</>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowBatchGenDialog(false)} className="bg-purple-600 hover:bg-purple-700">完成</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 預生成對話腳本 Dialog */}
      <Dialog open={showScriptGenDialog} onOpenChange={(open) => { if (!generateScriptsMutation.isPending && !scriptGenPolling) setShowScriptGenDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              預生成引導學習對話腳本
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(generateScriptsMutation.isPending || scriptGenPolling) ? (
              <div className="py-6 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-teal-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">✨ AI 正在生成對話腳本</p>
                  {scriptGenProgress && (
                    <p className="text-sm text-gray-500 mt-1">
                      進度：{scriptGenProgress.current} / {scriptGenProgress.total}（成功 {scriptGenProgress.success} 個，失敗 {scriptGenProgress.failed} 個）
                    </p>
                  )}
                  <p className="text-xs text-amber-600 mt-2">請勿關閉此視窗</p>
                </div>
                {scriptGenProgress && (
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all"
                      style={{ width: `${Math.round((scriptGenProgress.current / scriptGenProgress.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  AI 將為此書本的所有知識點預先生成固定的對話腳本，包含：
                </p>
                <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                  <li>📚 開場白（第一次進入：純粹引導翻書，不提上一題）</li>
                  <li>✅ 答對後過渡語（含鼓勵 + 引導翻書）</li>
                  <li>🎉 答對即時鼓勵語（1-2 句）</li>
                  <li>💭 答錯提示引導（不直接給答案）</li>
                </ul>
                <p className="text-sm text-gray-500">學習時直接讀取預先生成的腳本，不再即時呼叫 AI，回覆更快且穩定。</p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scriptGenForce"
                    checked={scriptGenForce}
                    onChange={e => setScriptGenForce(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="scriptGenForce" className="text-sm text-red-600 cursor-pointer">
                    強制重新生成所有知識點（包含已有腳本的）
                  </label>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
                  ℹ️ 每個知識點會呼叫一次 AI，知識點越多時間越長。建議在發布知識點後再執行。
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            {!(generateScriptsMutation.isPending || scriptGenPolling) && (
              <>
                <Button variant="outline" onClick={() => setShowScriptGenDialog(false)}>取消</Button>
                <Button
                  onClick={() => {
                    setScriptGenPolling(true);
                    generateScriptsMutation.mutate({ bookId, force: scriptGenForce });
                  }}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Sparkles className="w-4 h-4 mr-1" />開始預生成
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 截圖貼上選擇視窗 */}
      <Dialog open={showScreenshotDialog} onOpenChange={(open) => { if (!isGeneratingFromScreenshot) setShowScreenshotDialog(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              新增圖片知識點
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 無圖時：提示貼圖 */}
            {!screenshotBase64 && (
              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50">
                <Camera className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <p className="text-indigo-700 font-semibold">請截圖後按 Ctrl+V 貼上圖片</p>
                <p className="text-sm text-indigo-400 mt-1">貼上後 AI 將自動分析圖片內容</p>
              </div>
            )}
            {/* 有圖時：截圖預覽 + 說明文字 + 生成按鈕 */}
            {screenshotBase64 && (
              <>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img src={screenshotBase64} alt="截圖預覽" className="w-full max-h-64 object-contain" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    📝 說明文字（選填，AI 分析圖片時會參考）
                  </label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    rows={3}
                    placeholder="例如：這張圖表說明了會計的三大功能，重點在記錄、分類、報告三個面向"
                    value={screenshotHint}
                    onChange={e => setScreenshotHint(e.target.value)}
                    disabled={isGeneratingFromScreenshot}
                  />
                </div>
                {!lessonSelectedChapterId && <p className="text-xs text-red-500">❗ 請先在右側選擇章節才能生成知識點</p>}
                <Button
                  className="w-full"
                  onClick={handleGenerateFromScreenshot}
                  disabled={isGeneratingFromScreenshot || !lessonSelectedChapterId}
                >
                  {isGeneratingFromScreenshot ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 生成中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />AI 分析圖片並生成知識點</>
                  )}
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScreenshotDialog(false)} disabled={isGeneratingFromScreenshot}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯/新增 Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQA ? "編輯項目" : "新增項目"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 類型選擇 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">項目類型</label>
              <div className="flex gap-2">
                {(["case_study", "question", "notice"] as QAType[]).map((type) => {
                  const info = QA_TYPE_LABELS[type];
                  const Icon = info.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, qaType: type }))}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${form.qaType === type ? info.color + " border-current" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      <Icon className="w-4 h-4" />{info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 頁碼 + 案例標籤 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  參考頁碼 <span className="text-gray-400 font-normal">（選填）</span>
                </label>
                <Input
                  type="number"
                  placeholder="例如：35"
                  value={form.pageRef}
                  onChange={e => setForm(f => ({ ...f, pageRef: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  案例標籤 <span className="text-gray-400 font-normal">（選填）</span>
                </label>
                <Input
                  placeholder="例如：案例一"
                  value={form.caseLabel}
                  onChange={e => setForm(f => ({ ...f, caseLabel: e.target.value }))}
                />
              </div>
            </div>

            {/* 顯示文字 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                顯示文字 <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">（學生看到的內容，可省略部分以「⋯⋯（省略）⋯⋯」表示）</span>
              </label>
              <Textarea
                placeholder={form.qaType === "case_study"
                  ? "例如：請同學翻到第 35 頁，閱讀「案例一」。\n\n誠實信用原則，作為民法特別是債法中的最高指導原則⋯⋯（省略）⋯⋯對于指導民事審判實踐具有非常重要的作用。"
                  : form.qaType === "notice"
                  ? "例如：⚠️ 注意：以下概念是本章重點，請仔細閱讀。"
                  : "例如：請同學翻到第 35 頁，思考以下問題："}
                value={form.displayText}
                onChange={e => setForm(f => ({ ...f, displayText: e.target.value }))}
                rows={4}
              />
            </div>

            {/* 問答題專屬欄位 */}
            {form.qaType === "question" && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    問題文字 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="例如：請問案例一中，XX 的行為屬於何種法律行為？"
                    value={form.questionText}
                    onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    選項設計 <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">（綠色為正確答案）</span>
                  </label>
                  <div className="space-y-2">
                    {form.options.map((opt, idx) => (
                      <div key={opt.label} className="flex items-center gap-2">
                        <button
                          onClick={() => setForm(f => ({
                            ...f,
                            correctAnswer: opt.label,
                            options: f.options.map((o, i) => ({ ...o, isCorrect: i === idx })),
                          }))}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${opt.isCorrect ? "bg-green-500 border-green-500 text-white" : "border-gray-300 text-gray-500 hover:border-green-400"}`}
                        >
                          {opt.label}
                        </button>
                        <Input
                          placeholder={`選項 ${opt.label} 的內容`}
                          value={opt.text}
                          onChange={e => setForm(f => ({
                            ...f,
                            options: f.options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o),
                          }))}
                          className={opt.isCorrect ? "border-green-300 bg-green-50" : ""}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">點擊字母圓圈設定正確答案</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    答案解析 <span className="text-gray-400 font-normal">（選填，學生答題後顯示）</span>
                  </label>
                  <Textarea
                    placeholder="解析說明，讓學生了解為什麼選這個答案"
                    value={form.explanation}
                    onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* 排序 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">排序數字（小的在前）</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${form.isActive ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                >
                  {form.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {form.isActive ? "顯示中" : "已隱藏"}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingQA ? "儲存修改" : "新增項目"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 書本設定 Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Coins className="w-5 h-5 inline mr-2 text-yellow-500" />
              書本點數與挑戰設定
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              點數僅限本書使用，不可跨書轉移
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">購書驗證贈送點數</label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.initialCredits}
                  onChange={e => setSettingsForm(f => ({ ...f, initialCredits: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-400 mt-1">驗證成功後一次性贈送</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">每次驗證成功贈點</label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.verifyBonusCredits}
                  onChange={e => setSettingsForm(f => ({ ...f, verifyBonusCredits: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-400 mt-1">章節切換驗證通過後贈送</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">每次提問扣點</label>
                <Input
                  type="number"
                  min={0}
                  value={settingsForm.questionCost}
                  onChange={e => setSettingsForm(f => ({ ...f, questionCost: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-400 mt-1">單元完成後開放提問</p>
              </div>
            </div>

            <hr />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">挑戰考題</span>
                <button
                  onClick={() => setSettingsForm(f => ({ ...f, challengeEnabled: !f.challengeEnabled }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${settingsForm.challengeEnabled ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                >
                  {settingsForm.challengeEnabled ? "已開啟" : "已關閉"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">挑戰題數</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={settingsForm.challengeQuestionCount}
                    onChange={e => setSettingsForm(f => ({ ...f, challengeQuestionCount: parseInt(e.target.value) || 5 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">全對獎勵點數</label>
                  <Input
                    type="number"
                    min={0}
                    value={settingsForm.challengeRewardCredits}
                    onChange={e => setSettingsForm(f => ({ ...f, challengeRewardCredits: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            <hr />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">章節切換驗證</p>
                <p className="text-xs text-gray-400">每日第一次切換章節需驗證</p>
              </div>
              <button
                onClick={() => setSettingsForm(f => ({ ...f, chapterVerifyEnabled: !f.chapterVerifyEnabled }))}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${settingsForm.chapterVerifyEnabled ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-500 border-gray-200"}`}
              >
                {settingsForm.chapterVerifyEnabled ? "已開啟" : "已關閉"}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>取消</Button>
            <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
              儲存設定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 自動備課對話框 */}
      <Dialog open={showAutoGenDialog} onOpenChange={setShowAutoGenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI 自動備課
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              AI 將自動分析書本內容，為
              {selectedChapterId
                ? `所選章節`
                : `所有章節`
              }
              生成：
            </p>
            <ul className="text-sm text-gray-700 space-y-1 pl-4 list-disc">
              <li>案例說明卡片（請翻到第X頁閱讀...）</li>
              <li>互動問答題（選項為原文亂序排列，必須翻書才能選對）</li>
              <li>單元學習完成提示</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              ⚠️ 每個章節會呼叫一次 AI，章節越多耗時越長。請耐心等待。
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="replaceExisting"
                checked={autoGenReplaceExisting}
                onChange={e => setAutoGenReplaceExisting(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="replaceExisting" className="text-sm text-gray-600 cursor-pointer">
                清除現有備課內容，重新生成
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoGenDialog(false)} disabled={autoGenMutation.isPending}>
              取消
            </Button>
            <Button
              onClick={() => autoGenMutation.mutate({ bookId, chapterId: selectedChapterId, replaceExisting: autoGenReplaceExisting })}
              disabled={autoGenMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {autoGenMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />AI 生成中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" />開始自動備課</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 腳本編輯 Dialog */}
      <Dialog open={!!editingScriptLp} onOpenChange={(open) => { if (!open) setEditingScriptLp(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              編輯對話腳本
              {editingScriptLp && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  — {editingScriptLp.explanation?.slice(0, 20) || '知識點'}{editingScriptLp.explanation?.length > 20 ? '...' : ''}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: '📚 開場白（第一次進入知識點）', key: 'scriptIntro' as const, placeholder: '第一次引導學生翻書的開場白，不提上一題', color: 'border-blue-200 focus:ring-blue-300' },
              { label: '✅ 答對後進入下一題', key: 'scriptIntroAfterCorrect' as const, placeholder: '答對上一題後，鼓勵 + 引導翻書進入下一知識點', color: 'border-green-200 focus:ring-green-300' },
              { label: '🎉 答對即時鼓勵（1-2 句）', key: 'scriptCorrect' as const, placeholder: '學生選對答案的當下鼓勵語', color: 'border-emerald-200 focus:ring-emerald-300' },
              { label: '💭 答錯提示（不直接給答案）', key: 'scriptWrong' as const, placeholder: '引導學生再思考，不要直接給答案', color: 'border-orange-200 focus:ring-orange-300' },
            ].map(({ label, key, placeholder, color }) => (
              <div key={key}>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
                <Textarea
                  rows={3}
                  placeholder={placeholder}
                  value={scriptEditForm[key]}
                  onChange={e => setScriptEditForm(f => ({ ...f, [key]: e.target.value }))}
                  className={`resize-none text-sm ${color}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScriptLp(null)}>取消</Button>
            <Button
              onClick={() => {
                if (!editingScriptLp) return;
                updateScriptMutation.mutate({
                  id: editingScriptLp.id,
                  scriptIntro: scriptEditForm.scriptIntro,
                  scriptIntroAfterCorrect: scriptEditForm.scriptIntroAfterCorrect,
                  scriptCorrect: scriptEditForm.scriptCorrect,
                  scriptWrong: scriptEditForm.scriptWrong,
                });
              }}
              disabled={updateScriptMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updateScriptMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />儲存中...</> : <>✅ 儲存腳本</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新整理知識點格式 Dialog */}
      <Dialog open={showReformatDialog} onOpenChange={(open) => { if (!reformatMutation.isPending) setShowReformatDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-amber-600">✏️</span>
              重新整理知識點格式
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {reformatMutation.isPending ? (
              <div className="py-6 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-600 animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-xl">✏️</span>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">AI 正在改寫知識點問題格式</p>
                  <p className="text-sm text-gray-500 mt-1">將口語化問法改為正式學術語氣...</p>
                  <p className="text-xs text-amber-600 mt-2">請勿關閉此視窗</p>
                </div>
              </div>
            ) : !reformatResult ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">📋 功能說明</p>
                  <p>此功能會使用 AI 將現有知識點中口語化的問題（例如「你覺得...」、「那你想想看...」、「書中提到...」）批次改寫為正式學術語氣。</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">範圍</p>
                      <p className="text-xs text-gray-500">
                        {lessonSelectedChapterId
                          ? `目前章節（${(chapters || []).find((c: any) => c.id === lessonSelectedChapterId)?.title || '已選章節'}）`
                          : `整本書（${lessonPointsList.length} 個知識點）`}
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-amber-600">{lessonPointsList.length}</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="reformatDryRun"
                      checked={reformatDryRun}
                      onChange={e => setReformatDryRun(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <label htmlFor="reformatDryRun" className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium text-gray-700">預覽模式（乾跑）</p>
                      <p className="text-xs text-gray-500">僅預覽改寫結果，不實際儲存到資料庫</p>
                    </label>
                  </div>
                </div>

                <p className="text-xs text-gray-400">⚠️ 實際執行時將逐一呼叫 AI 改寫，知識點越多耗時越長。建議先用預覽模式確認效果。</p>
              </>
            ) : (
              /* 整理結果 */
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-amber-600">{reformatResult.total ?? reformatResult.updated ?? 0}</div>
                    <div className="text-xs text-amber-700">{reformatDryRun ? '待整理' : '已整理'}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{reformatResult.processed ?? 0}</div>
                    <div className="text-xs text-green-700">本次處理</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-500">{reformatResult.skipped ?? 0}</div>
                    <div className="text-xs text-gray-600">跳過（已正式）</div>
                  </div>
                </div>

                {reformatResult.previews && reformatResult.previews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">📝 改寫預覽（前 {reformatResult.previews.length} 個）</p>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {reformatResult.previews.map((item: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex items-start gap-1">
                            <span className="text-red-400 font-medium shrink-0">原：</span>
                            <span className="text-gray-500 line-through">{item.oldQuestion}</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <span className="text-green-600 font-medium shrink-0">新：</span>
                            <span className="text-gray-800 font-medium">{item.newQuestion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 還剩待整理數量提示 */}
                {!reformatDryRun && (() => {
                  const remaining = (reformatResult.total ?? 0) - (reformatResult.processed ?? 0);
                  return remaining > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      ⚠️ 還剩 <strong>{remaining}</strong> 個口語化知識點尚未整理，請再次按「繼續整理」。
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                      ✅ 全部口語化知識點已整理完成！
                    </div>
                  );
                })()}

                {reformatDryRun && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    ✅ 預覽完成！確認效果後，請取消勾選「預覽模式」再執行一次以實際儲存。
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!reformatResult ? (
              <>
                <Button variant="outline" onClick={() => setShowReformatDialog(false)} disabled={reformatMutation.isPending}>取消</Button>
                <Button
                  onClick={() => reformatMutation.mutate({ bookId, chapterId: lessonSelectedChapterId, dryRun: reformatDryRun })}
                  disabled={reformatMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {reformatMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />整理中...</>
                  ) : (
                    reformatDryRun ? <>✏️ 預覽改寫結果</> : <>✏️ 執行整理格式</>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setReformatResult(null); setShowReformatDialog(false); }}>關閉</Button>
                {reformatDryRun ? (
                  <Button
                    onClick={() => { setReformatResult(null); setReformatDryRun(false); }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    ✏️ 正式執行整理
                  </Button>
                ) : (
                  (reformatResult.total ?? 0) - (reformatResult.processed ?? 0) > 0 && (
                    <Button
                      onClick={() => { setReformatResult(null); reformatMutation.mutate({ bookId, chapterId: lessonSelectedChapterId, dryRun: false }); }}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Loader2 className="w-4 h-4 mr-1" />繼續整理下一批
                    </Button>
                  )
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
