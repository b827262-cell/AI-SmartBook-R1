import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  FileText,
  GripVertical,
  Eye,
  EyeOff,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Scissors,
  Download,
  HelpCircle,
  ListChecks,
  Search,
  RefreshCw,
  FileQuestion,
} from "lucide-react";
import VideoPlayer, { type VideoPlayerHandle } from "@/components/VideoPlayer";

type View = "courses" | "units" | "unit-detail";

// ---- SRT 差異比較元件 ----
function parseSrtBlocks(srt: string): { time: string; text: string }[] {
  if (!srt) return [];
  const blocks = srt.trim().replace(/\r\n/g, "\n").split(/\n\n+/);
  return blocks.map(block => {
    const lines = block.trim().split("\n");
    if (lines.length < 2) return null;
    const timeIdx = lines.findIndex(l => l.includes("-->"));
    if (timeIdx < 0) return null;
    const time = lines[timeIdx];
    const text = lines.slice(timeIdx + 1).join(" ");
    return { time, text };
  }).filter(Boolean) as { time: string; text: string }[];
}

function diffWords(a: string, b: string): { text: string; type: "same" | "del" | "add" }[] {
  const wa = a.split(/(\s+)/);
  const wb = b.split(/(\s+)/);
  const result: { text: string; type: "same" | "del" | "add" }[] = [];
  let i = 0, j = 0;
  while (i < wa.length || j < wb.length) {
    if (i < wa.length && j < wb.length && wa[i] === wb[j]) {
      result.push({ text: wa[i], type: "same" });
      i++; j++;
    } else if (j < wb.length && (i >= wa.length || !wa.slice(i, i + 3).includes(wb[j]))) {
      result.push({ text: wb[j], type: "add" });
      j++;
    } else if (i < wa.length) {
      result.push({ text: wa[i], type: "del" });
      i++;
    }
  }
  return result;
}

/** 將 SRT 時間字串解析成秒數，例如 "00:01:23,456" → 83 */
function srtTimeToSec(timeStr: string): number {
  const m = timeStr.match(/(\d{2}):(\d{2}):(\d{2})[,.]/);
  if (!m) return 0;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
}

