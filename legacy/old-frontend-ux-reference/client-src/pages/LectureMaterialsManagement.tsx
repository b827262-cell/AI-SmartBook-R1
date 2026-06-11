import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, FileText, Eye, Sparkles, Video, Languages } from "lucide-react";
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
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

// FAQ Status Cell Component
function FAQStatusCell({ materialId }: { materialId: number }) {
  const { data: faqCount } = trpc.teacherMaterials.getFAQCount.useQuery({ materialId });
  
  if (faqCount === undefined) {
    return <span className="text-muted-foreground text-sm">加載中...</span>;
  }
  
  if (faqCount === 0) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-amber-500">⚠️</span>
        <span className="text-sm text-muted-foreground">未生成</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-green-500">✅</span>
      <span className="text-sm font-medium">{faqCount} 則</span>
    </div>
  );
}

export default function LectureMaterialsManagement() {
  const [activeTab, setActiveTab] = useState("subjects");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">講義知識庫管理</h1>
        <p className="text-muted-foreground">
          管理類科、老師和講義資料，支援批次上傳 TXT 檔案（含 Markdown 和 LaTeX）
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="subjects">類科管理</TabsTrigger>
          <TabsTrigger value="teachers">老師管理</TabsTrigger>
          <TabsTrigger value="materials">講義管理</TabsTrigger>
          <TabsTrigger value="courses">課程群組</TabsTrigger>
          <TabsTrigger value="transcript-review">字幕審核</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects">
          <SubjectsTab />
        </TabsContent>

        <TabsContent value="teachers">
          <TeachersTab />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab />
        </TabsContent>

        <TabsContent value="courses">
          <CoursesTab />
        </TabsContent>

        <TabsContent value="transcript-review">
          <TranscriptReviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 類科管理 ====================

function SubjectsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: subjects, refetch } = trpc.subjects.list.useQuery();
  const createMutation = trpc.subjects.create.useMutation();
  const updateMutation = trpc.subjects.update.useMutation();
  const deleteMutation = trpc.subjects.delete.useMutation();

  const handleSubmit = async () => {
    try {
      if (editingSubject) {
        await updateMutation.mutateAsync({ id: editingSubject.id, ...formData });
        toast.success("類科更新成功");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("類科創建成功");
      }
      setIsDialogOpen(false);
      setEditingSubject(null);
      setFormData({ name: "", description: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失敗");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此類科嗎？")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("類科刪除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const openDialog = (subject?: any) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({ name: subject.name, description: subject.description || "" });
    } else {
      setEditingSubject(null);
      setFormData({ name: "", description: "" });
    }
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>類科列表</CardTitle>
            <CardDescription>管理考試類科（例如：民法、刑法、行政法）</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            新增類科
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>類科名稱</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>創建時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects?.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell>{subject.description || "-"}</TableCell>
                <TableCell>{new Date(subject.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openDialog(subject)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(subject.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? "編輯類科" : "新增類科"}</DialogTitle>
              <DialogDescription>
                填寫類科資訊
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>類科名稱 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：民法"
                />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="類科簡介"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>確定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ==================== 老師管理 ====================

function TeachersTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    styleContent: "",
    subjectIds: [] as number[],
  });

  const { data: teachers, refetch } = trpc.lectureTeachers.list.useQuery();
  const { data: subjects } = trpc.subjects.list.useQuery();
  const createMutation = trpc.lectureTeachers.create.useMutation();
  const updateMutation = trpc.lectureTeachers.update.useMutation();
  const deleteMutation = trpc.lectureTeachers.delete.useMutation();

  const handleSubmit = async () => {
    try {
      if (editingTeacher) {
        await updateMutation.mutateAsync({ id: editingTeacher.id, ...formData });
        toast.success("老師更新成功");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("老師創建成功");
      }
      setIsDialogOpen(false);
      setEditingTeacher(null);
      setFormData({ name: "", description: "", styleContent: "", subjectIds: [] });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失敗");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此老師嗎？")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("老師刪除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const openDialog = (teacher?: any) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        name: teacher.name,
        description: teacher.description || "",
        styleContent: teacher.styleContent || "",
        subjectIds: teacher.subjects?.map((s: any) => s.id) || [],
      });
    } else {
      setEditingTeacher(null);
      setFormData({ name: "", description: "", styleContent: "", subjectIds: [] });
    }
    setIsDialogOpen(true);
  };

  const toggleSubject = (subjectId: number) => {
    setFormData({
      ...formData,
      subjectIds: formData.subjectIds.includes(subjectId)
        ? formData.subjectIds.filter(id => id !== subjectId)
        : [...formData.subjectIds, subjectId],
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>老師列表</CardTitle>
            <CardDescription>管理講義老師資料和教學風格</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            新增老師
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>老師姓名</TableHead>
              <TableHead>所屬類科</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers?.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">{teacher.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {teacher.subjects?.map((subject: any) => (
                      <Badge key={subject.id} variant="secondary">{subject.name}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{teacher.description || "-"}</TableCell>
                <TableCell>
                  <Badge variant={teacher.isActive ? "default" : "secondary"}>
                    {teacher.isActive ? "啟用" : "停用"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openDialog(teacher)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(teacher.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTeacher ? "編輯老師" : "新增老師"}</DialogTitle>
              <DialogDescription>
                填寫老師資訊和教學風格
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>老師姓名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：張老師"
                />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="老師簡介"
                  rows={2}
                />
              </div>
              <div>
                <Label>教學風格檔案（TXT 內容）</Label>
                <Textarea
                  value={formData.styleContent}
                  onChange={(e) => setFormData({ ...formData, styleContent: e.target.value })}
                  placeholder={`記錄老師的說話習慣、口頭禪、教學風格，例如：

【張老師的教學風格】

說話習慣：
- 喜歡用生活化的例子解釋法律概念
- 常說「同學們要記住」、「這個很重要喔」

口頭禪：
- 「這個觀念很重要」
- 「我們來看一個案例」

教學風格：
- 親切、幽默
- 會用比喻和故事`}
                  rows={10}
                />
              </div>
              <div>
                <Label>所屬類科</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {subjects?.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject.id}`}
                        checked={formData.subjectIds.includes(subject.id)}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      <label htmlFor={`subject-${subject.id}`} className="text-sm cursor-pointer">
                        {subject.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>確定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ==================== 講義管理 ====================

function MaterialsTab() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updatingMaterialId, setUpdatingMaterialId] = useState<number | null>(null);
  const [updateFile, setUpdateFile] = useState<{ content: string; fileName: string } | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [uploadFormData, setUploadFormData] = useState({
    teacherId: 0,
    subjectId: 0,
    files: [] as Array<{ title: string; content: string; fileName: string }>,
  });
  const [uploadTeacherSearch, setUploadTeacherSearch] = useState(''); // 批次上傳老師搜尋
  const [uploadSubjectSearch, setUploadSubjectSearch] = useState(''); // 批次上傳類科搜尋
  // 搜尋和篩選
  const [searchText, setSearchText] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState<number | 'all'>('all');
  const [filterSubjectId, setFilterSubjectId] = useState<number | 'all'>('all');
  // 勾選講義建立課程
  const [selectedForCourse, setSelectedForCourse] = useState<Set<number>>(new Set());
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCourseName, setQuickCourseName] = useState('');
  const [quickCourseDesc, setQuickCourseDesc] = useState('');
  const [quickCoursePointCost, setQuickCoursePointCost] = useState(0);
  const [quickCourseAccessMode, setQuickCourseAccessMode] = useState<'public' | 'class_only' | 'private'>('public');
  const [quickCourseTeacherId, setQuickCourseTeacherId] = useState<number>(0);
  const [quickCourseSubjectId, setQuickCourseSubjectId] = useState<number>(0);

  const { data: materials, refetch } = trpc.teacherMaterials.list.useQuery();
  const { data: teachers } = trpc.lectureTeachers.list.useQuery();
  const { data: subjects } = trpc.subjects.list.useQuery();
  const uploadMutation = trpc.teacherMaterials.batchUpload.useMutation();
  const updateTitleMutation = trpc.teacherMaterials.updateTitle.useMutation();
  const updateContentMutation = trpc.teacherMaterials.updateContent.useMutation();
  const updateSortOrderMutation = trpc.teacherMaterials.updateSortOrder.useMutation();
  const deleteMutation = trpc.teacherMaterials.delete.useMutation();
  const generateFAQsMutation = trpc.teacherMaterials.generateFAQs.useMutation();
  const [editingSortId, setEditingSortId] = useState<number | null>(null);
  const [editingSortValue, setEditingSortValue] = useState<string>("");
  const [convertConfirmId, setConvertConfirmId] = useState<number | null>(null);
  const convertToTraditional = trpc.convertChinese.convertMaterialToTraditional.useMutation({
    onSuccess: (result) => {
      toast.success(`簡轉繁完成！共轉換 ${result.chunksConverted} 個段落`);
      setConvertConfirmId(null);
      refetch();
    },
    onError: (err) => {
      toast.error('簡轉繁失敗：' + err.message);
      setConvertConfirmId(null);
    },
  });
  // 影片管理相關 state
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoMaterialId, setVideoMaterialId] = useState<number | null>(null);
  const [videoMaterialTitle, setVideoMaterialTitle] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [transcriptInput, setTranscriptInput] = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState<string>('none');
  const [transcriptProgress, setTranscriptProgress] = useState<string>('');
  const [videoSummaryData, setVideoSummaryData] = useState<any>(null);
  
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadedAudioName, setUploadedAudioName] = useState('');

  const updateVideoMutation = trpc.teacherMaterials.updateVideo.useMutation();
  const transcribeVideoMutation = trpc.teacherMaterials.transcribeVideo.useMutation();
  const transcribeFromUploadMutation = trpc.teacherMaterials.transcribeFromUpload.useMutation();
  const parseSrtMutation = trpc.teacherMaterials.parseSrt.useMutation();
  const updateTranscriptMutation = trpc.teacherMaterials.updateTranscript.useMutation();
  const generateVideoSummaryMutation = trpc.teacherMaterials.generateVideoSummary.useMutation();
  const cancelTranscriptMutation = trpc.teacherMaterials.cancelTranscript.useMutation();
  const getAudioUploadTokenMutation = trpc.teacherMaterials.getAudioUploadToken.useMutation();
  
  const { data: videoData, refetch: refetchVideo } = trpc.teacherMaterials.getVideoData.useQuery(
    { id: videoMaterialId! },
    { 
      enabled: !!videoMaterialId,
      staleTime: 0, // 每次開啟 Dialog 都重新 fetch，不使用就的 cache
    }
  );
  
  // 辨識中自動輪詢進度
  useEffect(() => {
    if (transcriptStatus !== 'processing') return;
    const timer = setInterval(() => { refetchVideo(); }, 8000);
    return () => clearInterval(timer);
  }, [transcriptStatus, refetchVideo]);

  // 當 videoData 載入時同步到 state
  useEffect(() => {
    if (videoData) {
      setVideoUrlInput(videoData.videoUrl || '');
      setTranscriptInput(videoData.transcript || '');
      setTranscriptStatus(videoData.transcriptStatus || 'none');
      setTranscriptProgress(videoData.transcriptProgress || '');
      if (videoData.videoSummary) {
        try { setVideoSummaryData(JSON.parse(videoData.videoSummary)); } catch { setVideoSummaryData(null); }
      } else {
        setVideoSummaryData(null);
      }
    }
  }, [videoData]);
  
  const handleOpenVideoDialog = (material: any) => {
    // 先清空舊資料，避免顯示上一個講義的內容
    setVideoUrlInput('');
    setTranscriptInput('');
    setTranscriptStatus('none');
    setTranscriptProgress('');
    setVideoSummaryData(null);
    setUploadedAudioName('');
    // 設定新的 materialId（會觸發 useQuery 重新 fetch）
    setVideoMaterialId(material.id);
    setVideoMaterialTitle(material.title);
    setIsVideoDialogOpen(true);
  };

  const handleSaveSortOrder = async (id: number) => {
    const val = parseInt(editingSortValue, 10);
    if (isNaN(val) || val < 0) {
      toast.error("請輸入有效的排序數字（0 表示不設定）");
      return;
    }
    try {
      await updateSortOrderMutation.mutateAsync({ id, sortOrder: val });
      toast.success("排序更新成功");
      setEditingSortId(null);
      setEditingSortValue("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失敗");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadFormData((prev) => ({
          ...prev,
          files: [
            ...prev.files,
            {
              title: file.name.replace(/\.txt$/i, ""),
              content,
              fileName: file.name,
            },
          ],
        }));
      };
      reader.readAsText(file);
    });
  };

  const handleUpload = async () => {
    if (!uploadFormData.teacherId || !uploadFormData.subjectId) {
      toast.error("請選擇老師和類科");
      return;
    }
    if (uploadFormData.files.length === 0) {
      toast.error("請上傳至少一個 TXT 檔案");
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        teacherId: uploadFormData.teacherId,
        subjectId: uploadFormData.subjectId,
        materials: uploadFormData.files,
      });
      toast.success(`成功上傳 ${result.results.length} 個講義`);
      setIsUploadDialogOpen(false);
      setUploadFormData({ teacherId: 0, subjectId: 0, files: [] });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "上傳失敗");
    }
  };

  const handleStartEdit = (material: any) => {
    setEditingMaterialId(material.id);
    setEditingTitle(material.title);
  };

  const handleCancelEdit = () => {
    setEditingMaterialId(null);
    setEditingTitle("");
  };

  const handleSaveTitle = async (id: number) => {
    if (!editingTitle.trim()) {
      toast.error("標題不能為空");
      return;
    }
    try {
      await updateTitleMutation.mutateAsync({ id, title: editingTitle });
      toast.success("標題更新成功");
      setEditingMaterialId(null);
      setEditingTitle("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失敗");
    }
  };

  const handleStartUpdateContent = (materialId: number) => {
    setUpdatingMaterialId(materialId);
    setUpdateFile(null);
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUpdateFile({
        content,
        fileName: file.name,
      });
    };
    reader.readAsText(file);
  };

  const handleUpdateContent = async () => {
    if (!updatingMaterialId || !updateFile) {
      toast.error("請上傳 TXT 檔案");
      return;
    }

    try {
      const result = await updateContentMutation.mutateAsync({
        id: updatingMaterialId,
        content: updateFile.content,
        fileName: updateFile.fileName,
      });
      toast.success(result.message || "講義內容更新成功");
      setIsUpdateDialogOpen(false);
      setUpdatingMaterialId(null);
      setUpdateFile(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新失敗");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此講義嗎？")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("講義刪除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  // 篩選後的講義列表
  const filteredMaterials = (materials || []).filter((m: any) => {
    if (searchText && !m.title.toLowerCase().includes(searchText.toLowerCase()) &&
        !m.teacherName?.toLowerCase().includes(searchText.toLowerCase()) &&
        !m.subjectName?.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterTeacherId !== 'all' && m.teacherId !== filterTeacherId) return false;
    if (filterSubjectId !== 'all' && m.subjectId !== filterSubjectId) return false;
    return true;
  });
  const allFilteredSelected = filteredMaterials.length > 0 && filteredMaterials.every((m: any) => selectedForCourse.has(m.id));

  const createCourseMutation = trpc.lectureCourses.create.useMutation({
    onSuccess: async (result) => {
      // 建立後自動分配已勾選的講義
      if (result.id && selectedForCourse.size > 0) {
        try {
          await assignMaterialsMutation.mutateAsync({
            courseId: result.id,
            materialIds: Array.from(selectedForCourse),
            releasedIds: [],
          });
        } catch (e) {}
      }
      toast.success(`課程「${quickCourseName}」建立成功，已分配 ${selectedForCourse.size} 筆講義`);
      setIsQuickCreateOpen(false);
      setQuickCourseName('');
      setQuickCourseDesc('');
      setQuickCoursePointCost(0);
      setQuickCourseAccessMode('public');
      setQuickCourseTeacherId(0);
      setQuickCourseSubjectId(0);
      setSelectedForCourse(new Set());
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const assignMaterialsMutation = trpc.lectureCourses.assignMaterials.useMutation();

  // 快速建立課程：從已勾選講義中推斷預設老師和類科
  const selectedMaterialsList = (materials || []).filter((m: any) => selectedForCourse.has(m.id));
  const inferredTeacherId = selectedMaterialsList.length > 0 ? (selectedMaterialsList[0] as any).teacherId : 0;
  const inferredSubjectId = selectedMaterialsList.length > 0 ? (selectedMaterialsList[0] as any).subjectId : 0;
  // 快速建立課程的老師類科（使用使用者選擇的，預設從第一筆講義推斷）
  const effectiveTeacherId = quickCourseTeacherId || inferredTeacherId;
  const effectiveSubjectId = quickCourseSubjectId || inferredSubjectId;
  // 快速建立課程時，已選老師的類科列表
  const quickTeacherSubjects = effectiveTeacherId
    ? (teachers || []).filter((t: any) => t.id === effectiveTeacherId).flatMap((t: any) => t.subjects || [])
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>講義列表</CardTitle>
            <CardDescription>批次上傳講義 TXT 檔案（支援 Markdown 和 LaTeX）</CardDescription>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            批次上傳講義
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 搜尋和篩選工具列 */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <Input
            placeholder="搜尋標題、老師、類科..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-56 text-sm"
          />
          <select
            value={filterTeacherId}
            onChange={e => setFilterTeacherId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="border rounded px-2 py-1.5 text-sm bg-background"
          >
            <option value="all">全部老師</option>
            {(teachers || []).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filterSubjectId}
            onChange={e => setFilterSubjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="border rounded px-2 py-1.5 text-sm bg-background"
          >
            <option value="all">全部類科</option>
            {(subjects || []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {(searchText || filterTeacherId !== 'all' || filterSubjectId !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setFilterTeacherId('all'); setFilterSubjectId('all'); }}>
              清除篩選
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">顯示 {filteredMaterials.length} / {(materials || []).length} 筆</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={() => {
                    if (allFilteredSelected) {
                      setSelectedForCourse(prev => {
                        const next = new Set(prev);
                        filteredMaterials.forEach((m: any) => next.delete(m.id));
                        return next;
                      });
                    } else {
                      setSelectedForCourse(prev => {
                        const next = new Set(prev);
                        filteredMaterials.forEach((m: any) => next.add(m.id));
                        return next;
                      });
                    }
                  }}
                />
              </TableHead>
              <TableHead className="min-w-[200px] w-[30%]">講義標題</TableHead>
              <TableHead>老師</TableHead>
              <TableHead>類科</TableHead>
              <TableHead>分段數</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>常見問題</TableHead>
              <TableHead className="w-[80px]">排序</TableHead>
              <TableHead>上傳時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.map((material: any) => (
              <TableRow key={material.id} className={selectedForCourse.has(material.id) ? 'bg-blue-50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedForCourse.has(material.id)}
                    onCheckedChange={() => {
                      setSelectedForCourse(prev => {
                        const next = new Set(prev);
                        if (next.has(material.id)) next.delete(material.id);
                        else next.add(material.id);
                        return next;
                      });
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {editingMaterialId === material.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSaveTitle(material.id)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleSaveTitle(material.id)}>
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="break-words whitespace-normal leading-snug">{material.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(material)}
                        className="h-6 w-6 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>{material.teacherName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{material.subjectName}</Badge>
                </TableCell>
                <TableCell>{material.totalChunks} 段</TableCell>
                <TableCell>
                  <Badge variant={material.isProcessed ? "default" : "secondary"}>
                    {material.isProcessed ? "已處理" : "處理中"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <FAQStatusCell materialId={material.id} />
                </TableCell>
                <TableCell>
                  {editingSortId === material.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={9999}
                        value={editingSortValue}
                        onChange={(e) => setEditingSortValue(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSaveSortOrder(material.id)}
                        className="w-16 h-7 text-sm px-1"
                      />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleSaveSortOrder(material.id)}>✓</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => { setEditingSortId(null); setEditingSortValue(""); }}>✕</Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-1 py-0.5 group"
                      onClick={() => { setEditingSortId(material.id); setEditingSortValue(String(material.sortOrder || 0)); }}
                    >
                      <span className="text-sm font-mono">{material.sortOrder && material.sortOrder > 0 ? material.sortOrder : <span className="text-muted-foreground">-</span>}</span>
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </div>
                  )}
                </TableCell>
                <TableCell>{new Date(material.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/admin/material-content/${material.id}`, '_blank')}
                      title="查看內容"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartUpdateContent(material.id)}
                      title="更新內容"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          toast.loading('正在生成常見問題...');
                          const result = await generateFAQsMutation.mutateAsync({ materialId: material.id });
                          toast.success(result.message);
                        } catch (error: any) {
                          toast.error(error.message || '生成失敗');
                        }
                      }}
                      title="生成常見問題"
                      disabled={generateFAQsMutation.isPending}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenVideoDialog(material)}
                      title="影片管理"
                      className={material.videoUrl ? 'text-blue-500' : ''}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConvertConfirmId(material.id)}
                      title="簡體轉繁體"
                      className="text-orange-500 hover:text-orange-600"
                    >
                      <Languages className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 已勾選浮動工具列 */}
        {selectedForCourse.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border shadow-xl rounded-full px-5 py-3">
            <span className="text-sm font-medium text-blue-700">已勾選 {selectedForCourse.size} 筆講義</span>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              onClick={() => setIsQuickCreateOpen(true)}
            >
              一鍵建立課程群組
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-gray-500"
              onClick={() => setSelectedForCourse(new Set())}
            >
              取消選取
            </Button>
          </div>
        )}

        {/* 快速建立課程群組 Dialog */}
        <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>建立新課程群組</DialogTitle>
              <DialogDescription>
                已勾選 {selectedForCourse.size} 筆講義，將建立新課程並自動分配
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 已勾選講義預覽 */}
              <div className="bg-blue-50 rounded-md p-3 max-h-36 overflow-y-auto">
                <p className="text-xs font-medium text-blue-700 mb-2">已勾選講義：</p>
                <div className="space-y-1">
                  {Array.from(selectedForCourse).map(id => {
                    const m = (materials || []).find((x: any) => x.id === id) as any;
                    return m ? (
                      <div key={id} className="flex items-center gap-2 text-xs">
                        <span className="text-blue-600">•</span>
                        <span className="font-medium">{m.title}</span>
                        <span className="text-muted-foreground">({m.teacherName} / {m.subjectName})</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              <div>
                <Label>課程名稱 *</Label>
                <Input
                  placeholder="例：民法綜合班（陳聽富 + 李明諳）"
                  value={quickCourseName}
                  onChange={e => setQuickCourseName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>課程描述（選填）</Label>
                <Textarea
                  placeholder="簡短描述課程內容..."
                  value={quickCourseDesc}
                  onChange={e => setQuickCourseDesc(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>解鎖點數（0 = 免費）</Label>
                  <input
                    type="number" min={0} max={9999}
                    value={quickCoursePointCost}
                    onChange={e => setQuickCoursePointCost(parseInt(e.target.value) || 0)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label>存取模式</Label>
                  <select
                    value={quickCourseAccessMode}
                    onChange={e => setQuickCourseAccessMode(e.target.value as any)}
                    className="w-full border rounded px-2 py-2 text-sm mt-1 bg-background"
                  >
                    <option value="public">🌍 公開</option>
                    <option value="class_only">🏫 限班內生</option>
                    <option value="private">🔒 不公開</option>
                  </select>
                </div>
              </div>
              {/* 老師和類科選擇（綜合班可自由選） */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>主要老師 *</Label>
                  <select
                    value={effectiveTeacherId}
                    onChange={e => { setQuickCourseTeacherId(Number(e.target.value)); setQuickCourseSubjectId(0); }}
                    className="w-full border rounded px-2 py-2 text-sm mt-1 bg-background"
                  >
                    <option value={0}>請選擇老師</option>
                    {(teachers || []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>類科 *</Label>
                  <select
                    value={effectiveSubjectId}
                    onChange={e => setQuickCourseSubjectId(Number(e.target.value))}
                    className="w-full border rounded px-2 py-2 text-sm mt-1 bg-background"
                    disabled={!effectiveTeacherId}
                  >
                    <option value={0}>{effectiveTeacherId ? '請選擇類科' : '請先選老師'}</option>
                    {quickTeacherSubjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    {quickTeacherSubjects.length === 0 && effectiveTeacherId > 0 && (
                      <option disabled>此老師尚無類科</option>
                    )}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ℹ️ 課程群組的主要老師和類科用於分類，不影響已勾選講義的分配
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuickCreateOpen(false)}>取消</Button>
              <Button
                disabled={!quickCourseName.trim() || createCourseMutation.isPending || effectiveTeacherId === 0 || effectiveSubjectId === 0}
                onClick={() => createCourseMutation.mutate({
                  name: quickCourseName.trim(),
                  description: quickCourseDesc.trim() || undefined,
                  lectureTeacherId: effectiveTeacherId,
                  subjectId: effectiveSubjectId,
                  pointCost: quickCoursePointCost,
                  isPublic: quickCourseAccessMode !== 'private',
                  accessMode: quickCourseAccessMode,
                })}
              >
                {createCourseMutation.isPending ? '建立中...' : `建立課程（${selectedForCourse.size} 筆講義）`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>批次上傳講義</DialogTitle>
              <DialogDescription>
                選擇老師、類科，然後上傳 TXT 檔案（支援 Markdown 表格和 LaTeX 公式）
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>選擇老師 *</Label>
                <div className="relative">
                  <Input
                    placeholder="搜尋老師名稱..."
                    value={uploadTeacherSearch || (uploadFormData.teacherId ? (teachers?.find((t: any) => t.id === uploadFormData.teacherId) as any)?.name || '' : '')}
                    onChange={e => {
                      setUploadTeacherSearch(e.target.value);
                      setUploadFormData({ ...uploadFormData, teacherId: 0, subjectId: 0 });
                      setUploadSubjectSearch('');
                    }}
                    className="text-sm"
                  />
                  {uploadTeacherSearch && (
                    <div className="absolute z-10 w-full bg-white border rounded shadow-md mt-1 max-h-40 overflow-y-auto">
                      {(teachers as any[])?.filter((t: any) => t.name.toLowerCase().includes(uploadTeacherSearch.toLowerCase())).map((t: any) => (
                        <button key={t.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => { setUploadFormData({ ...uploadFormData, teacherId: t.id, subjectId: 0 }); setUploadTeacherSearch(''); setUploadSubjectSearch(''); }}>
                          {t.name}
                        </button>
                      ))}
                      {(teachers as any[])?.filter((t: any) => t.name.toLowerCase().includes(uploadTeacherSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">無符合的老師</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>選擇類科 *</Label>
                <div className="relative">
                  <Input
                    placeholder={uploadFormData.teacherId ? '搜尋類科...' : '請先選擇老師'}
                    disabled={!uploadFormData.teacherId}
                    value={uploadSubjectSearch || (uploadFormData.subjectId ? (subjects as any[])?.find((s: any) => s.id === uploadFormData.subjectId)?.name || '' : '')}
                    onChange={e => {
                      setUploadSubjectSearch(e.target.value);
                      setUploadFormData({ ...uploadFormData, subjectId: 0 });
                    }}
                    className="text-sm"
                  />
                  {uploadSubjectSearch && uploadFormData.teacherId && (
                    <div className="absolute z-10 w-full bg-white border rounded shadow-md mt-1 max-h-40 overflow-y-auto">
                      {(subjects as any[])?.filter((s: any) => s.name.toLowerCase().includes(uploadSubjectSearch.toLowerCase())).map((s: any) => (
                        <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => { setUploadFormData({ ...uploadFormData, subjectId: s.id }); setUploadSubjectSearch(''); }}>
                          {s.name}
                        </button>
                      ))}
                      {(subjects as any[])?.filter((s: any) => s.name.toLowerCase().includes(uploadSubjectSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">無符合的類科</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>上傳 TXT 檔案（可多選）</Label>
                <Input
                  type="file"
                  accept=".txt"
                  multiple
                  onChange={handleFileUpload}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  支援 Markdown 格式（表格、標題）和 LaTeX 公式
                </p>
              </div>
              {uploadFormData.files.length > 0 && (
                <div>
                  <Label>已選擇的檔案：</Label>
                  <div className="mt-2 space-y-2">
                    {uploadFormData.files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.fileName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadFormData({
                              ...uploadFormData,
                              files: uploadFormData.files.filter((_, i) => i !== index),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>取消</Button>
              <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "上傳中..." : "確定上傳"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 更新講義內容對話框 */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>更新講義內容</DialogTitle>
              <DialogDescription>
                上傳新的 TXT 檔案以更新講義內容（會刪除舊內容並重新解析）
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>上傳 TXT 檔案</Label>
                <Input
                  type="file"
                  accept=".txt"
                  onChange={handleUpdateFileUpload}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  支援 Markdown 格式（表格、標題）和 LaTeX 公式
                </p>
              </div>
              {updateFile && (
                <div className="p-3 bg-gray-50 rounded-md border">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{updateFile.fileName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    檔案大小：{(updateFile.content.length / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>取消</Button>
              <Button 
                onClick={handleUpdateContent} 
                disabled={updateContentMutation.isPending || !updateFile}
              >
                {updateContentMutation.isPending ? "更新中..." : "確定更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* 影片管理 Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>影片管理 - {videoMaterialTitle}</DialogTitle>
            <DialogDescription>設定影片連結（支援 YouTube 或公司自架影片）、觸發 Whisper 辨識、編輯逐字稿、生成 AI 摘要</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>影片連結（YouTube 或公司自架影片）</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://www.youtube.com/watch?v=... 或 https://公司網址/video.mp4"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={async () => {
                    if (!videoMaterialId) return;
                    try {
                      await updateVideoMutation.mutateAsync({ id: videoMaterialId, videoUrl: videoUrlInput || null });
                      toast.success('影片連結已儲存');
                      refetchVideo();
                      refetch();
                    } catch (e: any) { toast.error(e.message); }
                  }}
                  disabled={updateVideoMutation.isPending}
                >
                  {updateVideoMutation.isPending ? '儲存中...' : '儲存'}
                </Button>
              </div>
              {videoUrlInput && (
                <a href={videoUrlInput} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                  開新分頁預覽影片 ↗
                </a>
              )}
            </div>
            <div className="border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Whisper 辨識逐字稿</p>
                  <p className="text-xs text-muted-foreground">
                    狀態：{transcriptStatus === 'none' ? '尚未辨識' : transcriptStatus === 'processing' ? `辨識中${transcriptProgress ? `（${transcriptProgress}）` : '...'}` : transcriptStatus === 'done' ? `已完成${transcriptProgress ? ` (${transcriptProgress})` : ''}` : `辨識失敗${transcriptProgress ? `: ${transcriptProgress}` : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {transcriptStatus === 'processing' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!videoMaterialId) return;
                        try {
                          await cancelTranscriptMutation.mutateAsync({ id: videoMaterialId });
                          setTranscriptStatus('none');
                          setTranscriptProgress('');
                          toast.success('已取消辨識，可重新上傳');
                        } catch (e: any) { toast.error(e.message); }
                      }}
                      disabled={cancelTranscriptMutation.isPending}
                    >
                      {cancelTranscriptMutation.isPending ? '取消中...' : '✕ 取消辨識'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!videoMaterialId) return;
                      if (!videoUrlInput) { toast.error('請先設定影片連結'); return; }
                      try {
                        await transcribeVideoMutation.mutateAsync({ id: videoMaterialId });
                        toast.success('已開始辨識，進行中請稍候刷新...');
                        setTranscriptStatus('processing');
                        setTimeout(() => refetchVideo(), 5000);
                      } catch (e: any) { toast.error(e.message); }
                    }}
                    disabled={transcribeVideoMutation.isPending || transcriptStatus === 'processing' || !videoUrlInput}
                  >
                    {transcriptStatus === 'processing' ? `辨識中${transcriptProgress ? ` ${transcriptProgress}` : '...'}` : (videoUrlInput && !/youtube\.com|youtu\.be/.test(videoUrlInput) ? '從影片辨識' : '從 YouTube 辨識')}
                  </Button>
                </div>
              </div>
              {/* 手動上傳音訊備案 */}
              <div className="border border-dashed rounded-md p-3 mb-3 bg-background space-y-3">
                <p className="text-xs font-medium text-muted-foreground">📎 備案：影片有版權或隱私限制時使用</p>
                {/* 方案 A：上傳 SRT 字幕檔（最簡單） */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">✨ <strong>方案 A：上傳 SRT 字幕檔</strong>（最快，不需要 AI 辨識）</p>
                  <p className="text-xs text-muted-foreground mb-2">可從 YouTube 下載 .srt 字幕檔，系統自動解析時間點。</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".srt,text/plain"
                      className="hidden"
                      disabled={parseSrtMutation.isPending || transcriptStatus === 'processing'}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !videoMaterialId) return;
                        try {
                          const srtContent = await file.text();
                          const result = await parseSrtMutation.mutateAsync({ id: videoMaterialId, srtContent });
                          toast.success(`SRT 解析成功！共 ${result.lineCount} 行逐字稿`);
                          setTranscriptStatus('done');
                          setTranscriptInput(result.transcript);
                          refetchVideo();
                        } catch (err: any) {
                          toast.error(err.message || 'SRT 解析失敗');
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" asChild disabled={parseSrtMutation.isPending || transcriptStatus === 'processing'}>
                      <span>{parseSrtMutation.isPending ? '解析中...' : '選擇 SRT 檔案'}</span>
                    </Button>
                  </label>
                </div>
                {/* 方案 B：上傳音訊檔送 Whisper */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">🎤 <strong>方案 B：上傳音訊檔</strong>（MP3 / M4A / WAV，最大 200MB）</p>
                  <p className="text-xs text-muted-foreground mb-2">自行下載音訊後上傳，系統用 Whisper AI 辨識逐字稿。</p>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/*"
                        className="hidden"
                        disabled={isUploadingAudio || transcriptStatus === 'processing'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !videoMaterialId) return;
                          if (file.size > 200 * 1024 * 1024) { toast.error('檔案超過 200MB 限制'); return; }
                          setIsUploadingAudio(true);
                          setUploadedAudioName(file.name);
                          try {
                            // Step 1: 從後端取得上傳憑證（後端 key 有 S3 權限）
                            const tokenData = await getAudioUploadTokenMutation.mutateAsync({ filename: file.name });
                            const { forgeApiUrl, forgeApiKey, fileKey } = tokenData;
                            // Step 2: 直接上傳到 Forge Storage，繞過 Manus 代理層
                            const uploadUrl = new URL('v1/storage/upload', forgeApiUrl.endsWith('/') ? forgeApiUrl : forgeApiUrl + '/');
                            uploadUrl.searchParams.set('path', fileKey);
                            const fd = new FormData();
                            fd.append('file', file, file.name);
                            toast.loading('上傳中，請稍候...');
                            const res = await fetch(uploadUrl.toString(), {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${forgeApiKey}` },
                              body: fd,
                            });
                            if (!res.ok) {
                              const errText = await res.text().catch(() => res.statusText);
                              throw new Error(`上傳失敗 (${res.status}): ${errText}`);
                            }
                            const { url } = await res.json();
                            toast.dismiss();
                            // Step 3: 通知後端開始 Whisper 辨識
                            await transcribeFromUploadMutation.mutateAsync({ id: videoMaterialId, audioUrl: url });
                            toast.success('上傳成功，已開始 Whisper 辨識！');
                            setTranscriptStatus('processing');
                            setTimeout(() => refetchVideo(), 5000);
                          } catch (err: any) {
                            toast.dismiss();
                            toast.error(err.message || '上傳失敗');
                            setUploadedAudioName('');
                          } finally {
                            setIsUploadingAudio(false);
                            e.target.value = '';
                          }
                        }}
                      />
                      <Button size="sm" variant="outline" asChild disabled={isUploadingAudio || transcriptStatus === 'processing'}>
                        <span>{isUploadingAudio ? '上傳中...' : '選擇音訊檔'}</span>
                      </Button>
                    </label>
                    {uploadedAudioName && (
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">{uploadedAudioName}</span>
                    )}
                  </div>
                </div>
              </div>
              <Textarea
                placeholder="逐字稿將顯示在此，格式：[00:01:23] 文字...可直接編輯修正"
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                className="min-h-[150px] font-mono text-xs"
              />
              <div className="flex justify-between mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('確定要清空逐字稿？此操作不可復原。')) {
                      setTranscriptInput('');
                    }
                  }}
                  disabled={!transcriptInput}
                >
                  清空逐字稿
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!videoMaterialId) return;
                    try {
                      await updateTranscriptMutation.mutateAsync({ id: videoMaterialId, transcript: transcriptInput });
                      toast.success('逐字稿已儲存');
                      refetchVideo();
                    } catch (e: any) { toast.error(e.message); }
                  }}
                  disabled={updateTranscriptMutation.isPending}
                >
                  {updateTranscriptMutation.isPending ? '儲存中...' : '儲存逐字稿'}
                </Button>
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">AI 時間點摘要</p>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!videoMaterialId) return;
                    if (!transcriptInput) { toast.error('請先完成逐字稿辨識'); return; }
                    try {
                      const result = await generateVideoSummaryMutation.mutateAsync({ id: videoMaterialId });
                      setVideoSummaryData(result.summary);
                      toast.success('AI 摘要已生成');
                    } catch (e: any) { toast.error(e.message); }
                  }}
                  disabled={generateVideoSummaryMutation.isPending || !transcriptInput}
                >
                  {generateVideoSummaryMutation.isPending ? '生成中...' : 'AI 生成摘要'}
                </Button>
              </div>
              {videoSummaryData?.summaries && (
                <div className="space-y-2">
                  {videoSummaryData.summaries.map((s: any, i: number) => (
                    <div key={i} className="flex gap-2 text-xs border-b pb-1">
                      <span className="font-mono text-blue-500 shrink-0">{s.timestamp}</span>
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-muted-foreground">{s.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!videoSummaryData && <p className="text-xs text-muted-foreground">尚未生成摘要，請先完成逐字稿辨識再點擊「AI 生成摘要」</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 簡繁轉換確認 */}
      <AlertDialog open={!!convertConfirmId} onOpenChange={() => setConvertConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-orange-500" />
              確認簡體轉繁體
            </AlertDialogTitle>
            <AlertDialogDescription>
              將講義標題、描述及所有內容段落從簡體中文轉換為繁體中文（台灣用語）。
              <br />
              <strong className="text-orange-600">此操作不可逆，轉換後無法還原為簡體。</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                if (convertConfirmId) convertToTraditional.mutate({ materialId: convertConfirmId });
              }}
              disabled={convertToTraditional.isPending}
            >
              {convertToTraditional.isPending ? '轉換中...' : '確認轉換'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </CardContent>
    </Card>
  );
}

// ==================== 字幕審核 Tab ====================

function TranscriptReviewTab() {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editedText, setEditedText] = useState<string>('');
  const utils = trpc.useUtils();

  const { data: pendingListData, isLoading } = trpc.transcriptCorrections.adminGetRequests.useQuery({ status: 'pending' });
  const pendingList = (pendingListData?.items || []) as any[];

  const approveMutation = trpc.transcriptCorrections.adminApprove.useMutation({
    onSuccess: () => {
      toast.success('已校正通過，字幕已正式更新！');
      setSelectedRequest(null);
      setEditedText('');
      utils.transcriptCorrections.adminGetRequests.invalidate();
    },
    onError: () => toast.error('校正失敗'),
  });

  const batchApproveMutation = trpc.transcriptCorrections.adminBatchApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`批次校正通過 ${data.count} 筆，字幕已正式更新！`);
      setSelectedIds([]);
      utils.transcriptCorrections.adminGetRequests.invalidate();
    },
    onError: () => toast.error('批次校正失敗'),
  });

  const allIds = pendingList.map((r: any) => r.id);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;
  const toggleAll = () => setSelectedIds(isAllSelected ? [] : allIds);
  const toggleOne = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">載入中...</div>;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>字幕校正審核</CardTitle>
              <CardDescription>學生提交的字幕校正申請，審核通過後將正式覆蓋所有人的字幕</CardDescription>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">已選 {selectedIds.length} 筆</span>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={batchApproveMutation.isPending}
                  onClick={() => batchApproveMutation.mutate({ requestIds: selectedIds })}
                >
                  {batchApproveMutation.isPending ? '更新中...' : '批次校正通過'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">目前沒有待審核的字幕校正申請</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs">全選</span>
                    </label>
                  </TableHead>
                  <TableHead>時間點</TableHead>
                  <TableHead>原始字幕</TableHead>
                  <TableHead>學生校正版</TableHead>
                  <TableHead>校正理由</TableHead>
                  <TableHead>提交者</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.map((req: any) => (
                  <TableRow key={req.id} className={selectedIds.includes(req.id) ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(req.id)}
                        onChange={() => toggleOne(req.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-500">{req.timestamp}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                      <span className="line-clamp-2">{req.original_text}</span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-green-600 max-w-[180px]">
                      <span className="line-clamp-2">{req.corrected_text}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px]">
                      {req.reason || <span className="italic">未填寫</span>}
                    </TableCell>
                    <TableCell className="text-xs">{req.student_name || req.submitter_id}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => { setSelectedRequest(req); setEditedText(req.corrected_text || ''); }}
                        >
                          審核
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 校正對話框 */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setEditedText(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>字幕校正</DialogTitle>
            <DialogDescription>可直接修改校正內容後送出，正式覆蓋字幕</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="text-sm font-mono text-blue-500">時間點：{selectedRequest.timestamp}</div>
              <div className="bg-muted rounded p-3">
                <p className="text-xs text-muted-foreground mb-1 font-semibold">原始字幕</p>
                <p className="text-sm">{selectedRequest.original_text}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 mb-1 font-semibold">校正內容（可直接修改）</p>
                <textarea
                  className="w-full border border-green-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  rows={3}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  placeholder="學生校正版，可在此直接修改"
                />
              </div>
              {selectedRequest.reason && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">校正理由：</span>{selectedRequest.reason}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setSelectedRequest(null); setEditedText(''); }}
            >
              取消
            </Button>
            <Button
              onClick={() => approveMutation.mutate({
                requestId: selectedRequest?.id as number,
                correctedText: editedText.trim() || selectedRequest?.corrected_text,
              })}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? '更新中...' : '校正通過，正式覆蓋字幕'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 課程群組管理 ====================

function CoursesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [newCourse, setNewCourse] = useState({ name: '', description: '', lectureTeacherId: 0, subjectId: 0, pointCost: 0, isPublic: false, accessMode: 'public' as 'public' | 'class_only' | 'private' });
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [classCodeDialog, setClassCodeDialog] = useState<{ open: boolean; courseId: number; courseName: string; currentCode: string } | null>(null);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [releasedMaterialIds, setReleasedMaterialIds] = useState<number[]>([]); // 已開放的講義 ID
  const [courseTeacherSearch, setCourseTeacherSearch] = useState(''); // 新增課程老師搜尋
  const [courseSubjectSearch, setCourseSubjectSearch] = useState(''); // 新增課程類科搜尋
  const [userSearch, setUserSearch] = useState('');
  const [enrollNote, setEnrollNote] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: courses = [], refetch: refetchCourses } = trpc.lectureCourses.list.useQuery();
  const { data: teachers = [] } = trpc.lectureTeachers.list.useQuery();
  const { data: subjects = [] } = trpc.subjects.list.useQuery();
  const { data: courseStats = [] } = trpc.lectureCourses.getCourseStats.useQuery();
  const { data: courseMatData, refetch: refetchMaterials } = trpc.lectureCourses.getMaterialsForCourse.useQuery(
    { courseId: selectedCourse?.id ?? 0 },
    { enabled: !!selectedCourse && isAssignOpen }
  );
  const { data: enrollments = [], refetch: refetchEnrollments } = trpc.lectureCourses.getEnrollments.useQuery(
    { courseId: selectedCourse?.id ?? 0 },
    { enabled: !!selectedCourse && isEnrollOpen }
  );
  const { data: accessList = [], refetch: refetchAccessList } = trpc.lectureCourses.getCourseAccessList.useQuery(
    { courseId: selectedCourse?.id ?? 0 },
    { enabled: !!selectedCourse && isEnrollOpen }
  );
  const { data: userList = [] } = trpc.lectureCourses.listUsers.useQuery(
    { search: userSearch },
    { enabled: isEnrollOpen && userSearch.length >= 1 }
  );

  const createMutation = trpc.lectureCourses.create.useMutation({
    onSuccess: () => { toast.success('課程建立成功'); setIsCreateOpen(false); setNewCourse({ name: '', description: '', lectureTeacherId: 0, subjectId: 0, pointCost: 0, isPublic: false, accessMode: 'public' }); setCourseTeacherSearch(''); setCourseSubjectSearch(''); refetchCourses(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCourseMutation = trpc.lectureCourses.update.useMutation({
    onSuccess: () => { toast.success('課程設定已更新'); setEditingCourseId(null); refetchCourses(); },
    onError: (e) => toast.error(e.message),
  });
  const setClassCodeMutation = trpc.lectureCourses.setClassCode.useMutation({
    onSuccess: () => { toast.success('班級驗證碼已更新'); setClassCodeDialog(null); setClassCodeInput(''); refetchCourses(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.lectureCourses.delete.useMutation({
    onSuccess: () => { toast.success('課程已刪除'); refetchCourses(); },
    onError: (e) => toast.error(e.message),
  });
  const assignMutation = trpc.lectureCourses.assignMaterials.useMutation({
    onSuccess: () => { toast.success('分配成功'); setIsAssignOpen(false); refetchCourses(); },
    onError: (e) => toast.error(e.message),
  });
  const addEnrollMutation = trpc.lectureCourses.addEnrollment.useMutation({
    onSuccess: () => { toast.success('購課登錄成功'); setSelectedUserId(null); setEnrollNote(''); setUserSearch(''); refetchEnrollments(); },
    onError: (e) => toast.error(e.message),
  });
  const removeEnrollMutation = trpc.lectureCourses.removeEnrollment.useMutation({
    onSuccess: () => { toast.success('已移除購課'); refetchEnrollments(); },
    onError: (e) => toast.error(e.message),
  });

  // 當 courseMatData 載入後，初始化已選取的講義和開放狀態
  useEffect(() => {
    if (courseMatData) {
      setSelectedMaterialIds(courseMatData.assignedIds);
      // 初始化已開放的講義 ID
      const released = courseMatData.materials
        .filter((m: any) => m.isReleased === 1)
        .map((m: any) => m.id);
      setReleasedMaterialIds(released);
    }
  }, [courseMatData]);

  const handleOpenAssign = (course: any) => {
    // 先清空再設定課程，讓 useEffect 在 courseMatData 重新載入後正確初始化
    if (selectedCourse?.id !== course.id) {
      setSelectedMaterialIds([]);
      setReleasedMaterialIds([]);
    }
    setSelectedCourse(course);
    setIsAssignOpen(true);
  };

  const handleOpenEnroll = (course: any) => {
    setSelectedCourse(course);
    setSelectedUserId(null);
    setEnrollNote('');
    setUserSearch('');
    setIsEnrollOpen(true);
  };

  const toggleMaterial = (id: number) => {
    setSelectedMaterialIds(prev => {
      const isCurrentlySelected = prev.includes(id);
      if (isCurrentlySelected) {
        // 取消分配時，同步清除試閱狀態
        setReleasedMaterialIds(r => r.filter(x => x !== id));
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleReleased = (id: number) => {
    setReleasedMaterialIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [assignSearch, setAssignSearch] = useState(''); // 分配講義搜尋關鍵字

  // 根據課程的老師篩選可選的類科
  const teacherSubjects = newCourse.lectureTeacherId
    ? (teachers.find((t: any) => t.id === newCourse.lectureTeacherId) as any)?.subjects ?? []
    : [];

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>課程群組管理</CardTitle>
            <CardDescription>建立課程後，可在此 Tab 將講義分配到課程中</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />新增課程
          </Button>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">尚無課程，請點擊「新增課程」建立</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>課程名稱</TableHead>
                  <TableHead>老師</TableHead>
                  <TableHead>類科</TableHead>
                  <TableHead>點數</TableHead>
                  <TableHead>開放狀態</TableHead>
                  <TableHead>購課人數</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course: any) => {
                  const teacher = teachers.find((t: any) => t.id === course.lectureTeacherId);
                  const subject = subjects.find((s: any) => s.id === course.subjectId);
                  const isEditing = editingCourseId === course.id;
                  const stat = (courseStats as any[]).find((s: any) => s.courseId === course.id);
                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>{teacher?.name ?? '-'}</TableCell>
                      <TableCell>{subject?.name ?? '-'}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <input
                            type="number" min={0} max={9999}
                            defaultValue={course.pointCost ?? 0}
                            className="w-20 border rounded px-2 py-1 text-sm"
                            id={`pointCost-${course.id}`}
                          />
                        ) : (
                          <span className="text-sm">{(course.pointCost ?? 0) === 0 ? <span className="text-green-600">免費</span> : <span className="text-orange-600">{course.pointCost} 點</span>}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            id={`accessMode-${course.id}`}
                            defaultValue={course.accessMode || 'public'}
                            className="text-xs border rounded px-1 py-0.5"
                          >
                            <option value="public">🌍 公開</option>
                            <option value="class_only">🏫 限班內生</option>
                            <option value="private">🔒 不公開</option>
                          </select>
                        ) : (
                          course.accessMode === 'class_only'
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">🏫 限班內生</span>
                            : course.accessMode === 'private' || course.isPublic !== 1
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">🔒 不公開</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">🌍 公開</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stat ? (
                          <div className="text-sm">
                            <span className="font-medium text-blue-700">{stat.accessCount} 人</span>
                            {stat.paidCount > 0 && (
                              <span className="text-xs text-orange-600 ml-1">(付費 {stat.paidCount})</span>
                            )}
                            {stat.totalPointsEarned > 0 && (
                              <div className="text-xs text-muted-foreground">共 {stat.totalPointsEarned} 點</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">0 人</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {isEditing ? (
                            <>
                              <Button size="sm" variant="default"
                                onClick={() => {
                                  const pointCostEl = document.getElementById(`pointCost-${course.id}`) as HTMLInputElement;
                                  const accessModeEl = document.getElementById(`accessMode-${course.id}`) as HTMLSelectElement;
                                  const accessMode = accessModeEl?.value as 'public' | 'class_only' | 'private' || 'public';
                                  updateCourseMutation.mutate({ id: course.id, pointCost: parseInt(pointCostEl.value) || 0, isPublic: accessMode !== 'private', accessMode });
                                }}>
                                儲存
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingCourseId(null)}>取消</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="text-purple-600 border-purple-300 hover:bg-purple-50" onClick={() => setEditingCourseId(course.id)}>
                              設定
                            </Button>
                          )}
                          {course.accessMode === 'class_only' && (
                            <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => { setClassCodeDialog({ open: true, courseId: course.id, courseName: course.name, currentCode: course.classCode || '' }); setClassCodeInput(course.classCode || ''); }}>
                              🔑 驗證碼
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleOpenAssign(course)}>
                            分配講義
                          </Button>
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => handleOpenEnroll(course)}>
                            購課管理
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                            onClick={() => { if (confirm(`確定刪除課程「${course.name}」？`)) deleteMutation.mutate({ id: course.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新增課程 Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增課程群組</DialogTitle>
            <DialogDescription>建立課程後，可在此 Tab 將講義分配到課程中</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>課程名稱 *</Label>
              <Input placeholder="例：陳聰富 2025 民法全修班" value={newCourse.name}
                onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} />
            </div>
            <div>
              <Label>老師 *</Label>
              <div className="relative">
                <Input
                  placeholder="搜尋老師名稱..."
                  value={courseTeacherSearch || (newCourse.lectureTeacherId ? (teachers.find((t: any) => t.id === newCourse.lectureTeacherId) as any)?.name || '' : '')}
                  onChange={e => {
                    setCourseTeacherSearch(e.target.value);
                    setNewCourse({ ...newCourse, lectureTeacherId: 0, subjectId: 0 });
                    setCourseSubjectSearch('');
                  }}
                  className="text-sm"
                />
                {courseTeacherSearch && (
                  <div className="absolute z-10 w-full bg-white border rounded shadow-md mt-1 max-h-40 overflow-y-auto">
                    {(teachers as any[]).filter((t: any) => t.name.toLowerCase().includes(courseTeacherSearch.toLowerCase())).map((t: any) => (
                      <button key={t.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setNewCourse({ ...newCourse, lectureTeacherId: t.id, subjectId: 0 }); setCourseTeacherSearch(''); setCourseSubjectSearch(''); }}>
                        {t.name}
                      </button>
                    ))}
                    {(teachers as any[]).filter((t: any) => t.name.toLowerCase().includes(courseTeacherSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">無符合的老師</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>類科 *</Label>
              <div className="relative">
                <Input
                  placeholder={newCourse.lectureTeacherId ? '搜尋類科...' : '請先選擇老師'}
                  disabled={!newCourse.lectureTeacherId}
                  value={courseSubjectSearch || (newCourse.subjectId ? (teacherSubjects as any[]).find((s: any) => s.id === newCourse.subjectId)?.name || '' : '')}
                  onChange={e => {
                    setCourseSubjectSearch(e.target.value);
                    setNewCourse({ ...newCourse, subjectId: 0 });
                  }}
                  className="text-sm"
                />
                {courseSubjectSearch && newCourse.lectureTeacherId && (
                  <div className="absolute z-10 w-full bg-white border rounded shadow-md mt-1 max-h-40 overflow-y-auto">
                    {(teacherSubjects as any[]).filter((s: any) => s.name.toLowerCase().includes(courseSubjectSearch.toLowerCase())).map((s: any) => (
                      <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setNewCourse({ ...newCourse, subjectId: s.id }); setCourseSubjectSearch(''); }}>
                        {s.name}
                      </button>
                    ))}
                    {(teacherSubjects as any[]).filter((s: any) => s.name.toLowerCase().includes(courseSubjectSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">無符合的類科</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>課程描述（選填）</Label>
              <Textarea placeholder="簡短描述課程內容..." value={newCourse.description}
                onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
            </div>
            <div>
              <Label>解鎖點數（0 = 免費）</Label>
              <input
                type="number" min={0} max={9999}
                value={newCourse.pointCost}
                onChange={e => setNewCourse({ ...newCourse, pointCost: parseInt(e.target.value) || 0 })}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">學生進入此課程需要扣除的點數，0 表示免費</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">存取模式</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="newCourseAccessMode" value="public"
                    checked={newCourse.accessMode === 'public'}
                    onChange={() => setNewCourse({ ...newCourse, accessMode: 'public', isPublic: true })}
                    className="accent-blue-600" />
                  <span className="text-sm">🌍 公開（所有學生都能看，需購課解鎖）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="newCourseAccessMode" value="class_only"
                    checked={newCourse.accessMode === 'class_only'}
                    onChange={() => setNewCourse({ ...newCourse, accessMode: 'class_only', isPublic: true })}
                    className="accent-orange-600" />
                  <span className="text-sm">🏫 限班內生（需輸入學員編號驗證，驗證後免費直接看）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="newCourseAccessMode" value="private"
                    checked={newCourse.accessMode === 'private'}
                    onChange={() => setNewCourse({ ...newCourse, accessMode: 'private', isPublic: false })}
                    className="accent-gray-600" />
                  <span className="text-sm">🔒 不公開（僅管理員可看）</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
            <Button
              disabled={!newCourse.name || !newCourse.lectureTeacherId || !newCourse.subjectId || createMutation.isPending}
              onClick={() => createMutation.mutate(newCourse)}>
              {createMutation.isPending ? '建立中...' : '建立課程'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分配講義 Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>分配講義 — {selectedCourse?.name}</DialogTitle>
            <DialogDescription>勾選要加入此課程的講義，勾選後學生即可在教材 QA 學習專區看到</DialogDescription>
          </DialogHeader>
          {!courseMatData ? (
            <div className="py-4 text-center text-muted-foreground">載入中...</div>
          ) : courseMatData.materials.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">此老師此類科下尚無講義</div>
          ) : (() => {
            const filteredMats = courseMatData.materials.filter((m: any) =>
              !assignSearch || m.title.toLowerCase().includes(assignSearch.toLowerCase())
            );
            const allSelected = filteredMats.length > 0 && filteredMats.every((m: any) => selectedMaterialIds.includes(m.id));
            const allReleased = filteredMats.length > 0 && filteredMats.filter((m: any) => selectedMaterialIds.includes(m.id)).every((m: any) => releasedMaterialIds.includes(m.id));
            return (
              <div className="flex flex-col gap-2">
                {/* 搜尋框 */}
                <Input
                  placeholder="搜尋講義名稱..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="text-sm"
                />
                {/* 表頭：全選/全開放 */}
                <div className="flex items-center gap-3 px-2 py-1 bg-gray-50 rounded border text-xs font-medium text-gray-600">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => {
                      if (allSelected) {
                        setSelectedMaterialIds(prev => prev.filter(id => !filteredMats.some((m: any) => m.id === id)));
                        setReleasedMaterialIds(prev => prev.filter(id => !filteredMats.some((m: any) => m.id === id)));
                      } else {
                        const newIds = filteredMats.map((m: any) => m.id);
                        setSelectedMaterialIds(prev => [...new Set([...prev, ...newIds])]);
                      }
                    }}
                  />
                  <span className="flex-1">全選（已勾選 {selectedMaterialIds.length} / {courseMatData.materials.length} 筆）</span>
                  <span className="w-20 text-center text-xs">分配到課程</span>
                  <span className="w-16 text-center text-xs text-orange-600">試閱</span>
                </div>
                <p className="text-xs text-muted-foreground px-2 pb-1">ℹ️ 試閱：未購課的學生可免費預覽該章節</p>
                {/* 講義列表 */}
                <div className="overflow-y-auto max-h-80 space-y-1">
                  {filteredMats.map((m: any) => {
                    const isSelected = selectedMaterialIds.includes(m.id);
                    const isRel = releasedMaterialIds.includes(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-accent">
                        <span className="flex-1 text-sm cursor-pointer" onClick={() => toggleMaterial(m.id)}>{m.title}</span>
                        {m.courseId && m.courseId !== selectedCourse?.id && (
                          <Badge variant="outline" className="text-xs">已在其他課程</Badge>
                        )}
                        {/* 分配到課程勾選框 */}
                        <div className="w-20 flex justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMaterial(m.id)}
                          />
                        </div>
                        {/* 試閱勾選框（只有已分配的講義才能勾選） */}
                        <div className="w-16 flex justify-center">
                          <Checkbox
                            checked={isRel}
                            disabled={!isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setReleasedMaterialIds(prev => [...new Set([...prev, m.id])]);
                              } else {
                                setReleasedMaterialIds(prev => prev.filter(id => id !== m.id));
                              }
                            }}
                            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {filteredMats.length === 0 && (
                    <div className="py-4 text-center text-muted-foreground text-sm">無符合搜尋的講義</div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>取消</Button>
            <Button
              disabled={assignMutation.isPending}
              onClick={() => assignMutation.mutate({
                courseId: selectedCourse?.id,
                materialIds: selectedMaterialIds,
                releasedIds: releasedMaterialIds.filter(id => selectedMaterialIds.includes(id)), // 只有已分配且勾選試閱的才開放
              })}>
              {assignMutation.isPending ? '儲存中...' : `儲存（已分配 ${selectedMaterialIds.length} 筆）`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 購課管理 Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>購課管理 — {selectedCourse?.name}</DialogTitle>
            <DialogDescription>管理此課程的購課學生名單</DialogDescription>
          </DialogHeader>

          {/* 新增購課區塊 */}
          <div className="border rounded-md p-3 space-y-3 bg-blue-50">
            <p className="text-sm font-medium text-blue-800">新增購課學生</p>
            <div className="flex gap-2">
              <Input
                placeholder="搜尋學生姓名或 Email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="flex-1"
              />
            </div>
            {userSearch.length >= 1 && userList.length > 0 && (
              <div className="border rounded bg-white shadow-sm max-h-40 overflow-y-auto">
                {userList.map((u: any) => (
                  <button
                    key={u.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between ${
                      selectedUserId === u.id ? 'bg-blue-100 font-medium' : ''
                    }`}
                    onClick={() => setSelectedUserId(u.id)}
                  >
                    <span>{u.name}</span>
                    <span className="text-muted-foreground text-xs">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            {userSearch.length >= 1 && userList.length === 0 && (
              <p className="text-xs text-muted-foreground">找不到符合的學生</p>
            )}
            {selectedUserId && (
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="備註（選填，如：購課日期、訂單號）"
                  value={enrollNote}
                  onChange={e => setEnrollNote(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={addEnrollMutation.isPending}
                  onClick={() => addEnrollMutation.mutate({ courseId: selectedCourse?.id, userId: selectedUserId, note: enrollNote })}
                >
                  {addEnrollMutation.isPending ? '登錄中...' : '登錄購課'}
                </Button>
              </div>
            )}
          </div>

          {/* 自動扣點購課學生清單（course_access） */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              💳 自動購課學生（{(accessList as any[]).length} 人）
              <span className="text-xs text-muted-foreground font-normal">— 學生自行扣點解鎖</span>
            </p>
            {(accessList as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">尚無學生自行購課</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生姓名</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>扣點數</TableHead>
                    <TableHead>購課時間</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(accessList as any[]).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.userName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.userEmail || '-'}</TableCell>
                      <TableCell>
                        {a.pointsSpent === 0
                          ? <span className="text-xs text-green-600">免費</span>
                          : <span className="text-xs text-orange-600 font-medium">{a.pointsSpent} 點</span>
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('zh-TW') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* 手動登錄購課學生清單（course_enrollments） */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              📝 手動登錄購課（{enrollments.length} 人）
              <span className="text-xs text-muted-foreground font-normal">— 管理員手動登錄</span>
            </p>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">尚無手動登錄購課學生</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生姓名</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>備註</TableHead>
                    <TableHead>登錄時間</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.userName ?? `用戶 #${e.userId}`}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.userEmail ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.note ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.createdAt ? new Date(e.createdAt).toLocaleDateString('zh-TW') : '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          disabled={removeEnrollMutation.isPending}
                          onClick={() => { if (confirm(`確定移除「${e.userName}」的購課權限？`)) removeEnrollMutation.mutate({ enrollmentId: e.id }); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 班級密碼設定 Dialog */}
      <Dialog open={!!classCodeDialog?.open} onOpenChange={(open) => !open && setClassCodeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🔑 設定班級密碼</DialogTitle>
            <DialogDescription>
              課程：{classCodeDialog?.courseName}<br />
              學員需輸入「學員編號」 + 「此密碼」才能進入課程。留空則不需要密碼。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">班級密碼</label>
              <Input
                placeholder="輸入密碼（留空則不需要密碼）"
                value={classCodeInput}
                onChange={e => setClassCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && classCodeDialog && setClassCodeMutation.mutate({ courseId: classCodeDialog.courseId, classCode: classCodeInput.trim() || null })}
              />
            </div>
            {classCodeDialog?.currentCode && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
                目前密碼：<strong>{classCodeDialog.currentCode}</strong>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              💡 設定後，將此密碼告知班內學員。學員點擊課程時需輸入「學員編號」和「班級密碼」才能進入。驗證成功後 <strong>3 天內</strong>有效，換電腦不需重新驗證。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassCodeDialog(null)}>取消</Button>
            <Button
              onClick={() => classCodeDialog && setClassCodeMutation.mutate({ courseId: classCodeDialog.courseId, classCode: classCodeInput.trim() || null })}
              disabled={setClassCodeMutation.isPending}
            >
              {setClassCodeMutation.isPending ? '儲存中...' : '儲存密碼'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
