import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BookOpen, Home, Loader2, MessageCircle, Library, FileText, TrendingUp, Scale, Receipt, PenTool, History, GraduationCap, Headphones, Brain, BookMarked, Calculator, Video, Lock, Volume2 } from "lucide-react";
import { TTSSettingsPanel } from "@/components/TTSSettingsPanel";
import { AnnouncementList } from "@/components/AnnouncementList";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type FeatureKey = 'smart_books' | 'video_course' | 'smart_classroom' | 'practice_system' | 'learning_materials' | 'essay_grading' | 'law_book' | 'material_qa' | 'auditory_hall' | 'ai_question_bank' | 'accounting';

export default function StudentPortal() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const isAdmin = user?.role === "admin";

  // 密碼彈窗狀態
  const [pwdDialog, setPwdDialog] = useState<{ open: boolean; feature: FeatureKey; targetPath: string }>({
    open: false, feature: 'smart_books', targetPath: ''
  });
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const verifyPasswordMutation = trpc.featureToggles.verifyFeaturePassword.useMutation();
  // 所有功能的密碼查詢
  const pwdRequired_practice = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'practice_system' });
  const pwdRequired_learning = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'learning_materials' });
  const pwdRequired_essay = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'essay_grading' });
  const pwdRequired_classroom = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'smart_classroom' });
  const pwdRequired_law = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'law_book' });
  const pwdRequired_materialqa = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'material_qa' });
  const pwdRequired_auditory = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'auditory_hall' });
  const pwdRequired_qbank = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'ai_question_bank' });
  const pwdRequired_books = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'smart_books' });
  const pwdRequired_accounting = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'accounting' });
  const pwdRequired_video = trpc.featureToggles.checkFeaturePasswordRequired.useQuery({ feature: 'video_course' });
  const pwdRequiredMap: Record<string, { isFetched: boolean; data?: { required: boolean } }> = {
    practice_system: pwdRequired_practice, learning_materials: pwdRequired_learning,
    essay_grading: pwdRequired_essay, smart_classroom: pwdRequired_classroom,
    law_book: pwdRequired_law, material_qa: pwdRequired_materialqa,
    auditory_hall: pwdRequired_auditory, ai_question_bank: pwdRequired_qbank,
    smart_books: pwdRequired_books, accounting: pwdRequired_accounting, video_course: pwdRequired_video,
  };
  const FEATURE_LABELS_MAP: Record<string, string> = {
    practice_system: '練題系統', learning_materials: '智能解題',
    essay_grading: '申論批改', smart_classroom: '智能課堂',
    law_book: '六法全書', material_qa: '教材Q&A',
    auditory_hall: '知識達試聽館', ai_question_bank: '智能題庫練習',
    smart_books: '智能書本', accounting: '會計實務助手', video_course: '智能函授',
  };

  // 需要密碼時彈出對話框，否則直接跳轉
  const enterFeature = (feature: FeatureKey, path: string) => {
    if (isAdmin) { setLocation(path); return; }
    if (sessionStorage.getItem(`feature_unlocked_${feature}`) === '1') { setLocation(path); return; }
    const query = pwdRequiredMap[feature];
    // 查詢尚未完成時，預設顯示密碼彈窗（保守策略，不直接放行）
    const required = query?.isFetched ? query.data?.required : true;
    if (!required) { setLocation(path); return; }
    setPwdInput('');
    setPwdError('');
    setPwdDialog({ open: true, feature, targetPath: path });
  };

  const handlePasswordSubmit = async () => {
    if (!pwdInput.trim()) { setPwdError('請輸入密碼'); return; }
    setPwdLoading(true);
    try {
      const result = await verifyPasswordMutation.mutateAsync({ feature: pwdDialog.feature, password: pwdInput.trim() });
      if (result.valid) {
        sessionStorage.setItem(`feature_unlocked_${pwdDialog.feature}`, '1');
        setPwdDialog(prev => ({ ...prev, open: false }));
        setLocation(pwdDialog.targetPath);
      } else {
        setPwdError('密碼錯誤，請重新輸入');
      }
    } catch {
      setPwdError('驗證失敗，請稍後再試');
    } finally {
      setPwdLoading(false);
    }
  };

  // 外部開關（學生用）
  const featureTogglesQuery = trpc.featureToggles.getAll.useQuery(undefined, {
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  // 管理員開關（含內部）
  const adminTogglesQuery = trpc.featureToggles.getAllAdmin.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const toggles = featureTogglesQuery.data?.toggles;
  const togglesLoaded = featureTogglesQuery.isFetched;

  // 管理員：外部開啟 OR 內部開啟 都可看到；學生：只看外部開關
  const show = (key: string) => {
    if (!togglesLoaded) return false;
    if (isAdmin && adminTogglesQuery.isFetched) {
      const ext = adminTogglesQuery.data?.external?.[key] === true;
      const int = adminTogglesQuery.data?.internal?.[key] === true;
      return ext || int;
    }
    return toggles?.[key] === true;
  };

  // 登入檢查
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = getLoginUrl();
    }
  }, [user, loading]);

  // 整體開關檢查：管理員可透過內部開關進入，學生只看外部開關
  useEffect(() => {
    if (!togglesLoaded) return;
    if (isAdmin) {
      // 管理員：等待 adminTogglesQuery 載入完成再判斷，避免競態條件
      if (!adminTogglesQuery.isFetched) return;
      const ext = adminTogglesQuery.data?.external?.student_portal === true;
      const int = adminTogglesQuery.data?.internal?.student_portal === true;
      // 管理員外部開關開啟時也可進入
      if (!ext && !int && toggles?.student_portal !== true) setLocation("/");
    } else if (toggles?.student_portal !== true) {
      setLocation("/");
    }
  }, [togglesLoaded, toggles?.student_portal, adminTogglesQuery.isFetched, adminTogglesQuery.data, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto py-12 px-4">
        {/* 標題區域 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">智能專區</h1>
            <p className="text-muted-foreground">
              歡迎回來，{user.name}！開始你的學習之旅
            </p>
          </div>
        </div>

        {/* 功能卡片 */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl pb-24">
          {/* 1. 練題系統 */}
          {show("practice_system") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>練題系統</CardTitle>
                <CardDescription>
                  選擇科目和題目數量，開始練習考試。每個題目都會記錄你的學習對話，方便複習時查看。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => enterFeature('practice_system', '/student/exam')}>開始練習</Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/student/conversation-history")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  查看對話紀錄
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/student/purchase-history")}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  購買記錄
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 2. 智能解題 */}
          {show("learning_materials") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle>智能解題</CardTitle>
                <CardDescription>
                  智能補充老師簡答，逐步詳解解題思路，讓每道考題都能徹底搞懂。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => enterFeature('learning_materials', '/student/learning-materials')}>開始解題</Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/student/learning-notes")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  查看學習筆記
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 3. 申論批改 */}
          {show("essay_grading") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                  <PenTool className="w-6 h-6 text-orange-500" />
                </div>
                <CardTitle>申論批改</CardTitle>
                <CardDescription>
                  隨機抽取申論題進行練習，AI 會根據標準答案進行多維度評分
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => enterFeature('essay_grading', '/essay-practice')}>開始練習</Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/essay-history")}
                >
                  <History className="w-4 h-4 mr-2" />
                  我的作答記錄
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 4. 智能課堂 */}
          {show("smart_classroom") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                  <Library className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle>智能課堂</CardTitle>
                <CardDescription>
                  全方位學習平台，支援多種學科知識庫。AI 引導式教學，透過互動對話引導思考，深入理解知識應用。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => enterFeature('smart_classroom', '/student/knowledge-learning')}>開始學習</Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/student/learning-progress")}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  學習記錄
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/student/quiz-wrong-questions")}
                >
                  📖 錯題集
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/student/quiz-history")}
                >
                  📊 測驗歷史
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 5. 試聽館（與六法全書對調） */}
          {show("auditory_hall") && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                <Headphones className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle>知識達試聽館</CardTitle>
              <CardDescription>
                知識達 YouTube 課程影片試聽，AI摘要以及與 AI 助教互動學習。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => enterFeature('auditory_hall', '/auditory-hall')}>進入試聽館</Button>
            </CardContent>
          </Card>
          )}

          {/* 6. 教材Q&A */}
          {show("material_qa") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-indigo-500" />
                </div>
                <CardTitle>教材Q&A</CardTitle>
                <CardDescription>
                  選擇老師和教材，透過對話式學習。AI 會根據該老師的講義內容回答問題，模擬老師的教學風格。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => enterFeature('material_qa', '/teacher-material-learning')}>開始學習</Button>
              </CardContent>
            </Card>
          )}

          {/* 7. 六法全書（與試聽館對調） */}
          {show("law_book") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <Scale className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle>六法全書</CardTitle>
                <CardDescription>
                  快速查詢法條內容、收藏重要法條、記錄學習筆記。支援六個核心法律科目的法條管理。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => enterFeature('law_book', '/student/law-learning')}>開始學習</Button>
                <Button variant="outline" className="w-full" onClick={() => setLocation("/student/law-mistakes")}>
                  📖 錯題本
                </Button>
              </CardContent>
            </Card>
          )}
          {/* 智能題庫練習 */}
          {show("ai_question_bank") && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-violet-500" />
              </div>
              <CardTitle>智能題庫練習</CardTitle>
              <CardDescription>
                AI 根據教材自動出題，選擇題即時批改，附詳細解析，有效鞏固學習成效。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => enterFeature('ai_question_bank', '/ai-question-practice')}>開始練習</Button>
            </CardContent>
          </Card>
          )}

          {/* 智能書本 */}
          {show("smart_books") && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <BookMarked className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle>智能書本</CardTitle>
              <CardDescription>
                AI 引導式書本學習，章節對話、學習進度追蹤，讓閱讀更有效率。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => enterFeature('smart_books', '/smart-books')}>
                <Lock className="w-4 h-4 mr-2 opacity-50" />
                進入書本
              </Button>
            </CardContent>
          </Card>
          )}

          {/* 會計實務助手 */}
          {show("accounting") && (<Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-emerald-500" />
              </div>
              <CardTitle>會計實務助手</CardTitle>
              <CardDescription>
                稅務法規即時問答、AI 出題批改分錄練習，涵蓋基本交易、折舊、存貨、薪資等主題。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => enterFeature('accounting', '/accounting-assistant')}>開始練習</Button>
            </CardContent>
          </Card>)}

          {/* 智能函授 */}
          {show("video_course") && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle>智能函授</CardTitle>
              <CardDescription>
                影音課程學習，AI 即時解答，字幕同步顯示，知識點一鍵跳轉，隨時暫停發問。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => enterFeature('video_course', '/video-course')}>
                <Lock className="w-4 h-4 mr-2 opacity-50" />
                進入課程
              </Button>
            </CardContent>
          </Card>
          )}
        </div>

        {/* 公告欄 - 暫時隱藏 */}
        {/* <div className="mt-12">
          <AnnouncementList />
        </div> */}

        {/* 語音朗讀設定 */}
        <div className="mt-10 max-w-md">
          <Card className="border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Volume2 className="w-5 h-5 text-blue-500" />
                語音朗讀設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TTSSettingsPanel />
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 密碼保護彈窗 */}
      <Dialog open={pwdDialog.open} onOpenChange={(open) => setPwdDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {FEATURE_LABELS_MAP[pwdDialog.feature] || pwdDialog.feature} 存取驗證
            </DialogTitle>
            <DialogDescription>
              此功能目前為內部測試階段，請輸入存取密碼。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              type="password"
              placeholder="請輸入存取密碼"
              value={pwdInput}
              onChange={(e) => { setPwdInput(e.target.value); setPwdError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !pwdLoading && handlePasswordSubmit()}
              autoFocus
            />
            {pwdError && <p className="text-sm text-destructive">{pwdError}</p>}
            <Button className="w-full" onClick={handlePasswordSubmit} disabled={pwdLoading}>
              {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              確認
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
