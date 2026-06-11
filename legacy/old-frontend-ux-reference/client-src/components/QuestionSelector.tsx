/**
 * 考卷題目選擇器組件
 * 功能：從已審核考題中選擇題目添加到考卷
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface QuestionSelectorProps {
  examId: number;
  examTitle: string;
  examSubject?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuestionSelector({
  examId,
  examTitle,
  examSubject,
  isOpen,
  onClose,
  onSuccess,
}: QuestionSelectorProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  // 如果考卷有科目，自動設定為該科目，否則為 "all"
  const [filterSubject, setFilterSubject] = useState<string>(examSubject || "all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  // 查詢所有考題（不限制狀態）
  const { data: questions } = trpc.exam.getAllQuestions.useQuery({
    subject: filterSubject === "all" ? undefined : filterSubject,
    year: filterYear === "all" ? undefined : parseInt(filterYear),
    questionType: filterType === "all" ? undefined : filterType,
    searchKeyword: searchKeyword || undefined,
  });

  // 查詢考卷已有的題目
  const { data: existingQuestions, refetch: refetchExistingQuestions } =
    trpc.practiceExams.getQuestions.useQuery({ practiceExamId: examId });

  // 添加題目到考卷
  const addQuestions = trpc.practiceExams.batchAddQuestions.useMutation({
    onSuccess: () => {
      toast.success(`成功添加 ${selectedQuestions.length} 題到考卷！`);
      setSelectedQuestions([]);
      refetchExistingQuestions();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`添加失敗：${error.message}`);
    },
  });

  const handleAddQuestions = () => {
    if (selectedQuestions.length === 0) {
      toast.error("請至少選擇一題");
      return;
    }

    addQuestions.mutate({
      practiceExamId: examId,
      questionIds: selectedQuestions,
    });
  };

  const toggleQuestion = (questionId: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const existingQuestionIds = existingQuestions?.map((q) => q.id) || [];
  const availableQuestions = questions?.filter(
    (q) => !existingQuestionIds.includes(q.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>為「{examTitle}」添加題目</DialogTitle>
        </DialogHeader>

        {/* 搜尋和篩選 */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜尋題目內容..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部科目</SelectItem>
                <SelectItem value="國文">國文</SelectItem>
                <SelectItem value="英文">英文</SelectItem>
                <SelectItem value="法學知識">法學知識</SelectItem>
                <SelectItem value="行政法">行政法</SelectItem>
                <SelectItem value="民法">民法</SelectItem>
                <SelectItem value="刑法">刑法</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue placeholder="年度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年度</SelectItem>
                {[2024, 2023, 2022, 2021, 2020].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="題型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部題型</SelectItem>
                <SelectItem value="single_choice">單選題</SelectItem>
                <SelectItem value="multiple_choice">複選題</SelectItem>
                <SelectItem value="essay">申論題</SelectItem>
                <SelectItem value="fill_in_blank">填空題</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 題目列表 */}
        <div className="border rounded-lg">
          <div className="max-h-[400px] overflow-y-auto">
            {availableQuestions?.map((question) => (
              <div
                key={question.id}
                className="p-4 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer flex items-start gap-3"
                onClick={() => toggleQuestion(question.id)}
              >
                <Checkbox
                  checked={selectedQuestions.includes(question.id)}
                  onCheckedChange={() => toggleQuestion(question.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">
                      {question.questionNumberInPdf ? `第 ${question.questionNumberInPdf} 題` : `#${question.id}`}
                    </span>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {question.questionType === "single_choice" && "單選題"}
                      {question.questionType === "multiple_choice" && "複選題"}
                      {question.questionType === "essay" && "申論題"}
                      {question.questionType === "fill_in_blank" && "填空題"}
                    </span>
                    {question.subject && (
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {question.subject}
                      </span>
                    )}
                    {question.year && (
                      <span className="text-xs text-muted-foreground">
                        {question.year} 年
                      </span>
                    )}
                  </div>
                  <div
                    className="text-sm line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: question.questionText || "" }}
                  />
                </div>
              </div>
            ))}

            {!availableQuestions || availableQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                沒有符合條件的題目
              </div>
            ) : null}
          </div>
        </div>

        {/* 底部操作欄 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            已選擇 {selectedQuestions.length} 題
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={handleAddQuestions}
              disabled={selectedQuestions.length === 0 || addQuestions.isPending}
            >
              {addQuestions.isPending ? "添加中..." : `添加 ${selectedQuestions.length} 題`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
