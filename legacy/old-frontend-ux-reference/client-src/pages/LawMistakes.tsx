import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookX, RefreshCw, CheckCircle2, XCircle, Brain } from "lucide-react";
import { toast } from "sonner";

export default function LawMistakes() {
  const [selectedLaw, setSelectedLaw] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("unlearned");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  // 查詢錯題本
  const { data: mistakesData, refetch } = trpc.lawLearning.getMistakes.useQuery({
    lawName: selectedLaw === "all" ? undefined : selectedLaw,
    difficulty: selectedDifficulty === "all" ? undefined : (selectedDifficulty as any),
    isLearned: activeTab === "learned",
  });

  // 獲取所有法律列表
  const { data: lawsData } = trpc.lawLearning.listLaws.useQuery();

  // 重新生成類似題目
  const regenerateMutation = trpc.lawLearning.regenerateSimilarQuiz.useMutation({
    onSuccess: (data) => {
      setQuizData(data);
      setQuizOpen(true);
      setUserAnswers({});
      setShowResults(false);
      toast.success("已生成類似題目,請開始練習!");
    },
    onError: (error) => {
      toast.error(`生成失敗: ${error.message}`);
    },
  });

  const mistakes = mistakesData?.mistakes || [];

  const difficultyLabels: { [key: string]: string } = {
    basic: "📚 基礎",
    advanced: "🎯 進階",
    comprehensive: "💡 綜合應用",
  };

  const difficultyColors: { [key: string]: "default" | "secondary" | "destructive" } = {
    basic: "default",
    advanced: "secondary",
    comprehensive: "destructive",
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookX className="h-8 w-8 text-destructive" />
          <h1 className="text-3xl font-bold">錯題本</h1>
        </div>
        <p className="text-muted-foreground">
          複習答錯的題目,針對弱點加強練習
        </p>
      </div>

      {/* 篩選器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">法律類別</label>
              <Select value={selectedLaw} onValueChange={setSelectedLaw}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部法規</SelectItem>
                  {lawsData?.laws.map((law) => (
                    <SelectItem key={law} value={law}>
                      {law}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">難度級別</label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部難度</SelectItem>
                  <SelectItem value="basic">📚 基礎題目</SelectItem>
                  <SelectItem value="advanced">🎯 進階題目</SelectItem>
                  <SelectItem value="comprehensive">💡 綜合應用題目</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 錯題列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="unlearned">
            未掌握 ({mistakes.filter((m) => !m.isLearned).length})
          </TabsTrigger>
          <TabsTrigger value="learned">
            已掌握 ({mistakes.filter((m) => m.isLearned).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {mistakes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookX className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">
                  {activeTab === "unlearned" ? "太棒了!目前沒有未掌握的錯題" : "還沒有已掌握的題目"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mistakes.map((mistake) => (
                <Card key={mistake.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={difficultyColors[mistake.difficulty]}>
                            {difficultyLabels[mistake.difficulty]}
                          </Badge>
                          <Badge variant="outline">{mistake.lawName}</Badge>
                          <Badge variant="secondary">
                            錯誤 {mistake.mistakeCount} 次
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{mistake.question}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 選項 */}
                      <div className="space-y-2">
                        {mistake.options.map((option: string, index: number) => {
                          const optionLetter = String.fromCharCode(65 + index);
                          const isCorrect = optionLetter === mistake.correctAnswer;
                          const isUserAnswer = optionLetter === mistake.userAnswer;

                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${
                                isCorrect
                                  ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                                  : isUserAnswer
                                  ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                {isUserAnswer && !isCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                                <span>{option}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 解釋 */}
                      {mistake.explanation && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">📖 詳細解釋:</p>
                          <p className="text-sm">{mistake.explanation}</p>
                        </div>
                      )}

                      {/* 操作按鈕 */}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => regenerateMutation.mutate({ mistakeId: mistake.id })}
                          disabled={regenerateMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          重新生成類似題目
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 測驗對話框 */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>錯題加強練習</DialogTitle>
            <DialogDescription>
              針對您的錯題生成的類似題目,請認真作答
            </DialogDescription>
          </DialogHeader>
          {quizData && (
            <div className="space-y-6">
              {quizData.questions.map((q: any, index: number) => (
                <div key={index} className="space-y-3">
                  <div className="font-medium">
                    {index + 1}. {q.question}
                  </div>
                  <RadioGroup
                    value={userAnswers[index]}
                    onValueChange={(value) =>
                      setUserAnswers({ ...userAnswers, [index]: value })
                    }
                    disabled={showResults}
                  >
                    {q.options.map((option: string, optIndex: number) => {
                      const optionLetter = String.fromCharCode(65 + optIndex);
                      const isCorrect = optionLetter === q.correctAnswer;
                      const isUserAnswer = optionLetter === userAnswers[index];

                      return (
                        <div
                          key={optIndex}
                          className={`flex items-center space-x-2 p-3 rounded-lg border ${
                            showResults
                              ? isCorrect
                                ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                                : isUserAnswer
                                ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                                : ""
                              : "hover:bg-accent"
                          }`}
                        >
                          <RadioGroupItem value={optionLetter} id={`q${index}-${optIndex}`} />
                          <Label htmlFor={`q${index}-${optIndex}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                          {showResults && isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          {showResults && isUserAnswer && !isCorrect && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {showResults && q.explanation && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">📖 詳細解釋:</p>
                      <p className="text-sm">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2">
                {!showResults ? (
                  <Button
                    onClick={() => setShowResults(true)}
                    disabled={Object.keys(userAnswers).length !== quizData.questions.length}
                  >
                    提交答案
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setQuizOpen(false);
                      setQuizData(null);
                      setUserAnswers({});
                      setShowResults(false);
                      refetch();
                    }}
                  >
                    關閉
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
