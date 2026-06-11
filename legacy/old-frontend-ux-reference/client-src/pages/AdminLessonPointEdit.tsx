import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookMarked, Eye, EyeOff, Upload, X, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AdminLessonPointEdit() {
  const params = useParams<{ bookId?: string; lessonPointId?: string }>();
  const [, navigate] = useLocation();

  const bookId = parseInt(params.bookId || "0");
  const lessonPointId = parseInt(params.lessonPointId || "0");
  const isNew = lessonPointId === 0;

  // 表單
  const [form, setForm] = useState({
    explanation: "",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A" as "A" | "B" | "C" | "D",
    hint: "",
    imageUrl: "",
    imageHint: "",
    sortOrder: 0,
    isPublished: false,
    sourcePage: 0,
    chapterId: 0,
  });
  const [imagePreview, setImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 取得書本資料（含 pdfUrl）
  const { data: chaptersData } = trpc.smartBookStudent.getChapters.useQuery(
    { bookId },
    { enabled: bookId > 0 }
  );
  const chapters = chaptersData?.chapters ?? [];

  // 取得知識點資料（編輯模式）
  const { data: lessonPointData, isLoading } = trpc.lessonPointsAdmin.getById.useQuery(
    { id: lessonPointId },
    { enabled: lessonPointId > 0 }
  );

  // 載入知識點資料到表單
  useEffect(() => {
    if (lessonPointData) {
      const lp = lessonPointData as any;
      const opts = Array.isArray(lp.options)
        ? lp.options.filter((o: string) => !o.includes("我還不太懂"))
        : (typeof lp.options === "string" ? JSON.parse(lp.options || "[]") : []).filter((o: string) => !o.includes("我還不太懂"));
      const letters = ["A", "B", "C", "D"] as const;
      setForm({
        explanation: lp.explanation || "",
        question: lp.question || "",
        optionA: opts[0] || "",
        optionB: opts[1] || "",
        optionC: opts[2] || "",
        optionD: opts[3] || "",
        correctOption: letters[lp.correctIndex ?? 0] || "A",
        hint: lp.hint || "",
        imageUrl: lp.imageUrl || "",
        imageHint: lp.imageHint || "",
        sortOrder: lp.sortOrder || 0,
        isPublished: lp.isPublished === 1,
        sourcePage: lp.sourcePage || 0,
        chapterId: lp.chapterId || 0,
      });
      setImagePreview(lp.imageUrl || "");
      if (lp.sourcePage > 0) setCurrentPdfPage(lp.sourcePage);
    }
  }, [lessonPointData]);

  const createMutation = trpc.lessonPointsAdmin.create.useMutation({
    onSuccess: () => { toast.success("知識點已新增"); navigate(`/admin/smart-book-unit-qa/${bookId}`); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.lessonPointsAdmin.update.useMutation({
    onSuccess: () => { toast.success("知識點已儲存"); navigate(`/admin/smart-book-unit-qa/${bookId}`); },
    onError: (e) => toast.error(e.message),
  });
  const uploadImageMutation = trpc.lessonPointsAdmin.uploadLessonImage.useMutation({
    onSuccess: (data: any) => {
      setForm(f => ({ ...f, imageUrl: data.url }));
      setImagePreview(data.url);
      setIsUploadingImage(false);
      toast.success("圖片上傳成功");
    },
    onError: (e) => { setIsUploadingImage(false); toast.error(e.message); },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadImageMutation.mutate({ lessonPointId: lessonPointId || 0, imageBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const opts = [form.optionA, form.optionB, form.optionC, form.optionD].filter(Boolean);
    const correctIndex = letterToIndex[form.correctOption] ?? 0;
    if (!form.explanation || !form.question || opts.length < 2) {
      toast.error("請填寫講解、問題和至少 2 個選項");
      return;
    }
    if (isNew) {
      createMutation.mutate({
        chapterId: form.chapterId || (chapters?.[0]?.id ?? 0),
        bookId,
        explanation: form.explanation,
        question: form.question,
        options: opts,
        correctIndex,
        hint: form.hint || null,
        imageUrl: form.imageUrl || null,
        imageHint: form.imageHint || null,
        needsImage: false,
        sourcePage: form.sourcePage || null,
      });
    } else {
      updateMutation.mutate({
        id: lessonPointId,
        explanation: form.explanation,
        question: form.question,
        options: opts,
        correctIndex,
        hint: form.hint || null,
        imageUrl: form.imageUrl || null,
        imageHint: form.imageHint || null,
        sortOrder: form.sortOrder,
        isPublished: form.isPublished,
        sourcePage: form.sourcePage || null,
      });
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* 頂部標題列 */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
        <button
          onClick={() => navigate(`/admin/smart-book-unit-qa/${bookId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回備課頁
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <BookMarked className="w-5 h-5 text-indigo-600" />
        <span className="font-semibold text-gray-800">
          {isNew ? "新增知識點" : "編輯知識點"}
        </span>
        {chaptersData?.book?.title && (
          <span className="text-sm text-gray-400">— {chaptersData.book.title}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/smart-book-unit-qa/${bookId}`)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" />儲存中...</>
            ) : (
              isNew ? "新增知識點" : "儲存修改"
            )}
          </Button>
        </div>
      </div>

      {/* 主體內容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 編輯表單（全寬） */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4 max-w-xl">

              {/* 章節選擇（新增時顯示） */}
              {isNew && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    所屬章節 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.chapterId?.toString() || ""}
                    onValueChange={(v) => setForm(f => ({ ...f, chapterId: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇章節" />
                    </SelectTrigger>
                    <SelectContent>
                      {(chapters || []).map((ch: any, chIdx: number) => (
                        <SelectItem key={ch.id} value={String(ch.id)}>
                          第 {chIdx + 1} 章：{ch.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 圖片上傳 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  圖片 <span className="text-gray-400 font-normal">（選填，適合圖表多的科目）</span>
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="預覽" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
                    <button
                      onClick={() => { setImagePreview(""); setForm(f => ({ ...f, imageUrl: "" })); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    {isUploadingImage ? (
                      <><Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-1" /><span className="text-xs text-gray-500">上傳中...</span></>
                    ) : (
                      <><Upload className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-500">點擊上傳圖表截圖</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </label>
                )}
                <div className="mt-2">
                  <Input
                    placeholder="圖片說明提示（選填，例如：第三章供需曲線圖）"
                    value={form.imageHint}
                    onChange={e => setForm(f => ({ ...f, imageHint: e.target.value }))}
                  />
                </div>
              </div>

              {/* 家教口吻講解 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  家教口吻講解 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">（2～4 句，口語化說明重點）</span>
                </label>
                <Textarea
                  placeholder="例如：成本原則說明資產要用當初買的時候花的錢來記，不是現在的市值..."
                  value={form.explanation}
                  onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* 引導問題 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  引導問題 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">（「你覺得...」語氣）</span>
                </label>
                <Input
                  placeholder="例如：那你覺得，為什麼會計要用當初買的成本來記，而不是現在的市值呢？"
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                />
              </div>

              {/* 選項設計 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  選項設計 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">（點擊字母設定正確答案）</span>
                </label>
                <div className="space-y-2">
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <button
                        onClick={() => setForm(f => ({ ...f, correctOption: key }))}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${form.correctOption === key ? "bg-green-500 border-green-500 text-white" : "border-gray-300 text-gray-500 hover:border-green-400"}`}
                      >
                        {key}
                      </button>
                      <Input
                        placeholder={`選項 ${key} 的內容`}
                        value={form[`option${key}` as keyof typeof form] as string}
                        onChange={e => setForm(f => ({ ...f, [`option${key}`]: e.target.value }))}
                        className={form.correctOption === key ? "border-green-300 bg-green-50" : ""}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">系統會自動加入「我還不懂，再解釋一次」選項</p>
              </div>

              {/* 暗示提示 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  暗示提示 <span className="text-gray-400 font-normal">（選填，答錯時顯示給學生的暗示，不直接給答案）</span>
                </label>
                <Input
                  placeholder="例如：提示一下，想想「客觀」是什麼意思？為什麼会計要用「成本」而不是「市値」來記載？"
                  value={form.hint}
                  onChange={e => setForm(f => ({ ...f, hint: e.target.value }))}
                />
              </div>

              {/* PDF 來源頁數 + 排序 + 發布 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">📄 PDF 來源頁數</label>
                  <Input
                    type="number" min={1} placeholder="頁碼"
                    value={form.sourcePage || ""}
                    onChange={e => {
                      const page = parseInt(e.target.value) || 0;
                      setForm(f => ({ ...f, sourcePage: page }));
                      if (page > 0) setCurrentPdfPage(page);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">排序數字（小的在前）</label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${form.isPublished ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                  >
                    {form.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {form.isPublished ? "已發布" : "草稿"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
