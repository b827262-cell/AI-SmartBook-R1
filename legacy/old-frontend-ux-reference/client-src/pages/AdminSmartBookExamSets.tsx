import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Upload,
  CheckCircle,
  XCircle,
  Pencil,
  Save,
} from "lucide-react";

export default function AdminSmartBookExamSets() {
  const { bookId: bookIdStr } = useParams<{ bookId: string }>();
  const bookId = Number(bookIdStr);
  const [, navigate] = useLocation();

  // ==================== 考古題集 ====================
  const [showCreateSetDialog, setShowCreateSetDialog] = useState(false);
  const [editingSet, setEditingSet] = useState<{ id: number; title: string; description: string; yearRange: string } | null>(null);
  const [newSetTitle, setNewSetTitle] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");
  const [newSetYear, setNewSetYear] = useState("");
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);

  // ==================== 題目管理 ====================
  const [expandedQId, setExpandedQId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<null | {
    id: number; questionNo: string; questionType: "choice" | "essay";
    questionText: string; sourceYear: string; sourceExam: string;
    hasAnswer: boolean; answerText: string; referencePages: string; explanation: string;
  }>(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQ, setNewQ] = useState({
    questionNo: "", questionType: "essay" as "choice" | "essay",
    questionText: "", sourceYear: "", sourceExam: "",
    hasAnswer: false, answerText: "", referencePages: "", explanation: "",
  });

  // ==================== PDF 上傳解析 ====================
  const [showParsePdfDialog, setShowParsePdfDialog] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [parsePdfSetId, setParsePdfSetId] = useState<number | null>(null);
  const parsePdfSubmitting = useRef(false);

  // ==================== AI 解析 ====================
  const [generatingExplanation, setGeneratingExplanation] = useState<number | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchAnswering, setBatchAnswering] = useState(false);
  const [batchConverting, setBatchConverting] = useState(false);

  // ==================== 趨勢分析 ====================
  const [showTrendDialog, setShowTrendDialog] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendResult, setTrendResult] = useState<string>('');

  // ==================== Queries ====================
  const setsQuery = trpc.examSetAdmin.listSets.useQuery({ smartBookId: bookId }, { enabled: !!bookId });
  const questionsQuery = trpc.examSetAdmin.listQuestions.useQuery(
    { examSetId: selectedSetId! },
    { enabled: !!selectedSetId }
  );
  const utils = trpc.useUtils();

  // ==================== Mutations ====================
  const createSet = trpc.examSetAdmin.createSet.useMutation({
    onSuccess: () => {
      utils.examSetAdmin.listSets.invalidate({ smartBookId: bookId });
      setShowCreateSetDialog(false);
      setNewSetTitle(""); setNewSetDesc(""); setNewSetYear("");
      toast.success("考古題集已建立");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateSet = trpc.examSetAdmin.updateSet.useMutation({
    onSuccess: () => {
      utils.examSetAdmin.listSets.invalidate({ smartBookId: bookId });
      setEditingSet(null);
      toast.success("已更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSet = trpc.examSetAdmin.deleteSet.useMutation({
    onSuccess: () => {
      utils.examSetAdmin.listSets.invalidate({ smartBookId: bookId });
      if (selectedSetId === editingSet?.id) setSelectedSetId(null);
      toast.success("已刪除");
    },
    onError: (e) => toast.error(e.message),
  });

  const parsePdf = trpc.examSetAdmin.parsePdfToQuestions.useMutation({
    onSuccess: (data) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: parsePdfSetId! });
      setShowParsePdfDialog(false);
      setPdfFile(null);
      toast.success(`AI 解析完成，共匯入 ${data.count} 道題目`);
    },
    onError: (e) => toast.error(`解析失敗：${e.message}`),
  });

  const createQuestion = trpc.examSetAdmin.createQuestion.useMutation({
    onSuccess: () => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setShowAddQuestion(false);
      setNewQ({ questionNo: "", questionType: "essay", questionText: "", sourceYear: "", sourceExam: "", hasAnswer: false, answerText: "", referencePages: "", explanation: "" });
      toast.success("題目已新增");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateQuestion = trpc.examSetAdmin.updateQuestion.useMutation({
    onSuccess: () => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setEditingQuestion(null);
      toast.success("已儲存");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteQuestion = trpc.examSetAdmin.deleteQuestion.useMutation({
    onSuccess: () => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      toast.success("已刪除");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateExplanation = trpc.examSetAdmin.generateExplanation.useMutation({
    onSuccess: (data, vars) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setGeneratingExplanation(null);
      toast.success("AI 解析已生成");
    },
    onError: (e) => { setGeneratingExplanation(null); toast.error(e.message); },
  });

  const [generatingAnswer, setGeneratingAnswer] = useState<number | null>(null);
  const [convertingToChoice, setConvertingToChoice] = useState<number | null>(null);

  const generateAnswerFromBook = trpc.examSetAdmin.generateAnswerFromBook.useMutation({
    onSuccess: (data, vars) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setGeneratingAnswer(null);
      toast.success('已從講義自動生成答案');
    },
    onError: (e) => { setGeneratingAnswer(null); toast.error(e.message); },
  });

  const convertToChoice = trpc.examSetAdmin.convertToChoice.useMutation({
    onSuccess: (data, vars) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setConvertingToChoice(null);
      toast.success('已轉換為選擇題，共生成 4 個選項');
    },
    onError: (e) => { setConvertingToChoice(null); toast.error(e.message); },
  });

  const batchGenerateAnswersFromBook = trpc.examSetAdmin.batchGenerateAnswersFromBook.useMutation({
    onSuccess: (data) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setBatchAnswering(false);
      if (data.total === 0) {
        toast.success('沒有需要從講義生成答案的題目');
      } else {
        toast.success(`已完成！成功生成 ${data.done} 道答案${data.failed > 0 ? `，${data.failed} 道失敗` : ''}`);
      }
    },
    onError: (e) => { setBatchAnswering(false); toast.error(`批次生成失敗：${e.message}`); },
  });

  const batchConvertToChoice = trpc.examSetAdmin.batchConvertToChoice.useMutation({
    onSuccess: (data) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setBatchConverting(false);
      if (data.total === 0) {
        toast.success('沒有需要轉換的簡答題');
      } else {
        toast.success(`已完成！成功轉換 ${data.done} 道簡答題為選擇題${data.failed > 0 ? `，${data.failed} 道失敗` : ''}`);
      }
    },
    onError: (e) => { setBatchConverting(false); toast.error(`批次轉換失敗：${e.message}`); },
  });

  const analyzeTrendMutation = trpc.examSetStudent.analyzeTrend.useMutation({
    onSuccess: (data) => {
      setTrendResult(data.analysis);
      setTrendLoading(false);
    },
    onError: (e) => { setTrendLoading(false); toast.error(`分析失敗：${e.message}`); },
  });

  const batchGenerateExplanations = trpc.examSetAdmin.batchGenerateExplanations.useMutation({
    onSuccess: (data) => {
      utils.examSetAdmin.listQuestions.invalidate({ examSetId: selectedSetId! });
      setBatchGenerating(false);
      if (data.total === 0) {
        toast.success("所有題目已有解析，無需重新生成");
      } else {
        toast.success(`已完成！成功生成 ${data.done} 道解析${data.failed > 0 ? `，${data.failed} 道失敗` : ""}`);
      }
    },
    onError: (e) => { setBatchGenerating(false); toast.error(`批次生成失敗：${e.message}`); },
  });

  // ==================== PDF 上傳處理 ====================
  const handleParsePdf = async () => {
    if (!pdfFile || !parsePdfSetId) return;
    // 防止重複觸發
    if (parsePdfSubmitting.current) return;
    parsePdfSubmitting.current = true;
    setUploadingPdf(true);
    try {
      // 上傳到 S3
      const formData = new FormData();
      formData.append("file", pdfFile);
      const uploadResp = await fetch("/api/upload-exam-pdf", {
        method: "POST",
        body: formData,
      });
      if (!uploadResp.ok) {
        const errData = await uploadResp.json().catch(() => ({ error: '上傳失敗' }));
        throw new Error(errData.error || '上傳失敗');
      }
      const uploadData = await uploadResp.json();
      const pdfUrl = uploadData.url;
      // 先更新 examSet 的 pdfUrl
      await updateSet.mutateAsync({ id: parsePdfSetId, pdfUrl });
      // 再呼叫 AI 解析
      await parsePdf.mutateAsync({ pdfUrl, examSetId: parsePdfSetId });
    } catch (e: unknown) {
      toast.error(`上傳失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingPdf(false);
      parsePdfSubmitting.current = false;
    }
  };

  const sets = setsQuery.data ?? [];
  const questions = questionsQuery.data ?? [];
  const selectedSet = sets.find(s => s.id === selectedSetId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/admin/smart-books")} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            考古題管理
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">書本 ID：{bookId}</p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* 左側：考古題集列表 */}
        <div className="w-72 bg-white border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">考古題集</h2>
            <Button size="sm" variant="outline" onClick={() => setShowCreateSetDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />新增
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {setsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : sets.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">尚無考古題集<br />點右上角「新增」建立</div>
            ) : sets.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedSetId(s.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${selectedSetId === s.id ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{s.title}</p>
                    {s.yearRange && <p className="text-xs text-gray-500 mt-0.5">{s.yearRange}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={s.isPublished ? "default" : "secondary"} className="text-xs px-1.5">
                      {s.isPublished ? "已發布" : "草稿"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSet({ id: s.id, title: s.title, description: s.description ?? "", yearRange: s.yearRange ?? "" }); }}
                    className="text-xs text-blue-600 hover:underline"
                  ><Edit2 className="w-3 h-3 inline mr-0.5" />編輯</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateSet.mutate({ id: s.id, isPublished: !s.isPublished }); }}
                    className={`text-xs hover:underline ${s.isPublished ? "text-gray-500" : "text-green-600"}`}
                  >{s.isPublished ? <><EyeOff className="w-3 h-3 inline mr-0.5" />取消發布</> : <><Eye className="w-3 h-3 inline mr-0.5" />發布</>}</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`確定刪除「${s.title}」及所有題目？`)) deleteSet.mutate({ id: s.id }); }}
                    className="text-xs text-red-500 hover:underline"
                  ><Trash2 className="w-3 h-3 inline mr-0.5" />刪除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：題目列表 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedSetId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>請從左側選擇一個考古題集</p>
              </div>
            </div>
          ) : (
            <>
              {/* 題目工具列 */}
              <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{selectedSet?.title}</h2>
                  <p className="text-xs text-gray-500">{questions.length} 道題目</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                    onClick={() => setShowTrendDialog(true)}
                  >
                    📊 趨勢分析
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-purple-700 border-purple-300 hover:bg-purple-50"
                    disabled={batchGenerating || questions.length === 0}
                    onClick={() => {
                      const noExpl = questions.filter(q => !q.explanation || q.explanation.trim() === "").length;
                      const msg = noExpl > 0
                        ? `將為 ${noExpl} 道無解析的題目一鍵生成 AI 解析，確定執行？`
                        : `所有 ${questions.length} 道題目已有解析，是否仍要重新生成？`;
                      if (confirm(msg)) {
                        setBatchGenerating(true);
                        batchGenerateExplanations.mutate({ examSetId: selectedSetId! });
                      }
                    }}
                  >
                    {batchGenerating ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成中…</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-1" />一鍵全部生成解析</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-300 hover:bg-green-50"
                    disabled={batchAnswering || questions.length === 0}
                    onClick={() => {
                      const noAns = questions.filter(q => !q.hasAnswer && q.referencePages && q.referencePages.trim() !== '').length;
                      if (noAns === 0) { toast.info('沒有需要從講義生成答案的題目'); return; }
                      if (confirm(`將為 ${noAns} 道有參考頁碼但無答案的題目從講義自動生成答案，確定執行？`)) {
                        setBatchAnswering(true);
                        batchGenerateAnswersFromBook.mutate({ examSetId: selectedSetId! });
                      }
                    }}
                  >
                    {batchAnswering ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成中…</> : <><BookOpen className="w-4 h-4 mr-1" />批次從講義生成答案</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                    disabled={batchConverting || questions.length === 0}
                    onClick={() => {
                      const essayCount = questions.filter(q => q.questionType === 'essay').length;
                      if (essayCount === 0) { toast.info('沒有需要轉換的簡答題'); return; }
                      if (confirm(`將 ${essayCount} 道簡答題一鍵轉換為選擇題，AI 將自動生成 ABCD 選項，確定執行？`)) {
                        setBatchConverting(true);
                        batchConvertToChoice.mutate({ examSetId: selectedSetId! });
                      }
                    }}
                  >
                    {batchConverting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />轉換中…</> : <><span className="text-xs font-bold mr-1">ABC</span>批次轉選擇題</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    onClick={() => { setParsePdfSetId(selectedSetId); setShowParsePdfDialog(true); }}
                  >
                    <Upload className="w-4 h-4 mr-1" />上傳 PDF 解析
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddQuestion(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />手動新增題目
                  </Button>
                </div>
              </div>

              {/* 題目列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {questionsQuery.isLoading ? (
                  <div className="text-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>尚無題目</p>
                    <p className="text-sm mt-1">點「上傳 PDF 解析」讓 AI 自動拆題，或手動新增</p>
                  </div>
                ) : questions.map((q, idx) => (
                  <div key={q.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* 題目標題列 */}
                    <div className="flex items-start gap-3 p-4">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                        {q.questionNo || idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${q.questionType === "choice" ? "text-blue-600 border-blue-300" : "text-purple-600 border-purple-300"}`}>
                            {q.questionType === "choice" ? "選擇題" : "簡答題"}
                          </Badge>
                          {q.sourceYear && <span className="text-xs text-gray-500">{q.sourceYear}</span>}
                          {q.sourceExam && <span className="text-xs text-gray-500">{q.sourceExam}</span>}
                          {q.hasAnswer ? (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-0.5" />有答案</Badge>
                          ) : q.referencePages ? (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">參考 {q.referencePages}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-400"><XCircle className="w-3 h-3 mr-0.5" />無答案</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{q.questionText}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedQId(expandedQId === q.id ? null : q.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                        >
                          {expandedQId === q.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingQuestion({
                            id: q.id, questionNo: q.questionNo ?? "", questionType: q.questionType as "choice" | "essay",
                            questionText: q.questionText, sourceYear: q.sourceYear ?? "", sourceExam: q.sourceExam ?? "",
                            hasAnswer: !!q.hasAnswer, answerText: q.answerText ?? "", referencePages: q.referencePages ?? "", explanation: q.explanation ?? "",
                          })}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-500"
                        ><Pencil className="w-4 h-4" /></button>
                        <button
                          onClick={() => {
                            if (!q.explanation) {
                              setGeneratingExplanation(q.id);
                              generateExplanation.mutate({ questionId: q.id });
                            }
                          }}
                          disabled={generatingExplanation === q.id}
                          className="p-1.5 rounded hover:bg-purple-50 text-purple-500 disabled:opacity-50"
                          title="AI 生成解析"
                        >
                          {generatingExplanation === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                        {/* 從講義生成答案（有參考頁碼且無答案時顯示） */}
                        {!q.hasAnswer && q.referencePages && (
                          <button
                            onClick={() => {
                              setGeneratingAnswer(q.id);
                              generateAnswerFromBook.mutate({ questionId: q.id });
                            }}
                            disabled={generatingAnswer === q.id}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50"
                            title="從講義參考頁碼自動生成答案"
                          >
                            {generatingAnswer === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                          </button>
                        )}
                        {/* 簡答題轉選擇題按鈕 */}
                        {q.questionType === 'essay' && (
                          <button
                            onClick={() => {
                              if (confirm('將此簡答題轉換為選擇題？AI 將自動生成 4 個選項。')) {
                                setConvertingToChoice(q.id);
                                convertToChoice.mutate({ questionId: q.id });
                              }
                            }}
                            disabled={convertingToChoice === q.id}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-500 disabled:opacity-50"
                            title="轉換為選擇題"
                          >
                            {convertingToChoice === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-bold">ABC</span>}
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm("確定刪除此題目？")) deleteQuestion.mutate({ id: q.id }); }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-400"
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* 展開詳情 */}
                    {expandedQId === q.id && (
                      <div className="border-t bg-gray-50 p-4 space-y-3 text-sm">
                        {/* 選擇題 ABCD 選項 */}
                        {q.questionType === 'choice' && q.options && (() => {
                          try {
                            const opts: Array<{ key: string; text: string }> = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                            if (opts && opts.length > 0) return (
                              <div>
                                <p className="font-medium text-gray-600 mb-1">📝 選項</p>
                                <div className="space-y-1">
                                  {opts.map(opt => (
                                    <div key={opt.key} className={`flex gap-2 text-xs rounded p-2 border ${
                                      q.answerText === opt.key ? 'bg-green-50 border-green-300 text-green-800 font-semibold' : 'bg-white border-gray-200 text-gray-700'
                                    }`}>
                                      <span className="shrink-0 font-bold w-5">{opt.key}.</span>
                                      <span>{opt.text}</span>
                                      {q.answerText === opt.key && <span className="ml-auto text-green-600">✔ 正確</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch { return null; }
                        })()}
                        {q.answerText && (
                          <div>
                            <p className="font-medium text-gray-600 mb-1">✅ 標準答案</p>
                            <p className="text-gray-800 bg-green-50 rounded p-2 border border-green-100">{q.answerText}</p>
                          </div>
                        )}
                        {q.referencePages && (
                          <div>
                            <p className="font-medium text-gray-600 mb-1">📖 參考頁碼</p>
                            <p className="text-gray-700">{q.referencePages}</p>
                          </div>
                        )}
                        {q.explanation ? (
                          <div>
                            <p className="font-medium text-gray-600 mb-1">💡 解析</p>
                            <p className="text-gray-800 bg-blue-50 rounded p-2 border border-blue-100 whitespace-pre-wrap">{q.explanation}</p>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">尚無解析，點右上角 ✨ 按鈕讓 AI 生成</div>
                        )}
                        {q.subQuestions && q.subQuestions.length > 0 && (
                          <div>
                            <p className="font-medium text-gray-600 mb-1">📝 子題</p>
                            <div className="space-y-1">
                              {q.subQuestions.map(s => (
                                <div key={s.id} className="flex gap-2 text-xs bg-white rounded p-2 border">
                                  <span className="font-bold text-amber-600 shrink-0">({s.subNo})</span>
                                  <div>
                                    {s.questionText && <p className="text-gray-700">{s.questionText}</p>}
                                    {s.answerText && <p className="text-green-700 mt-0.5">答：{s.answerText}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================== Dialogs ==================== */}

      {/* 新增考古題集 */}
      <Dialog open={showCreateSetDialog} onOpenChange={setShowCreateSetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>新增考古題集</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>名稱 *</Label>
              <Input value={newSetTitle} onChange={e => setNewSetTitle(e.target.value)} placeholder="例：資安管理歷年考古題" className="mt-1" />
            </div>
            <div>
              <Label>說明</Label>
              <Textarea value={newSetDesc} onChange={e => setNewSetDesc(e.target.value)} placeholder="選填" className="mt-1" rows={2} />
            </div>
            <div>
              <Label>年份範圍</Label>
              <Input value={newSetYear} onChange={e => setNewSetYear(e.target.value)} placeholder="例：108-113年" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSetDialog(false)}>取消</Button>
            <Button onClick={() => createSet.mutate({ smartBookId: bookId, title: newSetTitle, description: newSetDesc, yearRange: newSetYear })} disabled={!newSetTitle || createSet.isPending}>
              {createSet.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯考古題集 */}
      {editingSet && (
        <Dialog open onOpenChange={() => setEditingSet(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>編輯考古題集</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>名稱 *</Label>
                <Input value={editingSet.title} onChange={e => setEditingSet({ ...editingSet, title: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>說明</Label>
                <Textarea value={editingSet.description} onChange={e => setEditingSet({ ...editingSet, description: e.target.value })} className="mt-1" rows={2} />
              </div>
              <div>
                <Label>年份範圍</Label>
                <Input value={editingSet.yearRange} onChange={e => setEditingSet({ ...editingSet, yearRange: e.target.value })} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSet(null)}>取消</Button>
              <Button onClick={() => updateSet.mutate({ id: editingSet.id, title: editingSet.title, description: editingSet.description, yearRange: editingSet.yearRange })} disabled={updateSet.isPending}>
                {updateSet.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}儲存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PDF 上傳解析 */}
      <Dialog open={showParsePdfDialog} onOpenChange={setShowParsePdfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI 解析考古題 PDF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">📋 解析說明</p>
              <ul className="space-y-1 text-xs">
                <li>• AI 將自動識別選擇題和簡答題</li>
                <li>• 有答案的題目會自動填入答案欄</li>
                <li>• 只有頁碼的題目會記錄參考頁碼</li>
                <li>• 解析完成後可手動修改任何欄位</li>
              </ul>
            </div>
            <div>
              <Label>選擇 PDF 檔案</Label>
              <input
                type="file"
                accept=".pdf"
                onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
              />
              {pdfFile && <p className="text-xs text-green-600 mt-1">✅ 已選擇：{pdfFile.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowParsePdfDialog(false); setPdfFile(null); }}>取消</Button>
            <Button
              onClick={handleParsePdf}
              disabled={!pdfFile || uploadingPdf || parsePdf.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {(uploadingPdf || parsePdf.isPending) ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" />解析中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" />開始解析</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 手動新增題目 */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>手動新增題目</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>題號</Label>
                <Input value={newQ.questionNo} onChange={e => setNewQ({ ...newQ, questionNo: e.target.value })} placeholder="一、1、(1)" className="mt-1" />
              </div>
              <div>
                <Label>題型</Label>
                <Select value={newQ.questionType} onValueChange={v => setNewQ({ ...newQ, questionType: v as "choice" | "essay" })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essay">簡答/申論題</SelectItem>
                    <SelectItem value="choice">選擇題</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>來源年份</Label>
                <Input value={newQ.sourceYear} onChange={e => setNewQ({ ...newQ, sourceYear: e.target.value })} placeholder="112年" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>題目內容 *</Label>
              <Textarea value={newQ.questionText} onChange={e => setNewQ({ ...newQ, questionText: e.target.value })} placeholder="輸入完整題目文字（含選項）" className="mt-1" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>標準答案</Label>
                <Textarea value={newQ.answerText} onChange={e => setNewQ({ ...newQ, answerText: e.target.value })} placeholder="選擇題填 A/B/C/D，申論題填完整答案" className="mt-1" rows={3} />
              </div>
              <div>
                <Label>參考頁碼</Label>
                <Input value={newQ.referencePages} onChange={e => setNewQ({ ...newQ, referencePages: e.target.value })} placeholder="第 3-5 頁" className="mt-1" />
                <Label className="mt-3 block">解析說明</Label>
                <Textarea value={newQ.explanation} onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} placeholder="選填，可讓 AI 自動生成" className="mt-1" rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuestion(false)}>取消</Button>
            <Button
              onClick={() => createQuestion.mutate({ examSetId: selectedSetId!, ...newQ, hasAnswer: !!newQ.answerText })}
              disabled={!newQ.questionText || createQuestion.isPending}
            >
              {createQuestion.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯題目 */}
      {editingQuestion && (
        <Dialog open onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>編輯題目</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>題號</Label>
                  <Input value={editingQuestion.questionNo} onChange={e => setEditingQuestion({ ...editingQuestion, questionNo: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>題型</Label>
                  <Select value={editingQuestion.questionType} onValueChange={v => setEditingQuestion({ ...editingQuestion, questionType: v as "choice" | "essay" })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essay">簡答/申論題</SelectItem>
                      <SelectItem value="choice">選擇題</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>來源年份</Label>
                  <Input value={editingQuestion.sourceYear} onChange={e => setEditingQuestion({ ...editingQuestion, sourceYear: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>題目內容</Label>
                <Textarea value={editingQuestion.questionText} onChange={e => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })} className="mt-1" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>標準答案</Label>
                  <Textarea value={editingQuestion.answerText} onChange={e => setEditingQuestion({ ...editingQuestion, answerText: e.target.value })} className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>參考頁碼</Label>
                  <Input value={editingQuestion.referencePages} onChange={e => setEditingQuestion({ ...editingQuestion, referencePages: e.target.value })} className="mt-1" />
                  <Label className="mt-3 block">解析說明</Label>
                  <Textarea value={editingQuestion.explanation} onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })} className="mt-1" rows={2} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>取消</Button>
              <Button
                onClick={() => updateQuestion.mutate({
                  id: editingQuestion.id,
                  questionNo: editingQuestion.questionNo,
                  questionType: editingQuestion.questionType,
                  questionText: editingQuestion.questionText,
                  sourceYear: editingQuestion.sourceYear,
                  sourceExam: editingQuestion.sourceExam,
                  hasAnswer: !!editingQuestion.answerText,
                  answerText: editingQuestion.answerText,
                  referencePages: editingQuestion.referencePages,
                  explanation: editingQuestion.explanation,
                })}
                disabled={updateQuestion.isPending}
              >
                {updateQuestion.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}儲存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    {/* 趨勢分析 Dialog */}
    <Dialog open={showTrendDialog} onOpenChange={setShowTrendDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>📊 考點趨勢分析</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">會分析所有已發布考古題集的題目，找出高頻考點、年份分布趨勢。</p>
          <Button
            onClick={() => {
              setTrendLoading(true);
              setTrendResult('');
              analyzeTrendMutation.mutate({ smartBookId: bookId });
            }}
            disabled={trendLoading}
            className="w-full"
          >
            {trendLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中…</> : '🤖 開始 AI 趨勢分析'}
          </Button>
          {trendResult && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {trendResult}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTrendDialog(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
