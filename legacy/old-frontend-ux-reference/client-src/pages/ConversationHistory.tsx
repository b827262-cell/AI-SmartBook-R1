import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageCircle, Trash2, Edit3, Save, X, Search, Calendar, BookOpen, FileText, List, Grid } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";
import { RichTextRenderer } from "@/components/RichTextRenderer";

export default function ConversationHistory() {
  // 清理 HTML 標籤並提取圖片 URL
  const cleanHtmlAndExtractImages = (html: string): { text: string; images: string[] } => {
    if (!html) return { text: '', images: [] };
    
    // 提取圖片 URL
    const images: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    // 移除所有 HTML 標籤並保留換行
    const text = html
      .replace(/<br\s*\/?>/gi, '\n') // 將 <br> 轉換為換行
      .replace(/<\/p>/gi, '\n') // 將 </p> 轉換為換行
      .replace(/<[^>]+>/g, '') // 移除所有 HTML 標籤
      .replace(/&nbsp;/g, ' ') // 替換非斷空格
      .replace(/&lt;/g, '<') // 解碼 HTML 實體
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/^[#*\-]+\s*/gm, '') // 移除行首的 Markdown 符號（#, *, -）
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗體 Markdown 符號
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜體 Markdown 符號
      .replace(/\([a-zà-ü\s]+\)/gi, '') // 移除拼音（括號內的小寫字母和音調符號）
      .replace(/（[a-zà-ü\s]+）/gi, '') // 移除拼音（中文括號）
      .replace(/\n{3,}/g, '\n\n') // 將多個換行減少為最多兩個
      .trim();
    
    return { text, images };
  };

  const [viewMode, setViewMode] = useState<"timeline" | "exams">("timeline");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [labelFilter, setLabelFilter] = useState<"all" | "none" | "understood" | "review" | "important">("all");

  // 查詢對話紀錄列表（按時間排序）
  const { data: conversations, refetch: refetchConversations } = trpc.questionLearning.searchConversations.useQuery(
    {
      keyword: searchKeyword || undefined,
      timeRange: "all",
      limit: 50,
      offset: 0,
    },
    { enabled: viewMode === "timeline" }
  );

  // 查詢討論過的考卷列表
  const { data: discussedExams, refetch: refetchExams } = trpc.questionLearning.getDiscussedExams.useQuery(
    undefined,
    { enabled: viewMode === "exams" }
  );

  // 查詢特定考卷的對話列表
  const { data: examConversations, refetch: refetchExamConversations } = trpc.questionLearning.getExamConversations.useQuery(
    { examId: selectedExamId!, labelFilter },
    { enabled: !!selectedExamId }
  );

  // 查詢對話詳情
  const { data: conversationDetail, refetch: refetchDetail } = trpc.questionLearning.getConversationDetail.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  // 更新筆記
  const updateNotesMutation = trpc.questionLearning.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("筆記已保存");
      setIsEditingNotes(false);
      refetchDetail();
    },
    onError: (error) => {
      toast.error(`保存筆記失敗：${error.message}`);
    },
  });

  // 更新對話標籤
  const updateLabelMutation = trpc.examPractice.updateConversationLabel.useMutation({
    onSuccess: () => {
      toast.success("標籤已更新");
      refetchExamConversations();
      refetchConversations();
    },
    onError: (error) => {
      toast.error(`更新標籤失敗：${error.message}`);
    },
  });

  // 刪除對話
  const deleteConversationMutation = trpc.questionLearning.deleteConversation.useMutation({
    onSuccess: () => {
      toast.success("對話已刪除");
      setShowDetailDialog(false);
      setSelectedConversationId(null);
      refetchConversations();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 當選擇對話時，打開詳情 Dialog
  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setShowDetailDialog(true);
  };

  // 當對話詳情載入時，設置筆記內容
  useEffect(() => {
    if (conversationDetail) {
      setNotes(conversationDetail.conversation.notes || "");
    }
  }, [conversationDetail]);

  // 保存筆記
  const handleSaveNotes = () => {
    if (selectedConversationId) {
      updateNotesMutation.mutate({
        conversationId: selectedConversationId,
        notes: notes || undefined,
      });
    }
  };

  // 刪除對話
  const handleDeleteConversation = () => {
    if (selectedConversationId && confirm("確定要刪除這個對話紀錄嗎？")) {
      deleteConversationMutation.mutate({
        conversationId: selectedConversationId,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📖 對話紀錄</h1>
          <p className="text-gray-600">查看您與 AI 的所有學習對話</p>
        </div>

        {/* 視圖切換 */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timeline" | "exams")} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              按時間排序
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex items-center gap-2">
              <Grid className="w-4 h-4" />
              按考卷分組
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 搜尋欄（只在時間排序視圖顯示） */}
        {viewMode === "timeline" && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="搜尋題目或對話內容..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10 py-6 text-lg"
              />
            </div>
          </div>
        )}

        {/* 對話紀錄列表（按時間排序） */}
        {viewMode === "timeline" && (
          <div className="space-y-4">
            {conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg text-gray-900">
                        第 {conv.questionNumber || "?"} 題
                      </h3>
                      </div>
                      <p className="text-gray-700 mb-3 line-clamp-2">{conv.questionText}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(conv.lastMessageTime).toLocaleDateString("zh-TW")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{conv.messageCount} 則訊息</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectConversation(conv.id);
                      }}
                    >
                      <FileText className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">還沒有保存的對話紀錄</p>
                <p className="text-gray-400 mt-2">在考試練習中與 AI 對話後，點擊「保存此次對話」即可保存</p>
              </Card>
            )}
          </div>
        )}

        {/* 討論過的考卷列表（按考卷分組） */}
        {viewMode === "exams" && !selectedExamId && (
          <div className="space-y-4">
            {discussedExams && discussedExams.length > 0 ? (
              discussedExams.map((exam) => (
                <Card
                  key={exam.examId}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500"
                  onClick={() => setSelectedExamId(exam.examId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-lg text-gray-900">
                          {exam.examTitle}
                        </h3>
                      </div>
                      <p className="text-gray-700 mb-3">{exam.examSubject}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>最後討論：{new Date(exam.lastDiscussedAt).toLocaleDateString("zh-TW")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{exam.questionCount} 道題目</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">還沒有討論過任何考卷</p>
                <p className="text-gray-400 mt-2">在考試練習中與 AI 對話後，點擊「保存此次對話」即可保存</p>
              </Card>
            )}
          </div>
        )}

        {/* 考卷內的題目列表 */}
        {viewMode === "exams" && selectedExamId && (
          <div>
            {/* 返回按鈕 */}
            <Button
              variant="outline"
              onClick={() => setSelectedExamId(null)}
              className="mb-4"
            >
              ← 返回考卷列表
            </Button>

            {/* 標籤篩選 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                variant={labelFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setLabelFilter("all")}
              >
                全部
              </Button>
              <Button
                variant={labelFilter === "none" ? "default" : "outline"}
                size="sm"
                onClick={() => setLabelFilter("none")}
              >
                未標記
              </Button>
              <Button
                variant={labelFilter === "understood" ? "default" : "outline"}
                size="sm"
                onClick={() => setLabelFilter("understood")}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                ✅ 已理解
              </Button>
              <Button
                variant={labelFilter === "review" ? "default" : "outline"}
                size="sm"
                onClick={() => setLabelFilter("review")}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                📝 需複習
              </Button>
              <Button
                variant={labelFilter === "important" ? "default" : "outline"}
                size="sm"
                onClick={() => setLabelFilter("important")}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                ⭐ 重要
              </Button>
            </div>

            <div className="space-y-4">
              {examConversations && examConversations.length > 0 ? (
                examConversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500"
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-lg text-gray-900">
                            第 {conv.questionNumber} 題
                          </h3>
                        </div>
                        <p className="text-gray-700 mb-3 line-clamp-2">{conv.questionText}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(conv.lastMessageTime).toLocaleDateString("zh-TW")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{conv.messageCount} 則訊息</span>
                          </div>
                          {conv.hasNotes && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <FileText className="w-4 h-4" />
                              <span>有筆記</span>
                            </div>
                          )}
                        </div>
                        {/* 標籤選擇器 */}
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant={conv.label === "understood" ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLabelMutation.mutate({ conversationId: conv.id, label: conv.label === "understood" ? "none" : "understood" });
                            }}
                            className="text-xs"
                          >
                            {conv.label === "understood" ? "✅ 已理解" : "已理解"}
                          </Button>
                          <Button
                            variant={conv.label === "review" ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLabelMutation.mutate({ conversationId: conv.id, label: conv.label === "review" ? "none" : "review" });
                            }}
                            className="text-xs"
                          >
                            {conv.label === "review" ? "📝 需複習" : "需複習"}
                          </Button>
                          <Button
                            variant={conv.label === "important" ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLabelMutation.mutate({ conversationId: conv.id, label: conv.label === "important" ? "none" : "important" });
                            }}
                            className="text-xs"
                          >
                            {conv.label === "important" ? "⭐ 重要" : "重要"}
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectConversation(conv.id);
                        }}
                      >
                        <FileText className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">這個考卷還沒有對話紀錄</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* 對話詳情 Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">對話詳情</DialogTitle>
              <DialogDescription>
                查看完整的題目、對話內容和考卷資訊
              </DialogDescription>
            </DialogHeader>

            {conversationDetail && (
              <div className="space-y-6">
                {/* 考卷資訊 */}
                {conversationDetail.paper && (
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">考卷資訊</h4>
                    </div>
                    <p className="text-blue-800">
                      {conversationDetail.paper.year} 年 - {conversationDetail.paper.title}
                    </p>
                    <p className="text-blue-700 text-sm">{conversationDetail.paper.subject}</p>
                  </Card>
                )}

                {/* 題目內容 */}
                <Card className="p-6 bg-gray-50">
                  <h4 className="font-semibold text-lg mb-3 text-gray-900">
                    第 {conversationDetail.question.questionNumber} 題
                  </h4>
                  <div className="prose max-w-none">
                    <RichTextRenderer 
                      content={conversationDetail.question.questionText} 
                      className="text-lg text-gray-900 leading-relaxed"
                    />
                  </div>

                  {/* 題目圖片 */}
                  {conversationDetail.question.stemImage && (
                    <div className="mt-4">
                      <img 
                        src={conversationDetail.question.stemImage} 
                        alt="題目圖片" 
                        className="max-w-full h-auto rounded-lg border border-gray-300"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  )}

                  {/* 選項 */}
                  {conversationDetail.question.optionA && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-white rounded-lg border">
                        <span className="font-semibold text-gray-700">A. </span>
                        <span className="whitespace-pre-wrap break-words">{cleanHtmlAndExtractImages(conversationDetail.question.optionA).text}</span>
                        {conversationDetail.question.optionAImage && (
                          <img src={conversationDetail.question.optionAImage} alt="選項 A 圖片" className="mt-2 max-w-full h-auto rounded" style={{ maxHeight: '200px' }} />
                        )}
                      </div>
                      {conversationDetail.question.optionB && (
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="font-semibold text-gray-700">B. </span>
                          <span className="whitespace-pre-wrap break-words">{cleanHtmlAndExtractImages(conversationDetail.question.optionB).text}</span>
                          {conversationDetail.question.optionBImage && (
                            <img src={conversationDetail.question.optionBImage} alt="選項 B 圖片" className="mt-2 max-w-full h-auto rounded" style={{ maxHeight: '200px' }} />
                          )}
                        </div>
                      )}
                      {conversationDetail.question.optionC && (
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="font-semibold text-gray-700">C. </span>
                          <span className="whitespace-pre-wrap break-words">{cleanHtmlAndExtractImages(conversationDetail.question.optionC).text}</span>
                          {conversationDetail.question.optionCImage && (
                            <img src={conversationDetail.question.optionCImage} alt="選項 C 圖片" className="mt-2 max-w-full h-auto rounded" style={{ maxHeight: '200px' }} />
                          )}
                        </div>
                      )}
                      {conversationDetail.question.optionD && (
                        <div className="p-3 bg-white rounded-lg border">
                          <span className="font-semibold text-gray-700">D. </span>
                          <span className="whitespace-pre-wrap break-words">{cleanHtmlAndExtractImages(conversationDetail.question.optionD).text}</span>
                          {conversationDetail.question.optionDImage && (
                            <img src={conversationDetail.question.optionDImage} alt="選項 D 圖片" className="mt-2 max-w-full h-auto rounded" style={{ maxHeight: '200px' }} />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 正確答案 */}
                  {conversationDetail.question.correctAnswer && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="font-semibold text-green-800">正確答案：</span>
                      <span className="text-green-700">{conversationDetail.question.correctAnswer}</span>
                    </div>
                  )}
                </Card>

                {/* 對話內容 */}
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-4 text-gray-900">對話內容</h4>
                  <div className="space-y-4">
                    {conversationDetail.conversation.messages.map((msg: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-50 border-l-4 border-l-blue-500"
                            : "bg-gray-50 border-l-4 border-l-gray-400"
                        }`}
                      >
                        <div className="font-semibold text-sm mb-2 text-gray-700">
                          {msg.role === "user" ? "👤 您" : "🤖 AI 助教"}
                        </div>
                        <div className="prose max-w-none">
                          <MarkdownRenderer>{cleanMarkdown(msg.content)}</MarkdownRenderer>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 筆記區域 */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg text-gray-900">📝 筆記</h4>
                    {!isEditingNotes ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        編輯筆記
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingNotes(false);
                            setNotes(conversationDetail.conversation.notes || "");
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={updateNotesMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          保存
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="在這裡記錄您的學習筆記..."
                      className="min-h-[150px]"
                    />
                  ) : (
                    <div className="min-h-[100px] p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      {notes ? (
                        <p className="text-gray-800 whitespace-pre-wrap">{notes}</p>
                      ) : (
                        <p className="text-gray-400 italic">尚未添加筆記</p>
                      )}
                    </div>
                  )}
                </Card>

                {/* 操作按鈕 */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConversation}
                    disabled={deleteConversationMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    刪除對話
                  </Button>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    關閉
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
