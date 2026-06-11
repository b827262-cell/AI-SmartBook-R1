/**
 * 題目品質報告頁面
 * 顯示題目品質評分統計和低分題目列表
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';

const QualityReport: React.FC = () => {
  const [pdfId, setPdfId] = useState<number | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | undefined>();

  const { data: pdfs } = trpc.pdf.listPdfs.useQuery();
  const { data: report, isLoading, refetch } = trpc.questionBank.calculateQualityScoreBatch.useQuery(
    { pdfId, category, status },
    { enabled: false }
  );

  const handleGenerateReport = () => {
    refetch();
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-500';
      case 'B':
        return 'bg-blue-500';
      case 'C':
        return 'bg-yellow-500';
      case 'D':
        return 'bg-orange-500';
      case 'F':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getGradeBadgeVariant = (grade: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (grade) {
      case 'A':
      case 'B':
        return 'default';
      case 'C':
        return 'secondary';
      case 'D':
      case 'F':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">題目品質報告</h1>
        <p className="text-muted-foreground mt-2">
          根據題目完整度、LaTeX 語法正確性、內容品質等指標自動評分
        </p>
      </div>

      {/* 篩選條件 */}
      <Card>
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
          <CardDescription>選擇要分析的題目範圍</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">PDF 文件</label>
              <Select
                value={pdfId?.toString()}
                onValueChange={(value) => setPdfId(value === 'all' ? undefined : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {pdfs?.map((pdf) => (
                    <SelectItem key={pdf.id} value={pdf.id.toString()}>
                      {pdf.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">分類</label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="數學">數學</SelectItem>
                  <SelectItem value="統計學">統計學</SelectItem>
                  <SelectItem value="物理">物理</SelectItem>
                  <SelectItem value="化學">化學</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">狀態</label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value === 'all' ? undefined : (value as 'pending' | 'approved' | 'rejected'))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待審核</SelectItem>
                  <SelectItem value="approved">已通過</SelectItem>
                  <SelectItem value="rejected">已拒絕</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full">
                {isLoading ? '生成中...' : '生成報告'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計摘要 */}
      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">總題目數</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.totalQuestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">平均分數</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.averageScore.toFixed(1)}</div>
                <Progress value={report.averageScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">低品質題目</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{report.lowQualityQuestions.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  ({((report.lowQualityQuestions.length / report.totalQuestions) * 100).toFixed(1)}%)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 評級分布 */}
          <Card>
            <CardHeader>
              <CardTitle>評級分布</CardTitle>
              <CardDescription>各評級題目數量統計</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(report.gradeDistribution).map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-4">
                    <Badge className={`${getGradeColor(grade)} text-white w-12 justify-center`}>
                      {grade}
                    </Badge>
                    <div className="flex-1">
                      <Progress value={(count / report.totalQuestions) * 100} className="h-6" />
                    </div>
                    <span className="text-sm font-medium w-20 text-right">
                      {count} 題 ({((count / report.totalQuestions) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 低品質題目列表 */}
          {report.lowQualityQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  低品質題目列表（分數 &lt; 70）
                </CardTitle>
                <CardDescription>需要改進的題目</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {report.lowQualityQuestions.map((item, index) => (
                    <AccordionItem key={item.questionId} value={`item-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 w-full">
                          <Badge variant={getGradeBadgeVariant(item.qualityScore.grade)}>
                            {item.qualityScore.grade}
                          </Badge>
                          <span className="font-medium">{item.questionNumber}</span>
                          <span className="text-sm text-muted-foreground ml-auto mr-4">
                            總分：{item.qualityScore.totalScore.toFixed(1)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* 分數明細 */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">完整度</p>
                              <p className="text-lg font-semibold">
                                {item.qualityScore.breakdown.completeness} / 40
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">LaTeX 品質</p>
                              <p className="text-lg font-semibold">
                                {item.qualityScore.breakdown.latexQuality} / 30
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">內容品質</p>
                              <p className="text-lg font-semibold">
                                {item.qualityScore.breakdown.contentQuality} / 30
                              </p>
                            </div>
                          </div>

                          {/* 問題列表 */}
                          {item.qualityScore.issues.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                問題
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {item.qualityScore.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 改進建議 */}
                          {item.qualityScore.suggestions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                改進建議
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {item.qualityScore.suggestions.map((suggestion, i) => (
                                  <li key={i}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 編輯按鈕 */}
                          <div className="flex justify-end">
                            <Link href={`/admin/question-editor/${item.questionId}`}>
                              <Button size="sm" variant="outline">
                                編輯題目
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* 高品質題目提示 */}
          {report.lowQualityQuestions.length === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex items-center gap-4 py-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">太棒了！</h3>
                  <p className="text-sm text-green-700">所有題目的品質分數都在 70 分以上</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default QualityReport;
