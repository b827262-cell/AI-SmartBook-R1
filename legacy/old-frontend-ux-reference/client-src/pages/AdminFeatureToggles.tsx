import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, BookOpen, FileEdit, Library, Scale, MessageCircle, GraduationCap, Settings2, Eye, EyeOff, Users, Lock, ShieldOff, ShieldCheck, Globe, EyeOff as EyeOffIcon, CheckSquare, Square, FileDown, Calculator, Video, KeyRound } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FEATURE_LABELS: Record<string, { label: string; description: string; icon: React.ElementType; color: string }> = {
  student_portal: {
    label: "智能專區（整體）",
    description: "控制導覽列「智能專區」按鈕的顯示，關閉後學生看不到智能專區入口",
    icon: BarChart3,
    color: "text-blue-600",
  },
  practice_system: {
    label: "① 練題系統",
    description: "選擇科目和題目數量，開始練習考試，每個題目都會記錄你的學習對話",
    icon: BookOpen,
    color: "text-indigo-600",
  },
  learning_materials: {
    label: "② 智能解題",
    description: "瀏覽講義、考題、課程 PDF，與 AI 學習助教互動學習",
    icon: Library,
    color: "text-green-600",
  },
  essay_grading: {
    label: "③ 申論批改",
    description: "隨機抽取申論題進行練習，AI 會根據標準答案進行多維度評分",
    icon: FileEdit,
    color: "text-orange-600",
  },
  smart_classroom: {
    label: "④ 智能課堂",
    description: "全方位學習平台，支援多種學科知識庫，AI 引導式教學",
    icon: GraduationCap,
    color: "text-purple-600",
  },
  law_book: {
    label: "⑤ 六法全書",
    description: "快速查詢法條內容，收藏重要法條、記錄學習筆記",
    icon: Scale,
    color: "text-red-600",
  },
  material_qa: {
    label: "⑥ 教材Q&A",
    description: "選擇老師和教材，透過對話式學習，AI 會根據該老師的講義回答問題",
    icon: MessageCircle,
    color: "text-teal-600",
  },
  auditory_hall: {
    label: "⑧ 知識達試聽館",
    description: "知識達試聽館入口開關，關閉後學生看不到試聽館入口",
    icon: GraduationCap,
    color: "text-pink-600",
  },
  ai_question_bank: {
    label: "⑩ 智能題庫練習",
    description: "AI 自動出題的選擇題練習入口，關閉後學生看不到此功能",
    icon: GraduationCap,
    color: "text-violet-600",
  },
  smart_books: {    label: "②② 智能書本",
    description: "AI 引導式書本學習，支援購書驗證、章節導讀、學習進度追蹤，關閉後學生看不到此功能",
    icon: BookOpen,
    color: "text-blue-500",
  },
  accounting: {
    label: "②③ 會計實務助手",
    description: "稅務法規即時問答、AI 出題批改分錄練習，關閉後學生看不到會計實務助手入口",
    icon: Calculator,
    color: "text-emerald-500",
  },
  video_course: {
    label: "②④ 智能函授",
    description: "影音課程學習，AI 即時解答，支援 SRT 字幕同步與知識點跳轉，關閉後學生看不到此功能",
    icon: Video,
    color: "text-purple-500",
  },
};

