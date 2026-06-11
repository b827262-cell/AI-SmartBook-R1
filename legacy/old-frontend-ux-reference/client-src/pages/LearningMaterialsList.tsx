/**
 * 學生智能解題列表頁面
 * 首頁：依類科顯示大卡片
 * 點進去：顯示該類科的資料清單（含搜尋）
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, FileText, GraduationCap, FolderOpen, ArrowRight, Search, X, Coins, Lock, Unlock, Star, Users, Gift, ChevronLeft, BookMarked, Layers } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type Category = "lecture" | "exam" | "course" | "other";

export default function LearningMaterialsList() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // 目前選中的類科（null = 首頁大卡片）
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");

  // 解鎖確認對話框
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; materialId: number; title: string; pointCost: number }>({
    open: false, materialId: 0, title: "", pointCost: 0,
  });

  // 管理員設定點數對話框
  const [editPointDialog, setEditPointDialog] = useState<{ open: boolean; materialId: number; title: string; current: number }>({
    open: false, materialId: 0, title: "", current: 0,
  });
  const [editPointValue, setEditPointValue] = useState("0");

  // 取得類科分組統計（首頁大卡片用）
  const { data: subjectGroups, isLoading: isLoadingGroups } = trpc.learningMaterials.getSubjectGroups.useQuery();

  // 取得全部資料（進入類科後用）
  const { data, isLoading: isLoadingList, refetch } = trpc.learningMaterials.list.useQuery({});

  // 獲取已解鎖的資料 ID 列表
  const { data: unlockedData, refetch: refetchUnlocked } = trpc.learningMaterials.getUnlockedMaterialIds.useQuery();
  const unlockedIds = new Set(unlockedData?.unlockedIds ?? []);

  // 全域班內生驗證狀態
  const { data: globalVerifyData } = trpc.featureToggles.checkGlobalClassVerification.useQuery(undefined, {
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const isGloballyVerified = globalVerifyData?.verified === true || isAdmin;

  // 解鎖 mutation
  const unlockMutation = trpc.learningMaterials.unlockMaterial.useMutation({
    onSuccess: (result) => {
      refetchUnlocked();
      if (result.pointsSpent > 0) {
        toast.success(`已扣除 ${result.pointsSpent} 點，資料已解鎖！`);
      }
      setLocation(`/learning/${unlockDialog.materialId}`);
      setUnlockDialog(prev => ({ ...prev, open: false }));
    },
    onError: (err) => {
      toast.error(err.message || "解鎖失敗，請稍後再試");
    },
  });

  // 更新點數 mutation（管理員）
  const updatePointCostMutation = trpc.learningMaterials.updatePointCost.useMutation({
    onSuccess: () => {
      toast.success("點數設定已更新");
      refetch();
      setEditPointDialog(prev => ({ ...prev, open: false }));
    },
    onError: () => toast.error("更新失敗"),
  });

  // 點擊資料卡片
  const handleMaterialClick = async (material: { id: number; title: string; pointCost: number; accessMode?: string }) => {
    const cost = material.pointCost ?? 0;
    const accessMode = material.accessMode || 'public';
    if (accessMode === 'class_only' && !isAdmin) {
      if (isGloballyVerified) {
        setLocation(`/learning/${material.id}`);
        return;
      }
      setLocation(`/class-student-verify?materialId=${material.id}&returnUrl=/learning/${material.id}`);
      return;
    }
    if (cost === 0 || unlockedIds.has(material.id) || isAdmin) {
      setLocation(`/learning/${material.id}`);
      return;
    }
    setUnlockDialog({ open: true, materialId: material.id, title: material.title, pointCost: cost });
  };

  // 所有資料
  const allMaterials = data?.materials ?? [];

  // 依選中類科 + 分類 + 關鍵字篩選（清單頁用）
  const filteredMaterials = useMemo(() => {
    let materials = allMaterials;
    if (selectedSubject !== null) {
      if (selectedSubject === "其他") {
        materials = materials.filter(m => !((m as any).subjectName?.trim()));
      } else {
        materials = materials.filter(m => (m as any).subjectName?.trim() === selectedSubject);
      }
    }
    if (selectedCategory !== "all") {
      materials = materials.filter(m => m.category === selectedCategory);
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      materials = materials.filter(m =>
        m.title.toLowerCase().includes(keyword) ||
        ((m as any).subjectName && (m as any).subjectName.toLowerCase().includes(keyword))
      );
    }
    return materials;
  }, [allMaterials, selectedSubject, selectedCategory, searchKeyword]);

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case "lecture": return <BookOpen className="w-5 h-5" />;
      case "exam": return <FileText className="w-5 h-5" />;
      case "course": return <GraduationCap className="w-5 h-5" />;
      default: return <FolderOpen className="w-5 h-5" />;
    }
  };

  const getCategoryName = (category: Category) => {
    switch (category) {
      case "lecture": return "講義";
      case "exam": return "考題";
      case "course": return "課程";
      default: return "其他";
    }
  };

  const getCategoryColor = (category: Category) => {
    switch (category) {
      case "lecture": return "text-blue-600 bg-blue-50";
      case "exam": return "text-green-600 bg-green-50";
      case "course": return "text-purple-600 bg-purple-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  // 類科圖示
  const getSubjectIcon = (subject: string, idx: number) => {
    const icons = [BookMarked, BookOpen, FileText, GraduationCap, Layers, FolderOpen];
    const Icon = icons[idx % icons.length];
    return <Icon className="w-6 h-6 text-muted-foreground" />;
  };

  // ==================== 首頁：類科大卡片 ====================
  if (selectedSubject === null) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">智能解題</h1>
          <p className="text-muted-foreground">選擇類科，開始與 AI 學習助教互動學習</p>
        </div>

        {isLoadingGroups ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !subjectGroups || subjectGroups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">目前尚無智能解題</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {subjectGroups.map((group, idx) => (
              <div
                key={group.subject}
                className="relative rounded-2xl bg-white border border-border p-5 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                onClick={() => {
                  setSelectedSubject(group.subject);
                  setSearchKeyword("");
                  setSelectedCategory("all");
                }}
              >
                {/* 圖示 */}
                <div className="mb-3">
                  {getSubjectIcon(group.subject, idx)}
                </div>

                {/* 類科名稱 */}
                <div className="font-bold text-base text-foreground leading-tight mb-1">
                  {group.subject}
                </div>

                {/* 資料數量 */}
                <div className="text-sm text-muted-foreground mb-3">
                  共 {group.count} 份資料
                </div>

                {/* 標籤列 */}
                <div className="flex flex-wrap gap-1">
                  {group.freeCount > 0 && (
                    <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Gift className="w-3 h-3" /> 免費 {group.freeCount}
                    </span>
                  )}
                  {group.paidCount > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Star className="w-3 h-3" /> 付費 {group.paidCount}
                    </span>
                  )}
                  {group.classCount > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" /> 班內 {group.classCount}
                    </span>
                  )}
                </div>

                {/* 進入箭頭 */}
                <div className="absolute bottom-4 right-4 text-muted-foreground/50">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==================== 類科清單頁 ====================
  return (
    <div className="container mx-auto py-8">
      {/* 麵包屑 + 返回 */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedSubject(null)}
        >
          <ChevronLeft className="w-4 h-4" />
          智能解題
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-foreground">{selectedSubject}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{selectedSubject}</h1>
        <p className="text-muted-foreground text-sm">共 {filteredMaterials.length} 份資料</p>
      </div>

      {/* 搜尋框 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-9"
          placeholder={`搜尋「${selectedSubject}」的智能解題...`}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        {searchKeyword && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchKeyword("")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 分類篩選 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "lecture", "exam", "course", "other"] as const).map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === "all" ? "全部" : getCategoryName(cat as Category)}
          </Button>
        ))}
      </div>

      {/* 搜尋結果提示 */}
      {searchKeyword.trim() && (
        <p className="text-sm text-muted-foreground mb-4">
          搜尋「<span className="font-medium text-foreground">{searchKeyword}</span>」，共找到 {filteredMaterials.length} 筆結果
        </p>
      )}

      {/* 資料列表 */}
      {isLoadingList ? (
        <div className="text-center py-12">載入中...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchKeyword.trim() ? `找不到包含「${searchKeyword}」的智能解題` : "此類科目前沒有可用的智能解題"}
          </div>
          {searchKeyword.trim() ? (
            <Button variant="outline" size="sm" onClick={() => setSearchKeyword("")}>清除搜尋</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectedSubject(null)}>返回類科列表</Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
          {filteredMaterials.map((material) => {
            const cost = material.pointCost ?? 0;
            const accessMode = (material as any).accessMode || 'public';
            const isClassOnly = accessMode === 'class_only';
            const isUnlocked = cost === 0 || unlockedIds.has(material.id) || isAdmin;
            const isPaid = cost > 0 && !isClassOnly;

            return (
              <div
                key={material.id}
                className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => handleMaterialClick({ id: material.id, title: material.title, pointCost: cost, accessMode })}
              >
                {/* 左側圖示 */}
                <div className={`shrink-0 p-2 rounded-lg ${getCategoryColor(material.category as Category)}`}>
                  {(isPaid && !isUnlocked) || (isClassOnly && !isGloballyVerified)
                    ? <Lock className="w-4 h-4" />
                    : getCategoryIcon(material.category as Category)}
                </div>

                {/* 標題與標籤 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{material.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${getCategoryColor(material.category as Category)}`}>
                      {getCategoryName(material.category as Category)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(material.createdAt!).toLocaleDateString()}
                    </span>
                    {!isPaid && !isClassOnly && material.pageCount ? (
                      <span className="text-xs text-muted-foreground">{material.pageCount} 頁</span>
                    ) : null}
                  </div>
                </div>

                {/* 右側狀態標籤 + 按鈕 */}
                <div className="shrink-0 flex items-center gap-2">
                  {isClassOnly ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      🏫 班內生
                    </span>
                  ) : isPaid ? (
                    isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                        <Unlock className="w-3 h-3" />已解鎖
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                        <Coins className="w-3 h-3" />{cost} 點
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                      🎁 免費
                    </span>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditPointDialog({ open: true, materialId: material.id, title: material.title, current: cost });
                        setEditPointValue(String(cost));
                      }}
                    >
                      <Coins className="w-3 h-3" />
                    </Button>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 解鎖確認對話框 */}
      <Dialog open={unlockDialog.open} onOpenChange={(open) => setUnlockDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              解鎖智能解題
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">「{unlockDialog.title}」</span>
              <br />
              此資料需要 <span className="font-bold text-amber-600">{unlockDialog.pointCost} 點</span> 才能解鎖。
              <br />
              解鎖後可無限次使用，包含所有 AI 功能，不再額外扣點。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialog(prev => ({ ...prev, open: false }))}>
              取消
            </Button>
            <Button
              onClick={() => unlockMutation.mutate({ materialId: unlockDialog.materialId })}
              disabled={unlockMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {unlockMutation.isPending ? "解鎖中..." : `確認解鎖（扣 ${unlockDialog.pointCost} 點）`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 管理員設定點數對話框 */}
      <Dialog open={editPointDialog.open} onOpenChange={(open) => setEditPointDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>設定解鎖點數</DialogTitle>
            <DialogDescription>
              「{editPointDialog.title}」
              <br />
              設定學員解鎖此資料需要的點數（0 = 免費試閱）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              min={0}
              max={9999}
              value={editPointValue}
              onChange={(e) => setEditPointValue(e.target.value)}
              placeholder="輸入點數（0=免費試閱）"
            />
            <p className="text-xs text-muted-foreground mt-2">
              提示：0 = 免費試閱，1~50 = 精選付費，51 以上 = 班內生專用
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPointDialog(prev => ({ ...prev, open: false }))}>
              取消
            </Button>
            <Button
              onClick={() => updatePointCostMutation.mutate({ id: editPointDialog.materialId, pointCost: parseInt(editPointValue) || 0 })}
              disabled={updatePointCostMutation.isPending}
            >
              {updatePointCostMutation.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
