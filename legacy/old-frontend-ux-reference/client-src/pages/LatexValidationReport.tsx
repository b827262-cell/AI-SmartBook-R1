/**
 * LaTeX 語法檢測報告頁面
 * 顯示批量檢測題目 LaTeX 語法錯誤的結果
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Loader2, AlertTriangle, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function LatexValidationReport() {
  const [, setLocation] = useLocation();
  const [pdfId, setPdfId] = useState<number | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | undefined>();

  // 獲取檢測結果
  const { data: validationData, isLoading, refetch } = trpc.questionBank.validateLatexBatch.useQuery({
    pdfId,
    category,
    status,
  });

  const handleStartValidation = () => {
    refetch();
  };

  const handleGoToQuestion = (questionId: number) => {
    // 跳轉到題目編輯頁面
    setLocation(`/admin/question-editor/${questionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LaTeX 語法檢測報告</h1>
          <p className="text-gray-600">批量掃描題目中的 LaTeX 語法錯誤，幫助您快速發現並修正問題</p>
        </div>

        {/* 篩選條件 */}
        <Card className="p-6 mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">PDF ID（選填）</label>
              <input
                type="number"
                placeholder="輸入 PDF ID"
                value={pdfId || ''}
                onChange={(e) => setPdfId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">分類（選填）</label>
              <input
                type="text"
                placeholder="輸入分類"
                value={category || ''}
                onChange={(e) => setCategory(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">狀態（選填）</label>
              <select
                value={status || ''}
                onChange={(e) => setStatus(e.target.value as any || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="pending">待審核</option>
                <option value="approved">已通過</option>
                <option value="rejected">已駁回</option>
              </select>
            </div>
            <Button onClick={handleStartValidation} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  檢測中...
                </>
              ) : (
                '開始檢測'
              )}
            </Button>
          </div>
        </Card>

        {/* 檢測結果統計 */}
        {validationData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">總題目數</p>
                    <p className="text-3xl font-bold text-gray-900">{validationData.totalQuestions}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6 border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 mb-1">有錯誤的題目</p>
                    <p className="text-3xl font-bold text-red-900">{validationData.questionsWithErrors}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </Card>

              <Card className="p-6 border-yellow-200 bg-yellow-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 mb-1">有警告的題目</p>
                    <p className="text-3xl font-bold text-yellow-900">{validationData.questionsWithWarnings}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </Card>

              <Card className="p-6 border-green-200 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">正常的題目</p>
                    <p className="text-3xl font-bold text-green-900">
                      {validationData.totalQuestions - validationData.questionsWithIssues.length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </Card>
            </div>

            {/* 問題題目列表 */}
            {validationData.questionsWithIssues.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  問題題目列表 ({validationData.questionsWithIssues.length})
                </h2>
                
                <Accordion type="single" collapsible className="space-y-4">
                  {validationData.questionsWithIssues.map((result, index) => (
                    <AccordionItem key={result.questionId} value={`question-${result.questionId}`} className="border rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <span className="font-medium text-gray-900">{result.questionNumber}</span>
                            <div className="flex gap-2">
                              {result.hasErrors && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  錯誤
                                </Badge>
                              )}
                              {result.hasWarnings && (
                                <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  警告
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToQuestion(result.questionId);
                            }}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            編輯
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 mt-2">
                          {/* 題目欄位的問題 */}
                          {result.fieldIssues.question && (
                            <div className="border-l-4 border-red-500 pl-4">
                              <p className="font-medium text-gray-900 mb-2">題目內容</p>
                              {result.fieldIssues.question.issues.map((issue, idx) => (
                                <div key={idx} className="mb-2 p-3 bg-red-50 rounded-md">
                                  <p className="text-sm text-red-900 font-medium">{issue.message}</p>
                                  {issue.suggestion && (
                                    <p className="text-xs text-red-700 mt-1">💡 建議：{issue.suggestion}</p>
                                  )}
                                </div>
                              ))}
                              {result.fieldIssues.question.warnings.map((warning, idx) => (
                                <div key={idx} className="mb-2 p-3 bg-yellow-50 rounded-md">
                                  <p className="text-sm text-yellow-900 font-medium">{warning.message}</p>
                                  {warning.suggestion && (
                                    <p className="text-xs text-yellow-700 mt-1">💡 建議：{warning.suggestion}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 解析欄位的問題 */}
                          {result.fieldIssues.explanation && (
                            <div className="border-l-4 border-red-500 pl-4">
                              <p className="font-medium text-gray-900 mb-2">解析內容</p>
                              {result.fieldIssues.explanation.issues.map((issue, idx) => (
                                <div key={idx} className="mb-2 p-3 bg-red-50 rounded-md">
                                  <p className="text-sm text-red-900 font-medium">{issue.message}</p>
                                  {issue.suggestion && (
                                    <p className="text-xs text-red-700 mt-1">💡 建議：{issue.suggestion}</p>
                                  )}
                                </div>
                              ))}
                              {result.fieldIssues.explanation.warnings.map((warning, idx) => (
                                <div key={idx} className="mb-2 p-3 bg-yellow-50 rounded-md">
                                  <p className="text-sm text-yellow-900 font-medium">{warning.message}</p>
                                  {warning.suggestion && (
                                    <p className="text-xs text-yellow-700 mt-1">💡 建議：{warning.suggestion}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 選項欄位的問題 */}
                          {result.fieldIssues.options && Object.entries(result.fieldIssues.options).map(([key, optionResult]) => (
                            <div key={key} className="border-l-4 border-red-500 pl-4">
                              <p className="font-medium text-gray-900 mb-2">選項 {key}</p>
                              {optionResult.issues.map((issue, idx) => (
                                <div key={idx} className="mb-2 p-3 bg-red-50 rounded-md">
                                  <p className="text-sm text-red-900 font-medium">{issue.message}</p>
                                  {issue.suggestion && (
                                    <p className="text-xs text-red-700 mt-1">💡 建議：{issue.suggestion}</p>
                                  )}
                                </div>
                              ))}
                              {optionResult.warnings.map((warning, idx) => (
                                <div key={idx} className="mb-2 p-3 bg-yellow-50 rounded-md">
                                  <p className="text-sm text-yellow-900 font-medium">{warning.message}</p>
                                  {warning.suggestion && (
                                    <p className="text-xs text-yellow-700 mt-1">💡 建議：{warning.suggestion}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            )}

            {/* 沒有問題的提示 */}
            {validationData.questionsWithIssues.length === 0 && (
              <Card className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">太棒了！沒有發現任何問題</h3>
                <p className="text-gray-600">所有題目的 LaTeX 語法都正確無誤</p>
              </Card>
            )}
          </>
        )}

        {/* 初始狀態 */}
        {!validationData && !isLoading && (
          <Card className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">開始檢測</h3>
            <p className="text-gray-600 mb-4">點擊「開始檢測」按鈕來掃描題目中的 LaTeX 語法錯誤</p>
          </Card>
        )}
      </div>
    </div>
  );
}
