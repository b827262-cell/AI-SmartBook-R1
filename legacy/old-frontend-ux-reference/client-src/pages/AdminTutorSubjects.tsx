import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Loader2,
  Wand2,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Brain,
  History,
  ClipboardList,
  Video,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Subject {
  id: number;
  name: string;
  description: string | null;
  iconEmoji: string | null;
  sortOrder: number | null;
  isEnabled: number | null;
}

interface BookRow {
  id: number | null;
  bookTitle: string | null;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  bookExamType: string | null;
  smartBookId: number | null;
  subjectId: number | null;
  sortOrder: number | null;
  createdAt: number | null;
}

function SubjectCard({ subject }: { subject: Subject }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<Set<number>>(new Set());
  // 關聯考題狀態
  const [showAddExam, setShowAddExam] = useState(false);
  const [examSourceType, setExamSourceType] = useState<'exam_set' | 'real_exam' | 'past_exam'>('exam_set');
  const [examSearch, setExamSearch] = useState('');
  const [selectedExamIds, setSelectedExamIds] = useState<Set<number>>(new Set());
  const [addingExams, setAddingExams] = useState(false);
  // 關聯函授狀態
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [addingCourses, setAddingCourses] = useState(false);
  const utils = trpc.useUtils();

  const { data: allSmartBooks = [] } = trpc.tutorSubjectBooksAdmin.getAllSmartBooks.useQuery(
    { keyword: bookSearch },
    { enabled: showAddBook }
  );

  const { data: linkedBooks = [], isLoading: booksLoading } =
    trpc.tutorSubjectBooksAdmin.getBySubject.useQuery(
      { subjectId: subject.id },
      { enabled: expanded }
    );

  const addBooksMutation = trpc.tutorSubjectBooksAdmin.addBooks.useMutation({
    onSuccess: (data) => {
      toast.success(`已新增 ${data.added} 本書`);
      setBookSearch("");
      setSelectedBookIds(new Set());
      setShowAddBook(false);
      utils.tutorSubjectBooksAdmin.getBySubject.invalidate({ subjectId: subject.id });
    },
    onError: (e) => toast.error("新增失敗：" + e.message),
  });

  const removeBookMutation = trpc.tutorSubjectBooksAdmin.removeBook.useMutation({
    onSuccess: () => {
      toast.success("已移除關聯");
      utils.tutorSubjectBooksAdmin.getBySubject.invalidate({ subjectId: subject.id });
    },
    onError: (e) => toast.error("移除失敗：" + e.message),
  });

  const updateSortMutation = trpc.tutorSubjectBooksAdmin.updateBookSortOrder.useMutation({
    onSuccess: () => {
      utils.tutorSubjectBooksAdmin.getBySubject.invalidate({ subjectId: subject.id });
    },
    onError: (e) => toast.error("排序失敗：" + e.message),
  });

  const updateMutation = trpc.tutorSubjectsAdmin.update.useMutation({
    onSuccess: () => {
      toast.success("已更新");
      utils.tutorSubjectsAdmin.getAll.invalidate();
    },
  });

  const { data: linkedExams = [], isLoading: examsLoading } =
    trpc.tutorSubjectExamSourcesAdmin.getBySubject.useQuery(
      { subjectId: subject.id },
      { enabled: expanded }
    );

  const { data: linkedCourses = [], isLoading: coursesLoading } =
    trpc.tutorSubjectVideoCoursesAdmin.getBySubject.useQuery(
      { subjectId: subject.id },
      { enabled: expanded }
    );

  const { data: searchedCourses = [] } =
    trpc.tutorSubjectVideoCoursesAdmin.searchCourses.useQuery(
      { search: courseSearch, limit: 20 },
      { enabled: showAddCourse }
    );

  const addCourseMutation = trpc.tutorSubjectVideoCoursesAdmin.addCourse.useMutation();
  const removeCourseMutation = trpc.tutorSubjectVideoCoursesAdmin.removeCourse.useMutation({
    onSuccess: () => {
      toast.success('已移除關聯');
      utils.tutorSubjectVideoCoursesAdmin.getBySubject.invalidate({ subjectId: subject.id });
    },
    onError: (e) => toast.error('移除失敗：' + e.message),
  });

  const handleAddCourses = async () => {
    if (selectedCourseIds.size === 0) return;
    setAddingCourses(true);
    let added = 0;
    for (const videoCourseId of selectedCourseIds) {
      try {
        await addCourseMutation.mutateAsync({ subjectId: subject.id, videoCourseId });
        added++;
      } catch (e: any) {
        toast.error('新增失敗：' + (e?.message ?? ''));
      }
    }
    setAddingCourses(false);
    if (added > 0) toast.success(`已新增 ${added} 筆關聯函授`);
    setShowAddCourse(false);
    setCourseSearch('');
    setSelectedCourseIds(new Set());
    utils.tutorSubjectVideoCoursesAdmin.getBySubject.invalidate({ subjectId: subject.id });
  };

  const { data: searchedExams = [] } =
    trpc.tutorSubjectExamSourcesAdmin.searchSources.useQuery(
      { sourceType: examSourceType, search: examSearch, limit: 20 },
      { enabled: showAddExam }
    );

  const addExamMutation = trpc.tutorSubjectExamSourcesAdmin.addSource.useMutation();

  const handleAddExams = async () => {
    if (selectedExamIds.size === 0) return;
    setAddingExams(true);
    let added = 0;
    for (const sourceId of selectedExamIds) {
      try {
        await addExamMutation.mutateAsync({ subjectId: subject.id, sourceId, sourceType: examSourceType });
        added++;
      } catch (e: any) {
        toast.error('新增失敗：' + (e?.message ?? ''));
      }
    }
    setAddingExams(false);
    if (added > 0) toast.success(`已新增 ${added} 筆關聯考題`);
    setShowAddExam(false);
    setExamSearch('');
    setSelectedExamIds(new Set());
    utils.tutorSubjectExamSourcesAdmin.getBySubject.invalidate({ subjectId: subject.id });
  };

  const removeExamMutation = trpc.tutorSubjectExamSourcesAdmin.removeSource.useMutation({
    onSuccess: () => {
      toast.success('已移除關聯');
      utils.tutorSubjectExamSourcesAdmin.getBySubject.invalidate({ subjectId: subject.id });
    },
    onError: (e) => toast.error('移除失敗：' + e.message),
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* 標題列 */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl">{subject.iconEmoji ?? "📚"}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{subject.name}</h3>
          {subject.description && (
            <p className="text-sm text-muted-foreground truncate">{subject.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subject.isEnabled ? "default" : "secondary"}>
            {subject.isEnabled ? "啟用" : "停用"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateMutation.mutate({ id: subject.id, isEnabled: !subject.isEnabled })
            }
          >
            {subject.isEnabled ? "停用" : "啟用"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* 展開：關聯書本 */}
      {expanded && (
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">關聯書本</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddBook(!showAddBook)}
            >
              <Plus className="w-3 h-3 mr-1" />
              新增書本
            </Button>
          </div>

          {showAddBook && (
            <div className="space-y-2 mb-3">
              <Input
                placeholder="搜尋書本名稱或作者..."
                value={bookSearch}
                onChange={(e) => { setBookSearch(e.target.value); setSelectedBookIds(new Set()); }}
              />
              {allSmartBooks.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">勾選要新增的書本（可多選）</span>
                    {selectedBookIds.size > 0 && (
                      <span className="text-xs text-primary font-medium">已選 {selectedBookIds.size} 本</span>
                    )}
                  </div>
                  <div className="border border-border rounded-lg max-h-56 overflow-y-auto bg-background">
                    {allSmartBooks.map((book) => {
                      const checked = selectedBookIds.has(book.id);
                      return (
                        <label
                          key={book.id}
                          className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                            checked ? "bg-primary/10" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedBookIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(book.id);
                                else next.delete(book.id);
                                return next;
                              });
                            }}
                            className="w-4 h-4 rounded accent-primary flex-shrink-0"
                          />
                          {book.coverImageUrl ? (
                            <img src={book.coverImageUrl} alt={book.title ?? ""} className="w-8 h-10 object-cover rounded flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{book.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{book.author} · {book.examType}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={selectedBookIds.size === 0 || addBooksMutation.isPending}
                  onClick={() => addBooksMutation.mutate({ subjectId: subject.id, smartBookIds: Array.from(selectedBookIds) })}
                >
                  {addBooksMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedBookIds.size > 0 ? `確認新增 (${selectedBookIds.size})` : '確認新增')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddBook(false); setBookSearch(""); setSelectedBookIds(new Set()); }}>取消</Button>
              </div>
            </div>
          )}

          {booksLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              載入中...
            </div>
          ) : linkedBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">尚未關聯任何書本</p>
          ) : (
            <div className="space-y-2">
              {(linkedBooks as BookRow[]).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  {b.bookCoverUrl ? (
                    <img
                      src={b.bookCoverUrl}
                      alt={b.bookTitle ?? ""}
                      className="w-8 h-10 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.bookTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.bookAuthor} · ID: {b.smartBookId}
                    </p>
                  </div>
                  {/* 上移/下移按鈕 */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="上移"
                      disabled={updateSortMutation.isPending || (linkedBooks as BookRow[]).indexOf(b) === 0}
                      onClick={() => b.id && updateSortMutation.mutate({ subjectId: subject.id, bookLinkId: b.id, direction: 'up' })}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="下移"
                      disabled={updateSortMutation.isPending || (linkedBooks as BookRow[]).indexOf(b) === (linkedBooks as BookRow[]).length - 1}
                      onClick={() => b.id && updateSortMutation.mutate({ subjectId: subject.id, bookLinkId: b.id, direction: 'down' })}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-destructive hover:text-destructive"
                    onClick={() => b.id && removeBookMutation.mutate({ id: b.id })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 關聯考題區塊 */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">關聯考題</h4>
              <Button size="sm" variant="outline" onClick={() => setShowAddExam(!showAddExam)}>
                <Plus className="w-3 h-3 mr-1" />新增考題
              </Button>
            </div>

            {showAddExam && (
              <div className="space-y-2 mb-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex gap-2">
                  <Select value={examSourceType} onValueChange={(v) => { setExamSourceType(v as any); setExamSearch(''); setSelectedExamIds(new Set()); }}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam_set"><span className="flex items-center gap-1"><FileText className="w-3 h-3" />老師精選題（智能解題）</span></SelectItem>
                      <SelectItem value="real_exam"><span className="flex items-center gap-1"><Brain className="w-3 h-3" />精選模擬題（智能題庫）</span></SelectItem>
                      <SelectItem value="past_exam"><span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />歷屆考古題</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="搜尋考題名稱..." value={examSearch} onChange={(e) => { setExamSearch(e.target.value); setSelectedExamIds(new Set()); }} className="flex-1 h-8 text-xs" />
                </div>
                {searchedExams.length > 0 && (
                  <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-background">
                    {(searchedExams as any[]).map((src) => (
                      <label key={src.id} className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 ${selectedExamIds.has(src.id) ? 'bg-primary/10' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedExamIds.has(src.id)}
                          onChange={(e) => {
                            setSelectedExamIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(src.id);
                              else next.delete(src.id);
                              return next;
                            });
                          }}
                          className="accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{src.displayName}</p>
                          <p className="text-xs text-muted-foreground">{src.typeLabel}{src.questionCount ? ` · ${src.questionCount} 題` : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {searchedExams.length === 0 && examSearch && (
                  <p className="text-xs text-muted-foreground py-1">未找到相關考題</p>
                )}
                <div className="flex gap-2 items-center">
                  <Button size="sm" disabled={selectedExamIds.size === 0 || addingExams} onClick={handleAddExams}>
                    {addingExams ? <Loader2 className="w-4 h-4 animate-spin" /> : `確認新增${selectedExamIds.size > 0 ? ` (${selectedExamIds.size})` : ''}`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddExam(false); setExamSearch(''); setSelectedExamIds(new Set()); }}>取消</Button>
                </div>
              </div>
            )}

            {examsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" />載入中...</div>
            ) : (linkedExams as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">尚未關聯任何考題</p>
            ) : (
              <div className="space-y-2">
                {(linkedExams as any[]).map((exam) => (
                  <div key={exam.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                      {exam.sourceType === 'real_exam' ? <FileText className="w-4 h-4 text-amber-600" /> :
                       exam.sourceType === 'ai_exam' ? <Brain className="w-4 h-4 text-purple-600" /> :
                       <History className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exam.displayName}</p>
                      <p className="text-xs text-muted-foreground">{exam.typeLabel}{exam.questionCount ? ` · ${exam.questionCount} 題` : ''}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeExamMutation.mutate({ id: exam.id })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 關聯函授區塊 */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">關聯函授</h4>
              <Button size="sm" variant="outline" onClick={() => setShowAddCourse(!showAddCourse)}>
                <Plus className="w-3 h-3 mr-1" />新增函授
              </Button>
            </div>

            {showAddCourse && (
              <div className="space-y-2 mb-3 p-3 bg-muted/30 rounded-lg">
                <Input
                  placeholder="搜尋課程名稱..."
                  value={courseSearch}
                  onChange={(e) => { setCourseSearch(e.target.value); setSelectedCourseIds(new Set()); }}
                  className="h-8 text-xs"
                />
                {(searchedCourses as any[]).length > 0 && (
                  <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-background">
                    {(searchedCourses as any[]).map((course) => (
                      <label key={course.id} className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 ${selectedCourseIds.has(course.id) ? 'bg-primary/10' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.has(course.id)}
                          onChange={(e) => {
                            setSelectedCourseIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(course.id);
                              else next.delete(course.id);
                              return next;
                            });
                          }}
                          className="accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.is_published ? '已發布' : '草稿'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {(searchedCourses as any[]).length === 0 && courseSearch && (
                  <p className="text-xs text-muted-foreground py-1">未找到相關課程</p>
                )}
                <div className="flex gap-2 items-center">
                  <Button size="sm" disabled={selectedCourseIds.size === 0 || addingCourses} onClick={handleAddCourses}>
                    {addingCourses ? <Loader2 className="w-4 h-4 animate-spin" /> : `確認新增${selectedCourseIds.size > 0 ? ` (${selectedCourseIds.size})` : ''}`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddCourse(false); setCourseSearch(''); setSelectedCourseIds(new Set()); }}>取消</Button>
                </div>
              </div>
            )}

            {coursesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" />載入中...</div>
            ) : (linkedCourses as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">尚未關聯任何函授課程</p>
            ) : (
              <div className="space-y-2">
                {(linkedCourses as any[]).map((course) => (
                  <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.is_published ? '已發布' : '草稿'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeCourseMutation.mutate({ id: course.id })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTutorSubjects() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📚");
  const [newDesc, setNewDesc] = useState("");
  const utils = trpc.useUtils();

  const { data: subjects = [], isLoading } = trpc.tutorSubjectsAdmin.getAll.useQuery();

  const createMutation = trpc.tutorSubjectsAdmin.create.useMutation({
    onSuccess: () => {
      toast.success("類科已建立");
      setShowCreateDialog(false);
      setNewName("");
      setNewEmoji("📚");
      setNewDesc("");
      utils.tutorSubjectsAdmin.getAll.invalidate();
    },
    onError: (e) => toast.error("建立失敗：" + e.message),
  });

  const deleteMutation = trpc.tutorSubjectsAdmin.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除");
      utils.tutorSubjectsAdmin.getAll.invalidate();
    },
    onError: (e) => toast.error("刪除失敗：" + e.message),
  });

  const autoGenerateMutation = trpc.tutorSubjectsAdmin.autoGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`已自動產生 ${data.created} 個類科（共 ${data.total} 個不重複類科）`);
      utils.tutorSubjectsAdmin.getAll.invalidate();
    },
    onError: (e) => toast.error("自動產生失敗：" + e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI 助教類科管理</h1>
          <p className="text-muted-foreground text-sm mt-1">
            管理類科分類，並關聯對應的智能書本
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending}
          >
            {autoGenerateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            自動從書本產生
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增類科
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">尚未建立任何類科</p>
          <p className="text-muted-foreground text-sm mt-1">
            點「自動從書本產生」可從現有書本的類科自動建立
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      {/* 新增類科 Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增類科</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <div className="w-24">
                <label className="text-sm font-medium text-foreground mb-1 block">圖示</label>
                <Input
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="text-center text-2xl"
                  maxLength={2}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-1 block">類科名稱 *</label>
                <Input
                  placeholder="如：資通安全管理、行政法..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">說明（選填）</label>
              <Input
                placeholder="類科說明..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: newName.trim(),
                  iconEmoji: newEmoji,
                  description: newDesc || undefined,
                })
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
