/**
 * 智能書本學習紀錄頁面
 * 顯示所有學生的智能專書答題統計（答題次數、接觸題目數、錯題數）
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, BookOpen, Search, ChevronLeft, ChevronRight, Users, Target, AlertCircle } from "lucide-react";

export default function AdminSmartBookQuizStats() {
  const [page, setPage] = useState(1);
  const [bookIdFilter, setBookIdFilter] = useState<number | undefined>(undefined);
  const [bookIdInput, setBookIdInput] = useState("");
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.smartBookAdmin.getStudentQuizStats.useQuery({
    page,
    pageSize,
    bookId: bookIdFilter,
  });

  // 取得書本列表（用於篩選）
  const { data: booksData } = trpc.smartBookAdmin.list.useQuery();

  const handleBookFilter = (bookId: number | undefined) => {
    setBookIdFilter(bookId);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  // 統計摘要
  const totalStudents = data?.total ?? 0;
  const totalShown = data?.data.reduce((sum, d) => sum + d.totalShown, 0) ?? 0;
  const totalWrong = data?.data.reduce((sum, d) => sum + d.wrongCount, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            智能書本學習紀錄
          </h1>
          <p className="text-gray-500 mt-1 text-sm">查看所有學生的智能專書答題統計，掌握學習進度</p>
        </div>

        {/* 統計摘要卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">活躍學生數</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">總答題次數（本頁）</p>
                  <p className="text-2xl font-bold text-gray-900">{totalShown.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">待複習錯題（本頁）</p>
                  <p className="text-2xl font-bold text-gray-900">{totalWrong.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 篩選列 */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">依書本篩選：</span>
              <Button
                variant={bookIdFilter === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => handleBookFilter(undefined)}
              >
                全部書本
              </Button>
              {booksData?.slice(0, 8).map(book => (
                <Button
                  key={book.id}
                  variant={bookIdFilter === book.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleBookFilter(book.id)}
                  className="max-w-[160px] truncate"
                >
                  {book.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 資料表格 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              學生答題明細
              {data && <Badge variant="secondary">{data.total} 筆</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                載入中...
              </div>
            ) : !data || data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">尚無學生答題記錄</p>
                <p className="text-xs mt-1">學生開始練習後，紀錄將顯示在此</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>書本</TableHead>
                    <TableHead className="text-center">接觸題目數</TableHead>
                    <TableHead className="text-center">總答題次數</TableHead>
                    <TableHead className="text-center">待複習錯題</TableHead>
                    <TableHead className="text-center">熟練度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((row, idx) => {
                    const masteryRate = row.uniqueQuestions > 0
                      ? Math.max(0, Math.round(((row.uniqueQuestions - row.wrongCount) / row.uniqueQuestions) * 100))
                      : 0;
                    return (
                      <TableRow key={`${row.userId}_${row.bookId}_${idx}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {row.userNickname || row.userName}
                            </p>
                            <p className="text-xs text-gray-400">{row.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700 max-w-[200px] block truncate">
                            {row.bookTitle}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-blue-600">{row.uniqueQuestions}</span>
                          <span className="text-xs text-gray-400 ml-1">題</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-green-600">{row.totalShown}</span>
                          <span className="text-xs text-gray-400 ml-1">次</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {row.wrongCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {row.wrongCount} 題
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs text-green-600">
                              無錯題
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${masteryRate >= 80 ? 'bg-green-500' : masteryRate >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                style={{ width: `${masteryRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{masteryRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              第 {page} / {totalPages} 頁
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
