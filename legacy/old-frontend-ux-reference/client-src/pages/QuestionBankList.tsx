/**
 * 學生考題列表頁面
 * 顯示所有可用的考題（包括訪問類型和點數）
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Coins, Lock, Unlock, Users, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function QuestionBankList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedAccessType, setSelectedAccessType] = useState<string | undefined>();

  // 獲取啟用的類科列表
  const { data: categories } = trpc.knowledgeBase.getActiveCategories.useQuery();

  // 獲取考題列表
  const { data: questions, isLoading } = trpc.questionBank.listQuestions.useQuery({
    search: searchQuery || undefined,
    category: selectedCategory,
    accessType: selectedAccessType as "free" | "paid" | "class_only" | undefined,
    limit: 50,
  });

  const handleViewQuestion = (questionId: number, accessType: string, requiredCredits: number) => {
    // 檢查點數是否足夠
    if (accessType === "paid" && user) {
      const totalCredits = (user.permanentCredits || 0) + (user.dailyCredits || 0);
      if (totalCredits < requiredCredits) {
        toast.error("點數不足", {
          description: `查看此題需要 ${requiredCredits} 點，您目前有 ${totalCredits} 點`,
        });
        return;
      }
    }

    // 導航到考題詳情頁面（會自動扣點）
    setLocation(`/question/${questionId}`);
  };

  const getAccessTypeBadge = (accessType: string) => {
    switch (accessType) {
      case "free":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Unlock className="w-3 h-3 mr-1" />免費</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Coins className="w-3 h-3 mr-1" />付費</Badge>;
      case "class_only":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Users className="w-3 h-3 mr-1" />班內生專用</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* 標題和點數餘額 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">考題庫</h1>
        {user && (
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
            <Coins className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              剩餘點數：{(user.permanentCredits || 0) + (user.dailyCredits || 0)}
            </span>
          </div>
        )}
      </div>

      {/* 篩選器 */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 搜尋 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="搜尋考題內容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 類科篩選 */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="選擇類科" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部類科</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 訪問類型篩選 */}
          <Select value={selectedAccessType} onValueChange={setSelectedAccessType}>
            <SelectTrigger>
              <SelectValue placeholder="訪問類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部類型</SelectItem>
              <SelectItem value="free">免費</SelectItem>
              <SelectItem value="paid">付費</SelectItem>
              <SelectItem value="class_only">班內生專用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 考題列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">載入中...</p>
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card
              key={question.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewQuestion(question.id, question.accessType, question.requiredCredits)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 標題和標籤 */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {question.category && (
                      <Badge variant="secondary">{question.category}</Badge>
                    )}
                    {getAccessTypeBadge(question.accessType)}
                    {question.accessType === "paid" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Coins className="w-3 h-3 mr-1" />
                        {question.requiredCredits} 點
                      </Badge>
                    )}
                  </div>

                  {/* 題目內容預覽 */}
                  <p className="text-lg font-medium line-clamp-2 mb-2">
                    {question.question}
                  </p>

                  {/* 來源資訊 */}
                  {question.source && (
                    <p className="text-sm text-muted-foreground">
                      來源：{question.source}
                    </p>
                  )}
                </div>

                {/* 查看按鈕 */}
                <Button variant="ghost" size="icon" className="ml-4">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">沒有找到符合條件的考題</p>
        </div>
      )}
    </div>
  );
}
