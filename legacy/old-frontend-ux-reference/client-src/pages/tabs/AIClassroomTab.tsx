import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Check,
  ClipboardList,
  FileText,
  ChevronRight,
  Loader2,
  BookOpen,
  ArrowLeft,
  Bot,
  ArrowRight,
  Send,
  BookMarked,
  User
} from "lucide-react";

type ClassroomPhase = "select" | "loading" | "teaching" | "quiz" | "feedback" | "summary" | "noData";

interface QuizData {
  question: string;
  options: { label: string; text: string; explanation?: string }[];
  correctAnswer: string;
}

interface KnowledgePointData {
  title: string;
  content: string;
}

type ConversationItem = {
  role: "teacher" | "student";
  content: string;
  isCorrect?: boolean | null;
  kp?: KnowledgePointData; // 知識點資料（用於儲存到智能筆記）
  quiz?: QuizData; // 已答題的選擇題（用於收合顯示）
  selectedAnswer?: string; // 學生選擇的答案
  isCollapsed?: boolean; // 歷史知識點預設收合
};

export default function AIClassroomTab({ bookId, subjectId }: { bookId: number; subjectId?: number }) {
  const [phase, setPhase] = useState<ClassroomPhase>("select");
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null);
  const [currentKP, setCurrentKP] = useState<KnowledgePointData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [knowledgePointIndex, setKnowledgePointIndex] = useState(1);
  const [totalKPs, setTotalKPs] = useState(3);
  const [lessonSummary, setLessonSummary] = useState("");
  const [userInput, setUserInput] = useState("");
  const [showExplanations, setShowExplanations] = useState(false);
  const [answeredQuiz, setAnsweredQuiz] = useState<QuizData | null>(null); // 保存已答題的選擇題，feedback 階段用
  const [pendingNextKP, setPendingNextKP] = useState<{ kp: KnowledgePointData; quiz: QuizData | null; index: number; total: number } | null>(null); // 等同學按「下一題」才顯示的下一個知識點
  const [selectedBookId, setSelectedBookId] = useState<number>(bookId); // 目前選擇的書本（預設為傳入的 bookId）
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  const utils = trpc.useUtils();

  // 依選擇的書本 ID 查詢章節
  const { data: chapters, isLoading: chaptersLoading } = trpc.tutorChat.getChapters.useQuery(
    { bookId: selectedBookId },
    { enabled: selectedBookId > 0 }
  );

  // 取得同類科的所有書本
  const { data: subjectBooks } = trpc.tutorPublic.getBooksBySubject.useQuery(
    { subjectId },
    { enabled: !!subjectId }
  );
  const selectedBook = subjectBooks?.find(b => b.id === selectedBookId);

  const startLessonMutation = trpc.aiClassroom.startLesson.useMutation({
    onSuccess: (data) => {
      setKnowledgePointIndex(data.knowledgePointIndex);
      setTotalKPs(data.totalKnowledgePoints);

      // 老師尚未備課
      if (data.lessonPhase === "noData") {
        setPhase("noData");
        return;
      }

      // 正常開始課堂
      if (data.knowledgePoint) {
        // 先加入前面已學過的知識點（繼續上次時才有），預設收合
        const prevItems: ConversationItem[] = (data.previousKPs ?? []).map(prev => ({
          role: "teacher" as const,
          content: `**【知識點 ${prev.index}/${data.totalKnowledgePoints}】**\n${prev.content}`,
          kp: { title: prev.title, content: prev.content },
          quiz: prev.quiz ?? undefined,
          isCollapsed: true, // 歷史知識點預設收合
        }));
        const kpMsg = `${data.intro}\n\n**【知識點 ${data.knowledgePointIndex}/${data.totalKnowledgePoints}】**\n${data.knowledgePoint.content}`;
        setConversation([...prevItems, { role: "teacher", content: kpMsg, kp: data.knowledgePoint }]);
        setCurrentKP(data.knowledgePoint);
      }
      setCurrentQuiz(data.quiz);
      setPhase("quiz");
      scrollToBottom();
    },
    onError: () => {
      setPhase("select");
    },
  });

  const submitAnswerMutation = trpc.aiClassroom.submitAnswer.useMutation({
    onSuccess: (data) => {
      // 不加入 AI 評語，選項解析已足夠
      setKnowledgePointIndex(data.knowledgePointIndex);
      setTotalKPs(data.totalKnowledgePoints);

      if (data.lessonPhase === "summary") {
        setLessonSummary(data.lessonSummary ?? "");
        setCurrentQuiz(null);
        setPhase("summary");
        if (selectedChapterId) {
          recordProgressMutation.mutate({ bookId: selectedBookId, chapterId: selectedChapterId, isCorrect: null, isCompleted: true });
        }
      } else if (data.knowledgePoint) {
        // 繼續下一個知識點：存入 pendingNextKP，等同學按「下一題」才顯示
        setPendingNextKP({ kp: data.knowledgePoint, quiz: data.quiz, index: data.knowledgePointIndex, total: data.totalKnowledgePoints });
        // 保持 feedback 階段，等同學按「下一題」
        setPhase("feedback");
      } else {
        // knowledgePoint 為 null 但後端沒有回傳 summary（edge case）：視為課程結束
        setLessonSummary(`恭喜你完成本章節的學習！`);
        setCurrentQuiz(null);
        setPhase("summary");
        if (selectedChapterId) {
          recordProgressMutation.mutate({ bookId: selectedBookId, chapterId: selectedChapterId, isCorrect: null, isCompleted: true });
        }
      }
      scrollToBottom();
    },
    onError: () => {
      // 若 API 失敗，仍保持 feedback 階段但顯示「換章節」按鈕讓學生可以離開
      setPhase("feedback");
    },
  });

  const askQuestionMutation = trpc.aiClassroom.askQuestion.useMutation({
    onSuccess: (data) => {
      setConversation(prev => [...prev, { role: "teacher", content: data.content }]);
      // 回到 quiz 階段繼續等待學生作答
      setPhase("quiz");
      setUserInput("");
      scrollToBottom();
    },
  });

  const recordProgressMutation = trpc.aiClassroom.recordProgress.useMutation({
    onSuccess: () => {
      utils.aiClassroom.getMyRecords.invalidate({ bookId: selectedBookId });
    },
  });

  const { data: myRecords } = trpc.aiClassroom.getMyRecords.useQuery(
    { bookId: selectedBookId },
    { enabled: selectedBookId > 0 }
  );
  const recordMap = new Map(myRecords?.map(r => [r.chapterId, r]) ?? []);

  const handleStartLesson = async (chapterId: number, chapterTitle: string, forceFromStart = false) => {
    setSelectedChapterId(chapterId);
    setSelectedChapterTitle(chapterTitle);
    setConversation([]);
    setCurrentQuiz(null);
    setCurrentKP(null);
    setSelectedAnswer(null);
    setAnsweredQuiz(null);
    setShowExplanations(false);
    setKnowledgePointIndex(1);
    setLessonSummary("");
    setPendingNextKP(null);
    setPhase("loading");

    // 查詢上次進度
    let startFromIndex = 1;
    if (!forceFromStart) {
      try {
        const progress = await utils.aiClassroom.getLastProgress.fetch({ bookId: selectedBookId, chapterId });
        if (progress && progress.lastKnowledgePointIndex > 0 && !progress.isCompleted) {
          startFromIndex = progress.lastKnowledgePointIndex;
        }
      } catch (e) {
        // 如果查詢失敗，從第 1 個開始
        startFromIndex = 1;
      }
    }

    startLessonMutation.mutate({ bookId: selectedBookId, chapterId, startFromIndex });
  };

  const handleSelectAnswer = (label: string) => {
    if (selectedAnswer || !selectedChapterId || !currentQuiz) return;
    setSelectedAnswer(label);
    setShowExplanations(true);
    setAnsweredQuiz(currentQuiz); // 保存當前題目，避免 submitAnswer 回來後被新 quiz 覆蓋
    const isCorrect = label.toUpperCase() === currentQuiz.correctAnswer.toUpperCase();
    const answerText = currentQuiz.options.find(o => o.label === label)?.text ?? label;
    // 不加入「我選 X」對話泡泡，選項區塊本身已清楚顯示
    setKpCollapsedForQuiz(false); // 作答後自動展開知識點，方便對照答案復習
    setPhase("feedback");
    scrollToBottom();

    // 記錄進度（包含當前知識點索引）
    recordProgressMutation.mutate({ bookId: selectedBookId, chapterId: selectedChapterId, isCorrect, knowledgePointIndex });

    submitAnswerMutation.mutate({
      bookId: selectedBookId,
      chapterId: selectedChapterId,
      userAnswer: label,
      correctAnswer: currentQuiz.correctAnswer,
      knowledgePointIndex,
    });
  };

  const saveNotesMutation = trpc.savedNotes.save.useMutation({
    onSuccess: () => {
      toast.success("知識點已儲存到智能筆記！");
      // 讓智能筆記頁面切過去時資料是最新的
      utils.savedNotes.list.invalidate();
      utils.savedNotes.getFolders.invalidate();
      utils.savedNotes.getCategories.invalidate();
      utils.savedNotes.totalCount.invalidate();
    },
    onError: (err) => toast.error("儲存失敗：" + err.message),
  });

  const handleSaveKPToNotes = (kp: KnowledgePointData, quiz?: QuizData, selectedAnswer?: string) => {
    // 如果有選擇題，將選項和解析一起存入筆記
    let quizContent = "";
    if (quiz) {
      quizContent = `\n\n---\n\n## 📝 測驗題目\n\n**${quiz.question}**\n\n`;
      quiz.options.forEach(opt => {
        const isSelected = selectedAnswer === opt.label;
        const isCorrect = opt.label.toUpperCase() === quiz.correctAnswer.toUpperCase();
        const marker = isCorrect ? ' ✅' : isSelected ? ' ❌' : '';
        quizContent += `- **${opt.label}.** ${opt.text}${marker}\n`;
        if (opt.explanation && (isCorrect || isSelected)) {
          quizContent += `  > ${opt.explanation}\n`;
        }
      });
      quizContent += `\n**正確答案：${quiz.correctAnswer}**`;
    }
    saveNotesMutation.mutate({
      bookId: selectedBookId,
      chapterId: selectedChapterId ?? undefined,
      title: `【知識點】${kp.title}`,
      content: `## ${kp.title}\n\n${kp.content}${quizContent}`,
      subjectName: selectedChapterTitle || undefined,
      folderName: "智能課堂", // 自動歸類到「智能課堂」資料夾
    });
  };

  const handleAskFreeQuestion = () => {
    if (!userInput.trim() || !selectedChapterId) return;
    const studentMsg: ConversationItem = { role: "student", content: userInput.trim() };
    setConversation(prev => [...prev, studentMsg]);
    setPhase("feedback"); // 等待老師回答
    askQuestionMutation.mutate({
      bookId: selectedBookId,
      chapterId: selectedChapterId,
      question: userInput.trim(),
      conversationHistory: [...conversation, studentMsg].map(m => ({ role: m.role, content: m.content })),
    });
    setUserInput("");
  };

  const handleRestart = () => {
    setPhase("select");
    setConversation([]);
    setSelectedChapterId(null);
    setSelectedChapterTitle("");
    setCurrentQuiz(null);
    setAnsweredQuiz(null);
    setCurrentKP(null);
    setSelectedAnswer(null);
    setShowExplanations(false);
    setKnowledgePointIndex(1);
    setLessonSummary("");
    setPendingNextKP(null);
    setQuizRevealed(false);
    setKpCollapsedForQuiz(false);
  };

  // 同學按「下一題」按鈕：顯示下一個知識點
  const handleNextQuestion = () => {
    if (!pendingNextKP) return;
    const { kp, quiz, index, total } = pendingNextKP;
    const kpMsg = `**【知識點 ${index}/${total}】**\n${kp.content}`;
    // 將已答的 quiz 存入上一條知識點訊息，方便收合後再查看
    setConversation(prev => {
      const updated = [...prev];
      // 找到最後一條 teacher 訊息（知識點），將 answeredQuiz 存入
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "teacher" && updated[i].kp) {
          updated[i] = { ...updated[i], quiz: answeredQuiz ?? undefined, selectedAnswer: selectedAnswer ?? undefined };
          break;
        }
      }
      return [...updated, { role: "teacher", content: kpMsg, kp }];
    });
    setCurrentKP(kp);
    setCurrentQuiz(quiz);
    setAnsweredQuiz(null);
    setSelectedAnswer(null);
    setShowExplanations(false);
    setPendingNextKP(null);
    setPhase("quiz");
    setQuizRevealed(false); // 下一個知識點重置，需再次點「考考我」
    setKpCollapsedForQuiz(false);
    scrollToBottom();
  };

  const isLoading = startLessonMutation.isPending || submitAnswerMutation.isPending || askQuestionMutation.isPending;
  const mainChapters = chapters?.filter(c => !c.parentChapterId) ?? [];
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(() => new Set());
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<number>>(() => new Set()); // 收合的已答 quiz（key = conversation index）
  const toggleQuizExpand = (idx: number) => setExpandedQuizzes(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(() => new Set()); // 展開的歷史知識點（key = conversation index）
  const toggleHistoryExpand = (idx: number) => setExpandedHistory(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });
  const [quizRevealed, setQuizRevealed] = useState(false); // 同學是否已點「考考我」展開題目
  const [kpCollapsedForQuiz, setKpCollapsedForQuiz] = useState(false); // 考考我後知識點是否已摺疊
  const toggleExpand = (id: number) => setExpandedChapters(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* 選擇章節 */}
      {phase === "select" && (
        <div>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-violet-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">AI 智能課堂</h2>
            <p className="text-muted-foreground text-sm whitespace-nowrap">
              選擇一個章節，AI 老師主動講解重點知識並出題測驗，帶你一步一步學會
            </p>
          </div>

          {/* 書本下拉選單（同類科有多本書時顯示，選擇後章節跟著切換） */}
          {subjectBooks && subjectBooks.length > 1 && (
            <div className="mb-5 p-4 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium">選擇書本</span>
                <span className="text-xs text-muted-foreground">選擇不同書本可切換章節內容</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(Number(e.target.value))}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {subjectBooks.map(b => (
                    <option key={b.id} value={b.id!}>{b.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {chaptersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : mainChapters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>此書本尚無可用章節</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mainChapters.map((ch) => {
                const subChapters = chapters?.filter(c => c.parentChapterId === ch.id) ?? [];
                const hasSubChapters = subChapters.length > 0;
                const isExpanded = expandedChapters.has(ch.id);
                // 大章節本身的進度（無子節時才顯示）
                const rec = recordMap.get(ch.id);
                const accuracy = rec && rec.totalQuestions > 0 ? Math.round((rec.correctCount / rec.totalQuestions) * 100) : null;
                const hasProgress = rec && (rec.lastKnowledgePointIndex ?? 0) > 0;
                return (
                  <div key={ch.id} className="rounded-xl border border-border overflow-hidden">
                    {/* 大章節標題列 */}
                    <div
                      className={`px-4 py-3.5 flex items-center gap-3 ${hasSubChapters ? 'cursor-pointer hover:bg-muted/50' : 'hover:border-blue-400 hover:bg-blue-500/5'} transition-all group`}
                      onClick={hasSubChapters ? () => toggleExpand(ch.id) : undefined}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                        <span className="text-xs font-bold text-blue-600">{ch.chapterNumber}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ch.title}</p>
                        {hasSubChapters ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{subChapters.length} 個小節</p>
                        ) : ch.summary ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{ch.summary}</p>
                        ) : null}
                      </div>
                      {hasSubChapters ? (
                        <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      ) : rec ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {rec.isCompleted ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ 完成{accuracy !== null ? ` · 理解 ${accuracy}%` : ''}</span>
                          ) : (rec.lastKnowledgePointIndex ?? 0) > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">學到 {rec.lastKnowledgePointIndex}{accuracy !== null ? ` · ${accuracy}%` : ''}</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">進行中</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                    {/* 無子節：直接顯示開始按鈕 */}
                    {!hasSubChapters && (
                      hasProgress ? (
                        <div className="px-4 pb-3 flex gap-2">
                          <button onClick={() => handleStartLesson(ch.id, ch.title, false)} className="flex-1 text-xs py-1.5 rounded-lg border border-blue-400 text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                            ▶ 繼續上次（第 {rec!.lastKnowledgePointIndex} 題）
                          </button>
                          <button onClick={() => handleStartLesson(ch.id, ch.title, true)} className="flex-1 text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                            從頭開始
                          </button>
                        </div>
                      ) : (
                        <div className="px-4 pb-3">
                          <button onClick={() => handleStartLesson(ch.id, ch.title, false)} className="w-full text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1">
                            開始學習 <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    )}
                    {/* 有子節：展開後顯示子節列表 */}
                    {hasSubChapters && isExpanded && (
                      <div className="border-t border-border bg-muted/20">
                        {subChapters.map((sub) => {
                          const subRec = recordMap.get(sub.id);
                          const subAccuracy = subRec && subRec.totalQuestions > 0 ? Math.round((subRec.correctCount / subRec.totalQuestions) * 100) : null;
                          const subHasProgress = subRec && (subRec.lastKnowledgePointIndex ?? 0) > 0;
                          return (
                            <div key={sub.id} className="border-b border-border/50 last:border-b-0">
                              <div className="px-4 py-3 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 ml-2" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{sub.title}</p>
                                </div>
                                {subRec && (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {subRec.isCompleted ? (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ 完成{subAccuracy !== null ? ` · 理解 ${subAccuracy}%` : ''}</span>
                                    ) : (subRec.lastKnowledgePointIndex ?? 0) > 0 ? (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">學到 {subRec.lastKnowledgePointIndex}{subAccuracy !== null ? ` · ${subAccuracy}%` : ''}</span>
                                    ) : (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">進行中</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="px-4 pb-3 flex gap-2">
                                {subHasProgress ? (
                                  <>
                                    <button onClick={() => handleStartLesson(sub.id, sub.title, false)} className="flex-1 text-xs py-1.5 rounded-lg border border-blue-400 text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                                      ▶ 繼續上次（第 {subRec!.lastKnowledgePointIndex} 題）
                                    </button>
                                    <button onClick={() => handleStartLesson(sub.id, sub.title, true)} className="flex-1 text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                                      從頭開始
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={() => handleStartLesson(sub.id, sub.title, false)} className="flex-1 text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1">
                                    開始學習 <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 載入中 */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">AI 老師正在備課中...</p>
            <p className="text-xs text-muted-foreground mt-1">正在準備「{selectedChapterTitle}」的課堂內容</p>
          </div>
        </div>
      )}

      {/* 老師尚未備課 */}
      {phase === "noData" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-amber-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">老師尚未備課</p>
            <p className="text-xs text-muted-foreground mt-1">「{selectedChapterTitle}」還沒有備課資料，請老師先到後台備課。</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />選擇其他章節
          </Button>
        </div>
      )}

      {/* 課堂進行中（quiz / feedback / summary） */}
      {(phase === "quiz" || phase === "feedback" || phase === "summary" || phase === "teaching") && (
        <div className="space-y-4">
          {/* 課堂標題列 */}
          <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI 課堂</p>
                <p className="text-sm font-semibold truncate max-w-[200px]">{selectedChapterTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phase !== "summary" && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalKPs }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < knowledgePointIndex ? "bg-violet-500" : "bg-muted"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{knowledgePointIndex}/{totalKPs}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={handleRestart}>
                <ArrowLeft className="w-3.5 h-3.5" />換章節
              </Button>
            </div>
          </div>

          {/* 對話記錄 */}
          <div className="space-y-4">
            {conversation.map((item, i) => {
              // 判斷是否為最後一個 teacher 訊息（用來嵌入選擇題）
              const isLastTeacher = item.role === "teacher" && i === conversation.map((c, idx) => c.role === "teacher" ? idx : -1).filter(x => x >= 0).at(-1);
              const showInlineQuiz = isLastTeacher && (phase === "quiz" || phase === "feedback");
              const displayQuiz = phase === "feedback" ? answeredQuiz : currentQuiz;
              const hasAnswered = !!selectedAnswer;

              return (
                <div key={i} className={`flex gap-3 ${item.role === "student" ? "justify-end" : "justify-start"}`}>
                  {item.role === "teacher" && (
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-200 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-violet-600" />
                    </div>
                  )}
                  <div className={`${item.role === "teacher" ? "max-w-[96%]" : "max-w-[85%]"} rounded-2xl px-4 py-3 ${item.role === "teacher" ? "text-base" : "text-sm"} ${
                    item.role === "teacher"
                      ? "bg-card border border-border rounded-tl-sm"
                      : item.isCorrect === true
                      ? "bg-green-500/10 border border-green-300 text-green-800 rounded-tr-sm"
                      : item.isCorrect === false
                      ? "bg-red-500/10 border border-red-300 text-red-800 rounded-tr-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}>
                    {item.role === "teacher" ? (
                      <div>
                        {/* 歷史知識點：預設收合，點擊可展開 */}
                        {item.isCollapsed && !expandedHistory.has(i) ? (
                          <button
                            onClick={() => toggleHistoryExpand(i)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-base">📖</span>
                              <span className="font-medium">{item.kp?.title ?? item.content.slice(0, 30)}</span>
                            </span>
                            <span className="text-muted-foreground/60">▼ 展開</span>
                          </button>
                        ) : (
                          <div>
                            {item.isCollapsed && (
                              <button
                                onClick={() => toggleHistoryExpand(i)}
                                className="w-full flex items-center justify-between px-1 pb-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="text-base">📖</span>
                                  <span className="font-medium">{item.kp?.title ?? item.content.slice(0, 30)}</span>
                                </span>
                                <span className="text-muted-foreground/60">▲ 收合</span>
                              </button>
                            )}
                            {/* 當「考考我」已點且知識點摺疊時，只顯示標題 */}
                            {showInlineQuiz && kpCollapsedForQuiz ? (
                              <button
                                onClick={() => setKpCollapsedForQuiz(false)}
                                className="w-full flex items-center justify-between px-3 py-2 mb-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors border border-border/30"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="text-base">📖</span>
                                  <span className="font-medium">{item.kp?.title ?? '知識點'}</span>
                                  <span className="text-muted-foreground/40 text-xs">（作答後可展開複習）</span>
                                </span>
                                <span className="text-muted-foreground/60">▼ 展開</span>
                              </button>
                            ) : (
                              <Streamdown>{item.content}</Streamdown>
                            )}
                            {/* 嵌入式選擇題：只在最後一個 teacher 訊息且 quiz/feedback 階段顯示 */}
                            {showInlineQuiz && displayQuiz && !(phase === "quiz" && isLoading) && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                {/* 未點「考考我」時，顯示摺疊的考考我按鈕 */}
                                {!quizRevealed ? (
                                  <button
                                    onClick={() => { setQuizRevealed(true); setKpCollapsedForQuiz(true); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-100/60 hover:border-blue-400 transition-all text-blue-700 font-semibold text-sm"
                                  >
                                    <span className="text-lg">📝</span>
                                    <span>考考我！點我開始作答</span>
                                    <span className="text-xs text-blue-500/70 font-normal">（知識點會自動摺疊）</span>
                                  </button>
                                ) : (
                                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-md bg-blue-500 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">❓</span>
                                    </div>
                                    <p className="text-xs font-semibold text-blue-700">📝 考考你</p>
                                  </div>
                                  <p className="text-sm font-semibold mb-3 leading-relaxed text-foreground">{displayQuiz.question}</p>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {displayQuiz.options.map((opt) => {
                                      const isSelected = selectedAnswer === opt.label;
                                      const isCorrectOpt = opt.label.toUpperCase() === displayQuiz.correctAnswer.toUpperCase();
                                      return (
                                        <div key={opt.label}>
                                          <button
                                            onClick={() => handleSelectAnswer(opt.label)}
                                            disabled={hasAnswered}
                                            className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all text-xs flex items-center gap-3 ${
                                              hasAnswered
                                                ? isCorrectOpt
                                                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                                                  : isSelected
                                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                                  : "border-border/40 bg-muted/20 text-muted-foreground"
                                                : "border-blue-100 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                                            }`}
                                          >
                                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                              hasAnswered
                                                ? isCorrectOpt
                                                  ? "bg-emerald-500 text-white"
                                                  : isSelected
                                                  ? "bg-amber-400 text-white"
                                                  : "bg-muted/50 text-muted-foreground"
                                                : "bg-blue-100 text-blue-700"
                                            }`}>{opt.label}</span>
                                            <span className="flex-1">{opt.text}</span>
                                            {hasAnswered && isCorrectOpt && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                            {hasAnswered && isSelected && !isCorrectOpt && <span className="text-amber-500 text-sm flex-shrink-0">✗</span>}
                                          </button>
                                          {showExplanations && hasAnswered && opt.explanation && (
                                            <div className={`mt-1 ml-9 px-3 py-2 rounded-lg text-xs leading-relaxed border ${
                                              isCorrectOpt
                                                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                                                : isSelected
                                                ? "bg-amber-50 border-amber-100 text-amber-800"
                                                : "bg-muted/30 border-border/20 text-muted-foreground"
                                            }`}>
                                              <span className="font-semibold mr-1">{isCorrectOpt ? "✓ 正確：" : isSelected ? "✗ 提示：" : "提示："}</span>
                                              {opt.explanation}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* 自由提問 */}
                                  {phase === "quiz" && (
                                    <div className="mt-3 flex gap-2">
                                      <Input
                                        placeholder="有問題可以問老師..."
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAskFreeQuestion()}
                                        className="flex-1 h-9 text-sm"
                                      />
                                      <Button size="sm" variant="outline" onClick={handleAskFreeQuestion} disabled={!userInput.trim()} className="h-9">
                                        <Send className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                  {/* 下一題按鈕 */}
                                  {phase === "feedback" && !isLoading && pendingNextKP && (
                                    <div className="mt-3 flex justify-end">
                                      <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                        onClick={handleNextQuestion}
                                      >
                                        下一題 <ArrowRight className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                )}
                              </div>
                            )}
                            {/* 知識點訊息：顯示已答題收合卡片 + 儲存筆記按鈕 */}
                            {item.kp && item.content.includes(`【知識點`) && (
                              <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                                {/* 已答題收合卡片 */}
                                {item.quiz && (
                                  <div className="rounded-xl border border-blue-100 bg-blue-50/30 overflow-hidden">
                                    <button
                                      onClick={() => toggleQuizExpand(i)}
                                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-blue-700 hover:bg-blue-50/60 transition-colors"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <span className="text-base">📝</span>
                                        <span className="font-medium">答題記錄：{item.quiz.question.slice(0, 30)}{item.quiz.question.length > 30 ? '...' : ''}</span>
                                      </span>
                                      <span className="text-blue-400">{expandedQuizzes.has(i) ? '▲ 收合' : '▼ 展開'}</span>
                                    </button>
                                    {expandedQuizzes.has(i) && (
                                      <div className="px-3 pb-3">
                                        <p className="text-sm font-semibold mb-2 text-foreground">{item.quiz.question}</p>
                                        <div className="space-y-1.5">
                                          {item.quiz.options.map((opt) => {
                                            const isSelected = item.selectedAnswer === opt.label;
                                            const isCorrectOpt = opt.label.toUpperCase() === item.quiz!.correctAnswer.toUpperCase();
                                            return (
                                              <div key={opt.label}>
                                                <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs ${
                                                  isCorrectOpt
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                                    : isSelected
                                                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                                                    : 'border-border/30 bg-muted/20 text-muted-foreground'
                                                }`}>
                                                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                    isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-amber-400 text-white' : 'bg-muted/50 text-muted-foreground'
                                                  }`}>{opt.label}</span>
                                                  <span className="flex-1">{opt.text}</span>
                                                  {isCorrectOpt && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                                                  {isSelected && !isCorrectOpt && <span className="text-amber-500">✗</span>}
                                                </div>
                                                {opt.explanation && (isCorrectOpt || isSelected) && (
                                                  <div className={`mt-1 ml-7 px-2 py-1.5 rounded text-xs leading-relaxed ${
                                                    isCorrectOpt ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                                                  }`}>
                                                    {opt.explanation}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={() => handleSaveKPToNotes(item.kp!, item.quiz, item.selectedAnswer)}
                                  disabled={saveNotesMutation.isPending}
                                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 transition-colors"
                                >
                                  <BookMarked className="w-3.5 h-3.5" />
                                  {saveNotesMutation.isPending ? "儲存中..." : "儲存到智能筆記"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{item.content}</p>
                    )}
                  </div>
                  {item.role === "student" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* 載入中：feedback 階段 submitAnswer 在背景執行，不顯示 loading 避免干擾解析閱讀 */}
            {isLoading && phase !== "feedback" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-200 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                    <span>老師正在思考中...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 選擇題已移入最後一個 teacher 訊息卡片內部 */}

          {/* 課程結束 */}
          {phase === "summary" && !isLoading && (
            <div className="mt-4 p-5 rounded-2xl border border-green-200 bg-green-500/5">
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-bold text-lg mb-1">🎉 課程完成！</p>
                <p className="text-sm text-muted-foreground">你已完成「{selectedChapterTitle}」的學習</p>
              </div>
              {lessonSummary && (
                <div className="mb-4 p-3 rounded-xl bg-background border border-border text-sm">
                  <Streamdown>{lessonSummary}</Streamdown>
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleRestart}>選擇其他章節</Button>
                <Button onClick={() => handleStartLesson(selectedChapterId!, selectedChapterTitle)}>
                  再上一次
                </Button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
