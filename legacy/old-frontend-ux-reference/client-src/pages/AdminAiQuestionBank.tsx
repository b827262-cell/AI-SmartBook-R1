/**
 * 智能題庫 - 後台管理頁面
 * 功能：素材管理（上傳 PDF/Word 或貼 URL）、AI 出題、題庫管理（含題目編輯）
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Link, FileText, Trash2, RefreshCw, RotateCcw, Plus, BookOpen,
  Eye, EyeOff, Edit, Check, X, ChevronDown, ChevronUp, Loader2,
  Brain, Settings, AlertCircle, CheckCircle, CheckCircle2, Clock, Search, Filter,
  CheckSquare, Square, Archive, Globe, Lock, Download, FileSpreadsheet,
  GraduationCap, FlaskConical, SendToBack, FileDown, BarChart2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ==================== 素材管理 Tab ====================
function SourcesTab({ onNavigateToExams }: { onNavigateToExams?: (examId?: number) => void }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  // 搜尋/篩選/分頁狀態
  const [searchText, setSearchText] = useState('');
  const [filterSourceType, setFilterSourceType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterExtracted, setFilterExtracted] = useState<string>('all'); // all / extracted / not_extracted
  const [filterExamGroupSources, setFilterExamGroupSources] = useState<string>('all'); // 考試類別篩選
  const [filterOrigin, setFilterOrigin] = useState<string>('all'); // 來源篩選
  const [filterNoExam, setFilterNoExam] = useState<boolean>(false); // true=尚未出題
  const [filterQuestionType, setFilterQuestionType] = useState<string>('all'); // all / multiple_choice / essay / mixed
  // 自訂常用關鍵字標籤（localStorage 儲存）
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_source_tags') || '[]'); } catch { return []; }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const PAGE_SIZE = pageSize;
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'scrape'>('file');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    sourceType: 'lecture' as 'lecture' | 'exam',
    category: '',
    year: '',
    examGroup: '',
    teacherName: '',
    fileUrl: '',
    fileType: 'pdf' as 'pdf' | 'word',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // 編輯素材對話框
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', sourceType: 'lecture' as 'lecture' | 'exam', category: '', year: '', examGroup: '', teacherName: '' });
  // 批次上傳
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; fileName: string; done: boolean }>({ current: 0, total: 0, fileName: '', done: false });
  const [batchResults, setBatchResults] = useState<Array<{ id: number; fileName: string; title: string }>>([]);
  const [batchEditRows, setBatchEditRows] = useState<Array<{ id: number; title: string; sourceType: 'lecture' | 'exam'; category: string; year: string; examGroup: string; teacherName: string }>>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // 爬取高上公職頁面狀態
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeItems, setScrapeItems] = useState<Array<{
    no: number; group: string; subject: string; year: string;
    downloadUrl: string; title: string; selected: boolean;
    category: string;
  }>>([]); 
  const [scrapeInfo, setScrapeInfo] = useState<{ totalPages: number; totalItems: number; currentPage: number } | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState<'downloading' | 'done'>('downloading');
  const [importResults, setImportResults] = useState<Array<{ title: string; success: boolean; error?: string; skipped?: boolean }> | null>(null);
  const [importSkippedCount, setImportSkippedCount] = useState(0);
  // 篩選器狀態
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterType, setFilterType] = useState('D'); // D=依科目, P=依類組, YEAR=只依年度
  const [filterYear, setFilterYear] = useState(''); // 年度篩選（民國年，如 114）
  const [filterExamGroup, setFilterExamGroup] = useState(''); // 考試類別 iDG 參數（空=全部）
  // 多頁匯入狀態
  const [multiPageMode, setMultiPageMode] = useState(false);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [isScrapingPages, setIsScrapingPages] = useState(false);

  const scrapeGoldensunMutation = trpc.aiSources.scrapeGoldensun.useMutation();
  const scrapeGoldensunPagesMutation = trpc.aiSources.scrapeGoldensunPages.useMutation();
  const batchImportMutation = trpc.aiSources.batchImportFromUrl.useMutation();

  // ==================== 一鍵同步高上考古題 ====================
  const [syncJobId, setSyncJobId] = useState<number | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncExamGroup, setSyncExamGroup] = useState('');
  const [syncFilterYear, setSyncFilterYear] = useState('');

  const startSyncMutation = trpc.aiSources.startSync.useMutation({
    onSuccess: (res) => {
      setSyncJobId(res.jobId);
      toast.success('同步任務已啟動，背景爬取中...');
      setShowSyncDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelSyncMutation = trpc.aiSources.cancelSync.useMutation({
    onSuccess: () => {
      setSyncJobId(null);
      toast.success('同步已停止');
      refetchLatestSync();
    },
    onError: (e) => toast.error('停止失敗：' + e.message),
  });

  const { data: latestSync, refetch: refetchLatestSync } = trpc.aiSources.getLatestSync.useQuery(undefined, {
    refetchInterval: syncJobId ? 3000 : false,
  });

  const { data: syncStatus } = trpc.aiSources.getSyncStatus.useQuery(
    { jobId: syncJobId! },
    {
      enabled: syncJobId !== null,
      refetchInterval: (query) => {
        const status = (query?.state?.data as any)?.status;
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          setSyncJobId(null);
          utils.aiSources.list.invalidate();
          if (status === 'completed') toast.success(`同步完成！新導入 ${(query?.state?.data as any)?.new_imported ?? 0} 筆，跳過 ${(query?.state?.data as any)?.skipped ?? 0} 筆重複`);
          else if (status === 'failed') toast.error(`同步失敗：${(query?.state?.data as any)?.error_message}`);
          // cancelled 已由 cancelSyncMutation.onSuccess 處理
          return false;
        }
        return status === 'running' || status === 'pending' ? 3000 : false;
      },
    }
  );

  const activeSyncData = syncJobId ? syncStatus : latestSync;
  const isSyncing = syncJobId !== null || (activeSyncData as any)?.status === 'running' || (activeSyncData as any)?.status === 'pending';

  // 民國年轉西元年（如 114 → 2025）
  const rocToAD = (roc: string): string => {
    const n = parseInt(roc);
    if (isNaN(n) || n <= 0) return '';
    return String(n + 1911);
  };

  // 考試類別選項（iDG 參數）
  const EXAM_GROUPS = [
    { value: '', label: '全部考試類別' },
    { value: '3', label: '高普考試' },
    { value: '4', label: '初等考試' },
    { value: '5', label: '地方特考' },
    { value: '6', label: '其他特考' },
  ];

  // 組合篩選 URL（支援 iDG + sFilter + sFilterType + sFilterDate，年度自動轉西元）
  const buildFilteredUrl = (overrides?: { keyword?: string; type?: string; year?: string; examGroup?: string }) => {
    const base = 'https://goldensun.get.com.tw/exam/List.aspx';
    const params = new URLSearchParams();
    params.set('iPageNo', '1');
    const kw = overrides?.keyword !== undefined ? overrides.keyword : filterKeyword;
    const tp = overrides?.type !== undefined ? overrides.type : filterType;
    const yr = overrides?.year !== undefined ? overrides.year : filterYear;
    const eg = overrides?.examGroup !== undefined ? overrides.examGroup : filterExamGroup;
    const adYear = rocToAD(yr);
    if (eg) params.set('iDG', eg);
    if (tp === 'YEAR') {
      if (adYear) params.set('sFilterDate', adYear);
      params.set('sFilterType', '0');
    } else {
      if (kw) {
        params.set('sFilter', kw);
        params.set('sFilterType', tp);
        if (adYear) params.set('sFilterDate', adYear);
      } else if (adYear) {
        params.set('sFilterDate', adYear);
        params.set('sFilterType', '0');
      }
    }
    return `${base}?${params.toString()}`;
  };

  // 當任何篩選條件改變時自動更新 URL
  const applyFilter = (keyword: string, type: string, year?: string, examGroup?: string) => {
    const url = buildFilteredUrl({
      keyword,
      type,
      year: year !== undefined ? year : filterYear,
      examGroup: examGroup !== undefined ? examGroup : filterExamGroup,
    });
    // 如果所有條件都為空，清空 URL
    const hasAnyFilter = keyword.trim() || type === 'YEAR' || (year !== undefined ? year : filterYear) || (examGroup !== undefined ? examGroup : filterExamGroup);
    setScrapeUrl(hasAnyFilter ? url : '');
  };


  const handleScrape = async () => {
    const url = scrapeUrl || buildFilteredUrl();
    if (!url) { toast.error('請輸入頁面 URL 或選擇篩選條件'); return; }
    setIsScraping(true);
    setScrapeItems([]);
    setScrapeInfo(null);
    setImportResults(null);
    setImportSkippedCount(0);
    try {
      const result = await scrapeGoldensunMutation.mutateAsync({ url });
      setScrapeItems(result.items.map(item => ({
        ...item,
        selected: true,
        category: item.subject,
      })));
      setScrapeInfo({ totalPages: result.totalPages, totalItems: result.totalItems, currentPage: result.currentPage });
      // 自動設定多頁匯入的頁數範圍
      // 自動從 localStorage 讀取上次爬取的最後頁數
      const lastPageKey = `goldensun_last_page_${encodeURIComponent(scrapeUrl || buildFilteredUrl())}`;
      const savedLastPage = parseInt(localStorage.getItem(lastPageKey) || '0');
      const nextStart = savedLastPage > 0 ? Math.min(savedLastPage + 1, result.totalPages) : result.currentPage;
      setStartPage(nextStart);
      setEndPage(result.totalPages); // 預設填入總頁數
      if (savedLastPage > 0) {
        toast.success(`成功讀取 ${result.items.length} 筆考古題，共 ${result.totalPages} 頁（上次爬到第 ${savedLastPage} 頁，建議從第 ${nextStart} 頁繼續）`);
      } else {
        toast.success(`成功讀取 ${result.items.length} 筆考古題，共 ${result.totalPages} 頁`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleScrapeMultiPages = async () => {
    const url = scrapeUrl || buildFilteredUrl();
    if (!url) { toast.error('請先讀取第一頁或選擇篩選條件'); return; }
    if (endPage < startPage) { toast.error('結束頁不能小於開始頁'); return; }
    setIsScrapingPages(true);
    setScrapeItems([]);
    setImportResults(null);
    setImportSkippedCount(0);
    try {
      const result = await scrapeGoldensunPagesMutation.mutateAsync({
        baseUrl: url,
        startPage,
        endPage,
      });
      setScrapeItems(result.items.map(item => ({
        ...item,
        selected: true,
        category: item.subject,
      })));
      // 將最後爬取頁數儲存到 localStorage
      const lastPageKey = `goldensun_last_page_${encodeURIComponent(url)}`;
      localStorage.setItem(lastPageKey, String(endPage));
      toast.success(`成功讀取 ${result.items.length} 筆考古題（第 ${startPage}~${endPage} 頁），已記錄爬取進度`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsScrapingPages(false);
    }
  };

  const handleBatchImport = async () => {
    const selected = scrapeItems.filter(i => i.selected);
    if (selected.length === 0) { toast.error('請勾選要匯入的考古題'); return; }
    setIsImporting(true);
    setImportStage('downloading');
    setImportResults(null);
    setImportSkippedCount(0);
    try {
      const result = await batchImportMutation.mutateAsync({
        items: selected.map(item => ({
          title: item.title,
          sourceType: 'exam' as const,
          category: item.category || item.subject,
          year: item.year,
          examGroup: item.group,
          downloadUrl: item.downloadUrl,
        })),
      });
      setImportStage('done');
      setImportResults(result.results);
      setImportSkippedCount(result.skippedCount || 0);
      const skippedMsg = result.skippedCount > 0 ? `，已跳過 ${result.skippedCount} 筆重複` : '';
      toast.success(`成功下載並匯入 ${result.successCount} 筆考古題到 S3${skippedMsg}，AI 正在解析中...`);
      utils.aiSources.list.invalidate();
      // 匠入完成後 2 秒自動關閉 Dialog
      setTimeout(() => {
        setShowUploadDialog(false);
        resetForm();
      }, 2000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const openEditDialog = (source: any) => {
    setEditingSource(source);
    setEditForm({
      title: source.title || '',
      sourceType: source.sourceType || 'lecture',
      category: source.category || '',
      year: source.year || '',
      examGroup: source.examGroup || '',
      teacherName: source.teacherName || '',
    });
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBatchFiles(files);
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) { toast.error('請選擇檔案'); return; }
    setBatchUploading(true);
    setBatchProgress({ current: 0, total: batchFiles.length, fileName: '', done: false });
    setBatchResults([]);
    try {
      const formData = new FormData();
      batchFiles.forEach(f => formData.append('files', f));
      setBatchProgress(p => ({ ...p, fileName: '上傳中...' }));
      const resp = await fetch('/api/ai-question-source/batch-upload', { method: 'POST', body: formData });
      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = '上傳失敗';
        try { errMsg = JSON.parse(errText).error || errMsg; } catch { errMsg = errText.startsWith('<') ? `上傳失敗（HTTP ${resp.status}）` : errText || errMsg; }
        throw new Error(errMsg);
      }
      const data = await resp.json();
      setBatchResults(data.items || []);
      setBatchEditRows((data.items || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        sourceType: 'lecture' as 'lecture' | 'exam',
        category: '',
        year: '',
        examGroup: '',
        teacherName: '',
      })));
      setBatchProgress(p => ({ ...p, current: data.count, done: true }));
      toast.success(`成功上傳 ${data.count} 個素材，AI 正在分析欄位...`);
      utils.aiSources.list.invalidate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBatchUploading(false);
    }
  };

  const handleBatchSave = async () => {
    setBatchSaving(true);
    try {
      for (const row of batchEditRows) {
        await updateSourceMutation.mutateAsync({
          id: row.id,
          title: row.title || undefined,
          sourceType: row.sourceType,
          category: row.category || undefined,
          year: row.year || undefined,
          examGroup: row.examGroup || undefined,
          teacherName: row.teacherName || undefined,
        });
      }
      toast.success('已儲存所有素材資訊');
      utils.aiSources.list.invalidate();
      setShowBatchDialog(false);
      setBatchFiles([]);
      setBatchResults([]);
      setBatchEditRows([]);
      setBatchProgress({ current: 0, total: 0, fileName: '', done: false });
      if (batchFileInputRef.current) batchFileInputRef.current.value = '';
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBatchSaving(false);
    }
  };

  const updateSourceMutation = trpc.aiSources.update.useMutation({
    onSuccess: () => { toast.success('素材資訊已更新'); utils.aiSources.list.invalidate(); setEditingSource(null); },
    onError: (e) => toast.error(e.message),
  });

  // 追蹤正在提取中的素材 ID 與開始時間（用於 polling 和逾時偵測）——必須在 useQuery 之前宣告
  // Map<sourceId, startTimestamp>
  const [extractingMap, setExtractingMap] = useState<Map<number, number>>(new Map());
  const extractingSourceIds = Array.from(extractingMap.keys());
  // 追蹤批次提取進度：{ total: 總筆數, completed: 已完成筆數 }
  const [extractBatchProgress, setExtractBatchProgress] = useState<{ total: number; completed: number } | null>(null);
  // 逾時失敗的素材 ID → 失敗次數 Map<sourceId, failCount>
  const [failedSourceMap, setFailedSourceMap] = useState<Map<number, number>>(new Map());

  const queryInput = {
    search: searchText || undefined,
    sourceType: filterSourceType !== 'all' ? filterSourceType as 'lecture' | 'exam' : undefined,
    status: filterStatus !== 'all' ? filterStatus as 'processing' | 'ready' | 'error' : undefined,
    category: filterCategory !== 'all' ? filterCategory : undefined,
    extracted: filterExtracted === 'extracted' ? true : filterExtracted === 'not_extracted' ? false : undefined,
    examGroup: filterExamGroupSources !== 'all' ? filterExamGroupSources : undefined,
    sourceOrigin: filterOrigin !== 'all' ? filterOrigin as 'manual_upload' | 'goldensun_sync' | 'url_import' : undefined,
    noExam: filterNoExam ? true : undefined,
    questionTypeFilter: filterQuestionType !== 'all' ? filterQuestionType as 'multiple_choice' | 'essay' | 'mixed' : undefined,
    page: currentPage,
    pageSize: PAGE_SIZE,
  };
  // 不分頁的等僷篩選條件（用於全選所有頁）
  const allIdsQueryInput = {
    search: searchText || undefined,
    sourceType: filterSourceType !== 'all' ? filterSourceType as 'lecture' | 'exam' : undefined,
    status: filterStatus !== 'all' ? filterStatus as 'processing' | 'ready' | 'error' : undefined,
    category: filterCategory !== 'all' ? filterCategory : undefined,
    extracted: filterExtracted === 'extracted' ? true : filterExtracted === 'not_extracted' ? false : undefined,
    examGroup: filterExamGroupSources !== 'all' ? filterExamGroupSources : undefined,
    sourceOrigin: filterOrigin !== 'all' ? filterOrigin as 'manual_upload' | 'goldensun_sync' | 'url_import' : undefined,
    noExam: filterNoExam ? true : undefined,
    questionTypeFilter: filterQuestionType !== 'all' ? filterQuestionType as 'multiple_choice' | 'essay' | 'mixed' : undefined,
  };
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const { data: allIdsData } = trpc.aiSources.getAllIds.useQuery(allIdsQueryInput);
  const { data: sourcesData, isLoading, refetch } = trpc.aiSources.list.useQuery(queryInput, {
    refetchInterval: (query) => {
      // 如果有素材在處理中（PDF 解析），每 3 秒刷新
      const hasProcessing = (query?.state?.data as any)?.items?.some?.((s: any) => s.status === 'processing');
      // 如果有素材正在提取題目（polling），每 4 秒刷新
      if (hasProcessing) return 3000;
      if (extractingSourceIds.length > 0) return 4000;
      return false;
    },
  });
  const sources = sourcesData?.items ?? [];
  const totalCount = sourcesData?.total ?? 0;
  const totalPages = sourcesData?.totalPages ?? 1;

  // 當 sources 更新時，檢查正在提取的素材是否已完成或逾時
  useEffect(() => {
    if (extractingMap.size === 0) return;
    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 分鐘逾時
    const newMap = new Map(extractingMap);
    const newFailed: number[] = [];
    let completedCount = 0;

    for (const [id, startTime] of extractingMap.entries()) {
      const source = sources.find((s: any) => s.id === id);
      if (!source) {
        // 素材已被刪除，視為完成
        newMap.delete(id);
        completedCount++;
      } else if ((source as any).extractedQuestionsCount > 0) {
        // 已有提取題數，視為完成
        newMap.delete(id);
        completedCount++;
      } else if (now - startTime > TIMEOUT_MS) {
        // 超過 5 分鐘仍未完成，標記為失敗
        newMap.delete(id);
        newFailed.push(id);
      }
    }

    if (newMap.size !== extractingMap.size || newFailed.length > 0) {
      setExtractingMap(newMap);
      if (newFailed.length > 0) {
        setFailedSourceMap(prev => {
          const next = new Map(prev);
          newFailed.forEach(id => next.set(id, (next.get(id) ?? 0) + 1));
          return next;
        });
        toast.error(`${newFailed.length} 筆素材拆解逾時，請點擊「重新推送」重試`);
      }
      if (completedCount > 0) {
        toast.success(`${completedCount} 筆素材題目提取完成！`);
        // 更新批次進度
        setExtractBatchProgress(prev => {
          if (!prev) return null;
          const newCompleted = prev.completed + completedCount;
          if (newCompleted >= prev.total) return null; // 全部完成，清除進度
          return { ...prev, completed: newCompleted };
        });
      }
    }
  }, [sources, extractingMap]);

  const deleteMutation = trpc.aiSources.delete.useMutation({
    onSuccess: () => { toast.success('素材已刪除'); utils.aiSources.list.invalidate(); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const reprocessMutation = trpc.aiSources.reprocess.useMutation({
    onSuccess: () => { toast.success('已重新解析'); utils.aiSources.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // 一鍵出題狀態
  const [quickGenSource, setQuickGenSource] = useState<any | null>(null);
  const [quickGenForm, setQuickGenForm] = useState({
    questionCount: 20,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
    questionTypes: ['multiple_choice'] as Array<'multiple_choice' | 'essay'>,
    pointCost: 0,
    essayCount: 5,
  });
  const [quickGenCustomPointInput, setQuickGenCustomPointInput] = useState('');

  // 分科出題相關 state
  const [splitSubjectMode, setSplitSubjectMode] = useState(false);
  const [detectedSubjects, setDetectedSubjects] = useState<string[]>([]);
  const [subjectQuestions, setSubjectQuestions] = useState<Array<{ subject: string; questionCount: number; essayCount: number }>>([]);
  const [splitDistribution, setSplitDistribution] = useState<'auto' | 'manual'>('auto');

  const detectSubjectsQuery = trpc.aiExams.detectSubjectsFromTitle.useQuery(
    { sourceId: quickGenSource?.id ?? 0 },
    {
      enabled: !!quickGenSource?.id,
      onSuccess: (data: any) => {
        if (data.isComposite && data.subjects.length > 1) {
          setDetectedSubjects(data.subjects);
          const total = quickGenForm.questionCount;
          const perSubject = Math.floor(total / data.subjects.length);
          const remainder = total - perSubject * data.subjects.length;
          setSubjectQuestions(data.subjects.map((s: string, i: number) => ({
            subject: s,
            questionCount: i === 0 ? perSubject + remainder : perSubject,
            essayCount: 0,
          })));
          setSplitSubjectMode(true);
        } else {
          setDetectedSubjects(data.subjects || []);
          setSplitSubjectMode(false);
        }
      },
    } as any
  );

  const splitSubjectGenerateMutation = trpc.aiExams.splitSubjectGenerate.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || `分科出題已啟動！`);
      setQuickGenSource(null);
      setSplitSubjectMode(false);
      utils.aiExams.list.invalidate();
      utils.aiExams.adminList.invalidate();
      setTimeout(() => onNavigateToExams?.(res.id), 800);
    },
    onError: (e) => toast.error(e.message),
  });

  const quickGenerateMutation = trpc.aiSources.quickGenerate.useMutation({
    onSuccess: (res) => {
      toast.success(`題庫「${res.title}」建立中，即將跳轉到題庫管理...`);
      setQuickGenSource(null);
      utils.aiExams.list.invalidate();
      utils.aiExams.adminList.invalidate();
      setTimeout(() => onNavigateToExams?.(res.id), 800);
    },
    onError: (e) => toast.error(e.message),
  });

  // Prompt 預覽開關（localStorage 儲存）
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(() => {
    try { return localStorage.getItem('admin_show_prompt_preview') === 'true'; } catch { return false; }
  });
  const [promptPreviewData, setPromptPreviewData] = useState<any | null>(null);
  const [showPromptDialog, setShowPromptDialog] = useState(false);

  const previewPromptMutation = trpc.aiExams.previewPrompt.useMutation({
    onSuccess: (data) => {
      setPromptPreviewData(data);
      setShowPromptDialog(true);
    },
    onError: (e) => toast.error('無法預覽 Prompt：' + e.message),
  });

  // 批次重新解析 mutation
  const batchReprocessMutation = trpc.aiSources.batchReprocess.useMutation({
    onSuccess: (res) => {
      toast.success(`已啟動 ${res.started} 筆素材重新解析`);
      utils.aiSources.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // 手動修正科目
  const [editSubjectSourceId, setEditSubjectSourceId] = useState<number | null>(null);
  const [editSubjectValue, setEditSubjectValue] = useState('');
  const updateSubjectMutation = trpc.aiSources.updateSubject.useMutation({
    onSuccess: (res) => {
      toast.success(`科目已更新為「${res.detectedSubject || '（清除）'}」`);
      setEditSubjectSourceId(null);
      utils.aiSources.list.invalidate();
    },
    onError: (e) => toast.error('更新失敗：' + e.message),
  });

  // 手動設定題型
  const [editQTypeSourceId, setEditQTypeSourceId] = useState<number | null>(null);
  const setQuestionTypeMutation = trpc.aiSources.setQuestionType.useMutation({
    onSuccess: () => {
      toast.success('題型已更新');
      setEditQTypeSourceId(null);
      utils.aiSources.list.invalidate();
    },
    onError: (e) => toast.error('更新失敗：' + e.message),
  });

  // 批次偵測科目 mutation
  const batchDetectSubjectMutation = trpc.aiSources.batchDetectSubject.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || `已啟動 ${res.processed} 個素材的科目偵測（背景執行）`);
      // 30 秒後重新載入結果
      setTimeout(() => utils.aiSources.list.invalidate(), 30000);
    },
    onError: (e) => toast.error(e.message),
  });

  // 批次解析 processing 素材
  const [batchParseJobId, setBatchParseJobId] = useState<string | null>(null);
  const [batchParseLimit, setBatchParseLimit] = useState<number>(100);
  const batchProcessPendingMutation = trpc.aiSources.batchProcessPending.useMutation({
    onSuccess: (res) => {
      if (res.started === 0) {
        toast.info('目前沒有待解析的素材');
        return;
      }
      setBatchParseJobId(res.jobId);
      toast.success(`已啟動循序解析，共 ${res.started} 筆，一次處理一筆...`);
      utils.aiSources.getPendingCount.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  // 輯詢批次解析進度
  const { data: batchParseProgress } = trpc.aiSources.getBatchParseProgress.useQuery(
    { jobId: batchParseJobId! },
    {
      enabled: batchParseJobId !== null,
      refetchInterval: (query) => {
        const data = query?.state?.data as any;
        if (data?.done) {
          setBatchParseJobId(null);
          utils.aiSources.list.invalidate();
          utils.aiSources.getPendingCount.invalidate();
          toast.success('批次解析完成！');
          return false;
        }
        return 3000;
      },
    }
  );
  const isBatchParsing = batchParseJobId !== null && !(batchParseProgress?.done);
  const batchParseCurrentTitle = (batchParseProgress as any)?.currentTitle ?? '';
  const batchParseCurrent = (batchParseProgress as any)?.current ?? 0;
  const batchParseTotal = (batchParseProgress as any)?.total ?? 0;

  // 一鍵停止解析
  const stopAllParsingMutation = trpc.aiSources.stopAllParsing.useMutation({
    onSuccess: (res) => {
      toast.success(`已停止所有解析！共中斷 ${res.stoppedCount} 筆素材的解析任務`);
      utils.aiSources.list.invalidate();
      utils.aiSources.getPendingCount.invalidate();
      utils.aiSources.getStopParsingStatus.invalidate();
    },
    onError: (e) => toast.error('停止失敗：' + e.message),
  });
  const clearStopParsingMutation = trpc.aiSources.clearStopParsing.useMutation({
    onSuccess: () => {
      toast.success('停止旗標已清除，可以重新開始解析');
      utils.aiSources.getStopParsingStatus.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: stopParsingStatus } = trpc.aiSources.getStopParsingStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const isParsingStopActive = stopParsingStatus?.isStopped ?? false;
  // 取得 processing 素材數量
  const { data: pendingCountData, refetch: refetchPendingCount } = trpc.aiSources.getPendingCount.useQuery(undefined, {
    refetchInterval: 15000, // 每 15 秒刷新
  });
  const pendingCount = pendingCountData?.count ?? 0;

  // 批次一鍵出題狀態
  const [showBatchQuickGen, setShowBatchQuickGen] = useState(false);
  const [batchQuickGenForm, setBatchQuickGenForm] = useState({
    questionCount: 20,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
    questionTypes: ['multiple_choice'] as Array<'multiple_choice' | 'essay'>,
    pointCost: 0,
    essayCount: 5,
  });
  const [batchCustomPointInput, setBatchCustomPointInput] = useState('');

  // 測試出題狀態
  const [testGenSource, setTestGenSource] = useState<any | null>(null);
  const [testGenForm, setTestGenForm] = useState({
    questionCount: 5,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
  });
  const [testGenResult, setTestGenResult] = useState<any | null>(null);

  const testGenerateMutation = trpc.aiSources.testGenerate.useMutation({
    onSuccess: (res) => {
      setTestGenResult(res);
    },
    onError: (e) => toast.error(e.message),
  });

  // 批次出題循序執行狀態
  const [batchQuickGenProgress, setBatchQuickGenProgress] = useState<{ current: number; total: number; currentTitle: string } | null>(null);
  const batchQuickGenAbortRef = useRef(false);

  const generateSingleExamSyncMutation = trpc.aiExams.generateSingleExamSync.useMutation();

  const handleBatchQuickGen = async () => {
    if (batchQuickGenForm.questionTypes.length === 0) { toast.error('請至少選擇一種題型'); return; }
    const sourceIds = [...selectedSourceIds];
    batchQuickGenAbortRef.current = false;
    setBatchQuickGenProgress({ current: 0, total: sourceIds.length, currentTitle: '' });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < sourceIds.length; i++) {
      if (batchQuickGenAbortRef.current) break;
      const sourceId = sourceIds[i];
      // 找到素材標題（從已載入的 sources 列表）
      const source = (sources as any[]).find((s: any) => s.id === sourceId);
      const title = source?.title || `素材 ${sourceId}`;
      setBatchQuickGenProgress({ current: i + 1, total: sourceIds.length, currentTitle: title });
      try {
        await generateSingleExamSyncMutation.mutateAsync({
          sourceId,
          questionCount: batchQuickGenForm.questionCount,
          essayCount: batchQuickGenForm.essayCount,
          difficulty: batchQuickGenForm.difficulty,
          questionTypes: batchQuickGenForm.questionTypes,
          pointCost: batchQuickGenForm.pointCost,
        });
        successCount++;
      } catch (e: any) {
        failCount++;
        console.error(`[批次出題] 素材 ${sourceId} 失敗:`, e.message);
      }
    }
    setBatchQuickGenProgress(null);
    setShowBatchQuickGen(false);
    setSelectedSourceIds([]);
    utils.aiExams.list.invalidate();
    utils.aiExams.adminList.invalidate();
    if (failCount === 0) {
      toast.success(`批次出題完成！已建立 ${successCount} 個題庫`);
    } else {
      toast.warning(`批次出題完成：成功 ${successCount} 個，失敗 ${failCount} 個`);
    }
    setTimeout(() => onNavigateToExams?.(), 800);
  };

  const extractQuestionsMutation = trpc.realExamAdmin.extractQuestions.useMutation({
    onSuccess: (_, variables) => {
      toast.success('已開始提取題目，自動監控進度中...');
      const now = Date.now();
      setExtractingMap(prev => new Map([...prev, [variables.sourceId, now]]));
      // 清除該素材的失敗標記（若有）
      setFailedSourceMap(prev => { const next = new Map(prev); next.delete(variables.sourceId); return next; });
    },
    onError: (e) => toast.error(e.message),
  });

  const batchExtractMutation = trpc.realExamAdmin.batchExtractQuestions.useMutation({
    onSuccess: (res, variables) => {
      toast.success(res.message);
      const now = Date.now();
      setExtractingMap(prev => {
        const next = new Map(prev);
        variables.sourceIds.forEach(id => next.set(id, now));
        return next;
      });
      // 初始化批次進度
      setExtractBatchProgress({ total: variables.sourceIds.length, completed: 0 });
      // 清除這些素材的失敗標記（若有）
      setFailedSourceMap(prev => { const next = new Map(prev); variables.sourceIds.forEach(id => next.delete(id)); return next; });
      setSelectedSourceIds([]);
    },
    onError: (e) => toast.error(e.message),
  });

  // 開放/關閉題庫
  const togglePublishMutation = trpc.realExamAdmin.togglePublish.useMutation({
    onSuccess: (res) => {
      toast.success(res.isPublished ? '題庫已開放，學生可以練習' : '題庫已關閉');
      utils.aiSources.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const batchTogglePublishMutation = trpc.realExamAdmin.batchTogglePublish.useMutation({
    onSuccess: (res, vars) => {
      toast.success(vars.isPublished ? `已開放 ${res.count} 個題庫` : `已關閉 ${res.count} 個題庫`);
      utils.aiSources.list.invalidate();
      setSelectedSourceIds([]);
    },
    onError: (e) => toast.error(e.message),
  });

  // 批次選取素材
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const [sourceBatchDeleteOpen, setSourceBatchDeleteOpen] = useState(false);
  const sourceBatchDeleteMutation = trpc.aiSources.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.deleted} 筆素材`);
      setSelectedSourceIds([]);
      setSourceBatchDeleteOpen(false);
      utils.aiSources.list.invalidate();
    },
    onError: (err) => toast.error(`刪除失敗：${err.message}`),
  });
  const toggleSelectSource = (id: number) => {
    setSelectedSourceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  // 全選當前頁考古題素材
  const selectAllExamReady = () => {
    const examReadyIds = sources.filter((s: any) => s.sourceType === 'exam' && s.status === 'ready').map((s: any) => s.id);
    setSelectedSourceIds(examReadyIds);
  };
  // 全選所有符合篩選條件的考古題素材（不限當前頁）
  const selectAllExamReadyAllPages = async () => {
    // 將篩選條件改為考古題素材，取得所有符合的 ID
    // 由於後端已支援 extracted 篩選，這裡直接從當前已載入的所有頁面資料中選取
    // 實際上我們需要一個 API 來取得所有頁的 ID，這裡用提示訊息替代
    toast.info(`已選取當前頁 ${sources.filter((s: any) => s.sourceType === 'exam' && s.status === 'ready').length} 筆，若需選取全部請切換到「未提取」篩選後再全選`);
    selectAllExamReady();
  };
  const clearSelection = () => setSelectedSourceIds([]);

  const createFromUrlMutation = trpc.aiSources.createFromUrl.useMutation({
    onSuccess: () => {
      toast.success('素材已新增，正在解析中...');
      utils.aiSources.list.invalidate();
      setShowUploadDialog(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setUploadForm({ title: '', sourceType: 'lecture', category: '', year: '', examGroup: '', teacherName: '', fileUrl: '', fileType: 'pdf' });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!uploadForm.title) {
      setUploadForm(f => ({ ...f, title: file.name.replace(/\.(pdf|docx?|doc)$/i, '') }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title) { toast.error('請填寫素材標題'); return; }
    if (uploadMode === 'url') {
      if (!uploadForm.fileUrl) { toast.error('請填寫 PDF URL'); return; }
      setUploadStage('uploading');
      createFromUrlMutation.mutate({
        title: uploadForm.title,
        sourceType: uploadForm.sourceType,
        category: uploadForm.category || undefined,
        year: uploadForm.year || undefined,
        fileUrl: uploadForm.fileUrl,
        fileType: uploadForm.fileType,
      }, {
        onSettled: () => setUploadStage('idle'),
      });
    } else {
      if (!selectedFile) { toast.error('請選擇檔案'); return; }
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStage('uploading');
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', uploadForm.title);
        formData.append('sourceType', uploadForm.sourceType);
        if (uploadForm.category) formData.append('category', uploadForm.category);
        if (uploadForm.year) formData.append('year', uploadForm.year);
        if (uploadForm.examGroup) formData.append('examGroup', uploadForm.examGroup);
        if (uploadForm.teacherName) formData.append('teacherName', uploadForm.teacherName);

        // 使用 XMLHttpRequest 追蹤上傳進度
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 90)); // 上傳到 90%
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(100);
              resolve();
            } else {
              try { reject(new Error(JSON.parse(xhr.responseText).error || '上傳失敗')); }
              catch { reject(new Error('上傳失敗')); }
            }
          };
          xhr.onerror = () => reject(new Error('網路錯誤'));
          xhr.open('POST', '/api/ai-question-source/upload');
          xhr.send(formData);
        });

        setUploadStage('processing');
        toast.success('素材已上傳，AI 正在解析中...');
        utils.aiSources.list.invalidate();
        setShowUploadDialog(false);
        resetForm();
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage('idle');
      }
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      uploading: { label: '上傳中', variant: 'secondary' },
      processing: { label: '解析中', variant: 'secondary' },
      ready: { label: '就緒', variant: 'default' },
      error: { label: '錯誤', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">素材管理</h2>
          <p className="text-sm text-muted-foreground">上傳教材或考題 PDF/Word，供 AI 出題使用{totalCount > 0 ? `（共 ${totalCount} 筆）` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => setShowSyncDialog(true)}
            disabled={isSyncing}
          >
            {isSyncing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />同步中...</>
              : <><RefreshCw className="w-4 h-4 mr-2" />一鍵同步高上考古題</>}
          </Button>
          <Button variant="outline" onClick={() => setShowBatchDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />批次上傳
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />新增素材
          </Button>
        </div>
      </div>

      {/* 搜尋和篩選列 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋標題、科目、老師、年度..."
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterSourceType} onValueChange={v => { setFilterSourceType(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="類型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            <SelectItem value="lecture">教材</SelectItem>
            <SelectItem value="exam">考題</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="ready">就緒</SelectItem>
            <SelectItem value="processing">解析中</SelectItem>
            <SelectItem value="error">錯誤</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterExtracted} onValueChange={v => { setFilterExtracted(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="提取狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部提取狀態</SelectItem>
            <SelectItem value="extracted">已提取題目</SelectItem>
            <SelectItem value="not_extracted">未提取題目</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterExamGroupSources} onValueChange={v => { setFilterExamGroupSources(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="考試類別" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類別</SelectItem>
            <SelectItem value="高考">高考</SelectItem>
            <SelectItem value="普考">普考</SelectItem>
            <SelectItem value="特考">特考</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOrigin} onValueChange={v => { setFilterOrigin(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="來源" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部來源</SelectItem>
            <SelectItem value="manual_upload">手動上傳</SelectItem>
            <SelectItem value="goldensun_sync">智能題庫同步</SelectItem>
            <SelectItem value="url_import">URL 匯入</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterQuestionType} onValueChange={v => { setFilterQuestionType(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="題型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部題型</SelectItem>
            <SelectItem value="multiple_choice">選擇題</SelectItem>
            <SelectItem value="essay">申論題</SelectItem>
            <SelectItem value="mixed">混合（兩者）</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => { setFilterNoExam(!filterNoExam); setCurrentPage(1); }}
          className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium border transition-colors ${
            filterNoExam
              ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600'
          }`}
        >
          尚未出題
        </button>
        {(searchText || filterSourceType !== 'all' || filterStatus !== 'all' || filterCategory !== 'all' || filterExtracted !== 'all' || filterExamGroupSources !== 'all' || filterOrigin !== 'all' || filterNoExam || filterQuestionType !== 'all') && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearchText(''); setFilterSourceType('all'); setFilterStatus('all'); setFilterCategory('all'); setFilterExtracted('all'); setFilterExamGroupSources('all'); setFilterOrigin('all'); setFilterNoExam(false); setFilterQuestionType('all'); setCurrentPage(1); }}>
            <X className="w-4 h-4 mr-1" />清除篩選
          </Button>
        )}
      </div>

      {/* 自訂常用關鍵字標籤 */}
      {(customTags.length > 0 || searchText) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {customTags.map(kw => (
            <span
              key={kw}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                searchText === kw
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              <span onClick={() => { setSearchText(kw); setCurrentPage(1); }}>{kw}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next = customTags.filter(t => t !== kw);
                  setCustomTags(next);
                  localStorage.setItem('admin_source_tags', JSON.stringify(next));
                  if (searchText === kw) { setSearchText(''); setCurrentPage(1); }
                }}
                className="ml-0.5 hover:text-red-500 rounded-full"
                title="移除標籤"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {searchText && !customTags.includes(searchText) && (
            <button
              onClick={() => {
                const next = [...customTags, searchText];
                setCustomTags(next);
                localStorage.setItem('admin_source_tags', JSON.stringify(next));
              }}
              className="px-2.5 py-0.5 rounded-full text-xs border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50"
              title="將目前關鍵字加入常用標籤"
            >
              + 加入常用標籤
            </button>
          )}
          {searchText && (
            <button
              onClick={() => { setSearchText(''); setCurrentPage(1); }}
              className="px-2.5 py-0.5 rounded-full text-xs border border-red-300 text-red-500 hover:bg-red-50"
            >
              清除關鍵字
            </button>
          )}
        </div>
      )}
      {customTags.length === 0 && !searchText && (
        <p className="text-xs text-gray-400">在上方搜尋框輸入關鍵字後，可點「+ 加入常用標籤」儲存快選標籤</p>
      )}

      {/* 同步進度提示列 */}
      {(isSyncing || (latestSync && (latestSync as any).status === 'completed' && Date.now() - new Date((latestSync as any).completed_at ?? 0).getTime() < 30000)) && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          {isSyncing
            ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
          <span className="text-blue-800 font-medium flex-1">
            {isSyncing
              ? (() => {
                  const d = activeSyncData as any;
                  if (!d || !d.total_pages) return '同步中，正在取得總頁數...';
                  return `同步中：已爬取 ${d.current_page} / ${d.total_pages} 頁，新導入 ${d.new_imported ?? 0} 筆，跳過 ${d.skipped ?? 0} 筆`;
                })()
              : `同步完成！新導入 ${(latestSync as any).new_imported ?? 0} 筆，跳過 ${(latestSync as any).skipped ?? 0} 筆重複`
            }
          </span>
          {isSyncing && (() => {
            const jobId = syncJobId ?? (activeSyncData as any)?.id;
            if (!jobId) return null;
            return (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50 shrink-0"
                onClick={() => cancelSyncMutation.mutate({ jobId })}
                disabled={cancelSyncMutation.isPending}
              >
                {cancelSyncMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '停止同步'}
              </Button>
            );
          })()}
          {!isSyncing && (latestSync as any)?.status === 'completed' && (
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
              onClick={async () => {
                try {
                  const result = await utils.aiSources.getSyncedReadySources.fetch();
                  if (!result || result.ids.length === 0) {
                    toast.info('沒有可推送的素材（已全部拆解或尚未解析完成）');
                    return;
                  }
                  const ids = result.ids;
                  toast.info(`開始批次推送 ${ids.length} 筆素材進行拆解...`);
                  // 分批次每次最多 50 筆
                  const batchSize = 50;
                  let successCount = 0;
                  for (let i = 0; i < ids.length; i += batchSize) {
                    const batch = ids.slice(i, i + batchSize);
                    try {
                      await batchExtractMutation.mutateAsync({ sourceIds: batch });
                      successCount += batch.length;
                    } catch (err: any) {
                      toast.error(`第 ${Math.floor(i/batchSize)+1} 批次失敗：${err.message}`);
                    }
                  }
                  toast.success(`已全部推送 ${successCount} 筆素材進行拆解！請到考題管理查看進度`);
                  setLocation('/admin/exam-questions');
                } catch (err: any) {
                  toast.error('取得素材失敗：' + err.message);
                }
              }}
              disabled={batchExtractMutation.isPending}
            >
              {batchExtractMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <SendToBack className="w-3 h-3 mr-1" />}
              一鍵全部推送拆解
            </Button>
          )}
        </div>
      )}

      {/* 全選工具列（常驅顯示） */}
      <div className="flex items-center gap-2 px-1 py-0.5">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1 h-7"
          onClick={() => {
            // 全選本頁（所有素材，不限 ready 狀態）
            const pageIds = sources.map((s: any) => s.id);
            const allPageSelected = pageIds.every((id: number) => selectedSourceIds.includes(id));
            if (allPageSelected && pageIds.length > 0) {
              // 已全選本頁，則取消本頁
              setSelectedSourceIds(prev => prev.filter(id => !pageIds.includes(id)));
            } else {
              // 將本頁所有 ID 加入選取
              setSelectedSourceIds(prev => [...new Set([...prev, ...pageIds])]);
            }
          }}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          {sources.length > 0 && sources.every((s: any) => selectedSourceIds.includes(s.id))
            ? `取消本頁（${sources.length}）`
            : `全選本頁（${sources.length}）`}
        </Button>
        {allIdsData && allIdsData.total > pageSize && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1 h-7 text-blue-600 border-blue-300 hover:bg-blue-50"
            disabled={isSelectingAll}
            onClick={async () => {
              setIsSelectingAll(true);
              try {
                setSelectedSourceIds(allIdsData.ids);
                toast.success(`已全選 ${allIdsData.ids.length} 筆素材`);
              } finally {
                setIsSelectingAll(false);
              }
            }}
          >
            {isSelectingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
            全選所有（{allIdsData.total}）
          </Button>
        )}
        {selectedSourceIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7 text-muted-foreground"
            onClick={() => setSelectedSourceIds([])}
          >
            <X className="w-3.5 h-3.5" />取消全選
          </Button>
        )}
        {selectedSourceIds.length > 0 && (
          <span className="text-xs text-muted-foreground ml-1">已選 <span className="font-semibold text-blue-700">{selectedSourceIds.length}</span> 筆</span>
        )}
      </div>

      {/* 批次操作工具列 */}
      {selectedSourceIds.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">已選 {selectedSourceIds.length} 筆素材</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-purple-600 border-purple-300 hover:bg-purple-50 gap-1"
              disabled={batchExtractMutation.isPending}
              onClick={async () => {
                if (batchExtractMutation.isPending) return;
                const ids = selectedSourceIds;
                const batchSize = 50;
                if (ids.length <= batchSize) {
                  batchExtractMutation.mutate({ sourceIds: ids });
                  setTimeout(() => setLocation('/admin/exam-questions'), 800);
                } else {
                  // 分批推送
                  let successCount = 0;
                  for (let i = 0; i < ids.length; i += batchSize) {
                    const batch = ids.slice(i, i + batchSize);
                    try {
                      await batchExtractMutation.mutateAsync({ sourceIds: batch });
                      successCount += batch.length;
                    } catch (err: any) {
                      toast.error(`第 ${Math.floor(i/batchSize)+1} 批失敗：${err.message}`);
                    }
                  }
                  toast.success(`已推送 ${successCount} 筆素材進行拆解`);
                  setSelectedSourceIds([]);
                  setLocation('/admin/exam-questions');
                }
              }}
            >
              {batchExtractMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />拆解中...</>
                : <><SendToBack className="w-3.5 h-3.5" />批次推送拆解</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 gap-1"
              onClick={() => setShowBatchQuickGen(true)}
            >
              <Brain className="w-3.5 h-3.5" />批次一鍵出題
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-600 border-red-300 hover:bg-red-50 gap-1"
              onClick={() => setSourceBatchDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />批次刪除
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setSelectedSourceIds([])}
            >
              <X className="w-3.5 h-3.5" />取消選取
            </Button>
          </div>
        </div>
      )}

      {/* 批次重新解析未解析素材 + 批次解析未處理素材 + 一鍵停止解析 */}
      {!isLoading && sources.length > 0 && (
        <div className="flex justify-end gap-2 flex-wrap">
          {/* 一鍵停止解析按鈕 */}
          {isParsingStopActive ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => clearStopParsingMutation.mutate()}
              disabled={clearStopParsingMutation.isPending}
            >
              {clearStopParsingMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              解除停止狀態（重新開啟解析）
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm('確定要停止所有進行中的 AI 解析任務？\n這將中斷所有 processing 狀態的素材解析。')) {
                  stopAllParsingMutation.mutate();
                }
              }}
              disabled={stopAllParsingMutation.isPending}
            >
              {stopAllParsingMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              一鍵停止解析
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={`text-xs gap-1 ${
              isBatchParsing
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : pendingCount > 0
                ? 'border-orange-500 text-orange-600 hover:bg-orange-50'
                : 'border-muted text-muted-foreground'
            }`}
            onClick={() => {
              if (isBatchParsing) {
                toast.info(`解析中：第 ${batchParseCurrent + 1}/${batchParseTotal} 筆`);
                return;
              }
              const limitMsg = batchParseLimit < 500 ? `\n每批上限 ${batchParseLimit} 筆。` : '';
              if (confirm(`將循序解析待處理素材（一次一筆），確定？${isParsingStopActive ? '\n停止旗標將自動清除。' : ''}${limitMsg}`)) {
                batchProcessPendingMutation.mutate({ limit: batchParseLimit });
              }
            }}
            disabled={batchProcessPendingMutation.isPending}
          >
            {isBatchParsing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />解析中 {batchParseCurrent + 1}/{batchParseTotal}…</>
              : batchProcessPendingMutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />啟動中...</>
              : <><Clock className="w-3.5 h-3.5" />批次解析未處理素材{pendingCount > 0 ? `（${pendingCount} 筆）` : ''}</>
            }
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => {
              if (confirm('將重新解析所有尚無文字的素材，確定？')) {
                batchReprocessMutation.mutate({});
              }
            }}
            disabled={batchReprocessMutation.isPending}
          >
            {batchReprocessMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            批次重新解析未解析素材
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-indigo-600 gap-1 hover:bg-indigo-50"
            onClick={() => {
              if (confirm('將對所有尚無科目標籤的素材進行 AI 科目偵測，背景執行中，確定？')) {
                batchDetectSubjectMutation.mutate({});
              }
            }}
            disabled={batchDetectSubjectMutation.isPending}
          >
            {batchDetectSubjectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>🧠</>}
            批次偵測科目
          </Button>
        </div>
      )}

      {/* 批次解析進度條 */}
      {isBatchParsing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-blue-700 font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              循序解析中：第 {batchParseCurrent + 1} / {batchParseTotal} 筆
            </span>
            <span className="text-blue-500 text-xs">{Math.round(((batchParseCurrent) / batchParseTotal) * 100)}%</span>
          </div>
          {batchParseCurrentTitle && (
            <p className="text-blue-600 text-xs truncate">目前：{batchParseCurrentTitle}</p>
          )}
          <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((batchParseCurrent / batchParseTotal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 批次解析設定（不解析中才顯示） */}
      {!isBatchParsing && (
        <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
          <span className="font-medium">每批上限：</span>
          <select
            className="border rounded px-1 py-0.5 text-xs bg-background"
            value={batchParseLimit}
            onChange={e => setBatchParseLimit(Number(e.target.value))}
          >
            <option value={10}>10 筆</option>
            <option value={20}>20 筆</option>
            <option value={50}>50 筆</option>
            <option value={100}>100 筆</option>
            <option value={200}>200 筆</option>
            <option value={500}>500 筆</option>
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p>{searchText || filterSourceType !== 'all' || filterStatus !== 'all' ? '未找到符合條件的素材' : '尚無素材，請點擊「新增素材」上傳'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map((source: any) => (
            <Card key={source.id} className={`p-4 transition-colors ${selectedSourceIds.includes(source.id) ? 'border-green-400 bg-green-50/40' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                {/* Checkbox 欄（所有素材都可勾選） */}
                <div className="flex-shrink-0 pt-0.5">
                  <Checkbox
                    checked={selectedSourceIds.includes(source.id)}
                    onCheckedChange={() => toggleSelectSource(source.id)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {/* 標題和資訊 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{source.title}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => openEditDialog(source)}
                      title="編輯素材"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {statusBadge(source.status)}
                    <Badge variant="outline">{source.sourceType === 'lecture' ? '教材' : '考題'}</Badge>
                    <Badge variant="outline">{source.fileType.toUpperCase()}</Badge>
                    {source.category && <Badge variant="secondary">{source.category}</Badge>}
                    {source.year && <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">{source.year}</Badge>}
                    {source.examGroup && <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">{source.examGroup}</Badge>}
                    {source.teacherName && <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">👤 {source.teacherName}</Badge>}
                    {/* 考古題素材標籤 - 作為 AI 出題來源 */}
                    {source.sourceType === 'exam' && source.status === 'ready' && (
                      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">✓ 可作為出題來源</Badge>
                    )}
                    {/* AI 偵測科目標籤（可點擊修正） */}
                    {editSubjectSourceId === source.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <select
                          className="text-xs border border-indigo-300 rounded px-1.5 py-0.5 bg-white text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={editSubjectValue}
                          onChange={e => setEditSubjectValue(e.target.value)}
                          autoFocus
                        >
                          <option value="">— 清除科目 —</option>
                          {['國文','法律','民法','刑法','行政法','憲法','廉政','行政學','公共行政','經濟學','統計學','會計學','英文','資訊處理','化學','物理','政治學','公共政策','政府會計','政組','財務管理','放射'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <input
                          className="text-xs border border-indigo-300 rounded px-1.5 py-0.5 w-20 bg-white text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="自訂..."
                          value={editSubjectValue}
                          onChange={e => setEditSubjectValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateSubjectMutation.mutate({ id: source.id, detectedSubject: editSubjectValue || null });
                            if (e.key === 'Escape') setEditSubjectSourceId(null);
                          }}
                        />
                        <button
                          className="text-xs px-1.5 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          onClick={() => updateSubjectMutation.mutate({ id: source.id, detectedSubject: editSubjectValue || null })}
                          disabled={updateSubjectMutation.isPending}
                        >✓</button>
                        <button
                          className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          onClick={() => setEditSubjectSourceId(null)}
                        >×</button>
                      </div>
                    ) : (source as any).detectedSubject ? (
                      <Badge
                        variant="outline"
                        className="border-indigo-300 text-indigo-700 bg-indigo-50 gap-1 cursor-pointer hover:bg-indigo-100 transition-colors"
                        title="點擊修正科目"
                        onClick={e => {
                          e.stopPropagation();
                          setEditSubjectSourceId(source.id);
                          setEditSubjectValue((source as any).detectedSubject || '');
                        }}
                      >
                        🧠 {(source as any).detectedSubject} <span style={{fontSize:'10px',opacity:0.6}}>✏</span>
                      </Badge>
                    ) : (
                      <button
                        className="text-xs text-indigo-400 hover:text-indigo-600 border border-dashed border-indigo-200 hover:border-indigo-400 rounded px-1.5 py-0.5 transition-colors"
                        title="設定科目"
                        onClick={e => {
                          e.stopPropagation();
                          setEditSubjectSourceId(source.id);
                          setEditSubjectValue('');
                        }}
                      >+ 科目</button>
                    )}
                    {/* 題型標籤（可點擊修改） */}
                    {editQTypeSourceId === source.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {[
                          { value: 'multiple_choice', label: '選擇題', color: 'text-blue-700 bg-blue-50 border-blue-300' },
                          { value: 'essay', label: '申論題', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                          { value: 'mixed', label: '混合', color: 'text-purple-700 bg-purple-50 border-purple-300' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${opt.color} hover:opacity-80`}
                            onClick={() => setQuestionTypeMutation.mutate({ id: source.id, questionType: opt.value as any })}
                            disabled={setQuestionTypeMutation.isPending}
                          >{opt.label}</button>
                        ))}
                        <button className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onClick={() => setEditQTypeSourceId(null)}>×</button>
                      </div>
                    ) : (() => {
                      const mc = (source as any).detectedMcCount ?? 0;
                      const essay = (source as any).detectedEssayCount ?? 0;
                      if (mc > 0 && essay > 0) return (
                        <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 gap-1 cursor-pointer hover:bg-purple-100 transition-colors" title="點擊修改題型" onClick={e => { e.stopPropagation(); setEditQTypeSourceId(source.id); }}>
                          混合 <span style={{fontSize:'10px',opacity:0.6}}>✏</span>
                        </Badge>
                      );
                      if (mc > 0) return (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1 cursor-pointer hover:bg-blue-100 transition-colors" title="點擊修改題型" onClick={e => { e.stopPropagation(); setEditQTypeSourceId(source.id); }}>
                          選擇題 <span style={{fontSize:'10px',opacity:0.6}}>✏</span>
                        </Badge>
                      );
                      if (essay > 0) return (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 gap-1 cursor-pointer hover:bg-emerald-100 transition-colors" title="點擊修改題型" onClick={e => { e.stopPropagation(); setEditQTypeSourceId(source.id); }}>
                          申論題 <span style={{fontSize:'10px',opacity:0.6}}>✏</span>
                        </Badge>
                      );
                      return (
                        <button className="text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 hover:border-gray-400 rounded px-1.5 py-0.5 transition-colors" title="設定題型" onClick={e => { e.stopPropagation(); setEditQTypeSourceId(source.id); }}>+ 題型</button>
                      );
                    })()}
                  </div>
                  {/* 解析進度動畫 */}
                  {source.status === 'processing' && (() => {
                    const startedAt = (source as any).processingStartedAt
                      ? new Date(((source as any).processingStartedAt as string).replace(' ', 'T') + 'Z')
                      : null;
                    const elapsedSec = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
                    const elapsedMin = Math.floor(elapsedSec / 60);
                    const elapsedStr = elapsedMin > 0 ? `${elapsedMin}分${elapsedSec % 60}秒` : elapsedSec > 0 ? `${elapsedSec}秒` : '';
                    const step = (source as any).processingStep as string | null;
                    const isLong = elapsedSec > 180; // 超過 3 分鐘提示
                    // 進度步驟對應的百分比
                    const stepProgress: Record<string, number> = {
                      '下載文件中...': 10,
                      '下載 Word 文件中...': 10,
                      'Word 轉換 PDF 中（LibreOffice）...': 25,
                      '提取 PDF 文字中...': 35,
                      '提取 PDF 文字中（Word 轉換版）...': 40,
                      'AI 辨識揃揃型 PDF...': 55,
                      'AI 辨識 Word 轉換 PDF...': 55,
                      '備援：mammoth 提取 Word 文字...': 45,
                      '過濾廣告內容...': 70,
                      '識別章節結構...': 82,
                      '偵測題型組成...': 92,
                    };
                    const progress = step ? (stepProgress[step] ?? 50) : 20;
                    return (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                          <span className="flex-1">
                            {step || 'AI 正在解析文件內容...'}
                            {elapsedStr && <span className="ml-1 text-muted-foreground/70">（已用 {elapsedStr}）</span>}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {isLong && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ 解析時間較長（大型 PDF 或掃描型文件需要較多時間），請繼續等候或嘗試重新解析
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {source.errorMessage && (
                    <p className="text-xs text-destructive mt-1">{source.errorMessage}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {source.fileName ? (
                      source.fileUrl ? (
                        <a
                          href={source.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                          title="點擊預覽 PDF"
                        >
                          {source.fileName}
                        </a>
                      ) : (
                        <span>{source.fileName}</span>
                      )
                    ) : source.fileUrl ? (
                      <a
                        href={source.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline break-all"
                        title={source.fileUrl}
                      >
                        {source.fileUrl.length > 80 ? source.fileUrl.substring(0, 80) + '...' : source.fileUrl}
                      </a>
                    ) : null}
                    {source.createdAt && (
                      <span className="block text-muted-foreground">
                        匯入：{new Date((source.createdAt as string).replace(' ', 'T') + 'Z').toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })}
                      </span>
                    )}
                    {source.status === 'ready' && (
                      <span className="block text-green-600">✓ 可作為出題來源</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {source.status === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => reprocessMutation.mutate({ id: source.id })}
                      disabled={reprocessMutation.isPending}
                      title="重試解析"
                    >
                      {reprocessMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      重試解析
                    </Button>
                  )}
                  {/* 測試出題按鈕 */}
                  {source.status === 'ready' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-green-600 hover:bg-green-50 gap-1"
                      onClick={() => {
                        setTestGenSource(source);
                        setTestGenResult(null);
                        setTestGenForm({ questionCount: 5, difficulty: 'mixed' });
                      }}
                      title="測試出題品質（不儲存）"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />測試出題
                    </Button>
                  )}
                  {/* 推送到考題管理拆解按鈕：只有 exam 類型且 ready 才顯示 */}
                  {source.sourceType === 'exam' && source.status === 'ready' && (() => {
                    const isExtracting = extractingMap.has(source.id);
                    const failCount = failedSourceMap.get(source.id) ?? 0;
                    const extractedCount = (source as any).extractedQuestionsCount ?? 0;
                    if (extractedCount > 0 && !isExtracting) {
                      // 已提取完成：顯示已拆解題數 + 重新拆解按鈕
                      return (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 border-green-400 text-green-700 hover:bg-green-50"
                            onClick={() => setLocation(`/admin/source-editor/${source.id}`)}
                            title={`已拆解 ${extractedCount} 題，點擊查看`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />已拆 {extractedCount} 題
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 border-orange-400 text-orange-600 hover:bg-orange-50"
                            onClick={() => extractQuestionsMutation.mutate({ sourceId: source.id })}
                            title="重新拆解（會覆蓋旧題目）"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />重新拆解
                          </Button>
                        </div>
                      );
                    }
                    if (isExtracting) {
                      // 拆解中：橙色鎖住
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1 border-orange-400 text-orange-600 bg-orange-50 cursor-not-allowed"
                          disabled
                          title="AI 正在拆解題目中，請稍候..."
                        >
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />已推送拆解中...
                        </Button>
                      );
                    }
                    if (failCount > 0) {
                      // 失敗：紅色，顯示失敗次數
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1 border-red-400 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            extractQuestionsMutation.mutate({ sourceId: source.id });
                          }}
                          title={`已失敗 ${failCount} 次，點擊重新推送`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />失敗({failCount}次) 重新推送
                        </Button>
                      );
                    }
                    // 預設：紫色推送拆解
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-purple-600 hover:bg-purple-50 gap-1"
                        onClick={() => {
                          extractQuestionsMutation.mutate({ sourceId: source.id });
                        }}
                        title="推送到考題管理進行 AI 拆解"
                      >
                        <SendToBack className="w-3.5 h-3.5" />推送拆解
                      </Button>
                    );
                  })()}
                  {/* 一鍵出題按鈕：只有 ready 狀態的素材才顯示 */}
                  {source.status === 'ready' && (() => {
                    const examCount = (source as any).examCount ?? 0;
                    if (examCount > 0) {
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1 border-orange-400 text-orange-600 hover:bg-orange-50"
                          onClick={() => { onNavigateToExams?.(); }}
                          title={`已有 ${examCount} 個題庫，點擊查看`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />已出 {examCount} 題庫
                        </Button>
                      );
                    }
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 gap-1"
                        onClick={() => {
                          setQuickGenSource(source);
                          setQuickGenForm({ questionCount: 20, difficulty: 'mixed', questionTypes: ['multiple_choice'], pointCost: 0, essayCount: 5 });
                        }}
                        title="一鍵從此素材出題"
                      >
                        <Brain className="w-3.5 h-3.5" />一鍵出題
                      </Button>
                    );
                  })()}
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(source.id)} title="刪除">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 分頁控制 */}
      {(totalPages > 1 || totalCount > 0) && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              第 {currentPage} / {Math.max(1, totalPages)} 頁，共 {totalCount} 筆
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 筆/頁</SelectItem>
                <SelectItem value="20">20 筆/頁</SelectItem>
                <SelectItem value="50">50 筆/頁</SelectItem>
                <SelectItem value="100">100 筆/頁</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
            >‹‹</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >‹</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page = start + i;
              return page <= totalPages ? (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-[36px]"
                >{page}</Button>
              ) : null;
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >›</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >››</Button>
          </div>
        </div>
      )}

      {/* 新增素材 Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增素材</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={uploadMode === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('file')}
              >
                <Upload className="w-4 h-4 mr-1" />上傳檔案
              </Button>
              <Button
                variant={uploadMode === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('url')}
              >
                <Link className="w-4 h-4 mr-1" />單筆 URL
              </Button>
              <Button
                variant={uploadMode === 'scrape' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setUploadMode('scrape'); setScrapeItems([]); setScrapeInfo(null); setImportResults(null); }}
              >
                <Globe className="w-4 h-4 mr-1" />高上公職考古題
              </Button>
            </div>
            {uploadMode === 'scrape' ? (
              <div className="space-y-3">
                {/* 篩選器區域 */}
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <span className="text-xs font-medium">篩選條件（選好後自動更新 URL）</span>
                  {/* 第一行：考試類別 */}
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground shrink-0">考試類別：</span>
                    <select
                      className="text-xs border rounded px-2 py-1 bg-background flex-1"
                      value={filterExamGroup}
                      onChange={e => {
                        setFilterExamGroup(e.target.value);
                        applyFilter(filterKeyword, filterType, filterYear, e.target.value);
                      }}
                    >
                      {EXAM_GROUPS.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* 第二行：年度篩選 */}
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground shrink-0">年度：</span>
                    <input
                      className="text-xs border rounded px-2 py-1 bg-background w-20"
                      value={filterYear}
                      onChange={e => {
                        setFilterYear(e.target.value);
                        applyFilter(filterKeyword, filterType, e.target.value);
                      }}
                      placeholder="如：114"
                      maxLength={4}
                    />
                    <span className="text-xs text-muted-foreground">（民國年，留空=不限年度）</span>
                    {filterYear && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => { setFilterYear(''); applyFilter(filterKeyword, filterType, ''); }}
                      >×</button>
                    )}
                  </div>
                  {/* 第三行：科目/類組關鍵字篩選 */}
                  <div className="flex gap-1">
                    <select
                      className="text-xs border rounded px-1 py-1 bg-background shrink-0"
                      value={filterType}
                      onChange={e => {
                        setFilterType(e.target.value);
                        applyFilter(filterKeyword, e.target.value);
                      }}
                    >
                      <option value="YEAR">不分類（只依年度）</option>
                      <option value="D">依科目</option>
                      <option value="P">依類組</option>
                    </select>
                    {filterType !== 'YEAR' && (
                      <>
                        <input
                          className="text-xs border rounded px-2 py-1 bg-background flex-1 min-w-0"
                          value={filterKeyword}
                          onChange={e => {
                            setFilterKeyword(e.target.value);
                            applyFilter(e.target.value, filterType);
                          }}
                          placeholder={filterType === 'D' ? '輸入科目關鍵字，如：民法、會計...' : '輸入類組關鍵字，如：地方特考三等...'}
                          onKeyDown={e => e.key === 'Enter' && handleScrape()}
                        />
                        {filterKeyword && (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => { setFilterKeyword(''); applyFilter('', filterType); }}
                          >×</button>
                        )}
                      </>
                    )}
                    {filterType === 'YEAR' && (
                      <span className="text-xs text-muted-foreground self-center">抓取該類別/年度的所有考古題</span>
                    )}
                  </div>
                </div>
                {/* URL 輸入和讀取按鈕 */}
                <div className="flex gap-2">
                  <Input
                    value={scrapeUrl}
                    onChange={e => setScrapeUrl(e.target.value)}
                    placeholder="可直接輸入 URL，或用上方篩選自動組合"
                    className="flex-1 text-xs"
                    onKeyDown={e => e.key === 'Enter' && handleScrape()}
                  />
                  <Button size="sm" onClick={handleScrape} disabled={isScraping}>
                    {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    讀取
                  </Button>
                </div>
                {scrapeInfo && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      第 {scrapeInfo.currentPage} 頁，共 {scrapeInfo.totalPages} 頁，全部 {scrapeInfo.totalItems.toLocaleString()} 筆資料
                    </p>
                    {/* 多頁匯入控制 */}
                    <div className="border rounded-lg p-2 bg-amber-50 dark:bg-amber-950/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={multiPageMode} onCheckedChange={v => setMultiPageMode(!!v)} id="multipage" />
                        <label htmlFor="multipage" className="text-xs font-medium cursor-pointer">多頁批次匯入</label>
                      </div>
                      {multiPageMode && (
                        <div className="space-y-1.5">
                          {/* 上次爬取記錄 */}
                          {(() => {
                            const key = `goldensun_last_page_${encodeURIComponent(scrapeUrl || buildFilteredUrl())}`;
                            const last = parseInt(localStorage.getItem(key) || '0');
                            return last > 0 ? (
                              <p className="text-xs text-amber-700">⚠️ 上次爬到第 <strong>{last}</strong> 頁，建議從第 <strong>{Math.min(last + 1, scrapeInfo.totalPages)}</strong> 頁繼續
                                <button className="ml-1 text-blue-600 underline" onClick={() => { setStartPage(Math.min(last + 1, scrapeInfo.totalPages)); setEndPage(scrapeInfo.totalPages); }}>自動填入</button>
                              </p>
                            ) : null;
                          })()}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs">第</span>
                            <input type="number" min={1} max={scrapeInfo.totalPages} value={startPage === 0 ? '' : startPage}
                              onChange={e => {
                                const v = e.target.value;
                                if (v === '' || v === '0') { setStartPage(0); return; }
                                const n = parseInt(v);
                                if (!isNaN(n)) setStartPage(n);
                              }}
                              onBlur={() => { if (!startPage || startPage < 1) setStartPage(1); }}
                              className="text-xs border rounded px-1 py-0.5 w-16 bg-background" />
                            <span className="text-xs">頁到第</span>
                            <input type="number" min={1} max={scrapeInfo.totalPages} value={endPage === 0 ? '' : endPage}
                              onChange={e => {
                                const v = e.target.value;
                                if (v === '' || v === '0') { setEndPage(0); return; }
                                const n = parseInt(v);
                                if (!isNaN(n)) setEndPage(n);
                              }}
                              onBlur={() => { if (endPage === 0 || endPage < startPage) setEndPage(startPage); }}
                              className="text-xs border rounded px-1 py-0.5 w-16 bg-background" />
                            <span className="text-xs">頁（共 {scrapeInfo.totalPages} 頁 / 預計 {(endPage - startPage + 1) * 15} 筆）</span>
                            <button className="text-xs text-blue-600 underline" onClick={() => { setStartPage(1); setEndPage(scrapeInfo.totalPages); }}>全部</button>
                          </div>
                          <Button size="sm" className="h-6 text-xs px-2" onClick={handleScrapeMultiPages} disabled={isScrapingPages}>
                            {isScrapingPages ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            讀取多頁
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {scrapeItems.length > 0 && !importResults && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>讀取到 {scrapeItems.length} 筆考古題</Label>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setScrapeItems(items => items.map(i => ({ ...i, selected: true })))}>全選</Button>
                        <Button size="sm" variant="outline" onClick={() => setScrapeItems(items => items.map(i => ({ ...i, selected: false })))}>全不選</Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                      {scrapeItems.map((item, idx) => (
                         <div key={idx} className="flex items-start gap-2 p-2 hover:bg-muted/50">
                           <Checkbox
                             checked={item.selected}
                             onCheckedChange={checked => setScrapeItems(items => items.map((it, i) => i === idx ? { ...it, selected: !!checked } : it))}
                             className="mt-0.5 shrink-0"
                           />
                           <div className="flex-1 min-w-0 overflow-hidden">
                             <div className="text-xs font-medium break-words leading-tight">{item.subject}</div>
                             <div className="text-xs text-muted-foreground break-words leading-tight mt-0.5">{item.group} · {item.year}年</div>
                           </div>
                           <input
                             className="text-xs border rounded px-1 py-0.5 w-16 shrink-0 bg-background"
                             value={item.category}
                             onChange={e => setScrapeItems(items => items.map((it, i) => i === idx ? { ...it, category: e.target.value } : it))}
                             placeholder="科目"
                           />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">已勾選 {scrapeItems.filter(i => i.selected).length} 筆</p>
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
                      ℹ️ 下載時會自動加入請求間隔（每筆間隔2秒）並在遇到限速時自動重試，數量較多時請耐心等待
                    </div>
                  </div>
                )}
                {importResults && (
                  <div className="space-y-1">
                    {importSkippedCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1">
                        <AlertCircle className="w-3 h-3" />
                        已跳過 {importSkippedCount} 筆重複考古題
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                      {importResults.map((r, i) => {
                        // 對 429 錯誤顯示更友善的訊息
                        const friendlyError = r.error
                          ? r.error.includes('429') || r.error.includes('限速')
                            ? '請求限速，已重試多次但仍失敗，請稍後再試'
                            : r.error
                          : undefined;
                        return (
                        <div key={i} className={`flex items-center gap-2 p-2 text-xs ${
                          r.success ? 'text-green-700 dark:text-green-400' :
                          r.skipped ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'
                        }`}>
                          {r.success ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> :
                           r.skipped ? <AlertCircle className="w-3 h-3 flex-shrink-0" /> :
                           <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                          <span className="truncate">{r.title}</span>
                          {r.skipped && <span className="text-amber-500 text-xs">重複</span>}
                          {friendlyError && !r.skipped && <span className="text-red-500 truncate">{friendlyError}</span>}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
              <div>
                <Label>素材標題 *</Label>
                <Input
                  value={uploadForm.title}
                  onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="例：民法概論第一章"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>素材類型</Label>
                  <Select value={uploadForm.sourceType} onValueChange={(v: any) => setUploadForm(f => ({ ...f, sourceType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">教材（講義/書本）</SelectItem>
                      <SelectItem value="exam">考題（歷年試題）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>科目分類（選填）</Label>
                  <Input
                    value={uploadForm.category}
                    onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="例：民法、會計"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>年度（選填）</Label>
                  <Input
                    value={uploadForm.year}
                    onChange={e => setUploadForm(f => ({ ...f, year: e.target.value }))}
                    placeholder="例：2024、113年"
                  />
                </div>
                <div>
                  <Label>考試類組（選填）</Label>
                  <Input
                    value={uploadForm.examGroup}
                    onChange={e => setUploadForm(f => ({ ...f, examGroup: e.target.value }))}
                    placeholder="例：地方特考三等、高考三級"
                  />
                </div>
              </div>
              <div>
                <Label>老師名稱（選填）</Label>
                <Input
                  value={uploadForm.teacherName}
                  onChange={e => setUploadForm(f => ({ ...f, teacherName: e.target.value }))}
                  placeholder="例：王大明老師"
                />
              </div>
              {uploadMode === 'file' ? (
                <div>
                  <Label>選擇 PDF 或 Word 檔案</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">已選擇：{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label>PDF 網址 *</Label>
                    <Input
                      value={uploadForm.fileUrl}
                      onChange={e => setUploadForm(f => ({ ...f, fileUrl: e.target.value }))}
                      placeholder="https://example.com/document.pdf"
                    />
                  </div>
                  <div>
                    <Label>檔案類型</Label>
                    <Select value={uploadForm.fileType} onValueChange={(v: any) => setUploadForm(f => ({ ...f, fileType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="word">Word</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
          {/* 上傳進度條（上傳檔案模式） */}
          {isUploading && uploadMode === 'file' && (
            <div className="px-1 pb-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {uploadStage === 'uploading' ? `上傳中... ${uploadProgress}%` : 'AI 解析中...'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); resetForm(); }} disabled={isUploading}>取消</Button>
            {uploadMode === 'scrape' ? (
              <Button onClick={handleBatchImport} disabled={isImporting || scrapeItems.filter(i => i.selected).length === 0}>
                {isImporting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {importStage === 'downloading' ? `下載中（限速時自動重試）...` : '匠入完成！'}
                  </>
                ) : `確認匠入 (${scrapeItems.filter(i => i.selected).length} 筆)`}
              </Button>
            ) : (
              <Button onClick={handleUpload} disabled={isUploading || createFromUrlMutation.isPending}>
                {(isUploading || createFromUrlMutation.isPending) ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isUploading ? '上傳中...' : '處理中...'}</>
                ) : '確認新增'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 測試出題 Dialog */}
      <Dialog open={!!testGenSource} onOpenChange={(o) => { if (!o) { setTestGenSource(null); setTestGenResult(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-green-600" />測試出題品質
            </DialogTitle>
            <DialogDescription>
              針對「{testGenSource?.title}」測試 AI 出題效果（不儲存到資料庫）
            </DialogDescription>
          </DialogHeader>
          {!testGenResult ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>測試題數</Label>
                  <Select value={String(testGenForm.questionCount)} onValueChange={(v) => setTestGenForm(f => ({ ...f, questionCount: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 題（快速測試）</SelectItem>
                      <SelectItem value="5">5 題（標準測試）</SelectItem>
                      <SelectItem value="10">10 題（完整測試）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>難度</Label>
                  <Select value={testGenForm.difficulty} onValueChange={(v: any) => setTestGenForm(f => ({ ...f, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">簡單</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困難</SelectItem>
                      <SelectItem value="mixed">混合</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                ⚠️ 測試出題不會儲存到資料庫，僅供預覽 AI 出題品質。確認品質後，請使用「一鍵出題」正式建立題庫。
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {testGenResult.subjectConstraint ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    🎯 科目限制中
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    📚 知識型
                  </Badge>
                )}
                <span className="text-muted-foreground">共 {testGenResult.questions?.length || 0} 題</span>
              </div>
              {/* Prompt 顯示區塊 */}
              {testGenResult.prompt && (
                <details className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5 select-none">
                    <span>🔍 查看實際送給 AI 的 Prompt（可展開編輯）</span>
                  </summary>
                  <div className="px-3 pb-3 pt-1 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">「 System 指令 」</p>
                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border p-2 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{testGenResult.systemContent}</pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">「 User Prompt 」</p>
                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border p-2 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{testGenResult.prompt}</pre>
                    </div>
                  </div>
                </details>
              )}
              <div className="space-y-4">
                {(testGenResult.questions || []).map((q: any, idx: number) => (
                  <div key={idx} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-muted-foreground min-w-[24px]">Q{idx + 1}.</span>
                      <p className="text-sm whitespace-pre-line">{q.question}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt} className={`text-xs p-2 rounded border ${
                          q.correct_answer === opt ? 'bg-green-50 border-green-300 text-green-800 font-medium' : 'bg-muted/30'
                        }`}>
                          <span className="font-bold">{opt}.</span> {q.options?.[opt]}
                        </div>
                      ))}
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground bg-blue-50 rounded p-2">
                      💡 {q.explanation}
                    </div>
                    <div className="pl-6">
                      <Badge variant="outline" className="text-xs">
                        {q.difficulty === 'easy' ? '簡單' : q.difficulty === 'hard' ? '困難' : '中等'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {testGenResult ? (
              <>
                <Button variant="outline" onClick={() => setTestGenResult(null)}>重新測試</Button>
                <Button variant="outline" onClick={() => { setTestGenSource(null); setTestGenResult(null); }}>關閉</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                  onClick={() => {
                    setTestGenSource(null);
                    setTestGenResult(null);
                    setQuickGenSource(testGenSource);
                    setQuickGenForm({ questionCount: 20, difficulty: 'mixed', questionTypes: ['multiple_choice'], pointCost: 0, essayCount: 5 });
                  }}
                >
                  <Brain className="w-4 h-4" />品質不錯，正式出題
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setTestGenSource(null)}>取消</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                  onClick={() => testGenerateMutation.mutate({
                    sourceId: testGenSource!.id,
                    questionCount: testGenForm.questionCount,
                    difficulty: testGenForm.difficulty,
                    questionTypes: ['multiple_choice'],
                  })}
                  disabled={testGenerateMutation.isPending}
                >
                  {testGenerateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                  {testGenerateMutation.isPending ? '出題中...' : '開始測試'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一鍵出題 Dialog */}
      <Dialog open={quickGenSource !== null} onOpenChange={(open) => { if (!open) setQuickGenSource(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />一鍵出題
            </DialogTitle>
          </DialogHeader>
          {quickGenSource && (
            <div className="space-y-4 pt-1" key={quickGenSource.id}>
              <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">素材：</span>
                <span className="font-medium">{quickGenSource.title}</span>
                {quickGenSource.status === 'ready' && (
                  <span className="text-green-600 ml-2 text-xs">✓ 已解析</span>
                )}
                {/* 題型組成標籤 */}
                {((quickGenSource as any).detectedMcCount > 0 || (quickGenSource as any).detectedEssayCount > 0) && (
                  <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    {(quickGenSource as any).detectedMcCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        選擇題 {(quickGenSource as any).detectedMcCount} 題
                      </span>
                    )}
                    {(quickGenSource as any).detectedEssayCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                        申論題 {(quickGenSource as any).detectedEssayCount} 題
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 純申論題警告 */}
              {(quickGenSource as any).detectedMcCount === 0 && (quickGenSource as any).detectedEssayCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 text-base mt-0.5">⚠️</span>
                    <div>
                      <p className="font-medium text-amber-800">偵測到此素材可能僅含申論題</p>
                      <p className="text-amber-700 mt-0.5">純申論題的 PDF 讓 AI 出選擇題時容易出現跟主題無關的題目（如國文成語題）。建議使用教材類素材或含選擇題的考古題。
                      </p>
                      <p className="text-amber-600 text-xs mt-1">您仍可選擇「仍要出題」，但品質可能較差。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 混合題型提示 */}
              {(quickGenSource as any).detectedMcCount > 0 && (quickGenSource as any).detectedEssayCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                  ℹ️ 此素材含選擇題與申論題，AI 將優先依據選擇題內容出題。
                </div>
              )}

              {/* 題型選擇 */}
              <div>
                <Label className="text-sm font-medium">題型</Label>
                <div className="flex gap-2 mt-1.5">
                  {[{ value: 'multiple_choice', label: '選擇題' }, { value: 'essay', label: '申論題' }].map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={quickGenForm.questionTypes.includes(opt.value as any) ? 'default' : 'outline'}
                      onClick={() => {
                        const v = opt.value as 'multiple_choice' | 'essay';
                        setQuickGenForm(f => ({
                          ...f,
                          questionTypes: f.questionTypes.includes(v)
                            ? f.questionTypes.filter(t => t !== v)
                            : [...f.questionTypes, v],
                        }));
                      }}
                    >{opt.label}</Button>
                  ))}
                </div>
              </div>

              {/* 選擇題題數 */}
              {quickGenForm.questionTypes.includes('multiple_choice') && (
                <div>
                  <Label className="text-sm font-medium">選擇題題數</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      type="number"
                      min={1} max={100}
                      value={quickGenForm.questionCount}
                      onChange={e => setQuickGenForm(f => ({ ...f, questionCount: Math.max(1, Math.min(100, parseInt(e.target.value) || 1)) }))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">題（1~100）</span>
                    <div className="flex gap-1 ml-2">
                      {[10, 20, 30, 50].map(n => (
                        <Button key={n} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => setQuickGenForm(f => ({ ...f, questionCount: n }))}>{n}</Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 申論題題數 */}
              {quickGenForm.questionTypes.includes('essay') && (
                <div>
                  <Label className="text-sm font-medium">申論題題數</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      type="number"
                      min={1} max={20}
                      value={quickGenForm.essayCount}
                      onChange={e => setQuickGenForm(f => ({ ...f, essayCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) }))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">題（1~20）</span>
                    <div className="flex gap-1 ml-2">
                      {[3, 5, 10].map(n => (
                        <Button key={n} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => setQuickGenForm(f => ({ ...f, essayCount: n }))}>{n}</Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 難度 */}
              <div>
                <Label className="text-sm font-medium">難度</Label>
                <div className="flex gap-2 mt-1.5">
                  {[{ value: 'easy', label: '簡單' }, { value: 'medium', label: '中等' }, { value: 'hard', label: '困難' }, { value: 'mixed', label: '混合' }].map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={quickGenForm.difficulty === opt.value ? 'default' : 'outline'}
                      onClick={() => setQuickGenForm(f => ({ ...f, difficulty: opt.value as any }))}
                    >{opt.label}</Button>
                  ))}
                </div>
              </div>

              {/* 解鎖點數 */}
              <div>
                <Label className="text-sm font-medium">解鎖點數（0 = 免費）</Label>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {[0, 1, 2, 5, 10].map(n => (
                    <Button key={n} variant={quickGenForm.pointCost === n && quickGenCustomPointInput === '' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => { setQuickGenForm(f => ({ ...f, pointCost: n })); setQuickGenCustomPointInput(''); }}>{n === 0 ? '免費' : `${n} 點`}</Button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0} max={9999}
                      placeholder="自訂"
                      value={quickGenCustomPointInput}
                      onChange={e => {
                        const raw = e.target.value;
                        setQuickGenCustomPointInput(raw);
                        const v = parseInt(raw);
                        if (!isNaN(v) && v >= 0) setQuickGenForm(f => ({ ...f, pointCost: v }));
                        else if (raw === '') setQuickGenForm(f => ({ ...f, pointCost: 0 }));
                      }}
                      onFocus={() => {
                        // 點擊 input 時，清除預設按鈕的選中狀態
                        if (quickGenCustomPointInput === '') setQuickGenCustomPointInput('');
                      }}
                      className={`w-20 h-7 text-xs ${quickGenCustomPointInput !== '' ? 'ring-2 ring-primary' : ''}`}
                    />
                    <span className="text-xs text-muted-foreground">點</span>
                  </div>
                </div>
              </div>

              {/* 分科出題區塊 */}
              {detectSubjectsQuery.data && detectedSubjects.length > 1 && (
                <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-indigo-800">📚 偵測到複合科目</span>
                      <span className="text-xs text-indigo-600">{detectedSubjects.join('、')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">分科出題</span>
                      <Switch
                        checked={splitSubjectMode}
                        onCheckedChange={(v) => {
                          setSplitSubjectMode(v);
                          if (v && subjectQuestions.length === 0) {
                            const total = quickGenForm.questionCount;
                            const perSubject = Math.floor(total / detectedSubjects.length);
                            const remainder = total - perSubject * detectedSubjects.length;
                            setSubjectQuestions(detectedSubjects.map((s, i) => ({
                              subject: s,
                              questionCount: i === 0 ? perSubject + remainder : perSubject,
                              essayCount: 0,
                            })));
                          }
                        }}
                      />
                    </div>
                  </div>
                  {splitSubjectMode && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-indigo-700">分配方式：</span>
                      <button
                        className={`text-xs px-2 py-0.5 rounded ${splitDistribution === 'auto' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-300'}`}
                        onClick={() => {
                          setSplitDistribution('auto');
                          const total = quickGenForm.questionCount;
                          const perSubject = Math.floor(total / detectedSubjects.length);
                          const remainder = total - perSubject * detectedSubjects.length;
                          setSubjectQuestions(detectedSubjects.map((s, i) => ({
                            subject: s,
                            questionCount: i === 0 ? perSubject + remainder : perSubject,
                            essayCount: 0,
                          })));
                        }}
                      >平均分配</button>
                      <button
                        className={`text-xs px-2 py-0.5 rounded ${splitDistribution === 'manual' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-300'}`}
                        onClick={() => setSplitDistribution('manual')}
                      >手動設定</button>
                    </div>
                    {subjectQuestions.map((sq, idx) => (
                      <div key={sq.subject} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-indigo-100">
                        <span className="text-xs font-medium text-indigo-700 w-16 shrink-0">{sq.subject}</span>
                        <span className="text-xs text-muted-foreground">選擇題</span>
                        <input
                          type="number"
                          min={1} max={50}
                          value={sq.questionCount}
                          disabled={splitDistribution === 'auto'}
                          onChange={e => {
                            const v = parseInt(e.target.value) || 1;
                            setSubjectQuestions(prev => prev.map((s, i) => i === idx ? { ...s, questionCount: v } : s));
                          }}
                          className="w-14 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-center disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-xs text-muted-foreground">題</span>
                      </div>
                    ))}
                    <div className="text-xs text-indigo-600 pt-1">
                      共 {subjectQuestions.reduce((s, q) => s + q.questionCount, 0)} 題（各科分別出題再合併）
                    </div>
                  </div>
                )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* 預覽 Prompt 開關 */}
            <div className="flex items-center gap-2 text-sm">
              <Switch
                id="prompt-preview-toggle"
                checked={showPromptPreview}
                onCheckedChange={(v) => {
                  setShowPromptPreview(v);
                  try { localStorage.setItem('admin_show_prompt_preview', v ? 'true' : 'false'); } catch {}
                }}
              />
              <Label htmlFor="prompt-preview-toggle" className="text-muted-foreground cursor-pointer select-none">
                出題前預覽 Prompt
              </Label>
            </div>
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQuickGenSource(null)}>取消</Button>
            {showPromptPreview && (
              <Button
                variant="outline"
                className="gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  if (!quickGenSource) return;
                  if (quickGenForm.questionTypes.length === 0) { toast.error('請至少選擇一種題型'); return; }
                  previewPromptMutation.mutate({
                    sourceIds: [quickGenSource.id],
                    questionCount: quickGenForm.questionCount,
                    essayCount: quickGenForm.essayCount,
                    difficulty: quickGenForm.difficulty,
                    questionTypes: quickGenForm.questionTypes,
                  });
                }}
                disabled={previewPromptMutation.isPending}
              >
                {previewPromptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🔍</>}
                預覽 Prompt
              </Button>
            )}
            <Button
              onClick={() => {
                if (!quickGenSource) return;
                if (quickGenForm.questionTypes.length === 0) { toast.error('請至少選擇一種題型'); return; }
                quickGenerateMutation.mutate({
                  sourceId: quickGenSource.id,
                  questionCount: quickGenForm.questionCount,
                  essayCount: quickGenForm.essayCount,
                  difficulty: quickGenForm.difficulty,
                  questionTypes: quickGenForm.questionTypes,
                  pointCost: quickGenForm.pointCost,
                });
              }}
              disabled={quickGenerateMutation.isPending}
              className={`gap-1 ${
                quickGenSource && (quickGenSource as any).detectedMcCount === 0 && (quickGenSource as any).detectedEssayCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : ''
              }`}
            >
              {quickGenerateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {quickGenSource && (quickGenSource as any).detectedMcCount === 0 && (quickGenSource as any).detectedEssayCount > 0
                ? '仍要出題'
                : '開始出題'
              }
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 素材批次刪除確認 */}
      <AlertDialog open={sourceBatchDeleteOpen} onOpenChange={setSourceBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認批次刪除素材</AlertDialogTitle>
            <AlertDialogDescription>
              將刪除已選的 <span className="font-semibold text-destructive">{selectedSourceIds.length} 筆素材</span>，此操作不可復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => sourceBatchDeleteMutation.mutate({ ids: selectedSourceIds })}
              disabled={sourceBatchDeleteMutation.isPending}
            >
              {sourceBatchDeleteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />刪除中...</> : '確認刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批次一鍵出題 Dialog */}
      <Dialog open={showBatchQuickGen} onOpenChange={setShowBatchQuickGen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />批次一鍵出題
            </DialogTitle>
            <DialogDescription>將為已選的 {selectedSourceIds.length} 筆素材各自建立一個題庫並出題</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-sm font-medium">題型</Label>
              <div className="flex gap-3 mt-1.5">
                {(['multiple_choice', 'essay'] as const).map(t => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={batchQuickGenForm.questionTypes.includes(t)}
                      onCheckedChange={(checked) => {
                        setBatchQuickGenForm(f => ({
                          ...f,
                          questionTypes: checked
                            ? [...f.questionTypes, t]
                            : f.questionTypes.filter(x => x !== t)
                        }));
                      }}
                    />
                    <span className="text-sm">{t === 'multiple_choice' ? '選擇題' : '申論題'}</span>
                  </label>
                ))}
              </div>
            </div>
            {batchQuickGenForm.questionTypes.includes('multiple_choice') && (
              <div>
                <Label className="text-sm font-medium">選擇題題數</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {[10, 20, 30, 50].map(n => (
                    <Button key={n} variant={batchQuickGenForm.questionCount === n ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setBatchQuickGenForm(f => ({ ...f, questionCount: n }))}>{n} 題</Button>
                  ))}
                </div>
              </div>
            )}
            {batchQuickGenForm.questionTypes.includes('essay') && (
              <div>
                <Label className="text-sm font-medium">申論題題數</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {[3, 5, 8, 10].map(n => (
                    <Button key={n} variant={batchQuickGenForm.essayCount === n ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setBatchQuickGenForm(f => ({ ...f, essayCount: n }))}>{n} 題</Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">難度</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {([['easy', '簡單'], ['medium', '中等'], ['hard', '困難'], ['mixed', '混合']] as const).map(([v, label]) => (
                  <Button key={v} variant={batchQuickGenForm.difficulty === v ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setBatchQuickGenForm(f => ({ ...f, difficulty: v }))}>{label}</Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">解鎖點數（0 = 免費）</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                {[0, 1, 2, 5].map(n => (
                  <Button key={n} variant={batchQuickGenForm.pointCost === n && batchCustomPointInput === '' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => { setBatchQuickGenForm(f => ({ ...f, pointCost: n })); setBatchCustomPointInput(''); }}>{n === 0 ? '免費' : `${n} 點`}</Button>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0} max={9999}
                    placeholder="自訂"
                    value={batchCustomPointInput}
                    onChange={e => {
                      const raw = e.target.value;
                      setBatchCustomPointInput(raw);
                      const v = parseInt(raw);
                      if (!isNaN(v) && v >= 0) setBatchQuickGenForm(f => ({ ...f, pointCost: v }));
                      else if (raw === '') setBatchQuickGenForm(f => ({ ...f, pointCost: 0 }));
                    }}
                    className={`w-20 h-7 text-xs ${batchCustomPointInput !== '' ? 'ring-2 ring-primary' : ''}`}
                  />
                  <span className="text-xs text-muted-foreground">點</span>
                </div>
              </div>
            </div>
          </div>
          {/* 批次出題進度 */}
          {batchQuickGenProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">批次出題中... {batchQuickGenProgress.current}/{batchQuickGenProgress.total}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{batchQuickGenProgress.currentTitle}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((batchQuickGenProgress.current / batchQuickGenProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">正在處理：{batchQuickGenProgress.currentTitle}</p>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => {
              if (batchQuickGenProgress) {
                batchQuickGenAbortRef.current = true;
                toast.info('停止中，等待當前項目完成...');
              } else {
                setShowBatchQuickGen(false);
              }
            }}>{batchQuickGenProgress ? '停止' : '取消'}</Button>
            <Button
              onClick={handleBatchQuickGen}
              disabled={!!batchQuickGenProgress}
              className="gap-1"
            >
              {batchQuickGenProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {batchQuickGenProgress ? `出題中... ${batchQuickGenProgress.current}/${batchQuickGenProgress.total}` : '開始批次出題'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>刪除後無法復原，確定要刪除此素材嗎？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 編輯素材對話框 */}
      <Dialog open={editingSource !== null} onOpenChange={(open) => { if (!open) setEditingSource(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯素材</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>素材標題 *</Label>
              <Input
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="素材名稱"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>素材類型</Label>
                <Select value={editForm.sourceType} onValueChange={(v: any) => setEditForm(f => ({ ...f, sourceType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">教材（講義/書本）</SelectItem>
                    <SelectItem value="exam">考題（歷年試題）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>科目分類（選填）</Label>
                <Input
                  value={editForm.category}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="例：民法、會計"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>年度（選填）</Label>
                <Input
                  value={editForm.year}
                  onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="例：2024、113年"
                />
              </div>
              <div>
                <Label>考試類組（選填）</Label>
                <Input
                  value={editForm.examGroup}
                  onChange={e => setEditForm(f => ({ ...f, examGroup: e.target.value }))}
                  placeholder="例：地方特考三等"
                />
              </div>
            </div>
            <div>
              <Label>老師名稱（選填）</Label>
              <Input
                value={editForm.teacherName}
                onChange={e => setEditForm(f => ({ ...f, teacherName: e.target.value }))}
                placeholder="例：王大明老師"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSource(null)}>取消</Button>
            <Button
              onClick={() => editingSource && updateSourceMutation.mutate({
                id: editingSource.id,
                title: editForm.title,
                sourceType: editForm.sourceType,
                category: editForm.category || undefined,
                year: editForm.year || undefined,
                examGroup: editForm.examGroup || undefined,
                teacherName: editForm.teacherName || undefined,
              })}
              disabled={updateSourceMutation.isPending || !editForm.title}
            >
              {updateSourceMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />儲存中...</> : '儲存變更'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次上傳對話框 */}
      <Dialog open={showBatchDialog} onOpenChange={(open) => { if (!open && !batchUploading) { setShowBatchDialog(false); if (!batchProgress.done) { setBatchFiles([]); setBatchResults([]); setBatchEditRows([]); setBatchProgress({ current: 0, total: 0, fileName: '', done: false }); if (batchFileInputRef.current) batchFileInputRef.current.value = ''; } } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批次上傳素材</DialogTitle>
          </DialogHeader>
          {!batchProgress.done ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">一次選擇多個 PDF 或 Word 檔案，上傳完成後可一次編輯所有素材資訊</p>
              <div>
                <Label>選擇檔案（支援多選）</Label>
                <input
                  ref={batchFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={handleBatchFileSelect}
                  className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
                {batchFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">已選擇 {batchFiles.length} 個檔案：{batchFiles.map(f => f.name).join('、')}</p>
                )}
              </div>
              {batchUploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>上傳中，請勿關閉此視窗...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowBatchDialog(false); setBatchFiles([]); if (batchFileInputRef.current) batchFileInputRef.current.value = ''; }} disabled={batchUploading}>取消</Button>
                <Button onClick={handleBatchUpload} disabled={batchUploading || batchFiles.length === 0}>
                  {batchUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />上傳中...</> : `上傳 ${batchFiles.length} 個檔案`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>成功上傳 {batchProgress.current} 個素材，請確認或修改以下資訊後儲存</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    if (batchEditRows.length < 2) return;
                    const first = batchEditRows[0];
                    setBatchEditRows(rows => rows.map((r, i) => i === 0 ? r : {
                      ...r,
                      sourceType: first.sourceType,
                      category: first.category,
                      year: first.year,
                      examGroup: first.examGroup,
                      teacherName: first.teacherName,
                    }));
                  }}
                >
                  📋 全部套用第一列設定
                </Button>
                <span className="text-xs text-muted-foreground">或逐列點「↑ 同上」複製上一列</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3 font-medium">檔案名稱</th>
                      <th className="text-left py-2 pr-3 font-medium">素材標題</th>
                      <th className="text-left py-2 pr-3 font-medium">類型</th>
                      <th className="text-left py-2 pr-3 font-medium">科目分類</th>
                      <th className="text-left py-2 pr-3 font-medium">年度</th>
                      <th className="text-left py-2 pr-3 font-medium">考試類組</th>
                      <th className="text-left py-2 pr-3 font-medium">老師名稱</th>
                      <th className="text-left py-2 font-medium">複製</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchEditRows.map((row, idx) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-xs text-muted-foreground max-w-[120px] truncate">{batchResults[idx]?.fileName || '-'}</td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.title}
                            onChange={e => setBatchEditRows(rows => rows.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))}
                            className="h-7 text-xs min-w-[120px]"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Select value={row.sourceType} onValueChange={(v: any) => setBatchEditRows(rows => rows.map((r, i) => i === idx ? { ...r, sourceType: v } : r))}>
                            <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lecture">教材</SelectItem>
                              <SelectItem value="exam">考題</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.category}
                            onChange={e => setBatchEditRows(rows => rows.map((r, i) => i === idx ? { ...r, category: e.target.value } : r))}
                            placeholder="民法、會計"
                            className="h-7 text-xs w-[80px]"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.year}
                            onChange={e => setBatchEditRows(rows => rows.map((r, i) => i === idx ? { ...r, year: e.target.value } : r))}
                            placeholder="113年"
                            className="h-7 text-xs w-[70px]"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.examGroup}
                            onChange={e => setBatchEditRows(rows => rows.map((r, i) => i === idx ? { ...r, examGroup: e.target.value } : r))}
                            placeholder="地方特考"
                            className="h-7 text-xs w-[90px]"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            value={row.teacherName}
                            onChange={e => setBatchEditRows(rows => rows.map((r, i) => i === idx ? { ...r, teacherName: e.target.value } : r))}
                            placeholder="老師名"
                            className="h-7 text-xs w-[80px]"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          {idx > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 whitespace-nowrap"
                              title="複製上一列的設定"
                              onClick={() => {
                                const prev = batchEditRows[idx - 1];
                                setBatchEditRows(rows => rows.map((r, i) => i === idx ? {
                                  ...r,
                                  sourceType: prev.sourceType,
                                  category: prev.category,
                                  year: prev.year,
                                  examGroup: prev.examGroup,
                                  teacherName: prev.teacherName,
                                } : r));
                              }}
                            >
                              ↑ 同上
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowBatchDialog(false); setBatchFiles([]); setBatchResults([]); setBatchEditRows([]); setBatchProgress({ current: 0, total: 0, fileName: '', done: false }); if (batchFileInputRef.current) batchFileInputRef.current.value = ''; }} disabled={batchSaving}>稍後編輯</Button>
                <Button onClick={handleBatchSave} disabled={batchSaving}>
                  {batchSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />儲存中...</> : '儲存所有素材資訊'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Prompt 預覽對話框 */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🔍</span>出題 Prompt 預覽
            </DialogTitle>
            <DialogDescription>
              以下是 AI 出題時實際使用的 Prompt，可確認科目限制是否正確套用
            </DialogDescription>
          </DialogHeader>
          {promptPreviewData && (
            <div className="space-y-4 pt-1">
              {/* 科目偵測狀態 */}
              <div className={`rounded-lg px-3 py-2.5 text-sm border ${
                promptPreviewData.hasSubjectConstraint
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="font-medium">{promptPreviewData.subjectInfo}</div>
                {promptPreviewData.subjectConstraint && (
                  <div className="mt-1 text-xs opacity-80">科目限制已套用，共 {promptPreviewData.sourceTitles.length} 個素材</div>
                )}
              </div>
              {/* System Prompt */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">System Prompt</span>
                  <span className="text-xs text-muted-foreground">(角色設定)</span>
                </div>
                <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {promptPreviewData.systemPrompt}
                </div>
              </div>
              {/* 選擇題 User Prompt */}
              {promptPreviewData.mcPrompt && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User Prompt</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">選擇題</span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {promptPreviewData.mcPrompt}
                  </div>
                </div>
              )}
              {/* 申論題 User Prompt */}
              {promptPreviewData.essayPrompt && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User Prompt</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">申論題</span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {promptPreviewData.essayPrompt}
                  </div>
                </div>
              )}
              {/* 提示 */}
              <p className="text-xs text-muted-foreground">
                ℹ️ 內容節錄展示兩千字，實際出題時會使用完整結取的素材內容。
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptDialog(false)}>關閉</Button>
            <Button
              onClick={() => {
                setShowPromptDialog(false);
                if (!quickGenSource) return;
                if (quickGenForm.questionTypes.length === 0) { toast.error('請至少選擇一種題型'); return; }
                quickGenerateMutation.mutate({
                  sourceId: quickGenSource.id,
                  questionCount: quickGenForm.questionCount,
                  essayCount: quickGenForm.essayCount,
                  difficulty: quickGenForm.difficulty,
                  questionTypes: quickGenForm.questionTypes,
                  pointCost: quickGenForm.pointCost,
                });
              }}
              className="gap-1"
            >
              <Brain className="w-4 h-4" />確認出題
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一鍵同步高上考古題 Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              一鍵同步高上公職考古題
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">自動增量同步</p>
              <p className="text-xs text-blue-700">系統將自動偵測已匯入的考古題，只下載新增的部分，不會重複匯入。背景執行，可繼續操作其他功能。</p>
            </div>
            {latestSync && (latestSync as any).status === 'completed' && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground text-xs">上次同步結果</p>
                <p className="font-medium mt-0.5">新導入 {(latestSync as any).new_imported ?? 0} 筆，跳過 {(latestSync as any).skipped ?? 0} 筆重複</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(latestSync as any).completed_at ? new Date((latestSync as any).completed_at).toLocaleString('zh-TW') : ''}</p>
              </div>
            )}
            <div>
              <Label className="text-sm">考試類別（選填）</Label>
              <Select value={syncExamGroup || 'all'} onValueChange={v => setSyncExamGroup(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="全部考試類別" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部考試類別</SelectItem>
                  <SelectItem value="3">高普考試</SelectItem>
                  <SelectItem value="4">初等考試</SelectItem>
                  <SelectItem value="5">地方特考</SelectItem>
                  <SelectItem value="6">其他特考</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">年度篩選（選填，民國年）</Label>
              <Input
                className="mt-1"
                value={syncFilterYear}
                onChange={e => setSyncFilterYear(e.target.value)}
                placeholder="例：114（留空=全部年度）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>取消</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => startSyncMutation.mutate({
                examGroup: syncExamGroup || undefined,
                filterYear: syncFilterYear || undefined,
              })}
              disabled={startSyncMutation.isPending}
            >
              {startSyncMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />啟動中...</>
                : <><RefreshCw className="w-4 h-4 mr-2" />開始同步</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 建立題庫 Tab ====================
function CreateExamTab({ onCreated }: { onCreated?: (examId: number) => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    sourceIds: [] as number[],
    questionCount: 20,
    essayCount: 3,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
    pointCost: 0,
    essayPointCost: 0,
    examGroup: 'all' as string,
    questionTypes: ['multiple_choice'] as ('multiple_choice' | 'essay')[],
  });

  const { data: sourcesData } = trpc.aiSources.list.useQuery({ page: 1, pageSize: 5000, status: 'ready' });
  const readySources = (sourcesData?.items ?? []);
  // 素材搜尋和類科篩選
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState<string>('all');
  const [sourceYearFilter, setSourceYearFilter] = useState<string>('all');
  const [sourceExamGroupFilter, setSourceExamGroupFilter] = useState<string>('all');
  const [sourceTeacherFilter, setSourceTeacherFilter] = useState<string>('all');
  // 取得所有類科、年度、考試類組、老師
  const allCategories = Array.from(new Set(readySources.map((s: any) => s.category).filter(Boolean))) as string[];
  const allYears = Array.from(new Set(readySources.map((s: any) => s.year).filter(Boolean))).sort((a: any, b: any) => b.localeCompare(a)) as string[];
  const allExamGroups = Array.from(new Set(readySources.map((s: any) => s.examGroup).filter(Boolean))) as string[];
  const allTeachers = Array.from(new Set(readySources.map((s: any) => s.teacherName).filter(Boolean))) as string[];
  // 篩選後的素材
  const filteredSources = readySources.filter((s: any) => {
    const matchSearch = !sourceSearch || s.title.toLowerCase().includes(sourceSearch.toLowerCase()) || (s.category && s.category.toLowerCase().includes(sourceSearch.toLowerCase())) || (s.year && s.year.toLowerCase().includes(sourceSearch.toLowerCase()));
    const matchCategory = sourceCategoryFilter === 'all' || s.category === sourceCategoryFilter;
    const matchYear = sourceYearFilter === 'all' || s.year === sourceYearFilter;
    const matchExamGroup = sourceExamGroupFilter === 'all' || s.examGroup === sourceExamGroupFilter;
    const matchTeacher = sourceTeacherFilter === 'all' || s.teacherName === sourceTeacherFilter;
    return matchSearch && matchCategory && matchYear && matchExamGroup && matchTeacher;
  });
  // 全選/取消當前篩選結果
  const toggleAllFiltered = () => {
    const filteredIds = filteredSources.map((s: any) => s.id);
    const allSelected = filteredIds.every((id: number) => form.sourceIds.includes(id));
    if (allSelected) {
      setForm(f => ({ ...f, sourceIds: f.sourceIds.filter(id => !filteredIds.includes(id)) }));
    } else {
      setForm(f => ({ ...f, sourceIds: Array.from(new Set([...f.sourceIds, ...filteredIds])) }));
    }
  };

  const [isCreating, setIsCreating] = useState(false);

  const createMutation = trpc.aiExams.create.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const toggleSource = (id: number) => {
    setForm(f => ({
      ...f,
      sourceIds: f.sourceIds.includes(id) ? f.sourceIds.filter(x => x !== id) : [...f.sourceIds, id],
    }));
  };

  const handleCreate = async () => {
    if (!form.title) { toast.error('請填寫題庫標題'); return; }
    if (form.sourceIds.length === 0) { toast.error('請至少選擇一個素材'); return; }
    if (form.questionTypes.length === 0) { toast.error('請至少選擇一種題型'); return; }

    const hasMC = form.questionTypes.includes('multiple_choice');
    const hasEssay = form.questionTypes.includes('essay');

    setIsCreating(true);
    try {
      let lastId: number | null = null;

      if (hasMC) {
        // 建立選擇題題庫
        const mcData = await createMutation.mutateAsync({
          ...form,
          title: hasEssay ? `${form.title}（選擇題）` : form.title,
          questionTypes: ['multiple_choice'],
          pointCost: form.pointCost,
          examGroup: form.examGroup || null,
        });
        lastId = mcData.id;
        toast.success('選擇題題庫建立中，AI 出題中...');
      }

      if (hasEssay) {
        // 建立申論題題庫
        const essayData = await createMutation.mutateAsync({
          ...form,
          title: hasMC ? `${form.title}（申論題）` : form.title,
          questionTypes: ['essay'],
          questionCount: form.essayCount,
          pointCost: form.essayPointCost,
        });
        lastId = essayData.id;
        toast.success('申論題題庫建立中，AI 出題中...');
      }

      utils.aiExams.list.invalidate();
      utils.aiExams.adminList.invalidate();
      setForm({ title: '', description: '', category: '', sourceIds: [], questionCount: 20, essayCount: 3, difficulty: 'mixed', pointCost: 0, essayPointCost: 0, examGroup: 'all', questionTypes: ['multiple_choice'] });
      if (lastId && onCreated) onCreated(lastId);
    } catch (e: any) {
      // error already handled by mutation
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-lg font-semibold">建立新題庫</h2>
        <p className="text-sm text-muted-foreground">選擇素材，讓 AI 自動生成題目</p>
      </div>
      <div className="space-y-2">
        <div>
          <Label className="text-xs">題庫標題 *</Label>
          <Input className="h-8" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：民法基礎概念練習" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">說明（選填）</Label>
            <Input className="h-8" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="題庫說明..." />
          </div>
          <div>
            <Label className="text-xs">科目分類（選填）</Label>
            <Input className="h-8" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="例：民法" />
          </div>
        </div>
        {/* 題型選擇 + 各題型獨立設定 */}
        <div className="border rounded-lg p-3 space-y-3">
          <div>
            <Label className="mb-1 block text-sm font-semibold">題型選擇 *</Label>
            <p className="text-xs text-muted-foreground mb-2">勾選多種題型時，會自動分開建立多個獨立題庫</p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.questionTypes.includes('multiple_choice')}
                  onChange={e => {
                    if (e.target.checked) {
                      setForm(f => ({ ...f, questionTypes: [...f.questionTypes, 'multiple_choice'] }));
                    } else {
                      setForm(f => ({ ...f, questionTypes: f.questionTypes.filter(t => t !== 'multiple_choice') }));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-blue-700">選擇題</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.questionTypes.includes('essay')}
                  onChange={e => {
                    if (e.target.checked) {
                      setForm(f => ({ ...f, questionTypes: [...f.questionTypes, 'essay'] }));
                    } else {
                      setForm(f => ({ ...f, questionTypes: f.questionTypes.filter(t => t !== 'essay') }));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-amber-700">申論題</span>
              </label>
            </div>
          </div>

          {/* 選擇題設定 */}
          {form.questionTypes.includes('multiple_choice') && (
            <div className="border border-blue-200 rounded-md p-3 space-y-3 bg-blue-50/50">
              <p className="text-sm font-medium text-blue-700">🟦 選擇題設定</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">出題數量</Label>
                  <Select value={String(form.questionCount)} onValueChange={v => setForm(f => ({ ...f, questionCount: parseInt(v) }))}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 題</SelectItem>
                      <SelectItem value="20">20 題</SelectItem>
                      <SelectItem value="30">30 題</SelectItem>
                      <SelectItem value="50">50 題</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">難度</Label>
                  <Select value={form.difficulty} onValueChange={(v: any) => setForm(f => ({ ...f, difficulty: v }))}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">簡單</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困難</SelectItem>
                      <SelectItem value="mixed">混合</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">解鎖點數（0=免費）</Label>
                  <Input type="number" min={0} max={9999} value={form.pointCost === 0 ? '' : form.pointCost} placeholder="0（一題1點）" onChange={e => setForm(f => ({ ...f, pointCost: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))} className="h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">考試類別</Label>
                  <Select value={form.examGroup} onValueChange={v => setForm(f => ({ ...f, examGroup: v }))}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="選擇考試類別" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">綜合</SelectItem>
                      <SelectItem value="3">高普考試</SelectItem>
                      <SelectItem value="4">初等考試</SelectItem>
                      <SelectItem value="5">地方特考</SelectItem>
                      <SelectItem value="6">其他特考</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* 申論題設定 */}
          {form.questionTypes.includes('essay') && (
            <div className="border border-amber-200 rounded-md p-3 space-y-3 bg-amber-50/50">
              <p className="text-sm font-medium text-amber-700">🟨 申論題設定</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">出題數量</Label>
                  <Select value={String(form.essayCount)} onValueChange={v => setForm(f => ({ ...f, essayCount: parseInt(v) }))}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 題</SelectItem>
                      <SelectItem value="2">2 題</SelectItem>
                      <SelectItem value="3">3 題</SelectItem>
                      <SelectItem value="5">5 題</SelectItem>
                      <SelectItem value="8">8 題</SelectItem>
                      <SelectItem value="10">10 題</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">點數（0=免費）</Label>
                  <Input type="number" min={0} max={9999} value={form.essayPointCost === 0 ? '' : form.essayPointCost} placeholder="0" onChange={e => setForm(f => ({ ...f, essayPointCost: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))} className="h-8" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">申論題預設不公開，建立後可在題庫管理中單獨開啟</p>
            </div>
          )}

          {/* 將建立的題庫預覽 */}
          {form.questionTypes.length > 0 && form.title && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
              <span className="font-medium">將建立：</span>
              {form.questionTypes.includes('multiple_choice') && (
                <span className="inline-block ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {form.questionTypes.includes('essay') ? `${form.title}（選擇題）` : form.title}
                </span>
              )}
              {form.questionTypes.includes('essay') && (
                <span className="inline-block ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                  {form.questionTypes.includes('multiple_choice') ? `${form.title}（申論題）` : form.title}
                </span>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>選擇素材 * <span className="text-muted-foreground text-xs">（已就緒的素材才能選擇）</span></Label>
            {form.sourceIds.length > 0 && (
              <span className="text-xs text-primary font-medium">已選 {form.sourceIds.length} 個素材</span>
            )}
          </div>
          {readySources.length === 0 ? (
            <Card className="mt-2">
              <CardContent className="py-4 text-center text-muted-foreground text-sm">
                尚無就緒的素材，請先在「素材管理」上傳並等待解析完成
              </CardContent>
            </Card>
          ) : (
            <div className="mt-1 border rounded-md">
              {/* 搜尋 + 類科篩選 */}
              <div className="p-2 border-b bg-muted/30 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={sourceSearch}
                    onChange={e => setSourceSearch(e.target.value)}
                    placeholder="搜尋素材名稱或類科..."
                    className="pl-7 h-8 text-sm"
                  />
                </div>
                {false && allCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground self-center mr-1">類科:</span>
                    <button
                      type="button"
                      onClick={() => setSourceCategoryFilter('all')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        sourceCategoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >全部</button>
                    {allCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSourceCategoryFilter(sourceCategoryFilter === cat ? 'all' : cat)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          sourceCategoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >{cat}</button>
                    ))}
                  </div>
                )}
                {false && allYears.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground self-center mr-1">年度:</span>
                    <button
                      type="button"
                      onClick={() => setSourceYearFilter('all')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        sourceYearFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                      }`}
                    >全部</button>
                    {allYears.map(yr => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSourceYearFilter(sourceYearFilter === yr ? 'all' : yr)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          sourceYearFilter === yr ? 'bg-orange-500 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                        }`}
                      >{yr}</button>
                    ))}
                  </div>
                )}
                {false && allExamGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground self-center mr-1">類組:</span>
                    <button
                      type="button"
                      onClick={() => setSourceExamGroupFilter('all')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        sourceExamGroupFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >全部</button>
                    {allExamGroups.map(eg => (
                      <button
                        key={eg}
                        type="button"
                        onClick={() => setSourceExamGroupFilter(sourceExamGroupFilter === eg ? 'all' : eg)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          sourceExamGroupFilter === eg ? 'bg-blue-500 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >{eg}</button>
                    ))}
                  </div>
                )}
                {false && allTeachers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground self-center mr-1">老師:</span>
                    <button
                      type="button"
                      onClick={() => setSourceTeacherFilter('all')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        sourceTeacherFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                      }`}
                    >全部</button>
                    {allTeachers.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSourceTeacherFilter(sourceTeacherFilter === t ? 'all' : t)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          sourceTeacherFilter === t ? 'bg-purple-500 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                        }`}
                      >👤 {t}</button>
                    ))}
                  </div>
                )}
              </div>
              {/* 素材列表 */}
              <div className="max-h-52 overflow-y-auto">
                {filteredSources.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground text-sm">無符合條件的素材</div>
                ) : (
                  <>
                    {/* 全選列 */}
                    <label className="flex items-center gap-3 px-3 py-2 border-b bg-muted/20 cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={filteredSources.length > 0 && filteredSources.every((s: any) => form.sourceIds.includes(s.id))}
                        onChange={toggleAllFiltered}
                        className="w-4 h-4"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        全選當前篩選結果（{filteredSources.length} 個）
                      </span>
                    </label>
                    {filteredSources.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-0">
                        <input
                          type="checkbox"
                          checked={form.sourceIds.includes(s.id)}
                          onChange={() => toggleSource(s.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{s.title}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {s.sourceType === 'lecture' ? '教材' : '考題'} · {s.fileType.toUpperCase()}
                            {s.category && ` · ${s.category}`}
                            {s.year && <span className="ml-1 text-orange-600">[{s.year}]</span>}
                            {s.examGroup && <span className="ml-1 text-blue-600">[{s.examGroup}]</span>}
                            {s.teacherName && <span className="ml-1 text-purple-600">👤{s.teacherName}</span>}
                          </span>
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleCreate} disabled={isCreating} className="w-full">
          {isCreating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />建立中，請稍候...</>
          ) : (
            <><Brain className="w-4 h-4 mr-2" />
              {form.questionTypes.length > 1 ? `AI 自動出題（分建 ${form.questionTypes.length} 個題庫）` : 'AI 自動出題'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ==================== 題庫管理 Tab ====================
function ExamsTab({ highlightId, refetchTrigger }: { highlightId?: number | null; refetchTrigger?: number }) {
  const utils = trpc.useUtils();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [editExam, setEditExam] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState<any | null>(null);
  // 搜尋 / 篩選 / 分頁
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'generating' | 'ready' | 'published' | 'archived' | 'error'>('all');
  const [publicFilter, setPublicFilter] = useState<'all' | 'public' | 'private'>('all');
  const [examGroupBankFilter, setExamGroupBankFilter] = useState<string>('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'multiple_choice' | 'essay'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  // 批次選取
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  // 組題動畫文字輪播
  const generatingTexts = [
    '分析素材內容中...',
    '提取關鍵知識點...',
    'AI 正在出題中...',
    '組合選項與干擾項...',
    '生成詳細解析...',
    '檢查題目質量...',
    '即將完成，請稍候...',
  ];
  const [genTextIdx, setGenTextIdx] = useState(0);
  const genTimerRef = useRef<any>(null);

  // highlightId 改變時，自動選中新題庫
  useEffect(() => {
    if (highlightId) {
      setSelectedExamId(highlightId);
    }
  }, [highlightId]);

  const { data: adminData, isLoading, refetch } = trpc.aiExams.adminList.useQuery({
    search: search || undefined,
    status: statusFilter,
    isPublic: publicFilter,
    examGroup: examGroupBankFilter !== 'all' ? examGroupBankFilter : undefined,
    questionTypeFilter: questionTypeFilter !== 'all' ? questionTypeFilter as 'multiple_choice' | 'essay' : 'all',
    page,
    pageSize: PAGE_SIZE,
  }, {
    refetchInterval: (query) => {
      // tRPC v11: query.state.data 包含實際資料
      const items = (query.state.data as any)?.items;
      const hasGenerating = Array.isArray(items) && items.some((e: any) => e.status === 'generating');
      return hasGenerating ? 3000 : false;
    },
  });
  const exams: any[] = (adminData as any)?.items ?? [];
  const total: number = (adminData as any)?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasGenerating = exams.some((e: any) => e.status === 'generating');

  // 偵測題庫狀態變化：從 generating 變成 ready 時顯示完成通知
  const prevExamsRef = useRef<any[]>([]);
  useEffect(() => {
    const prev = prevExamsRef.current;
    if (prev.length > 0) {
      exams.forEach((exam: any) => {
        const prevExam = prev.find((p: any) => p.id === exam.id);
        if (prevExam?.status === 'generating' && exam.status === 'ready') {
          toast.success(`✅ 「${exam.title}」出題完成！共 ${exam.questionCount} 題`);
        }
        if (prevExam?.status === 'generating' && exam.status === 'error') {
          toast.error(`⚠️ 「${exam.title}」出題失敗，請重新嘗試`);
        }
      });
    }
    prevExamsRef.current = exams;
  }, [exams]);

  // refetchTrigger 改變時，強制重新載入題庫列表
  useEffect(() => {
    if (refetchTrigger && refetchTrigger > 0) {
      refetch();
    }
  }, [refetchTrigger]);

  // 有 generating 題庫時，啟動文字輪播動畫
  useEffect(() => {
    if (hasGenerating) {
      genTimerRef.current = setInterval(() => {
        setGenTextIdx(i => (i + 1) % generatingTexts.length);
      }, 1800);
    } else {
      clearInterval(genTimerRef.current);
    }
    return () => clearInterval(genTimerRef.current);
  }, [hasGenerating]);

  const { data: examDetail } = trpc.aiExams.getById.useQuery(
    { id: selectedExamId! },
    {
      enabled: selectedExamId !== null,
      // 當題庫正在出題中時，每 3 秒自動重新抓取，確保完成後右側立即更新
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.status;
        return status === 'generating' ? 3000 : false;
      },
    }
  );

  // 品質報告開關
  const [showQualityReport, setShowQualityReport] = useState(false);

  // 全選所有（跨頁）
  const [selectAllMode, setSelectAllMode] = useState(false); // true = 已選取所有筛選結果
  const [deleteAllFilteredOpen, setDeleteAllFilteredOpen] = useState(false);
  const deleteAllFilteredMutation = trpc.aiExams.deleteAllFiltered.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.deleted} 個題庫`);
      utils.aiExams.adminList.invalidate();
      setSelectedIds(new Set());
      setSelectAllMode(false);
      setDeleteAllFilteredOpen(false);
      setSelectedExamId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: qualityReport, isLoading: qualityLoading } = trpc.aiExams.getQualityReport.useQuery(
    { examId: selectedExamId! },
    { enabled: selectedExamId !== null && showQualityReport }
  );

  const publishMutation = trpc.aiExams.publish.useMutation({
    onSuccess: () => { toast.success('已更新發布狀態'); utils.aiExams.adminList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.aiExams.delete.useMutation({
    onSuccess: () => {
      toast.success('題庫已刪除');
      utils.aiExams.adminList.invalidate();
      setDeleteId(null);
      if (selectedExamId === deleteId) setSelectedExamId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const batchDeleteMutation = trpc.aiExams.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.deleted} 個題庫`);
      setSelectedIds(new Set());
      setBatchDeleteOpen(false);
      utils.aiExams.adminList.invalidate();
      if (selectedExamId && selectedIds.has(selectedExamId)) setSelectedExamId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const batchSetStatusMutation = trpc.aiExams.batchSetStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`已更新 ${data.updated} 個題庫`);
      setSelectedIds(new Set());
      utils.aiExams.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // 批次重新出題（循序執行失敗題庫）
  const [batchRetryOpen, setBatchRetryOpen] = useState(false);
  const [batchRetryProgress, setBatchRetryProgress] = useState<{ current: number; total: number; currentTitle: string; successCount: number; failedCount: number; stopped: boolean } | null>(null);
  const [batchRetryRunning, setBatchRetryRunning] = useState(false);
  const [batchRetryStopFlag, setBatchRetryStopFlag] = useState(false);
  const batchRetryStopRef = useRef(false);
  const retryExamSyncMutation = trpc.aiExams.retryExamSync.useMutation();

  const cancelExamMutation = trpc.aiExams.cancelExam.useMutation({
    onSuccess: () => {
      toast.success('出題已取消');
      utils.aiExams.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleBatchRetry = async (examIds: number[]) => {
    if (examIds.length === 0) return;
    batchRetryStopRef.current = false;
    setBatchRetryStopFlag(false);
    setBatchRetryRunning(true);
    setBatchRetryOpen(true);
    setBatchRetryProgress({ current: 0, total: examIds.length, currentTitle: '準備中...', successCount: 0, failedCount: 0, stopped: false });
    let successCount = 0;
    let failedCount = 0;
    for (let i = 0; i < examIds.length; i++) {
      if (batchRetryStopRef.current) {
        setBatchRetryProgress(prev => prev ? { ...prev, stopped: true, current: i } : null);
        break;
      }
      // 取得題庫名稱
      const exam = exams.find(e => e.id === examIds[i]);
      const title = exam?.title || `題庫 #${examIds[i]}`;
      setBatchRetryProgress({ current: i + 1, total: examIds.length, currentTitle: title, successCount, failedCount, stopped: false });
      try {
        const result = await retryExamSyncMutation.mutateAsync({ examId: examIds[i] });
        if (result.status === 'ready') successCount++; else failedCount++;
      } catch {
        failedCount++;
      }
    }
    setBatchRetryRunning(false);
    setBatchRetryProgress(prev => prev ? { ...prev, current: batchRetryStopRef.current ? prev.current : examIds.length, successCount, failedCount, stopped: batchRetryStopRef.current } : null);
    utils.aiExams.adminList.invalidate();
  };

  const handleBatchDownload = async (format: 'word' | 'excel', includeAnswers: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.error('請先勾選題庫'); return; }
    if (ids.length > 100) { toast.error('一次最多下載 100 個題庫'); return; }
    toast.info(`正在打包 ${ids.length} 個題庫，請稍候...`);
    try {
      const res = await fetch('/api/ai-exam/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examIds: ids, includeAnswers, format }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '下載失敗' }));
        toast.error(err.error || '下載失敗');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toLocaleDateString('zh-TW').replace(/\//g, '-');
      a.href = url;
      a.download = `題庫批次下載_${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已下載 ${ids.length} 個題庫的 ZIP 封裝檔`);
    } catch (e: any) {
      toast.error('下載失敗：' + (e.message || '未知錯誤'));
    }
  };

  const regenerateMutation = trpc.aiExams.regenerate.useMutation({
    onSuccess: () => {
      toast.success('已重新出題，請稍候...');
      utils.aiExams.adminList.invalidate();
      if (selectedExamId) utils.aiExams.getById.invalidate({ id: selectedExamId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateExamMutation = trpc.aiExams.update.useMutation({
    onSuccess: () => {
      toast.success('題庫已更新');
      utils.aiExams.adminList.invalidate();
      setEditExam(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateQuestionMutation = trpc.aiQuestions.update.useMutation({
    onSuccess: () => {
      toast.success('題目已更新');
      if (selectedExamId) utils.aiExams.getById.invalidate({ id: selectedExamId });
      setEditQuestion(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteQuestionMutation = trpc.aiQuestions.delete.useMutation({
    onSuccess: () => {
      toast.success('題目已刪除');
      if (selectedExamId) utils.aiExams.getById.invalidate({ id: selectedExamId });
    },
    onError: (e) => toast.error(e.message),
  });

  const importEssayToManagementMutation = trpc.aiStudent.importEssayToManagement.useMutation({
    onSuccess: (data) => {
      toast.success(`成功匯入 ${data.importedCount} 題申論題到申論題管理！`);
    },
    onError: (e) => toast.error('匯入失敗：' + e.message),
  });

  const handleDownloadTxt = (exam: any) => {
    if (!exam?.questions) return;
    const essayQs = exam.questions.filter((q: any) => q.questionType === 'essay');
    if (essayQs.length === 0) { toast.error('此題庫沒有申論題'); return; }
    const lines: string[] = [`題庫：${exam.title}`, `申論題共 ${essayQs.length} 題`, '='.repeat(50), ''];
    essayQs.forEach((q: any, idx: number) => {
      lines.push(`【申論題 ${idx + 1}】`);
      lines.push(`題目：${q.question}`);
      if (q.correctAnswer) { lines.push(''); lines.push('參考答案：'); lines.push(q.correctAnswer); }
      if (q.explanation) { lines.push(''); lines.push('解析：'); lines.push(q.explanation); }
      lines.push('');
      lines.push('-'.repeat(40));
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.title}_申論題.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<number | null>(null);
  const regenerateSingleMutation = trpc.aiExams.regenerateSingleQuestion.useMutation({
    onMutate: (vars) => setRegeneratingQuestionId(vars.questionId),
    onSuccess: () => {
      toast.success('已重新出題！');
      if (selectedExamId) utils.aiExams.getById.invalidate({ id: selectedExamId });
      setRegeneratingQuestionId(null);
    },
    onError: (e) => { toast.error(e.message); setRegeneratingQuestionId(null); },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      generating: { label: 'AI 出題中', variant: 'secondary' },
      ready: { label: '就緒', variant: 'outline' },
      published: { label: '已發布', variant: 'default' },
      archived: { label: '已封存', variant: 'secondary' },
      error: { label: '出題失敗', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const difficultyLabel = (d: string) => ({ easy: '簡單', medium: '中等', hard: '困難', mixed: '混合' }[d] || d);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === exams.length && exams.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(exams.map((e: any) => e.id)));
    }
  };
  const allSelected = exams.length > 0 && selectedIds.size === exams.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">題庫管理</h2>
        <span className="text-sm text-muted-foreground">共 {total} 個題庫</span>
      </div>

      {/* 搜尋 + 篩選工具列 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋題庫名稱..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="error">出題失敗</SelectItem>
            <SelectItem value="generating">AI 出題中</SelectItem>
            <SelectItem value="ready">就緒</SelectItem>
            <SelectItem value="published">已發布</SelectItem>
            <SelectItem value="archived">已封存</SelectItem>
          </SelectContent>
        </Select>
        <Select value={publicFilter} onValueChange={(v: any) => { setPublicFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="公開狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="public">已公開</SelectItem>
            <SelectItem value="private">未公開</SelectItem>
          </SelectContent>
        </Select>
        <Select value={questionTypeFilter} onValueChange={(v: any) => { setQuestionTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="題型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部題型</SelectItem>
            <SelectItem value="multiple_choice">選擇題</SelectItem>
            <SelectItem value="essay">申論題</SelectItem>
          </SelectContent>
        </Select>
        <Select value={examGroupBankFilter} onValueChange={(v: any) => { setExamGroupBankFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="考試類別" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類別</SelectItem>
            <SelectItem value="3">高普考試</SelectItem>
            <SelectItem value="4">初等考試</SelectItem>
            <SelectItem value="5">地方特考</SelectItem>
            <SelectItem value="6">其他特考</SelectItem>
            <SelectItem value="all_explicit">綜合</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 批次操作工具列 */}
      {(someSelected || selectAllMode) && (
        <div className={`flex items-center gap-2 p-2 border rounded-lg ${selectAllMode ? 'bg-red-50 border-red-300 dark:bg-red-950/20' : 'bg-primary/5 border-primary/20'}`}>
          <span className={`text-sm font-medium ${selectAllMode ? 'text-red-700' : 'text-primary'}`}>
            {selectAllMode ? `已選取所有 ${total} 個題庫` : `已選 ${selectedIds.size} 個`}
          </span>
          <div className="flex gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchSetStatusMutation.mutate({ ids: Array.from(selectedIds), status: 'published', isPublic: true })}
              disabled={batchSetStatusMutation.isPending}
            >
              <Globe className="w-3 h-3 mr-1" />批次公開發布
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchSetStatusMutation.mutate({ ids: Array.from(selectedIds), isPublic: false })}
              disabled={batchSetStatusMutation.isPending}
            >
              <Lock className="w-3 h-3 mr-1" />批次取消公開
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchSetStatusMutation.mutate({ ids: Array.from(selectedIds), status: 'archived' })}
              disabled={batchSetStatusMutation.isPending}
            >
              <Archive className="w-3 h-3 mr-1" />批次封存
            </Button>
            {statusFilter === 'error' && (
              <Button
                variant="outline"
                size="sm"
                className="border-orange-400 text-orange-700 hover:bg-orange-50"
                onClick={() => handleBatchRetry(Array.from(selectedIds))}
                disabled={batchRetryRunning}
              >
                {batchRetryRunning ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3 mr-1" />
                )}
                批次重新出題
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-green-400 text-green-700 hover:bg-green-50">
                  <FileDown className="w-3 h-3 mr-1" />批次下載
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>選擇下載格式</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchDownload('word', true)}>
                  <FileText className="w-4 h-4 mr-2" />Word（含答案解析）
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchDownload('word', false)}>
                  <FileText className="w-4 h-4 mr-2" />Word（不含答案）
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchDownload('excel', true)}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />Excel 格式
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {selectAllMode ? (
              <Button
                variant="destructive"
                size="sm"
                className="font-semibold"
                onClick={() => setDeleteAllFilteredOpen(true)}
                disabled={deleteAllFilteredMutation.isPending}
              >
                {deleteAllFilteredMutation.isPending
                  ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  : <Trash2 className="w-3 h-3 mr-1" />}
                刪除全部 {total} 個
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 className="w-3 h-3 mr-1" />批次刪除
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
            <p>{search || statusFilter !== 'all' || publicFilter !== 'all' ? '找不到符合條件的題庫' : '尚無題庫，請先在「建立題庫」頁面出題'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 題庫列表 */}
          <div className="space-y-2">
            {/* 全選列 */}
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={allSelected || selectAllMode}
                onCheckedChange={() => {
                  if (selectAllMode) {
                    setSelectAllMode(false);
                    setSelectedIds(new Set());
                  } else {
                    toggleSelectAll();
                  }
                }}
                aria-label="全選"
              />
              <span className="text-xs text-muted-foreground">全選本頁</span>
              {allSelected && !selectAllMode && total > exams.length && (
                <button
                  className="text-xs text-primary underline hover:no-underline ml-1"
                  onClick={() => setSelectAllMode(true)}
                >
                  選取所有 {total} 個題庫
                </button>
              )}
              {selectAllMode && (
                <span className="text-xs text-primary font-medium ml-1">已選取所有 {total} 個</span>
              )}
            </div>
            {exams.map((exam: any) => (
              <Card
                key={exam.id}
                className={`p-3 cursor-pointer transition-colors ${selectedExamId === exam.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`}
                onClick={() => setSelectedExamId(exam.id)}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox */}
                  <div className="pt-0.5 flex-shrink-0">
                    <Checkbox
                      checked={selectedIds.has(exam.id)}
                      onCheckedChange={() => toggleSelect(exam.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{exam.title}</span>
                      {statusBadge(exam.status)}
                      {/* 公開狀態 badge：純申論題看 essayIsPublic，其他看 isPublic */}
                      {(() => {
                        const isEssayOnly = exam.questionTypes?.includes('essay') && !exam.questionTypes?.includes('multiple_choice');
                        const isOpen = isEssayOnly ? !!exam.essayIsPublic : !!exam.isPublic;
                        return isOpen ? (
                          <Badge variant="default" className="text-xs bg-green-600"><Globe className="w-2.5 h-2.5 mr-1" />公開</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs"><Lock className="w-2.5 h-2.5 mr-1" />未公開</Badge>
                        );
                      })()}
                      {/* 題型標籤 */}
                      {exam.questionTypes?.includes('multiple_choice') && !exam.questionTypes?.includes('essay') && (
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 bg-blue-50">選擇題</Badge>
                      )}
                      {exam.questionTypes?.includes('essay') && !exam.questionTypes?.includes('multiple_choice') && (
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">申論題</Badge>
                      )}
                      {exam.questionTypes?.includes('multiple_choice') && exam.questionTypes?.includes('essay') && (
                        <>
                          <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 bg-blue-50">選擇題</Badge>
                          <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">申論題</Badge>
                        </>
                      )}
                      {(!exam.questionTypes || exam.questionTypes.length === 0) && (
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 bg-blue-50">選擇題</Badge>
                      )}
                    </div>
                    {exam.status === 'generating' ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-primary">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {exam.questionCount > 0 && exam.totalQuestions > 0 ? (
                              <span>已出 {exam.questionCount}/{exam.totalQuestions} 題，繼續生成中...</span>
                            ) : exam.questionCount > 0 ? (
                              <span>已出 {exam.questionCount} 題，繼續生成中...</span>
                            ) : (
                              <span>AI 分析素材中，請稍候...</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="取消出題"
                            disabled={cancelExamMutation.isPending}
                            onClick={(e) => { e.stopPropagation(); cancelExamMutation.mutate({ examId: exam.id }); }}
                          >
                            <X className="w-3 h-3 mr-0.5" />取消
                          </Button>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: exam.totalQuestions > 0
                                ? `${Math.max(5, (exam.questionCount / exam.totalQuestions) * 100)}%`
                                : `${((genTextIdx + 1) / generatingTexts.length) * 100}%`,
                              transition: 'width 1.2s ease-in-out',
                            }}
                          />
                        </div>
                      </div>
                    ) : exam.status === 'error' ? (
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {exam.category && <Badge variant="secondary" className="text-xs">{exam.category}</Badge>}
                          <span className="text-xs text-muted-foreground">{exam.questionCount} 題 · {difficultyLabel(exam.difficulty)}</span>
                          {exam.createdAt && <span className="text-xs text-muted-foreground">建立：{new Date((exam.createdAt as string).replace(' ', 'T') + 'Z').toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })}</span>}
                        </div>
                        {exam.generationPrompt && (
                          <div className="flex items-start gap-1 mt-1">
                            <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-destructive line-clamp-2" title={exam.generationPrompt}>
                              {exam.generationPrompt}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {exam.category && <Badge variant="secondary" className="text-xs">{exam.category}</Badge>}
                        <span className="text-xs text-muted-foreground">{exam.questionCount} 題 · {difficultyLabel(exam.difficulty)}</span>
                        {exam.pointCost > 0 && <span className="text-xs text-amber-600">{exam.pointCost} 點</span>}
                        {exam.createdAt && <span className="text-xs text-muted-foreground">建立：{new Date((exam.createdAt as string).replace(' ', 'T') + 'Z').toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })}</span>}
                      </div>
                    )}
                  </div>
                  {/* 操作按鈕 */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {/* 公開切換 Switch：純申論題用 essayIsPublic，不影響選擇題 isPublic */}
                    {(() => {
                      const isEssayOnly = exam.questionTypes?.includes('essay') && !exam.questionTypes?.includes('multiple_choice');
                      const isOpen = isEssayOnly ? !!exam.essayIsPublic : !!exam.isPublic;
                      return (
                        <div className="flex items-center gap-1" title={isOpen ? '點擊取消公開（前台不可見）' : '點擊公開（前台可見）'}>
                          <Switch
                            checked={isOpen}
                            onCheckedChange={(checked) => {
                              if (isEssayOnly) {
                                updateExamMutation.mutate({ id: exam.id, essayIsPublic: checked });
                              } else {
                                publishMutation.mutate({ id: exam.id, isPublic: checked });
                              }
                            }}
                            className="scale-75"
                          />
                        </div>
                      );
                    })()}
                    <Button variant="ghost" size="sm" onClick={() => setEditExam(exam)} title="編輯">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="重新出題"
                      onClick={() => regenerateMutation.mutate({ id: exam.id, questionCount: exam.totalQuestions || 20, difficulty: exam.difficulty })}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(exam.id)} title="刪除">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* 分頁控制 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一頁</Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一頁</Button>
              </div>
            )}
          </div>

          {/* 題目詳情 */}
          <div>
            {selectedExamId === null ? (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full py-12 text-muted-foreground text-sm">
                  點擊左側題庫查看題目
                </CardContent>
              </Card>
            ) : !examDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{examDetail.title}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground mr-2">{examDetail.questions?.length || 0} 題</span>
                    <Button
                      variant={showQualityReport ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1"
                      onClick={() => setShowQualityReport(v => !v)}
                      title="查看品質報告"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      品質報告
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="w-3.5 h-3.5" />
                          下載
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>下載格式</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.open(`/api/ai-exam/${examDetail.id}/export-word?includeAnswers=false`, '_blank')}>
                          <FileText className="w-4 h-4 mr-2" />
                          Word 考卷（不含答案）
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/ai-exam/${examDetail.id}/export-word?includeAnswers=true`, '_blank')}>
                          <FileText className="w-4 h-4 mr-2" />
                          Word 考卷（含答案解析）
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.open(`/api/ai-exam/${examDetail.id}/export-excel`, '_blank')}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Excel 格式（含所有欄位）
                        </DropdownMenuItem>
                        {(examDetail.questions || []).some((q: any) => q.questionType === 'essay') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDownloadTxt(examDetail)}>
                              <FileText className="w-4 h-4 mr-2 text-amber-600" />
                              <span className="text-amber-700">TXT 申論題（含解答）</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {examDetail.status === 'generating' && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="py-3 flex items-center gap-2 text-blue-700 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI 正在出題中，請稍候...
                    </CardContent>
                  </Card>
                )}
                {/* 品質報告面板 */}
                {showQualityReport && (
                  <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4" />
                          出題品質報告
                        </p>
                        {qualityLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                      </div>
                      {qualityReport && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {/* 難度分布 */}
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">難度分布</p>
                            <div className="space-y-1">
                              {[['easy', '簡單', 'bg-green-400'], ['medium', '中等', 'bg-yellow-400'], ['hard', '困難', 'bg-red-400']].map(([key, label, color]) => {
                                const count = (qualityReport.difficultyDist as any)[key] || 0;
                                const pct = qualityReport.total > 0 ? Math.round((count / qualityReport.total) * 100) : 0;
                                return (
                                  <div key={key}>
                                    <div className="flex justify-between mb-0.5">
                                      <span>{label}</span>
                                      <span className="text-muted-foreground">{count} 題 ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* 科目分布 */}
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">科目分布（推斷）</p>
                            <div className="space-y-1">
                              {Object.entries(qualityReport.subjectDist as Record<string, number>)
                                .sort(([,a],[,b]) => b - a)
                                .map(([subj, count]) => {
                                  const pct = qualityReport.total > 0 ? Math.round((count / qualityReport.total) * 100) : 0;
                                  return (
                                    <div key={subj}>
                                      <div className="flex justify-between mb-0.5">
                                        <span>{subj}</span>
                                        <span className="text-muted-foreground">{count} 題 ({pct}%)</span>
                                      </div>
                                      <div className="w-full bg-muted rounded-full h-1.5">
                                        <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                          {/* 重複題目 */}
                          <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-indigo-200">
                            <span className="text-muted-foreground">重複題目：</span>
                            <span className={qualityReport.duplicateCount > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                              {qualityReport.duplicateCount} 題
                              {qualityReport.duplicateCount > 0 ? ` （重複率 ${qualityReport.duplicateRate}%）` : ' （無重複）'}
                            </span>
                            <span className="text-muted-foreground ml-auto">共 {qualityReport.total} 題</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {/* 申論題公開開關 + 匯入按鈕 */}
                {(examDetail.questions || []).some((q: any) => q.questionType === 'essay') && (
                  <>
                    <div className="flex items-center justify-between p-2 border rounded-md bg-amber-50/50 dark:bg-amber-950/20">
                      <div>
                        <p className="text-sm font-medium">申論題公開狀態</p>
                        <p className="text-xs text-muted-foreground">{examDetail.essayIsPublic ? '已公開，前台學生可見' : '未公開，僅管理員可見'}</p>
                      </div>
                      <Switch
                        checked={!!examDetail.essayIsPublic}
                        onCheckedChange={(checked) => updateExamMutation.mutate({ id: examDetail.id, essayIsPublic: checked })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-400 text-amber-700 hover:bg-amber-50 gap-1.5"
                      disabled={importEssayToManagementMutation.isPending}
                      onClick={() => importEssayToManagementMutation.mutate({ examId: examDetail.id })}
                    >
                      {importEssayToManagementMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <SendToBack className="w-3.5 h-3.5" />}
                      匯入申論題到申論題管理
                    </Button>
                  </>
                )}
                {/* 題型分頁 */}
                {(() => {
                  const mcQuestions = (examDetail.questions || []).filter((q: any) => q.questionType !== 'essay');
                  const essayQuestions = (examDetail.questions || []).filter((q: any) => q.questionType === 'essay');
                  const hasEssay = essayQuestions.length > 0;
                  const hasMC = mcQuestions.length > 0;
                  return (
                    <>
                      {hasMC && (
                        <>
                          {hasEssay && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">選擇題（{mcQuestions.length} 題）</p>}
                          {mcQuestions.map((q: any, idx: number) => (
                            <Card key={q.id} className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-muted-foreground">Q{idx + 1}</span>
                                    <Badge variant="outline" className="text-xs">{difficultyLabel(q.difficulty)}</Badge>
                                    {q.isEdited === 1 && <Badge variant="secondary" className="text-xs">已編輯</Badge>}
                                  </div>
                                  <p className="text-sm font-medium">{q.question}</p>
                                  {q.options && (
                                    <div className="mt-1 space-y-0.5">
                                      {Object.entries(q.options as Record<string, string>).map(([k, v]) => (
                                        <p key={k} className={`text-xs ${k === q.correctAnswer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                          {k === q.correctAnswer ? '✓ ' : ''}{k}. {v}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {q.explanation && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">解析：{q.explanation}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost" size="sm"
                                    title="重出此題"
                                    disabled={regeneratingQuestionId === q.id}
                                    onClick={() => selectedExamId && regenerateSingleMutation.mutate({ examId: selectedExamId, questionId: q.id, difficulty: q.difficulty || 'mixed' })}
                                  >
                                    {regeneratingQuestionId === q.id
                                      ? <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                      : <RefreshCw className="w-3 h-3 text-blue-500" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditQuestion({ ...q })}><Edit className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteQuestionMutation.mutate({ id: q.id })}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </>
                      )}
                      {hasEssay && (
                        <>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">申論題（{essayQuestions.length} 題）</p>
                            {!examDetail.essayIsPublic && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">未公開</Badge>}
                          </div>
                          {essayQuestions.map((q: any, idx: number) => (
                            <Card key={q.id} className="p-3 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-amber-600">申{idx + 1}</span>
                                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">{difficultyLabel(q.difficulty)}</Badge>
                                    {q.isEdited === 1 && <Badge variant="secondary" className="text-xs">已編輯</Badge>}
                                  </div>
                                  <p className="text-sm font-medium">{q.question}</p>
                                  {q.correctAnswer && (
                                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                                      <p className="font-medium text-green-700 dark:text-green-400 mb-1">參考答案：</p>
                                      <p className="text-muted-foreground whitespace-pre-wrap">{q.correctAnswer}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button variant="ghost" size="sm" onClick={() => setEditQuestion({ ...q })}><Edit className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteQuestionMutation.mutate({ id: q.id })}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 批次刪除確認 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認批次刪除</AlertDialogTitle>
            <AlertDialogDescription>將刪除已選的 {selectedIds.size} 個題庫及其所有題目，此操作無法復原。確定繼續？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => batchDeleteMutation.mutate({ ids: Array.from(selectedIds) })}
            >
              {batchDeleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 刪除全部筛選結果確認對話框 */}
      <AlertDialog open={deleteAllFilteredOpen} onOpenChange={setDeleteAllFilteredOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">❗ 確認刪除全部題庫</AlertDialogTitle>
            <AlertDialogDescription>
              將刪除符合目前筛選條件的 <strong>{total} 個題庫</strong>及其所有題目，此操作無法復原。
              {(search || statusFilter !== 'all' || publicFilter !== 'all') && (
                <span className="block mt-1 text-amber-600">目前筛選條件：{search ? `搜尋「${search}」` : ''}{statusFilter !== 'all' ? ` 狀態:${statusFilter}` : ''}{publicFilter !== 'all' ? ` 公開:${publicFilter}` : ''}</span>
              )}
              確定要刪除全部 {total} 個題庫嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAllFilteredMutation.mutate({
                search: search || undefined,
                status: statusFilter,
                isPublic: publicFilter,
                examGroup: examGroupBankFilter !== 'all' ? examGroupBankFilter : undefined,
                questionTypeFilter: questionTypeFilter !== 'all' ? questionTypeFilter as any : 'all',
              })}
            >
              {deleteAllFilteredMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              確認刪除全部 {total} 個
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批次重新出題進度 Dialog */}
      <Dialog open={batchRetryOpen} onOpenChange={(open) => { if (!batchRetryRunning) setBatchRetryOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              批次重新出題
            </DialogTitle>
          </DialogHeader>
          {batchRetryProgress && (
            <div className="space-y-4">
              {/* 進度条 */}
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>進度 {batchRetryProgress.current} / {batchRetryProgress.total}</span>
                  <span className="text-green-600">成功 {batchRetryProgress.successCount}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${batchRetryProgress.total > 0 ? (batchRetryProgress.current / batchRetryProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* 目前處理中 */}
              {batchRetryRunning && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500 shrink-0" />
                  <span className="text-muted-foreground">正在重試：</span>
                  <span className="font-medium truncate">{batchRetryProgress.currentTitle}</span>
                </div>
              )}
              {/* 統計 */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <div className="text-lg font-bold">{batchRetryProgress.total}</div>
                  <div className="text-xs text-muted-foreground">總計</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-600">{batchRetryProgress.successCount}</div>
                  <div className="text-xs text-muted-foreground">成功</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-500">{batchRetryProgress.failedCount}</div>
                  <div className="text-xs text-muted-foreground">失敗</div>
                </div>
              </div>
              {/* 完成或停止狀態 */}
              {!batchRetryRunning && (
                <div className={`text-sm text-center font-medium ${batchRetryProgress.stopped ? 'text-orange-500' : 'text-green-600'}`}>
                  {batchRetryProgress.stopped
                    ? `已停止（共處理 ${batchRetryProgress.current} 個）`
                    : `完成！成功 ${batchRetryProgress.successCount} 個，失敗 ${batchRetryProgress.failedCount} 個`
                  }
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {batchRetryRunning ? (
              <Button
                variant="outline"
                onClick={() => { batchRetryStopRef.current = true; setBatchRetryStopFlag(true); }}
                disabled={batchRetryStopFlag}
              >
                {batchRetryStopFlag ? '停止中...' : '停止'}
              </Button>
            ) : (
              <Button onClick={() => setBatchRetryOpen(false)}>關閉</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯題庫 Dialog */}
      <Dialog open={editExam !== null} onOpenChange={() => setEditExam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>編輯題庫設定</DialogTitle></DialogHeader>
          {editExam && (
            <div className="space-y-3">
              <div>
                <Label>題庫標題</Label>
                <Input value={editExam.title} onChange={e => setEditExam((f: any) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>說明</Label>
                <Textarea value={editExam.description || ''} onChange={e => setEditExam((f: any) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>科目分類</Label>
                  <Input value={editExam.category || ''} onChange={e => setEditExam((f: any) => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <Label>選擇題點數（混合預設）</Label>
                  <Input type="number" min={0} value={editExam.pointCost ?? 0} onChange={e => setEditExam((f: any) => ({ ...f, pointCost: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              {/* 考試類別 */}
              <div>
                <Label className="text-sm font-medium">考試類別</Label>
                <Select value={editExam.examGroup || 'all'} onValueChange={v => setEditExam((f: any) => ({ ...f, examGroup: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="選擇考試類別" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">綜合</SelectItem>
                    <SelectItem value="3">高普考試</SelectItem>
                    <SelectItem value="4">初等考試</SelectItem>
                    <SelectItem value="5">地方特考</SelectItem>
                    <SelectItem value="6">其他特考</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>申論題點數</Label>
                  <Input type="number" min={0} value={editExam.essayPointCost ?? 0} onChange={e => setEditExam((f: any) => ({ ...f, essayPointCost: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>申論題公開</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={!!editExam.essayIsPublic}
                      onCheckedChange={(checked) => setEditExam((f: any) => ({ ...f, essayIsPublic: checked }))}
                    />
                    <span className="text-sm text-muted-foreground">{editExam.essayIsPublic ? '公開' : '未公開'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExam(null)}>取消</Button>
            <Button onClick={() => editExam && updateExamMutation.mutate({ id: editExam.id, title: editExam.title, description: editExam.description ?? undefined, category: editExam.category ?? undefined, pointCost: editExam.pointCost, essayPointCost: editExam.essayPointCost, examGroup: editExam.examGroup || null, essayIsPublic: !!editExam.essayIsPublic })} disabled={updateExamMutation.isPending}>
              {updateExamMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯題目 Dialog */}
      <Dialog open={editQuestion !== null} onOpenChange={() => setEditQuestion(null)}>
        <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
          <DialogHeader className="flex-shrink-0"><DialogTitle>編輯題目</DialogTitle></DialogHeader>
          {editQuestion && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              <div>
                <Label>題目</Label>
                <Textarea value={editQuestion.question} onChange={e => setEditQuestion((q: any) => ({ ...q, question: e.target.value }))} rows={3} />
              </div>
              {editQuestion.questionType === 'essay' ? (
                <>
                  <div>
                    <Label>參考答案</Label>
                    <Textarea
                      value={editQuestion.correctAnswer || ''}
                      onChange={e => setEditQuestion((q: any) => ({ ...q, correctAnswer: e.target.value }))}
                      rows={12}
                      className="text-xs"
                      placeholder="請輸入參考答案..."
                    />
                  </div>
                  <div>
                    <Label>解析補充</Label>
                    <Textarea value={editQuestion.explanation || ''} onChange={e => setEditQuestion((q: any) => ({ ...q, explanation: e.target.value }))} rows={3} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>選項</Label>
                    {['A', 'B', 'C', 'D'].map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className={`w-6 text-sm font-bold ${editQuestion.correctAnswer === k ? 'text-green-600' : ''}`}>{k}.</span>
                        <Input
                          value={(editQuestion.options as any)?.[k] || ''}
                          onChange={e => setEditQuestion((q: any) => ({ ...q, options: { ...q.options, [k]: e.target.value } }))}
                        />
                        <Button
                          variant={editQuestion.correctAnswer === k ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditQuestion((q: any) => ({ ...q, correctAnswer: k }))}
                        >
                          {editQuestion.correctAnswer === k ? '✓' : '選'}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label>解析</Label>
                    <Textarea value={editQuestion.explanation || ''} onChange={e => setEditQuestion((q: any) => ({ ...q, explanation: e.target.value }))} rows={2} />
                  </div>
                </>
              )}
              <div>
                <Label>難度</Label>
                <Select value={editQuestion.difficulty} onValueChange={v => setEditQuestion((q: any) => ({ ...q, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">簡單</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困難</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => setEditQuestion(null)}>取消</Button>
            <Button
              onClick={() => editQuestion && updateQuestionMutation.mutate({
                id: editQuestion.id,
                question: editQuestion.question,
                options: editQuestion.options,
                correctAnswer: editQuestion.correctAnswer,
                explanation: editQuestion.explanation,
                difficulty: editQuestion.difficulty,
              })}
              disabled={updateQuestionMutation.isPending}
            >
              {updateQuestionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>刪除後無法復原，包含所有題目。確定要刪除此題庫嗎？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== 主頁面 ====================
export default function AdminAiQuestionBank() {
  const [activeTab, setActiveTab] = useState<string>('exams');
  const [newExamId, setNewExamId] = useState<number | null>(null);

  const handleExamCreated = (examId: number) => {
    setNewExamId(examId);
    setActiveTab('exams');
  };

  const [examsRefetchTrigger, setExamsRefetchTrigger] = useState(0);

  const handleNavigateToExams = (examId?: number) => {
    if (examId) setNewExamId(examId);
    setActiveTab('exams');
    // 觸發 ExamsTab 強制 refetch
    setExamsRefetchTrigger(t => t + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            智能題庫管理
          </h1>
          <p className="text-muted-foreground mt-1">上傳教材，讓 AI 自動生成選擇題，供學生練習</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="sources">
              <FileText className="w-4 h-4 mr-2" />素材管理
            </TabsTrigger>
            <TabsTrigger value="create">
              <Brain className="w-4 h-4 mr-2" />建立題庫
            </TabsTrigger>
            <TabsTrigger value="exams">
              <BookOpen className="w-4 h-4 mr-2" />題庫管理
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sources"><SourcesTab onNavigateToExams={handleNavigateToExams} /></TabsContent>
          <TabsContent value="create"><CreateExamTab onCreated={handleExamCreated} /></TabsContent>
          <TabsContent value="exams"><ExamsTab highlightId={newExamId} refetchTrigger={examsRefetchTrigger} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
