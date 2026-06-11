import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ArrowRight, Send, Loader2, BookOpen, FileText, User, Bot,
  Camera, ImagePlus, X, Clipboard, PanelLeftOpen, PanelLeftClose,
  Search, FolderPlus, Folder, FolderOpen, Tag, Plus, Trash2,
  Pencil, Check, ChevronRight, MessageSquare, Scan, BookMarked,
  ClipboardList, ListChecks, ChevronDown, ChevronUp, BookmarkPlus, Bookmark,
  ExternalLink, CheckSquare, Square, Eraser, ImageIcon,
  NotebookPen, Highlighter, AlertTriangle, Calendar, Sparkles,
  GraduationCap, PlayCircle, Lock, Unlock, ChevronLeft,
  Video, Brain, Upload, ZoomIn, ZoomOut, Zap,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { ImageEditorModal } from "./TutorOcrFeature";
import { VideoCourseEmbedded } from "@/pages/VideoCourse";
import { CalendarTab } from "@/pages/CalendarTab";
import PdfViewer from "@/components/PdfViewer";

const AIClassroomFeature = React.lazy(() => import("./AIClassroomFeature"));
const TutorNotesFeature = React.lazy(() => import("./TutorNotesFeature"));

interface Source {
  bookId: number;
  bookTitle: string;
  page: number;
  snippet: string;
  type: "book" | "exam" | "chapter" | "unitqa" | "chapterqa";
  // 精選考題完整資料
  questionText?: string;
  options?: Array<{ label: string; text: string; isCorrect?: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  // 精選簡答完整資料
  answer?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
  sources?: Source[];
  createdAt?: number;
  followUpQuestions?: string[]; // AI 回答後的進一步思考問題
  isStreaming?: boolean; // 是否正在流式輸出中
  isDetailDone?: boolean; // 是否已點擊詳細解析（點後隱藏按鈕）
}

type ChapterSplitRatio = "1:1" | "3:7" | "7:3";

type ChapterRestoreState = {
  sessionId: number;
  bookId?: number;
  page?: number;
  splitRatio?: ChapterSplitRatio;
};

// 可展開的題目卡片
function ExpandableSourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [showAnswer, setShowAnswer] = React.useState(false);

  const isExpandable = source.type === "unitqa" || source.type === "chapterqa";

  if (!isExpandable) return <SourceBadge source={source} />;

  const badgeColor = source.type === "unitqa"
    ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
    : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200";
  const badgeLabel = source.type === "unitqa" ? "精選考題" : "精選簡答";
  const BadgeIcon = source.type === "unitqa" ? FileText : MessageSquare;

