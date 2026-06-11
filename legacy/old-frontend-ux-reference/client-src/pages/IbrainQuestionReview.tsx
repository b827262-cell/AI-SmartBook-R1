import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * iBrain 題目審核頁面
 * 
 * 功能：
 * - 查看資料包中的題目列表
 * - 批次審核題目（批准/拒絕）
 * - 查看題目詳情
 */

export default function IbrainQuestionReview() {
  const [, setLocation] = useLocation();
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  
  // 從 URL 獲取 packageId
  const packageId = parseInt(new URLSearchParams(window.location.search).get("packageId") || "0");
  
  if (!packageId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              無效的資料包 ID
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setLocation("/admin/ibrain-packages")}>
                返回資料包列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 查詢資料包詳情
  const packageQuery = trpc.ibrainPackage.getById.useQuery({ id: packageId });
  
  // 批次批准 mutation
  const approveMutation = trpc.ibrainPackage.approveQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(`已批准 ${data.count} 題`);
      setSelectedQuestions(new Set());
      packageQuery.refetch();
    },
    onError: (error) => {
      toast.error(`批准失敗：${error.message}`);
    },
  });
  
  // 批次拒絕 mutation
  const rejectMutation = trpc.ibrainPackage.rejectQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(`已拒絕 ${data.count} 題`);
      setSelectedQuestions(new Set());
      packageQuery.refetch();
    },
    onError: (error) => {
      toast.error(`拒絕失敗：${error.message}`);
    },
  });
  
  // 處理全選
  const handleSelectAll = (checked: boolean) => {
    if (checked && packageQuery.data) {
      const allIds = new Set(
        packageQuery.data.questions
          .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
          .map(q => q.id)
      );
      setSelectedQuestions(allIds);
    } else {
      setSelectedQuestions(new Set());
    }
  };
  
  // 處理單選
  const handleSelectQuestion = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedQuestions);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedQuestions(newSelected);
  };
  
  // 批次批准
  const handleBatchApprove = async () => {
    if (selectedQuestions.size === 0) {
      toast.error("請選擇要批准的題目");
      return;
    }
    
    await approveMutation.mutateAsync({
      questionIds: Array.from(selectedQuestions),
    });
  };
  
  // 批次拒絕
  const handleBatchReject = async () => {
    if (selectedQuestions.size === 0) {
      toast.error("請選擇要拒絕的題目");
      return;
    }
    
    if (!confirm(`確定要拒絕 ${selectedQuestions.size} 題嗎？`)) {
      return;
    }
    
    await rejectMutation.mutateAsync({
      questionIds: Array.from(selectedQuestions),
    });
  };
  
  // 狀態標籤
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />已批准</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />已拒絕</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />待審核</Badge>;
    }
  };
  
  // 題目類型標籤
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return <Badge variant="outline">選擇題</Badge>;
      case "essay":
        return <Badge variant="outline">申論題</Badge>;
      case "short_answer":
        return <Badge variant="outline">簡答題</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };
  
  if (packageQuery.isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">載入中...</p>
      </div>
    );
  }
  
  if (packageQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-red-500">
              載入失敗：{packageQuery.error.message}
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setLocation("/admin/ibrain-packages")}>
                返回資料包列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const pkg = packageQuery.data?.package;
  const questions = packageQuery.data?.questions || [];
  const totalPages = Math.ceil(questions.length / pageSize);
  const currentQuestions = questions.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  
  return (
    <div className="container mx-auto py-8">
      {/* 標題和返回按鈕 */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setLocation("/admin/ibrain-packages")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          返回資料包列表
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">題目審核</h1>
        {pkg && (
          <div className="text-muted-foreground space-y-1">
            <p>資料包：{pkg.fileName}</p>
            {pkg.metadata?.examName && <p>考試：{pkg.metadata.examName}</p>}
            <p>總題數：{questions.length} 題</p>
          </div>
        )}
      </div>
      
      {/* 批次操作工具列 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedQuestions.size === currentQuestions.length && currentQuestions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                已選擇 {selectedQuestions.size} 題
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleBatchApprove}
                disabled={selectedQuestions.size === 0}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                批次批准
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchReject}
                disabled={selectedQuestions.size === 0}
              >
                <XCircle className="w-4 h-4 mr-1" />
                批次拒絕
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 題目列表 */}
      <div className="space-y-4">
        {currentQuestions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedQuestions.has(question.id)}
                    onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-base">
                        第 {currentPage * pageSize + index + 1} 題
                      </CardTitle>
                      {getTypeBadge(question.questionType)}
                      {getStatusBadge(question.status)}
                    </div>
                    <CardDescription className="whitespace-pre-wrap">
                      {question.questionText}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {question.questionType === "multiple_choice" && (
              <CardContent>
                <div className="space-y-2">
                  {question.optionA && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[2rem]">A.</span>
                      <span className={question.correctAnswer === "A" ? "text-green-600 font-medium" : ""}>
                        {question.optionA}
                      </span>
                    </div>
                  )}
                  {question.optionB && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[2rem]">B.</span>
                      <span className={question.correctAnswer === "B" ? "text-green-600 font-medium" : ""}>
                        {question.optionB}
                      </span>
                    </div>
                  )}
                  {question.optionC && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[2rem]">C.</span>
                      <span className={question.correctAnswer === "C" ? "text-green-600 font-medium" : ""}>
                        {question.optionC}
                      </span>
                    </div>
                  )}
                  {question.optionD && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[2rem]">D.</span>
                      <span className={question.correctAnswer === "D" ? "text-green-600 font-medium" : ""}>
                        {question.optionD}
                      </span>
                    </div>
                  )}
                  
                  {question.correctAnswer && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-green-600">
                        正確答案：{question.correctAnswer}
                      </p>
                    </div>
                  )}
                  
                  {question.explanation && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">解析：</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      
      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一頁
          </Button>
          
          <span className="text-sm text-muted-foreground">
            第 {currentPage + 1} / {totalPages} 頁
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
          >
            下一頁
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
