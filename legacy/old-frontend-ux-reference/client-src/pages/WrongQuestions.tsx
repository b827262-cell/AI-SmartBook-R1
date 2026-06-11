/**
 * 錯題本頁面
 * 顯示用戶的錯題列表，支援查看、標記學會、刪除、錯題複習功能
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Trash2,
  Archive,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type TabType = "active" | "archived";

export default function WrongQuestions() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // 查詢錯題列表
  const { data: wrongQuestions, refetch } = trpc.wrongQuestions.list.useQuery(
    { status: activeTab },
    { enabled: isAuthenticated }
  );

  // 查詢錯題統計
  const { data: stats } = trpc.wrongQuestions.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 標記為已學會
  const markAsLearned = trpc.wrongQuestions.markAsLearned.useMutation({
    onSuccess: () => {
      toast.success("已移到封存區");
      refetch();
    },
    onError: (error) => {
      toast.error("操作失敗：" + error.message);
    },
  });

  // 刪除錯題
  const deleteWrongQuestion = trpc.wrongQuestions.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error("刪除失敗：" + error.message);
    },
  });

  // 處理標記學會
  const handleMarkAsLearned = (id: number) => {
    if (confirm("確定要將此題移到封存區嗎？")) {
      markAsLearned.mutate({ id });
    }
  };

  // 處理刪除
  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此題嗎？此操作無法復原。")) {
      deleteWrongQuestion.mutate({ id });
    }
  };

  // 處理錯題複習
  const handlePracticeWrongQuestions = () => {
    // TODO: 實作錯題複習模式
    toast.info("錯題複習功能開發中...");
  };

  // 題型標籤對應
  const questionTypeLabels: Record<string, string> = {
    single: "單選題",
    multiple: "複選題",
    essay: "申論題",
    fill: "填空題",
  };

  const questionTypeColors: Record<string, string> = {
    single: "bg-blue-500/10 text-blue-400",
    multiple: "bg-purple-500/10 text-purple-400",
    essay: "bg-amber-500/10 text-amber-400",
    fill: "bg-green-500/10 text-green-400",
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">請先登入</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* 頁面標題 */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 rounded-lg hover:bg-card transition-colors"
            title="返回首頁"
          >
            <Home className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">錯題本</h1>
            <p className="text-muted-foreground">
              記錄並複習你的錯題，針對弱點加強練習
            </p>
          </div>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">活躍錯題</h3>
              </div>
              <p className="text-3xl font-bold text-primary">{stats.activeCount}</p>
              <p className="text-sm text-muted-foreground mt-1">需要加強的題目</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Archive className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-foreground">已封存</h3>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{stats.archivedCount}</p>
              <p className="text-sm text-muted-foreground mt-1">已學會的題目</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-foreground">總錯誤次數</h3>
              </div>
              <p className="text-3xl font-bold text-red-400">{stats.totalWrongCount}</p>
              <p className="text-sm text-muted-foreground mt-1">累計錯誤次數</p>
            </div>
          </div>
        )}

        {/* 錯題複習按鈕 */}
        {stats && stats.activeCount > 0 && activeTab === "active" && (
          <div className="mb-6">
            <button
              onClick={handlePracticeWrongQuestions}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              開始錯題複習（{stats.activeCount} 題）
            </button>
          </div>
        )}

        {/* 分頁標籤 */}
        <div className="flex items-center gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "active"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            活躍錯題 ({stats?.activeCount || 0})
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "archived"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            封存錯題 ({stats?.archivedCount || 0})
          </button>
        </div>

        {/* 錯題列表 */}
        <AnimatePresence mode="wait">
          {wrongQuestions && wrongQuestions.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {wrongQuestions.map((item) => {
                const isExpanded = expandedQuestionId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                  >
                    {/* 題目標題和操作按鈕 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              questionTypeColors[item.questionType || "single"] ||
                              "bg-primary/10 text-primary"
                            }`}
                          >
                            {questionTypeLabels[item.questionType || "single"] || "單選題"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            錯誤 {item.wrongCount} 次
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.category && `${item.category} · `}
                            {item.subject}
                          </span>
                        </div>
                        <p className="text-foreground line-clamp-2">{item.question}</p>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex items-center gap-2 ml-4">
                        {activeTab === "active" && (
                          <button
                            onClick={() => handleMarkAsLearned(item.id)}
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="我學會了"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="刪除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            setExpandedQuestionId(isExpanded ? null : item.id)
                          }
                          className="p-2 rounded-lg bg-card border border-border hover:bg-card/80 transition-colors"
                          title={isExpanded ? "收起" : "展開"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 展開的題目詳情 */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-border"
                        >
                          {/* 題目內容 */}
                          <div className="mb-4">
                            <p className="text-foreground whitespace-pre-wrap">
                              {item.question}
                            </p>
                          </div>

                          {/* 選項 */}
                          {item.options && (
                            <div className="space-y-2 mb-4">
                              {Object.entries(item.options as Record<string, string>).map(
                                ([key, value]) => {
                                  const isUserAnswer = item.userAnswer?.includes(key);
                                  const isCorrectAnswer = item.correctAnswer?.includes(key);

                                  return (
                                    <div
                                      key={key}
                                      className={`p-3 rounded-lg border ${
                                        isCorrectAnswer
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                          : isUserAnswer
                                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                                          : "bg-card border-border text-muted-foreground"
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-background border border-border font-semibold flex-shrink-0">
                                          {key}
                                        </span>
                                        <span className="flex-1">{value}</span>
                                        {isCorrectAnswer && (
                                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                        )}
                                        {isUserAnswer && !isCorrectAnswer && (
                                          <XCircle className="w-5 h-5 flex-shrink-0" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}

                          {/* 答案資訊 */}
                          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background/50 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">你的答案</p>
                              <p className="text-lg font-semibold text-red-400">
                                {item.userAnswer || "未作答"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">正確答案</p>
                              <p className="text-lg font-semibold text-emerald-400">
                                {item.correctAnswer}
                              </p>
                            </div>
                          </div>

                          {/* 解析 */}
                          {item.explanation && (
                            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                              <p className="text-sm font-semibold text-blue-400 mb-2">
                                解析
                              </p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.explanation}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                {activeTab === "active" ? "暫無活躍錯題" : "暫無封存錯題"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
