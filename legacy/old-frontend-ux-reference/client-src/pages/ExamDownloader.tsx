import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, CheckCircle, XCircle, Clock, Trash2, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function ExamDownloader() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedExamCode, setSelectedExamCode] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<Array<{
    categoryCode: string;
    subjectCode: string;
  }>>([]);
  const [autoUpload, setAutoUpload] = useState(true);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addExamDialogOpen, setAddExamDialogOpen] = useState(false);
  const [newExamData, setNewExamData] = useState({
    examCode: '',
    examName: '',
    categories: [{ categoryCode: '', categoryName: '', subjects: [{ subjectCode: '', subjectName: '' }] }]
  });

  // 獲取可下載的考試列表
  const { data: examData, isLoading: isLoadingExams, refetch: refetchExams } = trpc.examDownloader.listAvailableExams.useQuery({
    year: selectedYear,
  });

  // 獲取下載任務列表
  const { data: downloadTasks, refetch: refetchTasks } = trpc.examDownloader.listDownloadTasks.useQuery(undefined, {
    refetchInterval: 3000, // 每3秒刷新一次
  });

  // 觸發下載
  const startDownloadMutation = trpc.examDownloader.startDownload.useMutation({
    onSuccess: (data) => {
      toast.success('下載任務已啟動', {
        description: `任務 ID: ${data.taskId}`,
      });
      setDownloadDialogOpen(false);
      setSelectedSubjects([]);
      refetchTasks();
    },
    onError: (error) => {
      toast.error('啟動下載失敗', {
        description: error.message,
      });
    },
  });

  // 刪除任務
  const deleteTaskMutation = trpc.examDownloader.deleteDownloadTask.useMutation({
    onSuccess: () => {
      toast.success('任務已刪除');
      refetchTasks();
    },
    onError: (error) => {
      toast.error('刪除任務失敗', {
        description: error.message,
      });
    },
  });

  // 添加考試
  const addExamMutation = trpc.examDownloader.addExam.useMutation({
    onSuccess: () => {
      toast.success('考試添加成功！');
      setAddExamDialogOpen(false);
      setNewExamData({
        examCode: '',
        examName: '',
        categories: [{ categoryCode: '', categoryName: '', subjects: [{ subjectCode: '', subjectName: '' }] }]
      });
      refetchExams();
    },
    onError: (error) => {
      toast.error('添加考試失敗', {
        description: error.message,
      });
    },
  });

  // 抓取考選部考試資料
  const fetchExamDataMutation = trpc.examDownloader.fetchExamData.useMutation({
    onSuccess: (data) => {
      toast.success('抓取成功！', {
        description: `成功抓取 ${data.examCount} 個考試資料`,
      });
      refetchExams();
    },
    onError: (error) => {
      toast.error('抓取失敗', {
        description: error.message,
      });
    },
  });

  const toggleExamExpanded = (examCode: string) => {
    const newExpanded = new Set(expandedExams);
    if (newExpanded.has(examCode)) {
      newExpanded.delete(examCode);
    } else {
      newExpanded.add(examCode);
    }
    setExpandedExams(newExpanded);
  };

  const toggleCategoryExpanded = (categoryCode: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryCode)) {
      newExpanded.delete(categoryCode);
    } else {
      newExpanded.add(categoryCode);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDownloadClick = (exam: any) => {
    setSelectedExam(exam);
    setSelectedExamCode(exam.exam_code);
    setSelectedSubjects([]);
    setExpandedCategories(new Set());
    setDownloadDialogOpen(true);
  };

  const handleSubjectToggle = (categoryCode: string, subjectCode: string) => {
    setSelectedSubjects(prev => {
      const exists = prev.some(s => s.categoryCode === categoryCode && s.subjectCode === subjectCode);
      if (exists) {
        return prev.filter(s => !(s.categoryCode === categoryCode && s.subjectCode === subjectCode));
      } else {
        return [...prev, { categoryCode, subjectCode }];
      }
    });
  };

  // 批次勾選：選中/取消整個類科的所有科目
  const handleCategoryToggle = (category: any) => {
    const categorySubjects = category.subjects.map((subject: any) => ({
      categoryCode: category.category_code,
      subjectCode: subject.subject_code,
    }));

    // 檢查該類科是否所有科目都已選中
    const allSelected = categorySubjects.every((cs: any) =>
      selectedSubjects.some(s => s.categoryCode === cs.categoryCode && s.subjectCode === cs.subjectCode)
    );

    if (allSelected) {
      // 取消選中該類科的所有科目
      setSelectedSubjects(prev =>
        prev.filter(s => s.categoryCode !== category.category_code)
      );
    } else {
      // 選中該類科的所有科目
      setSelectedSubjects(prev => {
        // 移除該類科已選中的科目
        const filtered = prev.filter(s => s.categoryCode !== category.category_code);
        // 添加該類科的所有科目
        return [...filtered, ...categorySubjects];
      });
    }
  };

  // 全選所有科目
  const handleSelectAll = () => {
    if (!selectedExam) return;
    
    const allSubjects: Array<{ categoryCode: string; subjectCode: string }> = [];
    selectedExam.categories.forEach((category: any) => {
      category.subjects.forEach((subject: any) => {
        allSubjects.push({
          categoryCode: category.category_code,
          subjectCode: subject.subject_code,
        });
      });
    });
    
    setSelectedSubjects(allSubjects);
    toast.success(`已選中所有科目（共 ${allSubjects.length} 個科目）`);
  };

  // 取消全選
  const handleDeselectAll = () => {
    setSelectedSubjects([]);
    toast.success('已取消所有選擇');
  };

  // 檢查類科的選中狀態
  const getCategoryCheckState = (category: any): 'checked' | 'unchecked' | 'indeterminate' => {
    const categorySubjects = category.subjects.map((subject: any) => ({
      categoryCode: category.category_code,
      subjectCode: subject.subject_code,
    }));

    const selectedCount = categorySubjects.filter((cs: any) =>
      selectedSubjects.some(s => s.categoryCode === cs.categoryCode && s.subjectCode === cs.subjectCode)
    ).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === categorySubjects.length) return 'checked';
    return 'indeterminate';
  };

  const isSubjectSelected = (categoryCode: string, subjectCode: string) => {
    return selectedSubjects.some(s => s.categoryCode === categoryCode && s.subjectCode === subjectCode);
  };

  const getTotalSubjects = () => {
    return selectedSubjects.length;
  };

  const getPdfUrl = (examCode: string, categoryCode: string, subjectCode: string, type: 'Q' | 'S') => {
    return `https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=${type}&code=${examCode}&c=${categoryCode}&s=${subjectCode}&q=1`;
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('連結已複製到剪貼簿');
  };

  const handleDownloadLinksFile = () => {
    if (!selectedExamCode) {
      toast.error('請選擇考試');
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error('請至少選擇一個科目');
      return;
    }

    // 生成所有下載連結和檔名
    const lines: string[] = [];
    selectedSubjects.forEach(subject => {
      // 找到對應的類科和科目資訊
      const category = selectedExam.categories.find((c: any) => c.category_code === subject.categoryCode);
      const subjectInfo = category?.subjects.find((s: any) => s.subject_code === subject.subjectCode);
      
      if (category && subjectInfo) {
        const examName = selectedExam.exam_name;
        const categoryName = category.category_name;
        const subjectName = subjectInfo.subject_name;
        
        // 試題連結和檔名
        const questionUrl = getPdfUrl(selectedExamCode, subject.categoryCode, subject.subjectCode, 'Q');
        const questionFilename = `${examName}_${categoryName}_${subjectName}_試題.pdf`;
        lines.push(questionUrl);
        lines.push(`out=${questionFilename}`);
        lines.push(''); // 空行分隔
        
        // 答案連結和檔名
        const answerUrl = getPdfUrl(selectedExamCode, subject.categoryCode, subject.subjectCode, 'S');
        const answerFilename = `${examName}_${categoryName}_${subjectName}_答案.pdf`;
        lines.push(answerUrl);
        lines.push(`out=${answerFilename}`);
        lines.push(''); // 空行分隔
      }
    });

    // 生成 TXT 文件內容
    const linksText = lines.join('\n');
    
    // 創建 Blob 對象
    const blob = new Blob([linksText], { type: 'text/plain;charset=utf-8' });
    
    // 創建下載連結
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 生成文件名：考試名稱_下載連結.txt
    const examName = selectedExam?.exam_name || '考試';
    link.download = `${examName}_下載連結.txt`;
    
    // 觸發下載
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`已生成下載連結文字檔`, {
      description: `包含 ${selectedSubjects.length * 2} 個 PDF 下載連結，請將此文件導入 Free Download Manager 進行批量下載`,
    });
  };

  const handleConfirmDownload = () => {
    if (!selectedExamCode) {
      toast.error('請選擇考試');
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error('請至少選擇一個科目');
      return;
    }

    // 計算總文件數（每個科目有試題和答案兩個文件）
    const totalFiles = selectedSubjects.length * 2;
    if (totalFiles > 16) {
      toast.error('選擇的文件總數超過 16 個', {
        description: `目前選擇了 ${selectedSubjects.length} 個科目（${totalFiles} 個文件），考選部限制最多 8 個科目（16 個文件）`,
      });
      return;
    }

    // 改為直接在瀏覽器中打開下載連結
    const urls: string[] = [];
    selectedSubjects.forEach(subject => {
      // 試題連結
      urls.push(getPdfUrl(selectedExamCode, subject.categoryCode, subject.subjectCode, 'Q'));
      // 答案連結
      urls.push(getPdfUrl(selectedExamCode, subject.categoryCode, subject.subjectCode, 'S'));
    });

    // 在新標籤頁中打開所有連結
    urls.forEach((url, index) => {
      // 稍微延遲打開，避免瀏覽器阻止彈出視窗
      setTimeout(() => {
        window.open(url, '_blank');
      }, index * 100);
    });

    toast.success(`已打開 ${urls.length} 個下載連結`, {
      description: '瀏覽器會自動下載 PDF 文件，請檢查下載文件夾',
    });

    // 關閉對話框
    setDownloadDialogOpen(false);
    setSelectedSubjects([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />等待中</Badge>;
      case 'running':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />下載中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失敗</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小時${minutes % 60}分鐘`;
    } else if (minutes > 0) {
      return `${minutes}分鐘${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  return (
    <>
      
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">考古題下載管理</h1>
          <p className="text-muted-foreground">
            瀏覽考選部歷年考古題，點擊下載按鈕後系統會自動打開 PDF 下載連結
          </p>
        </div>

      {/* 年度選擇器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>選擇年度</CardTitle>
          <CardDescription>選擇要下載的考試年度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="選擇年度" />
              </SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} 年（民國 {year - 1911} 年）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                fetchExamDataMutation.mutate({ year: selectedYear });
              }} 
              variant="outline" 
              size="sm"
              disabled={fetchExamDataMutation.isPending}
            >
              {fetchExamDataMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {fetchExamDataMutation.isPending ? '抓取中...' : '抓取考試資料'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 考試列表 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>可下載的考試</CardTitle>
          <CardDescription>
            {examData && examData.length > 0 && examData[0].exams.length > 0
              ? `共 ${examData[0].exams.length} 個考試`
              : '暫無可下載的考試'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingExams ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : examData && examData.length > 0 && examData[0].exams.length > 0 ? (
            <div className="space-y-4">
              {examData[0].exams.map((exam: any) => {
                const isExpanded = expandedExams.has(exam.exam_code);
                return (
                  <Card key={exam.exam_code}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExamExpanded(exam.exam_code)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <CardTitle className="text-lg">{exam.exam_name}</CardTitle>
                          </div>
                          <CardDescription className="ml-8">
                            考試代碼: {exam.exam_code} | {exam.categories.length} 個類科
                          </CardDescription>
                        </div>
                        <Button onClick={() => handleDownloadClick(exam)} size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          下載
                        </Button>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent>
                        <div className="ml-8 space-y-2">
                          {exam.categories.map((cat: any, idx: number) => (
                            <div key={cat.category_code} className="text-sm">
                              <span className="font-medium">{cat.category_name}</span>
                              <span className="text-muted-foreground ml-2">
                                （{cat.subjects.length} 科）
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">暫無可下載的考試</p>
              <Button onClick={() => setAddExamDialogOpen(true)}>
                添加考試
              </Button>
              <p className="text-sm text-muted-foreground mt-2">或選擇其他年度</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 下載任務列表 */}
      <Card>
        <CardHeader>
          <CardTitle>下載任務</CardTitle>
          <CardDescription>
            {downloadTasks && downloadTasks.length > 0
              ? `共 ${downloadTasks.length} 個任務`
              : '暫無下載任務'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {downloadTasks && downloadTasks.length > 0 ? (
            <div className="space-y-4">
              {downloadTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">
                            {task.year} 年 - {task.examCode}
                          </h4>
                          {getStatusBadge(task.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>任務 ID: {task.id}</p>
                          <p>
                            已下載: {task.downloadedFiles} / {task.totalFiles} 個文件
                            {task.failedFiles > 0 && ` | 失敗: ${task.failedFiles}`}
                          </p>
                          {task.status === 'running' && (
                            <p>
                              下載中: {task.downloadingFiles} 個 | 等待中: {task.pendingFiles} 個
                            </p>
                          )}
                          <p>
                            用時: {formatDuration(task.startTime, task.endTime)}
                          </p>
                          {task.error && (
                            <p className="text-destructive">錯誤: {task.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(task.status === 'completed' || task.status === 'failed') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTaskMutation.mutate({ taskId: task.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {task.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>整體進度</span>
                          <span className="font-medium">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    )}
                    {task.files && task.files.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                            文件列表 ({task.files.length} 個文件)
                          </summary>
                          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                            {task.files.map((file: any) => (
                              <div key={file.id} className="flex items-center gap-2 text-sm p-2 hover:bg-accent rounded-md">
                                {file.status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
                                {file.status === 'downloading' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                                {file.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                {file.status === 'failed' && <XCircle className="w-4 h-4 text-destructive" />}
                                <div className="flex-1 min-w-0">
                                  <p className="truncate">{file.fileName}</p>
                                  {file.error && (
                                    <p className="text-xs text-destructive truncate">{file.error}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {file.status === 'pending' && '等待中'}
                                  {file.status === 'downloading' && '下載中'}
                                  {file.status === 'completed' && '已完成'}
                                  {file.status === 'failed' && '失敗'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>暫無下載任務</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 下載確認對話框 */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>選擇要下載的科目</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>點擊「下載連結文字檔」後，系統會自動下載一個 TXT 文件，您可以將此文件導入 Free Download Manager 進行批量下載。</p>
              
              {/* 使用教學區塊 */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  <ChevronRight className="w-4 h-4" />
                  如何使用 Free Download Manager？
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
                    <p className="font-medium text-foreground">步驟 1：安裝 FDM</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        <a href="https://www.freedownloadmanager.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          下載 FDM 軟體
                        </a>（Windows/Mac/Linux）
                      </li>
                      <li>
                        <a href="https://chromewebstore.google.com/detail/free-download-manager/ahmpjcflkgiildlgicmcieglgoilbfdp" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          安裝 Chrome 擴充功能
                        </a>
                      </li>
                    </ul>
                    
                    <p className="font-medium text-foreground mt-3">步驟 2：設定 FDM</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>打開 FDM 擴充功能設定</li>
                      <li>啟用「捕獲瀏覽器下載」</li>
                      <li>啟用「批次新增」功能</li>
                    </ul>
                    
                    <p className="font-medium text-foreground mt-3">步驟 3：下載檔案</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>點擊「下載連結文字檔」按鈕</li>
                      <li>FDM 會自動彈出批次下載對話框</li>
                      <li>點擊「確定」開始批量下載</li>
                    </ul>
                    
                    <p className="font-medium text-foreground mt-3">如果 FDM 未自動捕獲：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>系統會提供 TXT 文件下載</li>
                      <li>在 FDM 中點擊「從文件導入」</li>
                      <li>選擇下載的 TXT 文件即可</li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </DialogDescription>
          </DialogHeader>
          {selectedExam && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{selectedExam.exam_name}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>考試代碼: {selectedExam.exam_code}</p>
                  <p>類科數量: {selectedExam.categories.length}</p>
                  <p className="font-medium">
                    已選擇: {getTotalSubjects()} 個科目（{getTotalSubjects() * 2} 個文件）
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      全選
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={getTotalSubjects() === 0}
                    >
                      取消全選
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 space-y-4 max-h-[500px] overflow-y-auto">
                {selectedExam.categories.map((category: any) => {
                  const isCategoryExpanded = expandedCategories.has(category.category_code);
                  return (
                    <div key={category.category_code} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={getCategoryCheckState(category) === 'checked'}
                          ref={(el) => {
                            if (el) {
                              const checkState = getCategoryCheckState(category);
                              // 使用類型斷言來設置 indeterminate 屬性
                              (el as any).indeterminate = checkState === 'indeterminate';
                            }
                          }}
                          onCheckedChange={() => handleCategoryToggle(category)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleCategoryExpanded(category.category_code)}
                        >
                          {isCategoryExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <Label className="font-medium text-base cursor-pointer" onClick={() => toggleCategoryExpanded(category.category_code)}>
                          {category.category_name}
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          ({category.subjects.length} 科)
                        </span>
                      </div>
                      
                      {isCategoryExpanded && (
                        <div className="ml-8 space-y-3">
                          {category.subjects.map((subject: any) => {
                            const questionUrl = getPdfUrl(selectedExam.exam_code, category.category_code, subject.subject_code, 'Q');
                            const answerUrl = getPdfUrl(selectedExam.exam_code, category.category_code, subject.subject_code, 'S');
                            
                            return (
                              <div key={subject.subject_code} className="flex items-start space-x-3 p-2 hover:bg-accent rounded-md">
                                <Checkbox
                                  id={`${category.category_code}-${subject.subject_code}`}
                                  checked={isSubjectSelected(category.category_code, subject.subject_code)}
                                  onCheckedChange={() => handleSubjectToggle(category.category_code, subject.subject_code)}
                                />
                                <div className="flex-1">
                                  <Label 
                                    htmlFor={`${category.category_code}-${subject.subject_code}`} 
                                    className="cursor-pointer font-medium"
                                  >
                                    {subject.subject_name}
                                  </Label>
                                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span>試題：</span>
                                      <a 
                                        href={questionUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        開啟連結
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-2"
                                        onClick={() => handleCopyUrl(questionUrl)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span>答案：</span>
                                      <a 
                                        href={answerUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        開啟連結
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-2"
                                        onClick={() => handleCopyUrl(answerUrl)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
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

              {/* 自動上傳功能已移除，因為改用瀏覽器直接下載 */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleDownloadLinksFile}
              disabled={getTotalSubjects() === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              下載連結文字檔（{getTotalSubjects()} 個科目，{getTotalSubjects() * 2} 個文件）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加考試對話框 */}
      <Dialog open={addExamDialogOpen} onOpenChange={setAddExamDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加考試</DialogTitle>
            <DialogDescription>
              為 {selectedYear} 年添加新的考試資料
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="examCode">考試代碼</Label>
              <input
                id="examCode"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="例如：114010"
                value={newExamData.examCode}
                onChange={(e) => setNewExamData({ ...newExamData, examCode: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="examName">考試名稱</Label>
              <input
                id="examName"
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="例如：114年公務人員初等考試"
                value={newExamData.examName}
                onChange={(e) => setNewExamData({ ...newExamData, examName: e.target.value })}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>提示：添加考試後，系統會自動生成 PDF 下載連結。</p>
              <p>連結格式：https://wwwc.moex.gov.tw/ExamQuesFiles/Question/[考試代碼]/[類科代碼][科目代碼]Q.pdf</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddExamDialogOpen(false);
              setNewExamData({
                examCode: '',
                examName: '',
                categories: [{ categoryCode: '', categoryName: '', subjects: [{ subjectCode: '', subjectName: '' }] }]
              });
            }}>
              取消
            </Button>
            <Button
              onClick={() => {
                addExamMutation.mutate({
                  year: selectedYear,
                  examCode: newExamData.examCode,
                  examName: newExamData.examName,
                });
              }}
              disabled={!newExamData.examCode || !newExamData.examName || addExamMutation.isPending}
            >
              {addExamMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
