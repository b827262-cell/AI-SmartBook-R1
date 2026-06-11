import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, ArrowRight, Loader2, Search, Clock, ChevronRight, Lock, BookMarked, Coins, Gift, Star, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function TeacherMaterialLearning() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [unlockDialog, setUnlockDialog] = useState<{ courseId: number; teacherId: number; courseName: string; pointCost: number } | null>(null);
  const [outlineDialog, setOutlineDialog] = useState<{ courseId: number } | null>(null);
  const [activeSection, setActiveSection] = useState<'all' | 'free' | 'paid' | 'class'>('all');
  const utils = trpc.useUtils();

  // 取得學生已購課的課程清單
  const { data: myEnrollments, isLoading: enrollLoading, refetch: refetchEnrollments } = trpc.lectureCourses.getMyEnrollments.useQuery();
  // 取得近期學習記錄
  const { data: recentTeachers } = trpc.materialConversations.getRecentTeachers.useQuery({ limit: 3 });
  // 取得課程大綱（預覽用）
  const { data: courseOutline, isLoading: outlineLoading } = trpc.lectureCourses.getCourseOutline.useQuery(
    { courseId: outlineDialog?.courseId ?? 0 },
    { enabled: !!outlineDialog }
  );
  // 取得所有老師（用於顯示老師名稱）
  const { data: teachers } = trpc.lectureTeachers.list.useQuery();

  const unlockMutation = trpc.lectureCourses.unlockCourse.useMutation({
    onSuccess: (data, variables) => {
      utils.lectureCourses.getMyEnrollments.invalidate();
      utils.auth.me.invalidate(); // 更新點數顯示
      if (unlockDialog) {
        setUnlockDialog(null);
        setLocation(`/teacher-learning-zone/${unlockDialog.teacherId}?courseId=${unlockDialog.courseId}`);
      }
    },
    onError: (e) => {
      alert(e.message);
    },
  });

  // 全域班內生驗證狀態
  const { data: globalVerifyData } = trpc.featureToggles.checkGlobalClassVerification.useQuery(undefined, {
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const isGloballyVerified = globalVerifyData?.verified === true || user?.role === 'admin';

  // 分區計算
  const allCourses = myEnrollments ?? [];
  const classCourses = allCourses.filter(c => c.accessMode === 'class_only');
  const nonClassCourses = allCourses.filter(c => c.accessMode !== 'class_only');
  const freeCourses = nonClassCourses.filter(c => (c.pointCost ?? 0) === 0);
  const paidCourses = nonClassCourses.filter(c => (c.pointCost ?? 0) > 0);

  // 篩選課程
  const filteredCourses = useMemo(() => {
    let base = allCourses;
    if (activeSection === 'free') base = freeCourses;
    else if (activeSection === 'paid') base = paidCourses;
    else if (activeSection === 'class') base = classCourses;
    if (!searchKeyword.trim()) return base;
    const keyword = searchKeyword.toLowerCase();
    return base.filter(c =>
      c.courseName.toLowerCase().includes(keyword) ||
      c.teacherName?.toLowerCase().includes(keyword) ||
      c.subjectName?.toLowerCase().includes(keyword)
    );
  }, [myEnrollments, searchKeyword, activeSection]);

  const handleEnterCourse = (course: any) => {
    const { courseId, lectureTeacherId: teacherId, courseName, pointCost, isUnlocked, accessMode } = course;
    // 限班內生課程：若已全域驗證則直接進入，否則跳轉到驗證頁面
    if (accessMode === 'class_only') {
      if (isGloballyVerified) {
        setLocation(`/teacher-learning-zone/${teacherId}?courseId=${courseId}`);
        return;
      }
      setLocation(`/class-student-verify?courseId=${courseId}&teacherId=${teacherId}`);
      return;
    }
    // 已解鎖課程：直接進入
    if (isUnlocked) {
      setLocation(`/teacher-learning-zone/${teacherId}?courseId=${courseId}`);
      return;
    }
    if (!pointCost || pointCost === 0) {
      // 免費課程但未解鎖（有試閱章節）：直接以試閱模式進入，不解鎖
      setLocation(`/teacher-learning-zone/${teacherId}?courseId=${courseId}`);
      return;
    }
    // 需要扣點：顯示確認 Dialog
    setUnlockDialog({ courseId, teacherId, courseName, pointCost });
  };

  const handleEnterTeacher = (teacherId: number) => {
    setLocation(`/teacher-learning-zone/${teacherId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          教材學習專區
        </h1>
        <p className="text-muted-foreground">
          選擇課程，開始教材 QA 學習之旅
        </p>
      </div>

      {/* 近期學習區塊 - 暫時隱藏 */}
      {false && recentTeachers && recentTeachers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">近期學習</h2>
            <span className="text-sm text-muted-foreground">點擊可直接進入</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentTeachers.map((item) => (
              <button
                key={item.teacherId}
                onClick={() => handleEnterTeacher(item.teacherId)}
                className="flex items-center gap-3 p-4 bg-white border-2 border-orange-100 hover:border-orange-400 hover:bg-orange-50 rounded-xl transition-all text-left group shadow-sm"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{item.teacherName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.lastUsedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分區卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'free' as const, label: '免費', desc: '免費課程，無需點數', icon: <Gift className="w-7 h-7 text-green-500" />, count: freeCourses.length, active: 'border-green-500 bg-green-50', hover: 'hover:border-green-300', countColor: 'text-green-600' },
          { key: 'paid' as const, label: '付費', desc: '精選課程，需要點數', icon: <Star className="w-7 h-7 text-amber-500" />, count: paidCourses.length, active: 'border-amber-500 bg-amber-50', hover: 'hover:border-amber-300', countColor: 'text-amber-600' },
          { key: 'class' as const, label: '班內生專用', desc: '僅限班內學員', icon: <Users className="w-7 h-7 text-blue-500" />, count: classCourses.length, active: 'border-blue-500 bg-blue-50', hover: 'hover:border-blue-300', countColor: 'text-blue-600' },
        ].map(sec => (
          <div
            key={sec.key}
            className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${activeSection === sec.key ? sec.active : `border-border ${sec.hover}`}`}
            onClick={() => setActiveSection(activeSection === sec.key ? 'all' : sec.key)}
          >
            <div className="flex items-center gap-2 mb-1">
              {sec.icon}
              <span className="font-semibold text-sm">{sec.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{sec.desc}</p>
            <p className={`text-sm font-bold ${sec.countColor}`}>{sec.count} 門課程</p>
          </div>
        ))}
      </div>
      {/* 已購課課程清單 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-blue-600" />
            教材 QA 學習
          </CardTitle>
          <CardDescription>
            以下是已開放的課程，點擊可預覽大綱並進入教材 QA 學習
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜尋框 */}
          {(myEnrollments?.length ?? 0) > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜尋課程名稱、老師或類科..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {enrollLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-muted-foreground">載入課程中...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">
                {myEnrollments?.length === 0 ? '目前尚無開放課程，請稍後再來' : '找不到符合的課程'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {myEnrollments?.length === 0
                  ? '管理員開放課程後即可在此查看'
                  : '請嘗試其他搜尋關鍵字'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCourses.map((course) => (
                <button
                  key={course.courseId}
                  onClick={() => setOutlineDialog({ courseId: course.courseId, course })}
                  disabled={unlockMutation.isPending}
                  className="flex flex-col gap-2 p-5 bg-white border-2 border-blue-100 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-left group shadow-sm disabled:opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-base">{course.courseName}</p>
                      {course.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {course.teacherName && (
                      <Badge variant="secondary" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {course.teacherName}
                      </Badge>
                    )}
                    {course.subjectName && (
                      <Badge variant="outline" className="text-xs">
                        {course.subjectName}
                      </Badge>
                    )}
                    {/* 存取模式標籤 */}
                    {course.accessMode === 'class_only' ? (
                      <Badge variant="outline" className="text-xs text-blue-700 border-blue-400 bg-blue-50">
                        🏫 班內生專用
                      </Badge>
                    ) : (course.pointCost ?? 0) > 0 ? (
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-400 bg-amber-50">
                        ⭐ 付費 {course.pointCost} 點
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-400 bg-green-50">
                        🎁 免費
                      </Badge>
                    )}
                    {/* 班內生已驗證標籤 */}
                    {course.accessMode === 'class_only' && isGloballyVerified && (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-400 bg-green-50">
                        ✅ 已驗證
                      </Badge>
                    )}
                    {/* 解鎖狀態標籤 */}
                    {course.accessMode !== 'class_only' && course.isUnlocked ? (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-400 bg-green-50">
                        ✅ 已解鎖
                      </Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提示：管理員可直接選老師 */}
      {user?.role === 'admin' && teachers && teachers.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800">管理員快速入口</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {teachers.map((t: any) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => handleEnterTeacher(t.id)}
                >
                  {t.name}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* 課程大綱預覽 Dialog */}
      <Dialog open={!!outlineDialog} onOpenChange={(open) => { if (!open) setOutlineDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-blue-600" />
              {courseOutline?.courseName || '課程大綱'}
            </DialogTitle>
            <DialogDescription>
              共 {courseOutline?.totalCount ?? 0} 個章節
            </DialogDescription>
          </DialogHeader>
          {outlineLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : courseOutline?.materials && courseOutline.materials.length > 0 ? (
            <div className="space-y-1 py-2">
              {courseOutline.materials.map((m: any, idx: number) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-xs font-mono text-gray-400 w-6 text-right flex-shrink-0">{idx + 1}</span>
                  <span className="text-sm text-gray-800">{m.title}</span>

                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">尚未設定課程內容</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOutlineDialog(null)}>關閉</Button>
            {outlineDialog && (() => {
              const course = filteredCourses.find(c => c.courseId === outlineDialog.courseId);
              if (!course) return null;
              return (
                <Button
                  onClick={() => { setOutlineDialog(null); handleEnterCourse(course); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {course.accessMode === 'class_only'
                    ? (isGloballyVerified ? '進入課程 →' : '🏫 驗證學員身份進入')
                    : course.isUnlocked ? '進入課程 →' : `解鎖課程（${course.pointCost} 點）`
                  }
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 解鎖課程確認 Dialog */}
      <Dialog open={!!unlockDialog} onOpenChange={(open) => { if (!open) setUnlockDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔒 解鎖課程</DialogTitle>
            <DialogDescription>
              「{unlockDialog?.courseName}」需要 <strong>{unlockDialog?.pointCost} 點</strong>才能進入。<br />
              解鎖後可無限次使用，包含所有 AI 功能，不再額外扣點。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialog(null)}>取消</Button>
            <Button
              disabled={unlockMutation.isPending}
              onClick={() => { if (unlockDialog) unlockMutation.mutate({ courseId: unlockDialog.courseId }); }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {unlockMutation.isPending ? '解鎖中...' : `確認解鎖（扣 ${unlockDialog?.pointCost} 點）`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
