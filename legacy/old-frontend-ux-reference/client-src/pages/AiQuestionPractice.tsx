/**
 * 智能題庫 - 學生練習介面
 * 功能：題庫列表、練習設定、作答（鍵盤快捷鍵/M標記）、結果詳解、複習錯題、學習紀錄
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen, Brain, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Loader2, ArrowLeft,
  RotateCcw, History, Trophy, Flag, RefreshCw, Trash2, BadgeCheck, BarChart2, PlayCircle,
  FileText, Search, Filter, Sparkles, GraduationCap, PenLine, X, MessageCircle, Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ImageEditModal } from "@/components/ImageEditModal";
import { Camera } from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";

type PracticeView = 'type_select' | 'mc_list' | 'essay_list' | 'essay_questions' | 'setup' | 'practice' | 'essay_practice' | 'result' | 'history' | 'question_stats' | 'real_exam_list' | 'real_exam_practice' | 'real_exam_result';

// ==================== 題型入口選擇 ====================
function TypeSelectPage({
  onSelectMC,
  onSelectEssay,
  onHistory,
  onSelectRealExam,
  essayEnabled,
}: {
  onSelectMC: () => void;
  onSelectEssay: () => void;
  onHistory: () => void;
  onSelectRealExam: () => void;
  essayEnabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            智能題庫練習
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">智能出題，選擇題型開始練習</p>
        </div>
        <Button variant="outline" size="sm" onClick={onHistory}>
          <History className="w-4 h-4 mr-2" />練習記錄
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        {/* 智能選擇題庫 */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/60 border-2 group"
          onClick={onSelectMC}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Sparkles className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-blue-700">智能選擇題庫</h3>
              <p className="text-xs text-muted-foreground mt-1">AI 出題，即時對答和解析</p>
            </div>
            <Badge className="bg-blue-600 text-white">點擊進入</Badge>
          </CardContent>
        </Card>

        {/* 真實考古題庫 - 隱藏，作為 AI 出題來源使用 */}

        {/* 智能申論題庫 */}
        {essayEnabled && (
          <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:border-orange-400/60 border-2 group"
            onClick={onSelectEssay}
          >
            <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <PenLine className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-orange-700">智能申論題庫</h3>
                <p className="text-xs text-muted-foreground mt-1">開放式作答，AI 即時批改評分</p>
              </div>
              <Badge className="bg-orange-500 text-white">點擊進入</Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ==================== 選擇題列表 ====================
function ExamList({
  onSelect,
  onBack,
  onViewStats,
}: {
  onSelect: (exam: any) => void;
  onBack: () => void;
  onViewStats: (exam: any) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [examGroupFilter, setExamGroupFilter] = useState('all');
  const [freeOnly, setFreeOnly] = useState(false);

  // 計算傳給後端的 examGroup 參數
  const examGroupParam = examGroupFilter === 'all' ? undefined : examGroupFilter;
  // 合併搜尋：年度 + 關鍵字（後端 search 只接受一個字串，年度優先）
  const combinedSearch = [yearFilter, searchText].filter(Boolean).join(' ');

  const { data: exams = [], isLoading } = trpc.aiStudent.listPublished.useQuery(
    { category: categoryFilter || undefined, examGroup: examGroupParam, search: combinedSearch || undefined, freeOnly: freeOnly || undefined }
  );

  // 只顯示選擇題題庫
  const mcExams = exams.filter((e: any) => {
    const qt: string[] = Array.isArray(e.questionTypes) ? e.questionTypes :
      (typeof e.questionTypes === 'string' ? JSON.parse(e.questionTypes || '[]') : ['multiple_choice']);
    return qt.includes('multiple_choice') || qt.length === 0;
  });

  const categories = [...new Set(mcExams.map((e: any) => e.category).filter(Boolean))];
  const filteredExams = mcExams.filter((e: any) => {
    const matchCategory = !categoryFilter || e.category === categoryFilter;
    const matchSearch = !searchText || e.title?.toLowerCase().includes(searchText.toLowerCase()) || e.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchDifficulty = !difficultyFilter || e.difficulty === difficultyFilter;
    const matchFree = !freeOnly || (e.pointCost === 0 || e.pointCost === null);
    return matchCategory && matchSearch && matchDifficulty && matchFree;
  }).sort((a: any, b: any) => {
    // 已作答的排到最上方
    if (a.practiceCount > 0 && b.practiceCount === 0) return -1;
    if (a.practiceCount === 0 && b.practiceCount > 0) return 1;
    return 0;
  });
  const difficultyLabel = (d: string) => ({ easy: '簡單', medium: '中等', hard: '困難', mixed: '混合' }[d] || d);
  const difficultyColor = (d: string) => ({
    easy: 'text-green-600', medium: 'text-amber-600', hard: 'text-red-600', mixed: 'text-blue-600'
  }[d] || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" />返回
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700">選擇題題庫</span>
            </h2>
          </div>
        </div>
      </div>


      {/* 考試類別篩選 */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: 'all', label: '全部' }, { value: '3', label: '高普考試' }, { value: '5', label: '初等考試' }, { value: '6', label: '地方特考' }, { value: '4', label: '其他特考' }, { value: 'all_explicit', label: '綜合' }].map(opt => (
          <Button
            key={opt.value}
            variant={examGroupFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExamGroupFilter(opt.value)}
          >{opt.label}</Button>
        ))}
      </div>

      {/* 年度 + 搜尋框 */}
      <div className="flex gap-2">
        <div className="relative w-28 shrink-0">
          <input
            type="text"
            placeholder="年度（如114）"
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {yearFilter && (
            <button type="button" onClick={() => setYearFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋題庫名稱..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchText && (
            <button type="button" onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button variant={categoryFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('')}>全部</Button>
          {categories.map((cat: string) => (
            <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter(cat)}>{cat}</Button>
          ))}
        </div>
      )}

      {/* 難度和免費篩選 */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">難度：</span>
        {[{ value: '', label: '全部' }, { value: 'easy', label: '簡單' }, { value: 'medium', label: '中等' }, { value: 'hard', label: '困難' }, { value: 'mixed', label: '混合' }].map(opt => (
          <Button
            key={opt.value}
            variant={difficultyFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setDifficultyFilter(opt.value)}
          >{opt.label}</Button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">| </span>
        <Button
          variant={freeOnly ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-7"
          onClick={() => setFreeOnly(v => !v)}
        >🆓 免費</Button>
        {(searchText || yearFilter || categoryFilter || difficultyFilter || examGroupFilter !== 'all' || freeOnly) && (
          <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => { setSearchText(''); setCategoryFilter(''); setDifficultyFilter(''); setExamGroupFilter('all'); setFreeOnly(false); setYearFilter(''); }}>清除篩選</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">目前沒有可練習的選擇題題庫</p>
            <p className="text-sm mt-1">請等待管理員發布題庫</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam: any) => (
<Card key={exam.id} className="hover:shadow-md transition-all hover:border-blue-400/50 border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug break-words min-w-0 flex-1">{exam.title}</CardTitle>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {exam.hasPaid ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 whitespace-nowrap">
                        <BadgeCheck className="w-3 h-3 mr-1" />已購買
                      </Badge>
                    ) : exam.pointCost > 0 ? (
                      <Badge variant="secondary" className="text-amber-700 bg-amber-50 whitespace-nowrap">{exam.pointCost} 點</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-green-700 bg-green-50 whitespace-nowrap">免費</Badge>
                    )}
                    {exam.practiceCount > 0 && (
                      <Badge className="bg-green-600 text-white text-xs whitespace-nowrap">
                        <BadgeCheck className="w-3 h-3 mr-0.5" />已練習 {exam.practiceCount} 次
                      </Badge>
                    )}
                  </div>
                </div>
                {exam.description && <CardDescription className="text-xs line-clamp-2">{exam.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    {exam.questionCount ?? 0} 題
                  </span>
                  <span className={`font-medium ${difficultyColor(exam.difficulty)}`}>{difficultyLabel(exam.difficulty)}</span>
                  {exam.category && <Badge variant="outline" className="text-xs">{exam.category}</Badge>}
                  {exam.examGroup && exam.examGroup !== 'all' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 whitespace-normal break-words max-w-[160px] leading-tight">
                      {{'3': '高普考試', '4': '其他特考', '5': '初等考試', '6': '地方特考'}[exam.examGroup as string] || exam.examGroup}
                    </Badge>
                  )}
                  {exam.examGroup === 'all' && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">綜合</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {exam.practiceCount > 0 ? (
                    <>
                      <Button className="flex-1" size="sm" onClick={() => onSelect(exam)}>
                        <PlayCircle className="w-3.5 h-3.5 mr-1" />重新作題
                      </Button>
                      <Button className="flex-1" size="sm" variant="outline" onClick={() => onViewStats(exam)}>
                        <BarChart2 className="w-3.5 h-3.5 mr-1" />作答紀錄
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" size="sm" onClick={() => onSelect(exam)}>
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />開始練習
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 以題目為單位的作答紀錄 ====================
function QuestionStatsPage({
  exam,
  onBack,
  onPracticeQuestion,
}: {
  exam: any;
  onBack: () => void;
  onPracticeQuestion: (questionId: number) => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading } = trpc.aiStudent.getQuestionStats.useQuery({ examId: exam.id });

  const difficultyLabel = (d: string) => ({ easy: '簡單', medium: '中等', hard: '困難' }[d] || d);
  const difficultyColor = (d: string) => ({
    easy: 'text-green-600', medium: 'text-amber-600', hard: 'text-red-600'
  }[d] || 'text-muted-foreground');

  const questions = data?.questions || [];
  const answered = questions.filter((q: any) => q.stats.correctCount + q.stats.wrongCount > 0);
  const mastered = answered.filter((q: any) => q.stats.lastIsCorrect === true);
  const wrong = answered.filter((q: any) => q.stats.lastIsCorrect === false);
  const notAnswered = questions.filter((q: any) => q.stats.correctCount + q.stats.wrongCount === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />返回
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700">{exam.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground">作答紀錄 · 以題目為單位</p>
        </div>
      </div>

      {/* 統計摘要 */}
      {answered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-green-600">{mastered.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">已學會</p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-red-500">{wrong.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">待加強</p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-2xl font-bold text-muted-foreground">{notAnswered.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">未作答</p>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">此題庫尚無題目</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q: any, idx: number) => {
            const { stats } = q;
            const total = stats.correctCount + stats.wrongCount;
            const isExpanded = expandedId === q.id;
            const isMastered = total > 0 && stats.lastIsCorrect === true;
            const isWrong = total > 0 && stats.lastIsCorrect === false;
            // options 可能是陣列 ["A","B",...] 或物件 {"A":"...","B":"..."}
            const rawOpts = Array.isArray(q.options) ? q.options
              : (typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })()
              : (q.options || []));
            const options: string[] = Array.isArray(rawOpts)
              ? rawOpts
              : Object.entries(rawOpts as Record<string, string>)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([, v]) => v);

            return (
              <Card key={q.id} className={`transition-all ${
                isMastered ? 'border-green-200 bg-green-50/30' :
                isWrong ? 'border-red-200 bg-red-50/30' : ''
              }`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isMastered ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isWrong ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {total > 0 && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {stats.correctCount}/{total} 答對
                            </span>
                          )}
                          <span className={`text-xs font-medium whitespace-nowrap ${difficultyColor(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</span>
                        </div>
                      </div>

                      {/* 選項預設展開顯示 */}
                      {options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {options.map((opt: string, oi: number) => {
                            const label = String.fromCharCode(65 + oi);
                            const isCorrect = q.correctAnswer === label;
                            return (
                              <div key={oi} className={`text-sm px-2 py-1 rounded ${
                                isCorrect ? 'bg-green-100 text-green-800 font-medium' : 'text-muted-foreground'
                              }`}>
                                {label}. {opt}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 解析需點擊展開 */}
                      {isExpanded && q.explanation && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                          <span className="font-medium">解析：</span>{q.explanation}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        {q.explanation && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                          >
                            {isExpanded ? '收起解析' : '查看解析'}
                          </Button>
                        )}
                        {(isWrong || total === 0) && (
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => onPracticeQuestion(q.id)}
                          >
                            <PlayCircle className="w-3 h-3 mr-1" />
                            {isWrong ? '繼續練習' : '開始練習'}
                          </Button>
                        )}
                        {isMastered && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 px-3 text-xs"
                            onClick={() => onPracticeQuestion(q.id)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />重新練習
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== 申論題列表 ====================
function EssayExamList({
  onSelect,
  onBack,
}: {
  onSelect: (exam: any) => void;
  onBack: () => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [importingId, setImportingId] = useState<number | null>(null);
  const importEssayMutation = trpc.aiStudent.importEssayToManagement.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || `成功匯入 ${data.importedCount} 題申論題到申論題管理`);
      setImportingId(null);
    },
    onError: (err) => {
      toast.error(err.message || '匯入失敗，請稍後再試');
      setImportingId(null);
    },
  });
  const { data: exams = [], isLoading } = trpc.aiStudent.listPublished.useQuery(
    categoryFilter ? { category: categoryFilter } : undefined
  );

  // 只顯示申論題題庫
  const essayExams = exams.filter((e: any) => {
    const qt: string[] = Array.isArray(e.questionTypes) ? e.questionTypes :
      (typeof e.questionTypes === 'string' ? JSON.parse(e.questionTypes || '[]') : []);
    return qt.includes('essay');
  });

  const categories = [...new Set(essayExams.map((e: any) => e.category).filter(Boolean))];
  const filteredExams = categoryFilter ? essayExams.filter((e: any) => e.category === categoryFilter) : essayExams;
  const difficultyLabel = (d: string) => ({ easy: '簡單', medium: '中等', hard: '困難', mixed: '混合' }[d] || d);
  const difficultyColor = (d: string) => ({
    easy: 'text-green-600', medium: 'text-amber-600', hard: 'text-red-600', mixed: 'text-blue-600'
  }[d] || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />返回
        </Button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-600" />
          <span className="text-orange-700">申論題題庫</span>
        </h2>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button variant={categoryFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('')}>全部</Button>
          {categories.map((cat: string) => (
            <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter(cat)}>{cat}</Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">目前沒有可練習的申論題題庫</p>
            <p className="text-sm mt-1">請等待管理員發布申論題題庫</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam: any) => (
            <Card key={exam.id} className="hover:shadow-md transition-all hover:border-orange-400/50 cursor-pointer" onClick={() => onSelect(exam)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{exam.title}</CardTitle>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {exam.hasPaid ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <BadgeCheck className="w-3 h-3 mr-1" />已購買
                      </Badge>
                    ) : exam.essayPointCost > 0 ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <Badge variant="secondary" className="text-orange-700 bg-orange-50">每題扣 {exam.essayPointCost} 點</Badge>
                        <span className="text-xs text-muted-foreground">付費後可無限次作答</span>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-green-700 bg-green-50">免費</Badge>
                    )}
                    {exam.practiceCount > 0 && (
                      <span className="text-xs text-muted-foreground">練習 {exam.practiceCount} 次</span>
                    )}
                  </div>
                </div>
                {exam.description && <CardDescription className="text-xs line-clamp-2">{exam.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    {exam.questionCount ?? 0} 題
                  </span>
                  <span className={`font-medium ${difficultyColor(exam.difficulty)}`}>{difficultyLabel(exam.difficulty)}</span>
                  {exam.category && <Badge variant="outline" className="text-xs">{exam.category}</Badge>}
                  {exam.examGroup && exam.examGroup !== 'all' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 whitespace-normal break-words max-w-[160px] leading-tight">
                      {{'3': '高普考試', '4': '其他特考', '5': '初等考試', '6': '地方特考'}[exam.examGroup as string] || exam.examGroup}
                    </Badge>
                  )}
                  {exam.examGroup === 'all' && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">綜合</Badge>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {exam.practiceCount > 0 ? (
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="sm" onClick={() => onSelect(exam)}>
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />重新作題
                    </Button>
                  ) : (
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="sm" onClick={() => onSelect(exam)}>
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />開始練習
                    </Button>
                  )}

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 申論題題目列表 ====================
function EssayQuestionList({
  exam,
  onSelectQuestion,
  onBack,
}: {
  exam: any;
  onSelectQuestion: (question: any) => void;
  onBack: () => void;
}) {
  const { data, isLoading } = trpc.aiStudent.listEssayQuestions.useQuery({ examId: exam.id });
  const difficultyLabel = (d: string) => ({ easy: '簡單', medium: '中等', hard: '困難' }[d] || d);
  const difficultyColor = (d: string) => ({
    easy: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    hard: 'text-red-600 bg-red-50 border-red-200',
  }[d] || 'text-muted-foreground bg-muted');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />返回
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-600" />
            <span className="text-orange-700">{exam.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">選擇一題申論題開始作答，每題各自扣點</p>
        </div>
      </div>

      {data?.essayPointCost && data.essayPointCost > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
          <span className="text-base">💳</span>
          <span>每題首次作答需扣 <strong>{data.essayPointCost} 點</strong>，付費後可無限次重做不重複扣點</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : !data?.questions?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">此題庫尚無申論題</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.questions.map((q: any, idx: number) => (
            <Card
              key={q.id}
              className="hover:shadow-md transition-all cursor-pointer hover:border-orange-400/60"
              onClick={() => onSelectQuestion(q)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed line-clamp-3">{q.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs ${difficultyColor(q.difficulty)}`}>
                        {difficultyLabel(q.difficulty)}
                      </Badge>
                      {q.hasPaid ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          <BadgeCheck className="w-3 h-3 mr-1" />已付費
                        </Badge>
                      ) : q.pointCost > 0 ? (
                        <Badge variant="secondary" className="text-orange-700 bg-orange-50 text-xs">{q.pointCost} 點</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-green-700 bg-green-50 text-xs">免費</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50">
                    {q.lastResult ? '再次作答' : '開始作答'}
                  </Button>
                </div>
                {q.lastResult && (
                  <div className="mt-3 ml-11 rounded-lg border border-green-200 bg-green-50/60 p-3 space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-green-700">✅ 上次作答結果</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        q.lastResult.score >= 8 ? 'bg-green-100 text-green-700' :
                        q.lastResult.score >= 6 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{q.lastResult.score} / 10 分</span>
                      {q.lastResult.gradedAt && (
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(q.lastResult.gradedAt).toLocaleDateString('zh-TW')}</span>
                      )}
                    </div>
                    {q.lastResult.feedback && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-700 font-medium hover:underline">AI 批改回饋</summary>
                        <p className="mt-1.5 text-muted-foreground leading-relaxed whitespace-pre-wrap">{q.lastResult.feedback}</p>
                      </details>
                    )}
                    {q.lastResult.userAnswer && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-700 font-medium hover:underline">我的作答</summary>
                        <p className="mt-1.5 text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-5">{q.lastResult.userAnswer}</p>
                      </details>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 申論題單題作答介面 ====================
function EssaySingleSession({
  examId,
  examTitle,
  question,
  attemptId,
  lastResult,
  onBack,
}: {
  examId: number;
  examTitle: string;
  question: any;
  attemptId: number;
  lastResult?: { score: number; feedback: string; modelAnswer: string; userAnswer: string; gradedAt: string } | null;
  onBack: () => void;
}) {
  const [answer, setAnswer] = useState('');
  // 若有上次批改結果，預設顯示；學生可選擇「再次作答」
  const [gradingResult, setGradingResult] = useState<{ score: number; feedback: string; modelAnswer: string } | null>(
    lastResult ? { score: lastResult.score, feedback: lastResult.feedback, modelAnswer: lastResult.modelAnswer } : null
  );
  const [showHistory, setShowHistory] = useState<boolean>(!!lastResult);
  const [isGrading, setIsGrading] = useState(false);
  const wordCount = answer.length;
  const MAX_WORDS = 5200;

  // 手寫圖片上傳
  const [essayImages, setEssayImages] = useState<Array<{ previewUrl: string; s3Url?: string; uploading?: boolean }>>([]);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const essayImageInputRef = useRef<HTMLInputElement>(null);
  const uploadImageMutation = trpc.storage.uploadImage.useMutation();

  const handleEssayImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (essayImages.length >= 5) { toast.error('最多上傳 5 張圖片'); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error('圖片超過 20MB，請壓縮後再上傳'); return; }
    setPendingCropFile(file);
    setCropDialogOpen(true);
    e.target.value = '';
  };

  const handleCropConfirm = async (editedFile: File) => {
    setCropDialogOpen(false);
    setPendingCropFile(null);
    const previewUrl = URL.createObjectURL(editedFile);
    const newIdx = essayImages.length;
    setEssayImages(prev => [...prev, { previewUrl, uploading: true }]);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const result = await uploadImageMutation.mutateAsync({
          filename: `essay-${Date.now()}.png`,
          contentType: 'image/png',
          base64Data,
        });
        if (result.url) {
          setEssayImages(prev => prev.map((img, i) => i === newIdx ? { ...img, s3Url: result.url, uploading: false } : img));
          toast.success('圖片已上傳');
        }
      };
      reader.readAsDataURL(editedFile);
    } catch (err: any) {
      setEssayImages(prev => prev.map((img, i) => i === newIdx ? { ...img, uploading: false } : img));
      toast.error(err?.message || '圖片上傳失敗');
    }
  };

  const removeEssayImage = (idx: number) => {
    setEssayImages(prev => prev.filter((_, i) => i !== idx));
  };

  const gradeMutation = trpc.aiStudent.gradeEssay.useMutation({
    onSuccess: (data) => {
      setGradingResult({ score: data.score, feedback: data.feedback, modelAnswer: data.modelAnswer });
      setIsGrading(false);
    },
    onError: (e) => { toast.error(e.message); setIsGrading(false); },
  });

  const handleGrade = () => {
    const imageUrls = essayImages.filter(img => img.s3Url).map(img => img.s3Url!);
    if (!answer.trim() && imageUrls.length === 0) { toast.error('請輸入作答文字或上傳手寫圖片'); return; }
    setIsGrading(true);
    gradeMutation.mutate({ attemptId, questionId: question.id, userAnswer: answer, imageUrls: imageUrls.length > 0 ? imageUrls : undefined });
  };

  const difficultyLabel = (d: string) => ({ easy: '簡單', medium: '中等', hard: '困難' }[d] || d);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />返回題目列表
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{examTitle}</p>
        </div>
        <Badge variant="outline" className="text-orange-600 border-orange-300">申論題</Badge>
      </div>

      {/* 題目內容 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">題目</span>
            <Badge variant="outline" className="text-xs">{difficultyLabel(question?.difficulty)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed whitespace-pre-wrap">{question?.question}</p>
        </CardContent>
      </Card>

      {/* 作答區 */}
      {!gradingResult && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">您的作答</label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${wordCount > MAX_WORDS ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                  {wordCount} / {MAX_WORDS} 字
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => essayImageInputRef.current?.click()}
                  disabled={essayImages.length >= 5}
                >
                  <Camera className="w-3.5 h-3.5" />拍照上傳手寫
                </Button>
                <input
                  ref={essayImageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleEssayImageSelect}
                />
              </div>
            </div>
            <textarea
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="請輸入您的作答（可不填，改用上傳手寫圖片）..."
              value={answer}
              onChange={(e) => {
                if (e.target.value.length <= MAX_WORDS) setAnswer(e.target.value);
              }}
            />
            {wordCount > MAX_WORDS * 0.9 && (
              <p className="text-xs text-amber-600">⚠️ 已接近字數上限，請控制在 {MAX_WORDS} 字以內</p>
            )}

            {/* 手寫圖片預覽 */}
            {essayImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">手寫圖片（{essayImages.length}/5）</p>
                <div className="flex flex-wrap gap-3">
                  {essayImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-24 h-24 rounded-lg border border-border overflow-hidden bg-muted">
                        <img
                          src={img.previewUrl}
                          alt={`手寫圖片 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => removeEssayImage(idx)}
                          className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                          title="刪除"
                        >×</button>
                      </div>
                      {img.s3Url && (
                        <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-green-400" title="已上傳" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">綠點 = 已上傳完成，AI 將辨識圖片中的文字進行批改</p>
              </div>
            )}

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleGrade}
              disabled={isGrading || (!answer.trim() && essayImages.filter(img => img.s3Url).length === 0)}
            >
              {isGrading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 批改中（辨識手寫 + 批改）...</> : (
                <><Brain className="w-4 h-4 mr-2" />
                  {essayImages.filter(img => img.s3Url).length > 0
                    ? `提交作答，AI 批改（文字 + ${essayImages.filter(img => img.s3Url).length} 張手寫圖片）`
                    : '提交作答，AI 批改'
                  }
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 圖片裁切 Dialog */}
      {cropDialogOpen && (
        <ImageEditModal
          open={cropDialogOpen}
          file={pendingCropFile}
          onClose={() => { setCropDialogOpen(false); setPendingCropFile(null); }}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* AI 批改結果 */}
      {gradingResult && (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-800">🤖 AI 批改結果</span>
                  {showHistory && lastResult?.gradedAt && (
                    <span className="text-xs text-muted-foreground">上次作答：{new Date(lastResult.gradedAt).toLocaleDateString('zh-TW')}</span>
                  )}
                </div>
                <Badge className={`text-base px-3 py-1 ${
                  gradingResult.score >= 8 ? 'bg-green-600 text-white' :
                  gradingResult.score >= 6 ? 'bg-amber-500 text-white' :
                  'bg-red-500 text-white'
                }`}>{gradingResult.score} / 10 分</Badge>
              </div>
              <MarkdownContent className="text-green-900 text-sm">{gradingResult.feedback}</MarkdownContent>
              {gradingResult.modelAnswer && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1.5">📌 參考答案</p>
                  <MarkdownContent className="text-green-800 text-sm">{gradingResult.modelAnswer}</MarkdownContent>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 學生作答回顾 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">您的作答</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {showHistory && lastResult?.userAnswer ? lastResult.userAnswer : answer || '（使用手寫圖片作答）'}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => {
                setGradingResult(null);
                setShowHistory(false);
                setAnswer('');
                setEssayImages([]);
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />再次作答
            </Button>
            <Button variant="outline" className="flex-1" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />返回題目列表
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 練習設定 ====================
function PracticeSetup({
  exam,
  onStart,
  onBack,
}: {
  exam: any;
  onStart: (settings: { questionCount?: number; difficulty: string; retryWrongOnly?: boolean; wrongQuestionIds?: number[] }) => void;
  onBack: () => void;
}) {
  const [settings, setSettings] = useState({
    questionCount: Math.min(20, exam.questionCount || 10),
    difficulty: 'all',
    useAll: true,
  });

  // 取得最近一次的錯題
  const { data: historyData } = trpc.aiStudent.getHistory.useQuery({ examId: exam.id, limit: 1 });
  const lastAttempt = historyData?.attempts?.[0];
  const wrongIds: number[] = lastAttempt
    ? ((lastAttempt as any).answers || []).filter((a: any) => !a.isCorrect).map((a: any) => a.questionId)
    : [];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />返回列表
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{exam.title}</CardTitle>
          {exam.description && <CardDescription>{exam.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">{exam.questionCount ?? 0}</p>
              <p className="text-muted-foreground">題庫總題數</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {settings.difficulty === 'easy' ? (exam.pointCostEasy || 0) :
                 settings.difficulty === 'medium' ? (exam.pointCostMedium || 0) :
                 settings.difficulty === 'hard' ? (exam.pointCostHard || 0) :
                 Math.max(exam.pointCostEasy || 0, exam.pointCostMedium || 0, exam.pointCostHard || 0, exam.pointCost || 0) || '免費'}
              </p>
              <p className="text-muted-foreground">選擇難度點數</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div>
              <Label>練習題數</Label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settings.useAll} onChange={e => setSettings(s => ({ ...s, useAll: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">全部 {exam.questionCount ?? 0} 題</span>
                </label>
              </div>
              {!settings.useAll && (
                <Select value={String(settings.questionCount)} onValueChange={v => setSettings(s => ({ ...s, questionCount: parseInt(v) }))}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30].filter(n => n <= (exam.questionCount || 0)).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} 題</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>難度選擇</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[
                  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700 border-gray-300', activeColor: 'bg-gray-700 text-white border-gray-700', points: Math.max(exam.pointCostEasy || 0, exam.pointCostMedium || 0, exam.pointCostHard || 0, exam.pointCost || 0) },
                  { value: 'easy', label: '簡單', color: 'bg-green-50 text-green-700 border-green-300', activeColor: 'bg-green-600 text-white border-green-600', points: exam.pointCostEasy || 0 },
                  { value: 'medium', label: '中等', color: 'bg-amber-50 text-amber-700 border-amber-300', activeColor: 'bg-amber-500 text-white border-amber-500', points: exam.pointCostMedium || 0 },
                  { value: 'hard', label: '困難', color: 'bg-red-50 text-red-700 border-red-300', activeColor: 'bg-red-600 text-white border-red-600', points: exam.pointCostHard || 0 },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setSettings(s => ({ ...s, difficulty: opt.value }))}
                    className={`rounded-lg border p-2 text-center transition-all ${
                      settings.difficulty === opt.value ? opt.activeColor : opt.color
                    }`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs mt-0.5 opacity-80">{opt.points ? `${opt.points}點` : '免費'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={() => onStart({ questionCount: settings.useAll ? undefined : settings.questionCount, difficulty: settings.difficulty })}>
            <Brain className="w-4 h-4 mr-2" />開始練習
          </Button>

          {/* 複習錯題按鈕 */}
          {wrongIds.length > 0 && (
            <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50" onClick={() => onStart({ retryWrongOnly: true, wrongQuestionIds: wrongIds, difficulty: 'all' })}>
              <RefreshCw className="w-4 h-4 mr-2" />複習上次錯題（{wrongIds.length} 題）
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 鍵盤提示 */}
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground mb-1.5">⌨️ 作答快捷鍵</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span><kbd className="bg-background border rounded px-1">1</kbd>–<kbd className="bg-background border rounded px-1">4</kbd> 選擇 A–D</span>
          <span><kbd className="bg-background border rounded px-1">←</kbd><kbd className="bg-background border rounded px-1">→</kbd> 切換題目</span>
          <span><kbd className="bg-background border rounded px-1">M</kbd> 標記/取消標記</span>
          <span><kbd className="bg-background border rounded px-1">Enter</kbd> 交卷確認</span>
        </div>
      </div>
    </div>
  );
}

// ==================== 作答介面 ====================
function PracticeSession({
  attemptId,
  examTitle,
  questions,
  onSubmit,
}: {
  attemptId: number;
  examTitle: string;
  questions: any[];
  onSubmit: (result: any) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set()); // M 標記的題目索引
  const [showConfirm, setShowConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const submitMutation = trpc.aiStudent.submitAnswers.useMutation({
    onSuccess: (data) => onSubmit(data),
    onError: (e) => toast.error(e.message),
  });

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;
  const unansweredCount = questions.length - answeredCount;

  const handleAnswer = useCallback((questionId: number, answer: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: answer };
      return next;
    });
    // 自動跳到下一題（若未到最後一題）
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 250);
    }
  }, [currentIdx, questions.length]);

  const toggleMark = useCallback((idx: number) => {
    setMarked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); toast('已取消標記'); }
      else { next.add(idx); toast('已標記此題，可稍後回來作答'); }
      return next;
    });
  }, []);

  const handleSubmit = () => {
    const answerList = questions.map(q => ({
      questionId: q.id,
      userAnswer: answers[q.id] || 'X',
    }));
    submitMutation.mutate({ attemptId, answers: answerList });
    setShowConfirm(false);
  };

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 避免在 input/textarea 中觸發
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      // 避免對話框開啟時觸發
      if (showConfirm) return;

      const optionKeys = Object.keys(currentQ?.options || {}).sort();

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIdx(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIdx(i => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMark(currentIdx);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setShowConfirm(true);
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (idx < optionKeys.length) {
          e.preventDefault();
          handleAnswer(currentQ.id, optionKeys[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIdx, currentQ, questions.length, showConfirm, handleAnswer, toggleMark]);

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto space-y-4" tabIndex={-1}>
      {/* 進度條 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{examTitle}</span>
          <span className="text-muted-foreground">{answeredCount} / {questions.length} 題</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 題目導覽 */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isMarked = marked.has(idx);
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              title={isMarked ? '已標記（M）' : isAnswered ? '已作答' : '未作答'}
              className={`relative w-8 h-8 text-xs rounded-md font-medium transition-colors ${
                isCurrent
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1'
                  : isMarked
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                  : isAnswered
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {idx + 1}
              {isMarked && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />}
            </button>
          );
        })}
      </div>

      {/* 圖例說明 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />已作答</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-400 inline-block" />已標記</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted inline-block" />未作答</span>
      </div>

      {/* 當前題目 */}
      <Card className={marked.has(currentIdx) ? 'border-amber-400 border-2' : ''}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground">第 {currentIdx + 1} 題</span>
              <Badge variant="outline" className="text-xs">
                {{ easy: '簡單', medium: '中等', hard: '困難' }[currentQ?.difficulty] || currentQ?.difficulty}
              </Badge>
            </div>
            <button
              onClick={() => toggleMark(currentIdx)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                marked.has(currentIdx)
                  ? 'bg-amber-100 text-amber-700 border border-amber-400'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title="按 M 鍵標記"
            >
              <Flag className="w-3 h-3" />
              {marked.has(currentIdx) ? '已標記' : '標記(M)'}
            </button>
          </div>
          <p className="text-base font-medium mb-4 leading-relaxed whitespace-pre-wrap">{currentQ?.question}</p>
          <div className="space-y-2">
            {currentQ?.options && Object.entries(currentQ.options as Record<string, string>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v], optIdx) => (
                <button
                  key={k}
                  onClick={() => handleAnswer(currentQ.id, k)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                    answers[currentQ.id] === k
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="font-bold bg-muted rounded px-1.5 py-0.5 text-xs min-w-[1.5rem] text-center">{optIdx + 1}</span>
                    <span className="font-bold">{k}.</span>
                    {v}
                  </span>
                </button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 導覽按鈕 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" />上一題
        </Button>
        <div className="text-xs text-muted-foreground text-center">
          {marked.size > 0 && <span className="text-amber-600 font-medium">{marked.size} 題已標記</span>}
        </div>
        {currentIdx < questions.length - 1 ? (
          <Button onClick={() => setCurrentIdx(i => i + 1)}>
            下一題<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} variant="default">
            <Trophy className="w-4 h-4 mr-2" />交卷
          </Button>
        )}
      </div>

      {/* 快速交卷按鈕（任何題目都可以交卷） */}
      {currentIdx < questions.length - 1 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm(true)} className="text-muted-foreground">
            <Trophy className="w-3.5 h-3.5 mr-1" />提前交卷
          </Button>
        </div>
      )}

      {/* 交卷確認 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>確認交卷</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm">已作答：<span className="font-bold text-green-600">{answeredCount} 題</span></p>
            {unansweredCount > 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />尚有 {unansweredCount} 題未作答（將計為錯誤）
              </p>
            )}
            {marked.size > 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <Flag className="w-4 h-4" />{marked.size} 題已標記（尚未確認）
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>繼續作答</Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}確認交卷
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 針對題目追問 AI 的對話框 ====================
function QuestionAskDialog({
  open,
  onClose,
  questionData,
}: {
  open: boolean;
  onClose: () => void;
  questionData: {
    question: string;
    options?: Record<string, string> | null;
    correctAnswer?: string | null;
    explanation?: string | null;
    userAnswer?: string | null;
    isCorrect?: boolean | null;
  } | null;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = trpc.aiStudent.chatAboutQuestion.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  // 切換題目時清空對話
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInputText('');
    }
  }, [open, questionData?.question]);

  // 自動捲到最下方
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() || chatMutation.isPending || !questionData) return;
    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputText('');
    chatMutation.mutate({
      question: questionData.question,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation,
      userAnswer: questionData.userAnswer,
      isCorrect: questionData.isCorrect,
      messages,
      userMessage: userMsg,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full flex flex-col" style={{ maxHeight: '80vh' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4 text-primary" />
            針對此題問 AI
          </DialogTitle>
        </DialogHeader>
        {/* 題目摘要 */}
        {questionData && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 border-l-2 border-primary line-clamp-3">
            {questionData.question}
          </div>
        )}
        {/* 對話區 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 py-2" style={{ minHeight: 160, maxHeight: 320 }}>
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">請輸入您對此題的疑問，AI 將幫助您理解 💡</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}>
                {m.role === 'assistant'
                  ? <MarkdownContent>{m.content}</MarkdownContent>
                  : m.content
                }
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI 思考中...
              </div>
            </div>
          )}
        </div>
        {/* 輸入區 */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入問題，按 Enter 送出..."
            disabled={chatMutation.isPending}
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputText.trim() || chatMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 結果頁面 ====================
function PracticeResult({
  result,
  examId,
  onRetry,
  onRetryWrong,
  onBack,
}: {
  result: any;
  examId: number;
  onRetry: () => void;
  onRetryWrong: (wrongIds: number[]) => void;
  onBack: () => void;
}) {
  const [showDetail, setShowDetail] = useState(true);
  const [askAIQuestion, setAskAIQuestion] = useState<any | null>(null);
  const percentage = result.percentage ?? Math.round(((result.correctCount ?? 0) / (result.totalQuestions ?? 1)) * 100);

  const gradeInfo = percentage >= 80
    ? { label: '優秀', color: 'text-green-600', bg: 'bg-green-50', icon: '🎉' }
    : percentage >= 60
    ? { label: '及格', color: 'text-amber-600', bg: 'bg-amber-50', icon: '👍' }
    : { label: '需加強', color: 'text-red-600', bg: 'bg-red-50', icon: '💪' };

  const wrongAnswers = (result.answers || []).filter((a: any) => !a.isCorrect);
  const wrongIds = wrongAnswers.map((a: any) => a.questionId);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 成績卡 */}
      <Card className={gradeInfo.bg}>
        <CardContent className="py-6 text-center">
          <p className="text-5xl mb-2">{gradeInfo.icon}</p>
          <p className={`text-4xl font-bold ${gradeInfo.color}`}>{percentage}%</p>
          <p className={`text-lg font-medium mt-1 ${gradeInfo.color}`}>{gradeInfo.label}</p>
          <p className="text-muted-foreground mt-2 text-sm">答對 {result.correctCount ?? 0} 題 / 共 {result.totalQuestions ?? 0} 題</p>
        </CardContent>
      </Card>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-3">
          <p className="text-2xl font-bold text-green-600">{result.correctCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">答對</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-2xl font-bold text-red-500">{(result.totalQuestions ?? 0) - (result.correctCount ?? 0)}</p>
          <p className="text-xs text-muted-foreground">答錯</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-2xl font-bold text-primary">{result.totalQuestions ?? 0}</p>
          <p className="text-xs text-muted-foreground">總題數</p>
        </Card>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />返回列表
        </Button>
        <Button variant="outline" onClick={onRetry} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />再練一次
        </Button>
        {wrongIds.length > 0 && (
          <Button onClick={() => onRetryWrong(wrongIds)} className="flex-1 border-red-300 bg-red-50 text-red-700 hover:bg-red-100">
            <RefreshCw className="w-4 h-4 mr-2" />複習錯題（{wrongIds.length} 題）
          </Button>
        )}
      </div>

      {/* 詳解 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">詳細解析</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowDetail(!showDetail)}>
              {showDetail ? '收起' : '展開'}
            </Button>
          </div>
        </CardHeader>
        {showDetail && (
          <CardContent className="space-y-4">
            {(result.answers || []).map((a: any, idx: number) => (
              <div key={a.questionId} className={`p-3 rounded-lg border-l-4 ${a.isCorrect ? 'border-green-500 bg-green-50/50' : 'border-red-400 bg-red-50/50'}`}>
                <div className="flex items-start gap-2">
                  {a.isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1 whitespace-pre-wrap">Q{idx + 1}. {a.question}</p>
                    {a.options && (
                      <div className="space-y-0.5 mb-2">
                        {Object.entries(a.options as Record<string, string>).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => (
                          <p key={k} className={`text-xs ${
                            k === a.correctAnswer ? 'text-green-700 font-medium' :
                            k === a.userAnswer && !a.isCorrect ? 'text-red-600 line-through' :
                            'text-muted-foreground'
                          }`}>
                            {k === a.correctAnswer ? '✓ ' : k === a.userAnswer && !a.isCorrect ? '✗ ' : '  '}{k}. {v as string}
                          </p>
                        ))}
                      </div>
                    )}
                    {!a.isCorrect && (
                      <p className="text-xs text-muted-foreground">
                        你的答案：<span className="text-red-600 font-medium">{a.userAnswer}</span>
                        　正確答案：<span className="text-green-600 font-medium">{a.correctAnswer}</span>
                      </p>
                    )}
                    {a.explanation && (
                      <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 rounded px-2 py-1.5 border-l-2 border-blue-400">
                        💡 {a.explanation}
                      </p>
                    )}
                    {/* 繼續問 AI 按鈕 */}
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-primary/40 text-primary hover:bg-primary/5"
                        onClick={() => setAskAIQuestion({
                          question: a.question,
                          options: a.options,
                          correctAnswer: a.correctAnswer,
                          explanation: a.explanation,
                          userAnswer: a.userAnswer,
                          isCorrect: a.isCorrect,
                        })}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />繼續問 AI
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* 針對題目追問 AI 的對話框 */}
      <QuestionAskDialog
        open={!!askAIQuestion}
        onClose={() => setAskAIQuestion(null)}
        questionData={askAIQuestion}
      />
    </div>
  );
}

// ==================== 申論題作答介面 ====================
function EssayPracticeSession({
  examId,
  examTitle,
  questions,
  attemptId,
  onBack,
}: {
  examId: number;
  examTitle: string;
  questions: any[];
  attemptId: number;
  onBack: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [gradingResults, setGradingResults] = useState<Record<number, { score: number; feedback: string; modelAnswer: string }>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const gradeMutation = trpc.aiStudent.gradeEssay.useMutation({
    onSuccess: (data) => {
      setGradingResults(prev => ({ ...prev, [data.questionId]: { score: data.score, feedback: data.feedback, modelAnswer: data.modelAnswer } }));
      setIsGrading(false);
    },
    onError: (e) => { toast.error(e.message); setIsGrading(false); },
  });

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentQ?.id] || '';
  const currentResult = gradingResults[currentQ?.id];
  const answeredCount = Object.keys(answers).filter(k => answers[Number(k)].trim()).length;

  const handleGrade = () => {
    if (!currentAnswer.trim()) { toast.error('請先輸入作答'); return; }
    setIsGrading(true);
    gradeMutation.mutate({
      attemptId,
      questionId: currentQ.id,
      userAnswer: currentAnswer,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />返回列表
        </Button>
        <div className="text-sm text-muted-foreground">
          {answeredCount} / {questions.length} 題已作答
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold flex-1 truncate">{examTitle}</h2>
        <Badge variant="outline" className="text-orange-600 border-orange-300">申論題</Badge>
      </div>

      {/* 題目導航 */}
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((q: any, i: number) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(i)}
            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
              i === currentIdx ? 'bg-primary text-primary-foreground' :
              gradingResults[q.id] ? 'bg-green-100 text-green-700 border border-green-300' :
              answers[q.id]?.trim() ? 'bg-amber-100 text-amber-700 border border-amber-300' :
              'bg-muted text-muted-foreground border'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* 題目內容 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">第 {currentIdx + 1} 題</span>
            <Badge variant="outline" className="text-xs">{currentQ?.difficulty === 'easy' ? '簡單' : currentQ?.difficulty === 'medium' ? '中等' : '困難'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{currentQ?.question}</p>

          {/* 作答區 */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">您的作答</label>
            <textarea
              className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="請輸入您的作答..."
              value={currentAnswer}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
              disabled={!!currentResult}
            />
          </div>

          {/* AI 批改結果 */}
          {currentResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-green-800">🤖 AI 批改結果</span>
                <Badge className="bg-green-600 text-white">{currentResult.score} 分</Badge>
              </div>
              <MarkdownContent className="text-green-900 text-sm">{currentResult.feedback}</MarkdownContent>
              {currentResult.modelAnswer && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">參考答案</p>
                  <MarkdownContent className="text-green-800 text-sm">{currentResult.modelAnswer}</MarkdownContent>
                </div>
              )}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
              <ChevronLeft className="w-4 h-4" />上一題
            </Button>
            <div className="flex gap-2">
              {!currentResult && (
                <Button size="sm" onClick={handleGrade} disabled={isGrading || !currentAnswer.trim()}>
                  {isGrading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {isGrading ? 'AI 批改中...' : '提交作答'}
                </Button>
              )}
              {currentResult && currentIdx < questions.length - 1 && (
                <Button size="sm" onClick={() => setCurrentIdx(i => i + 1)}>
                  下一題 <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))} disabled={currentIdx === questions.length - 1}>
              下一題 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 練習歷史 ====================
function PracticeHistory({ onBack, onRetryWrong }: { onBack: () => void; onRetryWrong: (examId: number, wrongIds: number[]) => void }) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<'mc' | 'essay'>('mc');

  // 選擇題歷史
  const { data: mcData, isLoading: mcLoading } = trpc.aiStudent.getHistory.useQuery();
  const mcAttempts = mcData?.attempts || [];
  const [mcSelected, setMcSelected] = useState<Set<number>>(new Set());
  const [mcDeleteConfirm, setMcDeleteConfirm] = useState(false);

  // 申論題歷史
  const { data: essayData, isLoading: essayLoading } = trpc.aiStudent.getEssayHistory.useQuery();
  const essayAttempts = essayData?.attempts || [];
  const [expandedEssay, setExpandedEssay] = useState<number | null>(null);
  const [essaySelected, setEssaySelected] = useState<Set<number>>(new Set());
  const [essayDeleteConfirm, setEssayDeleteConfirm] = useState(false);

  const deleteMcMutation = trpc.aiStudent.deleteAttempts.useMutation({
    onSuccess: (res) => {
      toast.success(`已刪除 ${res.deletedCount} 筆練習記錄`);
      setMcSelected(new Set());
      setMcDeleteConfirm(false);
      utils.aiStudent.getHistory.invalidate();
    },
    onError: () => toast.error('刪除失敗，請稍後再試'),
  });
  const deleteEssayMutation = trpc.aiStudent.deleteAttempts.useMutation({
    onSuccess: (res) => {
      toast.success(`已刪除 ${res.deletedCount} 筆申論題記錄`);
      setEssaySelected(new Set());
      setEssayDeleteConfirm(false);
      utils.aiStudent.getEssayHistory.invalidate();
    },
    onError: () => toast.error('刪除失敗，請稍後再試'),
  });

  const toggleMcSelect = (id: number) => setMcSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleMcAll = () => mcSelected.size === mcAttempts.length ? setMcSelected(new Set()) : setMcSelected(new Set(mcAttempts.map((a: any) => a.id)));
  const toggleEssaySelect = (id: number) => setEssaySelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleEssayAll = () => essaySelected.size === essayAttempts.length ? setEssaySelected(new Set()) : setEssaySelected(new Set(essayAttempts.map((a: any) => a.id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />返回列表
        </Button>
        <h2 className="text-lg font-semibold flex-1">練習記錄</h2>
        {activeTab === 'mc' && mcSelected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setMcDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-1" />刪除選取 ({mcSelected.size})
          </Button>
        )}
        {activeTab === 'essay' && essaySelected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setEssayDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-1" />刪除選取 ({essaySelected.size})
          </Button>
        )}
      </div>

      {/* 分頁切換 */}
      <div className="flex gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'mc' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('mc')}
        >
          ✅ 選擇題
          {mcAttempts.length > 0 && <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{mcAttempts.length}</span>}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'essay' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('essay')}
        >
          📝 申論題
          {essayAttempts.length > 0 && <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{essayAttempts.length}</span>}
        </button>
      </div>

      {/* 選擇題分頁 */}
      {activeTab === 'mc' && (
        mcLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : mcAttempts.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mb-3 opacity-30" /><p>尚無選擇題練習記錄</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pb-1">
              <Checkbox checked={mcSelected.size === mcAttempts.length && mcAttempts.length > 0} onCheckedChange={toggleMcAll} id="mc-select-all" />
              <label htmlFor="mc-select-all" className="text-sm text-muted-foreground cursor-pointer">
                {mcSelected.size === mcAttempts.length && mcAttempts.length > 0 ? '取消全選' : '全選'}
              </label>
            </div>
            {mcAttempts.map((a: any) => {
              const pct = a.totalQuestions > 0 ? Math.round((a.correctCount / a.totalQuestions) * 100) : 0;
              const wrongIds = (a.answers || []).filter((ans: any) => !ans.isCorrect).map((ans: any) => ans.questionId);
              const isSelected = mcSelected.has(a.id);
              return (
                <Card key={a.id} className={`p-4 transition-colors ${isSelected ? 'border-primary/60 bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleMcSelect(a.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{a.examTitle || '未知題庫'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.submittedAt ? new Date(a.submittedAt).toLocaleString('zh-TW') : ''}
                            {a.examCategory && ` · ${a.examCategory}`}
                            {a.pointsSpent > 0 && <span className="ml-1 text-amber-600">· 消耗 {a.pointsSpent} 點</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {wrongIds.length > 0 && (
                            <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => onRetryWrong(a.examId, wrongIds)}>
                              <RefreshCw className="w-3 h-3 mr-1" />複習錯題
                            </Button>
                          )}
                          <div className="text-right flex-shrink-0">
                            <p className={`text-lg font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</p>
                            <p className="text-xs text-muted-foreground">{a.correctCount}/{a.totalQuestions}</p>
                          </div>
                        </div>
                      </div>
                      <Progress value={pct} className="h-1.5 mt-2" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* 申論題分頁 */}
      {activeTab === 'essay' && (
        essayLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : essayAttempts.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mb-3 opacity-30" /><p>尚無申論題作答記錄</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 pb-1">
              <Checkbox checked={essaySelected.size === essayAttempts.length && essayAttempts.length > 0} onCheckedChange={toggleEssayAll} id="essay-select-all" />
              <label htmlFor="essay-select-all" className="text-sm text-muted-foreground cursor-pointer">
                {essaySelected.size === essayAttempts.length && essayAttempts.length > 0 ? '取消全選' : '全選'}
              </label>
            </div>
            {essayAttempts.map((a: any) => {
              const ans = Array.isArray(a.answers) ? a.answers[0] : null;
              const score = ans?.score ?? a.score ?? 0;
              const isSelected = essaySelected.has(a.id);
              const isExpanded = expandedEssay === a.id;
              return (
                <Card key={a.id} className={`transition-colors ${isSelected ? 'border-primary/60 bg-primary/5' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleEssaySelect(a.id)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{a.examTitle || '未知題庫'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.submittedAt ? new Date(a.submittedAt).toLocaleString('zh-TW') : ''}
                              {a.examCategory && ` · ${a.examCategory}`}
                              {a.pointsSpent > 0 && <span className="ml-1 text-amber-600">· 消耗 {a.pointsSpent} 點</span>}
                            </p>
                            {ans?.questionText && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">📌 {ans.questionText}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${score >= 8 ? 'text-green-600' : score >= 6 ? 'text-amber-600' : 'text-red-500'}`}>{score}/10</p>
                              <p className="text-xs text-muted-foreground">申論題</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 px-2"
                              onClick={() => setExpandedEssay(isExpanded ? null : a.id)}>
                              {isExpanded ? '收起' : '查看解析'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* 展開批改解析 */}
                    {isExpanded && ans && (
                      <div className="mt-4 ml-7 space-y-3 border-t border-border pt-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">📝 我的作答</p>
                          <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{ans.userAnswer}</div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">🤖 AI 批改意見</p>
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3">
                            <MarkdownContent className="text-blue-900 dark:text-blue-100 text-sm">{ans.feedback}</MarkdownContent>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">✨ 參考答案</p>
                          <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3">
                            <MarkdownContent className="text-green-900 dark:text-green-100 text-sm">{ans.modelAnswer}</MarkdownContent>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* 選擇題刪除確認 */}
      <AlertDialog open={mcDeleteConfirm} onOpenChange={setMcDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除選取的 {mcSelected.size} 筆選擇題練習記錄？此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMcMutation.mutate({ attemptIds: Array.from(mcSelected) })}>
              {deleteMcMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '確定刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 申論題刪除確認 */}
      <AlertDialog open={essayDeleteConfirm} onOpenChange={setEssayDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除選取的 {essaySelected.size} 筆申論題作答記錄？此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEssayMutation.mutate({ attemptIds: Array.from(essaySelected) })}>
              {deleteEssayMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '確定刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== 真實考古題：素材清單 ====================
function RealExamList({
  onBack,
  onStartPractice,
  isStarting,
}: {
  onBack: () => void;
  onStartPractice: (sourceId: number, questionType: 'multiple_choice' | 'essay', questionCount?: number) => void;
  isStarting: boolean;
}) {
  const [keyword, setKeyword] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'multiple_choice' | 'essay' | 'all'>('all');
  const [selectedSource, setSelectedSource] = useState<any | null>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [historySourceId, setHistorySourceId] = useState<number | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const utils = trpc.useUtils();
  const { data: yearsData = [] } = trpc.realExamStudent.listYears.useQuery();
  const { data: categoriesData = [] } = trpc.realExamStudent.listCategories.useQuery();
  const { data: historyData } = trpc.realExamStudent.getSourceHistory.useQuery(
    { sourceId: historySourceId! },
    { enabled: !!historySourceId && showHistoryDialog }
  );
  const { data, isLoading, refetch: refetchSources } = trpc.realExamStudent.listAvailable.useQuery({
    keyword: keyword || undefined,
    year: yearFilter || undefined,
    category: categoryFilter || undefined,
    questionType: typeFilter,
    limit: 50,
    offset: 0,
  });
  // 已作答的排到最上方，未作答的維持原順序
  const sources = [...(data?.sources || [])].sort((a: any, b: any) => {
    if (a.practiceCount > 0 && b.practiceCount === 0) return -1;
    if (a.practiceCount === 0 && b.practiceCount > 0) return 1;
    return 0;
  });

  const handleSelectSource = (source: any) => {
    setSelectedSource(source);
    // 若只有一種題型，直接開始；否則彈出選擇對話框
    const hasMC = source.mcCount > 0;
    const hasEssay = source.essayCount > 0;
    if (hasMC && hasEssay) {
      setShowTypeDialog(true);
    } else if (hasMC) {
      onStartPractice(source.id, 'multiple_choice');
    } else if (hasEssay) {
      onStartPractice(source.id, 'essay');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />返回
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-green-600" />
            真實考古題練習
          </h2>
          <p className="text-sm text-muted-foreground">原始考題，AI 自動判斷題型</p>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋考試名稱..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={yearFilter || '_all'} onValueChange={(v) => setYearFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="年度" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部年度</SelectItem>
            {yearsData.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter || '_all'} onValueChange={(v) => setCategoryFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="科目" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部科目</SelectItem>
            {categoriesData.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部題型</SelectItem>
            <SelectItem value="multiple_choice">選擇題</SelectItem>
            <SelectItem value="essay">申論題</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">尚無可練習的考古題</p>
          <p className="text-xs mt-1">請聯絡管理員上傳考古題素材並提取題目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((source: any) => (
            <Card
              key={source.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-green-400/60 border"
              onClick={() => !isStarting && handleSelectSource(source)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{source.title}</h3>
                      {source.practiceCount > 0 && (
                        <Badge className="bg-green-600 text-white text-xs shrink-0">
                          <BadgeCheck className="w-3 h-3 mr-0.5" />已練習 {source.practiceCount} 次
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {source.year && <Badge variant="outline" className="text-xs px-1.5 py-0">{source.year}</Badge>}
                      {source.category && <Badge variant="outline" className="text-xs px-1.5 py-0">{source.category}</Badge>}
                      {source.examGroup && <Badge variant="outline" className="text-xs px-1.5 py-0 max-w-[160px] whitespace-normal break-words leading-tight">{source.examGroup}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {source.mcCount > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />{source.mcCount} 選擇
                      </Badge>
                    )}
                    {source.essayCount > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        <PenLine className="w-3 h-3 mr-1" />{source.essayCount} 申論
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isStarting}
                    onClick={(e) => { e.stopPropagation(); handleSelectSource(source); }}
                  >
                    {isStarting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PlayCircle className="w-4 h-4 mr-1" />}
                    {source.practiceCount > 0 ? '重新作題' : '開始練習'}
                  </Button>
                  {source.practiceCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setHistorySourceId(source.id); setShowHistoryDialog(true); }}
                    >
                      <BarChart2 className="w-4 h-4 mr-1" />作答紀錄
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 作答紀錄 Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-green-600" />作答紀錄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {!historyData ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : historyData.attempts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">尚無作答紀錄</p>
            ) : (
              historyData.attempts.map((attempt: any, idx: number) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">第 {historyData.attempts.length - idx} 次練習</p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.questionType === 'multiple_choice' ? '選擇題' : '申論題'} · 
                      {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <div className="text-right">
                    {attempt.questionType === 'multiple_choice' ? (
                      <p className="text-sm font-bold text-green-700">{attempt.correctCount}/{attempt.totalQuestions} 題</p>
                    ) : (
                      <p className="text-sm font-bold text-orange-700">{attempt.score ?? '-'}/{attempt.totalScore ?? '-'} 分</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 題型選擇對話框 */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>選擇練習題型</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
              onClick={() => { setShowTypeDialog(false); if (selectedSource) onStartPractice(selectedSource.id, 'multiple_choice'); }}
            >
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">選擇題</span>
              <span className="text-xs text-muted-foreground">{selectedSource?.mcCount} 題</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50"
              onClick={() => { setShowTypeDialog(false); if (selectedSource) onStartPractice(selectedSource.id, 'essay'); }}
            >
              <PenLine className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium">申論題</span>
              <span className="text-xs text-muted-foreground">{selectedSource?.essayCount} 題</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 真實考古題：選擇題作答 ====================
function RealExamPracticeSession({
  attemptId,
  sourceTitle,
  questions,
  questionType,
  onSubmit,
}: {
  attemptId: number;
  sourceTitle: string;
  questions: any[];
  questionType: 'multiple_choice' | 'essay';
  onSubmit: (result: any) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [essayAnswer, setEssayAnswer] = useState('');
  // 手寫圖片上傳（整合 ImageCropDialog）
  const [essayImages, setEssayImages] = useState<Array<{ previewUrl: string; s3Url?: string; uploading?: boolean }>>([]); 
  const essayImageInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  const uploadImageMutation = trpc.storage.uploadImage.useMutation();

  const handleEssayImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (essayImages.length >= 5) { toast.error('最多上傳 5 張圖片'); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error('圖片超過 20MB，請壓縮後再上傳'); return; }
    setPendingCropFile(file);
    setCropDialogOpen(true);
    if (e.target) e.target.value = '';
  };

  const handleCropConfirm = async (editedFile: File) => {
    const croppedBlob = editedFile;
    setCropDialogOpen(false);
    setPendingCropFile(null);
    const previewUrl = URL.createObjectURL(croppedBlob);
    const newIdx = essayImages.length;
    setEssayImages(prev => [...prev, { previewUrl, uploading: true }]);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const result = await uploadImageMutation.mutateAsync({
          filename: `essay-${Date.now()}.png`,
          contentType: 'image/png',
          base64Data,
        });
        if (result.url) {
          setEssayImages(prev => prev.map((img, i) => i === newIdx ? { ...img, s3Url: result.url, uploading: false } : img));
          toast.success('圖片已上傳');
        }
      };
      reader.readAsDataURL(croppedBlob);
    } catch (err: any) {
      setEssayImages(prev => prev.map((img, i) => i === newIdx ? { ...img, uploading: false } : img));
      toast.error(err?.message || '圖片上傳失敗');
    }
  };

  const removeEssayImage = (idx: number) => {
    setEssayImages(prev => { URL.revokeObjectURL(prev[idx].previewUrl); return prev.filter((_, i) => i !== idx); });
  };

  const submitMCMutation = trpc.realExamStudent.submitAnswers.useMutation({
    onSuccess: (data) => { setSubmitted(true); onSubmit(data); },
    onError: (e) => toast.error(e.message),
  });

  const gradeEssayMutation = trpc.realExamStudent.gradeEssay.useMutation({
    onSuccess: (data) => { setSubmitted(true); onSubmit(data); },
    onError: (e) => toast.error(e.message),
  });

  const currentQ = questions[currentIdx];
  const progress = Math.round(((currentIdx + 1) / questions.length) * 100);
  const answeredCount = Object.keys(answers).length;

  const handleSelectAnswer = useCallback((qId: number, opt: string) => {
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    // 選擇後自動跳到下一題
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 250);
    }
  }, [currentIdx, questions.length]);

  const toggleMark = useCallback((idx: number) => {
    setMarked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); toast('已取消標記'); }
      else { next.add(idx); toast('已標記此題，可稍後回來作答'); }
      return next;
    });
  }, []);

  // 鍵盤快捷鍵（1/2/3/4 選項、M 標記、方向鍵切換題目）
  useEffect(() => {
    if (questionType !== 'multiple_choice') return;
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (showConfirm) return;
      const optionKeys = Object.keys(currentQ?.options || {}).sort();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIdx(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIdx(i => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMark(currentIdx);
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (idx < optionKeys.length) {
          e.preventDefault();
          handleSelectAnswer(currentQ.id, optionKeys[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIdx, currentQ, questions.length, showConfirm, questionType, handleSelectAnswer, toggleMark]);

  const handleSubmit = () => {
    if (questionType === 'multiple_choice') {
      const answerList = questions.map(q => ({
        questionId: q.id,
        userAnswer: answers[q.id] || '',
      }));
      submitMCMutation.mutate({ attemptId, answers: answerList });
    } else {
      const imageUrls = essayImages.filter(img => img.s3Url).map(img => img.s3Url!);
      gradeEssayMutation.mutate({
        attemptId,
        questionId: currentQ.id,
        userAnswer: essayAnswer,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    }
  };

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold line-clamp-1">{sourceTitle}</h2>
          <p className="text-xs text-muted-foreground">
            {questionType === 'multiple_choice' ? '選擇題' : '申論題'} · 共 {questions.length} 題
          </p>
        </div>
        <Badge variant="outline">{currentIdx + 1} / {questions.length}</Badge>
      </div>

      <Progress value={progress} className="h-1.5" />

      {questionType === 'multiple_choice' ? (
        <div className="space-y-4">
          {/* 題目導航 */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  i === currentIdx ? 'bg-primary text-primary-foreground' :
                  marked.has(i) ? 'bg-yellow-100 text-yellow-700 border border-yellow-400' :
                  answers[q.id] ? 'bg-green-100 text-green-700 border border-green-300' :
                  'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >{i + 1}</button>
            ))}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400"></span>已作答</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-400"></span>已標記</span>
            <span className="ml-auto">⌨️ 1-4 選項 | M 標記 | ← → 切換</span>
          </div>

          {/* 當前題目 */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="font-medium text-sm leading-relaxed whitespace-pre-wrap flex-1 pr-2">{currentQ?.question}</p>
                <button
                  onClick={() => toggleMark(currentIdx)}
                  className={`shrink-0 text-xs px-2 py-1 rounded border transition-colors ${
                    marked.has(currentIdx)
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-400'
                      : 'bg-muted text-muted-foreground border-border hover:border-yellow-400'
                  }`}
                >
                  {marked.has(currentIdx) ? '★ 已標記' : '☆ 標記(M)'}
                </button>
              </div>
              <div className="space-y-2">
                {currentQ?.options && Object.entries(currentQ.options as Record<string, string>)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, val], optIdx) => (
                  <button
                    key={key}
                    onClick={() => handleSelectAnswer(currentQ.id, key)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                      answers[currentQ.id] === key
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted text-muted-foreground text-xs font-bold mr-2 shrink-0">{optIdx + 1}</span>
                    <span className="font-bold mr-1">{key}.</span>{val}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 導航按鈕 */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
              <ChevronLeft className="w-4 h-4" />上一題
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentIdx(currentIdx + 1)}>
                下一題<ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowConfirm(true)}
                disabled={submitMCMutation.isPending}
              >
                {submitMCMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                提交答案（{answeredCount}/{questions.length}）
              </Button>
            )}
          </div>

          {/* 提交確認對話框 */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <h3 className="font-bold text-lg mb-2">確認提交</h3>
                <p className="text-sm text-muted-foreground mb-1">已作答 {answeredCount} / {questions.length} 題</p>
                {answeredCount < questions.length && (
                  <p className="text-sm text-orange-600 mb-3">尚有 {questions.length - answeredCount} 題未作答，確定要提交嗎？</p>
                )}
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>取消</Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit} disabled={submitMCMutation.isPending}>
                    {submitMCMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    確認提交
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 申論題 */
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <p className="font-medium text-sm leading-relaxed whitespace-pre-wrap">{currentQ?.question}</p>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">您的作答</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">可打字或上傳手寫圖片</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => essayImageInputRef.current?.click()}
                  disabled={essayImages.length >= 5}
                >
                  <Camera className="w-3.5 h-3.5" />上傳手寫圖片
                </Button>
                <input
                  ref={essayImageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleEssayImageSelect}
                />
              </div>
            </div>
            <textarea
              className="w-full min-h-[160px] p-3 rounded-lg border border-border text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              placeholder="請在此輸入您的作答（可不填，改用上傳手寫圖片）..."
              value={essayAnswer}
              onChange={(e) => setEssayAnswer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{essayAnswer.length} / 5000 字</p>
          </div>

          {/* 手寫圖片預覽 */}
          {essayImages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">手寫圖片（{essayImages.length}/5）</Label>
              <div className="flex flex-wrap gap-3">
                {essayImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="w-24 h-24 rounded-lg border border-border overflow-hidden bg-muted">
                      <img
                        src={img.previewUrl}
                        alt={`手寫圖片 ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    {/* 操作按鈕 */}
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => removeEssayImage(idx)}
                        className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                        title="刪除"
                      >×</button>
                    </div>
                    {img.s3Url && (
                      <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-green-400" title="已上傳" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">點擊圖片可再次裁切，綠點 = 已上傳完成</p>
            </div>
          )}

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSubmit}
            disabled={gradeEssayMutation.isPending || (essayAnswer.trim().length < 5 && essayImages.filter(img => img.s3Url).length === 0)}
          >
            {gradeEssayMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 批改中（辨識手寫 + 批改）...</>
            ) : (
              <>
                {essayImages.filter(img => img.s3Url).length > 0
                  ? `AI 批改（文字 + ${essayImages.filter(img => img.s3Url).length} 張手寫圖片）`
                  : 'AI 批改作答'
                }
              </>
            )}
          </Button>
        </div>
      )}
    </div>

    {/* 圖片裁切旋轉 Dialog */}
    {cropDialogOpen && (
      <ImageEditModal
        open={cropDialogOpen}
        file={pendingCropFile}
        onClose={() => { setCropDialogOpen(false); setPendingCropFile(null); }}
        onConfirm={handleCropConfirm}
      />
    )}
    </>
  );
}

// ==================== 真實考古題：結果頁 ====================
function RealExamResult({
  result,
  onBack,
  onRetry,
}: {
  result: any;
  onBack: () => void;
  onRetry: () => void;
}) {
  // 判斷是選擇題結果還是申論題結果
  const isMC = result.answers && Array.isArray(result.answers);
  const percentage = isMC ? result.percentage : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />返回列表
        </Button>
        <h2 className="text-xl font-bold">練習結果</h2>
      </div>

      {isMC ? (
        <>
          {/* 選擇題成績 */}
          <Card className="border-2 border-green-200">
            <CardContent className="p-6 text-center">
              <div className={`text-5xl font-bold mb-2 ${
                percentage! >= 80 ? 'text-green-600' : percentage! >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>{percentage}%</div>
              <p className="text-muted-foreground text-sm">
                答對 {result.correctCount} / {result.totalQuestions} 題
              </p>
              <Badge className={`mt-2 ${
                percentage! >= 80 ? 'bg-green-600' : percentage! >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              } text-white`}>
                {percentage! >= 80 ? '優秀' : percentage! >= 60 ? '及格' : '需加強'}
              </Badge>
            </CardContent>
          </Card>

          {/* 詳細解析 */}
          <div className="space-y-3">
            {result.answers?.map((a: any, i: number) => (
              <Card key={a.questionId} className={`border ${
                a.isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">
                      {a.isCorrect
                        ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                        : <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{i + 1}. {a.question}</p>
                      {!a.isCorrect && (
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-red-600">您的答案：{a.userAnswer}</p>
                          <p className="text-green-700 font-medium">正確答案：{a.correctAnswer}</p>
                        </div>
                      )}
                      {a.explanation && (
                        <div className="mt-2 p-2 bg-muted/60 rounded text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">解析：</span>{a.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* 申論題批改結果 */
        <Card className="border-2 border-orange-200">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-orange-600 mb-1">{result.score}<span className="text-2xl text-muted-foreground">/10</span></div>
              <Badge className={`${
                result.score >= 8 ? 'bg-green-600' : result.score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
              } text-white`}>
                {result.score >= 8 ? '優秀' : result.score >= 6 ? '及格' : '需加強'}
              </Badge>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">批改意見</h4>
              <MarkdownContent className="text-muted-foreground text-sm">{result.feedback}</MarkdownContent>
            </div>
            {result.modelAnswer && (
              <div>
                <h4 className="text-sm font-semibold mb-2">參考答案</h4>
                <div className="p-3 bg-muted/60 rounded">
                  <MarkdownContent className="text-sm">{result.modelAnswer}</MarkdownContent>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />返回列表
        </Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={onRetry}>
          <RotateCcw className="w-4 h-4 mr-1" />再做一次
        </Button>
      </div>
    </div>
  );
}

// ==================== 主頁面 ====================
export default function AiQuestionPractice() {
  const [view, setView] = useState<PracticeView>('type_select');
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [practiceData, setPracticeData] = useState<{
    attemptId: number;
    examTitle: string;
    questions: any[];
  } | null>(null);
  const [essayPracticeData, setEssayPracticeData] = useState<{
    examId: number;
    examTitle: string;
    questions: any[];
    attemptId: number;
  } | null>(null);
  // 申論題單題作答狀態
  const [essaySingleData, setEssaySingleData] = useState<{
    lastResult?: { score: number; feedback: string; modelAnswer: string; userAnswer: string; gradedAt: string } | null;
    examId: number;
    examTitle: string;
    question: any;
    attemptId: number;
  } | null>(null);
  // 申論題單題扣點確認
  const [essayQuestionConfirm, setEssayQuestionConfirm] = useState<{
    open: boolean;
    exam: any;
    question: any;
  } | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);

  // 真實考古題狀態
  const [realExamPracticeData, setRealExamPracticeData] = useState<{
    attemptId: number;
    sourceId: number;
    sourceTitle: string;
    questions: any[];
    questionType: 'multiple_choice' | 'essay';
  } | null>(null);
  const [realExamResultData, setRealExamResultData] = useState<any | null>(null);

  // 功能開關：申論批改
  const { data: featureData } = trpc.featureToggles.getAll.useQuery(undefined, {
    staleTime: 60000,
  });
  const essayEnabled = featureData?.toggles?.essay_grading === true;

  // 扣點確認對話框狀態
  const [pointConfirm, setPointConfirm] = useState<{
    open: boolean;
    alreadyPaid: boolean;
    practiceType: 'multiple_choice' | 'essay';
    settings: { questionCount?: number; difficulty: string; retryWrongOnly?: boolean; wrongQuestionIds?: number[] } | null;
  }>({ open: false, alreadyPaid: false, practiceType: 'multiple_choice', settings: null });

  const { data: balanceData, refetch: refetchBalance } = trpc.credits.getBalance.useQuery();
  const balance = balanceData?.balance ?? 0;
  const utils = trpc.useUtils();

  // 真實考古題開始練習
  const realExamStartMutation = trpc.realExamStudent.startPractice.useMutation({
    onSuccess: (data, variables) => {
      setRealExamPracticeData({
        attemptId: data.attemptId,
        sourceId: variables.sourceId,
        sourceTitle: data.sourceTitle,
        questions: data.questions,
        questionType: data.questionType as 'multiple_choice' | 'essay',
      });
      setView('real_exam_practice');
    },
    onError: (e) => toast.error(e.message),
  });

  const startMutation = trpc.aiStudent.startPractice.useMutation({
    onSuccess: (data) => {
      if (data.pointsSpent > 0) {
        toast.success(`已扣除 ${data.pointsSpent} 點，開始練習！`);
        refetchBalance();
      }
      setPracticeData({
        attemptId: data.attemptId,
        examTitle: data.examTitle,
        questions: data.questions,
      });
      setView('practice');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSelectExam = (exam: any) => {
    setSelectedExam(exam);
    // 直接開始練習，使用題庫全部題數和混合難度
    // 使用 exam.hasPaid（後端已回傳）判斷是否已購買，避免非同步查詢時序問題
    if (exam.pointCost > 0 && !exam.hasPaid) {
      setPointConfirm({ open: true, alreadyPaid: false, practiceType: 'multiple_choice', settings: { difficulty: 'all' } });
    } else {
      startMutation.mutate({
        examId: exam.id,
        difficulty: 'all',
        practiceType: 'multiple_choice',
      });
    }
  };

  const startEssayMutation = trpc.aiStudent.startPractice.useMutation({
    onSuccess: (data) => {
      if (data.pointsSpent > 0) {
        toast.success(`已扣除 ${data.pointsSpent} 點，開始申論練習！`);
        refetchBalance();
      }
      setEssayPracticeData({
        examId: selectedExam!.id,
        examTitle: data.examTitle,
        questions: data.questions,
        attemptId: data.attemptId,
      });
      setView('essay_practice');
    },
    onError: (e) => toast.error(e.message),
  });

  // 申論題單題開始作答
  const startEssayQuestionMutation = trpc.aiStudent.startEssayQuestion.useMutation({
    onSuccess: (data) => {
      if (data.pointsSpent > 0) {
        toast.success(`已扣除 ${data.pointsSpent} 點，開始作答！`);
        refetchBalance();
      }
      setEssaySingleData({
        examId: essayQuestionConfirm?.exam?.id || selectedExam?.id,
        examTitle: data.examTitle,
        question: data.question,
        attemptId: data.attemptId,
        lastResult: data.lastResult,
      });
      setEssayQuestionConfirm(null);
      setView('essay_practice');
    },
    onError: (e) => { toast.error(e.message); setEssayQuestionConfirm(null); },
  });

  const handleSelectEssay = (exam: any) => {
    setSelectedExam(exam);
    // 進入申論題題目列表（不再直接開始全部作答）
    setView('essay_questions');
  };

  const handleSelectEssayQuestion = (exam: any, question: any) => {
    // 單題確認扣點
    if (question.pointCost > 0 && !question.hasPaid) {
      setEssayQuestionConfirm({ open: true, exam, question });
    } else {
      // 免費或已付費，直接開始
      startEssayQuestionMutation.mutate({ examId: exam.id, questionId: question.id });
    }
  };

  const doStartPractice = (settings: { questionCount?: number; difficulty: string; retryWrongOnly?: boolean; wrongQuestionIds?: number[] }) => {
    if (!selectedExam) return;
    startMutation.mutate({
      examId: selectedExam.id,
      questionCount: settings.questionCount,
      difficulty: settings.difficulty as any,
      retryWrongOnly: settings.retryWrongOnly,
      wrongQuestionIds: settings.wrongQuestionIds,
      practiceType: 'multiple_choice',
    });
  };

  const handleStartPractice = (settings: { questionCount?: number; difficulty: string; retryWrongOnly?: boolean; wrongQuestionIds?: number[] }) => {
    if (!selectedExam) return;
    // 若有點數費用且尚未付費，先顯示確認對話框
    if (selectedExam.pointCost > 0 && !selectedExam.hasPaid) {
      setPointConfirm({ open: true, alreadyPaid: false, practiceType: 'multiple_choice', settings });
    } else {
      doStartPractice(settings);
    }
  };

  const handleRetryWrongFromHistory = (examId: number, wrongIds: number[]) => {
    // 從歷史紀錄複習錯題，需先找到對應題庫
    setView('type_select');
    // 直接呼叫 startPractice（已付費題庫不扣點）
    startMutation.mutate({
      examId,
      retryWrongOnly: true,
      wrongQuestionIds: wrongIds,
      difficulty: 'all',
    });
  };

  const handleSubmitResult = (result: any) => {
    setResultData(result);
    setView('result');
    // 練習完成後即時更新已購買狀態（hasPaid）和練習次數
    utils.aiStudent.listPublished.invalidate();
  };

  const handleRetry = () => {
    // 重新練習：直接重新開始
    if (selectedExam) {
      startMutation.mutate({
        examId: selectedExam.id,
        difficulty: 'all',
        practiceType: 'multiple_choice',
      });
    }
    setPracticeData(null);
    setResultData(null);
  };

  const handleRetryWrong = (wrongIds: number[]) => {
    if (!selectedExam) return;
    doStartPractice({ retryWrongOnly: true, wrongQuestionIds: wrongIds, difficulty: 'all' });
    setPracticeData(null);
    setResultData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {(startMutation.isPending || startEssayMutation.isPending || startEssayQuestionMutation.isPending) && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">正在準備題目...</p>
            </div>
          </div>
        )}
        {view === 'type_select' && (
          <TypeSelectPage
            onSelectMC={() => setView('mc_list')}
            onSelectEssay={() => setView('essay_list')}
            onHistory={() => setView('history')}
            onSelectRealExam={() => setView('real_exam_list')}
            essayEnabled={essayEnabled}
          />
        )}
        {view === 'mc_list' && (
          <ExamList
            onSelect={handleSelectExam}
            onBack={() => setView('type_select')}
            onViewStats={(exam) => { setSelectedExam(exam); setView('question_stats'); }}
          />
        )}
        {view === 'essay_list' && (
          <EssayExamList
            onSelect={handleSelectEssay}
            onBack={() => setView('type_select')}
          />
        )}
        {view === 'essay_questions' && selectedExam && (
          <EssayQuestionList
            exam={selectedExam}
            onSelectQuestion={(q) => handleSelectEssayQuestion(selectedExam, q)}
            onBack={() => { setView('essay_list'); setSelectedExam(null); }}
          />
        )}
        {/* setup view 已移除，點開始練習直接開始 */}
        {view === 'practice' && practiceData && (
          <PracticeSession
            attemptId={practiceData.attemptId}
            examTitle={practiceData.examTitle}
            questions={practiceData.questions}
            onSubmit={handleSubmitResult}
          />
        )}
        {view === 'result' && resultData && (
          <PracticeResult
            result={resultData}
            examId={selectedExam?.id}
            onRetry={handleRetry}
            onRetryWrong={handleRetryWrong}
            onBack={() => { setView('mc_list'); setSelectedExam(null); setResultData(null); }}
          />
        )}
        {view === 'history' && (
          <PracticeHistory onBack={() => setView('type_select')} onRetryWrong={handleRetryWrongFromHistory} />
        )}
        {view === 'question_stats' && selectedExam && (
          <QuestionStatsPage
            exam={selectedExam}
            onBack={() => { setView('mc_list'); setSelectedExam(null); }}
            onPracticeQuestion={(questionId) => {
              // 練習單題：對該題目開始練習
              startMutation.mutate({
                examId: selectedExam.id,
                difficulty: 'all',
                practiceType: 'multiple_choice',
                wrongQuestionIds: [questionId],
                retryWrongOnly: true,
              });
              setView('practice');
            }}
          />
        )}
        {view === 'real_exam_list' && (
          <RealExamList
            onBack={() => setView('type_select')}
            onStartPractice={(sourceId, questionType, questionCount) => {
              realExamStartMutation.mutate({ sourceId, questionType, questionCount });
            }}
            isStarting={realExamStartMutation.isPending}
          />
        )}
        {view === 'real_exam_practice' && realExamPracticeData && (
          <RealExamPracticeSession
            attemptId={realExamPracticeData.attemptId}
            sourceTitle={realExamPracticeData.sourceTitle}
            questions={realExamPracticeData.questions}
            questionType={realExamPracticeData.questionType}
            onSubmit={(result) => { setRealExamResultData(result); setView('real_exam_result'); }}
          />
        )}
        {view === 'real_exam_result' && realExamResultData && (
          <RealExamResult
            result={realExamResultData}
            onBack={() => {
              setView('real_exam_list');
              setRealExamResultData(null);
              setRealExamPracticeData(null);
              // 返回列表時自動刷新，更新已作答次數
              utils.realExamStudent.listAvailable.invalidate();
            }}
            onRetry={() => {
              if (realExamPracticeData) {
                realExamStartMutation.mutate({
                  sourceId: realExamPracticeData.sourceId,
                  questionType: realExamPracticeData.questionType,
                  questionCount: realExamPracticeData.questions.length,
                });
              }
            }}
          />
        )}
        {view === 'essay_practice' && essaySingleData && (
          <EssaySingleSession
            examId={essaySingleData.examId}
            examTitle={essaySingleData.examTitle}
            question={essaySingleData.question}
            attemptId={essaySingleData.attemptId}
            lastResult={essaySingleData.lastResult}
            onBack={() => {
              setView('essay_questions');
              setEssaySingleData(null);
              utils.aiStudent.listEssayQuestions.invalidate();
            }}
          />
        )}
      </div>

      {/* 申論題單題扣點確認對話框 */}
      <AlertDialog
        open={!!essayQuestionConfirm?.open}
        onOpenChange={(open) => { if (!open) setEssayQuestionConfirm(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>💳 確認扣除點數</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  此申論題需要消耗點數才能作答。<strong>付費後可無限次作答，不重複扣點。</strong>
                </p>
                <div className="rounded-md bg-muted px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">題目</span>
                    <span className="font-medium line-clamp-1 max-w-[200px]">{essayQuestionConfirm?.question?.question?.slice(0, 30)}{(essayQuestionConfirm?.question?.question?.length || 0) > 30 ? '...' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">首次扣除</span>
                    <span className="font-bold text-amber-600">{essayQuestionConfirm?.question?.pointCost} 點</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1.5 mt-1">
                    <span className="text-muted-foreground">目前餘額</span>
                    <span className={`font-semibold ${balance < (essayQuestionConfirm?.question?.pointCost ?? 0) ? 'text-red-500' : 'text-green-600'}`}>
                      {balance} 點
                    </span>
                  </div>
                </div>
                {balance < (essayQuestionConfirm?.question?.pointCost ?? 0) && (
                  <p className="text-sm text-red-500 font-medium">⚠️ 點數不足，無法開始作答。</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEssayQuestionConfirm(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={balance < (essayQuestionConfirm?.question?.pointCost ?? 0) || startEssayQuestionMutation.isPending}
              onClick={() => {
                if (essayQuestionConfirm) {
                  startEssayQuestionMutation.mutate({
                    examId: essayQuestionConfirm.exam.id,
                    questionId: essayQuestionConfirm.question.id,
                  });
                }
              }}
            >
              {startEssayQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              確認（扣 {essayQuestionConfirm?.question?.pointCost} 點）
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 扣點確認對話框 */}
      <AlertDialog
        open={pointConfirm.open}
        onOpenChange={(open) => { if (!open) setPointConfirm({ open: false, alreadyPaid: false, settings: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>💳 確認扣除點數</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  此題庫需要消耗點數才能練習。<strong>付費後可無限次練習，不重複扣點。</strong>
                </p>
                <div className="rounded-md bg-muted px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">題庫名稱</span>
                    <span className="font-medium">{selectedExam?.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">首次扣除</span>
                    <span className="font-bold text-amber-600">{selectedExam?.pointCost} 點</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1.5 mt-1">
                    <span className="text-muted-foreground">目前餘額</span>
                    <span className={`font-semibold ${balance < (selectedExam?.pointCost ?? 0) ? 'text-red-500' : 'text-green-600'}`}>
                      {balance} 點
                    </span>
                  </div>
                </div>
                {balance < (selectedExam?.pointCost ?? 0) && (
                  <p className="text-sm text-red-500 font-medium">⚠️ 點數不足，無法開始練習。</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPointConfirm({ open: false, alreadyPaid: false, practiceType: 'multiple_choice', settings: null })}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={balance < (selectedExam?.pointCost ?? 0)}
              onClick={() => {
                const s = pointConfirm.settings;
                const pt = pointConfirm.practiceType;
                setPointConfirm({ open: false, alreadyPaid: false, practiceType: 'multiple_choice', settings: null });
                if (pt === 'essay' && selectedExam) {
                  startEssayMutation.mutate({
                    examId: selectedExam.id,
                    difficulty: 'all',
                    practiceType: 'essay',
                  });
                } else if (s) {
                  doStartPractice(s);
                }
              }}
            >
              確認（扣 {selectedExam?.pointCost} 點）
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