  return (
    <div className="inline-block">
      <button
        onClick={() => { setExpanded(!expanded); setSelectedAnswer(null); setShowAnswer(false); }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${badgeColor}`}
      >
        <BadgeIcon className="w-3 h-3" />
        {badgeLabel}
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-2 p-3 rounded-xl border border-border bg-card shadow-sm text-sm w-full max-w-lg">
          {source.type === "unitqa" && source.questionText && (
            <>
              <p className="font-medium text-foreground mb-3 leading-relaxed">{source.questionText}</p>
              {source.options && source.options.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {source.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswer === opt.label;
                    const isCorrect = opt.label === source.correctAnswer;
                    let btnClass = "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ";
                    if (showAnswer) {
                      btnClass += isCorrect ? "bg-green-50 border-green-400 text-green-800 font-medium" :
                        isSelected ? "bg-red-50 border-red-300 text-red-700" :
                        "bg-muted border-border text-muted-foreground";
                    } else {
                      btnClass += isSelected ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border hover:bg-accent";
                    }
                    return (
                      <button key={`src-opt-${optIdx}`} className={btnClass}
                        onClick={() => { if (!showAnswer) setSelectedAnswer(opt.label); }}
                        disabled={showAnswer}
                      >
                        <span className="font-semibold mr-2">{opt.label}.</span>{opt.text}
                        {showAnswer && isCorrect && <span className="ml-2 text-green-600">✔</span>}
                        {showAnswer && isSelected && !isCorrect && <span className="ml-2 text-red-500">✖</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                {!showAnswer && selectedAnswer && (
                  <button onClick={() => setShowAnswer(true)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">
                    確認答案
                  </button>
                )}
                {showAnswer && source.explanation && (
                  <div className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    <span className="font-semibold">💡 解析：</span>{source.explanation}
                  </div>
                )}
              </div>
              {source.page > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">📖 參考頁碼：第 {source.page} 頁</p>
              )}
            </>
          )}
          {source.type === "chapterqa" && source.questionText && (
            <>
              <p className="font-medium text-foreground mb-2">❓ {source.questionText}</p>
              {source.answer && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
                  <span className="font-semibold">💡 答：</span>{source.answer}
                </div>
              )}
            </>
          )}
          <button onClick={() => setExpanded(false)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronRight className="w-3 h-3 rotate-90" />收起
          </button>
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  if (source.type === "exam") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
        <FileText className="w-3 h-3" />
        {source.bookTitle}
      </span>
    );
  }
  if (source.type === "chapter") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
        <BookOpen className="w-3 h-3" />
        {source.bookTitle}
      </span>
    );
  }
  if (source.type === "chapterqa") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium border border-purple-200">
        <MessageSquare className="w-3 h-3" />
        精選簡答
      </span>
    );
  }
  if (source.type === "unitqa") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200">
        <FileText className="w-3 h-3" />
        精選考題
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
      <BookOpen className="w-3 h-3" />
      {source.bookTitle} 第 {source.page} 頁
    </span>
  );
}

function MessageBubble({ message, onFollowUp, bookId, question, subjectName, onDetailAsk, onMarkDetailDone }: { message: Message; onFollowUp?: (q: string) => void; bookId?: number; question?: string; subjectName?: string; onDetailAsk?: (q: string) => void; onMarkDetailDone?: () => void }) {
  const isUser = message.role === "user";
  const [saved, setSaved] = React.useState(false);
  const utils = trpc.useUtils();
  const saveMutation = trpc.savedNotes.save.useMutation({
    onSuccess: () => { setSaved(true); toast.success("已收藏到學習筆記本！"); utils.savedNotes.list.invalidate(); utils.savedNotes.totalCount.invalidate(); },
    onError: () => toast.error("收藏失敗，請稍後再試"),
  });
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? "bg-primary text-primary-foreground" : "bg-muted border border-border"}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
      </div>
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {isUser && message.imageUrls && message.imageUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-end">
            {message.imageUrls.map((url, i) => (
              <img key={i} src={url} alt={`附圖 ${i + 1}`} className="w-32 h-32 object-cover rounded-xl border border-border" />
            ))}
          </div>
        )}
        <div className={`rounded-2xl px-4 py-3 leading-relaxed ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
              <Streamdown>{message.content}</Streamdown>
            </div>
          )}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            <span className="text-xs text-muted-foreground">參考來源：</span>
            {message.sources.map((source, i) => <ExpandableSourceCard key={i} source={source} />)}
          </div>
        )}
        {!isUser && bookId && (
          <div className="flex items-center gap-2 px-1 flex-wrap">
            <button
              onClick={() => {
                if (saved || saveMutation.isPending) return;
                saveMutation.mutate({
                  bookId: bookId,
                  question: question,
                  content: message.content,
                  subjectName: subjectName,
                  folderName: '智能問答',
                });
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all shadow-sm ${
                saved
                  ? "bg-amber-100 text-amber-700 border border-amber-300 cursor-default"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/80"
              }`}
              disabled={saveMutation.isPending || saved}
            >
              {saveMutation.isPending
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : saved
                  ? <Bookmark className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                  : <BookmarkPlus className="w-3.5 h-3.5" />
              }
              {saved ? "已收藏筆記" : "收藏筆記"}
            </button>
            {question && onDetailAsk && !message.isDetailDone && (
              <button
                onClick={() => { onDetailAsk(question); onMarkDetailDone?.(); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
              >
                <span className="text-sm">📚</span>
                詳細解析
              </button>
            )}
          </div>
        )}
        {!isUser && message.followUpQuestions && message.followUpQuestions.length > 0 && onFollowUp && (
          <div className="flex flex-col gap-1.5 px-1 w-full">
            <span className="text-xs text-muted-foreground">你可以進一步思考：</span>
            <div className="flex flex-wrap gap-2">
              {message.followUpQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 hover:border-primary/60 transition-colors text-left leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 左側歷史抽屜 ────────────────────────────────────────────────────────────
function HistorySidebar({
  bookId,
  currentSessionId,
  onSelectSession,
  onNewChat,
  isOpen,
  onClose,
}: {
  bookId: number;
  currentSessionId?: number;
  onSelectSession: (sessionId: number, sessionBookId?: number) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null | undefined>(undefined);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();

  const { data: sessions = [], isLoading: sessionsLoading } = trpc.tutorChat.getSessions.useQuery(
    { bookId, keyword: keyword || undefined, folderId: selectedFolderId },
    { enabled: isOpen }
  );
  const { data: folders = [] } = trpc.tutorChat.getFolders.useQuery(undefined, { enabled: isOpen });

  const createFolderMutation = trpc.tutorChat.createFolder.useMutation({
    onSuccess: () => { utils.tutorChat.getFolders.invalidate(); setNewFolderName(""); setShowNewFolder(false); },
  });
  const updateFolderMutation = trpc.tutorChat.updateFolder.useMutation({
    onSuccess: () => { utils.tutorChat.getFolders.invalidate(); setEditingFolderId(null); },
  });
  const deleteFolderMutation = trpc.tutorChat.deleteFolder.useMutation({
    onSuccess: () => { utils.tutorChat.getFolders.invalidate(); utils.tutorChat.getSessions.invalidate(); },
  });
  const deleteSessionMutation = trpc.tutorChat.deleteSession.useMutation({
    onSuccess: () => utils.tutorChat.getSessions.invalidate(),
  });
  const moveToFolderMutation = trpc.tutorChat.moveToFolder.useMutation({
    onSuccess: () => utils.tutorChat.getSessions.invalidate(),
  });
  const batchDeleteMutation = trpc.tutorChat.batchDeleteSessions.useMutation({
    onSuccess: () => {
      utils.tutorChat.getSessions.invalidate();
      setSelectedIds(new Set());
      setBatchMode(false);
      toast.success("已刪除選取的對話");
    },
  });
  const clearAllMutation = trpc.tutorChat.clearAllSessions.useMutation({
    onSuccess: () => {
      utils.tutorChat.getSessions.invalidate();
      toast.success("已清空全部對話");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* 側欄 */}
      <div className="relative z-10 w-72 bg-background border-r border-border flex flex-col h-full shadow-xl">
        {/* 頂部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">對話歷史</span>
          <div className="flex items-center gap-1">
            {!batchMode ? (
              <>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1" onClick={onNewChat}>
                  <Plus className="w-3.5 h-3.5" /> 新對話
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  title="批次刪除"
                  onClick={() => { setBatchMode(true); setSelectedIds(new Set()); }}
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  title="一鍵清空全部對話"
                  onClick={() => {
                    if (sessions.length === 0) { toast.info("沒有對話可清空"); return; }
                    if (confirm(`確定要清空全部 ${sessions.length} 個對話？（後台仍可查看）`)) {
                      clearAllMutation.mutate({ bookId });
                    }
                  }}
                >
                  <Eraser className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1"
                  onClick={() => setSelectedIds(new Set(sessions.map(s => s.id)))}
                >
                  全選
                </Button>
                <Button
                  size="sm" variant="destructive" className="h-8 px-2 text-xs gap-1"
                  disabled={selectedIds.size === 0 || batchDeleteMutation.isPending}
                  onClick={() => {
                    if (selectedIds.size === 0) return;
                    if (confirm(`確定刪除選取的 ${selectedIds.size} 個對話？`)) {
                      batchDeleteMutation.mutate({ sessionIds: Array.from(selectedIds) });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> 刪除({selectedIds.size})
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-8 px-2 text-xs"
                  onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}
                >
                  取消
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 搜尋 */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="搜尋對話..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {/* 資料夾列表 */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-medium">資料夾</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewFolder(true)} title="新增資料夾">
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {showNewFolder && (
            <div className="flex gap-1 mb-1.5">
              <Input
                className="h-7 text-xs flex-1"
                placeholder="資料夾名稱"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) createFolderMutation.mutate({ name: newFolderName.trim() }); if (e.key === "Escape") setShowNewFolder(false); }}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => { if (newFolderName.trim()) createFolderMutation.mutate({ name: newFolderName.trim() }); }}>
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {/* 全部 */}
          <button
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${selectedFolderId === undefined ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
            onClick={() => setSelectedFolderId(undefined)}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" /> 全部對話
          </button>
          {/* 未分類 */}
          <button
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${selectedFolderId === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
            onClick={() => setSelectedFolderId(null)}
          >
            <Folder className="w-3.5 h-3.5 flex-shrink-0" /> 未分類
          </button>
          {folders.map((f) => (
            <div key={f.id} className="group flex items-center gap-1">
              {editingFolderId === f.id ? (
                <div className="flex gap-1 flex-1 py-0.5">
                  <Input
                    className="h-6 text-xs flex-1"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") updateFolderMutation.mutate({ id: f.id, name: editingFolderName }); if (e.key === "Escape") setEditingFolderId(null); }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => updateFolderMutation.mutate({ id: f.id, name: editingFolderName })}>
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <button
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${selectedFolderId === f.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
                  onClick={() => setSelectedFolderId(f.id)}
                >
                  {selectedFolderId === f.id ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate">{f.name}</span>
                </button>
              )}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => { if (confirm(`刪除資料夾「${f.name}」？`)) deleteFolderMutation.mutate({ id: f.id }); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 對話列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {sessionsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">沒有對話記錄</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="group relative">
                {batchMode ? (
                  // 批次模式：顯示 checkbox
                  <button
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      selectedIds.has(s.id) ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                    onClick={() => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                        return next;
                      });
                    }}
                  >
                    {selectedIds.has(s.id)
                      ? <CheckSquare className="w-4 h-4 flex-shrink-0 text-primary" />
                      : <Square className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.title ?? "新對話"}</p>
                      <p className="text-muted-foreground mt-0.5">{new Date(s.createdAt).toLocaleDateString("zh-TW")}</p>
                    </div>
                  </button>
                ) : (
                  // 正常模式
                  <>
                    <button
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${currentSessionId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
                      onClick={() => { onSelectSession(s.id, s.smartBookId ?? undefined); onClose(); }}
                    >
                      <p className="font-medium truncate">{s.title ?? "新對話"}</p>
                      <p className="text-muted-foreground mt-0.5">{new Date(s.createdAt).toLocaleDateString("zh-TW")}</p>
                    </button>
                    {/* 快速移動到資料夾 */}
                    {folders.length > 0 && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <select
                          className="text-[10px] border border-border rounded px-1 py-0.5 bg-background cursor-pointer"
                          value={s.folderId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            moveToFolderMutation.mutate({ sessionId: s.id, folderId: val === "" ? null : parseInt(val) });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">未分類</option>
                          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => { e.stopPropagation(); if (confirm("刪除此對話？")) deleteSessionMutation.mutate({ sessionId: s.id }); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OCR 確認對話框 ────────────────────────────────────────────────────────────
function OcrConfirmDialog({
  imageBase64,
  bookTitle,
  onConfirm,
  onCancel,
}: {
  imageBase64: string;
  bookTitle: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}) {
  const [ocrText, setOcrText] = useState("");
  const [isOcring, setIsOcring] = useState(true);

  const ocrMutation = trpc.tutorChat.ocrImage.useMutation({
    onSuccess: (data) => { setOcrText(data.text); setIsOcring(false); },
    onError: () => { setOcrText(""); setIsOcring(false); toast.error("OCR 辨識失敗，請手動輸入問題"); },
  });

  useEffect(() => {
    ocrMutation.mutate({ imageBase64, bookTitle });
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-3 p-4" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">確認圖片內容</h3>
          <span className="text-xs text-muted-foreground ml-auto">確認後送出給 AI</span>
        </div>
        {/* 圖片預覽 */}
        <img src={imageBase64} alt="上傳圖片" className="w-full max-h-40 object-contain rounded-xl border border-border bg-muted" />
        {/* OCR 文字 */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <label className="text-xs text-muted-foreground mb-1.5 block flex-shrink-0">
            {isOcring ? "正在辨識圖片文字..." : "辨識結果（可修改後送出）"}
          </label>
          {isOcring ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> 辨識中...
            </div>
          ) : (
            <Textarea
              className="text-sm resize-none overflow-y-auto"
              style={{ minHeight: '80px', maxHeight: '40vh' }}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="請輸入您的問題..."
              autoFocus
            />
          )}
        </div>
        <div className="flex gap-2 justify-end flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onCancel}>取消</Button>
          <Button
            size="sm"
            disabled={isOcring || !ocrText.trim()}
            onClick={() => onConfirm(ocrText.trim())}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> 送出問題
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 知識點 Tab ────────────────────────────────────────────────────────────────────────────────
function LessonPointsTab({ bookId, subjectName, onAskAI }: { bookId: number; subjectName?: string; onAskAI: (q: string) => void }) {
  const { data: groups, isLoading } = trpc.tutorChat.getLessonPointsByBook.useQuery(
    { bookId },
    { enabled: !!bookId, staleTime: 5 * 60 * 1000 }
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [fontSize, setFontSize] = useState(14); // px
  const saveMutation = trpc.savedNotes.save.useMutation();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // 推薦知識點：從所有知識點中隨機抽 4 則
  const allPoints = useMemo(() => groups?.flatMap(g => g.points) ?? [], [groups]);
  const recommendedPoints = useMemo(() => {
    if (allPoints.length === 0) return [];
    const shuffled = [...allPoints].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]); // 只在 groups 載入時計算一次

  // 搜尋篩選
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchKeyword.trim()) return groups;
    const kw = searchKeyword.trim().toLowerCase();
    return groups.map(g => ({
      ...g,
      points: g.points.filter(p =>
        p.question.toLowerCase().includes(kw) ||
        (p.explanation ?? '').toLowerCase().includes(kw)
      ),
    })).filter(g => g.points.length > 0);
  }, [groups, searchKeyword]);

  const toggleChapter = (key: string) =>
    setOpenChapters(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = (lp: { id: number; question: string; explanation?: string | null; hint?: string | null }) => {
    const content = [lp.explanation, lp.hint ? `💡 ${lp.hint}` : ''].filter(Boolean).join('\n\n');
    saveMutation.mutate(
      { bookId, question: lp.question, content, subjectName, folderName: '智能知識' },
      { onSuccess: () => setSavedIds(prev => new Set([...prev, lp.id])) }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <BookOpen className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">目前尚未生成知識點</p>
      </div>
    );
  }

  const totalCount = groups.reduce((s, g) => s + g.points.length, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3" style={{ fontSize: `${fontSize}px` }}>
      {/* 工具列：搜尋 + 字體大小 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="搜尋知識點關鍵字..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
        </div>

      </div>

      {/* 推薦知識點（僅無搜尋時顯示） */}
      {!searchKeyword && recommendedPoints.length > 0 && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 space-y-1">
          <p className="text-xs font-medium text-primary mb-2">✨ 推薦知識點</p>
          {recommendedPoints.map(lp => (
            <div key={lp.id} className="border-b border-border/40 last:border-0 pb-1 last:pb-0">
              <button
                className="w-full text-left text-sm text-foreground hover:text-primary py-1.5 flex items-start justify-between gap-2"
                onClick={() => setExpandedId(expandedId === lp.id ? null : lp.id)}
              >
                <span className="font-medium flex-1">{lp.question}</span>
                <span className="flex-shrink-0 text-xs text-muted-foreground mt-0.5">
                  {lp.sourcePage && <span className="mr-1">p.{lp.sourcePage}</span>}
                  {expandedId === lp.id ? '▲' : '▼'}
                </span>
              </button>
              {expandedId === lp.id && (
                <div className="mb-2 bg-background border border-primary/20 rounded-lg p-3 text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                  <p>{lp.explanation}</p>
                  {lp.hint && <p className="mt-2 text-xs text-muted-foreground italic">💡 {lp.hint}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => onAskAI(lp.question)}
                    >🤔 進一步請教 AI</button>
                    {!savedIds.has(lp.id) && (
                      <button
                        className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        onClick={() => handleSave(lp)}
                      >📌 加入筆記</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {searchKeyword
          ? `搜尋「${searchKeyword}」：找到 ${filteredGroups.reduce((s, g) => s + g.points.length, 0)} 個知識點`
          : `共 ${totalCount} 個知識點，預設摺疊，點擊章節展開`
        }
      </p>

      {/* 章節列表（預設摺疊） */}
      {filteredGroups.map((group) => {
        const key = group.chapterId != null ? String(group.chapterId) : '__no_chapter__';
        const isOpen = openChapters[key] === true; // 預設摺疊
        return (
          <div key={key} className="border border-border rounded-xl overflow-hidden">
            {/* 章節標題 */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted text-sm font-medium text-left"
              onClick={() => toggleChapter(key)}
            >
              <span className="truncate">{group.chapterTitle}</span>
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {group.points.length} 個知識點 {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {/* 知識點列表 */}
            {isOpen && (
              <div className="divide-y divide-border">
                {group.points.map((lp) => (
                  <div key={lp.id} className="px-4 py-2">
                    <div className="flex items-start gap-2">
                      <button
                        className="flex-1 text-left text-foreground hover:text-primary py-1"
                        onClick={() => setExpandedId(expandedId === lp.id ? null : lp.id)}
                      >
                        <span className="font-medium">{lp.question}</span>
                        {lp.sourcePage && <span className="ml-2 text-xs text-muted-foreground">📖 p.{lp.sourcePage}</span>}
                      </button>
                      {/* 收藏按鈕 */}
                      <button
                        className={`flex-shrink-0 mt-1 text-xs px-2 py-0.5 rounded border ${
                          savedIds.has(lp.id)
                            ? 'border-primary/30 text-primary bg-primary/10'
                            : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                        }`}
                        onClick={() => !savedIds.has(lp.id) && handleSave(lp)}
                        disabled={saveMutation.isPending}
                      >
                        {savedIds.has(lp.id) ? '✓ 已收藏' : '+ 收藏'}
                      </button>
                    </div>
                    {expandedId === lp.id && (
                      <div className="mt-2 mb-1 bg-primary/5 border border-primary/15 rounded-lg p-3 text-foreground leading-relaxed whitespace-pre-wrap">
                        <p>{lp.explanation}</p>
                        {lp.hint && <p className="mt-2 text-xs text-muted-foreground italic">💡 {lp.hint}</p>}
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={() => onAskAI(lp.question)}
                          >🤔 進一步請教 AI</button>
                          {!savedIds.has(lp.id) && (
                            <button
                              className="text-xs text-muted-foreground hover:text-primary hover:underline"
                              onClick={() => handleSave(lp)}
                            >📌 加入筆記</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 練習題 Tab ────────────────────────────────────────────────────────────────────────────────
function PracticeTab({ bookId, subjectName, bookTitle }: { bookId: number; subjectName?: string; bookTitle?: string }) {
  // 來源模式：book = 書本練習題，teacher = 老師精選題，simulation = 精選模擬題，past = 歷屆考古題，wrongbook = 我的錯題本，mock = 模擬考試
  const [sourceMode, setSourceMode] = useState<'book' | 'teacher' | 'simulation' | 'past' | 'wrongbook' | 'mock'>('book');
  // 模擬考試 state
  const [mockPhase, setMockPhase] = useState<'setup' | 'exam' | 'result'>('setup');
  const [mockChapterId, setMockChapterId] = useState<number | undefined>(undefined);
  const [mockCount, setMockCount] = useState(10);
  const [mockSecondsPerQ, setMockSecondsPerQ] = useState(10);
  const [mockQuestions, setMockQuestions] = useState<any[]>([]);
  const [mockCurrentIdx, setMockCurrentIdx] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<number, string>>({}); // questionId -> selected label
  const [mockQTimer, setMockQTimer] = useState(0); // 單題剩餘秒數
  const [mockTotalTimer, setMockTotalTimer] = useState(0); // 總剩餘秒數
  const [mockEnabled, setMockEnabled] = useState(false); // 控制 query 觸發
  const [mockQueryKey, setMockQueryKey] = useState(0); // 強制重新取題
  const mockQueryInput = useMemo(() => ({ bookId, chapterId: mockChapterId, count: mockCount }), [bookId, mockChapterId, mockCount, mockQueryKey]);
  const { data: mockExamData, isLoading: mockLoading } = trpc.tutorChat.getMockExamQuestions.useQuery(
    mockQueryInput,
    { enabled: mockEnabled, staleTime: 0 }
  );
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<'exam_set' | 'real_exam' | 'ai_exam' | 'past_exam'>('exam_set');
  // 簡答題作答區
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(undefined);
  const [questionType, setQuestionType] = useState<"all" | "unitqa" | "chapterqa" | "exam">("all");
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  // AI 解題：儲存每道題的 AI 解題內容
  const [aiSolutions, setAiSolutions] = useState<Record<string, string>>({});
  const [solvingKey, setSolvingKey] = useState<string | null>(null);
  // 錯題本狀態
  const [wrongBookAdded, setWrongBookAdded] = useState<Record<string, boolean>>({});
  const [wrongBookIncludeResolved, setWrongBookIncludeResolved] = useState(false);
  const [wrongBookResolved, setWrongBookResolved] = useState<Record<number, boolean>>({});
  const [savedToNotes, setSavedToNotes] = useState<Record<number, boolean>>({});

  const { data: chapters = [] } = trpc.tutorChat.getChapters.useQuery({ bookId });
  const { data: practiceData, isLoading } = trpc.tutorChat.getPracticeQuestions.useQuery({
    bookId,
    chapterId: selectedChapterId,
    type: questionType,
    page,
    pageSize: 10,
  }, { enabled: sourceMode === 'book' });
  const questions = practiceData?.items ?? [];
  const practiceTotal = practiceData?.total ?? 0;

  // 模擬考試：當 data 回來後，啟動考試
  useEffect(() => {
    if (mockEnabled && mockExamData && mockExamData.questions.length > 0) {
      setMockQuestions(mockExamData.questions);
      setMockCurrentIdx(0);
      setMockAnswers({});
      setMockQTimer(mockSecondsPerQ);
      setMockTotalTimer(mockExamData.questions.length * mockSecondsPerQ);
      setMockPhase('exam');
      setMockEnabled(false);
    }
  }, [mockEnabled, mockExamData]);

  // 模擬考試：單題倒數計時
  useEffect(() => {
    if (mockPhase !== 'exam') return;
    if (mockCurrentIdx >= mockQuestions.length) { setMockPhase('result'); return; }
    setMockQTimer(mockSecondsPerQ);
    const qInterval = setInterval(() => {
      setMockQTimer(prev => {
        if (prev <= 1) { clearInterval(qInterval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(qInterval);
  }, [mockPhase, mockCurrentIdx, mockQuestions.length, mockSecondsPerQ]);

  // 單題時間到自動跳下一題
  useEffect(() => {
    if (mockPhase !== 'exam' || mockQTimer > 0) return;
    if (mockCurrentIdx < mockQuestions.length - 1) {
      setMockCurrentIdx(prev => prev + 1);
    } else {
      setMockPhase('result');
    }
  }, [mockQTimer, mockPhase, mockCurrentIdx, mockQuestions.length]);

  // 模擬考試：總倒數計時
  useEffect(() => {
    if (mockPhase !== 'exam') return;
    const totalInterval = setInterval(() => {
      setMockTotalTimer(prev => {
        if (prev <= 1) { clearInterval(totalInterval); setMockPhase('result'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(totalInterval);
  }, [mockPhase]);

  // 老師精選題：來自智能解題（exam_set）
  const { data: teacherSources = [], isLoading: teacherSourcesLoading } = trpc.tutorChat.getSubjectExamSourceList.useQuery(
    { bookId, sourceType: 'exam_set' },
    { enabled: sourceMode === 'teacher' }
  );
  // 精選模擬題：來自智能題庫（real_exam）
  const { data: simSources = [], isLoading: simSourcesLoading } = trpc.tutorChat.getSubjectExamSourceList.useQuery(
    { bookId, sourceType: 'real_exam' },
    { enabled: sourceMode === 'simulation' }
  );
  // 歷屆考古題：來自考題系統（past_exam）
  const { data: pastSources = [], isLoading: pastSourcesLoading } = trpc.tutorChat.getSubjectExamSourceList.useQuery(
    { bookId, sourceType: 'past_exam' },
    { enabled: sourceMode === 'past' }
  );

  // 選定來源的題目
  const { data: sourceQData, isLoading: sourceQLoading } = trpc.tutorChat.getSubjectExamSourceQuestions.useQuery(
    { sourceId: selectedSourceId ?? 0, sourceType: selectedSourceType, page, pageSize: 20 },
    { enabled: (sourceMode === 'teacher' || sourceMode === 'simulation' || sourceMode === 'past') && !!selectedSourceId }
  );

  const solveQuestionMutation = trpc.tutorChat.solveQuestion.useMutation({
    onSuccess: (data, variables) => {
      const key = (variables as any)._qKey as string;
      if (key) setAiSolutions(prev => ({ ...prev, [key]: data.explanation }));
      setSolvingKey(null);
    },
    onError: () => {
      setSolvingKey(null);
      toast.error('解題失敗，請稍後再試');
    },
  });

  const { data: wrongBookItems = [], isLoading: wrongBookLoading, refetch: refetchWrongBook } = trpc.tutorChat.getMyWrongBook.useQuery(
    { bookId, includeResolved: true },
    { enabled: true }
  );
  // 用 questionId Set 持續追蹤哪些題目已加入錯題本
  const wrongBookQuestionIds = useMemo(() => new Set(wrongBookItems.map(i => i.questionId)), [wrongBookItems]);

  const resolveWrongBookMutation = trpc.tutorChat.resolveWrongBook.useMutation({
    onSuccess: (_data, variables) => {
      setWrongBookResolved(prev => ({ ...prev, [variables.questionId]: true }));
      refetchWrongBook();
      toast.success('已標記為已掌握');
    },
    onError: () => toast.error('操作失敗'),
  });

  const saveToNotesMutation = trpc.savedNotes.save.useMutation({
    onSuccess: (_data, variables) => {
      const id = (variables as any)._wrongBookId as number;
      if (id) setSavedToNotes(prev => ({ ...prev, [id]: true }));
      toast.success('已存入筆記本（錯題本資料夾）');
    },
    onError: () => toast.error('存入失敗'),
  });

  const addToWrongBookMutation = trpc.tutorChat.addToWrongBook.useMutation({
    onSuccess: (data, variables) => {
      const key = (variables as any)._qKey as string;
      // 無論是新加入還是重複，都標記為已加入
      if (key) setWrongBookAdded(prev => ({ ...prev, [key]: true }));
      if (data.alreadyExists) toast.info('此題已在錯題本中，不重複加入');
      else {
        toast.success('已加入錯題本');
        // 若目前在錯題本頁面，立即更新
        refetchWrongBook();
      }
    },
    onError: () => toast.error('加入失敗'),
  });

  const typeLabels = { all: "全部", unitqa: "精選考題", chapterqa: "精選簡答", exam: "考古題", review: "選擇題" };
  const typeColors = {
    all: "bg-muted text-foreground",
    unitqa: "bg-orange-100 text-orange-700",
    chapterqa: "bg-purple-100 text-purple-700",
    exam: "bg-amber-100 text-amber-700",
    review: "bg-blue-100 text-blue-700",
  };

  const handleAnswer = (qKey: string, label: string) => {
    if (revealed[qKey]) return;
    setAnswers((prev) => ({ ...prev, [qKey]: label }));
    // 點選後直接顯示答案，不需要二次確認
    setRevealed((prev) => ({ ...prev, [qKey]: true }));
  };

  const handleReveal = (qKey: string) => setRevealed((prev) => ({ ...prev, [qKey]: true }));

  const handleAddToWrongBook = (
    qKey: string,
    questionId: number,
    srcType: 'exam_set' | 'real_exam' | 'ai_exam',
    questionText: string,
    correctAnswer?: string,
    userAnswer?: string,
    options?: { label: string; text: string }[],
    chapterName?: string,
  ) => {
    if (wrongBookAdded[qKey]) return;
    addToWrongBookMutation.mutate({
      _qKey: qKey,
      questionId,
      sourceType: srcType,
      bookId,
      questionText,
      chapterName,
      correctAnswer,
      userAnswer,
      options,
    } as any);
  };

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* 來源切換：四分類 */}
        <div className="flex gap-2 items-center border-b border-border pb-3 flex-wrap">
          <button
            onClick={() => { setSourceMode('book'); setPage(1); setSelectedSourceId(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              sourceMode === 'book' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            📚 書本練習題
          </button>
          {/* 老師精選題、精選模擬題、歷屆考古題 暫時隱藏 */}
          <button
            onClick={() => { setSourceMode('mock'); setMockPhase('setup'); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              sourceMode === 'mock' ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            ⏱️ 模擬考試
          </button>
          <button
            onClick={() => { setSourceMode('wrongbook'); setPage(1); setSelectedSourceId(null); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              sourceMode === 'wrongbook' ? 'bg-red-600 text-white border-red-600' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            📌 我的錯題本
          </button>
        </div>

        {/* 模擬考試 */}
        {sourceMode === 'mock' && (
          <div className="space-y-4">
            {/* 設定頁 */}
            {mockPhase === 'setup' && (
              <div className="max-w-lg mx-auto space-y-5 pt-4">
                <h3 className="text-lg font-semibold text-foreground">⚙️ 模擬考試設定</h3>
                {/* 章節選擇 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">考試範圍</label>
                  <select
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                    value={mockChapterId ?? ""}
                    onChange={e => setMockChapterId(e.target.value ? parseInt(e.target.value) : undefined)}
                  >
                    <option value="">全部章節</option>
                    {chapters.filter(c => !c.parentChapterId).map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                {/* 題數 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">題數</label>
                  <input
                    type="number" min={1} max={100}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                    value={mockCount}
                    onChange={e => setMockCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                  />
                </div>
                {/* 每題秒數 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">每題思考時間（秒）</label>
                  <input
                    type="number" min={5} max={300}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                    value={mockSecondsPerQ}
                    onChange={e => setMockSecondsPerQ(Math.max(5, Math.min(300, parseInt(e.target.value) || 10)))}
                  />
                  <p className="text-xs text-muted-foreground">預計總考試時間：{Math.floor(mockCount * mockSecondsPerQ / 60)} 分 {mockCount * mockSecondsPerQ % 60} 秒</p>
                </div>
                <button
                  className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                  disabled={mockLoading}
                  onClick={() => { setMockQueryKey(k => k + 1); setMockEnabled(true); }}
                >
                  {mockLoading ? '取題中...' : '開始考試'}
                </button>
                {mockExamData && mockExamData.questions.length === 0 && (
                  <p className="text-center text-sm text-red-500">此範圍尚無練習題目，請先在書本練習題中答題。</p>
                )}
              </div>
            )}

            {/* 作答頁 */}
            {mockPhase === 'exam' && mockQuestions.length > 0 && (() => {
              const q = mockQuestions[mockCurrentIdx];
              const totalSecs = mockQuestions.length * mockSecondsPerQ;
              const totalMins = Math.floor(mockTotalTimer / 60);
              const totalSec2 = mockTotalTimer % 60;
              const qPct = (mockQTimer / mockSecondsPerQ) * 100;
              const totalPct = (mockTotalTimer / totalSecs) * 100;
              return (
                <div className="space-y-4">
                  {/* 頂部狀態列 */}
                  <div className="flex items-center justify-between gap-4 bg-muted/40 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-medium text-foreground">{mockCurrentIdx + 1} / {mockQuestions.length} 題</span>
                    <div className="flex items-center gap-3">
                      {/* 單題倒數 */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 transition-all" style={{ width: `${qPct}%` }} />
                        </div>
                        <span className={`text-xs font-mono font-semibold ${mockQTimer <= 3 ? 'text-red-500' : 'text-violet-600'}`}>{mockQTimer}s</span>
                      </div>
                      {/* 總倒數 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">總剩：</span>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 transition-all" style={{ width: `${totalPct}%` }} />
                        </div>
                        <span className={`text-xs font-mono font-semibold ${mockTotalTimer <= 30 ? 'text-red-500' : 'text-amber-600'}`}>{totalMins}:{String(totalSec2).padStart(2,'0')}</span>
                      </div>
                    </div>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1"
                      onClick={() => setMockPhase('result')}
                    >交卷</button>
                  </div>

                  {/* 題目內容 */}
                  <div className="border border-border rounded-2xl p-5 bg-card space-y-4">
                    <div className="flex items-start gap-2">
                      <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5">Q{mockCurrentIdx + 1}</span>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{q.chapterTitle}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt: { label: string; text: string }) => {
                        const isSelected = mockAnswers[q.id] === opt.label;
                        return (
                          <button
                            key={opt.label}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                              isSelected ? 'bg-violet-100 border-violet-400 text-violet-800 font-medium' : 'border-border hover:bg-muted'
                            }`}
                            onClick={() => {
                              setMockAnswers(prev => ({ ...prev, [q.id]: opt.label }));
                              // 選完自動跳下一題
                              setTimeout(() => {
                                if (mockCurrentIdx < mockQuestions.length - 1) setMockCurrentIdx(prev => prev + 1);
                                else setMockPhase('result');
                              }, 300);
                            }}
                          >
                            <span className="font-semibold mr-2">{opt.label}.</span>{opt.text.replace(/^[A-Da-d][.、．]\s*/, '')}
                          </button>
                        );
                      })}
                    </div>
                    {/* 跳過按鈕 */}
                    <button
                      className="text-xs text-muted-foreground underline"
                      onClick={() => {
                        if (mockCurrentIdx < mockQuestions.length - 1) setMockCurrentIdx(prev => prev + 1);
                        else setMockPhase('result');
                      }}
                    >跳過此題</button>
                  </div>
                </div>
              );
            })()}

            {/* 結果頁 */}
            {mockPhase === 'result' && (() => {
              const correct = mockQuestions.filter(q => mockAnswers[q.id] === q.correctAnswer).length;
              const total = mockQuestions.length;
              const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
              const timeUsed = mockQuestions.length * mockSecondsPerQ - mockTotalTimer;
              const minsUsed = Math.floor(timeUsed / 60);
              const secsUsed = timeUsed % 60;
              return (
                <div className="space-y-4">
                  {/* 結果摘要 */}
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-4xl font-bold text-violet-700">{rate}%</p>
                    <p className="text-sm text-muted-foreground">答對 {correct} / {total} 題</p>
                    {timeUsed > 0 && <p className="text-xs text-muted-foreground">用時 {minsUsed > 0 ? `${minsUsed}分` : ''}{secsUsed}秒</p>}
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
                        onClick={() => { setMockPhase('setup'); setMockQuestions([]); setMockAnswers({}); }}
                      >再考一次</button>
                      <button
                        className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                        onClick={() => setSourceMode('book')}
                      >返回練習題</button>
                    </div>
                  </div>

                  {/* 錯題明細 */}
                  {mockQuestions.some(q => mockAnswers[q.id] !== q.correctAnswer) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">錯題明細</h4>
                        <button
                          className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          onClick={() => {
                            mockQuestions.forEach(q => {
                              const userAns = mockAnswers[q.id];
                              if (userAns === q.correctAnswer) return;
                              const qKey = `mock-${q.id}`;
                              if (wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)) return;
                              handleAddToWrongBook(
                                qKey, q.id, 'ai_exam', q.question,
                                q.correctAnswer, userAns,
                                q.options, q.chapterTitle
                              );
                            });
                          }}
                        >📌 全部加入錯題本</button>
                      </div>
                      {mockQuestions.map((q, idx) => {
                        const userAns = mockAnswers[q.id];
                        const isCorrect = userAns === q.correctAnswer;
                        if (isCorrect) return null;
                        const qKey = `mock-${q.id}`;
                        const alreadyAdded = wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id);
                        return (
                          <div key={q.id} className="border border-red-200 bg-red-50/50 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Q{idx + 1}</span>
                              <span className="text-xs text-muted-foreground">{q.chapterTitle}</span>
                              <button
                                className={`ml-auto text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                  alreadyAdded ? 'bg-red-50 text-red-600 border-red-300' : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                                disabled={alreadyAdded}
                                onClick={() => handleAddToWrongBook(
                                  qKey, q.id, 'ai_exam', q.question,
                                  q.correctAnswer, userAns,
                                  q.options, q.chapterTitle
                                )}
                              >
                                📌 {alreadyAdded ? '已入錯題本' : '加入錯題本'}
                              </button>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{q.question}</p>
                            <div className="flex gap-3 text-xs">
                              <span className="text-red-600">我的答案：{userAns ?? '未作答'}</span>
                              <span className="text-green-700">正確答案：{q.correctAnswer}</span>
                            </div>
                            {q.hint && <p className="text-xs text-muted-foreground bg-white rounded-lg p-2 border border-border">💡 {q.hint}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 全對提示 */}
                  {mockQuestions.every(q => mockAnswers[q.id] === q.correctAnswer) && (
                    <div className="text-center py-4 text-emerald-600 font-medium">🎉 全部答對！小筆記與有餘。</div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 書本練習題篩選列 */}
        {sourceMode === 'book' && (
          <div className="flex flex-wrap gap-2 items-center">
            {chapters.length > 0 && (
              <select
                className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
                value={selectedChapterId ?? ""}
                onChange={(e) => { setSelectedChapterId(e.target.value ? parseInt(e.target.value) : undefined); setPage(1); }}
              >
                <option value="">全部章節</option>
                {chapters.filter((c) => !c.parentChapterId).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* 歷屆考古題：來源選擇 */}
        {sourceMode === 'past' && !selectedSourceId && (
          <div>
            {pastSourcesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : pastSources.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>此類科尚未設定歷屆考古題來源</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">選擇要練習的考古題：</p>
                {(pastSources as any[]).map(src => (
                  <button
                    key={src.id}
                    onClick={() => { setSelectedSourceId(src.sourceId); setSelectedSourceType('past_exam'); setPage(1); setAnswers({}); setRevealed({}); setEssayAnswers({}); }}
                    className="w-full text-left px-4 py-3 border border-border rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium">{src.title}</p>
                      {src.totalQuestions && <p className="text-xs text-muted-foreground mt-0.5">共 {src.totalQuestions} 題</p>}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 老師精選題 / 精選模擬題：來源選擇 */}
        {(sourceMode === 'teacher' || sourceMode === 'simulation') && !selectedSourceId && (
          <div>
            {(sourceMode === 'teacher' ? teacherSourcesLoading : simSourcesLoading) ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (sourceMode === 'teacher' ? teacherSources : simSources).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>此類科尚未設定{sourceMode === 'teacher' ? '老師精選題' : '精選模擬題'}來源</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">選擇要練習的題庫：</p>
                {(sourceMode === 'teacher' ? teacherSources : simSources).map(src => (
                  <button
                    key={src.id}
                    onClick={() => { setSelectedSourceId(src.sourceId); setSelectedSourceType(sourceMode === 'teacher' ? 'exam_set' : 'real_exam'); setPage(1); setAnswers({}); setRevealed({}); }}
                    className="w-full text-left px-4 py-3 border border-border rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{src.title}</p>
                      {src.totalQuestions && <p className="text-xs text-muted-foreground mt-0.5">共 {src.totalQuestions} 題</p>}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground rotate-[-90deg] transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 老師精選題 / 精選模擬題：題目列表 */}
        {(sourceMode === 'teacher' || sourceMode === 'simulation' || sourceMode === 'past') && !!selectedSourceId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedSourceId(null); setPage(1); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="w-3 h-3 rotate-90" />返回題庫列表
              </button>
              {sourceQData && <span className="text-xs text-muted-foreground">{sourceQData.title} · 共 {sourceQData.total} 題</span>}
            </div>
            {sourceQLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !sourceQData || sourceQData.questions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>此題庫尚無題目</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sourceQData.questions.map((q, idx) => {
                  const qKey = `src-${selectedSourceType}-${selectedSourceId}-${q.id}-${idx}`;
                  const isRevealed = revealed[qKey];
                  const selectedAns = answers[qKey];
                  const tagColor = sourceMode === 'teacher' ? 'bg-green-100 text-green-700' : sourceMode === 'past' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
                  const tagLabel = sourceMode === 'teacher' ? '老師精選題' : sourceMode === 'past' ? '歷屆考古題' : '精選模擬題';
                  const isEssay = (q as any).questionType === 'essay';
                  return (
                    <div key={qKey} className="border border-border rounded-2xl p-4 bg-card space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground font-medium mt-0.5">Q{(page - 1) * 20 + idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor}`}>{tagLabel}</span>
                        {(q as any).year && <span className="text-xs text-muted-foreground">{(q as any).year}年</span>}
                      </div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">{q.questionText}</p>

                      {/* 選項（選擇題）或作答區（簡答題）*/}
                      {isEssay ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={4}
                            placeholder="請在此輸入您的作答..."
                            value={essayAnswers[qKey] ?? ''}
                            onChange={e => setEssayAnswers(p => ({ ...p, [qKey]: e.target.value }))}
                            disabled={isRevealed}
                          />
                          {!isRevealed && (
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                              onClick={() => setRevealed(p => ({ ...p, [qKey]: true }))}
                            >
                              查看參考答案
                            </button>
                          )}
                        </div>
                      ) : (
                        q.options && q.options.length > 0 && (
                        <div className="space-y-1.5">
                          {q.options.map((opt: { label: string; text: string }, optIdx: number) => {
                            const isSelected = selectedAns === opt.label;
                            const isCorrect = opt.label === q.correctAnswer;
                            let btnClass = "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ";
                            if (isRevealed) {
                              btnClass += isCorrect ? "bg-green-50 border-green-400 text-green-800 font-medium" : isSelected ? "bg-red-50 border-red-300 text-red-700" : "border-border text-muted-foreground";
                            } else {
                              btnClass += isSelected ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted";
                            }
                            return (
                              <button key={`${qKey}-opt-${optIdx}`} className={btnClass} onClick={() => { if (!isRevealed) { setAnswers(p => ({ ...p, [qKey]: opt.label })); setRevealed(p => ({ ...p, [qKey]: true })); } }} disabled={isRevealed}>
                                <span className="font-medium mr-2">{opt.label}.</span>{opt.text.replace(/^[A-Da-d][.、．]\s*/, '')}
                                {isRevealed && isCorrect && <span className="ml-2 text-green-600">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                        )
                      )}

                      {/* 解析 */}
                      {isRevealed && q.explanation && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                          <span className="font-semibold text-amber-700">
                            {sourceMode === 'teacher' ? '📝 老師解析：' : sourceMode === 'past' ? '📜 參考答案：' : '🧠 智能解析：'}
                          </span>{q.explanation}
                        </div>
                      )}
                      {/* 簡答題揭曉後顯示正確答案 */}
                      {isEssay && isRevealed && q.correctAnswer && !q.explanation && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                          <span className="font-semibold text-amber-700">📜 參考答案：</span>{q.correctAnswer}
                        </div>
                      )}

                      {/* 按鈕列 */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                        {/* 老師解析按鈕：有預存解析時顯示，無解析時隱藏 */}
                        {q.explanation ? (
                          <button
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              !isRevealed ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-50 text-amber-700 border border-amber-300'
                            }`}
                            onClick={() => handleReveal(qKey)}
                          >
                            <span>📝</span>{isRevealed ? '已顯示解析' : '查看答案與解析'}
                          </button>
                        ) : (
                          !isRevealed && (
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                              onClick={() => handleReveal(qKey)}
                            >
                              查看答案
                            </button>
                          )
                        )}
                        {/* 加入錯題本 */}
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            (wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)) ? 'bg-red-50 text-red-600 border-red-300' : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          onClick={() => handleAddToWrongBook(qKey, q.id, sourceMode === 'teacher' ? 'exam_set' : sourceMode === 'simulation' ? 'real_exam' : sourceMode === 'past' ? 'past_exam' : 'ai_exam', q.questionText, q.correctAnswer ?? undefined, answers[qKey], q.options as { label: string; text: string }[] | undefined)}
                          disabled={wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)}
                        >
                          📌 {(wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)) ? '已入錯題本' : '加入錯題本'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 分頁 */}
            {sourceQData && sourceQData.total > 20 && (
              <div className="flex justify-center gap-2 py-4">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一頁</Button>
                <span className="text-sm text-muted-foreground self-center">第 {page} 頁</span>
                <Button variant="outline" size="sm" disabled={sourceQData.questions.length < 20} onClick={() => setPage(p => p + 1)}>下一頁</Button>
              </div>
            )}
          </div>
        )}

        {/* 書本練習題題目列表 */}
        {sourceMode === 'book' && (
          <div>
          {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>此篩選條件下沒有題目</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const qKey = `${q.type}-${q.id}`;
              const isRevealed = revealed[qKey];
              const selectedAns = answers[qKey];
              return (
                <div key={qKey} className="border border-border rounded-2xl p-4 bg-card space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground font-medium mt-0.5">Q{(page - 1) * 10 + idx + 1}</span>
                    {q.examSetName && <span className="text-xs text-muted-foreground">({q.examSetName})</span>}
                    {q.pageRef && <span className="text-xs text-muted-foreground ml-auto">第 {q.pageRef} 頁</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{q.questionText}</p>

                  {/* 選擇題選項 */}
                  {q.options && q.options.length > 0 && (
                    <div className="space-y-1.5">
                      {q.options.map((opt: { label: string; text: string; isCorrect?: boolean }, optIdx: number) => {
                        const isSelected = selectedAns === opt.label;
                        const isCorrect = opt.label === q.correctAnswer;
                        let btnClass = "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ";
                        if (isRevealed) {
                          btnClass += isCorrect ? "bg-green-50 border-green-400 text-green-800 font-medium" : isSelected ? "bg-red-50 border-red-300 text-red-700" : "border-border text-muted-foreground";
                        } else {
                          btnClass += isSelected ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted";
                        }
                        return (
                          <button key={`${qKey}-opt-${optIdx}`} className={btnClass} onClick={() => handleAnswer(qKey, opt.label)} disabled={isRevealed}>
                            <span className="font-medium mr-2">{opt.label}.</span>{opt.text.replace(/^[A-Da-d][.、．]\s*/, '')}
                            {isRevealed && isCorrect && <span className="ml-2 text-green-600">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 簡答題 */}
                  {q.type === "chapterqa" && (
                    <div>
                      <button
                        className="text-xs text-primary underline flex items-center gap-1"
                        onClick={() => handleReveal(qKey)}
                      >
                        {isRevealed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isRevealed ? "收起答案" : "查看答案"}
                      </button>
                      {isRevealed && q.answer && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 leading-relaxed">
                          {q.answer}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 解析 */}
                  {isRevealed && q.explanation && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
                      <span className="font-medium">解析：</span>{q.explanation}
                    </div>
                  )}

                  {/* 錯題本按鈕 */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        (wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)) ? 'bg-red-50 text-red-600 border-red-300' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => handleAddToWrongBook(qKey, q.id, 'ai_exam', q.questionText, q.correctAnswer ?? undefined, answers[qKey], q.options as { label: string; text: string }[] | undefined, (q as any).chapterTitle ?? undefined)}
                      disabled={wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)}
                    >
                      📌 {(wrongBookAdded[qKey] || wrongBookQuestionIds.has(q.id)) ? '已入錯題本' : '加入錯題本'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          {/* 書本練習題分頁 */}
          {questions.length > 0 && (
            <div className="flex justify-center items-center gap-2 py-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>上一頁</Button>
              <span className="text-sm text-muted-foreground">
                第 {page} 頁{practiceTotal > 0 ? ` / 共 ${Math.ceil(practiceTotal / 10)} 頁（${practiceTotal} 題）` : ''}
              </span>
              <Button variant="outline" size="sm" disabled={page * 10 >= practiceTotal} onClick={() => setPage((p) => p + 1)}>下一頁</Button>
            </div>
          )}
        </div>
        )}

        {/* ── 我的錯題本 ── */}
        {sourceMode === 'wrongbook' && (
          <div className="space-y-4">
            {/* 工具列 */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {wrongBookLoading ? '載入中...' : `共 ${wrongBookItems.length} 題待複習`}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={wrongBookIncludeResolved}
                  onChange={e => setWrongBookIncludeResolved(e.target.checked)}
                />
                顯示已掌握的題目
              </label>
            </div>

            {wrongBookLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : wrongBookItems.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <span className="text-5xl block mb-4">📌</span>
                <p className="font-medium mb-1">錯題本是空的</p>
                <p className="text-xs">在練習題中點「加入錯題本」，答錯的題目會出現在這裡</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wrongBookItems.map((item, idx) => {
                  const isResolved = item.isResolved === 1 || wrongBookResolved[item.questionId];
                  const srcLabel = (item as any).chapterName ?? (
                    item.sourceType === 'exam_set' ? '老師精選題' : item.sourceType === 'real_exam' ? '精選模擬題' : '書本練習題'
                  );
                  const srcColor = 'bg-indigo-100 text-indigo-700';
                  return (
                    <div key={item.id} className={`border rounded-2xl p-4 space-y-3 transition-opacity ${
                      isResolved ? 'border-border/40 opacity-60 bg-muted/30' : 'border-border bg-card'
                    }`}>
                      {/* 標頭 */}
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium mt-0.5">#{idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${srcColor}`}>{srcLabel}</span>
                        {isResolved && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">✓ 已掌握</span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">答錯 {item.wrongCount} 次</span>
                      </div>

                      {/* 題目文字 */}
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {item.questionText || '（題目內容未記錄）'}
                      </p>

                      {/* 選項（若有存入） */}
                      {(() => {
                        let opts: { label: string; text: string }[] | null = null;
                        try { opts = item.options ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options as { label: string; text: string }[]) : null; } catch {}
                        const wbKey = `wb-${item.id}`;
                        const isWbRevealed = revealed[wbKey];
                        const selectedWbAns = answers[wbKey];
                        if (!opts || opts.length === 0) return null;
                        return (
                          <div className="space-y-1.5">
                            {opts.map((opt, optIdx) => {
                              const isSelected = selectedWbAns === opt.label;
                              const isCorrect = opt.label === item.correctAnswer;
                              const wasWrong = opt.label === item.userAnswer && item.userAnswer !== item.correctAnswer;
                              let btnClass = "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ";
                              if (isWbRevealed) {
                                btnClass += isCorrect ? "bg-green-50 border-green-400 text-green-800 font-medium" : isSelected && !isCorrect ? "bg-red-50 border-red-300 text-red-700" : "border-border text-muted-foreground";
                              } else {
                                btnClass += isSelected ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-muted";
                              }
                              return (
                                <button key={optIdx} className={btnClass}
                                  onClick={() => { if (!isWbRevealed) { setAnswers(p => ({ ...p, [wbKey]: opt.label })); setRevealed(p => ({ ...p, [wbKey]: true })); } }}
                                  disabled={isWbRevealed}>
                                  <span className="font-medium mr-2">{opt.label}.</span>
                                  {opt.text.replace(/^[A-Da-d][.、．]\s*/, '')}
                                  {isWbRevealed && isCorrect && <span className="ml-2 text-green-600">✓ 正確</span>}
                                  {!isWbRevealed && wasWrong && <span className="ml-2 text-xs text-red-400">(上次選此)</span>}
                                </button>
                              );
                            })}
                            {!isWbRevealed && (
                              <button className="text-xs text-primary underline mt-1" onClick={() => setRevealed(p => ({ ...p, [wbKey]: true }))}>直接查看答案</button>
                            )}
                          </div>
                        );
                      })()}

                      {/* 正確答案（無選項時顯示） */}
                      {item.correctAnswer && !(item.options && (typeof item.options === 'string' ? (() => { try { return JSON.parse(item.options as string); } catch { return []; } })() : item.options as unknown[]).length > 0) && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">正確答案：</span>
                          <span className="font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">{item.correctAnswer}</span>
                        </div>
                      )}
                      {/* 上次作答（有選項時顯示） */}
                      {item.userAnswer && item.userAnswer !== item.correctAnswer && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">上次答錯：</span>
                          <span className="font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">{item.userAnswer}</span>
                        </div>
                      )}

                      {/* 按鈕列 */}
                      <div className="pt-1 border-t border-border/50 flex flex-wrap gap-2">
                        {/* 存到筆記本按鈕 */}
                        <button
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            savedToNotes[item.id]
                              ? 'bg-blue-50 text-blue-600 border-blue-300'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          onClick={() => {
                            if (savedToNotes[item.id]) return;
                            saveToNotesMutation.mutate({
                              _wrongBookId: item.id,
                              bookId: item.bookId ?? bookId,
                              subjectName: subjectName,
                              folderName: '智能練題',
                              title: item.questionText?.slice(0, 30) ?? '錯題筆記',
                              question: item.questionText ?? undefined,
                              content: (() => {
                                const srcLbl = item.sourceType === 'exam_set' ? '老師精選題' : item.sourceType === 'real_exam' ? '精選模擬題' : '書本練習題';
                                let opts: { label: string; text: string }[] | null = null;
                                try { opts = item.options ? (typeof item.options === 'string' ? JSON.parse(item.options as string) : item.options as { label: string; text: string }[]) : null; } catch {}
                                let optsText = '';
                                if (opts && opts.length > 0) {
                                  optsText = '\n\n選項：\n' + opts.map(o => {
                                    const isCorrect = o.label === item.correctAnswer;
                                    const wasWrong = o.label === item.userAnswer && item.userAnswer !== item.correctAnswer;
                                    return `${o.label}. ${o.text.replace(/^[A-Da-d][.、．]\s*/, '')}${isCorrect ? ' ✓ 正確答案' : ''}${wasWrong ? ' ✗ 我的答案' : ''}`;
                                  }).join('\n');
                                }
                                return `來源：${srcLbl}　答錯 ${item.wrongCount} 次\n正確答案：${item.correctAnswer ?? '未記錄'}${item.userAnswer && item.userAnswer !== item.correctAnswer ? `　我的答案：${item.userAnswer}` : ''}${optsText}`;
                              })(),
                            } as any);
                          }}
                          disabled={savedToNotes[item.id] || saveToNotesMutation.isPending}
                        >
                          📝 {savedToNotes[item.id] ? '已存入筆記本' : '存入筆記本'}
                        </button>
                        {/* 已掌握按鈕 */}
                        {!isResolved && (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            onClick={() => resolveWrongBookMutation.mutate({ questionId: item.questionId, sourceType: item.sourceType as 'exam_set' | 'real_exam' | 'ai_exam' })}
                            disabled={resolveWrongBookMutation.isPending}
                          >
                            ✓ 已掌握，從錯題本移除
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 章節瀏覽 Tab ─────────────────────────────────────────────────────────────
// 分割畫面 Tab—左側章節目錄+PDF、右側 AI 問答（可拖拉調整寬度、支援貼圖）
function ChaptersTab({ bookId: initialBookId, pdfUrl: initialPdfUrl, onAskAboutChapter, fontSize = 14, externalMessages, onMessagesChange, externalSessionId, onSessionIdChange, subjectId, restoreState }: {
  bookId: number;
  pdfUrl?: string | null;
  onAskAboutChapter: (chapterId: number, chapterTitle: string) => void;
  fontSize?: number;
  externalMessages?: Message[];
  onMessagesChange?: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  externalSessionId?: number;
  onSessionIdChange?: (id: number | undefined) => void;
  subjectId?: number;
  restoreState?: ChapterRestoreState | null;
}) {
  // 書本選擇器：若有 subjectId 則只取該類科的公開書本，否則取得所有公開書本
  const { data: allBooks = [], isLoading: booksLoading } = trpc.tutorPublic.getAllPublicBooks.useQuery(
    subjectId ? { subjectId } : undefined
  );
  // 目前選中的書本（預設為父層傳入的 bookId）
  const [selectedBookId, setSelectedBookId] = useState<number>(initialBookId);
  const [showBookPicker, setShowBookPicker] = useState(false);
  // 取得選中書本的詳細資料（pdfUrl）
  const selectedBook = allBooks.find(b => b.id === selectedBookId);
  const bookId = selectedBookId;
  const pdfUrl = selectedBook?.pdfUrl ?? initialPdfUrl;

  const [currentPage, setCurrentPage] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChat, setShowChat] = useState(true);
  // 比例模式: '1:1' | '3:7' | '7:3'
  const [splitRatio, setSplitRatio] = useState<ChapterSplitRatio>("1:1");
  // 若父層傳入外部 messages，使用外部（切換 Tab 不清空）；否則退回本地 state
  const [localChatMessages, setLocalChatMessages] = useState<Message[]>([]);
  const chatMessages = externalMessages ?? localChatMessages;
  const setChatMessages = (onMessagesChange ?? setLocalChatMessages) as React.Dispatch<React.SetStateAction<Message[]>>;
  const [chatInput, setChatInput] = useState("");
  const [localChatSessionId, setLocalChatSessionId] = useState<number | undefined>();
  const chatSessionId = externalSessionId ?? localChatSessionId;
  const setChatSessionId = (val: number | undefined) => {
    if (onSessionIdChange) onSessionIdChange(val);
    else setLocalChatSessionId(val);
  };
  const [isAsking, setIsAsking] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>();
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string | undefined>();
  const [splitPendingImages, setSplitPendingImages] = useState<string[]>([]);
  const [pageFullText, setPageFullText] = useState<string | null>(null);
  const [isFetchingPageText, setIsFetchingPageText] = useState(false);
  const [pdfScale, setPdfScale] = useState<number>(1.0);
  // 購書憑證
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState<string | null>(null); // 已兌換的憑證編號
  const [voucherSuccess, setVoucherSuccess] = useState<{ message: string; credits: number } | null>(null);
  // 取得浮水印設定
  const { data: watermarkSettings } = trpc.watermarkPublic.getPublicSettings.useQuery();
  // 檢查是否已兌換過
  const { data: voucherStatus } = trpc.bookVoucher.checkRedeemed.useQuery(
    { bookId },
    { enabled: !!bookId }
  );
  // 兌換購書憑證
  const redeemVoucherMutation = trpc.bookVoucher.redeemVoucher.useMutation({
    onSuccess: (data) => {
      if (data.alreadyRedeemed) {
        toast.info(data.message);
        setVoucherCode(voucherInput);
        setVoucherDialogOpen(false);
      } else {
        setVoucherCode(voucherInput);
        setVoucherSuccess({ message: data.message, credits: data.creditsGranted });
        setVoucherDialogOpen(false);
      }
    },
    onError: (err) => toast.error("兌換失敗：" + err.message),
  });
  // 若已兌換過，直接設定 voucherCode
  React.useEffect(() => {
    if (voucherStatus?.redeemed && voucherStatus.record?.voucherCode) {
      setVoucherCode(voucherStatus.record.voucherCode);
    }
  }, [voucherStatus]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const splitFileInputRef = useRef<HTMLInputElement>(null);
  const lastRestoredSessionRef = useRef<number | null>(null);

  // 比例對應的 flex 數値
  const ratioMap = { '1:1': [1, 1], '3:7': [3, 7], '7:3': [7, 3] };
  const [pdfFlex, chatFlex] = ratioMap[splitRatio];

  const { data: chapters = [], isLoading } = trpc.tutorChat.getChapters.useQuery({ bookId });
  const topChapters = chapters.filter((c) => !c.parentChapterId);

  const utils = trpc.useUtils();
  const [savedBookMsgIds, setSavedBookMsgIds] = React.useState<Set<number>>(new Set());
  const [expandedMsgs, setExpandedMsgs] = React.useState<Set<number>>(new Set());
  const saveBookNoteMutation = trpc.savedNotes.save.useMutation({
    onSuccess: (_data, variables) => {
      const idx = (variables as any)._msgIdx ?? -1;
      setSavedBookMsgIds(prev => { const next = new Set(prev); next.add(idx); return next; });
      toast.success('已收藏到「智能書本」筆記！');
      utils.savedNotes.list.invalidate();
      utils.savedNotes.totalCount.invalidate();
    },
    onError: () => toast.error('收藏失敗，請稍後再試'),
  });

  const getPageFullTextMutation = trpc.tutorPublic.getPageFullText.useMutation({
    onSuccess: (data) => {
      // 静默儲存快取，不顯示全文給學生
      setPageFullText(data.text);
      setIsFetchingPageText(false);
    },
    onError: () => {
      setIsFetchingPageText(false);
    },
  });

  const handleFetchPageFullText = () => {
    if (!bookId || !currentPage) return;
    setIsFetchingPageText(true);
    setPageFullText(null);
    getPageFullTextMutation.mutate({ bookId, page: currentPage });
  };

  const splitAskMutation = trpc.tutorChat.ask.useMutation({
    onSuccess: (data) => {
      setChatSessionId(data.sessionId);
      setChatMessages((prev) => prev.filter(m => m.content !== '__loading__').concat({
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        createdAt: Date.now(),
        followUpQuestions: (data as any).followUpQuestions ?? [],
      }));
      setIsAsking(false);
    },
    onError: (error) => {
      setChatMessages(prev => prev.filter(m => m.content !== '__loading__'));
      toast.error('提問失敗：' + error.message);
      setIsAsking(false);
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSplitSend = () => {
    const q = chatInput.trim();
    if ((!q && splitPendingImages.length === 0) || isAsking) return;
    const displayContent = q || '（圖片提問）';
    setChatMessages(prev => [...prev,
      { role: 'user', content: displayContent, imageUrls: splitPendingImages.length > 0 ? [...splitPendingImages] : undefined, createdAt: Date.now() },
      { role: 'assistant', content: '__loading__', createdAt: Date.now() }
    ]);
    setChatInput("");
    setIsAsking(true);
    const imgs = [...splitPendingImages];
    setSplitPendingImages([]);
    const history = chatMessages.filter(m => m.content !== '__loading__').slice(-6).map(m => ({ role: m.role, content: m.content }));
    splitAskMutation.mutate({ bookId, question: displayContent, sessionId: chatSessionId, history, chapterId: selectedChapterId, imageUrls: imgs.length > 0 ? imgs : undefined, currentPage });
  };

  const readFileAsBase64Split = (file: File, cb: (b64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) cb(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleSplitFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (splitPendingImages.length >= 2) { toast.error('最多只能附上 2 張圖片'); return; }
    readFileAsBase64Split(files[0], (b64) => setSplitPendingImages(prev => [...prev, b64]));
    e.target.value = '';
  };

  const handleSplitPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          if (splitPendingImages.length >= 2) { toast.error('最多只能附上 2 張圖片'); return; }
          readFileAsBase64Split(file, (b64) => setSplitPendingImages(prev => [...prev, b64]));
        }
      }
    }
  };

  const jumpToPage = (page: number) => setCurrentPage(page);

  useEffect(() => {
    if (!restoreState?.sessionId) return;
    if (lastRestoredSessionRef.current === restoreState.sessionId) return;
    lastRestoredSessionRef.current = restoreState.sessionId;

    let nextBookId = restoreState.bookId;
    let nextPage = restoreState.page;
    let nextSplitRatio = restoreState.splitRatio;

    try {
      const raw = sessionStorage.getItem(`tutor-chapter-state:${restoreState.sessionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          bookId?: unknown;
          page?: unknown;
          splitRatio?: unknown;
        };
        if (typeof parsed.bookId === "number" && parsed.bookId > 0) nextBookId = parsed.bookId;
        if (typeof parsed.page === "number" && parsed.page > 0) nextPage = parsed.page;
        if (parsed.splitRatio === "1:1" || parsed.splitRatio === "3:7" || parsed.splitRatio === "7:3") {
          nextSplitRatio = parsed.splitRatio;
        }
      }
    } catch {
      // ignore malformed session storage
    }

    if ((!nextBookId || !nextPage) && externalMessages && externalMessages.length > 0) {
      const latestSource = [...externalMessages]
        .reverse()
        .flatMap((msg) => msg.sources ?? [])
        .find((src) => {
          const hasBookId = typeof src.bookId === "number" && src.bookId > 0;
          const hasPage = typeof src.page === "number" && src.page > 0;
          return hasBookId || hasPage;
        });
      if (latestSource) {
        if (!nextBookId && typeof latestSource.bookId === "number" && latestSource.bookId > 0) {
          nextBookId = latestSource.bookId;
        }
        if (!nextPage && typeof latestSource.page === "number" && latestSource.page > 0) {
          nextPage = latestSource.page;
        }
      }
    }

    if (typeof nextBookId === "number" && nextBookId > 0) {
      setSelectedBookId(nextBookId);
    }
    if (typeof nextPage === "number" && nextPage > 0) {
      setCurrentPage(Math.floor(nextPage));
    }
    if (nextSplitRatio) {
      setSplitRatio(nextSplitRatio);
    }
  }, [restoreState, externalMessages]);

  useEffect(() => {
    if (!chatSessionId) return;
    try {
      sessionStorage.setItem(
        `tutor-chapter-state:${chatSessionId}`,
        JSON.stringify({
          bookId: selectedBookId,
          page: currentPage,
          splitRatio,
        })
      );
    } catch {
      // ignore session storage errors
    }
  }, [chatSessionId, selectedBookId, currentPage, splitRatio]);

  // 頁碼變化時自動靈默預擷取前後頁快取
  useEffect(() => {
    if (!bookId || !currentPage) return;
    // 延遲 300ms 避免快速翻頁時連續觸發大量請求
    const timer = setTimeout(() => {
      const pagesToPrefetch = [currentPage - 1, currentPage, currentPage + 1].filter(p => p > 0);
      pagesToPrefetch.forEach(p => {
        getPageFullTextMutation.mutate({ bookId, page: p });
      });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, bookId]);

  // 鍵盤左右方向鍵翻頁
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 若目前 focus 在輸入框（textarea, input）內則不觸發
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPage(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage(p => p + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 書本選擇器 UI
  const bookPickerUI = (
    <div className="relative">
      <button
        onClick={() => setShowBookPicker(!showBookPicker)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors max-w-[200px]"
        title="切換書本"
      >
        <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="truncate text-foreground font-medium">
          {booksLoading ? '載入中...' : (selectedBook?.title ?? '選擇書本')}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </button>
      {showBookPicker && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground px-1">選擇要閱讀的書本</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {booksLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : allBooks.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">目前沒有公開的書本</div>
            ) : (
              allBooks.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBookId(b.id); setShowBookPicker(false); setCurrentPage(1); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors ${
                    b.id === selectedBookId ? 'bg-primary/10' : ''
                  }`}
                >
                  {b.coverImageUrl ? (
                    <img src={b.coverImageUrl} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-8 h-10 rounded flex-shrink-0 border border-border bg-muted flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${b.id === selectedBookId ? 'text-primary' : 'text-foreground'}`}>{b.title}</p>
                    {b.author && <p className="text-[10px] text-muted-foreground truncate">{b.author}</p>}
                    <p className="text-[10px] text-muted-foreground">{b.totalPages} 頁</p>
                  </div>
                  {b.id === selectedBookId && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const isHandout = (selectedBook as any)?.contentType === 'handout';

  if (!pdfUrl) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="text-center text-muted-foreground">
        <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>此書尚未上傳 PDF</p>
        <p className="text-xs mt-1">請選擇其他書本</p>
      </div>
      {bookPickerUI}
    </div>
  );

  const pdfSrc = `${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* 隱藏的 file input */}
      <input ref={splitFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSplitFileSelect} />

      {/* 購書憑證對話框 */}
      {voucherDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">
                {isHandout ? '學員編號驗證' : '購書憑證驗證'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isHandout
                  ? '請輸入您的學員編號以解鎖閱讀'
                  : (watermarkSettings?.voucherPrompt || '請輸入您的購書憑證編號以解鎖閱讀')}
              </p>
            </div>
            <Input
              value={voucherInput}
              onChange={e => setVoucherInput(e.target.value)}
              placeholder={isHandout ? '請輸入學員編號' : '請輸入憑證編號'}
              className="mb-3"
              onKeyDown={e => {
                if (e.key === 'Enter' && voucherInput.trim()) {
                  redeemVoucherMutation.mutate({ bookId, voucherCode: voucherInput.trim() });
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setVoucherDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1"
                disabled={!voucherInput.trim() || redeemVoucherMutation.isPending}
                onClick={() => redeemVoucherMutation.mutate({ bookId, voucherCode: voucherInput.trim() })}
              >
                {redeemVoucherMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {isHandout ? '確認編號' : '確認憑證'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 購書成功感謝動畫 */}
      {voucherSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">購書成功！</h2>
            <p className="text-sm text-muted-foreground mb-3">{voucherSuccess.message}</p>
            {voucherSuccess.credits > 0 && (
              <div className="bg-primary/10 rounded-xl py-3 px-4 mb-4">
                <p className="text-2xl font-bold text-primary">+{voucherSuccess.credits} 點</p>
                <p className="text-xs text-muted-foreground mt-0.5">已存入您的帳戶</p>
              </div>
            )}
            <Button className="w-full" onClick={() => setVoucherSuccess(null)}>開始閱讀</Button>
          </div>
        </div>
      )}

      {/* 左側章節列表 */}
      {showSidebar && (
        <div className="w-52 flex-shrink-0 border-r border-border overflow-y-auto bg-muted/20" style={{ fontSize: `${fontSize}px` }}>
          <div className="p-3">
            <p className="font-semibold text-muted-foreground mb-2 uppercase tracking-wide" style={{ fontSize: `${Math.max(10, fontSize - 4)}px` }}>章節目錄</p>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-0.5">
                {topChapters.map((chapter) => (
                  <div key={chapter.id}>
                    <button
                      className={`w-full text-left px-2 py-2 rounded-lg transition-colors hover:bg-primary/10 hover:text-primary ${
                        currentPage === (chapter.startPage ?? 1) ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                      }`}
                      onClick={() => {
                        if (chapter.startPage) jumpToPage(chapter.startPage);
                        setSelectedChapterId(chapter.id);
                        setSelectedChapterTitle(chapter.title);
                      }}
                    >
                      <span className="block break-words whitespace-normal leading-snug">{chapter.title}</span>
                      {chapter.startPage && (
                        <span className="text-muted-foreground text-[10px]">p.{chapter.startPage}</span>
                      )}
                    </button>
                    {chapters.filter(c => c.parentChapterId === chapter.id).map(sub => (
                      <button
                        key={sub.id}
                        className="w-full text-left pl-4 pr-2 py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                        onClick={() => { if (sub.startPage) jumpToPage(sub.startPage); setSelectedChapterId(sub.id); setSelectedChapterTitle(sub.title); }}
                      >
                        <span className="block break-words whitespace-normal leading-snug">▸ {sub.title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 中間 PDF 區 */}
      <div className="flex flex-col overflow-hidden" style={{ flex: pdfFlex, minWidth: 0, minHeight: 0 }}>
        {/* 工具列 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background flex-shrink-0">
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" onClick={() => setShowSidebar(!showSidebar)} title={showSidebar ? '收起目錄' : '展開目錄'}>
            <BookMarked className="w-4 h-4 text-muted-foreground" />
          </button>
          {bookPickerUI}
          {/* 分割比例按鈕 */}
          {showChat && (
            <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 ml-1">
              {(['7:3', '1:1', '3:7'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setSplitRatio(ratio)}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${
                    splitRatio === ratio
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background'
                  }`}
                  title={ratio === '7:3' ? 'PDF 大（PDF:AI = 7:3）' : ratio === '1:1' ? '各半（1:1）' : 'AI 大（PDF:AI = 3:7）'}
                >
                  {ratio}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1" />
          {/* 縮放控制 */}
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
            <button
              onClick={() => setPdfScale(s => Math.max(s - 0.25, 0.5))}
              disabled={pdfScale <= 0.5}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="縮小"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setPdfScale(1.0)}
              className="text-[10px] text-muted-foreground min-w-[34px] text-center hover:text-foreground transition-colors"
              title="重設縮放"
            >
              {Math.round(pdfScale * 100)}%
            </button>
            <button
              onClick={() => setPdfScale(s => Math.min(s + 0.25, 3.0))}
              disabled={pdfScale >= 3.0}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="放大"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
          <button
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
              showChat ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10 border border-primary/30'
            }`}
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {showChat ? '關閉問答' : '開啟 AI 問答'}
          </button>

        </div>
        <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
          <PdfViewer
            url={pdfUrl}
            className="flex-1"
            showToolbar={false}
            externalPage={currentPage}
            onPageChange={(page) => setCurrentPage(page)}
            scale={pdfScale}
            watermark={watermarkSettings}
            voucherCode={voucherCode}
          />
        </div>
      </div>

      {/* 右側 AI 問答面板 */}
      {showChat && (
        <>
          <div className="border-l border-border flex flex-col bg-background" style={{ flex: chatFlex, minWidth: 0, minHeight: 0 }}>
            {/* 問答標頭 */}
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">AI 問答</span>
                {selectedChapterTitle && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full truncate max-w-[100px]" title={selectedChapterTitle}>{selectedChapterTitle}</span>
                )}
                {/* 頁碼顯示與手動輸入 */}
                <div className="flex items-center gap-0.5 ml-auto">
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    onClick={() => { if (currentPage > 1) { setCurrentPage(p => p - 1); } }}
                    disabled={currentPage <= 1}
                    title="上一頁"
                  ><ChevronLeft className="w-3 h-3" /></button>
                  <span className="text-[10px] text-muted-foreground">第</span>
                  <input
                    type="number"
                    min={1}
                    value={currentPage}
                    onChange={e => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 1) setCurrentPage(v);
                    }}
                    className="w-10 h-5 text-[10px] text-center border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    title="目前解析頁碼（可手動修改）"
                  />
                  <span className="text-[10px] text-muted-foreground">頁</span>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setCurrentPage(p => p + 1)}
                    title="下一頁"
                  ><ChevronRight className="w-3 h-3" /></button>
                </div>
                {chatMessages.length > 0 && (
                  <button className="text-[10px] text-muted-foreground hover:text-destructive" onClick={() => { setChatMessages([]); setChatSessionId(undefined); }}>清空</button>
                )}
              </div>
              {!selectedChapterTitle && (
                <p className="text-[10px] text-muted-foreground mt-1">點擊左側章節可限定提問範圍</p>
              )}
            </div>

            {/* 訊息區 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ fontSize: `${fontSize}px` }}>
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">邊看 PDF 邊問 AI</p>
                  <p className="text-[10px] mt-1 text-muted-foreground/70">可複製文字、貼上圖片後提問</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />}
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {msg.content === '__loading__'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : msg.role === 'assistant'
                          ? (() => {
                              // 簡答/詳解切換：計算简答（前 3 行或 200 字）
                              const lines = msg.content.split('\n');
                              const shortLines = lines.slice(0, 3);
                              const shortText = shortLines.join('\n');
                              const isLong = msg.content.length > 200 || lines.length > 3;
                              const isExpanded = expandedMsgs.has(idx);
                              return (
                                <>
                                  <Streamdown>{isLong && !isExpanded ? shortText + '...' : msg.content}</Streamdown>
                                  {isLong && (
                                    <button
                                      className="mt-1 text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                      onClick={() => setExpandedMsgs(prev => {
                                        const next = new Set(prev);
                                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                                        return next;
                                      })}
                                    >
                                      {isExpanded ? '▲ 收起詳解' : '▼ 展開詳解'}
                                    </button>
                                  )}
                                </>
                              );
                            })()
                          : <>
                              {msg.imageUrls && msg.imageUrls.length > 0 && (
                                <div className="flex gap-1 mb-1 flex-wrap">
                                  {msg.imageUrls.map((url, i) => (
                                    <img key={i} src={url} alt="" className="h-16 rounded-lg object-contain border border-white/20" />
                                  ))}
                                </div>
                              )}
                              <Streamdown>{msg.content}</Streamdown>
                            </>
                      }
                    </div>
                    {msg.role === 'assistant' && msg.content !== '__loading__' && (
                      <button
                        className={`self-start flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          savedBookMsgIds.has(idx)
                            ? 'border-primary/30 text-primary bg-primary/5 cursor-default'
                            : 'border-border text-muted-foreground hover:text-primary hover:border-primary/50'
                        }`}
                        disabled={savedBookMsgIds.has(idx) || saveBookNoteMutation.isPending}
                        onClick={() => {
                          const question = idx > 0 ? chatMessages[idx - 1]?.content : undefined;
                          saveBookNoteMutation.mutate({
                            bookId,
                            chapterId: selectedChapterId ?? null,
                            title: question?.slice(0, 30) ?? '智能書本筆記',
                            question: question,
                            content: msg.content,
                            folderName: '智能書本',
                            _msgIdx: idx,
                          } as any);
                        }}
                      >
                        {savedBookMsgIds.has(idx) ? '✓ 已收藏' : '+ 收藏到筆記'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* 待傳圖片預覽 */}
            {splitPendingImages.length > 0 && (
              <div className="px-3 pt-2 flex gap-2 flex-wrap flex-shrink-0">
                {splitPendingImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="h-14 rounded-lg object-contain border border-border" />
                    <button
                      className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center"
                      onClick={() => setSplitPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* 快捷按鈕 */}
            <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap flex-shrink-0">
              {[
                { label: '整理這頁重點', q: `請幫我整理第 ${currentPage} 頁的重點內容`, quickType: 'summary' },
                { label: '這頁考點是什麼', q: `第 ${currentPage} 頁有哪些常考的考點？`, quickType: 'exam_points' },
                { label: '用例子解釋', q: `請用實際案例解釋第 ${currentPage} 頁的內容`, quickType: 'example' },
              ].map(({ label, q, quickType }) => (
                <button
                  key={label}
                  className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 whitespace-nowrap"
                  disabled={isAsking}
                  onClick={() => {
                    setChatInput("");
                    const displayContent = q;
                    setChatMessages(prev => [...prev,
                      { role: 'user', content: displayContent, createdAt: Date.now() },
                      { role: 'assistant', content: '__loading__', createdAt: Date.now() }
                    ]);
                    setIsAsking(true);
                    const history = chatMessages.filter(m => m.content !== '__loading__').slice(-6).map(m => ({ role: m.role, content: m.content }));
                    // 靜默預擷取前後頁快取（不顯示結果，就存資料庫）
                    const pagesToPrefetch = [currentPage - 1, currentPage, currentPage + 1].filter(p => p > 0);
                    pagesToPrefetch.forEach(p => {
                      getPageFullTextMutation.mutate({ bookId, page: p });
                    });
                    splitAskMutation.mutate({ bookId, question: displayContent, sessionId: chatSessionId, history, chapterId: selectedChapterId, currentPage, quickType });
                  }}
                >{label}</button>
              ))}
            </div>

            {/* 輸入區 */}
            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex gap-2 items-end">
                <button
                  className="flex-shrink-0 w-7 h-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted flex items-center justify-center disabled:opacity-40"
                  onClick={() => splitFileInputRef.current?.click()}
                  disabled={splitPendingImages.length >= 2}
                  title="上傳圖片"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <textarea
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={2}
                  placeholder={splitPendingImages.length > 0 ? "描述圖片問題或直接送出..." : "問 AI 問題（支援貼上圖片）..."}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSplitSend(); } }}
                  onPaste={handleSplitPaste}
                  disabled={isAsking}
                />
                <button
                  className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50"
                  onClick={handleSplitSend}
                  disabled={isAsking || (!chatInput.trim() && splitPendingImages.length === 0)}
                >
                  {isAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 擷取全文快取已静默存入資料庫，不顯示給學生 */}
    </div>
  );
}

// ─── 點數顯示元件 ─────────────────────────────────────────────────────────────────────────────────
function CreditsDisplay() {
  const { user } = useAuth();
  const creditsQuery = trpc.credits.getBalance.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });
  const balance = creditsQuery.data?.balance ?? 0;
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 bg-primary/10 text-primary rounded-full px-3 py-1">
      <Zap className="w-3.5 h-3.5" />
      <span className="text-sm font-semibold">{balance}</span>
    </div>
  );
}

// ─── 主元件 ─────────────────────────────────────────────────────────────────────────────────
export default function TutorChat() {
  const { bookId } = useParams<{ bookId: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [isAsking, setIsAsking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 圖片相關
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number>(-1);
  // OCR 確認
  const [ocrPendingImage, setOcrPendingImage] = useState<string | null>(null);
  // 側欄
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Tab
  const [activeTab, setActiveTab] = useState<"chat" | "practice" | "chapters" | "lessonpoints" | "classroom" | "notes" | "lecture" | "calendar">("chat");
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  // 函授跳轉（從智能筆記點擊時間點，切換到智能函授分頁並定位）
  const [lectureJumpTo, setLectureJumpTo] = useState<{ unitId: number; timeSec: number } | null>(null);
  // 字體大小（14~22px，預設16，從 localStorage 讀取）
  const [chatFontSize, setChatFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("tutorChatFontSize");
    return saved ? Math.min(22, Math.max(14, parseInt(saved))) : 16;
  });
  const handleFontSizeChange = (delta: number) => {
    setChatFontSize(prev => {
      const next = Math.min(22, Math.max(14, prev + delta));
      localStorage.setItem("tutorChatFontSize", String(next));
      return next;
    });
  };
  // 章節限制提問
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(undefined);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string | undefined>(undefined);
  // 簡答 / 詳解模式切換
  const [answerMode, setAnswerMode] = useState<"brief" | "detail">("brief");
  // 章節瀏覽分割畫面的 AI 對話紀錄（提升到父層，切換 Tab 不清空）
  const [chapterChatMessages, setChapterChatMessages] = useState<Message[]>([]);
  const [chapterSessionId, setChapterSessionId] = useState<number | undefined>();
  const [chapterRestoreState, setChapterRestoreState] = useState<ChapterRestoreState | null>(null);

  const bookIdNum = parseInt(bookId ?? "0");

  // 從 URL 讀取類科名稱、老師名稱和類科 ID
  const urlParams = new URLSearchParams(window.location.search);
  const subjectName = urlParams.get("subjectName") ?? "";
  const teacherLabel = urlParams.get("label") ?? "";
  const subjectIdFromUrl = urlParams.get("subjectId") ? parseInt(urlParams.get("subjectId")!) : undefined;
  // 顯示標題：「類科 · 老師」或退回書本標題
  const displayTitle = subjectName
    ? (teacherLabel ? `${subjectName} · ${teacherLabel}` : subjectName)
    : null;

  const { data: book, isLoading: bookLoading } = trpc.tutorPublic.getBookDetail.useQuery(
    { bookId: bookIdNum },
    { enabled: !!bookIdNum && !!user, retry: false }
  );

  const utils = trpc.useUtils();

  const askMutation = trpc.tutorChat.ask.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        createdAt: Date.now(),
        followUpQuestions: (data as any).followUpQuestions ?? [],
      }]);
      setIsAsking(false);
      utils.tutorChat.getSessions.invalidate();
    },
    onError: (error) => {
      toast.error("提問失敗：" + error.message);
      setIsAsking(false);
    },
  });

  // Streaming 提問：SSE 收集完整回答後一次呼現示（不邊生成邊跳動）
  const handleStreamAsk = async (q: string, images: string[], mode: "brief" | "detail" = "detail") => {
    const history = messages.filter((m) => m.content !== "__loading__").slice(-6).map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch("/api/stream/tutor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: bookIdNum,
          question: q,
          sessionId,
          subjectId: subjectIdFromUrl,
          imageUrls: images.length > 0 ? images : undefined,
          history,
          chapterId: selectedChapterId,
          isFollowUp: false,
          answerMode: mode,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("伺服器錯誤");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let streamSources: any[] = [];
      let newSessionId: number | undefined;

      // 收集完整回答，不即時更新畫面
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) {
              toast.error("提問失敗：" + parsed.error);
              setIsAsking(false);
              return;
            }
            if (parsed.type === "session") {
              newSessionId = parsed.sessionId;
              setSessionId(parsed.sessionId);
            } else if (parsed.type === "sources") {
              streamSources = parsed.sources;
            } else if (parsed.type === "chunk") {
              fullText += parsed.text;
            } else if (parsed.type === "done") {
              // 全部收完後一次呼現示
              // 若是 detail 模式的回答，標記 isDetailDone=true 讓「詳細解析」按鈕不再出現
              setMessages((prev) => [...prev, {
                role: "assistant",
                content: fullText,
                sources: streamSources,
                createdAt: Date.now(),
                isStreaming: false,
                followUpQuestions: parsed.followUpQuestions ?? [],
                isDetailDone: mode === "detail",
              }]);
              utils.tutorChat.getSessions.invalidate();
            }
          } catch { /* 解析失敗跳過 */ }
        }
      }
    } catch (err: any) {
      toast.error("提問失敗：" + (err?.message || "未知錯誤"));
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 貼上圖片（Ctrl+V）
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // 只有在「智能問答」 Tab（chat）才觸發截圖編輯器
      if (activeTabRef.current !== "chat") return;
      // 如果貼上目標是筆記 Textarea（data-note-paste 屬性），跳過全域處理
      const target = e.target as HTMLElement;
      if (target && (target.getAttribute('data-note-paste') === 'true' || target.closest('[data-note-paste="true"]'))) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            readFileAsBase64(file, (base64) => openEditor(base64, -1));
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [pendingImages]);

  const readFileAsBase64 = (file: File, cb: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) cb(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const openEditor = (src: string, index: number) => {
    setEditingImageSrc(src);
    setEditingImageIndex(index);
  };

  // 圖片編輯完成 → 開啟 OCR 確認（新圖片才 OCR，替換現有圖片直接更新）
  const handleEditorConfirm = (editedBase64: string) => {
    setEditingImageSrc(null);
    setEditingImageIndex(-1);
    if (editingImageIndex === -1) {
      // 新圖片：先 OCR 確認
      if (pendingImages.length >= 2) {
        toast.error("最多只能附上 2 張圖片");
        return;
      }
      setOcrPendingImage(editedBase64);
    } else {
      // 替換現有圖片：直接更新
      setPendingImages((prev) => {
        const next = [...prev];
        next[editingImageIndex] = editedBase64;
        return next;
      });
    }
  };

  // OCR 確認完成 → 加入圖片並填入問題文字
  const handleOcrConfirm = (text: string) => {
    if (ocrPendingImage) {
      setPendingImages((prev) => [...prev, ocrPendingImage]);
      setOcrPendingImage(null);
    }
    setInput((prev) => prev ? prev + "\n" + text : text);
    textareaRef.current?.focus();
  };

  const handleEditorCancel = () => {
    setEditingImageSrc(null);
    setEditingImageIndex(-1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (pendingImages.length >= 2) { toast.error("最多只能附上 2 張圖片"); return; }
    readFileAsBase64(files[0], (base64) => openEditor(base64, -1));
    e.target.value = "";
  };

  const removeImage = (index: number) => setPendingImages((prev) => prev.filter((_, i) => i !== index));

  const handleSend = () => {
    const q = input.trim();
    if ((!q && pendingImages.length === 0) || isAsking) return;
    const displayContent = q || "（圖片提問）";
    const imgs = [...pendingImages];
    setMessages((prev) => [...prev, { role: "user", content: displayContent, imageUrls: imgs.length > 0 ? imgs : undefined, createdAt: Date.now() }]);
    setInput("");
    setPendingImages([]);
    setIsAsking(true);
    handleStreamAsk(displayContent, imgs, answerMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectSession = async (sid: number, sessionBookId?: number) => {
    setSessionId(sid);
    setChapterSessionId(sid);
    setMessages([]);
    setActiveTab("chat");
    setLoadingHistory(true);
    try {
      const history = await utils.tutorChat.getHistory.fetch({ sessionId: sid });
      if (history && history.length > 0) {
        const converted: Message[] = history.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources ? (() => { try { return JSON.parse(m.sources); } catch { return []; } })() : [],
          createdAt: typeof m.createdAt === 'number' ? m.createdAt : new Date(m.createdAt).getTime(),
        }));
        setMessages(converted);
        setChapterChatMessages(converted);
        const latestSource = [...converted]
          .reverse()
          .flatMap(msg => msg.sources ?? [])
          .find(src => (typeof src.bookId === "number" && src.bookId > 0) || (typeof src.page === "number" && src.page > 0));
        setChapterRestoreState({
          sessionId: sid,
          bookId: (typeof latestSource?.bookId === "number" && latestSource.bookId > 0)
            ? latestSource.bookId
            : sessionBookId,
          page: (typeof latestSource?.page === "number" && latestSource.page > 0)
            ? latestSource.page
            : undefined,
        });
      } else {
        setChapterChatMessages([]);
        setChapterRestoreState({
          sessionId: sid,
          bookId: sessionBookId,
        });
        toast.info("此對話尚無訊息記錄，繼續提問即可延續");
      }
    } catch {
      toast.error("載入對話失敗，請重試");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(undefined);
    setMessages([]);
    setPendingImages([]);
    setInput("");
    setSelectedChapterId(undefined);
    setSelectedChapterTitle(undefined);
    setChapterSessionId(undefined);
    setChapterChatMessages([]);
    setChapterRestoreState(null);
  };

  const handleAskAboutChapter = (chapterId: number, chapterTitle: string) => {
    setSelectedChapterId(chapterId);
    setSelectedChapterTitle(chapterTitle);
    setActiveTab("chat");
    setInput("");
    toast.info(`切換為「${chapterTitle}」章節提問模式`);
  };

  // 推薦問題：從 QA 動態生成
  const sessionKey = typeof window !== 'undefined' ? `shown_q_${bookIdNum}` : '';
  const getShownQuestions = React.useCallback(() => { try { return JSON.parse(sessionStorage.getItem(sessionKey) ?? '[]'); } catch { return []; } }, [sessionKey]);
  const addShownQuestions = React.useCallback((qs: string[]) => { try { sessionStorage.setItem(sessionKey, JSON.stringify([...getShownQuestions(), ...qs].slice(-20))); } catch {} }, [sessionKey, getShownQuestions]);
  // useMemo 穩定陣列參考，避免每次 render 產生新陣列導致 tRPC query 重新 fetch
  const excludeQuestions = React.useMemo(() => getShownQuestions(), [bookIdNum]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: dynamicSuggestions,
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions,
  } = trpc.tutorPublic.getDynamicSuggestions.useQuery(
    { bookIds: bookIdNum ? [bookIdNum] : [], excludeQuestions },
    {
      enabled: !!bookIdNum && !authLoading && !!user,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      retry: 1,
    }
  );

  // 記錄已顯示的推薦問題
  React.useEffect(() => {
    if (dynamicSuggestions && dynamicSuggestions.length > 0) {
      addShownQuestions(dynamicSuggestions.map((s: any) => s.question ?? s));
    }
  }, [dynamicSuggestions]);

  // null = 載入中顯示 skeleton
  const quickSuggestions = (authLoading || suggestionsLoading) ? null : (dynamicSuggestions ?? []);

  // 若有 displayTitle（從 URL 來的類科+老師名稱），不需等待書本載入
  if (bookLoading && !displayTitle) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* 圖片編輯器 Modal */}
      {editingImageSrc && (
        <ImageEditorModal src={editingImageSrc} onConfirm={handleEditorConfirm} onCancel={handleEditorCancel} />
      )}

      {/* OCR 確認對話框 */}
      {ocrPendingImage && (
        <OcrConfirmDialog
          imageBase64={ocrPendingImage}
          bookTitle={book?.title ?? ""}
          onConfirm={handleOcrConfirm}
          onCancel={() => setOcrPendingImage(null)}
        />
      )}


      {/* 左側歷史抽屜 */}
      <HistorySidebar
        bookId={bookIdNum}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 隱藏 file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

      {/* 頂部導覽列 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* 歷史側欄按鈕 */}
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setSidebarOpen(true)} title="對話歷史">
            <PanelLeftOpen className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => navigate("/tutor")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {book?.coverImageUrl ? (
            <img src={book.coverImageUrl} alt={book.title ?? ""} className="w-8 h-10 object-cover rounded flex-shrink-0" />
          ) : (
            <div className="w-8 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm truncate">{displayTitle ?? book?.title ?? "AI 助教"}</h1>
            {!displayTitle && book?.author && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
          </div>
          {book?.examType && <Badge variant="secondary" className="flex-shrink-0 text-xs">{book.examType}</Badge>}
          {/* 點數顯示 */}
          <CreditsDisplay />
        </div>
      </div>

      {/* Tab 切換列 */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {([
              { key: "chat", label: "智能問答", icon: MessageSquare },
              { key: "classroom", label: "智能課堂", icon: ClipboardList },
              { key: "lessonpoints", label: "智能知識", icon: BookOpen },
              { key: "chapters", label: "智能書本", icon: BookMarked },
              { key: "lecture", label: "智能函授", icon: GraduationCap },
              { key: "practice", label: "智能練題", icon: ListChecks },
              { key: "notes", label: "智能筆記", icon: Bookmark },
              { key: "calendar", label: "智能考情", icon: Calendar },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 訊息區域 */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ display: activeTab === "chat" ? "flex" : "none", flexDirection: "column", fontSize: `${chatFontSize}px` }}>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">載入對話記錄中...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{displayTitle ?? book?.title ?? "AI 助教"}</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                精準搜尋書本講義回答問題
              </p>
              {/* 推薦問題區 */}
              <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">建議問題</span>
                {quickSuggestions !== null && quickSuggestions.length > 0 && (
                  <button
                    onClick={() => {
                      addShownQuestions(quickSuggestions.map((s: any) => s.question ?? s));
                      refetchSuggestions();
                    }}
                    disabled={suggestionsLoading}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${suggestionsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    換一批
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(quickSuggestions === null || suggestionsLoading) ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse"
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      <div className="h-2.5 bg-muted-foreground/10 rounded-full m-4 w-3/4" />
                      <div className="h-2 bg-muted-foreground/10 rounded-full mx-4 w-1/2" />
                    </div>
                  ))
                ) : quickSuggestions.length > 0 ? (
                  quickSuggestions.map((s: any, i: number) => (
                    <button
                      key={i}
                      className="text-left px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
                      style={{ animation: `fadeIn 0.3s ease ${i * 80}ms both` }}
                      onClick={() => {
                        const q = typeof s === 'string' ? s : (s.question ?? s);
                        if (isAsking) return;
                        setMessages((prev) => [...prev, { role: 'user', content: q, createdAt: Date.now() }]);
                        setInput('');
                        setIsAsking(true);
                        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        handleStreamAsk(q, [], answerMode);
                      }}
                    >
                      {typeof s === 'string' ? s : (s.question ?? s)}
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                    直接輸入問題開始學習
                  </div>
                )}
              </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                bookId={bookIdNum || undefined}
                question={msg.role === "assistant" && i > 0 ? messages[i - 1]?.content : undefined}
                subjectName={subjectName || undefined}
                onDetailAsk={(q) => {
                  if (isAsking) return;
                  setMessages((prev) => [...prev, { role: "user", content: q, createdAt: Date.now() }]);
                  setInput("");
                  setIsAsking(true);
                  setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                  handleStreamAsk(q, [], "detail");
                }}
                onMarkDetailDone={() => {
                  setMessages((prev) => prev.map((m, idx) => idx === i ? { ...m, isDetailDone: true } : m));
                }}
                onFollowUp={(q) => {
                  if (isAsking) return;
                  setMessages((prev) => [...prev, { role: 'user', content: q, createdAt: Date.now() }]);
                  setInput('');
                  setIsAsking(true);
                  setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  handleStreamAsk(q, [], answerMode);
                }}
              />
            ))
          )}

          {isAsking && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-base" style={{ animation: 'thinkingBounce 1.2s ease-in-out infinite', display: 'inline-block' }}>📖</span>
                  <span className="flex gap-1 items-center">
                    <span>正在搜尋講義內容</span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1 h-1 rounded-full bg-primary/60 inline-block" style={{ animation: `thinkingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 練習題 Tab */}
      {activeTab === "practice" && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <PracticeTab bookId={bookIdNum} subjectName={subjectName || undefined} bookTitle={book?.title || undefined} />
        </div>
      )}

      {/* 知識點 Tab */}
      {activeTab === "lessonpoints" && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <LessonPointsTab bookId={bookIdNum} subjectName={subjectName || undefined} onAskAI={(q) => { setInput(q); setActiveTab('chat'); setTimeout(() => textareaRef.current?.focus(), 100); }} />
        </div>
      )}

      {/* 章節瀏覽 Tab */}
      {activeTab === "chapters" && (
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <ChaptersTab bookId={bookIdNum} pdfUrl={book?.pdfUrl} onAskAboutChapter={handleAskAboutChapter} fontSize={chatFontSize} externalMessages={chapterChatMessages} onMessagesChange={setChapterChatMessages} externalSessionId={chapterSessionId} onSessionIdChange={setChapterSessionId} subjectId={subjectIdFromUrl} restoreState={chapterRestoreState} />
        </div>
      )}

      {/* AI 課堂 Tab */}
      {activeTab === "classroom" && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <AIClassroomFeature bookId={bookIdNum} subjectId={subjectIdFromUrl} />
        </div>
      )}

      {/* 智能函授 Tab */}
      {activeTab === "lecture" && (
        <div className="flex-1 overflow-hidden min-h-0">
          <LectureCourseTab subjectId={subjectIdFromUrl} jumpTo={lectureJumpTo} onJumpConsumed={() => setLectureJumpTo(null)} />
        </div>
      )}

      {/* 智能考情 Tab */}
      {activeTab === "calendar" && (
        <div className="flex-1 overflow-hidden min-h-0">
          <CalendarTab bookId={bookIdNum} subjectId={subjectIdFromUrl} subjectName={subjectName || undefined} />
        </div>
      )}

      {/* 智能筆記 Tab */}
      {activeTab === "notes" && (
        <div className="flex-1 overflow-hidden min-h-0">
          <TutorNotesFeature bookId={bookIdNum} subjectId={subjectIdFromUrl} subjectName={subjectName || undefined} onSwitchToLecture={(unitId, timeSec) => { setLectureJumpTo({ unitId, timeSec }); setActiveTab('lecture'); }} />
        </div>
      )}

      {/* 輸入區域（僅 chat tab 顯示） */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border" style={{ display: activeTab === "chat" ? "block" : "none" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          {/* 章節限制提示 */}
          {selectedChapterTitle && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-xs">
              <BookMarked className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-primary font-medium flex-1 truncate">限制範圍：{selectedChapterTitle}</span>
              <button
                className="text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => { setSelectedChapterId(undefined); setSelectedChapterTitle(undefined); }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {pendingImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img}
                    alt={`圖片 ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openEditor(img, i)}
                  />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(i)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0.5 left-0 right-0 text-center text-white text-[9px] opacity-0 group-hover:opacity-100 bg-black/50 rounded-b-lg py-0.5">
                    點擊編輯
                  </div>
                </div>
              ))}
              {pendingImages.length < 2 && (
                <div className="text-xs text-muted-foreground self-center">還可加 {2 - pendingImages.length} 張</div>
              )}
            </div>
          )}

          {/* 簡答 / 詳解切換 */}
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs text-muted-foreground mr-1">回答模式：</span>
            <button
              onClick={() => setAnswerMode("brief")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                answerMode === "brief"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              ⚡ 簡答（快）
            </button>
            <button
              onClick={() => setAnswerMode("detail")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                answerMode === "detail"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              📚 詳解（完整）
            </button>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-11 w-9 rounded-xl text-muted-foreground hover:text-foreground" title="拍照" disabled={pendingImages.length >= 2} onClick={() => cameraInputRef.current?.click()}>
                <Camera className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-9 rounded-xl text-muted-foreground hover:text-foreground" title="上傳圖片" disabled={pendingImages.length >= 2} onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-11 w-9 rounded-xl text-muted-foreground hover:text-foreground" title="貼上圖片（Ctrl+V）" disabled={pendingImages.length >= 2}
                onClick={async () => {
                  try {
                    const items = await navigator.clipboard.read();
                    for (const item of items) {
                      for (const type of item.types) {
                        if (type.startsWith("image/")) {
                          const blob = await item.getType(type);
                          readFileAsBase64(new File([blob], "pasted.png", { type }), (base64) => openEditor(base64, -1));
                          return;
                        }
                      }
                    }
                    toast.info("剪貼簿中沒有圖片，請直接按 Ctrl+V 貼上");
                  } catch { toast.info("請直接按 Ctrl+V 貼上圖片"); }
                }}
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>

            <Textarea
              ref={textareaRef}
              className="flex-1 min-h-[44px] max-h-[200px] resize-none rounded-xl text-sm"
              placeholder={pendingImages.length > 0 ? "描述圖片中的問題，或直接送出讓 AI 分析..." : "輸入問題，或拍照上傳題目（Enter 送出，Shift+Enter 換行）"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <Button
              size="icon" className="flex-shrink-0 h-11 w-11 rounded-xl"
              disabled={(!input.trim() && pendingImages.length === 0) || isAsking}
              onClick={handleSend}
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">AI 回答基於書本講義內容，僅供學習參考</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// LectureCourseTab：智能函授（內嵌版，使用影音課程）
// =====================================================
function LectureCourseTab({ subjectId, jumpTo, onJumpConsumed }: { subjectId?: number; jumpTo?: { unitId: number; timeSec: number } | null; onJumpConsumed?: () => void }) {
  // 將 jumpTo 傳給 VideoCourseEmbedded，跳轉完成後清除
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <VideoCourseEmbedded subjectId={subjectId} jumpTo={jumpTo} onJumpConsumed={onJumpConsumed} />
    </div>
  );
}
