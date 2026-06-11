import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Lock, CheckCircle, KeyRound, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// 班內生驗證頁面（支援課程群組 courseId 和智能解題 materialId 兩種模式）
// 使用「學員編號 + 班級密碼」驗證，成功後存入資料庫，3 天有效
// 進入時自動檢查資料庫驗證狀態，已驗證則直接跳過
export default function ClassStudentVerify() {
  const [, navigate] = useLocation();
  const [studentId, setStudentId] = useState(""); // 學員編號
  const [classCode, setClassCode] = useState(""); // 班級密碼
  const [verified, setVerified] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true); // 自動檢查中

  // 從 URL 取得參數
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("courseId");
  const teacherId = params.get("teacherId");
  const materialId = params.get("materialId");
  const returnUrl = params.get("returnUrl") || "/student/learning-materials";

  // 判斷驗證模式
  const isMaterialMode = !!materialId && !courseId;

  // 自動查詢課程驗證狀態
  const courseVerificationQuery = trpc.lectureCourses.checkVerification.useQuery(
    { courseId: courseId ? parseInt(courseId) : 0 },
    { enabled: !!courseId && !isMaterialMode }
  );

  // 自動查詢智能解題驗證狀態
  const materialVerificationQuery = trpc.learningMaterials.checkVerification.useQuery(
    { materialId: materialId ? parseInt(materialId) : 0 },
    { enabled: !!materialId && isMaterialMode }
  );

  // 自動跳轉邏輯：如果已驗證（3天內有效），直接進入
  useEffect(() => {
    const isLoading = courseVerificationQuery.isLoading || materialVerificationQuery.isLoading;
    if (isLoading) return;

    setAutoChecking(false);

    const isVerified = isMaterialMode
      ? materialVerificationQuery.data?.verified
      : courseVerificationQuery.data?.verified;

    if (isVerified) {
      // 已驗證，直接跳轉
      if (teacherId && courseId) {
        navigate(`/teacher-learning-zone/${teacherId}?courseId=${courseId}`);
      } else if (materialId) {
        navigate(`/student/learning-materials/${materialId}`);
      } else {
        navigate(returnUrl);
      }
    }
  }, [
    courseVerificationQuery.isLoading,
    materialVerificationQuery.isLoading,
    courseVerificationQuery.data,
    materialVerificationQuery.data,
  ]);

  // 驗證課程群組（lectureCourses 用）
  const verifyCourseCodeMutation = trpc.lectureCourses.verifyClassCode.useMutation({
    onSuccess: () => {
      handleVerifySuccess();
    },
    onError: (err) => {
      toast.error(err.message || "驗證失敗，請確認學員編號和密碼是否正確");
    },
  });

  // 驗證智能解題（learningMaterials 用）
  const verifyMaterialCodeMutation = trpc.learningMaterials.verifyClassCode.useMutation({
    onSuccess: () => {
      handleVerifySuccess();
    },
    onError: (err) => {
      toast.error(err.message || "驗證失敗，請確認學員編號和密碼是否正確");
    },
  });

  const handleVerifySuccess = () => {
    setVerified(true);
    toast.success("驗證成功！正在進入...");
    setTimeout(() => {
      if (teacherId && courseId) {
        navigate(`/teacher-learning-zone/${teacherId}?courseId=${courseId}`);
      } else if (materialId) {
        navigate(`/student/learning-materials/${materialId}`);
      } else {
        navigate(returnUrl);
      }
    }, 1200);
  };

  const handleVerify = () => {
    if (!studentId.trim()) {
      toast.error("請輸入學員編號");
      return;
    }
    if (!classCode.trim()) {
      toast.error("請輸入班級密碼");
      return;
    }
    if (isMaterialMode) {
      // 智能解題模式
      verifyMaterialCodeMutation.mutate({
        materialId: parseInt(materialId!),
        studentId: studentId.trim(),
        classCode: classCode.trim(),
      });
    } else if (courseId) {
      // 課程群組模式
      verifyCourseCodeMutation.mutate({
        courseId: parseInt(courseId),
        studentId: studentId.trim(),
        classCode: classCode.trim(),
      });
    } else {
      toast.error("無效的驗證請求");
    }
  };

  const handleBack = () => {
    if (teacherId) {
      navigate("/teacher-material-learning");
    } else {
      navigate("/student/learning-materials");
    }
  };

  const isPending = verifyCourseCodeMutation.isPending || verifyMaterialCodeMutation.isPending;

  // 自動檢查中：顯示 loading
  if (autoChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
            <p className="text-muted-foreground">正在確認驗證狀態...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold text-green-700">驗證成功！</h2>
            <p className="text-muted-foreground text-center">正在進入，請稍候...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="bg-orange-100 rounded-full p-4">
              <GraduationCap className="h-10 w-10 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">班內生驗證</CardTitle>
          <CardDescription className="text-base mt-1">
            此{isMaterialMode ? "資料" : "課程"}僅限班內學員存取，請輸入學員編號和班級密碼進行驗證
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* 學員編號 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <User className="w-4 h-4" />
              學員編號
            </label>
            <Input
              placeholder="請輸入您的學員編號"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              autoFocus
            />
          </div>
          {/* 班級密碼 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <KeyRound className="w-4 h-4" />
              班級密碼
            </label>
            <Input
              type="password"
              placeholder="請輸入老師提供的班級密碼"
              value={classCode}
              onChange={e => setClassCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
            />
          </div>
          {/* 說明 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              學員編號和班級密碼由老師或管理員提供。驗證成功後有效期為 <strong>3 天</strong>，期間換電腦或換瀏覽器無需重新驗證。
            </p>
          </div>
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleVerify}
            disabled={isPending}
          >
            {isPending ? "驗證中..." : "驗證並進入"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleBack}
          >
            返回
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
