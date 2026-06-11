import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calculator,
  Send,
  Loader2,
  BookOpen,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronLeft,
  AlertCircle,
  Lightbulb,
  Trophy,
  RotateCcw,
  Plus,
  Minus,
  FileText,
} from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

// ===== 型別定義 =====
interface TaxMessage {
  role: "user" | "assistant";
  content: string;
}

interface JournalEntry {
  account: string;
  debit: number;
  credit: number;
}

interface JournalPractice {
  scenario: string;
  hint: string;
  correctEntry: JournalEntry[];
  explanation: string;
}

interface GradeResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  errors: string[];
  tips: string;
}

// ===== 稅務問答 Tab =====
function TaxQATab() {
  const [messages, setMessages] = useState<TaxMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const taxQueryMutation = trpc.accounting.taxQuery.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const newUserMsg: TaxMessage = { role: "user", content: question };
    const updatedHistory = [...messages, newUserMsg];
    setMessages(updatedHistory);
    setInput("");
    setIsLoading(true);

    try {
      const result = await taxQueryMutation.mutateAsync({
        question,
        conversationHistory: messages,
      });
      setMessages([...updatedHistory, { role: "assistant", content: result.answer }]);
    } catch (err) {
      toast.error("稅務問答服務暫時無法使用，請稍後再試");
      setMessages(updatedHistory.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "個人綜合所得稅的申報期限是什麼時候？",
    "營業稅的稅率是多少？",
    "公司購買電腦設備可以抵稅嗎？",
    "員工薪資要如何扣繳所得稅？",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 說明區 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          本功能提供台灣稅務法規參考資訊，僅供學習用途。實際稅務申報請諮詢專業會計師或稅務機關。
        </p>
      </div>

      {/* 對話區 */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">稅務問答助手</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              輸入您的稅務問題，AI 將根據台灣稅法為您解答
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition-colors text-gray-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Streamdown>{msg.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <Calculator className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 輸入區 */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入稅務問題，例如：個人所得稅如何計算？"
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMessages([])}
            title="清除對話"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== 分錄練習 Tab =====
function JournalPracticeTab() {
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [topic, setTopic] = useState<"basic" | "asset" | "depreciation" | "inventory" | "payroll" | "tax">("basic");
  const [practice, setPractice] = useState<JournalPractice | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [studentEntries, setStudentEntries] = useState<JournalEntry[]>([
    { account: "", debit: 0, credit: 0 },
    { account: "", debit: 0, credit: 0 },
  ]);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const generateMutation = trpc.accounting.generateJournalPractice.useMutation();
  const gradeMutation = trpc.accounting.gradeJournalEntry.useMutation();

  const difficultyOptions = [
    { value: "easy", label: "簡單", color: "bg-green-100 text-green-700 border-green-300" },
    { value: "medium", label: "中等", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { value: "hard", label: "困難", color: "bg-red-100 text-red-700 border-red-300" },
  ];

  const topicOptions = [
    { value: "basic", label: "基本交易" },
    { value: "asset", label: "固定資產" },
    { value: "depreciation", label: "折舊" },
    { value: "inventory", label: "存貨" },
    { value: "payroll", label: "薪資" },
    { value: "tax", label: "營業稅" },
  ];

  const handleGenerate = async () => {
    setPractice(null);
    setGradeResult(null);
    setShowHint(false);
    setShowAnswer(false);
    setStudentEntries([
      { account: "", debit: 0, credit: 0 },
      { account: "", debit: 0, credit: 0 },
    ]);

    try {
      const result = await generateMutation.mutateAsync({ difficulty, topic });
      setPractice(result);
    } catch (err) {
      toast.error("生成練習題失敗，請稍後再試");
    }
  };

  const handleAddEntry = () => {
    setStudentEntries([...studentEntries, { account: "", debit: 0, credit: 0 }]);
  };

  const handleRemoveEntry = (index: number) => {
    if (studentEntries.length <= 2) return;
    setStudentEntries(studentEntries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (
    index: number,
    field: keyof JournalEntry,
    value: string | number
  ) => {
    const updated = [...studentEntries];
    if (field === "account") {
      updated[index].account = value as string;
    } else if (field === "debit") {
      updated[index].debit = Number(value) || 0;
      if (Number(value) > 0) updated[index].credit = 0;
    } else if (field === "credit") {
      updated[index].credit = Number(value) || 0;
      if (Number(value) > 0) updated[index].debit = 0;
    }
    setStudentEntries(updated);
  };

  const handleGrade = async () => {
    if (!practice) return;
    const hasEmpty = studentEntries.some((e) => !e.account.trim());
    if (hasEmpty) {
      toast.error("請填寫所有分錄的科目名稱");
      return;
    }

    try {
      const result = await gradeMutation.mutateAsync({
        scenario: practice.scenario,
        studentEntry: studentEntries,
        correctEntry: practice.correctEntry,
        explanation: practice.explanation,
      });
      setGradeResult(result);
    } catch (err) {
      toast.error("批改服務暫時無法使用，請稍後再試");
    }
  };

  const totalDebit = studentEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = studentEntries.reduce((s, e) => s + e.credit, 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  return (
    <div className="flex flex-col gap-4">
      {/* 設定區 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">練習設定</h3>
        <div className="flex flex-wrap gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">難度</p>
            <div className="flex gap-1">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value as typeof difficulty)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                    difficulty === opt.value
                      ? opt.color + " ring-2 ring-offset-1 ring-current"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">主題</p>
            <div className="flex flex-wrap gap-1">
              {topicOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTopic(opt.value as typeof topic)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                    topic === opt.value
                      ? "bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-offset-1 ring-blue-400"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="w-full"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI 正在出題中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {practice ? "換一題" : "開始練習"}
            </>
          )}
        </Button>
      </div>

      {/* 題目區 */}
      {practice && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                題目情境
              </h3>
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Lightbulb className="w-3 h-3" />
                {showHint ? "隱藏提示" : "顯示提示"}
              </button>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">{practice.scenario}</p>
            {showHint && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">💡 提示：</span>
                  {practice.hint}
                </p>
              </div>
            )}
          </div>

          {/* 分錄輸入區 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">填寫分錄</h3>

            {/* 表頭 */}
            <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 mb-2 text-xs text-gray-500 font-medium px-1">
              <span>科目名稱</span>
              <span className="text-center">借方 (Dr.)</span>
              <span className="text-center">貸方 (Cr.)</span>
              <span />
            </div>

            {/* 分錄列 */}
            <div className="space-y-2">
              {studentEntries.map((entry, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center">
                  <Input
                    value={entry.account}
                    onChange={(e) => handleEntryChange(i, "account", e.target.value)}
                    placeholder={i % 2 === 0 ? "借方科目" : "貸方科目"}
                    className={`text-sm ${i % 2 !== 0 ? "ml-4" : ""}`}
                    disabled={!!gradeResult}
                  />
                  <Input
                    type="number"
                    value={entry.debit || ""}
                    onChange={(e) => handleEntryChange(i, "debit", e.target.value)}
                    placeholder="0"
                    className="text-sm text-right"
                    disabled={!!gradeResult}
                    min={0}
                  />
                  <Input
                    type="number"
                    value={entry.credit || ""}
                    onChange={(e) => handleEntryChange(i, "credit", e.target.value)}
                    placeholder="0"
                    className="text-sm text-right"
                    disabled={!!gradeResult}
                    min={0}
                  />
                  <button
                    onClick={() => handleRemoveEntry(i)}
                    disabled={studentEntries.length <= 2 || !!gradeResult}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* 合計 */}
            <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 mt-3 pt-3 border-t border-gray-200">
              <span className="text-xs font-semibold text-gray-600 pl-1">合計</span>
              <span className={`text-xs font-bold text-right pr-2 ${isBalanced ? "text-green-600" : "text-gray-700"}`}>
                {totalDebit.toLocaleString()}
              </span>
              <span className={`text-xs font-bold text-right pr-2 ${isBalanced ? "text-green-600" : "text-gray-700"}`}>
                {totalCredit.toLocaleString()}
              </span>
              <span />
            </div>

            {!isBalanced && totalDebit > 0 && (
              <p className="text-xs text-red-500 mt-1 pl-1">⚠ 借貸不平衡，請檢查金額</p>
            )}
            {isBalanced && (
              <p className="text-xs text-green-600 mt-1 pl-1">✓ 借貸平衡</p>
            )}

            {/* 新增列按鈕 */}
            {!gradeResult && (
              <button
                onClick={handleAddEntry}
                className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                新增分錄列
              </button>
            )}
          </div>

          {/* 提交按鈕 */}
          {!gradeResult && (
            <Button
              onClick={handleGrade}
              disabled={gradeMutation.isPending || !isBalanced}
              className="w-full"
            >
              {gradeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI 批改中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  提交答案
                </>
              )}
            </Button>
          )}

          {/* 批改結果 */}
          {gradeResult && (
            <div
              className={`rounded-xl p-4 border ${
                gradeResult.isCorrect
                  ? "bg-green-50 border-green-200"
                  : gradeResult.score >= 60
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {gradeResult.isCorrect ? (
                    <Trophy className="w-5 h-5 text-green-600" />
                  ) : gradeResult.score >= 60 ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-sm">
                    {gradeResult.isCorrect ? "答對了！" : `得分：${gradeResult.score} 分`}
                  </span>
                </div>
                <Badge
                  className={
                    gradeResult.isCorrect
                      ? "bg-green-100 text-green-700"
                      : gradeResult.score >= 60
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {gradeResult.score}/100
                </Badge>
              </div>

              <p className="text-sm text-gray-700 mb-3">{gradeResult.feedback}</p>

              {gradeResult.errors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">錯誤說明：</p>
                  <ul className="space-y-1">
                    {gradeResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                        <span className="mt-0.5">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white/60 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">學習建議：</p>
                <p className="text-xs text-gray-700">{gradeResult.tips}</p>
              </div>

              {/* 查看正確答案 */}
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
              >
                <BookOpen className="w-3 h-3" />
                {showAnswer ? "隱藏正確答案" : "查看正確答案"}
              </button>

              {showAnswer && (
                <div className="bg-white/80 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">正確分錄：</p>
                  <div className="space-y-1">
                    {practice.correctEntry.map((entry, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_80px] text-xs gap-2">
                        <span className={`${entry.debit === 0 ? "pl-4" : ""} text-gray-700`}>
                          {entry.account}
                        </span>
                        <span className="text-right text-gray-700">
                          {entry.debit > 0 ? entry.debit.toLocaleString() : ""}
                        </span>
                        <span className="text-right text-gray-700">
                          {entry.credit > 0 ? entry.credit.toLocaleString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">解析：</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{practice.explanation}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                variant="outline"
                className="w-full mt-3"
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                再練一題
              </Button>
            </div>
          )}
        </>
      )}

      {/* 空狀態 */}
      {!practice && !generateMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Calculator className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">分錄練習</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            選擇難度和主題，點擊「開始練習」讓 AI 為您出題，練習完成後 AI 會批改並給出詳細解析
          </p>
        </div>
      )}
    </div>
  );
}

// ===== 主頁面 =====
export default function AccountingAssistant() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"tax" | "journal">("tax");

  const tabs = [
    { id: "tax" as const, label: "稅務問答", icon: BookOpen },
    { id: "journal" as const, label: "分錄練習", icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導覽 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/student")}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">會計實務助手</h1>
              <p className="text-xs text-gray-500">稅務問答 · 分錄練習</p>
            </div>
          </div>
        </div>

        {/* Tab 切換 */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 內容區 */}
      <div className="max-w-3xl mx-auto px-4 py-4" style={{ height: "calc(100vh - 116px)" }}>
        {activeTab === "tax" ? (
          <div className="h-full flex flex-col">
            <TaxQATab />
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <JournalPracticeTab />
          </div>
        )}
      </div>
    </div>
  );
}
