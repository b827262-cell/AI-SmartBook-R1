import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ========================
// 檢核表項目定義
// ========================
const CHECKLIST_ITEMS = [
  // ── AI 助教前台 ──
  { id: "ai_1", category: "AI 助教", item: "進入 AI 助教頁面，畫面正常載入，無錯誤訊息" },
  { id: "ai_2", category: "AI 助教", item: "輸入問題後，AI 能正常回覆（不超過 30 秒）" },
  { id: "ai_3", category: "AI 助教", item: "AI 回覆內容與問題相關，答案合理正確" },
  { id: "ai_4", category: "AI 助教", item: "AI 回覆支援 Markdown 格式（粗體、條列等）正常顯示" },
  { id: "ai_5", category: "AI 助教", item: "對話記錄可正常捲動，歷史訊息不消失" },
  { id: "ai_6", category: "AI 助教", item: "連續提問多次，AI 能記住對話上下文" },
  { id: "ai_7", category: "AI 助教", item: "AI 回覆參考來源格式正確（如：參考來源:知識庫: XXX）" },
  { id: "ai_8", category: "AI 助教", item: "在手機/平板上，AI 助教介面可正常使用" },

  // ── 智能書本 - 基本功能 ──
  { id: "sb_1", category: "智能書本", item: "書本列表正常顯示，封面圖片載入正確" },
  { id: "sb_2", category: "智能書本", item: "點擊書本後，章節目錄正常顯示" },
  { id: "sb_3", category: "智能書本", item: "書本驗證流程正常（輸入答案可解鎖）" },
  { id: "sb_4", category: "智能書本", item: "驗證成功後，積分正確增加（+50點）" },
  { id: "sb_5", category: "智能書本", item: "連續驗證錯誤 3 次後，系統正確鎖定輸入" },

  // ── 智能書本 - 精選考題 ──
  { id: "sq_1", category: "精選考題", item: "精選考題頁面正常載入，題目清單顯示正確" },
  { id: "sq_2", category: "精選考題", item: "點擊題目可展開查看答案（扣點機制正常）" },
  { id: "sq_3", category: "精選考題", item: "搜尋功能可正常篩選題目" },
  { id: "sq_4", category: "精選考題", item: "題目可正常收藏加入筆記本" },

  // ── 智能書本 - 精選簡答 ──
  { id: "qa_1", category: "精選簡答", item: "精選簡答頁面有「講義精選問答」和「歷屆考題簡答」兩個 Tab" },
  { id: "qa_2", category: "精選簡答", item: "講義精選問答：展開問題可看到答案（扣點正常）" },
  { id: "qa_3", category: "精選簡答", item: "歷屆考題簡答：點「開始練習」後隨機出題正常" },
  { id: "qa_4", category: "精選簡答", item: "簡答題：輸入答案後提交，AI 批改結果正常顯示" },
  { id: "qa_5", category: "精選簡答", item: "簡答題：批改後可看到標準答案對照" },
  { id: "qa_6", category: "精選簡答", item: "簡答題：可收藏題目並加入筆記" },
  { id: "qa_7", category: "精選簡答", item: "簡答題：可手動加入錯題本" },

  // ── 智能書本 - 考古題 ──
  { id: "ex_1", category: "考古題", item: "考古題列表正常顯示（題數、年份、考試名稱）" },
  { id: "ex_2", category: "考古題", item: "可選擇練習題數（10/20/30/全部）" },
  { id: "ex_3", category: "考古題", item: "選擇題練習：題目和 ABCD 選項正常顯示" },
  { id: "ex_4", category: "考古題", item: "選擇題練習：選擇答案後立即顯示對錯" },
  { id: "ex_5", category: "考古題", item: "選擇題練習：答錯後可查看解析說明" },
  { id: "ex_6", category: "考古題", item: "選擇題練習：可收藏題目並加入筆記" },
  { id: "ex_7", category: "考古題", item: "答錯的題目自動加入錯題本" },

  // ── 智能書本 - 收藏筆記 ──
  { id: "nb_1", category: "收藏筆記", item: "收藏筆記頁面正常顯示已收藏的題目" },
  { id: "nb_2", category: "收藏筆記", item: "筆記內容可正常編輯和儲存" },
  { id: "nb_3", category: "收藏筆記", item: "可刪除收藏的筆記" },

  // ── 智能書本 - 錯題本 ──
  { id: "wb_1", category: "錯題本", item: "錯題本正常顯示答錯的題目" },
  { id: "wb_2", category: "錯題本", item: "可重新練習錯題" },
  { id: "wb_3", category: "錯題本", item: "標記已解決後，題目從錯題本移除" },

  // ── 積分系統 ──
  { id: "pt_1", category: "積分系統", item: "我的點數頁面正常顯示目前積分" },
  { id: "pt_2", category: "積分系統", item: "每日積分上限機制正常（不超過上限）" },
  { id: "pt_3", category: "積分系統", item: "積分不足時，系統正確提示無法繼續" },
];

type ItemStatus = "pass" | "fail" | "na" | "untested";

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  status: ItemStatus;
  note: string;
}

const STATUS_CONFIG = {
  pass: { label: "✅ 通過", color: "bg-green-100 text-green-700 border-green-300" },
  fail: { label: "❌ 失敗", color: "bg-red-100 text-red-700 border-red-300" },
  na: { label: "➖ 不適用", color: "bg-gray-100 text-gray-500 border-gray-300" },
  untested: { label: "⬜ 未測試", color: "bg-white text-gray-400 border-gray-200" },
};

