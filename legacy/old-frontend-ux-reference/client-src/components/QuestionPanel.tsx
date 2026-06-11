/**
 * 題目清單面板
 * 顯示從 Word 自動提取的題目，支援：
 * - 選擇題：點選選項作答
 * - 簡答題：文字輸入
 * - 畫圖題：拍照上傳
 * 送出後才顯示 AI解題 / 老師解答 / 差異比較 按鈕
 * 作答狀態會儲存到資料庫，重整後仍保留
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Camera, Bot, BookOpen, GitCompare, Loader2, ImagePlus, Zap } from "lucide-react";
import { toast } from "sonner";
import ImageCropDialog from "@/components/ImageCropDialog";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { useTTS } from "@/hooks/useTTS";

export interface ExtractedQuestion {
  index: number;
  type: "choice" | "short_answer" | "drawing";
  questionText: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  teacherSolution?: string | null;
  teacherSolutionImage?: string | null; // 向下相容（單張）
  solutionImages?: string[] | null;     // 多張解析圖
  questionImages?: string[] | null;     // 題目圖片
  hasImage: boolean;
}

export interface SavedAttempt {
  questionIndex: number;
  questionType: string;
  selectedAnswer?: string;
  shortAnswer?: string;
  isCorrect?: boolean;
  submitted: boolean;
}

interface QuestionPanelProps {
  questions: ExtractedQuestion[];
  onAskAI: (prompt: string, imageBase64?: string, solutionImages?: string[], cachedAnswer?: string, displayContent?: string) => void;
  isAILoading?: boolean;
  savedAttempts?: SavedAttempt[];
  materialId?: number; // 用於查詢預生成 AI 解題快取
  onSaveAttempt?: (attempt: {
    questionIndex: number;
    questionType: "choice" | "short_answer" | "drawing";
    selectedAnswer?: string;
    shortAnswer?: string;
    isCorrect?: boolean;
    submitted: boolean;
  }) => void;
}

interface QuestionState {
  expanded: boolean;
  selectedAnswer?: string;
  shortAnswer?: string;
  drawingImage?: string;
  answerImages?: string[];  // 簡答題的作答圖片
  submitted: boolean;
  isCorrect?: boolean;
  showTeacherSolution: boolean;
  showAISolution: boolean;
  showComparison: boolean;
}

function buildInitialStates(
  questions: ExtractedQuestion[],
  savedAttempts?: SavedAttempt[]
): Record<number, QuestionState> {
  const init: Record<number, QuestionState> = {};
  questions.forEach((q) => {
    const saved = savedAttempts?.find((a) => a.questionIndex === q.index);
    init[q.index] = {
      expanded: false,
      submitted: saved?.submitted ?? false,
      selectedAnswer: saved?.selectedAnswer,
      shortAnswer: saved?.shortAnswer,
      isCorrect: saved?.isCorrect,
      showTeacherSolution: false,
      showAISolution: false,
      showComparison: false,
    };
  });
  return init;
}

export default function QuestionPanel({
  questions,
  onAskAI,
  isAILoading,
  savedAttempts,
  materialId,
  onSaveAttempt,
}: QuestionPanelProps) {
  const [states, setStates] = useState<Record<number, QuestionState>>(() =>
    buildInitialStates(questions, savedAttempts)
  );

  // TTS 語音朗讀
  const { speak, stop, isSpeaking, speakingIndex } = useTTS();

  // 取得純文字（去除 HTML 標籤）供 TTS 朗讀
  const getPlainTextFromHtml = (html: string) => {
    return html
      .replace(/<img[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const [attemptsLoaded, setAttemptsLoaded] = useState(false);

  // 當 savedAttempts 從後端載入後，更新 states（只執行一次）
  useEffect(() => {
    if (savedAttempts && !attemptsLoaded) {
      setAttemptsLoaded(true);
      setStates(buildInitialStates(questions, savedAttempts));
    }
  }, [savedAttempts, attemptsLoaded, questions]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForQuestion, setUploadingForQuestion] = useState<number | null>(null);
  const [answerUploadingForQuestion, setAnswerUploadingForQuestion] = useState<number | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string>('');
  const [cropTargetQuestion, setCropTargetQuestion] = useState<number | null>(null);

  // 處理簡答題圖片上傳
  function handleAnswerImageUpload(questionIndex: number) {
    setAnswerUploadingForQuestion(questionIndex);
    answerFileInputRef.current?.click();
  }

  function handleAnswerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || answerUploadingForQuestion === null) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        setCropImageUrl(base64);
        setCropTargetQuestion(answerUploadingForQuestion);
        setCropDialogOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setAnswerUploadingForQuestion(null);
  }

  // 處理裁切後的圖片
  function handleCropConfirm(blob: Blob) {
    if (cropTargetQuestion === null) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        const existing = states[cropTargetQuestion]?.answerImages || [];
        updateState(cropTargetQuestion, { answerImages: [...existing, base64] });
        toast.success('圖片已加入作答');
      }
    };
    reader.readAsDataURL(blob);
    setCropDialogOpen(false);
    setCropImageUrl('');
    setCropTargetQuestion(null);
  }

  // 監聽 Ctrl+V 貼上圖片（簡答題展開時）
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        // 找到目前展開的簡答題
        const expandedShortAnswer = Object.entries(states).find(
          ([, s]) => s.expanded && !s.submitted
        );
        if (!expandedShortAnswer) return;
        const qIndex = parseInt(expandedShortAnswer[0]);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          if (base64) {
            setCropImageUrl(base64);
            setCropTargetQuestion(qIndex);
            setCropDialogOpen(true);
          }
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  }, [states]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  function updateState(index: number, patch: Partial<QuestionState>) {
    setStates((prev) => ({
      ...prev,
      [index]: { ...prev[index], ...patch },
    }));
  }

  function handleToggleExpand(index: number) {
    updateState(index, { expanded: !states[index]?.expanded });
  }

  function handleSelectOption(q: ExtractedQuestion, option: string, optionIndex: number) {
    if (states[q.index]?.submitted) return;
    // 優先從選項文字解析 (A)/(B) 格式，否則用 index 計算 A/B/C/D
    const letter = option.match(/^\(([A-Z])\)/)?.[1] || String.fromCharCode(65 + optionIndex);
    updateState(q.index, { selectedAnswer: letter });
  }

  function handleSubmit(q: ExtractedQuestion) {
    const state = states[q.index];
    if (!state) return;

    if (q.type === "choice") {
      if (!state.selectedAnswer) {
        toast.error("請先選擇答案");
        return;
      }
      const isCorrect = state.selectedAnswer === q.correctAnswer;
      updateState(q.index, { submitted: true, isCorrect });
      // 儲存到資料庫
      onSaveAttempt?.({
        questionIndex: q.index,
        questionType: q.type,
        selectedAnswer: state.selectedAnswer,
        isCorrect,
        submitted: true,
      });
    } else if (q.type === "short_answer") {
      if (!state.shortAnswer?.trim() && (!state.answerImages || state.answerImages.length === 0)) {
        toast.error("請先輸入答案或上傳作答圖片");
        return;
      }
      updateState(q.index, { submitted: true });
      onSaveAttempt?.({
        questionIndex: q.index,
        questionType: q.type,
        shortAnswer: state.shortAnswer,
        submitted: true,
      });
    } else if (q.type === "drawing") {
      if (!state.drawingImage) {
        toast.error("請先上傳作答圖片");
        return;
      }
      updateState(q.index, { submitted: true });
      onSaveAttempt?.({
        questionIndex: q.index,
        questionType: q.type,
        submitted: true,
      });
    }
  }

  const [checkingCache, setCheckingCache] = useState<number | null>(null);
  const [checkingDiffCache, setCheckingDiffCache] = useState<number | null>(null);
  // 快取的差異比較結果（題目 index -> 內容）
  const [cachedDiffs, setCachedDiffs] = useState<Record<number, string>>({});
  const utils = trpc.useUtils();

  async function handleAISolve(q: ExtractedQuestion) {
    // 優先查詢後台預生成的 AI 解題快取
    if (materialId) {
      setCheckingCache(q.index);
      try {
        const cached = await utils.learningMaterials.getPreGeneratedSolution.fetch({
          materialId,
          questionIndex: q.index,
        });
        if (cached?.cached && cached.answer) {
          setCheckingCache(null);
          const imgs = q.solutionImages && q.solutionImages.length > 0
            ? q.solutionImages
            : (q.teacherSolutionImage ? [q.teacherSolutionImage] : undefined);
          onAskAI('', undefined, imgs, cached.answer, '🤖 AI 解題'); // 傳入快取答案
          updateState(q.index, { showAISolution: true });
          return;
        }
      } catch (_e) {
        // 快取查詢失敗，繼續正常流程
      }
      setCheckingCache(null);
    }
    _handleAISolveNormal(q);
  }

  function _handleAISolveNormal(q: ExtractedQuestion) {
    // 偵測題目是否包含多個子題（以(一)(二)(1)(2)等分隔）
    const subQuestionPattern = /[（(][一二三四五六七八九十\d]+[)）]/g;
    const subMatches = q.questionText.match(subQuestionPattern);
    const hasSubQuestions = subMatches && subMatches.length >= 2;

    const answerHint = q.correctAnswer
      ? `\n\n【標準答案】正確答案是 (${q.correctAnswer})`
      : '';
    const cleanTeacherSolution = q.teacherSolution
      ? q.teacherSolution
          .replace(/<img[^>]*>/gi, '（見老師解析圖）')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim()
      : '';
    const teacherHint = cleanTeacherSolution
      ? `\n\n【老師解析】${cleanTeacherSolution}`
      : '';
    const plainText = q.questionText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    let prompt: string;
    if (hasSubQuestions) {
      prompt = `請分別解析以下題目中的每個子題：\n\n${plainText}${q.options ? '\n' + q.options.join('\n') : ''}${answerHint}${teacherHint}\n\n請依照子題編號（如(一)(二)或(1)(2)）逐一解析，每個子題都要說明解題思路與答案，並依照上述標準答案與老師解析為準。`;
    } else {
      prompt = `請解析第 ${q.index} 題：\n\n${plainText}${q.options ? '\n' + q.options.join('\n') : ''}${answerHint}${teacherHint}\n\n請依照上述標準答案與老師解析，詳細說明解題思路與重要觀念，不要給出與標準答案不同的結論。`;
    }
    const imgs = q.solutionImages && q.solutionImages.length > 0
      ? q.solutionImages
      : (q.teacherSolutionImage ? [q.teacherSolutionImage] : undefined);
    const answerImg = states[q.index]?.answerImages?.[0];
    onAskAI(prompt, answerImg, imgs, undefined, '🤖 AI 解題');
    updateState(q.index, { showAISolution: true });
  }

  function handleTeacherSolution(q: ExtractedQuestion) {
    updateState(q.index, { showTeacherSolution: !states[q.index]?.showTeacherSolution });
  }

  async function handleComparison(q: ExtractedQuestion) {
    // 優先查詢預生成差異比較快取
    if (materialId) {
      setCheckingDiffCache(q.index);
      try {
        const cached = await utils.learningMaterials.getPreGeneratedDiff.fetch({
          materialId,
          questionIndex: q.index,
        });
        if (cached?.cached && cached.answer) {
          setCheckingDiffCache(null);
          setCachedDiffs(prev => ({ ...prev, [q.index]: cached.answer! }));
          updateState(q.index, { showComparison: true });
          // 快取命中時同步推到對話框
          const imgs = q.solutionImages && q.solutionImages.length > 0
            ? q.solutionImages
            : (q.teacherSolutionImage ? [q.teacherSolutionImage] : undefined);
          onAskAI('', undefined, imgs, cached.answer, '🔍 差異比較');
          return;
        }
      } catch (_e) {
        // 快取查詢失敗，繼續正常流程
      }
      setCheckingDiffCache(null);
    }
    // 無快取，即時呼叫 AI
    const cleanSol = q.teacherSolution
      ? q.teacherSolution.replace(/<img[^>]*>/gi, '（見老師解析圖）').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      : '（無老師解答）';
    const cleanQ = q.questionText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const answerHint = q.correctAnswer ? `\n\n【標準答案】正確答案是 (${q.correctAnswer})` : '';
    const prompt = `請針對以下題目，比較 AI 解法與老師解法的差異，並以結構化方式呈現：\n\n【題目】\n${cleanQ}${answerHint}\n\n【老師解答】\n${cleanSol}\n\n請依以下格式回覆：\n## 答案一致性\n（直接說明 AI 答案與老師答案是否一致，若有差異請說明）\n\n## AI 解題思路\n（簡述 AI 的解題方式）\n\n## 老師解題思路\n（簡述老師的解題方式）\n\n## 差異重點\n（條列主要差異與學習建議）`;
    const imgs = q.solutionImages && q.solutionImages.length > 0
      ? q.solutionImages
      : (q.teacherSolutionImage ? [q.teacherSolutionImage] : undefined);
    onAskAI(prompt, undefined, imgs, undefined, '🔍 差異比較');
    updateState(q.index, { showComparison: true });
  }

  function handleDrawingUpload(questionIndex: number) {
    setUploadingForQuestion(questionIndex);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadingForQuestion === null) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        // 支援多張：用 || 分隔多個 base64/URL
        const existing = states[uploadingForQuestion]?.drawingImage;
        const combined = existing ? `${existing}||${base64}` : base64;
        updateState(uploadingForQuestion, { drawingImage: combined });
        toast.success("圖片已上傳，可以送出作答");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setUploadingForQuestion(null);
  }

  function handleDrawingSubmitAndAsk(q: ExtractedQuestion) {
    const state = states[q.index];
    if (!state?.drawingImage) {
      toast.error("請先上傳作答圖片");
      return;
    }
    updateState(q.index, { submitted: true });
    onSaveAttempt?.({
      questionIndex: q.index,
      questionType: q.type,
      submitted: true,
    });
    const prompt = `請批改第 ${q.index} 題的作答（見圖片）：\n\n${q.questionText}`;
    onAskAI(prompt, state.drawingImage, undefined, undefined, '📝 AI 批改');
  }

  if (questions.length === 0) return null;

  // 計算作答統計
  const submittedCount = Object.values(states).filter((s) => s.submitted).length;
  const correctCount = Object.values(states).filter((s) => s.submitted && s.isCorrect === true).length;
  const choiceCount = questions.filter((q) => q.type === 'choice').length;

  return (
    <div className="flex flex-col h-full">
      {/* 隱藏的圖片上傳 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 簡答題圖片上傳的隱藏 input */}
      <input
        ref={answerFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAnswerFileChange}
      />

      {/* 圖片裁切對話框 */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setCropDialogOpen(false); setCropImageUrl(''); setCropTargetQuestion(null); }
        }}
        imageUrl={cropImageUrl}
        onConfirm={handleCropConfirm}
      />

      {/* 標題列 */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b bg-muted/30 shrink-0">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          📋 題目清單
          <span className="text-xs font-normal text-muted-foreground">（共 {questions.length} 題）</span>
        </span>
        <span className="text-xs text-muted-foreground">請先試著作答，再查看解答</span>
      </div>

      {/* 作答進度條（有作答記錄才顯示） */}
      {submittedCount > 0 && (
        <div className="px-4 py-2 border-b bg-muted/10 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>已作答 {submittedCount} / {questions.length} 題</span>
            {choiceCount > 0 && (
              <span className="text-green-600 font-medium">
                選擇題答對 {correctCount} / {choiceCount} 題
              </span>
            )}
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${(submittedCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 題目列表（佔滿剩餘高度，可滾動） */}
      <div className="flex-1 overflow-y-auto">
        {questions.map((q) => {
          const state = states[q.index] || {
            expanded: false, submitted: false,
            showTeacherSolution: false, showAISolution: false, showComparison: false
          };

          return (
            <div key={q.index} className="border-b last:border-b-0">
              {/* 題目標題列（點擊展開/收合） */}
              <div
                role="button"
                tabIndex={0}
                className="w-full px-4 py-3 flex items-start gap-2 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => handleToggleExpand(q.index)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleExpand(q.index); }}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {state.expanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary">第 {q.index} 題</span>
                    {/* 題目朗讀按鈕 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const ttsKey = q.index * 1000; // 題目用 index*1000 作為 speakingIndex
                        if (isSpeaking && speakingIndex === ttsKey) {
                          stop();
                        } else {
                          const plain = getPlainTextFromHtml(q.questionText);
                          const optText = q.options ? q.options.map((o, i) => `選項${String.fromCharCode(65+i)}：${o}`).join('。') : '';
                          speak(`第${q.index}題。${plain}${optText ? '。' + optText : ''}`, ttsKey);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
                        isSpeaking && speakingIndex === q.index * 1000
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      title="朗讀題目"
                    >
                      {isSpeaking && speakingIndex === q.index * 1000 ? '⏹ 停止' : '🔊 朗讀'}
                    </button>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      q.type === 'choice' ? 'bg-blue-100 text-blue-700' :
                      q.type === 'drawing' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {q.type === 'choice' ? '選擇題' : q.type === 'drawing' ? '畫圖題' : '簡答題'}
                    </span>
                    {q.hasImage && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">含圖</span>
                    )}
                    {state.submitted && q.type === 'choice' && (
                      state.isCorrect
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    {state.submitted && q.type !== 'choice' && (
                      <span className="text-xs text-green-600 font-medium">✓ 已作答</span>
                    )}
                  </div>
                  {/* 題目預覽（收合時顯示，去除 HTML 標籤） */}
                  {!state.expanded && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {(() => {
                        const plain = q.questionText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
                        return plain.substring(0, 80) + (plain.length > 80 ? '...' : '');
                      })()}
                    </p>
                  )}
                  {/* 已作答時顯示選擇的答案（收合狀態） */}
                  {!state.expanded && state.submitted && state.selectedAnswer && (
                    <p className="text-xs mt-0.5 font-medium text-primary">
                      你的答案：({state.selectedAnswer})
                      {state.isCorrect !== undefined && (
                        <span className={state.isCorrect ? ' text-green-600' : ' text-red-600'}>
                          {state.isCorrect ? ' ✓ 答對' : ` ✗ 正確答案：(${q.correctAnswer})`}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* 展開內容 */}
              {state.expanded && (
                <div className="px-4 pb-4 bg-muted/10">
                  {/* 題目全文（HTML 渲染，去除 <p> 標籤外露） */}
                  <div
                    className="text-sm mb-3 pt-2 text-foreground leading-relaxed border-l-2 border-primary/30 pl-3 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: q.questionText }}
                  />
                  {/* 題目圖片 */}
                  {q.questionImages && q.questionImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {q.questionImages.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`題目圖${i + 1}`} className="max-h-48 rounded border object-contain cursor-zoom-in hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* 未作答提示 */}
                  {!state.submitted && q.type !== 'drawing' && (
                    <div className="mb-3 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded px-3 py-2">
                      💡 請先試著作答，送出後才能查看 AI 解題與老師解答
                    </div>
                  )}

                  {/* 選擇題選項 */}
                  {q.type === 'choice' && q.options && (
                    <div className="space-y-1.5 mb-3">
                      {q.options.map((opt, idx) => {
                        const letter = opt.match(/^\(([A-Z])\)/)?.[1] || String.fromCharCode(65 + idx);
                        const isSelected = state.selectedAnswer === letter;
                        const isCorrect = state.submitted && letter === q.correctAnswer;
                        const isWrong = state.submitted && isSelected && !isCorrect;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectOption(q, opt, idx)}
                            className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-all ${
                              state.submitted ? 'cursor-default pointer-events-none' : 'cursor-pointer'
                            } ${
                              isCorrect ? 'bg-green-100 border-green-500 text-green-800 font-semibold ring-1 ring-green-400' :
                              isWrong ? 'bg-red-100 border-red-500 text-red-800 font-semibold ring-1 ring-red-400' :
                              isSelected ? 'bg-blue-100 border-blue-500 text-blue-800 font-semibold ring-2 ring-blue-400 shadow-sm' :
                              'bg-background border-border hover:bg-blue-50 hover:border-blue-300'
                            }`}
                          >
                            {opt}
                            {isCorrect && state.submitted && ' ✓'}
                            {isWrong && ' ✗'}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 簡答題輸入框 */}
                  {q.type === 'short_answer' && !state.submitted && (
                    <div className="mb-3">
                      <Textarea
                        placeholder="請輸入你的答案（可不填）..."
                        value={state.shortAnswer || ''}
                        onChange={(e) => updateState(q.index, { shortAnswer: e.target.value })}
                        className="mb-2 text-sm"
                        rows={3}
                      />
                      {/* 圖片上傳區域 */}
                      {state.answerImages && state.answerImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {state.answerImages.map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img src={imgUrl} alt={`作答圖${imgIdx + 1}`} className="max-h-36 rounded border object-contain" />
                              <button
                                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const imgs = state.answerImages!.filter((_, i) => i !== imgIdx);
                                  updateState(q.index, { answerImages: imgs.length > 0 ? imgs : undefined });
                                }}
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 圖片上傳按鈕列 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleAnswerImageUpload(q.index)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-muted-foreground/40 rounded text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          上傳圖片
                        </button>
                        <button
                          onClick={() => {
                            setAnswerUploadingForQuestion(q.index);
                            // 指定 capture="environment" 觸發拍照
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.setAttribute('capture', 'environment');
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64 = ev.target?.result as string;
                                if (base64) {
                                  setCropImageUrl(base64);
                                  setCropTargetQuestion(q.index);
                                  setCropDialogOpen(true);
                                }
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-muted-foreground/40 rounded text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          拍照
                        </button>
                        <span className="text-xs text-muted-foreground/60">Ctrl+V 可貼上截圖</span>
                      </div>
                    </div>
                  )}
                  {q.type === 'short_answer' && state.submitted && (
                    <div className="mb-3">
                      {state.shortAnswer && (
                        <div className="p-2 bg-muted rounded text-sm text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">你的答案：</span>{state.shortAnswer}
                        </div>
                      )}
                      {state.answerImages && state.answerImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {state.answerImages.map((imgUrl, imgIdx) => (
                            <a key={imgIdx} href={imgUrl} target="_blank" rel="noopener noreferrer">
                              <img src={imgUrl} alt={`作答圖${imgIdx + 1}`} className="max-h-36 rounded border object-contain cursor-zoom-in hover:opacity-90 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 畫圖題上傳（支援多張圖片作答） */}
                  {q.type === 'drawing' && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2">📸 請拍照或上傳你的作答圖片（可多張）</p>
                      {/* 已上傳的圖片 */}
                      {state.drawingImage && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {state.drawingImage.split('||').map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img src={imgUrl} alt={`作答圖${imgIdx + 1}`} className="max-h-40 rounded border object-contain" />
                              {!state.submitted && (
                                <button
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center"
                                  onClick={() => {
                                    const imgs = state.drawingImage!.split('||').filter((_, i) => i !== imgIdx);
                                    updateState(q.index, { drawingImage: imgs.length > 0 ? imgs.join('||') : undefined });
                                  }}
                                >×</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!state.submitted && (
                        <button
                          onClick={() => handleDrawingUpload(q.index)}
                          className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-muted-foreground/30 rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          {state.drawingImage ? '再上傳一張' : '拍照上傳作答'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 送出按鈕 */}
                  {!state.submitted && (
                    <Button
                      size="sm"
                      className="w-full mb-2"
                      onClick={() => {
                        if (q.type === 'drawing') {
                          handleDrawingSubmitAndAsk(q);
                        } else {
                          handleSubmit(q);
                        }
                      }}
                      disabled={isAILoading}
                    >
                      {q.type === 'drawing' ? '送出並請 AI 批改' : '送出答案'}
                    </Button>
                  )}

                  {/* 送出後：結果 + 功能區 */}
                  {state.submitted && (
                    <div className="space-y-2">

                      {/* 選擇題：答案對比（最重要） */}
                      {q.type === 'choice' && q.correctAnswer && (
                        <div className="rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">你的答案</p>
                              <p className={`text-2xl font-black ${state.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                ({state.selectedAnswer || '?'})
                              </p>
                            </div>
                            <div className="text-xl">{state.isCorrect ? '✅' : '❌'}</div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">正確答案</p>
                              <p className="text-2xl font-black text-red-600">({q.correctAnswer})</p>
                            </div>
                          </div>
                          {state.isCorrect && (
                            <p className="text-xs text-green-600 font-medium text-center mt-1">答對了！答案一致 ✔</p>
                          )}
                        </div>
                      )}

                      {/* 功能按鈕列 */}
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleAISolve(q)}
                          disabled={isAILoading || checkingCache === q.index}
                        >
                          {(isAILoading || checkingCache === q.index) ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                          AI 解題
                        </Button>
                        {(q.teacherSolution || (q.solutionImages && q.solutionImages.length > 0) || q.teacherSolutionImage) && (
                          <Button
                            size="sm"
                            variant={state.showTeacherSolution ? 'default' : 'outline'}
                            className="text-xs h-7"
                            onClick={() => handleTeacherSolution(q)}
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            老師解答
                          </Button>
                        )}
                        {q.teacherSolution && (
                          <Button
                            size="sm"
                            variant={state.showComparison ? 'default' : 'outline'}
                            className="text-xs h-7"
                            onClick={() => handleComparison(q)}
                            disabled={isAILoading || checkingDiffCache === q.index}
                          >
                            {checkingDiffCache === q.index ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <GitCompare className="w-3 h-3 mr-1" />}
                            差異比較
                          </Button>
                        )}
                      </div>

                      {/* 老師解答展開（可折疊） */}
                      {state.showTeacherSolution && (q.teacherSolution || (q.solutionImages && q.solutionImages.length > 0) || q.teacherSolutionImage) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 border-b border-amber-200"
                            onClick={() => handleTeacherSolution(q)}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">👨‍🏫</span>
                              <span>老師解答</span>
                              {/* 老師答案紅字顯示 */}
                              {q.correctAnswer && (
                                <span className="text-red-600 font-black text-lg ml-1">({q.correctAnswer})</span>
                              )}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <div className="px-4 py-4">
                            {q.teacherSolution && (
                              <div
                                className="text-sm text-amber-900 leading-loose mb-3 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: q.teacherSolution }}
                              />
                            )}
                            {(() => {
                              const imgs = q.solutionImages && q.solutionImages.length > 0
                                ? q.solutionImages
                                : (q.teacherSolutionImage ? [q.teacherSolutionImage] : []);
                              return imgs.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {imgs.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                      <img src={url} alt={`解析圖${i + 1}`} className="max-h-48 rounded border object-contain cursor-zoom-in hover:opacity-90" />
                                    </a>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* 差異比較快取展開（有快取時直接在這裡顯示，無快取則發送到 AI 對話框） */}
                      {state.showComparison && cachedDiffs[q.index] && (() => {
                        const diffText = cachedDiffs[q.index];
                        // 從內容判斷答案一致性
                        const consistencySection = diffText.match(/##\s*答案一致性[\s\S]*?(?=##|$)/)?.[0] || '';
                        const isConsistent = /一致|相同|正確|符合|相符/.test(consistencySection) && !/不一致|不相同|差異|不同|错誤/.test(consistencySection);
                        const badge = isConsistent
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold text-sm">✅ 答案一致</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-sm">⚠️ 答案不同</span>;
                        const diffTtsKey = q.index * 1000 + 2;
                        return (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 overflow-hidden">
                            {/* 標題列：差異比較 + 一致性徳章 + 朗讀 + 收合按鈕 */}
                            <div className="flex items-center justify-between px-3 py-2 bg-blue-100/60">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-blue-800">🔍 差異比較</span>
                                {badge}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    if (isSpeaking && speakingIndex === diffTtsKey) {
                                      stop();
                                    } else {
                                      const plain = diffText.replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, ' ').trim();
                                      speak(plain, diffTtsKey);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
                                    isSpeaking && speakingIndex === diffTtsKey
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-blue-200 text-blue-700 hover:bg-blue-300'
                                  }`}
                                >
                                  {isSpeaking && speakingIndex === diffTtsKey ? '⏹ 停止' : '🔊 朗讀'}
                                </button>
                                <button
                                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
                                  onClick={() => updateState(q.index, { showComparison: false })}
                                >
                                  收合 <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {/* Markdown 渲染 */}
                            <div className="px-3 pb-3 pt-2 text-xs text-blue-900 leading-relaxed prose prose-sm max-w-none prose-headings:text-blue-800 prose-headings:font-bold prose-headings:text-sm prose-li:my-0.5">
                              <Streamdown>{diffText}</Streamdown>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
