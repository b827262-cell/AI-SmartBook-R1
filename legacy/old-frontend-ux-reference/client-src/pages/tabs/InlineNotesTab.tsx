import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  ArrowLeft, ArrowRight, Send, Loader2, BookOpen, FileText, User, Bot,
  Camera, ImagePlus, X, Clipboard, PanelLeftOpen, PanelLeftClose,
  Search, FolderPlus, Folder, FolderOpen, Tag, Plus, Trash2,
  Pencil, Check, ChevronRight, MessageSquare, Scan, BookMarked,
  ClipboardList, ListChecks, ChevronDown, ChevronUp, BookmarkPlus, Bookmark,
  ExternalLink, CheckSquare, Square, Eraser, ImageIcon,
  NotebookPen, Highlighter, AlertTriangle, Calendar, Sparkles,
  GraduationCap, PlayCircle, Lock, Unlock, ChevronLeft,
  Video, Brain, Upload, ZoomIn, ZoomOut, Zap
} from "lucide-react";

export default function InlineNotesTab({ bookId: _bookId, subjectId: _subjectId, subjectName, onSwitchToLecture, initialShowVideoQA }: { bookId: number; subjectId?: number; subjectName?: string; onSwitchToLecture?: (unitId: number, timeSec: number) => void; initialShowVideoQA?: boolean }) {
  // ── 型別 ──
  type MarkType = "highlight" | "color" | "underline" | "bold" | "annotation";
  interface NoteHighlight {
    id: string; start: number; end: number; color: string;
    markType?: MarkType; bold?: boolean; annotation?: string; text: string;
  }
  const HIGHLIGHT_COLORS_NOTE = [
    { label: "黃色", value: "#fef08a", text: "#713f12" },
    { label: "綠色", value: "#bbf7d0", text: "#14532d" },
    { label: "藍色", value: "#bfdbfe", text: "#1e3a8a" },
    { label: "粉色", value: "#fbcfe8", text: "#831843" },
    { label: "橘色", value: "#fed7aa", text: "#7c2d12" },
  ];
  const TEXT_COLORS_NOTE = [
    { label: "紅色", value: "#dc2626" }, { label: "藍色", value: "#2563eb" },
    { label: "綠色", value: "#16a34a" }, { label: "橘色", value: "#ea580c" }, { label: "紫色", value: "#9333ea" },
  ];

  // ── State ──
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(subjectName || null);
  const [activeFolder, setActiveFolder] = useState<string | null | undefined>(undefined);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [highlights, setHighlights] = useState<NoteHighlight[]>([]);
  const highlightSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [noteImages, setNoteImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiHistory, setAiHistory] = useState<Array<{ role: "user" | "ai"; content: string }>>([])
  const aiBottomRef = useRef<HTMLDivElement>(null);
  // OCR 辨識相關
  const [ocrResult, setOcrResult] = useState<{ text: string; imageBase64: string } | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  // 函授收藏
  const [showVideoSavedQA, setShowVideoSavedQA] = useState(initialShowVideoQA ?? true);
  // AI 回覆內容收合
  const [aiContentCollapsed, setAiContentCollapsed] = useState(false);

  const utils = trpc.useUtils();

  // ── Queries ──
  const bookId = _bookId; // 當前書本 ID，用於篩選科目和資料夾
  const subjectId = _subjectId; // 函授類科 ID，用於篩選函授收藏
  const { data: categories = [] } = trpc.savedNotes.getCategories.useQuery(
    bookId > 0 ? { bookId } : undefined
  );
  const videoQAInput = useMemo(() => subjectId ? { subjectId } : undefined, [subjectId]);
  const { data: videoSavedQAList = [], isLoading: videoQALoading, refetch: refetchVideoQA } = trpc.videoCourseStudent.listSavedQA.useQuery(
    videoQAInput ?? {} as { subjectId?: number },
    { enabled: !!subjectId }
  );
  const deleteVideoQAMutation = trpc.videoCourseStudent.deleteSavedQA.useMutation({
    onSuccess: () => { toast.success('已刪除'); utils.videoCourseStudent.listSavedQA.invalidate(); },
    onError: (e) => toast.error('刪除失敗：' + e.message),
  });
  // 函授收藏互動功能 state
  const [expandedQAIds, setExpandedQAIds] = useState<Set<number>>(new Set()); // 展開的收藏 IDs（支援多則同時展開）
  const [qaSearchQuery, setQaSearchQuery] = useState(''); // 搜尋關鍵字
  // lectureJumpTo 已移到父元件 TutorChat，透過 onSwitchToLecture prop 觸發
  const [qaManageMode, setQaManageMode] = useState(false); // 批次管理模式
  const [selectedQAIds, setSelectedQAIds] = useState<Set<number>>(new Set()); // 已勾選的 IDs
  const batchDeleteVideoQAMutation = trpc.videoCourseStudent.deleteSavedQA.useMutation({
    onSuccess: () => { toast.success('已刪除選取的收藏'); utils.videoCourseStudent.listSavedQA.invalidate(); setSelectedQAIds(new Set()); },
    onError: (e) => toast.error('刪除失敗：' + e.message),
  });
  const [qaHighlights, setQaHighlights] = useState<Record<number, NoteHighlight[]>>({}); // 螢光筆 key=qaId
  const [qaNotes, setQaNotes] = useState<Record<number, string>>({}); // 補充文字 key=qaId
  const [qaFollowUps, setQaFollowUps] = useState<Record<number, Array<{question: string; answer: string; screenshotUrl?: string; createdAt?: string}>>>({}); // 追問記錄
  const [qaFollowInput, setQaFollowInput] = useState<Record<number, string>>({}); // 追問輸入框
  const [qaNotesEditing, setQaNotesEditing] = useState<Record<number, boolean>>({}); // 補充文字是否編輯中
  const [qaFollowLoading, setQaFollowLoading] = useState<Record<number, boolean>>({}); // 追問載入中
  const updateSavedQAMutation = trpc.videoCourseStudent.updateSavedQA.useMutation({
    onSuccess: () => utils.videoCourseStudent.listSavedQA.invalidate(),
    onError: (e) => toast.error('儲存失敗：' + e.message),
  });
  const followUpSavedQAMutation = trpc.videoCourseStudent.followUpSavedQA.useMutation({
    onError: (e) => toast.error('追問失敗：' + e.message),
  // dummy to avoid lint
  });
  // 初始化函授收藏的螢光筆和補充資料（用 useEffect 避免 render 期間呼叫 setState）
  useEffect(() => {
    if (!videoSavedQAList || (videoSavedQAList as any[]).length === 0) return;
    // 預設折疊（不自動展開），使用者可手動點擊展開每則收藏
    setQaHighlights(prev => {
      const next = { ...prev };
      (videoSavedQAList as any[]).forEach((qa: any) => {
        if (!(qa.id in next)) next[qa.id] = qa.highlights ? JSON.parse(qa.highlights) : [];
      });
      return next;
    });
    setQaNotes(prev => {
      const next = { ...prev };
      (videoSavedQAList as any[]).forEach((qa: any) => {
        if (!(qa.id in next)) next[qa.id] = qa.notes || '';
      });
      return next;
    });
    setQaFollowUps(prev => {
      const next = { ...prev };
      (videoSavedQAList as any[]).forEach((qa: any) => {
        if (!(qa.id in next)) next[qa.id] = qa.followUpQa ? JSON.parse(qa.followUpQa) : [];
      });
      return next;
    });
  }, [videoSavedQAList]);
  const handleQaFollowUp = async (qaId: number) => {
    const question = qaFollowInput[qaId]?.trim();
    if (!question) return;
    setQaFollowLoading(prev => ({ ...prev, [qaId]: true }));
    try {
      const result = await followUpSavedQAMutation.mutateAsync({ id: qaId, question });
      const newFollowUps = result.followUpQa ? JSON.parse(result.followUpQa) : [];
      setQaFollowUps(prev => ({ ...prev, [qaId]: newFollowUps }));
      setQaFollowInput(prev => ({ ...prev, [qaId]: '' }));
    } finally {
      setQaFollowLoading(prev => ({ ...prev, [qaId]: false }));
    }
  };
  const handleQaHighlight = (qaId: number, h: NoteHighlight) => {
    const newHighlights = [...(qaHighlights[qaId] || []), h];
    setQaHighlights(prev => ({ ...prev, [qaId]: newHighlights }));
    updateSavedQAMutation.mutate({ id: qaId, highlights: JSON.stringify(newHighlights) });
  };
  const handleQaNoteSave = (qaId: number) => {
    updateSavedQAMutation.mutate({ id: qaId, notes: qaNotes[qaId] || '' });
    setQaNotesEditing(prev => ({ ...prev, [qaId]: false }));
    toast.success('補充文字已儲存');
  };
  const uploadQAImageMutation = trpc.videoCourseStudent.uploadQAImage.useMutation({
    onError: (e) => toast.error('圖片上傳失敗：' + e.message),
  });
  const handleQaImageUpload = async (qaId: number, file: File) => {
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadQAImageMutation.mutateAsync({ filename: file.name, contentType: file.type, base64Data });
      const qa = (videoSavedQAList as any[]).find((q: any) => q.id === qaId);
      const existing = qa?.extraImages ? JSON.parse(qa.extraImages) : [];
      const newImages = [...existing, result.url];
      updateSavedQAMutation.mutate({ id: qaId, extraImages: JSON.stringify(newImages) });
      toast.success('圖片已上傳');
    } catch (e) {
      toast.error('圖片上傳失敗');
    }
  };
  const { data: folderRows = [] } = trpc.savedNotes.getFolders.useQuery(
    bookId > 0 ? { bookId } : undefined
  );
  const { data: totalCountData } = trpc.savedNotes.totalCount.useQuery(
    bookId > 0 ? { bookId } : undefined
  );
  // 有 folderName 時不傳 subjectName，因為智能課堂等資料夾的筆記 subjectName 是章節名稱而非科目名稱
  const { data: notes = [], isLoading } = trpc.savedNotes.list.useQuery(
    { keyword: keyword || undefined, subjectName: (activeFolder === undefined || activeFolder === null) ? (activeCategory || undefined) : undefined, folderName: activeFolder, pageSize: 50, bookId: bookId > 0 ? bookId : undefined }
  );
  const { data: selectedNote, isLoading: noteLoading } = trpc.savedNotes.get.useQuery(
    { id: selectedId! }, { enabled: !!selectedId }
  );

  useEffect(() => {
    if (selectedNote?.highlights) {
      try { setHighlights(JSON.parse(selectedNote.highlights)); } catch { setHighlights([]); }
    } else { setHighlights([]); }
    if (selectedNote?.noteImages) {
      try { setNoteImages(JSON.parse(selectedNote.noteImages)); } catch { setNoteImages([]); }
    } else { setNoteImages([]); }
  }, [selectedNote?.id]);

  // ── Mutations ──
  const updateMutation = trpc.savedNotes.update.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate(); utils.savedNotes.get.invalidate({ id: selectedId! });
      utils.savedNotes.getFolders.invalidate(); utils.savedNotes.getCategories.invalidate();
      setEditingTitle(false); setEditingNote(false);
    },
  });
  const deleteMutation = trpc.savedNotes.delete.useMutation({
    onSuccess: () => { utils.savedNotes.list.invalidate(); utils.savedNotes.getCategories.invalidate(); utils.savedNotes.totalCount.invalidate(); setSelectedId(null); toast.success("已刪除"); },
  });
  const batchDeleteMutation = trpc.savedNotes.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.savedNotes.list.invalidate(); utils.savedNotes.getCategories.invalidate(); utils.savedNotes.totalCount.invalidate();
      setSelectedIds(new Set()); setSelectMode(false);
      if (selectedIds.has(selectedId!)) setSelectedId(null);
      toast.success(`已刪除 ${data.count} 則筆記`);
    },
  });
  const deleteAllMutation = trpc.savedNotes.deleteAll.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate(); utils.savedNotes.getCategories.invalidate(); utils.savedNotes.totalCount.invalidate();
      setSelectedId(null); setSelectedIds(new Set()); setSelectMode(false); toast.success("已清空");
    },
  });
  const deleteFolderMutation = trpc.savedNotes.deleteFolder.useMutation({
    onSuccess: () => {
      utils.savedNotes.list.invalidate(); utils.savedNotes.getFolders.invalidate(); utils.savedNotes.getCategories.invalidate(); utils.savedNotes.totalCount.invalidate();
      if (activeFolder !== null) setActiveFolder(null); toast.success("資料夾已刪除，筆記已移回未分類");
    },
  });
  const createFolderMutation = trpc.savedNotes.createFolder.useMutation({
    onSuccess: (_data, variables) => {
      utils.savedNotes.getFolders.invalidate(); setActiveFolder(variables.folderName);
      setNewFolderName(""); setShowNewFolderInput(false); toast.success(`資料夾「${variables.folderName}」已建立`);
    },
    onError: () => toast.error("資料夾建立失敗"),
  });
  const renameFolderMutation = trpc.savedNotes.renameFolder.useMutation({
    onSuccess: (_data, variables) => {
      utils.savedNotes.getFolders.invalidate(); utils.savedNotes.list.invalidate(); utils.savedNotes.getCategories.invalidate();
      if (activeFolder === variables.oldName) setActiveFolder(variables.newName);
      setRenamingFolder(null); setRenameInput(""); toast.success(`資料夾已更名為「${variables.newName}」`);
    },
    onError: () => toast.error("更名失敗"),
  });
  const uploadNoteImageMutation = trpc.savedNotes.uploadNoteImage.useMutation({
    onSuccess: (data) => { setNoteImages(data.images); setUploadingImage(false); utils.savedNotes.get.invalidate({ id: selectedId! }); toast.success("截圖已儲存"); },
    onError: () => { setUploadingImage(false); toast.error("截圖上傳失敗"); },
  });
  const noteOcrMutation = trpc.tutorChat.ocrImage.useMutation({
    onSuccess: (data) => { setIsOcrLoading(false); if (data.text) setOcrResult(prev => prev ? { ...prev, text: data.text } : null); },
    onError: () => { setIsOcrLoading(false); },
  });
  const askAiMutation = trpc.savedNotes.askAI.useMutation({
    onSuccess: (data) => { setAiHistory(prev => [...prev, { role: "ai", content: data.answer }]); setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); },
    onError: (err) => toast.error("失敗：" + err.message),
  });

  // ── Handlers ──
  const handleAddHighlight = useCallback((h: NoteHighlight) => {
    setHighlights((prev) => {
      const next = [...prev, h];
      if (highlightSaveTimer.current) clearTimeout(highlightSaveTimer.current);
      highlightSaveTimer.current = setTimeout(() => {
        if (selectedId) updateMutation.mutate({ id: selectedId, highlights: JSON.stringify(next) });
      }, 800);
      return next;
    });
    toast.success("標記已儲存", { duration: 1200 });
  }, [selectedId]);

  const removeHighlight = (id: string) => {
    setHighlights((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (selectedId) updateMutation.mutate({ id: selectedId, highlights: JSON.stringify(next) });
      return next;
    });
  };

  const uploadImageBase64 = (base64: string, mimeType: string, triggerOcr = false) => {
    if (!selectedId) return;
    setUploadingImage(true);
    uploadNoteImageMutation.mutate({ noteId: selectedId, imageBase64: base64, mimeType });
    if (triggerOcr) {
      setIsOcrLoading(true);
      setOcrResult({ text: "", imageBase64: base64 });
      noteOcrMutation.mutate({ imageBase64: base64, bookTitle: "" });
    }
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到外層全域監聽器
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((i) => i.type.startsWith("image/"));
    if (!imgItem) return;
    e.preventDefault();
    const blob = imgItem.getAsFile();
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = () => uploadImageBase64(reader.result as string, imgItem.type, true);
    reader.readAsDataURL(blob);
    toast.info("截圖上傳中，AI 辨識文字...");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => uploadImageBase64(reader.result as string, f.type);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const removeNoteImage = (url: string) => {
    if (!selectedId) return;
    const updated = noteImages.filter((u) => u !== url);
    setNoteImages(updated);
    updateMutation.mutate({ id: selectedId, noteImages: JSON.stringify(updated) });
  };

  const handleAskAi = () => {
    if (!aiQuestion.trim() || !selectedNote) return;
    const q = aiQuestion.trim();
    setAiHistory(prev => [...prev, { role: "user", content: q }]);
    setAiQuestion("");
    setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    askAiMutation.mutate({ noteId: selectedNote.id, question: q });
  };

  const handleSelectNote = (id: number) => { setSelectedId(id); setAiHistory([]); setEditingNote(false); setEditingTitle(false); };
  const toggleSelect = (id: number) => { setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };
  const selectAll = () => setSelectedIds(new Set(notes.map((n) => n.id)));
  const clearSelect = () => setSelectedIds(new Set());

  // ── 把 Markdown 轉成「純文字 + 行樣式」，保持字元 offset 不變 ──
  // 回傳：{ plainText: string（用於 offset 計算）, lines: { text: string; style: 'h1'|'h2'|'h3'|'bold-line'|'normal'; startOffset: number }[] }
  function parseMarkdownToLines(raw: string): { plainText: string; lines: { text: string; style: string; startOffset: number; inlineBolds: { start: number; end: number }[] }[] } {
    // 先把 \r\n 統一成 \n
    const normalized = raw.replace(/\r\n/g, '\n');
    const rawLines = normalized.split('\n');
    const lines: { text: string; style: string; startOffset: number; inlineBolds: { start: number; end: number }[] }[] = [];
    let offset = 0;
    for (const rawLine of rawLines) {
      let text = rawLine;
      let style = 'normal';
      // 標題
      if (/^###\s+/.test(text)) { text = text.replace(/^###\s+/, ''); style = 'h3'; }
      else if (/^##\s+/.test(text)) { text = text.replace(/^##\s+/, ''); style = 'h2'; }
      else if (/^#\s+/.test(text)) { text = text.replace(/^#\s+/, ''); style = 'h1'; }
      // 列表符號（保留文字，移除 * / - 前綴）
      else if (/^[\*\-]\s+/.test(text)) { text = text.replace(/^[\*\-]\s+/, '• '); style = 'list'; }
      else if (/^\d+\.\s+/.test(text)) { style = 'list'; }
      // 計算 inline bold 位置（基於去掉標題符號後的 text）
      const inlineBolds: { start: number; end: number }[] = [];
      let plainText = text;
      // 找出所有 **...** 的位置，記錄 plain offset（去掉 ** 符號後的位置）
      let searchText = text;
      let plainOffset = 0;
      let searchOffset = 0;
      while (true) {
        const startIdx = searchText.indexOf('**', searchOffset);
        if (startIdx === -1) break;
        const endIdx = searchText.indexOf('**', startIdx + 2);
        if (endIdx === -1) break;
        // 在 plainText 中，startIdx 之前有幾個 ** 對已被移除
        const boldText = searchText.slice(startIdx + 2, endIdx);
        // 計算到目前為止已移除的 ** 符號數量
        const removedBefore = (searchText.slice(0, startIdx).match(/\*\*/g) || []).length;
        const plainStart = startIdx - removedBefore * 2;
        inlineBolds.push({ start: plainStart, end: plainStart + boldText.length });
        searchOffset = endIdx + 2;
      }
      // 移除所有 ** 符號得到純文字
      plainText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      // 移除行內 code backtick
      plainText = plainText.replace(/`([^`]+)`/g, '$1');
      lines.push({ text: plainText, style, startOffset: offset, inlineBolds });
      offset += plainText.length + 1; // +1 for \n
    }
    const plainText = lines.map(l => l.text).join('\n');
    return { plainText, lines };
  }

  // ── 螢光筆子元件（inline） ──
  function NoteHighlightedContent({ content, noteHighlights, onAddH }: { content: string; noteHighlights: NoteHighlight[]; onAddH: (h: NoteHighlight) => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [toolbar, setToolbar] = useState<{ x: number; y: number; selectedText: string; startOffset: number; endOffset: number } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [annotationInput, setAnnotationInput] = useState("");
    const [showAnnotation, setShowAnnotation] = useState(false);
    const [activeAnnotation, setActiveAnnotation] = useState<NoteHighlight | null>(null);
    const [boldToggle, setBoldToggle] = useState(false);

    // 從 DOM 節點往上找到帶有 data-line-start 屬性的行容器，取得行的起始 offset
    const getLineStartOffset = (node: Node): number => {
      let el: Node | null = node;
      while (el && el !== containerRef.current) {
        if (el instanceof HTMLElement && el.dataset.lineStart !== undefined) {
          return parseInt(el.dataset.lineStart, 10);
        }
        el = el.parentNode;
      }
      return 0;
    };

    const handleMouseUp = useCallback(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) return;
      const range = sel.getRangeAt(0);
      const selText = range.toString();
      if (!selText.trim()) return;

      // 計算 start offset：找到選取起點所在的行，加上行內的字元偏移
      // 用 preRange 計算從行首到選取起點的字元數
      const startLineOffset = getLineStartOffset(range.startContainer);
      const startPreRange = range.cloneRange();
      // 找到選取起點所在的行元素
      let startLineEl: HTMLElement | null = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
      while (startLineEl && startLineEl !== containerRef.current && !startLineEl.dataset.lineStart) {
        startLineEl = startLineEl.parentElement;
      }
      let start: number;
      if (startLineEl && startLineEl.dataset.lineStart !== undefined) {
        startPreRange.selectNodeContents(startLineEl);
        startPreRange.setEnd(range.startContainer, range.startOffset);
        start = startLineOffset + startPreRange.toString().length;
      } else {
        // fallback：用整個 container 的 preRange
        const preRange = range.cloneRange();
        preRange.selectNodeContents(containerRef.current);
        preRange.setEnd(range.startContainer, range.startOffset);
        start = preRange.toString().length;
      }
      const end = start + selText.length;
      if (end <= start) return;
      const rect = range.getBoundingClientRect();
      const toolbarX = Math.min(Math.max(rect.left + rect.width / 2 - 120, 8), window.innerWidth - 260);
      const toolbarY = rect.bottom + 8;
      setToolbar({ x: toolbarX, y: toolbarY, selectedText: selText, startOffset: start, endOffset: end });
      setAnnotationInput(""); setShowAnnotation(false);
    }, []);

    const applyMark = (markType: MarkType, color: string) => {
      if (!toolbar) return;
      const h: NoteHighlight = { id: Date.now().toString(), start: toolbar.startOffset, end: toolbar.endOffset, color, markType, bold: boldToggle || undefined, text: toolbar.selectedText, annotation: annotationInput.trim() || undefined };
      onAddH(h); setToolbar(null); setBoldToggle(false); window.getSelection()?.removeAllRanges();
    };

    // 解析 Markdown，純文字用於 offset 計算
    const parsed = parseMarkdownToLines(content);
    const plainText = parsed.plainText;

    // 在純文字中渲染一段文字，套用螢光筆樣式
    const renderTextSegment = (text: string, globalStart: number, keyPrefix: string): React.JSX.Element[] => {
      if (!noteHighlights.length) return [<span key={keyPrefix}>{text}</span>];
      const sorted = [...noteHighlights].sort((a, b) => a.start - b.start);
      const segs: React.JSX.Element[] = [];
      let cursor = globalStart;
      const globalEnd = globalStart + text.length;
      sorted.forEach((h) => {
        const s = Math.max(h.start, cursor);
        const e = Math.min(h.end, globalEnd);
        if (s >= e || s >= globalEnd || e <= globalStart) return;
        if (cursor < s) segs.push(<span key={`${keyPrefix}-plain-${cursor}`}>{plainText.slice(cursor, s)}</span>);
        const mt = h.markType || "highlight";
        const co = HIGHLIGHT_COLORS_NOTE.find(c => c.value === h.color) || HIGHLIGHT_COLORS_NOTE[0];
        const ms: React.CSSProperties = { borderRadius: "2px", padding: "0 1px", cursor: h.annotation ? "pointer" : "default", fontWeight: h.bold ? "bold" : undefined, backgroundColor: "transparent", ...(mt === "highlight" ? { backgroundColor: h.color, color: co.text } : mt === "color" ? { color: h.color } : mt === "underline" ? { textDecoration: "underline", textDecorationColor: h.color, color: "inherit" } : mt === "bold" ? { fontWeight: "bold", color: "inherit" } : mt === "annotation" ? { borderBottom: "2px dotted #60a5fa", color: "inherit" } : { fontWeight: "bold", color: "inherit" }) };
        segs.push(<span key={`${keyPrefix}-h-${h.id}`} style={{ position: "relative", display: "inline" }}><mark style={ms} onClick={() => { if (!h.annotation) return; setActiveAnnotation(activeAnnotation?.id === h.id ? null : h); }}>{plainText.slice(s, e)}{h.annotation && <MessageSquare style={{ display: "inline", width: 12, height: 12, marginLeft: 2, verticalAlign: "middle", opacity: 0.7 }} />}</mark>{activeAnnotation?.id === h.id && <span style={{ position: "absolute", left: 0, top: "100%", zIndex: 50, background: "#1d4ed8", color: "#ffffff", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, maxWidth: 260, whiteSpace: "pre-wrap", boxShadow: "0 4px 16px rgba(29,78,216,0.5)", border: "2px solid #3b82f6", marginTop: 6 }}>💬 {h.annotation}</span>}</span>);
        cursor = e;
      });
      if (cursor < globalEnd) segs.push(<span key={`${keyPrefix}-tail`}>{plainText.slice(cursor, globalEnd)}</span>);
      return segs;
    };

    // 套用 inline bold 樣式到文字段
    const applyInlineBolds = (text: string, inlineBolds: { start: number; end: number }[], lineStart: number, keyPrefix: string): React.JSX.Element[] => {
      if (!inlineBolds.length) return renderTextSegment(text, lineStart, keyPrefix);
      const result: React.JSX.Element[] = [];
      let pos = 0;
      inlineBolds.forEach((b, bi) => {
        if (pos < b.start) {
          const seg = renderTextSegment(text.slice(pos, b.start), lineStart + pos, `${keyPrefix}-pre${bi}`);
          result.push(...seg);
        }
        const boldSeg = renderTextSegment(text.slice(b.start, b.end), lineStart + b.start, `${keyPrefix}-bold${bi}`);
        result.push(<strong key={`${keyPrefix}-bw${bi}`} style={{ fontWeight: 700 }}>{boldSeg}</strong>);
        pos = b.end;
      });
      if (pos < text.length) {
        const seg = renderTextSegment(text.slice(pos), lineStart + pos, `${keyPrefix}-post`);
        result.push(...seg);
      }
      return result;
    };

    const renderSegments = () => {
      return (
        <div style={{ lineHeight: 1.9 }}>
          {parsed.lines.map((line, li) => {
            const { text, style, startOffset, inlineBolds } = line;
            const children = applyInlineBolds(text, inlineBolds, startOffset, `l${li}`);
            // data-line-start 用於精確計算 offset
            if (style === 'h1') return <h2 key={li} data-line-start={startOffset} style={{ fontSize: 16, fontWeight: 700, marginTop: 14, marginBottom: 4, color: 'var(--foreground)', borderBottom: '2px solid var(--border)', paddingBottom: 4 }}>{children}</h2>;
            if (style === 'h2') return <h3 key={li} data-line-start={startOffset} style={{ fontSize: 15, fontWeight: 700, marginTop: 12, marginBottom: 3, color: 'var(--foreground)' }}>{children}</h3>;
            if (style === 'h3') return <h4 key={li} data-line-start={startOffset} style={{ fontSize: 14, fontWeight: 600, marginTop: 10, marginBottom: 2, color: 'hsl(var(--primary))' }}>{children}</h4>;
            if (style === 'list') return <div key={li} data-line-start={startOffset} style={{ paddingLeft: 12, marginBottom: 2, display: 'flex', gap: 4 }}><span style={{ flexShrink: 0, color: 'hsl(var(--primary))' }}></span><span>{children}</span></div>;
            if (!text.trim()) return <div key={li} data-line-start={startOffset} style={{ height: 8 }} />; // 空行
            return <p key={li} data-line-start={startOffset} style={{ marginBottom: 4 }}>{children}</p>;
          })}
        </div>
      );
    };

    return (
      <div style={{ position: "relative" }}>
        {toolbar && (
          <div ref={toolbarRef} style={{ position: "fixed", left: toolbar.x, top: toolbar.y, zIndex: 9999, background: "#1e293b", borderRadius: 10, padding: "8px 10px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", minWidth: 240 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginBottom: showAnnotation ? 8 : 0 }}>
              <span style={{ color: "#94a3b8", fontSize: 10, minWidth: 28 }}>螢光筆</span>
              {HIGHLIGHT_COLORS_NOTE.map((c) => (<button key={c.value} onClick={() => applyMark("highlight", c.value)} style={{ width: 18, height: 18, borderRadius: "50%", background: c.value, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0 }} title={`螢光筆—${c.label}`} />))}
              <span style={{ width: 1, height: 16, background: "#475569", margin: "0 2px" }} />
              <span style={{ color: "#94a3b8", fontSize: 10, minWidth: 28 }}>變色</span>
              {TEXT_COLORS_NOTE.map((c) => (<button key={c.value} onClick={() => applyMark("color", c.value)} style={{ width: 18, height: 18, borderRadius: "50%", background: c.value, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0 }} title={`文字變色—${c.label}`} />))}
              <span style={{ width: 1, height: 16, background: "#475569", margin: "0 2px" }} />
              <button onClick={() => applyMark("underline", "#60a5fa")} style={{ color: "#94a3b8", background: "none", border: "1px solid #475569", borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "1px 6px", textDecoration: "underline", fontWeight: 600 }} title="底線">U</button>
              <button onClick={() => { if (boldToggle) { applyMark("bold", "inherit"); } else { setBoldToggle(true); } }} style={{ color: boldToggle ? "#f8fafc" : "#94a3b8", background: boldToggle ? "#3b82f6" : "none", border: "1px solid " + (boldToggle ? "#3b82f6" : "#475569"), borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "1px 6px", fontWeight: 700 }} title={boldToggle ? "點擊套用加粗" : "加粗（點兩下套用）"}>B</button>
              <span style={{ width: 1, height: 16, background: "#475569", margin: "0 2px" }} />
              <button onClick={() => setShowAnnotation(!showAnnotation)} style={{ color: showAnnotation ? "#60a5fa" : "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }} title="加旁注"><MessageSquare size={13} /><span style={{ fontSize: 10 }}>旁注</span></button>
              <button onClick={() => setToolbar(null)} style={{ marginLeft: "auto", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button>
            </div>
            {showAnnotation && (
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={annotationInput} onChange={(e) => setAnnotationInput(e.target.value)} placeholder="輸入補充說明..." style={{ flex: 1, background: "#334155", border: "1px solid #475569", borderRadius: 6, padding: "4px 8px", color: "#f1f5f9", fontSize: 12 }} onKeyDown={(e) => { if (e.key === "Enter") applyMark("annotation", ""); if (e.key === "Escape") setToolbar(null); }} />
                <button onClick={() => applyMark("annotation", "")} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>確認</button>
              </div>
            )}
          </div>
        )}
        <div ref={containerRef} onMouseUp={handleMouseUp} onClick={(e) => { if ((e.target as HTMLElement).tagName !== "MARK") setActiveAnnotation(null); }} style={{ lineHeight: 1.8, userSelect: "text", cursor: "text" }}>
          {renderSegments()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[500px]">
      {/* ── 左側 ── */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* 頂部：批次管理 */}
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <NotebookPen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium flex-1">智能筆記</span>
          <Badge variant="secondary" className="text-xs">{totalCountData?.count ?? notes.length}</Badge>
          {!selectMode ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelectMode(true)}><CheckSquare className="w-3.5 h-3.5" /></Button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{selectedIds.size}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={selectAll}>全選</Button>
              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={selectedIds.size === 0 || batchDeleteMutation.isPending} onClick={() => { if (confirm(`確定刪除 ${selectedIds.size} 則？`)) batchDeleteMutation.mutate({ ids: Array.from(selectedIds) }); }}><Trash2 className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setSelectMode(false); clearSelect(); }}><X className="w-3.5 h-3.5" /></Button>
            </div>
          )}
        </div>
        {/* 搜尋 */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setKeyword(searchInput); }} placeholder="搜尋標題、問題..." className="pl-8 text-xs h-8" />
            {keyword && <button onClick={() => { setKeyword(""); setSearchInput(""); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
        </div>

        {/* 資料夾 */}
        <div className="px-2 py-1.5 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">資料夾</span>
          </div>
          <button onClick={() => { setActiveFolder(undefined); setShowVideoSavedQA(false); }} className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-colors ${activeFolder === undefined && !showVideoSavedQA ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}><Bookmark className="w-3 h-3" />全部<span className="ml-auto">{totalCountData?.count ?? 0}</span></button>

          {(() => {
            const SYSTEM_FOLDER_ORDER = ['智能問答', '智能課堂', '智能知識', '智能書本', '智能函授', '智能練題'];
            const allFolders = [...new Set(folderRows.filter(r => r.folderName !== null).map(r => r.folderName as string))];
            // 只顯示系統資料夾（移除自訂資料夾功能，因為無法移動筆記到自訂資料夾）
            return SYSTEM_FOLDER_ORDER.filter(f => allFolders.includes(f));
          })().map(folder => (
            <div key={folder}>
              {folder === '智能函授' ? (
                <button onClick={() => { setShowVideoSavedQA(true); setActiveFolder(undefined); setSelectedId(null); }} className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-colors ${showVideoSavedQA ? "bg-blue-500/10 text-blue-600 font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                  <Video className="w-3 h-3 flex-shrink-0" /><span className="truncate">{folder}</span><span className="ml-auto">{(videoSavedQAList as any[]).length}</span>
                </button>
              ) : (
                <button onClick={() => { setActiveFolder(folder); setShowVideoSavedQA(false); }} className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-colors ${activeFolder === folder && !showVideoSavedQA ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                  {activeFolder === folder && !showVideoSavedQA ? <FolderOpen className="w-3 h-3 flex-shrink-0" /> : <Folder className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{folder}</span>
                  <span className="ml-auto">{folderRows.filter(r => r.folderName === folder).reduce((s, r) => s + Number(r.count), 0)}</span>
                </button>
              )}
            </div>
          ))}
        </div>
        {/* 筆記列表（智能函授模式時隱藏） */}
        <div className="flex-1 overflow-y-auto" style={{ display: showVideoSavedQA ? 'none' : undefined }}>
          {isLoading ? (<div className="p-4 text-center text-sm text-muted-foreground">載入中...</div>) : notes.length === 0 ? (
            <div className="p-6 text-center">
              <Bookmark className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{keyword ? "找不到符合的筆記" : "還沒有收藏的筆記"}</p>
            </div>
          ) : notes.map((note) => (
            <div key={note.id} className={`flex items-start gap-2 px-2.5 py-2.5 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${selectedId === note.id && !selectMode ? "bg-primary/5 border-l-2 border-l-primary" : ""} ${selectedIds.has(note.id) ? "bg-blue-500/10" : ""}`} onClick={() => { if (selectMode) toggleSelect(note.id); else handleSelectNote(note.id); }}>
              {selectMode && <div className="mt-0.5 flex-shrink-0">{selectedIds.has(note.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}</div>}
              <Bookmark className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${selectedId === note.id ? "text-primary fill-primary/20" : "text-amber-500"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{note.title || "（無標題）"}</p>
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {note.subjectName && <span className="text-xs text-primary/70">{note.subjectName}</span>}
                  {(note as { folderName?: string | null }).folderName && <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400"><Folder className="w-2.5 h-2.5" />{(note as { folderName?: string | null }).folderName}</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Calendar className="w-2.5 h-2.5 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground/60">{new Date(note.createdAt + "Z").toLocaleString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
        {/* 底部：一鍵全刪 */}
        {selectMode && notes.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button size="sm" variant="outline" className="w-full text-xs text-destructive border-destructive/40 h-7" disabled={deleteAllMutation.isPending} onClick={() => { if (confirm(`確定要刪除${activeCategory ? `「${activeCategory}」分類下的` : "全部"}${notes.length} 則筆記嗎？`)) deleteAllMutation.mutate({ subjectName: activeCategory || undefined }); }}><AlertTriangle className="w-3 h-3 mr-1" />一鍵全刪</Button>
          </div>
        )}
      </div>

      {/* ── 右側詳情 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 函授收藏模式 */}
        {showVideoSavedQA ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-sm">函授收藏</span>
                <span className="text-xs text-muted-foreground">({(videoSavedQAList as any[]).length})</span>
                <div className="flex-1" />
                <Button variant={qaManageMode ? 'default' : 'ghost'} size="sm" className="h-6 text-xs px-2" onClick={() => { setQaManageMode(m => !m); setSelectedQAIds(new Set()); }}>
                  {qaManageMode ? '完成' : '管理'}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={qaSearchQuery} onChange={e => setQaSearchQuery(e.target.value)} placeholder="搜尋問題、回答、單元..." className="h-7 pl-7 text-xs" />
              </div>
            </div>
            {videoQALoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">載入中...</div>
            ) : (videoSavedQAList as any[]).length === 0 ? (
              <div className="p-8 text-center">
                <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">尚未收藏任何函授問答</p>
                <p className="text-xs text-muted-foreground mt-1">在影片播放時截圖發問即可收藏</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
              {qaManageMode && (
                <div className="p-2 border-b border-border flex items-center gap-2 bg-muted/30">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => {
                    const filtered = (videoSavedQAList as any[]).filter((qa: any) => !qaSearchQuery || qa.questionText?.includes(qaSearchQuery) || qa.aiAnswer?.includes(qaSearchQuery) || qa.unitTitle?.includes(qaSearchQuery));
                    if (selectedQAIds.size === filtered.length) {
                      setSelectedQAIds(new Set());
                    } else {
                      setSelectedQAIds(new Set(filtered.map((qa: any) => qa.id)));
                    }
                  }}>
                    {selectedQAIds.size > 0 ? '取消全選' : '全選'}
                  </Button>
                  <span className="text-xs text-muted-foreground flex-1">{selectedQAIds.size > 0 ? `已選 ${selectedQAIds.size} 則` : '請勾選要刪除的項目'}</span>
                  <Button variant="destructive" size="sm" className="h-6 text-xs px-2" disabled={selectedQAIds.size === 0 || batchDeleteVideoQAMutation.isPending} onClick={() => {
                    if (confirm(`確定刪除選取的 ${selectedQAIds.size} 則收藏？`)) {
                      Array.from(selectedQAIds).forEach(id => batchDeleteVideoQAMutation.mutate({ id }));
                    }
                  }}>刪除選取</Button>
                </div>
              )}
              <div className="divide-y divide-border overflow-y-auto flex-1">
                {((videoSavedQAList as any[]).filter((qa: any) => !qaSearchQuery || qa.questionText?.includes(qaSearchQuery) || qa.aiAnswer?.includes(qaSearchQuery) || qa.unitTitle?.includes(qaSearchQuery))).map((qa: any) => {
                  const isExpanded = expandedQAIds.has(qa.id);
                  const highlights = qaHighlights[qa.id] || [];
                  const followUps = qaFollowUps[qa.id] || [];
                  const noteText = qaNotes[qa.id] ?? (qa.notes || '');
                  const isEditingNote = qaNotesEditing[qa.id] || false;
                  const isFollowLoading = qaFollowLoading[qa.id] || false;
                  const extraImages: string[] = qa.extraImages ? JSON.parse(qa.extraImages) : [];
                  return (
                  <div key={qa.id} className={`p-4 space-y-3 ${qaManageMode && selectedQAIds.has(qa.id) ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      {qaManageMode && (
                        <div className="mt-0.5 flex-shrink-0" onClick={() => {
                          setSelectedQAIds(prev => {
                            const next = new Set(prev);
                            next.has(qa.id) ? next.delete(qa.id) : next.add(qa.id);
                            return next;
                          });
                        }}>
                          {selectedQAIds.has(qa.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0" onClick={() => { if (!qaManageMode) setExpandedQAIds(prev => { const next = new Set(prev); next.has(qa.id) ? next.delete(qa.id) : next.add(qa.id); return next; }); }} style={{ cursor: qaManageMode ? 'default' : 'pointer' }}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-200">函授問答</Badge>
                          {qa.courseName && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{qa.courseName}</span>}
                          {qa.unitTitle && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[150px]">{qa.unitTitle}</span>}
                          {qa.videoTimestamp && <span className="text-[10px] text-primary bg-primary/5 px-1 rounded flex items-center gap-0.5"><PlayCircle className="w-2.5 h-2.5" />{Math.floor(qa.videoTimestamp / 60)}分{qa.videoTimestamp % 60}秒</span>}
                        </div>
                        <p className="text-sm font-semibold truncate text-foreground">{qa.questionText || '（圖片提問）'}</p>
                      </div>
                      {!qaManageMode && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {qa.videoTimestamp && onSwitchToLecture && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => onSwitchToLecture(qa.videoUnitId, qa.videoTimestamp)}><ExternalLink className="w-3.5 h-3.5 mr-1" />跳至影片</Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => { if (confirm('確定刪除此收藏？')) deleteVideoQAMutation.mutate({ id: qa.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                    {/* 展開詳情 */}
                    {isExpanded && !qaManageMode && (
                      <div className="pl-0 space-y-3 border-t border-border pt-3">
                        {/* 提問截圖 */}
                        {qa.screenshotUrl && (
                          <div className="relative max-w-md bg-muted rounded-lg overflow-hidden border border-border">
                            <img src={qa.screenshotUrl} alt="提問截圖" className="w-full max-h-64 object-contain cursor-pointer" onClick={() => window.open(qa.screenshotUrl, '_blank')} />
                          </div>
                        )}
                        {/* 提問內容 */}
                        {qa.questionText && (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                            <p className="text-xs font-medium text-primary mb-1">提問問題</p>
                            <p className="text-sm">{qa.questionText}</p>
                          </div>
                        )}
                        {/* AI 回答 */}
                        {qa.aiAnswer && (
                          <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Brain className="w-3.5 h-3.5" />AI 回答 <span className="text-xs text-blue-400 ml-1">(選取文字可加螢光筆)</span></p>
                            <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed">
                              <NoteHighlightedContent content={qa.aiAnswer} noteHighlights={highlights} onAddH={(h) => handleQaHighlight(qa.id, h)} />
                            </div>
                            {highlights.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-border space-y-1">
                                <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Highlighter className="w-3 h-3" />標記彙整</p>
                                {highlights.map(h => (
                                  <div key={h.id} className="flex items-center gap-1 text-[10px]">
                                    <span style={{ ...(h.markType === "color" ? { color: h.color, fontWeight: 600 } : h.markType === "underline" ? { textDecoration: "underline", textDecorationColor: h.color } : h.markType === "bold" ? { fontWeight: 700 } : { background: h.color, borderRadius: 2, padding: "0px 4px" }) }}>{h.text}</span>
                                    {h.annotation && <span className="text-muted-foreground italic">💬 {h.annotation}</span>}
                                    <button className="text-muted-foreground hover:text-destructive ml-1" onClick={() => {
                                      const nextH = highlights.filter(x => x.id !== h.id);
                                      setQaHighlights(prev => ({ ...prev, [qa.id]: nextH }));
                                      updateSavedQAMutation.mutate({ id: qa.id, highlights: JSON.stringify(nextH) });
                                    }}><X className="w-2.5 h-2.5" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {/* 追問對話記錄 */}
                        {followUps.length > 0 && (
                          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                            {followUps.map((f: any, fi: number) => (
                              <div key={fi} className="space-y-2">
                                <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                                  <p className="text-[10px] font-medium text-primary mb-0.5">追問 {fi + 1}</p>
                                  <p className="text-xs">{f.question}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
                                  <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1"><Brain className="w-3 h-3" />AI 回答</p>
                                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{f.answer}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* 繼續追問 AI */}
                        <div className="border border-dashed border-border rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />繼續追問 AI</p>
                          <div className="flex gap-2">
                            <Input
                              value={qaFollowInput[qa.id] || ''}
                              onChange={(e) => setQaFollowInput(prev => ({ ...prev, [qa.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQaFollowUp(qa.id); } }}
                              placeholder="輸入追問內容..."
                              className="text-sm h-8"
                              disabled={isFollowLoading}
                            />
                            <Button size="sm" className="h-8 px-3" disabled={isFollowLoading || !qaFollowInput[qa.id]?.trim()} onClick={() => handleQaFollowUp(qa.id)}>
                              {isFollowLoading ? <span className="text-xs">思考中...</span> : <Send className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                        {/* 補充文字 */}
                        <div className="border border-dashed border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Pencil className="w-3.5 h-3.5" />補充文字</p>
                            {!isEditingNote ? (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setQaNotesEditing(prev => ({ ...prev, [qa.id]: true }))}>
                                {noteText ? '編輯' : '新增'}
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleQaNoteSave(qa.id)}>儲存</Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setQaNotesEditing(prev => ({ ...prev, [qa.id]: false }))}>取消</Button>
                              </div>
                            )}
                          </div>
                          {isEditingNote ? (
                            <textarea
                              value={noteText}
                              onChange={(e) => setQaNotes(prev => ({ ...prev, [qa.id]: e.target.value }))}
                              placeholder="輸入補充說明、心得..."
                              className="w-full text-sm bg-background border border-border rounded-md p-2 resize-none min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                          ) : noteText ? (
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{noteText}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">點擊「新增」輸入補充說明</p>
                          )}
                        </div>
                        {/* 補充圖片 */}
                        <div className="border border-dashed border-border rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />補充圖片</p>
                          {extraImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {extraImages.map((imgUrl, idx) => (
                                <div key={idx} className="relative group">
                                  <img src={imgUrl} alt={`補充圖片 ${idx + 1}`} className="w-full object-contain rounded border border-border max-h-32" />
                                  <button
                                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    onClick={() => {
                                      const newImages = extraImages.filter((_, i) => i !== idx);
                                      updateSavedQAMutation.mutate({ id: qa.id, extraImages: JSON.stringify(newImages) });
                                    }}
                                  >×</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>上傳圖片（截圖、筆記照片）</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQaImageUpload(qa.id, f); e.target.value = ''; }} />
                          </label>
                        </div>
                      </div>
                    )}
                    {/* 時間 */}
                    <p className="text-xs text-muted-foreground">{new Date(qa.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</p>
                  </div>
                  );
                })}
              </div>
              </div>
            )}
          </div>
        ) : !selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground text-sm">選擇左側筆記查看內容</p></div>
          </div>
        ) : noteLoading ? (
          <div className="flex-1 flex items-center justify-center"><div className="text-muted-foreground text-sm">載入中...</div></div>
        ) : selectedNote ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 標題列 */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {editingTitle ? (
                  <div className="flex gap-2">
                    <Input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} className="text-lg font-semibold" autoFocus onKeyDown={(e) => { if (e.key === "Enter") updateMutation.mutate({ id: selectedNote.id, title: titleInput }); if (e.key === "Escape") setEditingTitle(false); }} />
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: selectedNote.id, title: titleInput })}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{selectedNote.title || "（無標題）"}</h2>
                    <button onClick={() => { setTitleInput(selectedNote.title || ""); setEditingTitle(true); }} className="p-1 rounded hover:bg-muted text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {selectedNote.subjectName && <Badge variant="secondary" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />{selectedNote.subjectName}</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(selectedNote.createdAt + "Z").toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("確定要刪除這則筆記嗎？")) deleteMutation.mutate({ id: selectedNote.id }); }}><Trash2 className="w-4 h-4" /></Button>
            </div>

            {/* 原始問題 */}
            {selectedNote.question && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs font-medium text-primary mb-1">原始問題</p>
                <p className="text-sm">{selectedNote.question}</p>
              </div>
            )}

            {/* AI 回覆內容（螢光筆區） */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setAiContentCollapsed(v => !v)}>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />AI 回覆內容</p>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {!aiContentCollapsed && <span className="text-xs text-muted-foreground/60 flex items-center gap-1"><Highlighter className="w-3 h-3" />框選文字可標記</span>}
                  {!aiContentCollapsed && highlights.length > 0 && <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("清除所有螢光筆標記？")) { setHighlights([]); updateMutation.mutate({ id: selectedNote.id, highlights: "[]" }); } }}>清除標記</button>}
                  <button onClick={e => { e.stopPropagation(); setAiContentCollapsed(v => !v); }} className="text-muted-foreground hover:text-foreground">{aiContentCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                </div>
              </div>
              {!aiContentCollapsed && <>
              <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed mt-3">
                <NoteHighlightedContent content={selectedNote.content} noteHighlights={highlights} onAddH={handleAddHighlight} />
              </div>
              {highlights.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Highlighter className="w-3.5 h-3.5" />標記彙整</p>
                  <div className="space-y-1.5">
                    {highlights.map((h) => (
                      <div key={h.id} className="flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="text-muted-foreground/50 flex-shrink-0">{h.markType === "color" ? "🎨" : h.markType === "underline" ? "̲A" : h.markType === "bold" ? "🇧" : "📌"}</span>
                        <span style={{ ...(h.markType === "color" ? { color: h.color, fontWeight: 600 } : h.markType === "underline" ? { textDecoration: "underline", textDecorationColor: h.color } : h.markType === "bold" ? { fontWeight: 700 } : { background: h.color, borderRadius: 3, padding: "1px 5px" }), maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.text.slice(0, 30) + (h.text.length > 30 ? "…" : "")}</span>
                        {h.annotation && <span className="text-muted-foreground flex items-center gap-0.5 italic"><MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0" />{h.annotation}</span>}
                        <button onClick={() => removeHighlight(h.id)} className="text-muted-foreground/50 hover:text-destructive flex-shrink-0"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>}
            </div>

            {/* 個人筆記（含截圖） */}
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><NotebookPen className="w-3.5 h-3.5" />我的筆記</p>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { try { const items = await navigator.clipboard.read(); let found = false; for (const item of items) { for (const type of item.types) { if (type.startsWith("image/")) { const blob = await item.getType(type); const reader = new FileReader(); reader.onload = () => uploadImageBase64(reader.result as string, type); reader.readAsDataURL(blob); found = true; break; } } if (found) break; } if (!found) toast.info("剪貼簿中沒有圖片，請先截圖再點此按鈕"); } catch { toast.info("請點擊下方筆記框，再按 Ctrl+V 貼上截圖"); } }} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1" title="貼上剪貼簿截圖">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
                    貼上截圖
                  </button>
                  <button onClick={() => imageInputRef.current?.click()} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1" title="上傳圖片"><ImagePlus className="w-3.5 h-3.5" />上傳圖片</button>
                  <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  {!editingNote && <button onClick={() => { setNoteInput(selectedNote.note || ""); setEditingNote(true); }} className="text-xs text-primary hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" />{selectedNote.note ? "編輯" : "新增筆記"}</button>}
                </div>
              </div>
              {(noteImages.length > 0 || uploadingImage) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {noteImages.map((src, i) => (<div key={i} className="relative"><img src={src} alt={`截圖 ${i + 1}`} className="max-h-48 rounded-lg border border-border object-contain cursor-pointer" onClick={() => window.open(src, "_blank")} /><button onClick={() => removeNoteImage(src)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button></div>))}
                  {uploadingImage && <div className="w-24 h-24 rounded-lg border border-border flex items-center justify-center bg-muted"><span className="text-xs text-muted-foreground">上傳中...</span></div>}
                </div>
              )}
              {/* OCR 辨識結果 */}
              {ocrResult && (
                <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                      {isOcrLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />AI 辨識文字中...</> : <><Sparkles className="w-3.5 h-3.5" />AI 辨識結果</>}
                    </span>
                    <button onClick={() => setOcrResult(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {!isOcrLoading && ocrResult.text && (
                    <>
                      <p className="text-xs text-foreground whitespace-pre-wrap bg-background rounded p-2 border border-border max-h-32 overflow-y-auto">{ocrResult.text}</p>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOcrResult(null)}>忽略</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => {
                          const newNote = selectedNote?.note ? selectedNote.note + "\n\n" + ocrResult.text : ocrResult.text;
                          if (selectedId) updateMutation.mutate({ id: selectedId, note: newNote });
                          setOcrResult(null);
                          toast.success("辨識文字已加入筆記");
                        }}>加入筆記文字</Button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {editingNote ? (
                <div className="space-y-2">
                  <Textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="在這裡寫下你的筆記...（也可直接 Ctrl+V 貼上截圖）" className="min-h-[100px] text-sm resize-none" autoFocus onPaste={handleImagePaste} data-note-paste="true" />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingNote(false)}>取消</Button>
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: selectedNote.id, note: noteInput })} disabled={updateMutation.isPending}>{updateMutation.isPending ? "儲存中..." : "儲存"}</Button>
                  </div>
                </div>
              ) : selectedNote.note ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedNote.note}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">尚未新增筆記</p>
              )}
            </div>

            {/* AI 問答區 */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" />針對此筆記提問 AI</p>
              {aiHistory.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {aiHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {msg.role === "ai" ? <Streamdown>{msg.content}</Streamdown> : <p>{msg.content}</p>}
                      </div>
                    </div>
                  ))}
                  {askAiMutation.isPending && <div className="flex gap-2"><div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />思考中...</div></div>}
                  <div ref={aiBottomRef} />
                </div>
              )}
              <div className="flex gap-2">
                <input value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAi(); } }} placeholder="針對這篇筆記問 AI..." disabled={askAiMutation.isPending} className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
                <button onClick={handleAskAi} disabled={!aiQuestion.trim() || askAiMutation.isPending} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 flex-shrink-0"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