export function ChecklistWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "done">("form");
  const [testedModule, setTestedModule] = useState<"ai_tutor" | "smart_book" | "both">("both");
  const [overallRating, setOverallRating] = useState<number>(0);
  const [overallComment, setOverallComment] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>(
    CHECKLIST_ITEMS.map(i => ({ ...i, status: "untested" as ItemStatus, note: "" }))
  );
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const submitMutation = trpc.checklist.submit.useMutation({
    onSuccess: () => {
      setStep("done");
    },
    onError: (err) => {
      toast.error("提交失敗：" + err.message);
    },
  });

  if (!user) return null;

  const categories = Array.from(new Set(CHECKLIST_ITEMS.map(i => i.category)));
  const passCount = items.filter(i => i.status === "pass").length;
  const failCount = items.filter(i => i.status === "fail").length;
  const untestedCount = items.filter(i => i.status === "untested").length;
  const totalTested = items.filter(i => i.status !== "untested").length;

  function setStatus(id: string, status: ItemStatus) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  function setNote(id: string, note: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, note } : i));
  }

  function handleSubmit() {
    submitMutation.mutate({
      testedModule,
      overallRating: overallRating || undefined,
      overallComment: overallComment || undefined,
      checklistItems: items.map(i => ({
        id: i.id,
        category: i.category,
        item: i.item,
        status: i.status,
        note: i.note || undefined,
      })),
    });
  }

  function handleReset() {
    setStep("form");
    setItems(CHECKLIST_ITEMS.map(i => ({ ...i, status: "untested" as ItemStatus, note: "" })));
    setOverallRating(0);
    setOverallComment("");
    setExpandedNote(null);
  }

  return (
    <>
      {/* 浮動按鈕（暫時隱藏） */}
      {/* <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all"
        title="填寫網站測試檢核表"
      >
        <span>📋</span>
        <span className="hidden sm:inline">測試回饋</span>
      </button> */}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {step === "done" ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold mb-2">感謝您的回饋！</h2>
              <p className="text-gray-500 mb-6">您的測試結果已成功提交，管理員將會查看並跟進問題。</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleReset}>再填一次</Button>
                <Button onClick={() => setOpen(false)}>關閉</Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  📋 網站功能測試檢核表
                </DialogTitle>
                <p className="text-sm text-gray-500">請依序測試各功能，標記通過/失敗，並可附上問題說明</p>
              </DialogHeader>

              {/* 測試模組選擇 */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-medium mb-2">本次測試範圍：</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "both", label: "🔍 全部功能" },
                    { value: "ai_tutor", label: "🤖 AI 助教" },
                    { value: "smart_book", label: "📚 智能書本" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTestedModule(opt.value as any)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        testedModule === opt.value
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 進度統計 */}
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">✅ 通過 {passCount}</span>
                <span className="text-red-600 font-medium">❌ 失敗 {failCount}</span>
                <span className="text-gray-400">⬜ 未測試 {untestedCount}</span>
                <span className="text-gray-500 ml-auto">已測 {totalTested}/{items.length}</span>
              </div>

              {/* 進度條 */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${(totalTested / items.length) * 100}%` }}
                />
              </div>

              {/* 各分類項目 */}
              {categories.map(category => {
                const categoryItems = items.filter(i => i.category === category);
                return (
                  <div key={category} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h3 className="font-semibold text-sm text-gray-700">{category}</h3>
                    </div>
                    <div className="divide-y">
                      {categoryItems.map(item => (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 text-sm text-gray-700 pt-0.5">{item.item}</div>
                            <div className="flex gap-1 shrink-0">
                              {(["pass", "fail", "na"] as ItemStatus[]).map(s => (
                                <button
                                  key={s}
                                  onClick={() => setStatus(item.id, item.status === s ? "untested" : s)}
                                  className={`px-2 py-1 text-xs rounded border transition-all ${
                                    item.status === s
                                      ? STATUS_CONFIG[s].color
                                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                                  }`}
                                >
                                  {s === "pass" ? "✅" : s === "fail" ? "❌" : "➖"}
                                </button>
                              ))}
                              <button
                                onClick={() => setExpandedNote(expandedNote === item.id ? null : item.id)}
                                className={`px-2 py-1 text-xs rounded border transition-all ${
                                  item.note ? "bg-yellow-50 text-yellow-600 border-yellow-300" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                                }`}
                                title="新增備註"
                              >
                                ✏️
                              </button>
                            </div>
                          </div>
                          {expandedNote === item.id && (
                            <div className="mt-2">
                              <Textarea
                                placeholder="描述問題或補充說明..."
                                value={item.note}
                                onChange={e => setNote(item.id, e.target.value)}
                                className="text-sm h-16 resize-none"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* 整體評分 */}
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">整體使用體驗評分</p>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setOverallRating(n)}
                      className={`text-2xl transition-all ${n <= overallRating ? "opacity-100" : "opacity-30"}`}
                    >
                      ⭐
                    </button>
                  ))}
                  {overallRating > 0 && (
                    <span className="text-sm text-gray-500 self-center ml-1">
                      {["", "很差", "較差", "普通", "不錯", "很好"][overallRating]}
                    </span>
                  )}
                </div>
                <Textarea
                  placeholder="其他意見或建議（選填）..."
                  value={overallComment}
                  onChange={e => setOverallComment(e.target.value)}
                  className="text-sm h-20 resize-none"
                />
              </div>

              {/* 提交按鈕 */}
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>稍後再填</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {submitMutation.isPending ? "提交中..." : "📤 提交回饋"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
