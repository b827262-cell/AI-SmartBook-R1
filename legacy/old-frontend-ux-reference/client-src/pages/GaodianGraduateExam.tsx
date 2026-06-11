import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function GaodianGraduateExam() {
  const [htmlContent, setHtmlContent] = useState('');
  const [parsedExams, setParsedExams] = useState<any[]>([]);
  const [selectedExams, setSelectedExams] = useState<Set<number>>(new Set());
  const [validationStatus, setValidationStatus] = useState<Record<number, 'valid' | 'invalid' | 'checking'>>({});

  const handleParseHtml = () => {
    if (!htmlContent.trim()) {
      toast.error("請貼上 HTML 內容");
      return;
    }

    // 使用 DOMParser 在前端解析 HTML
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const exams: any[] = [];
      const rows = doc.querySelectorAll('table tr, tr');
      
      let idCounter = 1;
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const firstCellText = cells[0]?.textContent?.trim() || '';
          const secondCellText = cells[1]?.textContent?.trim() || '';
          if (firstCellText === '編號' || secondCellText === '學校系所' || secondCellText.includes('考試科目')) {
            return;
          }
          
          const universityDept = cells[1]?.textContent?.trim() || '';
          const subject = cells[2]?.textContent?.trim() || '';
          const yearText = cells[3]?.textContent?.trim() || '';
          
          const downloadLink = row.querySelector('a[href*="Download"]') || 
                              row.querySelector('a[href*=".pdf"]') ||
                              cells[4]?.querySelector('a');
          
          if (universityDept && subject && downloadLink) {
            let university = '';
            let department = '';
            
            if (universityDept.includes('-')) {
              const parts = universityDept.split('-');
              university = parts[0].trim();
              department = parts.slice(1).join('-').trim();
            } else {
              university = universityDept;
            }
            
            const yearMatch = yearText.match(/\d+/);
            const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear() - 1911;
            
            let pdfUrl = downloadLink.getAttribute('href') || '';
            
            if (pdfUrl && !pdfUrl.startsWith('http')) {
              if (pdfUrl.startsWith('/')) {
                pdfUrl = `https://master.get.com.tw${pdfUrl}`;
              } else {
                pdfUrl = `https://master.get.com.tw/exam/${pdfUrl}`;
              }
            }
            
            if (pdfUrl) {
              exams.push({
                id: idCounter++,
                schoolName: university,
                departmentName: department,
                subjectName: subject,
                title: subject,
                year,
                pdfUrl,
                category: 'html_import',
              });
            }
          }
        }
      });
      
      if (exams.length === 0) {
        toast.error("未找到 PDF 連結，請確認 HTML 內容是否包含表格和下載連結");
        return;
      }
      
      setParsedExams(exams);
      setSelectedExams(new Set()); // 清空選擇
      toast.success(`解析成功！共找到 ${exams.length} 筆考古題`);
    } catch (error) {
      console.error('HTML 解析錯誤:', error);
      toast.error("解析 HTML 失敗，請檢查內容格式");
    }
  };

  const handleToggleAll = () => {
    if (selectedExams.size === parsedExams.length) {
      setSelectedExams(new Set());
    } else {
      setSelectedExams(new Set(parsedExams.map(exam => exam.id)));
    }
  };

  const handleToggleExam = (examId: number) => {
    const newSelected = new Set(selectedExams);
    if (newSelected.has(examId)) {
      newSelected.delete(examId);
    } else {
      newSelected.add(examId);
    }
    setSelectedExams(newSelected);
  };

  const handleUpdatePdfUrl = (examId: number, newUrl: string) => {
    setParsedExams(prevExams =>
      prevExams.map(exam =>
        exam.id === examId ? { ...exam, pdfUrl: newUrl } : exam
      )
    );
    // 清除該項目的驗證狀態
    setValidationStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[examId];
      return newStatus;
    });
  };

  const validatePdfUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      // no-cors 模式下無法取得狀態碼，所以只要沒有拋出錯誤就視為有效
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleValidateUrls = async () => {
    const examsToValidate = selectedExams.size > 0
      ? parsedExams.filter(exam => selectedExams.has(exam.id))
      : parsedExams;

    if (examsToValidate.length === 0) {
      toast.error('請至少勾選一個項目');
      return;
    }

    // 設定所有項目為檢查中
    const checkingStatus: Record<number, 'checking'> = {};
    examsToValidate.forEach(exam => {
      checkingStatus[exam.id] = 'checking';
    });
    setValidationStatus(checkingStatus);

    // 並行驗證所有網址
    const results = await Promise.all(
      examsToValidate.map(async (exam) => {
        const isValid = await validatePdfUrl(exam.pdfUrl);
        return { id: exam.id, isValid };
      })
    );

    // 更新驗證狀態
    const newStatus: Record<number, 'valid' | 'invalid'> = {};
    results.forEach(({ id, isValid }) => {
      newStatus[id] = isValid ? 'valid' : 'invalid';
    });
    setValidationStatus(newStatus);

    // 統計結果
    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.length - validCount;

    if (invalidCount === 0) {
      toast.success(`所有網址都有效（${validCount} 個）`);
    } else {
      toast.warning(`驗證完成：${validCount} 個有效、${invalidCount} 個無效`);
    }
  };

  const handleDownloadTxt = () => {
    if (parsedExams.length === 0) {
      toast.error('請先解析 HTML');
      return;
    }

    // 如果沒有勾選任何項目，下載全部
    const examsToDownload = selectedExams.size > 0 
      ? parsedExams.filter(exam => selectedExams.has(exam.id))
      : parsedExams;

    if (examsToDownload.length === 0) {
      toast.error('請至少勾選一個項目');
      return;
    }

    // 生成 aria2 格式的 TXT 內容
    let txtContent = '# 高點研究所考古題下載連結\n';
    txtContent += '# 使用方法：\n';
    txtContent += '# 方法一（FDM 推薦）：在 FDM 中點選「新增下載」→「Browse...」→ 選擇此 TXT 檔案\n';
    txtContent += '# 方法二（aria2）：aria2c -i 檔案路徑.txt\n\n';

    examsToDownload.forEach((exam) => {
      // 生成檔名
      const filename = generateSafeFilename(exam);
      txtContent += `${exam.pdfUrl}\n`;
      txtContent += `out=${filename}\n\n`;
    });

    // 生成 TXT 檔名
    let txtFilename = '高點研究所考古題';
    if (examsToDownload.length === 1) {
      // 單個下載：學校_系所_考試科目_年度.txt
      const exam = examsToDownload[0];
      const parts = [];
      if (exam.schoolName) parts.push(exam.schoolName);
      if (exam.departmentName) parts.push(exam.departmentName);
      if (exam.subjectName) parts.push(exam.subjectName);
      if (exam.year) parts.push(`${exam.year}年`);
      txtFilename = parts.join('_') || '高點研究所考古題';
    } else {
      // 批次下載：學校_系所_年度_批次下載.txt（取第一個項目的資訊）
      const firstExam = examsToDownload[0];
      const parts = [];
      if (firstExam.schoolName) parts.push(firstExam.schoolName);
      if (firstExam.departmentName) parts.push(firstExam.departmentName);
      if (firstExam.year) parts.push(`${firstExam.year}年`);
      parts.push('批次下載');
      txtFilename = parts.join('_') || '高點研究所考古題_批次下載';
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${txtFilename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`TXT 檔案已下載（${examsToDownload.length} 個項目）`);
  };

  const generateSafeFilename = (exam: any): string => {
    const parts = [];
    if (exam.schoolName) parts.push(exam.schoolName);
    if (exam.departmentName) parts.push(exam.departmentName);
    if (exam.subjectName) parts.push(exam.subjectName);
    if (exam.year) parts.push(`${exam.year}年`);
    
    let filename = parts.join('_');
    
    // 移除特殊字元
    filename = filename.replace(/[<>:"/\\|?*]/g, '');
    filename = filename.replace(/\s+/g, '_');
    
    // 限制長度
    if (filename.length > 100) {
      filename = filename.substring(0, 100);
    }
    
    // 確保有檔名
    if (!filename) {
      filename = `考古題_${Date.now()}`;
    }
    
    // 確保有 .pdf 副檔名
    if (!filename.endsWith('.pdf')) {
      filename += '.pdf';
    }
    
    return filename;
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto py-8">
        <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">高點研究所考古題</h1>
        <p className="text-muted-foreground">
          從高點研究所網站複製網頁原始碼，系統將自動解析 PDF 連結並生成下載檔案
        </p>
      </div>

      <div className="grid gap-6">
        {/* 步驟說明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用說明</CardTitle>
            <CardDescription>
              按照以下步驟操作，快速批次下載研究所考古題 PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>前往 <a href="https://master.get.com.tw/exam/List.aspx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">高點研究所考古題網站</a></li>
              <li>使用網站的搜尋功能，篩選您需要的考古題（例如：114年、資訊管理）</li>
              <li>在網頁上按右鍵 → 選擇「檢視網頁原始碼」（或按 Ctrl+U）</li>
              <li>全選（Ctrl+A）並複製（Ctrl+C）所有原始碼</li>
              <li>貼上到下方的文字框中，點擊「解析 HTML」按鈕</li>
              <li>勾選需要的項目（或全選），下載生成的 TXT 檔案，使用 FDM 或 aria2 批次下載所有 PDF</li>
            </ol>
          </CardContent>
        </Card>

        {/* HTML 輸入區 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>貼上網頁原始碼</CardTitle>
                <CardDescription>
                  從高點研究所網站複製的 HTML 內容
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleParseHtml}
                  disabled={!htmlContent.trim()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  解析 HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHtmlContent('');
                    setParsedExams([]);
                    setSelectedExams(new Set());
                  }}
                >
                  清除
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="在此貼上網頁原始碼..."
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="h-[500px] font-mono text-sm overflow-y-auto resize-none"
            />
          </CardContent>
        </Card>

        {/* 解析結果 */}
        {parsedExams.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>解析結果</CardTitle>
                  <CardDescription>
                    找到 {parsedExams.length} 個 PDF 檔案
                    {selectedExams.size > 0 && ` · 已選擇 ${selectedExams.size} 個`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleValidateUrls}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    驗證網址
                  </Button>
                  <Button onClick={handleDownloadTxt}>
                    <Download className="mr-2 h-4 w-4" />
                    下載 TXT（供 FDM/aria2 使用）
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedExams.size === parsedExams.length}
                            onCheckedChange={handleToggleAll}
                          />
                          <span className="text-sm">全選</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>學校</TableHead>
                      <TableHead>系所</TableHead>
                      <TableHead>考試科目</TableHead>
                      <TableHead className="w-[100px]">年度</TableHead>
                      <TableHead className="min-w-[300px]">PDF 網址</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedExams.map((exam, index) => (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedExams.has(exam.id)}
                            onCheckedChange={() => handleToggleExam(exam.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{exam.schoolName || '-'}</TableCell>
                        <TableCell>{exam.departmentName || '-'}</TableCell>
                        <TableCell>{exam.subjectName || exam.title}</TableCell>
                        <TableCell>{exam.year ? `${exam.year}年` : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              value={exam.pdfUrl}
                              onChange={(e) => handleUpdatePdfUrl(exam.id, e.target.value)}
                              className="text-xs font-mono"
                              placeholder="PDF 網址"
                            />
                            {validationStatus[exam.id] === 'checking' && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {validationStatus[exam.id] === 'valid' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {validationStatus[exam.id] === 'invalid' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(exam.pdfUrl, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