export default function AdminFeatureToggles() {
  const { data, isLoading, refetch } = trpc.featureToggles.getAllAdmin.useQuery();
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  // 全站學生存取開關
  const { data: studentAccessData, isLoading: studentAccessLoading, refetch: refetchStudentAccess } = trpc.featureToggles.getStudentAccess.useQuery();
  const [studentAccessPending, setStudentAccessPending] = useState(false);
  const setStudentAccessMutation = trpc.featureToggles.setStudentAccess.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.enabled ? "✅ 已開放學生存取系統" : "🔒 已關閉學生存取系統");
      refetchStudentAccess();
      setStudentAccessPending(false);
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
      setStudentAccessPending(false);
    },
  });
  const studentAccessEnabled = studentAccessPending
    ? setStudentAccessMutation.variables?.enabled ?? (studentAccessData?.enabled ?? true)
    : (studentAccessData?.enabled ?? true);
  const handleStudentAccessToggle = (enabled: boolean) => {
    setStudentAccessPending(true);
    setStudentAccessMutation.mutate({ enabled });
  };

  const updateMutation = trpc.featureToggles.update.useMutation({
    onSuccess: (_, variables) => {
      const scopeLabel = variables.scope === "internal" ? "（內部）" : "（外部）";
      toast.success(`已${variables.enabled ? "開啟" : "關閉"} ${FEATURE_LABELS[variables.key]?.label} ${scopeLabel}`);
      refetch();
      const pendingKey = `${variables.scope}_${variables.key}`;
      setPendingToggles(prev => {
        const next = { ...prev };
        delete next[pendingKey];
        return next;
      });
    },
    onError: (error, variables) => {
      toast.error(`更新失敗：${error.message}`);
      const pendingKey = `${variables.scope}_${variables.key}`;
      setPendingToggles(prev => {
        const next = { ...prev };
        delete next[pendingKey];
        return next;
      });
      refetch();
    },
  });

  const handleToggle = (key: string, enabled: boolean, scope: "external" | "internal") => {
    const pendingKey = `${scope}_${key}`;
    setPendingToggles(prev => ({ ...prev, [pendingKey]: enabled }));
    updateMutation.mutate({ key: key as any, enabled, scope });
  };

  const getExternalValue = (key: string): boolean => {
    const pendingKey = `external_${key}`;
    if (pendingKey in pendingToggles) return pendingToggles[pendingKey];
    return data?.external?.[key] ?? true;
  };

  const getInternalValue = (key: string): boolean => {
    const pendingKey = `internal_${key}`;
    if (pendingKey in pendingToggles) return pendingToggles[pendingKey];
    return data?.internal?.[key] ?? true;
  };

  // 智能課堂：勾選隱藏科目（必須在所有 early return 之前宣告）
  const { data: allSubjectsData, isLoading: subjectsLoading } = trpc.featureToggles.listAllSubjects.useQuery();
  const { data: hiddenSubjectsData, isLoading: hiddenSubjectsLoading, refetch: refetchHiddenSubjects } = trpc.featureToggles.getHiddenSubjects.useQuery();
  const [hiddenSubjects, setHiddenSubjects] = useState<string[]>([]);
  const [hiddenSubjectsDirty, setHiddenSubjectsDirty] = useState(false);
  const setHiddenSubjectsMutation = trpc.featureToggles.setHiddenSubjects.useMutation({
    onSuccess: () => {
      toast.success('已更新隱藏科目設定');
      refetchHiddenSubjects();
      setHiddenSubjectsDirty(false);
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });
  // 從伺服器讀取初始隱藏科目
  useEffect(() => {
    if (hiddenSubjectsData && !hiddenSubjectsDirty) {
      setHiddenSubjects(hiddenSubjectsData.hiddenSubjects || []);
    }
  }, [hiddenSubjectsData]);
  const handleSubjectToggle = (subject: string, checked: boolean) => {
    setHiddenSubjectsDirty(true);
    setHiddenSubjects(prev => checked ? [...prev, subject] : prev.filter(s => s !== subject));
  };
  const handleSaveHiddenSubjects = () => {
    setHiddenSubjectsMutation.mutate({ hiddenSubjects });
  };

  // 允許學生匯出 Word 開關
  const { data: exportWordData, isLoading: exportWordLoading, refetch: refetchExportWord } = trpc.featureToggles.getStudentExportWord.useQuery();
  const [exportWordPending, setExportWordPending] = useState(false);
  const setExportWordMutation = trpc.featureToggles.setStudentExportWord.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.enabled ? '✅ 已開放學生匯出 Word' : '🔒 已關閉學生匯出 Word');
      refetchExportWord();
      setExportWordPending(false);
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
      setExportWordPending(false);
    },
  });
  const exportWordEnabled = exportWordPending
    ? setExportWordMutation.variables?.enabled ?? (exportWordData?.enabled ?? false)
    : (exportWordData?.enabled ?? false);
  const handleExportWordToggle = (enabled: boolean) => {
    setExportWordPending(true);
    setExportWordMutation.mutate({ enabled });
  };

  // 智能課堂：排除智能解題向量化科目的開關
  const { data: excludeData, isLoading: excludeLoading, refetch: refetchExclude } = trpc.featureToggles.getSmartClassroomExcludeLearningMaterial.useQuery();
  const [excludePending, setExcludePending] = useState(false);
  const setExcludeMutation = trpc.featureToggles.setSmartClassroomExcludeLearningMaterial.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.enabled ? '智能課堂已隱藏智能解題科目' : '智能課堂已顯示智能解題科目');
      refetchExclude();
      setExcludePending(false);
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
      setExcludePending(false);
    },
  });
  const excludeEnabled = excludePending
    ? setExcludeMutation.variables?.enabled ?? (excludeData?.enabled ?? false)
    : (excludeData?.enabled ?? false);
  const handleExcludeToggle = (enabled: boolean) => {
    setExcludePending(true);
    setExcludeMutation.mutate({ enabled });
  };

  const subFeatures = ["practice_system", "learning_materials", "smart_classroom", "law_book", "material_qa", "auditory_hall", "ai_question_bank", "smart_books", "accounting", "video_course"];

  // 密碼管理 - 所有智能專區
  const ALL_FEATURE_PASSWORDS = [
    { key: 'practice_system' as const, label: '① 練題系統', color: 'indigo', icon: BookOpen },
    { key: 'learning_materials' as const, label: '② 智能解題', color: 'green', icon: Library },
    { key: 'essay_grading' as const, label: '③ 申論批改', color: 'orange', icon: FileEdit },
    { key: 'smart_classroom' as const, label: '④ 智能課堂', color: 'purple', icon: GraduationCap },
    { key: 'law_book' as const, label: '⑤ 六法全書', color: 'red', icon: Scale },
    { key: 'material_qa' as const, label: '⑥ 教材Q&A', color: 'teal', icon: MessageCircle },
    { key: 'auditory_hall' as const, label: '⑧ 知識達試聽館', color: 'pink', icon: GraduationCap },
    { key: 'ai_question_bank' as const, label: '⑩ 智能題庫練習', color: 'violet', icon: GraduationCap },
    { key: 'smart_books' as const, label: '②② 智能書本', color: 'blue', icon: BookOpen },
    { key: 'accounting' as const, label: '②③ 會計實務助手', color: 'emerald', icon: Calculator },
    { key: 'video_course' as const, label: '②④ 智能函授', color: 'purple', icon: Video },
  ];
  const { data: pwdData_practice, refetch: refetchPwd_practice } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'practice_system' });
  const { data: pwdData_learning, refetch: refetchPwd_learning } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'learning_materials' });
  const { data: pwdData_essay, refetch: refetchPwd_essay } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'essay_grading' });
  const { data: pwdData_classroom, refetch: refetchPwd_classroom } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'smart_classroom' });
  const { data: pwdData_law, refetch: refetchPwd_law } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'law_book' });
  const { data: pwdData_materialqa, refetch: refetchPwd_materialqa } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'material_qa' });
  const { data: pwdData_auditory, refetch: refetchPwd_auditory } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'auditory_hall' });
  const { data: pwdData_qbank, refetch: refetchPwd_qbank } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'ai_question_bank' });
  const { data: pwdData_books, refetch: refetchPwd_books } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'smart_books' });
  const { data: pwdData_accounting, refetch: refetchPwd_accounting } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'accounting' });
  const { data: pwdData_video, refetch: refetchPwd_video } = trpc.featureToggles.getFeaturePassword.useQuery({ feature: 'video_course' });
  const pwdDataMap: Record<string, string | undefined> = {
    practice_system: pwdData_practice?.password,
    learning_materials: pwdData_learning?.password,
    essay_grading: pwdData_essay?.password,
    smart_classroom: pwdData_classroom?.password,
    law_book: pwdData_law?.password,
    material_qa: pwdData_materialqa?.password,
    auditory_hall: pwdData_auditory?.password,
    ai_question_bank: pwdData_qbank?.password,
    smart_books: pwdData_books?.password,
    accounting: pwdData_accounting?.password,
    video_course: pwdData_video?.password,
  };
  const refetchMap: Record<string, () => void> = {
    practice_system: refetchPwd_practice, learning_materials: refetchPwd_learning,
    essay_grading: refetchPwd_essay, smart_classroom: refetchPwd_classroom,
    law_book: refetchPwd_law, material_qa: refetchPwd_materialqa,
    auditory_hall: refetchPwd_auditory, ai_question_bank: refetchPwd_qbank,
    smart_books: refetchPwd_books, accounting: refetchPwd_accounting, video_course: refetchPwd_video,
  };
  const [pwdValues, setPwdValues] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const updated: Record<string, string> = {};
    for (const [k, v] of Object.entries(pwdDataMap)) { if (v !== undefined) updated[k] = v; }
    if (Object.keys(updated).length > 0) setPwdValues(prev => ({ ...prev, ...updated }));
  }, [pwdData_practice, pwdData_learning, pwdData_essay, pwdData_classroom, pwdData_law, pwdData_materialqa, pwdData_auditory, pwdData_qbank, pwdData_books, pwdData_accounting, pwdData_video]);
  const setFeaturePasswordMutation = trpc.featureToggles.setFeaturePassword.useMutation({
    onSuccess: (_, variables) => {
      const label = ALL_FEATURE_PASSWORDS.find(f => f.key === variables.feature)?.label || variables.feature;
      toast.success(`已更新「${label}」密碼`);
      refetchMap[variables.feature]?.();
    },
    onError: (error) => toast.error(`更新失敗：${error.message}`),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">功能開關設定</h1>
          <p className="text-muted-foreground text-sm">每個功能有兩層開關：外部控制學生是否看到，內部控制管理員是否可測試</p>
        </div>
      </div>

      {/* 全站學生存取開關 - 最顯眼的大開關 */}
      <Card className={`border-2 ${studentAccessEnabled ? "border-green-300 bg-green-50/30" : "border-red-300 bg-red-50/30"}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${studentAccessEnabled ? "bg-green-100" : "bg-red-100"}`}>
                {studentAccessEnabled ? (
                  <ShieldCheck className="w-7 h-7 text-green-600" />
                ) : (
                  <ShieldOff className="w-7 h-7 text-red-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold">全站學生存取</h2>
                  <Badge className={studentAccessEnabled ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"} variant="outline">
                    {studentAccessEnabled ? "✅ 已開放" : "🔒 已關閉"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {studentAccessEnabled
                    ? "學生可以正常使用系統。關閉後，所有非管理員用戶將看到「系統尚未開放」頁面。"
                    : "系統已關閉。學生進入任何頁面都會看到「系統尚未開放」提示，管理員不受影響。"}
                </p>
              </div>
            </div>
            <Switch
              checked={studentAccessEnabled}
              onCheckedChange={handleStudentAccessToggle}
              disabled={studentAccessLoading || studentAccessPending}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      {/* 說明卡 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Users className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700">外部開關</p>
            <p className="text-xs text-blue-600 mt-0.5">控制一般學生是否看到此功能</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
          <Lock className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-purple-700">內部開關</p>
            <p className="text-xs text-purple-600 mt-0.5">外部關閉時，管理員仍可開啟測試</p>
          </div>
        </div>
      </div>

      {/* 智能專區整體開關 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">智能專區（整體開關）</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                控制導覽列「智能專區」按鈕的顯示。外部關閉後，學生看不到智能專區入口，以下六大功能也會一併隱藏。
              </CardDescription>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* 外部開關 */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getExternalValue("student_portal") ? "border-blue-200 bg-blue-50/50" : "border-orange-200 bg-orange-50/30"}`}>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium">外部（學生）</span>
                {getExternalValue("student_portal") ? (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs py-0">
                    <Eye className="w-3 h-3 mr-1" />開啟
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs py-0">
                    <EyeOff className="w-3 h-3 mr-1" />關閉
                  </Badge>
                )}
              </div>
              <Switch
                checked={getExternalValue("student_portal")}
                onCheckedChange={(v) => handleToggle("student_portal", v, "external")}
                disabled={"external_student_portal" in pendingToggles}
              />
            </div>
            {/* 內部開關 */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getInternalValue("student_portal") ? "border-purple-200 bg-purple-50/50" : "border-gray-200 bg-gray-50/30"}`}>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-medium">內部（管理員）</span>
                {getInternalValue("student_portal") ? (
                  <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 text-xs py-0">
                    可測試
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50 text-xs py-0">
                    關閉
                  </Badge>
                )}
              </div>
              <Switch
                checked={getInternalValue("student_portal")}
                onCheckedChange={(v) => handleToggle("student_portal", v, "internal")}
                disabled={"internal_student_portal" in pendingToggles}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 六大功能區開關 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground font-medium">智能專區內七大功能</CardTitle>
          <CardDescription className="text-xs">
            各功能可單獨控制。外部關閉 = 學生看不到；內部開啟 = 管理員仍可進入測試。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {subFeatures.map((key, index) => {
            const meta = FEATURE_LABELS[key];
            const Icon = meta.icon;
            const extEnabled = getExternalValue(key);
            const intEnabled = getInternalValue(key);

            return (
              <div key={key}>
                {index > 0 && <Separator className="my-1" />}
                <div className="py-3 px-2 rounded-lg">
                  {/* 功能標題 */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 rounded-md bg-muted">
                      <Icon className={`w-4 h-4 ${extEnabled ? meta.color : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${!extEnabled ? "text-muted-foreground" : ""}`}>
                          {meta.label}
                        </span>
                        {!extEnabled && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs py-0">
                            外部已關閉
                          </Badge>
                        )}
                        {!extEnabled && intEnabled && (
                          <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 text-xs py-0">
                            內部測試中
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                    </div>
                  </div>
                  {/* 雙層開關 */}
                  <div className="grid grid-cols-2 gap-2 ml-9">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs ${extEnabled ? "border-blue-200 bg-blue-50/40" : "border-orange-200 bg-orange-50/30"}`}>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span className="text-muted-foreground">外部</span>
                      </div>
                      <Switch
                        checked={extEnabled}
                        onCheckedChange={(v) => handleToggle(key, v, "external")}
                        disabled={`external_${key}` in pendingToggles}
                        className="scale-75"
                      />
                    </div>
                    <div className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs ${intEnabled ? "border-purple-200 bg-purple-50/40" : "border-gray-200 bg-gray-50/30"}`}>
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-purple-500" />
                        <span className="text-muted-foreground">內部</span>
                      </div>
                      <Switch
                        checked={intEnabled}
                        onCheckedChange={(v) => handleToggle(key, v, "internal")}
                        disabled={`internal_${key}` in pendingToggles}
                        className="scale-75"
                      />
                    </div>
                  </div>

                  {/* 申論題練習子開關（只在 ai_question_bank 下顯示） */}
                  {key === 'ai_question_bank' && (
                    <div className="ml-9 mt-2 border border-amber-200 rounded-lg bg-amber-50/30 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">└ 申論題練習（子功能）</span>
                        <span className="text-xs text-muted-foreground">單獨關閉申論題，選擇題不受影響</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs ${getExternalValue('essay_grading') ? "border-blue-200 bg-blue-50/40" : "border-orange-200 bg-orange-50/30"}`}>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span className="text-muted-foreground">外部</span>
                          </div>
                          <Switch
                            checked={getExternalValue('essay_grading')}
                            onCheckedChange={(v) => handleToggle('essay_grading', v, 'external')}
                            disabled={'external_essay_grading' in pendingToggles}
                            className="scale-75"
                          />
                        </div>
                        <div className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs ${getInternalValue('essay_grading') ? "border-purple-200 bg-purple-50/40" : "border-gray-200 bg-gray-50/30"}`}>
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-purple-500" />
                            <span className="text-muted-foreground">內部</span>
                          </div>
                          <Switch
                            checked={getInternalValue('essay_grading')}
                            onCheckedChange={(v) => handleToggle('essay_grading', v, 'internal')}
                            disabled={'internal_essay_grading' in pendingToggles}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </CardContent>
      </Card>

      {/* 智能課堂進階設定 */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <GraduationCap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">智能課堂進階設定</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                控制智能課堂的科目顯示與隱藏
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* 排除智能解題向量化的科目開關 */}
          <div className={`flex items-center justify-between p-4 rounded-lg border ${excludeEnabled ? "border-amber-300 bg-amber-50/50" : "border-gray-200 bg-gray-50/30"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">隱藏智能解題向量化的科目</span>
                {excludeEnabled ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs py-0">已隱藏</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs py-0">顯示中</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {excludeEnabled ? '智能課堂只顯示直接上傳知識庫的科目，隱藏智能解題向量化的科目。' : '智能課堂顯示所有科目。'}
              </p>
            </div>
            <Switch checked={excludeEnabled} onCheckedChange={handleExcludeToggle} disabled={excludeLoading || excludePending} className="ml-4" />
          </div>

          {/* 科目公開/隱藏管理 → 導向類科管理頁面 */}
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">科目公開 / 隱藏管理</p>
                <p className="text-xs text-blue-600 mt-1">請至「類科管理」頁面，使用「學員可見」開關直接控制每個科目的顯示狀態，更直覺且統一。</p>
              </div>
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0 ml-4" onClick={() => { const [, navigate] = [null, (url: string) => { window.location.href = url; }]; window.location.href = '/admin/pdf-categories'; }}>
                前往類科管理
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 學生匯出 Word 開關 */}
      <Card className={`border-2 ${exportWordEnabled ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${exportWordEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <FileDown className={`w-6 h-6 ${exportWordEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold">學生匯出 Word 權限</h2>
                  <Badge className={exportWordEnabled ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-500 border-gray-300'} variant="outline">
                    {exportWordEnabled ? '✅ 已開放' : '🔒 僅管理員'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {exportWordEnabled
                    ? '學生可以將 AI 回答和收藏解說匯出為 Word 檔。'
                    : '目前僅管理員可以匯出 Word，學生看不到匯出按鈕。'}
                </p>
              </div>
            </div>
            <Switch
              checked={exportWordEnabled}
              onCheckedChange={handleExportWordToggle}
              disabled={exportWordLoading || exportWordPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* 內部測試密碼管理 */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">內部測試密碼管理</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                設定密碼後，外部使用者點進功能時需輸入正確密碼才能使用。空白表示不需要密碼。
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {ALL_FEATURE_PASSWORDS.map((feat) => {
            const IconComp = feat.icon;
            const hasPwd = !!(pwdDataMap[feat.key]);
            const val = pwdValues[feat.key] ?? '';
            const visible = showPwd[feat.key] ?? false;
            return (
              <div key={feat.key} className="p-3 rounded-lg border border-gray-200 bg-gray-50/30">
                <div className="flex items-center gap-2 mb-2">
                  <IconComp className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{feat.label} 存取密碼</span>
                  {hasPwd ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs py-0">已設密碼</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs py-0">無需密碼</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={visible ? 'text' : 'password'}
                      placeholder="空白 = 不需要密碼"
                      value={val}
                      onChange={(e) => setPwdValues(prev => ({ ...prev, [feat.key]: e.target.value }))}
                      className="pr-10 h-8 text-sm"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPwd(prev => ({ ...prev, [feat.key]: !visible }))}
                    >
                      {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => setFeaturePasswordMutation.mutate({ feature: feat.key, password: val })}
                    disabled={setFeaturePasswordMutation.isPending}
                  >
                    儲存
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        設定即時生效，學生重新整理頁面後即可看到變更
      </p>
    </div>
  );
}
