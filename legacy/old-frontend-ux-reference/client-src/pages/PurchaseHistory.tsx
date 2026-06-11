import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { ArrowLeft, Receipt, Calendar, Coins } from "lucide-react";
import { motion } from "framer-motion";

export default function PurchaseHistory() {
  const [, setLocation] = useLocation();
  const { data: purchases, isLoading } = trpc.practiceExams.myPurchases.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* 頁首 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <button
            onClick={() => setLocation("/student")}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回學員專區
          </button>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 標題 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Receipt className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">購買記錄</h1>
            </div>
            <p className="text-muted-foreground">
              查看您的考卷購買歷史和扣點記錄
            </p>
          </div>

          {/* 購買記錄列表 */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">載入中...</p>
            </div>
          ) : purchases && purchases.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        考卷名稱
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        分類 / 科目
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        年度
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        扣除點數
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        購買時間
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {purchase.examTitle || "未知考卷"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {purchase.examCategory && purchase.examSubject
                            ? `${purchase.examCategory} / ${purchase.examSubject}`
                            : purchase.examCategory || purchase.examSubject || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {purchase.examYear ? `${purchase.examYear} 年` : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-orange-500 font-medium">
                            <Coins className="w-4 h-4" />
                            <span>{purchase.pointsSpent}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(purchase.purchasedAt).toLocaleString("zh-TW", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 統計資訊 */}
              <div className="px-6 py-4 bg-muted/30 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    共 {purchases.length} 筆購買記錄
                  </span>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>總計扣除：</span>
                    <div className="flex items-center gap-1 text-orange-500">
                      <Coins className="w-4 h-4" />
                      <span>
                        {purchases.reduce((sum, p) => sum + p.pointsSpent, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">尚無購買記錄</p>
              <p className="text-sm text-muted-foreground mt-2">
                購買付費考卷後，記錄將顯示在這裡
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
