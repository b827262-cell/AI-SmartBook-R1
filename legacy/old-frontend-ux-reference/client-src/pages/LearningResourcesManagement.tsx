import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Video, Plus, Pencil, Trash2, Upload } from "lucide-react";

export default function LearningResourcesManagement() {
  const [activeTab, setActiveTab] = useState("teachers");
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  // 查詢資料
  const { data: teachersData, refetch: refetchTeachers } = trpc.learningResources.teachers.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: booksData, refetch: refetchBooks } = trpc.learningResources.books.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: coursesData, refetch: refetchCourses } = trpc.learningResources.courses.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Mutations
  const createTeacher = trpc.learningResources.teachers.create.useMutation({
    onSuccess: () => {
      toast.success("師資新增成功");
      setTeacherDialogOpen(false);
      refetchTeachers();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  const updateTeacher = trpc.learningResources.teachers.update.useMutation({
    onSuccess: () => {
      toast.success("師資更新成功");
      setTeacherDialogOpen(false);
      setEditingTeacher(null);
      refetchTeachers();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteTeacher = trpc.learningResources.teachers.delete.useMutation({
    onSuccess: () => {
      toast.success("師資刪除成功");
      refetchTeachers();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const createBook = trpc.learningResources.books.create.useMutation({
    onSuccess: () => {
      toast.success("書籍新增成功");
      setBookDialogOpen(false);
      refetchBooks();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  const updateBook = trpc.learningResources.books.update.useMutation({
    onSuccess: () => {
      toast.success("書籍更新成功");
      setBookDialogOpen(false);
      setEditingBook(null);
      refetchBooks();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteBook = trpc.learningResources.books.delete.useMutation({
    onSuccess: () => {
      toast.success("書籍刪除成功");
      refetchBooks();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const createCourse = trpc.learningResources.courses.create.useMutation({
    onSuccess: () => {
      toast.success("課程新增成功");
      setCourseDialogOpen(false);
      refetchCourses();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  const updateCourse = trpc.learningResources.courses.update.useMutation({
    onSuccess: () => {
      toast.success("課程更新成功");
      setCourseDialogOpen(false);
      setEditingCourse(null);
      refetchCourses();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteCourse = trpc.learningResources.courses.delete.useMutation({
    onSuccess: () => {
      toast.success("課程刪除成功");
      refetchCourses();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 處理表單提交
  const handleTeacherSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      aliases: formData.get("aliases") as string,
      education: formData.get("education") as string,
      experience: formData.get("experience") as string,
      specialties: formData.get("specialties") as string,
      categories: formData.get("categories") as string,
      introduction: formData.get("introduction") as string,
      photoUrl: formData.get("photoUrl") as string,
      sourceUrl: formData.get("sourceUrl") as string,
    };

    if (editingTeacher) {
      updateTeacher.mutate({ id: editingTeacher.id, ...data });
    } else {
      createTeacher.mutate(data);
    }
  };

  const handleBookSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      author: formData.get("author") as string,
      category: formData.get("category") as string,
      examType: formData.get("examType") as string,
      description: formData.get("description") as string,
      coverImage: formData.get("coverImage") as string,
      productUrl: formData.get("productUrl") as string,
      sourceWebsite: formData.get("sourceWebsite") as string,
    };

    if (editingBook) {
      updateBook.mutate({ id: editingBook.id, ...data });
    } else {
      createBook.mutate(data);
    }
  };

  const handleCourseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      instructor: formData.get("instructor") as string,
      courseType: formData.get("courseType") as "video" | "audio" | "live" | "recording",
      category: formData.get("category") as string,
      examType: formData.get("examType") as string,
      targetAudience: formData.get("targetAudience") as string,
      syllabus: formData.get("syllabus") as string,
      duration: formData.get("duration") as string,
      previewUrl: formData.get("previewUrl") as string,
      productUrl: formData.get("productUrl") as string,
      sourceWebsite: formData.get("sourceWebsite") as string,
    };

    if (editingCourse) {
      updateCourse.mutate({ id: editingCourse.id, ...data });
    } else {
      createCourse.mutate(data);
    }
  };

  return (
    <>
      
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">學習資源管理</h1>
            <p className="text-muted-foreground mt-2">
              管理師資、書籍、課程等學習資源
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teachers">
              <GraduationCap className="w-4 h-4 mr-2" />
              師資管理
            </TabsTrigger>
            <TabsTrigger value="books">
              <BookOpen className="w-4 h-4 mr-2" />
              書籍管理
            </TabsTrigger>
            <TabsTrigger value="courses">
              <Video className="w-4 h-4 mr-2" />
              課程管理
            </TabsTrigger>
          </TabsList>

          {/* 師資管理 */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>師資列表</CardTitle>
                    <CardDescription>
                      共 {teachersData?.total || 0} 位師資
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingTeacher(null);
                      setTeacherDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增師資
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>專長</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>書籍數</TableHead>
                      <TableHead>課程數</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachersData?.items.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.specialties || "-"}</TableCell>
                        <TableCell>{teacher.categories || "-"}</TableCell>
                        <TableCell>{teacher.booksCount}</TableCell>
                        <TableCell>{teacher.coursesCount}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTeacher(teacher);
                                setTeacherDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("確定要刪除此師資嗎？")) {
                                  deleteTeacher.mutate({ id: teacher.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 書籍管理 */}
          <TabsContent value="books">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>書籍列表</CardTitle>
                    <CardDescription>
                      共 {booksData?.total || 0} 本書籍
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingBook(null);
                      setBookDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增書籍
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>書名</TableHead>
                      <TableHead>作者</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>適用考試</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booksData?.items.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author || "-"}</TableCell>
                        <TableCell>{book.category || "-"}</TableCell>
                        <TableCell>{book.examType || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingBook(book);
                                setBookDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("確定要刪除此書籍嗎？")) {
                                  deleteBook.mutate({ id: book.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 課程管理 */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>課程列表</CardTitle>
                    <CardDescription>
                      共 {coursesData?.total || 0} 門課程
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增課程
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>課程名稱</TableHead>
                      <TableHead>講師</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>適用考試</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesData?.items.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{course.instructor || "-"}</TableCell>
                        <TableCell>{course.courseType || "-"}</TableCell>
                        <TableCell>{course.category || "-"}</TableCell>
                        <TableCell>{course.examType || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCourse(course);
                                setCourseDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("確定要刪除此課程嗎？")) {
                                  deleteCourse.mutate({ id: course.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 師資對話框 */}
        <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTeacher ? "編輯師資" : "新增師資"}</DialogTitle>
              <DialogDescription>
                填寫師資的基本資訊
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTeacherSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingTeacher?.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aliases">別名</Label>
                  <Input
                    id="aliases"
                    name="aliases"
                    defaultValue={editingTeacher?.aliases}
                    placeholder="多個別名用逗號分隔"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="education">學歷</Label>
                  <Textarea
                    id="education"
                    name="education"
                    defaultValue={editingTeacher?.education}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="experience">經歷</Label>
                  <Textarea
                    id="experience"
                    name="experience"
                    defaultValue={editingTeacher?.experience}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="specialties">專長領域</Label>
                  <Input
                    id="specialties"
                    name="specialties"
                    defaultValue={editingTeacher?.specialties}
                    placeholder="多個專長用逗號分隔"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="categories">分類</Label>
                  <Input
                    id="categories"
                    name="categories"
                    defaultValue={editingTeacher?.categories}
                    placeholder="例如：律師司法官、會計師"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="introduction">師資介紹</Label>
                  <Textarea
                    id="introduction"
                    name="introduction"
                    defaultValue={editingTeacher?.introduction}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="photoUrl">照片 URL</Label>
                  <Input
                    id="photoUrl"
                    name="photoUrl"
                    defaultValue={editingTeacher?.photoUrl}
                    type="url"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sourceUrl">來源網址</Label>
                  <Input
                    id="sourceUrl"
                    name="sourceUrl"
                    defaultValue={editingTeacher?.sourceUrl}
                    type="url"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingTeacher ? "更新" : "新增"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 書籍對話框 */}
        <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBook ? "編輯書籍" : "新增書籍"}</DialogTitle>
              <DialogDescription>
                填寫書籍的基本資訊
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBookSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">書名 *</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={editingBook?.title}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="author">作者</Label>
                  <Input
                    id="author"
                    name="author"
                    defaultValue={editingBook?.author}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">分類</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editingBook?.category}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="examType">適用考試</Label>
                  <Input
                    id="examType"
                    name="examType"
                    defaultValue={editingBook?.examType}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">簡介</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingBook?.description}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="coverImage">封面圖片 URL</Label>
                  <Input
                    id="coverImage"
                    name="coverImage"
                    defaultValue={editingBook?.coverImage}
                    type="url"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productUrl">商品連結</Label>
                  <Input
                    id="productUrl"
                    name="productUrl"
                    defaultValue={editingBook?.productUrl}
                    type="url"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sourceWebsite">來源網站</Label>
                  <Input
                    id="sourceWebsite"
                    name="sourceWebsite"
                    defaultValue={editingBook?.sourceWebsite}
                    placeholder="例如：高點網路書店"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingBook ? "更新" : "新增"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 課程對話框 */}
        <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "編輯課程" : "新增課程"}</DialogTitle>
              <DialogDescription>
                填寫課程的基本資訊
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCourseSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">課程名稱 *</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={editingCourse?.title}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="instructor">講師</Label>
                  <Input
                    id="instructor"
                    name="instructor"
                    defaultValue={editingCourse?.instructor}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="courseType">課程類型</Label>
                  <select
                    id="courseType"
                    name="courseType"
                    defaultValue={editingCourse?.courseType || "video"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="video">影音課程</option>
                    <option value="audio">音訊課程</option>
                    <option value="live">直播課程</option>
                    <option value="recording">錄播課程</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">分類</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editingCourse?.category}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="examType">適用考試</Label>
                  <Input
                    id="examType"
                    name="examType"
                    defaultValue={editingCourse?.examType}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="targetAudience">目標學員</Label>
                  <Input
                    id="targetAudience"
                    name="targetAudience"
                    defaultValue={editingCourse?.targetAudience}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="syllabus">課程大綱</Label>
                  <Textarea
                    id="syllabus"
                    name="syllabus"
                    defaultValue={editingCourse?.syllabus}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">課程時數</Label>
                  <Input
                    id="duration"
                    name="duration"
                    defaultValue={editingCourse?.duration}
                    placeholder="例如：30 小時"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="previewUrl">試聽連結</Label>
                  <Input
                    id="previewUrl"
                    name="previewUrl"
                    defaultValue={editingCourse?.previewUrl}
                    type="url"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productUrl">商品連結</Label>
                  <Input
                    id="productUrl"
                    name="productUrl"
                    defaultValue={editingCourse?.productUrl}
                    type="url"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sourceWebsite">來源網站</Label>
                  <Input
                    id="sourceWebsite"
                    name="sourceWebsite"
                    defaultValue={editingCourse?.sourceWebsite}
                    placeholder="例如：知識達購課館"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingCourse ? "更新" : "新增"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