function SrtDiffViewer({
  original, corrected, unitId, onSaved, currentSec,
}: {
  original: string;
  corrected: string;
  unitId: number;
  onSaved?: () => void;
  currentSec?: number;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const [filterDiff, setFilterDiff] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editStartSec, setEditStartSec] = useState<number>(0);
  const [editEndSec, setEditEndSec] = useState<number>(0);
  // 本地可編輯的 corrected blocks
  const [localCorr, setLocalCorr] = useState<{ time: string; text: string }[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const updateCorrectedSrt = trpc.videoCourseAdmin.updateCorrectedSrt.useMutation({
    onSuccess: () => { toast.success("字幕已更新覆蓋"); setIsDirty(false); onSaved?.(); },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const origBlocks = useMemo(() => parseSrtBlocks(original), [original]);
  const corrBlocks = useMemo(() => parseSrtBlocks(corrected), [corrected]);

  // 初始化 localCorr
  useEffect(() => {
    setLocalCorr(parseSrtBlocks(corrected));
    setIsDirty(false);
    setEditingIdx(null);
  }, [corrected]);

  const maxLen = Math.max(origBlocks.length, localCorr.length);

  /** 移除所有標點符號，不區分全形半形 */
  const stripPunctuation = (s: string) =>
    s.replace(/[\u3000-\u303f\uff00-\uffef\u2000-\u206f.,!?;:'"、。，．！？；：「」『』【】‘’“”\s]/g, "");

  const hasRealDiff = (a: string, b: string) => stripPunctuation(a) !== stripPunctuation(b);

  const changedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < Math.min(origBlocks.length, localCorr.length); i++) {
      if (hasRealDiff(origBlocks[i].text, localCorr[i].text)) count++;
    }
    return count;
  }, [origBlocks, localCorr]);

  // 篩選後的索引列表（篩選差異時只顯示實質文字错字，忽略標點符號差異）
  const visibleIndices = useMemo(() => {
    const indices = Array.from({ length: maxLen }, (_, i) => i);
    if (!filterDiff) return indices;
    return indices.filter(i => {
      const orig = origBlocks[i];
      const corr = localCorr[i];
      return orig && corr && hasRealDiff(orig.text, corr.text);
    });
  }, [filterDiff, maxLen, origBlocks, localCorr]);

  const handleLeftScroll = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (rightRef.current && leftRef.current) rightRef.current.scrollTop = leftRef.current.scrollTop;
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (leftRef.current && rightRef.current) leftRef.current.scrollTop = rightRef.current.scrollTop;
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditText(localCorr[i]?.text ?? "");
    const timeLine = localCorr[i]?.time ?? "";
    const parts = timeLine.split(" --> ");
    setEditStartSec(parts[0] ? srtTimeToSec(parts[0]) : 0);
    setEditEndSec(parts[1] ? srtTimeToSec(parts[1]) : 0);
  };

  /** 把秒數轉回 SRT 時間格式 00:mm:ss,000 */
  const secToSrtTimeFull = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},000`;
  };

  const commitEdit = (i: number) => {
    if (editingIdx !== i) return;
    const newTime = `${secToSrtTimeFull(editStartSec)} --> ${secToSrtTimeFull(editEndSec)}`;
    setLocalCorr(prev => prev.map((b, idx) => idx === i ? { ...b, text: editText, time: newTime } : b));
    setIsDirty(true);
    setEditingIdx(null);
  };

  // 把 localCorr 重新組合成 SRT 字串
  const buildSrt = () => {
    return localCorr.map((b, i) => `${i + 1}\n${b.time}\n${b.text}`).join("\n\n") + "\n";
  };

  const handleSave = () => {
    updateCorrectedSrt.mutate({ unitId, correctedSrt: buildSrt() });
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-500" />
          字幕對照
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {changedCount > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
              AI 共校正 {changedCount} 處
            </span>
          )}
          <Button
            size="sm"
            variant={filterDiff ? "default" : "outline"}
            className={filterDiff ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-amber-700 border-amber-300"}
            onClick={() => setFilterDiff(v => !v)}
          >
            {filterDiff ? `篩選中（${visibleIndices.length} 行）` : "篩選差異行"}
          </Button>
          {isDirty && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSave}
              disabled={updateCorrectedSrt.isPending}
            >
              {updateCorrectedSrt.isPending ? "儲存中..." : "更新覆蓋字幕"}
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border border-gray-200">
        {/* 標題列 */}
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 border-b border-r border-gray-200">原始字幕</div>
        <div className="bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 border-b border-gray-200">AI 校正後（點擊可編輯）</div>
        {/* 內容區 */}
        <div
          ref={leftRef}
          onScroll={handleLeftScroll}
          className="overflow-y-auto bg-white border-r border-gray-200"
          style={{ height: "400px" }}
        >
          {visibleIndices.map(i => {
            const orig = origBlocks[i];
            const corr = localCorr[i];
            const changed = orig && corr && orig.text !== corr.text;
            return (
              <div key={i} className={`px-4 py-2 border-b border-gray-100 text-xs font-mono ${changed ? "bg-red-50" : ""}`}>
                {orig ? (
                  <>
                    <div className="text-gray-400 mb-0.5 flex items-center gap-2">
                      <span className="text-blue-400 font-semibold">{secToTime(srtTimeToSec(orig.time.split(' --> ')[0]))}</span>
                      <span className="text-gray-300 text-[10px]">{orig.time}</span>
                    </div>
                    <div className="text-gray-800">{orig.text}</div>
                  </>
                ) : <div className="text-gray-300 italic">—</div>}
              </div>
            );
          })}
        </div>
        <div
          ref={rightRef}
          onScroll={handleRightScroll}
          className="overflow-y-auto bg-white"
          style={{ height: "400px" }}
        >
          {visibleIndices.map(i => {
            const orig = origBlocks[i];
            const corr = localCorr[i];
            const changed = orig && corr && orig.text !== corr.text;
            const diff = (changed && editingIdx !== i) ? diffWords(orig.text, corr.text) : null;
            const isEditing = editingIdx === i;
            return (
              <div
                key={i}
                className={`px-4 py-2 border-b border-gray-100 text-xs font-mono cursor-pointer group ${changed ? "bg-green-50" : ""} ${isEditing ? "ring-2 ring-inset ring-blue-400" : "hover:bg-blue-50"}`}
                onClick={() => { if (!isEditing) startEdit(i); }}
              >
                {corr ? (
                  <>
                    {isEditing ? (
                      <div className="mb-1 space-y-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-gray-400">開始秒：</span>
                          <input
                            type="number"
                            className="w-16 text-xs font-mono border border-blue-300 rounded px-1 py-0.5 bg-white text-gray-900 outline-none"
                            value={editStartSec}
                            onChange={e => setEditStartSec(parseInt(e.target.value) || 0)}
                          />
                          {currentSec !== undefined && (
                            <button
                              className="text-[10px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 hover:bg-blue-200"
                              onClick={() => setEditStartSec(Math.floor(currentSec!))}
                            >📍 {Math.floor(currentSec)}s</button>
                          )}
                          <span className="text-[10px] text-gray-400 ml-1">結束秒：</span>
                          <input
                            type="number"
                            className="w-16 text-xs font-mono border border-blue-300 rounded px-1 py-0.5 bg-white text-gray-900 outline-none"
                            value={editEndSec}
                            onChange={e => setEditEndSec(parseInt(e.target.value) || 0)}
                          />
                          {currentSec !== undefined && (
                            <button
                              className="text-[10px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 hover:bg-blue-200"
                              onClick={() => setEditEndSec(Math.floor(currentSec!))}
                            >📍 {Math.floor(currentSec)}s</button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 mb-0.5 flex items-center gap-2">
                        <span className="text-green-500 font-semibold">{secToTime(srtTimeToSec(corr.time.split(' --> ')[0]))}</span>
                        <span className="text-gray-300 text-[10px]">{corr.time}</span>
                      </div>
                    )}
                    {isEditing ? (
                      <input
                        autoFocus
                        className="w-full text-xs font-mono border border-blue-300 rounded px-1 py-0.5 bg-white text-gray-900 outline-none"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onBlur={() => commitEdit(i)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitEdit(i); } if (e.key === "Escape") setEditingIdx(null); }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="text-gray-800">
                        {diff ? diff.map((d, di) => (
                          d.type === "same" ? <span key={di}>{d.text}</span> :
                          d.type === "del" ? null :
                          <span key={di} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{d.text}</span>
                        )) : corr.text}
                      </div>
                    )}
                  </>
                ) : <div className="text-gray-300 italic">—</div>}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">黃色詞語為 AI 改動處；點擊右欄文字可直接編輯，Enter 確認，Esc 取消；有修改後會出現「更新覆蓋字幕」按鈕</p>
    </div>
  );
}

function secToTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AdminVideoCourse() {
  const [view, setView] = useState<View>("courses");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  // ---- 課程列表 ----
  const { data: courses, refetch: refetchCourses } = trpc.videoCourseAdmin.listCourses.useQuery();
  const createCourse = trpc.videoCourseAdmin.createCourse.useMutation({
    onSuccess: () => { refetchCourses(); setShowCourseDialog(false); toast.success("課程已建立"); },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });
  const updateCourse = trpc.videoCourseAdmin.updateCourse.useMutation({
    onSuccess: () => { refetchCourses(); setShowCourseDialog(false); toast.success("已更新"); },
  });
  const deleteCourse = trpc.videoCourseAdmin.deleteCourse.useMutation({
    onSuccess: () => { refetchCourses(); toast.success("課程已刪除"); },
  });

  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{ id?: number; title: string; description: string; subjectId?: number | null } | null>(null);
  const { data: allSubjects } = trpc.tutorSubjectsAdmin.getAll.useQuery();
  const [deleteCourseId, setDeleteCourseId] = useState<number | null>(null);

  // ---- SRT 分段工具 ----
  const [showSrtTool, setShowSrtTool] = useState(false);
  const [srtToolContent, setSrtToolContent] = useState("");
  const [srtToolSegments, setSrtToolSegments] = useState<{
    part: number; label: string; start: string; end: string; reason: string;
  }[]>([]);
  const [srtToolDuration, setSrtToolDuration] = useState(0);
  const srtToolFileRef = useRef<HTMLInputElement>(null);
  const analyzeSrtSegments = trpc.videoCourseAdmin.analyzeSrtSegments.useMutation({
    onSuccess: (data) => {
      setSrtToolSegments(data.suggested_segments);
      setSrtToolDuration(data.total_duration_min);
      toast.success(`AI 分析完成，建議 ${data.suggested_segments.length} 個分段`);
    },
    onError: (e) => toast.error(`分析失敗：${e.message}`),
  });

  // ---- 單元列表 ----
  const { data: units, refetch: refetchUnits } = trpc.videoCourseAdmin.listUnits.useQuery(
    { courseId: selectedCourseId! },
    { enabled: !!selectedCourseId }
  );
  const createUnit = trpc.videoCourseAdmin.createUnit.useMutation({
    onSuccess: () => { refetchUnits(); setShowUnitDialog(false); toast.success("單元已建立"); },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });
  const updateUnit = trpc.videoCourseAdmin.updateUnit.useMutation({
    onSuccess: () => { refetchUnits(); setShowUnitDialog(false); toast.success("已更新"); },
  });
  const deleteUnit = trpc.videoCourseAdmin.deleteUnit.useMutation({
    onSuccess: () => { refetchUnits(); toast.success("單元已刪除"); },
  });
  const processUnit = trpc.videoCourseAdmin.processUnit.useMutation({
    onSuccess: (data) => {
      refetchUnits();
      if (view === "unit-detail") refetchUnitDetail();
      if (showUnitDialog && editingUnitId) refetchEditingUnit();
      toast.success(`AI 處理完成！生成 ${data.pointsCount} 個知識點`, { description: `單元標題：${data.title}` });
    },
    onError: (e) => toast.error(`AI 處理失敗：${e.message}`),
  });

  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<{
    id?: number;
    title: string;
    videoUrl: string;
    srtContent: string;
  } | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const srtFileRef = useRef<HTMLInputElement>(null);
  // ibrain URL 解析狀態
  const [urlResolveStatus, setUrlResolveStatus] = useState<"idle" | "resolving" | "resolved" | "error">("idle");
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  // 影片預覽狀態
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const resolveVideoUrl = trpc.videoCourseAdmin.resolveVideoUrl.useMutation({
    onSuccess: (data) => {
      setResolvedVideoUrl(data.resolvedUrl);
      setUrlResolveStatus("resolved");
      if (data.resolvedUrl !== editingUnit?.videoUrl) {
        setEditingUnit(prev => prev ? { ...prev, videoUrl: data.resolvedUrl } : prev);
        toast.success(`已自動解析為 ${data.type === "hls" ? "HLS 串流" : data.type === "youtube" ? "YouTube" : "MP4"} 連結`);
      }
    },
    onError: (err) => {
      setUrlResolveStatus("error");
      toast.error(err.message);
    },
  });

  // 編輯時載入完整 srtContent + 知識點
  const { data: editingUnitFull, refetch: refetchEditingUnit } = trpc.videoCourseAdmin.getUnit.useQuery(
    { id: editingUnitId! },
    { enabled: !!editingUnitId }
  );
  useEffect(() => {
    if (editingUnitFull && editingUnitId) {
      setEditingUnit(prev => prev ? { ...prev, srtContent: editingUnitFull.srtContent ?? "" } : prev);
    }
  }, [editingUnitFull, editingUnitId]);

  // 批次删除單元
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const batchUpdateSubtitleEnabled = trpc.videoCourseAdmin.batchUpdateSubtitleEnabled.useMutation({
    onSuccess: (data, variables) => {
      refetchUnits();
      toast.success(`${variables.enabled ? "Enabled" : "Disabled"} subtitles for ${data.count} units`);
    },
    onError: (e) => toast.error(`操作失敗：${e.message}`),
  });
  const batchToggleSubtitles = trpc.videoCourseAdmin.batchToggleSubtitles.useMutation({
    onSuccess: (data, variables) => {
      refetchUnits();
      toast.success(`${variables.subtitlesEnabled ? "Enabled" : "Disabled"} subtitles for ${data.count} units`);
    },
    onError: (e) => toast.error(`操作失敗：${e.message}`),
  });

  const batchDeleteUnits = trpc.videoCourseAdmin.batchDeleteUnits.useMutation({
    onSuccess: (data) => {
      refetchUnits();
      setSelectedUnitIds(new Set());
      setShowBatchDeleteConfirm(false);
      toast.success(`已刪除 ${data.deletedCount} 個單元`);
    },
    onError: (e) => toast.error(`批次刪除失敗：${e.message}`),
  });

  // ---- 批次建立單元 ----
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchSegments, setBatchSegments] = useState<{
    part: number; label: string; start: string; end: string; reason?: string;
    srtContent: string; videoUrl: string;
  }[]>([]);
  const batchJsonRef = useRef<HTMLInputElement>(null);
  const batchSrtRefs = useRef<HTMLInputElement[]>([]);
  const batchProcessUnits = trpc.videoCourseAdmin.batchProcessUnits.useMutation({
    onSuccess: (data) => {
      refetchUnits();
      if (data.processedCount > 0) toast.success(`✅ AI 字幕校正完成！已處理 ${data.processedCount} 個單元`);
    },
    onError: (e) => toast.error(`AI 批次校正失敗：${e.message}`),
  });

  const batchReanalyzeKP = trpc.videoCourseAdmin.batchReanalyzeKnowledgePoints.useMutation({
    onSuccess: (data) => {
      refetchUnits();
      // 若目前在單元詳情頁，同步更新知識點列表
      if (view === "unit-detail") refetchUnitDetail();
      if (editingUnitId) refetchEditingUnit();
      if (data.processed > 0 && data.skipped > 0) {
        toast.warning(`Generated ${data.processed} units, skipped ${data.skipped}`);
      } else if (data.processed > 0) {
        toast.success(`Generated knowledge points for ${data.processed} units`);
      } else {
        toast.error("Unable to generate knowledge points. Please upload subtitles or transcript content first.");
      }
    },
    onError: (e) => toast.error(`AI 重新分析失敗：${e.message}`),
  });

  const batchCreateUnits = trpc.videoCourseAdmin.batchCreateUnits.useMutation({
    onSuccess: (data) => {
      refetchUnits();
      setShowBatchDialog(false);
      setBatchSegments([]);
      toast.success(`成功建立 ${data.createdCount} 個單元！正在背景跑 AI 字幕校正...`);
      // 批次建立後自動觸發背景 AI 字幕校正
      if (selectedCourse?.id) {
        setTimeout(() => batchProcessUnits.mutate({ courseId: selectedCourse.id }), 800);
      }
    },
    onError: (e) => toast.error(`批次建立失敗：${e.message}`),
  });

  // 解析 HH:MM:SS 為秒數
  const parseTimeToSec = (t: string) => {
    const parts = t.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  // ---- 單元詳情 ----
  const { data: unitDetail, refetch: refetchUnitDetail } = trpc.videoCourseAdmin.getUnit.useQuery(
    { id: selectedUnitId! },
    { enabled: !!selectedUnitId }
  );
  const updateKP = trpc.videoCourseAdmin.updateKnowledgePoint.useMutation({
    onSuccess: () => { refetchUnitDetail(); refetchEditingUnit(); setEditingKP(null); setDialogEditingKP(null); toast.success("已更新"); },
  });
  const deleteKP = trpc.videoCourseAdmin.deleteKnowledgePoint.useMutation({
    onSuccess: () => { refetchUnitDetail(); refetchEditingUnit(); toast.success("知識點已刪除"); },
  });
  // Dialog 內知識點 inline 編輯 state
  const [dialogEditingKP, setDialogEditingKP] = useState<{
    id: number; title: string; summary: string; startSec: number; endSec: number;
  } | null>(null);

  const [editingKP, setEditingKP] = useState<{
    id: number; title: string; summary: string; startSec: number; endSec: number;
  } | null>(null);

  // 新增知識點
  const [showAddKP, setShowAddKP] = useState(false);
  const [newKP, setNewKP] = useState({ title: "", startSec: 0, endSec: 0 });
  const addKP = trpc.videoCourseAdmin.addKnowledgePoint.useMutation({
    onSuccess: (data) => {
      refetchUnitDetail();
      setShowAddKP(false);
      setNewKP({ title: "", startSec: 0, endSec: 0 });
      toast.success("知識點已新增！", { description: data.summary ? `AI 摘要：${data.summary.slice(0, 40)}...` : "已依時間排序" });
    },
    onError: (e) => toast.error(`新增失敗：${e.message}`),
  });

  // 影片當前播放秒數追蹤
  const [videoCurrentSec, setVideoCurrentSec] = useState<number>(0);
  // seekTo state：改變此值觸發 VideoPlayer 跳轉
  const [videoSeekTo, setVideoSeekTo] = useState<number | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  /** 跳轉影片到指定秒數 */
  const seekVideo = (sec: number) => {
    setVideoSeekTo(sec);
  };

  /** 暫停影片 */
  const pauseVideo = () => { videoPlayerRef.current?.pause(); };

  /** 恢復播放 */
  const resumeVideo = () => { videoPlayerRef.current?.play(); };

  /** 根據當前秒數找到對應字幕文字和 block index */
  const currentSubtitleInfo = useMemo(() => {
    const srt = unitDetail?.correctedSrt || unitDetail?.srtContent;
    if (!srt) return { text: "", idx: -1 };
    const blocks = parseSrtBlocks(srt);
    const sec = videoCurrentSec;
    for (let i = 0; i < blocks.length; i++) {
      const parts = blocks[i].time.split(" --> ");
      const start = srtTimeToSec(parts[0] ?? "");
      const end = srtTimeToSec(parts[1] ?? "");
      if (sec >= start && sec <= end) return { text: blocks[i].text, idx: i };
    }
    return { text: "", idx: -1 };
  }, [videoCurrentSec, unitDetail?.correctedSrt, unitDetail?.srtContent]);

  // 字幕行內編輯狀態
  const [editingSubtitle, setEditingSubtitle] = useState<{ idx: number; text: string } | null>(null);

  // ---- 出考題相關 state ----
  const [showGenerateQDialog, setShowGenerateQDialog] = useState(false);
  const [showQManageDialog, setShowQManageDialog] = useState(false);
  const [generateQUnitId, setGenerateQUnitId] = useState<number | null>(null);
  const [generateQUnitTitle, setGenerateQUnitTitle] = useState("");
  const [genChoiceCount, setGenChoiceCount] = useState<number>(5);
  const [genEssayCount, setGenEssayCount] = useState<number>(5);
  const [genDifficulty, setGenDifficulty] = useState<"easy"|"medium"|"hard"|"mixed">("mixed");
  const [genReplaceExisting, setGenReplaceExisting] = useState(false);
  const [qManageUnitId, setQManageUnitId] = useState<number | null>(null);
  const [qManageUnitTitle, setQManageUnitTitle] = useState("");
  const [qSearch, setQSearch] = useState("");
  const [qTypeFilter, setQTypeFilter] = useState<"all"|"choice"|"essay">("all");
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [deleteQId, setDeleteQId] = useState<number | null>(null);

  // ---- 批次出題 ----
  const [showBatchGenQDialog, setShowBatchGenQDialog] = useState(false);
  const [batchGenChoiceCount, setBatchGenChoiceCount] = useState<number>(5);
  const [batchGenEssayCount, setBatchGenEssayCount] = useState<number>(5);
  const [batchGenDifficulty, setBatchGenDifficulty] = useState<"easy"|"medium"|"hard"|"mixed">("mixed");
  const [batchGenReplaceExisting, setBatchGenReplaceExisting] = useState(false);
  const [batchGenOnlyWithout, setBatchGenOnlyWithout] = useState(true);

  const batchGenerateQuestions = trpc.videoCourseQuestion.batchGenerateQuestions.useMutation({
    onSuccess: (data) => {
      if (data.questionsCreated > 0 && data.skipped > 0) {
        toast.warning(`Generated ${data.questionsCreated} questions, skipped ${data.skipped} units`);
      } else if (data.questionsCreated > 0) {
        toast.success(`Generated ${data.questionsCreated} questions`);
      } else {
        toast.error("Unable to generate questions. Please upload subtitles, transcript, or knowledge points first.");
      }
      setShowBatchGenQDialog(false);
      refetchUnits();
      refetchQStats();
    },
    onError: (e) => toast.error(`批次出題失敗：${e.message}`),
  });

  const generateQuestions = trpc.videoCourseQuestion.generateQuestions.useMutation({
    onSuccess: (data) => {
      if (data.questionsCreated > 0) {
        toast.success(`Generated ${data.questionsCreated} questions`);
      } else {
        toast.error("Unable to generate questions. Please upload subtitles, transcript, or knowledge points first.");
      }
      setShowGenerateQDialog(false);
      refetchUnits();
      refetchQStats();
    },
    onError: (e) => toast.error(`出題失敗：${e.message}`),
  });
  const updateQuestion = trpc.videoCourseQuestion.updateQuestion.useMutation({
    onSuccess: () => { toast.success("已儲存"); setEditingQuestion(null); refetchQList(); },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });
  const deleteQuestion = trpc.videoCourseQuestion.deleteQuestion.useMutation({
    onSuccess: () => { toast.success("已刪除"); setDeleteQId(null); refetchQList(); refetchQStats(); },
  });
  const { data: qStats, refetch: refetchQStats } = trpc.videoCourseQuestion.getQuestionStats.useQuery(
    { unitId: generateQUnitId ?? 0 },
    { enabled: !!generateQUnitId }
  );
  const { data: qList, refetch: refetchQList } = trpc.videoCourseQuestion.listQuestions.useQuery(
    { unitId: qManageUnitId ?? 0, questionType: qTypeFilter, search: qSearch },
    { enabled: !!qManageUnitId }
  );
  const updateCorrectedSrtMutation = trpc.videoCourseAdmin.updateCorrectedSrt.useMutation({
    onSuccess: () => { refetchUnitDetail(); toast.success("字幕已更新"); setEditingSubtitle(null); },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const handleSubtitleEdit = () => {
    if (!editingSubtitle || !unitDetail) return;
    const srt = unitDetail.correctedSrt || unitDetail.srtContent;
    if (!srt) return;
    const blocks = parseSrtBlocks(srt);
    blocks[editingSubtitle.idx].text = editingSubtitle.text;
    const newSrt = blocks.map((b, i) => `${i + 1}\n${b.time}\n${b.text}`).join("\n\n") + "\n";
    updateCorrectedSrtMutation.mutate(
      { unitId: unitDetail.id, correctedSrt: newSrt },
      { onSuccess: () => resumeVideo() }
    );
  };

  const selectedCourse = courses?.find(c => c.id === selectedCourseId);

  // ---- 處理 SRT 上傳 ----
  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setEditingUnit(prev => prev ? { ...prev, srtContent: content } : prev);
    };
    reader.readAsText(file, "utf-8");
  };

  // ==================== 渲染 ====================

  // 課程列表頁
  if (view === "courses") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">智能函授管理</h1>
            <p className="text-gray-500 mt-1 text-sm">管理影音課程、上傳字幕、AI 生成知識點</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setSrtToolContent(""); setSrtToolSegments([]); setShowSrtTool(true); }}>
              <Scissors className="w-4 h-4 mr-2" /> SRT 分段工具
            </Button>
            <Button onClick={() => { setEditingCourse({ title: "", description: "" }); setShowCourseDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> 新增課程
            </Button>
          </div>
        </div>

        {!courses?.length ? (
          <div className="text-center py-20 text-gray-400">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>尚未建立任何課程</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                    <Badge variant={course.isPublished ? "default" : "secondary"}>
                      {course.isPublished ? "已發布" : "草稿"}
                    </Badge>
                    {course.subjectId != null ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {allSubjects?.find(s => s.id === course.subjectId)?.iconEmoji ?? ""} {allSubjects?.find(s => s.id === course.subjectId)?.name ?? `類科${course.subjectId}`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">全科目</Badge>
                    )}
                  </div>
                  {course.description && <p className="text-sm text-gray-500 mt-1 truncate">{course.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => {
                    updateCourse.mutate({ id: course.id, isPublished: course.isPublished ? 0 : 1 });
                  }}>
                    {course.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingCourse({ id: course.id, title: course.title, description: course.description ?? "", subjectId: course.subjectId ?? null });
                    setShowCourseDialog(true);
                  }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteCourseId(course.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => { setSelectedCourseId(course.id); setView("units"); }}>
                    管理單元 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 課程 Dialog */}
        <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCourse?.id ? "編輯課程" : "新增課程"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">課程名稱</label>
                <Input
                  value={editingCourse?.title ?? ""}
                  onChange={e => setEditingCourse(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="例：資通安全管理 第一回"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">課程說明（選填）</label>
                <Textarea
                  value={editingCourse?.description ?? ""}
                  onChange={e => setEditingCourse(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="課程簡介..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">類科（選填）</label>
                <Select
                  value={editingCourse?.subjectId != null ? String(editingCourse.subjectId) : "all"}
                  onValueChange={v => setEditingCourse(prev => prev ? { ...prev, subjectId: v === "all" ? null : Number(v) } : prev)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇類科" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全科目通用</SelectItem>
                    {allSubjects?.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.iconEmoji} {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCourseDialog(false)}>取消</Button>
              <Button onClick={() => {
                if (!editingCourse?.title.trim()) return;
                if (editingCourse.id) {
                  updateCourse.mutate({ id: editingCourse.id, title: editingCourse.title, description: editingCourse.description, subjectId: editingCourse.subjectId ?? null });
                } else {
                  createCourse.mutate({ title: editingCourse.title, description: editingCourse.description, subjectId: editingCourse.subjectId ?? null });
                }
              }} disabled={createCourse.isPending || updateCourse.isPending}>
                {(createCourse.isPending || updateCourse.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                儲存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SRT 分段工具 Dialog */}
        <Dialog open={showSrtTool} onOpenChange={setShowSrtTool}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-blue-500" />
                SRT 分段工具
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Step 1: 上傳 SRT */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Step 1：上傳 SRT 字幕檔</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => srtToolFileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {srtToolContent ? "已載入 SRT" : "選擇 SRT 檔案"}
                  </Button>
                  {srtToolContent && (
                    <span className="text-sm text-green-600">
                      ✓ 已載入，共 {srtToolContent.split(/\n\n+/).length} 條字幕
                    </span>
                  )}
                </div>
                <input
                  ref={srtToolFileRef}
                  type="file"
                  accept=".srt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setSrtToolContent(ev.target?.result as string);
                      setSrtToolSegments([]);
                    };
                    reader.readAsText(file, "utf-8");
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Step 2: AI 分析 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Step 2：AI 分析建議分段</label>
                <Button
                  onClick={() => {
                    if (!srtToolContent) { toast.error("請先上傳 SRT 檔案"); return; }
                    analyzeSrtSegments.mutate({ srtContent: srtToolContent });
                  }}
                  disabled={!srtToolContent || analyzeSrtSegments.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {analyzeSrtSegments.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />AI 分析建議分段</>
                  )}
                </Button>
              </div>

              {/* 分段結果 */}
              {srtToolSegments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Step 3：確認時間段（可手動修改）
                    </label>
                    <span className="text-xs text-gray-400">影片總長約 {srtToolDuration} 分鐘</span>
                  </div>
                  <div className="space-y-3">
                    {srtToolSegments.map((seg, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">Part {seg.part}</span>
                          <Input
                            value={seg.label}
                            onChange={(e) => setSrtToolSegments(prev => prev.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s))}
                            className="h-7 text-sm font-medium flex-1"
                            placeholder="段落名稱"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 w-8">開始</span>
                          <Input
                            value={seg.start}
                            onChange={(e) => setSrtToolSegments(prev => prev.map((s, idx) => idx === i ? { ...s, start: e.target.value } : s))}
                            className="h-7 font-mono text-sm w-32"
                            placeholder="HH:MM:SS"
                          />
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-500 w-8">結束</span>
                          <Input
                            value={seg.end}
                            onChange={(e) => setSrtToolSegments(prev => prev.map((s, idx) => idx === i ? { ...s, end: e.target.value } : s))}
                            className="h-7 font-mono text-sm w-32"
                            placeholder="HH:MM:SS"
                          />
                        </div>
                        {seg.reason && (
                          <p className="text-xs text-gray-400 mt-1.5 italic">ℹ️ {seg.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 下載 JSON */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        const json = JSON.stringify({
                          source_srt: "uploaded.srt",
                          total_duration_min: srtToolDuration,
                          suggested_segments: srtToolSegments,
                        }, null, 2);
                        const blob = new Blob([json], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "segments.json";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("已下載 segments.json，可導入到本地剪輯工具");
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下載 segments.json（給本地剪輯工具用）
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 删除確認 */}
        <AlertDialog open={!!deleteCourseId} onOpenChange={() => setDeleteCourseId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除課程？</AlertDialogTitle>
              <AlertDialogDescription>此操作將刪除課程及其所有單元和知識點，無法復原。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => {
                if (deleteCourseId) deleteCourse.mutate({ id: deleteCourseId });
                setDeleteCourseId(null);
              }}>刪除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // 單元列表頁
  if (view === "units") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* 第一列：標題 + 返回 */}
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={() => setView("courses")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> 返回課程列表
          </Button>
          <div className="h-5 w-px bg-gray-300" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{selectedCourse?.title}</h1>
            <p className="text-gray-500 text-sm">影音單元管理</p>
          </div>
        </div>
        {/* 第二列：全選 + 所有按鈕 */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {units && units.length > 0 && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-red-500 cursor-pointer"
                checked={selectedUnitIds.size === units.length}
                ref={el => { if (el) el.indeterminate = selectedUnitIds.size > 0 && selectedUnitIds.size < units.length; }}
                onChange={e => {
                  if (e.target.checked) setSelectedUnitIds(new Set(units.map(u => u.id)));
                  else setSelectedUnitIds(new Set());
                }}
              />
              全選
            </label>
          )}
          {selectedUnitIds.size > 0 && (
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowBatchDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> 刪除已選 ({selectedUnitIds.size})
            </Button>
          )}
          {selectedUnitIds.size > 0 && (
            <Button
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              disabled={batchUpdateSubtitleEnabled.isPending}
              onClick={() => batchUpdateSubtitleEnabled.mutate({ unitIds: Array.from(selectedUnitIds), enabled: true })}
            >
              <Eye className="w-4 h-4 mr-2" /> 開啟字幕 ({selectedUnitIds.size})
            </Button>
          )}
          {selectedUnitIds.size > 0 && (
            <Button
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              disabled={batchUpdateSubtitleEnabled.isPending}
              onClick={() => batchUpdateSubtitleEnabled.mutate({ unitIds: Array.from(selectedUnitIds), enabled: false })}
            >
              <EyeOff className="w-4 h-4 mr-2" /> 關閉字幕 ({selectedUnitIds.size})
            </Button>
          )}
          {units && units.length > 0 && (
            <Button
              variant="outline"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              disabled={batchReanalyzeKP.isPending || batchProcessUnits.isPending}
              onClick={() => {
                const unitIds = Array.from(selectedUnitIds);
                if (unitIds.length > 0) batchReanalyzeKP.mutate({ unitIds });
                else if (selectedCourse?.id) batchReanalyzeKP.mutate({ courseId: selectedCourse.id });
              }}
            >
              {batchReanalyzeKP.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI 分析中...</>
                : batchProcessUnits.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI 校正中...</>
                : <><Sparkles className="w-4 h-4 mr-2" /> 全部 AI 分析知識點</>
              }
            </Button>
          )}
          {units && units.length > 0 && (
            <Button
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              disabled={batchGenerateQuestions.isPending}
              onClick={() => setShowBatchGenQDialog(true)}
            >
              {batchGenerateQuestions.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 出題中...</>
                : <><FileQuestion className="w-4 h-4 mr-2" /> 一鍵全部出考題</>
              }
            </Button>
          )}
          <Button variant="outline" onClick={() => {
            setBatchSegments([]);
            setShowBatchDialog(true);
          }}>
            <Upload className="w-4 h-4 mr-2" /> 批次建立單元
          </Button>
          <Button onClick={() => {
            setEditingUnit({ title: "", videoUrl: "", srtContent: "" });
            setShowUnitDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> 新增單元
          </Button>
        </div>

        {!units?.length ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>尚未建立任何單元</p>
            <p className="text-sm mt-1">點擊「新增單元」貼上 YouTube 連結並上傳 SRT 字幕</p>
          </div>
        ) : (
          <div className="space-y-3">
            {units.map((unit, idx) => (
              <div key={unit.id} className={`bg-white rounded-xl border p-4 ${selectedUnitIds.has(unit.id) ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-red-500 cursor-pointer mt-1"
                      checked={selectedUnitIds.has(unit.id)}
                      onChange={e => {
                        setSelectedUnitIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(unit.id); else next.delete(unit.id);
                          return next;
                        });
                      }}
                    />
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{unit.title}</h3>
                      {unit.aiStatus === "done" && <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />AI 已處理</Badge>}
                      {unit.aiStatus === "processing" && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" />處理中</Badge>}
                      {unit.aiStatus === "error" && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />處理失敗</Badge>}
                      {unit.aiStatus === "pending" && unit.hasSrt && <Badge variant="secondary">待 AI 處理</Badge>}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {/* 第一行：影片 / 字幕 / 知識點 */}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {unit.videoUrl && <span className="flex items-center gap-1"><Video className="w-3 h-3" /> 有影片</span>}
                        {unit.hasSrt && (
                          <span
                            className={`flex items-center gap-1 cursor-pointer select-none transition-colors ${
                              unit.subtitlesEnabled !== 0
                                ? 'text-blue-600 hover:text-blue-800'
                                : 'text-gray-400 hover:text-gray-600 line-through'
                            }`}
                            title={unit.subtitlesEnabled !== 0 ? '點擊關閉字幕' : '點擊開啟字幕'}
                            onClick={() => batchToggleSubtitles.mutate({
                              unitIds: [unit.id],
                              subtitlesEnabled: unit.subtitlesEnabled !== 0 ? 0 : 1,
                            })}
                          >
                            {unit.subtitlesEnabled !== 0
                              ? <><Eye className="w-3 h-3" /> 字幕開啟</>
                              : <><EyeOff className="w-3 h-3" /> 字幕關閉</>
                            }
                          </span>
                        )}
                        {unit.pointsCount > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {unit.pointsCount} 個知識點</span>}
                      </div>
                      {/* 第二行：題目統計 */}
                      <div className="flex items-center gap-3 text-sm">
                        {(unit.choiceCount > 0 || unit.essayCount > 0) ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <FileQuestion className="w-3 h-3" />
                            選擇題 {unit.choiceCount} 題
                            {unit.essayCount > 0 && <span className="ml-2">QA {unit.essayCount} 題</span>}
                          </span>
                        ) : (
                          unit.pointsCount > 0 && <span className="flex items-center gap-1 text-gray-400 text-xs"><FileQuestion className="w-3 h-3" /> 尚無考題</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unit.hasSrt && unit.aiStatus !== "processing" && (
                      <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => processUnit.mutate({ unitId: unit.id })}
                        disabled={processUnit.isPending}>
                        {processUnit.isPending && processUnit.variables?.unitId === unit.id
                          ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          : <Sparkles className="w-4 h-4 mr-1" />}
                        AI 一鍵處理
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        if (unit.pointsCount === 0) {
                          toast.error("此單元尚無知識點，請先點擊「AI 一鍵處理」後再出題");
                          return;
                        }
                        setGenerateQUnitId(unit.id);
                        setGenerateQUnitTitle(unit.title);
                        setShowGenerateQDialog(true);
                      }}>
                      <HelpCircle className="w-4 h-4 mr-1" /> 出考題
                    </Button>
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        setQManageUnitId(unit.id);
                        setQManageUnitTitle(unit.title);
                        setQSearch("");
                        setQTypeFilter("all");
                        setShowQManageDialog(true);
                      }}>
                      <ListChecks className="w-4 h-4 mr-1" /> 題目管理
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedUnitId(unit.id);
                      setView("unit-detail");
                      // 強制重新取得最新知識點（避免快取顯示舊資料）
                      setTimeout(() => refetchUnitDetail(), 100);
                    }}>
                      查看 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingUnit({ id: unit.id, title: unit.title, videoUrl: unit.videoUrl ?? "", srtContent: "" });
                      setEditingUnitId(unit.id);
                      setShowUnitDialog(true);
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleteUnitId(unit.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 出考題 Dialog */}
        <Dialog open={showGenerateQDialog} onOpenChange={setShowGenerateQDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-green-600" />
                AI 出考題
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                單元：<span className="font-semibold text-gray-800">{generateQUnitTitle}</span>
                {qStats && (
                  <span className="ml-3 text-xs text-gray-400">
                    目前已有 選擇題 {qStats.choiceCount} 題、簡答題 {qStats.essayCount} 題
                  </span>
                )}
              </div>

              {/* 選擇題題數 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">選擇題題數</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setGenChoiceCount(n)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        genChoiceCount === n
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                      }`}>
                      {n === 0 ? "不出" : `${n} 題`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 簡答題題數 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">簡答題題數</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 5, 10].map(n => (
                    <button key={n} onClick={() => setGenEssayCount(n)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        genEssayCount === n
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                      }`}>
                      {n === 0 ? "不出" : `${n} 題`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 難易度 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">難易度</label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { value: "easy", label: "簡單", sub: "基礎概念", color: "text-green-700 border-green-300 bg-green-50", active: "bg-green-500 text-white border-green-500" },
                    { value: "medium", label: "中等", sub: "理解應用", color: "text-yellow-700 border-yellow-300 bg-yellow-50", active: "bg-yellow-500 text-white border-yellow-500" },
                    { value: "hard", label: "困難", sub: "深度分析", color: "text-red-700 border-red-300 bg-red-50", active: "bg-red-500 text-white border-red-500" },
                    { value: "mixed", label: "混合", sub: "易中難均有", color: "text-purple-700 border-purple-300 bg-purple-50", active: "bg-purple-600 text-white border-purple-600" },
                  ] as const).map(d => (
                    <button key={d.value} onClick={() => setGenDifficulty(d.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex flex-col items-center min-w-[70px] ${
                        genDifficulty === d.value ? d.active : d.color
                      }`}>
                      <span>{d.label}</span>
                      <span className="text-xs opacity-75">{d.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 是否取代舊題 */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={genReplaceExisting} onChange={e => setGenReplaceExisting(e.target.checked)} className="w-4 h-4 rounded" />
                取代舊有題目（勾選後會先清除此單元所有題目）
              </label>

              {genChoiceCount === 0 && genEssayCount === 0 && (
                <p className="text-sm text-red-500">請至少選擇一種題型的題數</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateQDialog(false)}>取消</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={generateQuestions.isPending || (genChoiceCount === 0 && genEssayCount === 0)}
                onClick={() => {
                  if (!generateQUnitId) return;
                  generateQuestions.mutate({
                    unitId: generateQUnitId,
                    choiceCount: genChoiceCount,
                    essayCount: genEssayCount,
                    difficulty: genDifficulty,
                    replaceExisting: genReplaceExisting,
                  });
                }}>
                {generateQuestions.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />出題中...</> : <><Sparkles className="w-4 h-4 mr-2" />確定出題</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 一鍵全部出考題 Dialog */}
        <Dialog open={showBatchGenQDialog} onOpenChange={open => { setShowBatchGenQDialog(open); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-green-600" />
                一鍵全部出考題
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">對課程「{selectedCourse?.title}」下所有有知識點的單元自動出題。</p>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">選擇題題數</p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 5, 10, 15, 20].map(n => (
                    <button key={n}
                      onClick={() => setBatchGenChoiceCount(n)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        batchGenChoiceCount === n
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}>
                      {n === 0 ? '不出' : `${n} 題`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">簡答題題數</p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 3, 5, 10].map(n => (
                    <button key={n}
                      onClick={() => setBatchGenEssayCount(n)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        batchGenEssayCount === n
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                      }`}>
                      {n === 0 ? '不出' : `${n} 題`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">難易度</p>
                <div className="flex gap-2 flex-wrap">
                  {([['easy','簡單'],['medium','中等'],['hard','困難'],['mixed','混合']] as const).map(([v,l]) => (
                    <button key={v}
                      onClick={() => setBatchGenDifficulty(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        batchGenDifficulty === v
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="batchOnlyWithout" checked={batchGenOnlyWithout}
                  onChange={e => setBatchGenOnlyWithout(e.target.checked)}
                  className="w-4 h-4 rounded" />
                <label htmlFor="batchOnlyWithout" className="text-sm text-gray-700">只對尚無考題的單元出題（建議勾選）</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="batchReplaceExisting" checked={batchGenReplaceExisting}
                  onChange={e => setBatchGenReplaceExisting(e.target.checked)}
                  className="w-4 h-4 rounded" />
                <label htmlFor="batchReplaceExisting" className="text-sm text-gray-700">取代現有題目（勾選後會先清除該單元所有題目）</label>
              </div>
              {batchGenChoiceCount === 0 && batchGenEssayCount === 0 && (
                <p className="text-sm text-red-500">請至少選擇一種題型的題數</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchGenQDialog(false)}>取消</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={batchGenerateQuestions.isPending || (batchGenChoiceCount === 0 && batchGenEssayCount === 0)}
                onClick={() => {
                  if (!selectedCourse?.id) return;
                  batchGenerateQuestions.mutate({
                    courseId: selectedCourse.id,
                    choiceCount: batchGenChoiceCount,
                    essayCount: batchGenEssayCount,
                    difficulty: batchGenDifficulty,
                    replaceExisting: batchGenReplaceExisting,
                    onlyWithoutQuestions: batchGenOnlyWithout,
                  });
                }}>
                {batchGenerateQuestions.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />出題中...</>
                  : <><FileQuestion className="w-4 h-4 mr-2" />確定出題</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 題目管理 Dialog */}
        <Dialog open={showQManageDialog} onOpenChange={open => { setShowQManageDialog(open); if (!open) setEditingQuestion(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-blue-600" />
                題目管理 — {qManageUnitTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 搜尋與筛選 */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="搜尋題目..." className="pl-9" value={qSearch}
                    onChange={e => setQSearch(e.target.value)} />
                </div>
                <div className="flex gap-1">
                  {(["all", "choice", "essay"] as const).map(t => (
                    <button key={t} onClick={() => setQTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        qTypeFilter === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}>
                      {t === "all" ? "全部" : t === "choice" ? "選擇題" : "簡答題"}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={refetchQList}><RefreshCw className="w-4 h-4" /></Button>
              </div>

              {/* 題目列表 */}
              {!qList?.length ? (
                <div className="text-center py-10 text-gray-400">此單元尚無題目，請先點擊「出考題」生成</div>
              ) : (
                <div className="space-y-3">
                  {qList.map((q, idx) => (
                    <div key={q.id} className="border border-gray-200 rounded-xl p-4">
                      {editingQuestion?.id === q.id ? (
                        /* 編輯模式 */
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              q.questionType === "choice" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                            }`}>{q.questionType === "choice" ? "選擇題" : "簡答題"}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              q.difficulty === "easy" ? "bg-green-100 text-green-700" :
                              q.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                            }`}>{q.difficulty === "easy" ? "簡單" : q.difficulty === "hard" ? "困難" : "中等"}</span>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">題目</label>
                            <Textarea rows={3} value={editingQuestion.questionText}
                              onChange={e => setEditingQuestion((prev: any) => ({ ...prev, questionText: e.target.value }))} />
                          </div>
                          {q.questionType === "choice" && (
                            <div className="grid grid-cols-2 gap-2">
                              {(["optionA", "optionB", "optionC", "optionD"] as const).map((opt, oi) => (
                                <div key={opt}>
                                  <label className="text-xs font-medium text-gray-500 mb-1 block">{["A","B","C","D"][oi]}</label>
                                  <Input value={editingQuestion[opt] ?? ""}
                                    onChange={e => setEditingQuestion((prev: any) => ({ ...prev, [opt]: e.target.value }))} />
                                </div>
                              ))}
                              <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">正確答案</label>
                                <select value={editingQuestion.correctAnswer ?? "A"}
                                  onChange={e => setEditingQuestion((prev: any) => ({ ...prev, correctAnswer: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                  {["A","B","C","D"].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                          {q.questionType === "essay" && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 mb-1 block">參考答案</label>
                              <Textarea rows={4} value={editingQuestion.referenceAnswer ?? ""}
                                onChange={e => setEditingQuestion((prev: any) => ({ ...prev, referenceAnswer: e.target.value }))} />
                            </div>
                          )}
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">解析</label>
                            <Textarea rows={2} value={editingQuestion.explanation ?? ""}
                              onChange={e => setEditingQuestion((prev: any) => ({ ...prev, explanation: e.target.value }))} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingQuestion(null)}>取消</Button>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={updateQuestion.isPending}
                              onClick={() => updateQuestion.mutate({
                                id: editingQuestion.id,
                                questionText: editingQuestion.questionText,
                                optionA: editingQuestion.optionA,
                                optionB: editingQuestion.optionB,
                                optionC: editingQuestion.optionC,
                                optionD: editingQuestion.optionD,
                                correctAnswer: editingQuestion.correctAnswer,
                                referenceAnswer: editingQuestion.referenceAnswer,
                                explanation: editingQuestion.explanation,
                              })}>
                              {updateQuestion.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "儲存"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* 顯示模式 */
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                q.questionType === "choice" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                              }`}>{q.questionType === "choice" ? "選擇題" : "簡答題"}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                q.difficulty === "easy" ? "bg-green-100 text-green-700" :
                                q.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                              }`}>{q.difficulty === "easy" ? "簡單" : q.difficulty === "hard" ? "困難" : "中等"}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" onClick={() => setEditingQuestion({ ...q })}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteQId(q.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-800 font-medium mb-2">{q.questionText}</p>
                          {q.questionType === "choice" && (
                            <div className="grid grid-cols-2 gap-1 text-sm">
                              {["A","B","C","D"].map((opt, oi) => {
                                const val = [q.optionA, q.optionB, q.optionC, q.optionD][oi];
                                const isCorrect = q.correctAnswer === opt;
                                return val ? (
                                  <div key={opt} className={`flex items-start gap-1 px-2 py-1 rounded ${
                                    isCorrect ? "bg-green-50 text-green-700 font-medium" : "text-gray-600"
                                  }`}>
                                    <span className="font-mono shrink-0">{opt}.</span>
                                    <span>{val}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                          {q.questionType === "essay" && q.referenceAnswer && (
                            <div className="mt-2 bg-orange-50 rounded-lg p-2 text-sm text-orange-800">
                              <span className="font-medium">參考答案：</span>{q.referenceAnswer}
                            </div>
                          )}
                          {q.explanation && (
                            <div className="mt-1 text-xs text-gray-400">解析：{q.explanation}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 刪除題目確認 */}
        <AlertDialog open={!!deleteQId} onOpenChange={open => { if (!open) setDeleteQId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除題目</AlertDialogTitle>
              <AlertDialogDescription>此操作不可復原，確定要刪除這道題目嗎？</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteQId && deleteQuestion.mutate({ id: deleteQId })}>
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 單元 Dialog */}
        <Dialog open={showUnitDialog} onOpenChange={(open) => { setShowUnitDialog(open); if (!open) { setEditingUnitId(null); setShowVideoPreview(false); setUrlResolveStatus("idle"); setResolvedVideoUrl(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUnit?.id ? "編輯單元" : "新增單元"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">單元標題</label>
                <Input
                  value={editingUnit?.title ?? ""}
                  onChange={e => setEditingUnit(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  placeholder="例：網路通訊基礎概念 — 前言"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">影片連結</label>
                <div className="flex gap-2">
                  <Input
                    value={editingUnit?.videoUrl ?? ""}
                    onChange={e => {
                      setEditingUnit(prev => prev ? { ...prev, videoUrl: e.target.value } : prev);
                      setUrlResolveStatus("idle");
                      setResolvedVideoUrl(null);
                    }}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (!val) return;
                      // 如果是 ibrain 網頁連結，自動解析
                      if ((val.includes("ibrain.com.tw") || val.includes(".aspx")) && !val.includes(".m3u8")) {
                        setUrlResolveStatus("resolving");
                        resolveVideoUrl.mutate({ url: val });
                      }
                    }}
                    placeholder="YouTube 連結或影片 ID / ibrain 網頁連結 / HLS(.m3u8) / MP4"
                    className="flex-1"
                  />
                  {(editingUnit?.videoUrl?.includes("ibrain.com.tw") || editingUnit?.videoUrl?.includes(".aspx")) &&
                    !editingUnit?.videoUrl?.includes(".m3u8") && (
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 whitespace-nowrap flex items-center gap-1"
                      disabled={urlResolveStatus === "resolving"}
                      onClick={() => {
                        const val = editingUnit?.videoUrl?.trim();
                        if (!val) return;
                        setUrlResolveStatus("resolving");
                        resolveVideoUrl.mutate({ url: val });
                      }}
                    >
                      {urlResolveStatus === "resolving" ? (
                        <><span className="animate-spin inline-block w-3 h-3 border border-purple-500 border-t-transparent rounded-full" /> 解析中...</>
                      ) : (
                        <>🔗 解析 HLS</>
                      )}
                    </button>
                  )}
                </div>
                {urlResolveStatus === "resolved" && resolvedVideoUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">✅ 已解析為 HLS 串流 URL</p>
                )}
                {urlResolveStatus === "error" && (
                  <p className="text-xs text-red-500 mt-1">⚠️ 自動解析失敗，請手動輸入 HLS URL</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400 flex-1">支援 YouTube 連結或影片 ID、ibrain 網頁連結（自動解析 HLS）、.m3u8 串流、MP4 直連</p>
                  {editingUnit?.videoUrl && (
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 whitespace-nowrap flex items-center gap-1 shrink-0"
                      onClick={() => setShowVideoPreview(v => !v)}
                    >
                      {showVideoPreview ? <>🔺 關閉預覽</> : <>🎥 預覽影片</>}
                    </button>
                  )}
                </div>
                {/* 即時預覽播放器 */}
                {showVideoPreview && editingUnit?.videoUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                    <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1">
                      🎥 影片預覽（不需儲存，確認影片是否正確）
                    </div>
                    <VideoPlayer
                      url={editingUnit.videoUrl}
                      className="aspect-video w-full"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">SRT 字幕</label>
                <div className="flex items-center gap-2 mb-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => srtFileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> 選擇 .srt 檔案
                  </Button>
                  {editingUnit?.srtContent && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> 已載入字幕（{editingUnit.srtContent.length} 字元）
                    </span>
                  )}
                </div>
                <input ref={srtFileRef} type="file" accept=".srt" className="hidden" onChange={handleSrtUpload} />
                <Textarea
                  value={editingUnit?.srtContent ?? ""}
                  onChange={e => setEditingUnit(prev => prev ? { ...prev, srtContent: e.target.value } : prev)}
                  placeholder={`1\n00:00:00,000 --> 00:00:05,000\n字幕內容...\n\n或直接貼上 SRT 檔案內容`}
                  className="font-mono text-xs resize-none overflow-y-auto"
                  style={{ height: "120px" }}
                />
                <p className="text-xs text-gray-400 mt-1">可上傳 .srt 檔案或直接貼上 SRT 內容，儲存後可使用「AI 一鍵處理」自動校正字幕並生成知識點</p>
              </div>
              {/* 知識點區塊（編輯模式才顯示） */}
              {editingUnit?.id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">知識點（{editingUnitFull?.knowledgePoints?.length ?? 0} 個）</label>
                    {editingUnit.srtContent && (
                      <Button
                        type="button" size="sm" variant="outline"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => processUnit.mutate({ unitId: editingUnit.id! })}
                        disabled={processUnit.isPending}
                      >
                        {processUnit.isPending && processUnit.variables?.unitId === editingUnit.id
                          ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          : <Sparkles className="w-3 h-3 mr-1" />}
                        AI 重新生成
                      </Button>
                    )}
                  </div>
                  {!editingUnitFull?.knowledgePoints?.length ? (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">
                      尚無知識點。請上傳 SRT 後點擊「AI 重新生成」。
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {editingUnitFull.knowledgePoints.map((kp, i) => (
                        <div key={kp.id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          {dialogEditingKP?.id === kp.id ? (
                            <div className="space-y-1.5">
                              <input
                                className="w-full text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
                                value={dialogEditingKP.title}
                                onChange={e => setDialogEditingKP(prev => prev ? { ...prev, title: e.target.value } : prev)}
                                placeholder="知識點標題"
                              />
                              <textarea
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                rows={3}
                                value={dialogEditingKP.summary}
                                onChange={e => setDialogEditingKP(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                                placeholder="摘要"
                              />
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>開始秒數</span>
                                <input type="number" className="w-16 border border-gray-200 rounded px-1 py-0.5 text-xs" value={dialogEditingKP.startSec} onChange={e => setDialogEditingKP(prev => prev ? { ...prev, startSec: parseInt(e.target.value) || 0 } : prev)} />
                                <span>結束秒數</span>
                                <input type="number" className="w-16 border border-gray-200 rounded px-1 py-0.5 text-xs" value={dialogEditingKP.endSec} onChange={e => setDialogEditingKP(prev => prev ? { ...prev, endSec: parseInt(e.target.value) || 0 } : prev)} />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1" onClick={() => setDialogEditingKP(null)}>取消</button>
                                <button
                                  className="text-xs bg-blue-500 text-white rounded px-3 py-1 hover:bg-blue-600 disabled:opacity-50"
                                  disabled={updateKP.isPending}
                                  onClick={() => updateKP.mutate(dialogEditingKP)}
                                >
                                  {updateKP.isPending ? "儲存中…" : "儲存"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 group">
                              <span className="text-xs font-bold text-blue-500 mt-0.5 shrink-0">#{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{kp.title}</p>
                                {kp.summary && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{kp.summary}</p>}
                                <p className="text-xs text-gray-400 mt-0.5">{Math.floor(kp.startSec/60)}:{String(kp.startSec%60).padStart(2,'0')} ~ {Math.floor(kp.endSec/60)}:{String(kp.endSec%60).padStart(2,'0')}</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50"
                                  onClick={() => setDialogEditingKP({ id: kp.id, title: kp.title, summary: kp.summary ?? "", startSec: kp.startSec, endSec: kp.endSec })}
                                >✒️</button>
                                <button
                                  className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50"
                                  onClick={() => { if (confirm(`確認刪除「${kp.title}」？`)) deleteKP.mutate({ id: kp.id }); }}
                                >🗑️</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnitDialog(false)}>取消</Button>
              <Button onClick={() => {
                if (!editingUnit?.title.trim() || !selectedCourseId) return;
                if (editingUnit.id) {
                  const updateData: any = { id: editingUnit.id, title: editingUnit.title, videoUrl: editingUnit.videoUrl };
                  if (editingUnit.srtContent) updateData.srtContent = editingUnit.srtContent;
                  updateUnit.mutate(updateData);
                } else {
                  createUnit.mutate({
                    courseId: selectedCourseId,
                    title: editingUnit.title,
                    videoUrl: editingUnit.videoUrl || undefined,
                    srtContent: editingUnit.srtContent || undefined,
                  });
                }
              }} disabled={createUnit.isPending || updateUnit.isPending}>
                {(createUnit.isPending || updateUnit.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                儲存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 別除確認 */}
        <AlertDialog open={!!deleteUnitId} onOpenChange={() => setDeleteUnitId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認別除單元？</AlertDialogTitle>
              <AlertDialogDescription>此操作將別除單元及其所有知識點，無法復原。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => {
                if (deleteUnitId) deleteUnit.mutate({ id: deleteUnitId });
                setDeleteUnitId(null);
              }}>別除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 批次別除確認 */}
        <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認批次別除 {selectedUnitIds.size} 個單元？</AlertDialogTitle>
              <AlertDialogDescription>此操作將別除選中的單元及其所有知識點，無法復原。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600"
                onClick={() => batchDeleteUnits.mutate({ ids: Array.from(selectedUnitIds) })}
                disabled={batchDeleteUnits.isPending}>
                {batchDeleteUnits.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                別除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 批次建立單元 Dialog */}
        <Dialog open={showBatchDialog} onOpenChange={(open) => { setShowBatchDialog(open); if (!open) setBatchSegments([]); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>批次建立單元</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {/* Step 1: 匯入 JSON */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 1：匯入 segments.json</p>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => batchJsonRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> 選擇 segments.json
                  </Button>
                  {batchSegments.length > 0 && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> 已讀入 {batchSegments.length} 個段落
                    </span>
                  )}
                </div>
                <input ref={batchJsonRef} type="file" accept=".json" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const json = JSON.parse(ev.target?.result as string);
                      const segs = json.suggested_segments ?? [];
                      setBatchSegments(segs.map((s: any) => ({
                        part: s.part,
                        label: s.label,
                        start: s.start,
                        end: s.end,
                        reason: s.reason || "",
                        srtContent: "",
                        videoUrl: "",
                      })));
                    } catch { toast.error("文件格式錯誤，請上傳正確的 segments.json"); }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }} />
              </div>

              {/* Step 2: 批次上傳所有 SRT */}
              {batchSegments.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Step 2：批次上傳所有 SRT 檔案</p>
                  <p className="text-xs text-gray-400 mb-3">檔名需包含 _part1、_part2... 系統自動對應段落</p>
                  <div className="flex items-center gap-3 mb-4">
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".srt";
                      input.multiple = true;
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files ?? []);
                        files.forEach(file => {
                          const nameMatch = file.name.match(/_part(\d+)/i);
                          const partNum = nameMatch ? parseInt(nameMatch[1]) : null;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const content = ev.target?.result as string;
                            setBatchSegments(prev => prev.map(s =>
                              s.part === partNum ? { ...s, srtContent: content } : s
                            ));
                          };
                          reader.readAsText(file);
                        });
                      };
                      input.click();
                    }}>
                      <Upload className="w-4 h-4 mr-2" /> 一次選取所有 SRT
                    </Button>
                    <span className="text-xs text-gray-400">
                      已載入：{batchSegments.filter(s => s.srtContent).length} / {batchSegments.length} 個
                    </span>
                  </div>
                  <div className="space-y-3">
                    {batchSegments.map((seg, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Part {seg.part}</span>
                          <span className="text-sm font-medium text-gray-800 flex-1">{seg.label}</span>
                          <span className="text-xs text-gray-400">{seg.start} ~ {seg.end}</span>
                          {seg.srtContent
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <span className="text-xs text-orange-400">未載入</span>}
                        </div>
                        <Input
                          className="text-xs h-8"
                          placeholder="YouTube 連結（可空白）"
                          value={seg.videoUrl}
                          onChange={(e) => setBatchSegments(prev => prev.map((s, i) => i === idx ? { ...s, videoUrl: e.target.value } : s))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowBatchDialog(false); setBatchSegments([]); }}>取消</Button>
              <Button
                disabled={batchSegments.length === 0 || batchCreateUnits.isPending}
                onClick={() => {
                  if (!selectedCourseId) return;
                  batchCreateUnits.mutate({
                    courseId: selectedCourseId,
                    units: batchSegments.map(seg => ({
                      title: seg.label,
                      description: seg.reason || undefined,
                      videoUrl: seg.videoUrl || undefined,
                      srtContent: seg.srtContent || undefined,
                      videoStartSec: parseTimeToSec(seg.start),
                      videoEndSec: parseTimeToSec(seg.end),
                      // 直接從 segments.json 建立知識點（不需 AI）
                      knowledgePoints: [{
                        title: seg.label,
                        summary: seg.reason || undefined,
                        startSec: parseTimeToSec(seg.start),
                        endSec: parseTimeToSec(seg.end),
                      }],
                    })),
                  });
                }}
              >
                {batchCreateUnits.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                建立 {batchSegments.length} 個單元
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    );
  }

  // 單元詳情頁（知識點管理）
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 頁首列 */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setView("units")}>
          <ChevronLeft className="w-4 h-4 mr-1" /> 返回單元列表
        </Button>
        <div className="h-5 w-px bg-gray-300" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{unitDetail?.title}</h1>
          <p className="text-gray-500 text-sm">知識點管理</p>
        </div>
        {(unitDetail?.srtContent || unitDetail?.hasSrt) && unitDetail.aiStatus !== "processing" && (
          <Button variant="outline" className="text-purple-600 border-purple-200"
            onClick={() => processUnit.mutate({ unitId: unitDetail.id })}
            disabled={processUnit.isPending}>
            {processUnit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            重新 AI 處理
          </Button>
        )}
      </div>

      {/* 左右分欄主區 */}
      <div className="flex gap-6 items-start">
        {/* 左欄：知識點列表 + 字幕對照（可捲動） */}
        {/* 右欄：影片 + 字幕（sticky 固定） */}
        {unitDetail?.videoUrl && (
          <div className="sticky top-4 flex flex-col items-center shrink-0 order-2" style={{ width: "min(820px, 60%)" }}>
            <VideoPlayer
              ref={videoPlayerRef}
              url={unitDetail.videoUrl}
              seekTo={videoSeekTo}
              onTimeUpdate={setVideoCurrentSec}
              className="rounded-xl overflow-hidden w-full aspect-video"
            />
            {/* 同步字幕欄（可點擊編輯） */}
            <div className="mt-1 bg-black rounded-lg px-4 py-2 min-h-[44px] w-full">
              {editingSubtitle !== null ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1 outline-none border border-blue-400"
                    value={editingSubtitle.text}
                    onChange={e => setEditingSubtitle(prev => prev ? { ...prev, text: e.target.value } : prev)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); handleSubtitleEdit(); }
                      if (e.key === "Escape") setEditingSubtitle(null);
                    }}
                  />
                  <button
                    className="text-xs bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 shrink-0"
                    onClick={handleSubtitleEdit}
                    disabled={updateCorrectedSrtMutation.isPending}
                  >
                    {updateCorrectedSrtMutation.isPending ? "儲存中…" : "儲存"}
                  </button>
                  <button
                    className="text-xs text-gray-400 hover:text-white shrink-0"
                    onClick={() => { setEditingSubtitle(null); resumeVideo(); }}
                  >取消</button>
                </div>
              ) : currentSubtitleInfo.text ? (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  title="點擊編輯此字幕"
                  onClick={() => { pauseVideo(); setEditingSubtitle({ idx: currentSubtitleInfo.idx, text: currentSubtitleInfo.text }); }}
                >
                  <p className="text-white text-sm text-center leading-relaxed flex-1">{currentSubtitleInfo.text}</p>
                  <span className="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">✏️ 點擊編輯</span>
                </div>
              ) : (
                <p className="text-gray-500 text-xs text-center">字幕同步中…</p>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-400 flex items-center gap-1 self-start">
              <span>⏱ 當前播放位置：</span>
              <span className="font-mono font-semibold text-blue-600">{secToTime(Math.floor(videoCurrentSec))}（{Math.floor(videoCurrentSec)} 秒）</span>
            </div>
          </div>
        )}

        {/* 左欄：知識點列表 + 字幕對照（可捲動） */}
        <div className="flex-1 min-w-0 order-1">

        {/* 知識點列表 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            知識點（{unitDetail?.knowledgePoints?.length ?? 0} 個）
          </h2>
          {unitDetail && (
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => { setNewKP({ title: "", startSec: Math.floor(videoCurrentSec), endSec: Math.floor(videoCurrentSec) + 60 }); setShowAddKP(true); }}>
              <Plus className="w-4 h-4 mr-1" /> 新增知識點
            </Button>
          )}
        </div>

        {!unitDetail?.knowledgePoints?.length ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>尚未生成知識點</p>
            <p className="text-sm mt-1">請上傳 SRT 字幕後使用「AI 一鍵處理」自動生成</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unitDetail.knowledgePoints.map((kp, idx) => {
              return <div key={kp.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {editingKP?.id === kp.id ? (
                <div className="space-y-3">
                  <Input value={editingKP.title} onChange={e => setEditingKP(prev => prev ? { ...prev, title: e.target.value } : prev)} placeholder="知識點標題" />
                  <Textarea value={editingKP.summary} onChange={e => setEditingKP(prev => prev ? { ...prev, summary: e.target.value } : prev)} placeholder="摘要" rows={3} />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">開始（秒）</label>
                      <div className="flex gap-1 items-center">
                        <Input type="number" value={editingKP.startSec} onChange={e => setEditingKP(prev => prev ? { ...prev, startSec: parseInt(e.target.value) || 0 } : prev)} />
                        <Button type="button" variant="outline" size="sm" className="shrink-0 text-blue-600 border-blue-200 px-2"
                          title={`帶入當前時間 ${Math.floor(videoCurrentSec)}s`}
                          onClick={() => setEditingKP(prev => prev ? { ...prev, startSec: Math.floor(videoCurrentSec) } : prev)}>
                          📍
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">結束（秒）</label>
                      <div className="flex gap-1 items-center">
                        <Input type="number" value={editingKP.endSec} onChange={e => setEditingKP(prev => prev ? { ...prev, endSec: parseInt(e.target.value) || 0 } : prev)} />
                        <Button type="button" variant="outline" size="sm" className="shrink-0 text-blue-600 border-blue-200 px-2"
                          title={`帶入當前時間 ${Math.floor(videoCurrentSec)}s`}
                          onClick={() => setEditingKP(prev => prev ? { ...prev, endSec: Math.floor(videoCurrentSec) } : prev)}>
                          📍
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingKP(null)}>取消</Button>
                    <Button size="sm" onClick={() => updateKP.mutate(editingKP)} disabled={updateKP.isPending}>儲存</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{kp.title}</h4>
                    {kp.summary && <p className="text-sm text-gray-600 mt-1">{kp.summary}</p>}
                    <button
                      className="flex items-center gap-2 mt-2 text-xs text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                      title="點擊跳轉到此時間點"
                      onClick={() => seekVideo(kp.startSec)}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{secToTime(kp.startSec)} — {secToTime(kp.endSec)}</span>
                      <span className="text-gray-400">▶</span>
                    </button>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingKP({ id: kp.id, title: kp.title, summary: kp.summary ?? "", startSec: kp.startSec, endSec: kp.endSec })}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteKP.mutate({ id: kp.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>;
            })}
          </div>
        )}

          {/* 新增知識點 Dialog */}
          <Dialog open={showAddKP} onOpenChange={setShowAddKP}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" /> 新增知識點
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">知識點標題 *</label>
                  <Input
                    placeholder="請輸入知識點標題"
                    value={newKP.title}
                    onChange={e => setNewKP(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">開始時間（秒）</label>
                    <div className="flex gap-1">
                      <Input type="number" min={0} value={newKP.startSec}
                        onChange={e => setNewKP(prev => ({ ...prev, startSec: parseInt(e.target.value) || 0 }))} />
                      <Button type="button" variant="outline" size="sm" className="shrink-0 px-2 text-blue-600 border-blue-200"
                        title={`帶入影片當前時間 ${Math.floor(videoCurrentSec)}s`}
                        onClick={() => setNewKP(prev => ({ ...prev, startSec: Math.floor(videoCurrentSec) }))}>📍</Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{secToTime(newKP.startSec)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">結束時間（秒）</label>
                    <div className="flex gap-1">
                      <Input type="number" min={0} value={newKP.endSec}
                        onChange={e => setNewKP(prev => ({ ...prev, endSec: parseInt(e.target.value) || 0 }))} />
                      <Button type="button" variant="outline" size="sm" className="shrink-0 px-2 text-blue-600 border-blue-200"
                        title={`帶入影片當前時間 ${Math.floor(videoCurrentSec)}s`}
                        onClick={() => setNewKP(prev => ({ ...prev, endSec: Math.floor(videoCurrentSec) }))}>📍</Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{secToTime(newKP.endSec)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                  <p className="font-medium mb-1">✨ AI 自動生成摘要</p>
                  <p>存入後，AI 會從字幕中擷取指定時間範圍的內容，自動生成摘要。新增後會依開始時間自動排序。</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddKP(false)}>取消</Button>
                <Button
                  disabled={!newKP.title.trim() || newKP.startSec >= newKP.endSec || addKP.isPending}
                  onClick={() => addKP.mutate({ unitId: unitDetail!.id, title: newKP.title.trim(), startSec: newKP.startSec, endSec: newKP.endSec })}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  {addKP.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> AI 生成中...</> : <><Sparkles className="w-4 h-4 mr-1" /> 儲存並生成摘要</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 字幕對照檢視器 */}
          {unitDetail?.srtContent && unitDetail?.correctedSrt && (
            <SrtDiffViewer
              original={unitDetail.srtContent}
              corrected={unitDetail.correctedSrt}
              unitId={unitDetail.id}
              onSaved={refetchUnitDetail}
              currentSec={videoCurrentSec}
            />
          )}
          {unitDetail?.correctedSrt && !unitDetail?.srtContent && (
            <div className="mt-6">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                AI 校正後字幕
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{unitDetail.correctedSrt}</pre>
              </div>
            </div>
          )}
        </div> {/* 右欄結束 */}
      </div> {/* flex 分欄結束 */}
    </div>
  );
}
