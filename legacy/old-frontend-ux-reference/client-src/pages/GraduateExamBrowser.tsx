import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, BookOpen, GraduationCap, Star, CheckCircle2, XCircle, Loader2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as showToast } from "sonner";

// 生成合法的檔名
function generateSafeFilename(title: string, schoolName?: string): string {
  // 如果 title 已經包含完整資訊（例如：「資訊工程學系碩士班 - 資料結構與演算法 - 114學年度」），直接使用
  // 如果 title 只是簡單的檔名（例如：「114」或「114.pdf」），需要警告用戶
  
  // 移除特殊字元（保留中文、英文、數字、連字號、底線、空格、點號）
  let filename = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\-_ .]/g, '');
  
  // 移除多餘的空格
  filename = filename.replace(/\s+/g, ' ').trim();
  
  // 限制長度（最多 100 字元）
  if (filename.length > 100) {
    filename = filename.substring(0, 100);
  }
  
  // 如果檔名為空，使用學校名稱
  if (!filename && schoolName) {
    filename = schoolName;
  }
  
  // 如果仍然為空，使用預設名稱
  if (!filename) {
    filename = '未命名';
  }
  
  // 確保有 .pdf 副檔名
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf';
  }
  
  return filename;
}

type PdfLink = {
  title: string;
  url: string;
  validationStatus?: 'idle' | 'checking' | 'valid' | 'invalid';
  validationError?: string;
  checked?: boolean; // 是否勾選
  department?: string; // 系所名稱
  year?: string; // 年份
};

export default function GraduateExamBrowser() {
  const [examType, setExamType] = useState<'master' | 'transfer'>('master');
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [pdfLinks, setPdfLinks] = useState<PdfLink[]>([]);
  const [filteredDepartment, setFilteredDepartment] = useState<string>('all'); // 篩選的系所
  const [filteredYear, setFilteredYear] = useState<string>('all'); // 篩選的年份
  const [showLinksDialog, setShowLinksDialog] = useState(false);
  const [showModeSelectionDialog, setShowModeSelectionDialog] = useState(false);
  const [showManualInputDialog, setShowManualInputDialog] = useState(false);
  const [manualInputContent, setManualInputContent] = useState('');

  // 獲取學校列表
  const { data: rawSchools, isLoading } = trpc.graduateExam.getSchools.useQuery({
    examType,
    searchKeyword: searchKeyword || undefined,
  });

  // 獲取統計資訊
  const { data: stats } = trpc.graduateExam.getStats.useQuery();

  // 獲取收藏列表
  const { data: favorites } = trpc.graduateExam.getFavorites.useQuery();

  // tRPC utils（必須在所有 mutation 之前定義）
  const utils = trpc.useUtils();

  // 將收藏的學校置頂
  const schools = useMemo(() => {
    if (!rawSchools || !favorites) return rawSchools;

    const favoriteIds = new Set(favorites.map((fav) => fav.schoolId));
    const favoriteSchools = rawSchools.filter((school) => favoriteIds.has(school.id));
    const otherSchools = rawSchools.filter((school) => !favoriteIds.has(school.id));

    return [...favoriteSchools, ...otherSchools];
  }, [rawSchools, favorites]);

  // 收藏/取消收藏
  const addFavoriteMutation = trpc.graduateExam.addFavorite.useMutation({
    onSuccess: () => {
      utils.graduateExam.getFavorites.invalidate();
      showToast.success('已添加到收藏');
    },
    onError: () => {
      showToast.error('收藏失敗');
    },
  });

  const removeFavoriteMutation = trpc.graduateExam.removeFavorite.useMutation({
    onSuccess: () => {
      utils.graduateExam.getFavorites.invalidate();
      showToast.success('已取消收藏');
    },
    onError: () => {
      showToast.error('取消收藏失敗');
    },
  });

  // 檢查是否已收藏
  const isFavorite = (schoolId: number) => {
    return favorites?.some((fav) => fav.schoolId === schoolId) || false;
  };

  // 爬取 PDF 連結 mutation
  const fetchPdfLinksMutation = trpc.graduateExam.fetchPdfLinks.useMutation();
  
  // 儲存 PDF 連結到快取 mutation
  const savePdfLinksCacheMutation = trpc.graduateExam.savePdfLinksCache.useMutation();

  // 切換收藏狀態
  const toggleFavorite = (schoolId: number) => {
    if (isFavorite(schoolId)) {
      removeFavoriteMutation.mutate({ schoolId });
    } else {
      addFavoriteMutation.mutate({ schoolId });
    }
  };

  const handleSearch = () => {
    setSearchKeyword(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
  };

  // 批次下載所有學校
  const batchDownloadMutation = trpc.graduateExam.batchFetchAllSchools.useMutation();

  const handleBatchDownloadAll = async () => {
    try {
      showToast.info(`正在爬取所有學校的 PDF 連結，請稍候...（預計需要 5-10 分鐘）`);

      // 調用 API 批次爬取
      const result = await batchDownloadMutation.mutateAsync({
        examType: examType,
      });

      // 生成合併的 TXT 檔案內容（aria2 格式：URL + 換行 + out=檔名 + 空行）
      const txtContent = [
        `# 研究所考古題 PDF 連結合集（${examType === 'master' ? '碩士班' : '轉學考'}）`,
        `# 總共：${result.totalSchools} 所學校`,
        `# 爬取時間：${new Date().toLocaleString('zh-TW')}`,
        `# 使用方法：`,
        `#   1. 在 FDM 中點選「新增下載」→「輸入 URL 或選擇 Torrent 檔案」→「Browse...」`,
        `#   2. 選擇此 TXT 檔案，FDM 會自動讀取所有 URL 並使用建議的檔名`,
        `#   3. 或者使用 aria2 下載器：aria2c -i 此檔案路徑.txt`,
        '',
        ...result.results.flatMap((school) => {
          if (!school.success || school.links.length === 0) {
            return [
              `# ${school.schoolName}：爬取失敗（${school.error || '未知錯誤'}）`,
              '',
            ];
          }
          return [
            `# ${school.schoolName}（${school.total} 個檔案）`,
            ...school.links.flatMap((link) => {
              const filename = generateSafeFilename(link.title, school.schoolName);
              return [
                link.url,
                `out=${filename}`,
                '', // 空行分隔
              ];
            }),
          ];
        }),
      ].join('\n');

      // 創建 Blob 並下載
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `研究所考古題連結合集_${examType === 'master' ? '碩士班' : '轉學考'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const successCount = result.results.filter(r => r.success).length;
      const totalLinks = result.results.reduce((sum, r) => sum + r.total, 0);
      showToast.success(`已下載！成功爬取 ${successCount}/${result.totalSchools} 所學校，共 ${totalLinks} 個 PDF 連結`);
    } catch (error) {
      console.error('批次下載失敗:', error);
      showToast.error("批次下載失敗，請稍後再試");
    }
  };

  // 驗證單個 PDF 網址
  const validatePdfUrl = async (url: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: '無法訪問此網址' };
    }
  };

  // 驗證所有 PDF 網址
  const handleValidateUrls = async () => {
    showToast.info('正在驗證 PDF 網址...');

    // 更新所有連結狀態為 checking
    setPdfLinks(prev => prev.map(link => ({ ...link, validationStatus: 'checking' as const })));

    // 批次驗證
    const results = await Promise.all(
      pdfLinks.map(async (link, index) => {
        const result = await validatePdfUrl(link.url);
        return { index, ...result };
      })
    );

    // 更新驗證結果
    setPdfLinks(prev => prev.map((link, index) => {
      const result = results[index];
      return {
        ...link,
        validationStatus: result.valid ? 'valid' as const : 'invalid' as const,
        validationError: result.error,
      };
    }));

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.length - validCount;

    if (invalidCount === 0) {
      showToast.success(`所有 ${validCount} 個網址都有效`);
    } else {
      showToast.warning(`驗證完成：${validCount} 個有效，${invalidCount} 個無效`);
    }
  };

  // 更新 PDF 網址
  const handleUpdatePdfUrl = (index: number, newUrl: string) => {
    setPdfLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, url: newUrl, validationStatus: 'idle' as const } : link
    ));
  };

  // TXT 檔案格式：只使用 aria2 格式（唯一支援自動改檔名的方法）

  // 下載 TXT 檔案
  const handleDownloadTxt = () => {
    if (!selectedSchool || pdfLinks.length === 0) return;

    // 只下載已勾選的 PDF（並應用篩選條件）
    const checkedLinks = pdfLinks.filter(link => {
      // 應用篩選條件
      if (filteredDepartment !== 'all' && link.department !== filteredDepartment) return false;
      if (filteredYear !== 'all' && link.year !== filteredYear) return false;
      // 只保留已勾選的
      return link.checked;
    });
    
    if (checkedLinks.length === 0) {
      showToast.error('請至少勾選一個 PDF');
      return;
    }

    // 生成 TXT 檔案內容（根據選擇的格式）
    // aria2 格式：URL + 換行 + out=檔名 + 空行（唯一支援自動改檔名的方法）
    const txtContent = [
      `# ${selectedSchool.schoolName} 考古題 PDF 連結`,
      `# 生成時間：${new Date().toLocaleString('zh-TW')}`,
      `# 共 ${checkedLinks.length} 個 PDF 檔案（已勾選）`,
      `# 來源網址：${selectedSchool.websiteUrl}`,
      ``,
      `# === 重要提醒 ===`,
      `# ⚠️ 如果您使用「自動爬取」模式，檔名可能只有年度（例如：114.pdf）`,
      `# ⚠️ 如果您想要智能檔名（例如：資訊工程學系碩士班 - 資料結構與演算法 - 114學年度.pdf）`,
      `#    請使用「手動輸入」模式，貼上學校網站的 HTML 原始碼（view-source:）`,
      ``,
      `# === 使用方法 ===`,
      `# 方法一：使用 aria2c 命令行工具（推薦，支援自動改檔名）`,
      `#   1. 安裝 aria2：`,
      `#      - Windows：下載 https://github.com/aria2/aria2/releases，解壓縮後將 aria2c.exe 放到系統路徑`,
      `#      - Mac：執行 brew install aria2`,
      `#      - Linux：執行 sudo apt install aria2（Ubuntu/Debian）或 sudo yum install aria2（CentOS/RHEL）`,
      `#   2. 打開終端機（Windows 使用 PowerShell 或 CMD），執行：`,
      `#      aria2c -i "${selectedSchool.schoolName}_考古題連結_${new Date().toISOString().split('T')[0]}.txt" -d "./downloads"`,
      `#   3. aria2c 會自動下載所有 PDF 並使用 out= 參數指定的檔名`,
      ``,
      `# 方法二：使用 FDM（Free Download Manager）的 Browse 功能`,
      `#   1. 打開 FDM，點擊「+」按鈕 → 選擇「Browse for URLs」`,
      `#   2. 選擇此 TXT 檔案，FDM 會自動讀取所有 URL`,
      `#   3. 注意：FDM 不支援 aria2 格式的 out= 參數，會使用原始檔名`,
      ``,
      ...checkedLinks.flatMap((link) => {
        const filename = generateSafeFilename(link.title, selectedSchool.schoolName);
        return [
          link.url,
          ` out=${filename}`,
          ''
        ];
      })
    ].join('\n');

    // 創建 Blob 並下載
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSchool.schoolName}_考古題連結_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast.success(`已下載 ${checkedLinks.length} 個 PDF 連結`);
    setShowLinksDialog(false);
  };

  const handleDownloadLinks = async (school: any) => {
    setSelectedSchool(school);
    
    // 清空狀態，每次都重新輸入
    setPdfLinks([]);
    setFilteredDepartment('all');
    setFilteredYear('all');
    setManualInputContent('');
    
    // 直接顯示模式選擇對話框，不再檢查快取
    setShowModeSelectionDialog(true);
  };

  // 自動爬取模式
  const handleAutoCrawl = async () => {
    if (!selectedSchool) return;
    
    try {
      setShowModeSelectionDialog(false);
      showToast.info(`正在從 ${selectedSchool.schoolName} 網站爬取 PDF 連結，請稍候...`);

      // 調用 API 爬取連結
      const result = await fetchPdfLinksMutation.mutateAsync({
        url: selectedSchool.websiteUrl,
        schoolName: selectedSchool.schoolName,
      });

      if (!result.success || result.links.length === 0) {
        showToast.error(result.error || "未找到 PDF 連結");
        return;
      }

      // 設置 PDF 連結
      setPdfLinks(result.links.map((link: { title: string; url: string }) => ({
        ...link,
        validationStatus: 'idle' as const,
      })));
      setShowLinksDialog(true);

      showToast.success(`已找到 ${result.total} 個 PDF 連結`);
    } catch (error) {
      console.error('爬取 PDF 連結失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      showToast.error(`爬取失敗：${errorMessage}`);
    }
  };

  // 手動輸入模式
  const handleManualInput = () => {
    setShowModeSelectionDialog(false);
    setShowManualInputDialog(true);
  };

  // 批次深入爬取：對 HTML 連結進行深入提取
  const handleBatchDeepCrawl = async () => {
    const htmlLinks = pdfLinks.filter(link => link.url.includes('.html'));
    
    if (htmlLinks.length === 0) {
      showToast.error('沒有找到 HTML 連結，無法進行批次爬取');
      return;
    }

    try {
      showToast.info(`正在爬取 ${htmlLinks.length} 個系所的 PDF 連結，請稍候...`);
      
      const allPdfLinks: Array<{ title: string; url: string; department: string }> = [];
      let successCount = 0;
      let failCount = 0;

      // 逐個爬取系所
      for (let i = 0; i < htmlLinks.length; i++) {
        const htmlLink = htmlLinks[i];
        
        try {
          // 使用 fetch 獲取 HTML
          const response = await fetch(htmlLink.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const html = await response.text();
          
          // 使用 DOMParser 解析 HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const anchors = doc.querySelectorAll('a[href]');
          
          // 提取 PDF 連結
          const pdfLinksInPage: Array<{ title: string; url: string }> = [];
          anchors.forEach((a) => {
            const href = a.getAttribute('href');
            const text = a.textContent?.trim() || '';
            
            if (href && href.includes('.pdf')) {
              let fullUrl = href;
              
              // 處理相對路徑
              if (!href.startsWith('http')) {
                try {
                  const base = new URL(htmlLink.url);
                  if (href.startsWith('/')) {
                    fullUrl = `${base.protocol}//${base.host}${href}`;
                  } else {
                    const basePath = base.pathname.endsWith('/') 
                      ? base.pathname 
                      : base.pathname.replace(/\/[^\/]*$/, '/');
                    fullUrl = `${base.protocol}//${base.host}${basePath}${href}`;
                  }
                } catch (urlError) {
                  console.warn(`無法解析網址: ${href}`, urlError);
                }
              }
              
              pdfLinksInPage.push({
                title: text || href.split('/').pop() || href,
                url: fullUrl,
              });
            }
          });
          
          // 添加到總列表，並記錄系所名稱
          pdfLinksInPage.forEach(link => {
            allPdfLinks.push({
              ...link,
              department: htmlLink.title,
            });
          });
          
          successCount++;
          showToast.info(`已爬取 ${i + 1}/${htmlLinks.length}：${htmlLink.title}（${pdfLinksInPage.length} 個 PDF）`);
        } catch (error) {
          console.error(`爬取 ${htmlLink.title} 失敗:`, error);
          failCount++;
        }
      }
      
      if (allPdfLinks.length === 0) {
        showToast.error('沒有找到任何 PDF 連結');
        return;
      }
      
      // 更新連結列表（只保留 PDF）
      setPdfLinks(allPdfLinks.map((link) => ({
        title: `${link.department} - ${link.title}`,
        url: link.url,
        validationStatus: 'idle' as const,
      })));
      
      showToast.success(`批次爬取完成！成功 ${successCount}/${htmlLinks.length} 個系所，共 ${allPdfLinks.length} 個 PDF 連結`);
    } catch (error) {
      console.error('批次爬取失敗:', error);
      showToast.error('批次爫取失敗，請稍後再試');
    }
  };

  // 解析手動輸入的內容
  const handleParseManualInput = () => {
    if (!manualInputContent.trim()) {
      showToast.error('請輸入內容');
      return;
    }

    try {
      const links: Array<{ title: string; url: string; checked?: boolean; department?: string; year?: string }> = [];
      const baseUrl = selectedSchool?.websiteUrl || '';

      // 判斷是 HTML 原始碼還是網址列表
      if (manualInputContent.includes('<html') || manualInputContent.includes('<a') || manualInputContent.includes('<table')) {
        // HTML 原始碼模式：使用 DOMParser 解析
        const parser = new DOMParser();
        const doc = parser.parseFromString(manualInputContent, 'text/html');
        
        // 嘗試解析表格結構（用於提取科目名稱和年度）
        const tables = doc.querySelectorAll('table');
        let hasTableData = false;
        
        if (tables.length > 0) {
          tables.forEach((table) => {
            const rows = table.querySelectorAll('tr');
            let currentDepartment = ''; // 當前系所名稱（處理 rowspan）
            
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td');
              
              if (cells.length >= 3) {
                // 標準格式：第一欄＝系所、第二欄＝科目、第三欄＝連結
                const departmentCell = cells[0];
                const subjectCell = cells[1];
                const linksCell = cells[2];
                
                // 更新系所名稱（如果有的話）
                const departmentText = departmentCell.textContent?.trim().replace(/\s+/g, ' ');
                if (departmentText && departmentText.length > 0) {
                  currentDepartment = departmentText;
                }
                
                // 提取科目名稱（處理 <br> 標籤造成的換行）
                const subjectName = subjectCell.textContent?.trim().replace(/\s+/g, ' ') || '';
                
                // 提取所有連結
                const anchors = linksCell.querySelectorAll('a[href]');
                anchors.forEach((a) => {
                  const href = a.getAttribute('href');
                  const yearText = a.textContent?.trim() || ''; // 年度（例如：114）
                  
                  if (href && href.includes('.pdf')) {
                    hasTableData = true;
                    
                    // 建立完整網址
                    let fullUrl = href;
                    if (!href.startsWith('http') && baseUrl) {
                      try {
                        const base = new URL(baseUrl);
                        if (href.startsWith('/')) {
                          fullUrl = `${base.protocol}//${base.host}${href}`;
                        } else {
                          const basePath = base.pathname.endsWith('/') 
                            ? base.pathname 
                            : base.pathname.replace(/\/[^\/]*$/, '/');
                          fullUrl = `${base.protocol}//${base.host}${basePath}${href}`;
                        }
                      } catch (urlError) {
                        console.warn(`無法解析網址: ${href}`, urlError);
                        fullUrl = href;
                      }
                    }
                    
                    // 組合標題：系所 - 科目 - 年度學年度
                    let title = '';
                    if (currentDepartment) title += currentDepartment;
                    if (subjectName) title += (title ? ' - ' : '') + subjectName;
                    if (yearText) title += (title ? ' - ' : '') + yearText + '學年度';
                    
                    // 如果標題為空，使用檔名
                    if (!title) {
                      const urlParts = fullUrl.split('/');
                      title = urlParts[urlParts.length - 1] || fullUrl;
                    }
                    
                    // 提取系所和年份用於篩選
                    links.push({
                      title: title,
                      url: fullUrl,
                      checked: true, // 預設全部勾選
                      department: currentDepartment || '未分類',
                      year: yearText || '未知',
                    });
                  }
                });
              } else if (cells.length === 2) {
                // 簡化格式：第一欄＝科目、第二欄＝連結（rowspan 情況）
                const subjectCell = cells[0];
                const linksCell = cells[1];
                const subjectName = subjectCell.textContent?.trim().replace(/\s+/g, ' ') || '';
                
                const anchors = linksCell.querySelectorAll('a[href]');
                anchors.forEach((a) => {
                  const href = a.getAttribute('href');
                  const yearText = a.textContent?.trim() || '';
                  
                  if (href && href.includes('.pdf')) {
                    hasTableData = true;
                    
                    let fullUrl = href;
                    if (!href.startsWith('http') && baseUrl) {
                      try {
                        const base = new URL(baseUrl);
                        if (href.startsWith('/')) {
                          fullUrl = `${base.protocol}//${base.host}${href}`;
                        } else {
                          const basePath = base.pathname.endsWith('/') 
                            ? base.pathname 
                            : base.pathname.replace(/\/[^\/]*$/, '/');
                          fullUrl = `${base.protocol}//${base.host}${basePath}${href}`;
                        }
                      } catch (urlError) {
                        console.warn(`無法解析網址: ${href}`, urlError);
                        fullUrl = href;
                      }
                    }
                    
                    let title = '';
                    if (currentDepartment) title += currentDepartment;
                    if (subjectName) title += (title ? ' - ' : '') + subjectName;
                    if (yearText) title += (title ? ' - ' : '') + yearText + '學年度';
                    
                    if (!title) {
                      const urlParts = fullUrl.split('/');
                      title = urlParts[urlParts.length - 1] || fullUrl;
                    }
                    
                    // 提取系所和年份用於篩選
                    links.push({
                      title: title,
                      url: fullUrl,
                      checked: true, // 預設全部勾選
                      department: currentDepartment || '未分類',
                      year: yearText || '未知',
                    });
                  }
                });
              }
            });
          });
        }
        
        // 如果沒有表格資料，使用簡單的連結提取
        if (!hasTableData) {
          const anchors = doc.querySelectorAll('a[href]');
          anchors.forEach((a) => {
            const href = a.getAttribute('href');
            const text = a.textContent?.trim() || '';
            
            if (href && (href.includes('.pdf') || href.includes('.html'))) {
              let fullUrl = href;
              
              if (!href.startsWith('http') && baseUrl) {
                try {
                  const base = new URL(baseUrl);
                  if (href.startsWith('/')) {
                    fullUrl = `${base.protocol}//${base.host}${href}`;
                  } else {
                    const basePath = base.pathname.endsWith('/') 
                      ? base.pathname 
                      : base.pathname.replace(/\/[^\/]*$/, '/');
                    fullUrl = `${base.protocol}//${base.host}${basePath}${href}`;
                  }
                } catch (urlError) {
                  console.warn(`無法解析網址: ${href}`, urlError);
                  fullUrl = href;
                }
              }
              
              let title = text;
              if (!title || title.length === 0) {
                const urlParts = fullUrl.split('/');
                title = urlParts[urlParts.length - 1] || fullUrl;
              }
              
              links.push({
                title: title,
                url: fullUrl,
              });
            }
          });
        }
      } else {
        // 網址列表模式：每行一個網址
        const lines = manualInputContent.split('\n');
        lines.forEach((line) => {
          let url = line.trim();
          
          // 跳過空行和註解
          if (!url || url.startsWith('#')) return;
          
          // 處理相對路徑
          if (!url.startsWith('http') && baseUrl) {
            try {
              const base = new URL(baseUrl);
              if (url.startsWith('/')) {
                url = `${base.protocol}//${base.host}${url}`;
              } else {
                const basePath = base.pathname.endsWith('/') 
                  ? base.pathname 
                  : base.pathname.replace(/\/[^\/]*$/, '/');
                url = `${base.protocol}//${base.host}${basePath}${url}`;
              }
            } catch (urlError) {
              console.warn(`無法解析網址: ${url}`, urlError);
            }
          }
          
          // 只接受 .pdf 和 .html 連結
          if (url.includes('.pdf') || url.includes('.html')) {
            // 從網址提取檔名作為標題
            const filename = url.split('/').pop() || url;
            links.push({
              title: filename,
              url: url,
            });
          }
        });
      }

      if (links.length === 0) {
        showToast.error('未找到任何 PDF 或 HTML 連結，請檢查輸入內容');
        return;
      }

      // 分類連結：PDF 和 HTML
      const pdfLinks = links.filter(link => link.url.includes('.pdf'));
      const htmlLinks = links.filter(link => link.url.includes('.html'));

      // 設置連結
      setPdfLinks(links.map((link) => ({
        ...link,
        validationStatus: 'idle' as const,
      })));
      setShowManualInputDialog(false);
      setShowLinksDialog(true);
      setManualInputContent(''); // 清空輸入

      // 顯示統計資訊
      if (htmlLinks.length > 0 && pdfLinks.length > 0) {
        showToast.success(`已解析 ${links.length} 個連結（${pdfLinks.length} 個 PDF、${htmlLinks.length} 個 HTML）`);
      } else if (pdfLinks.length > 0) {
        showToast.success(`已解析 ${pdfLinks.length} 個 PDF 連結`);
      } else {
        showToast.success(`已解析 ${htmlLinks.length} 個 HTML 連結`);
      }
      
      // 儲存到快取（只儲存 PDF 連結）
      if (selectedSchool && pdfLinks.length > 0) {
        savePdfLinksCacheMutation.mutate({
          schoolId: selectedSchool.id,
          links: pdfLinks,
          isManuallyEdited: true,
        });
      }
    } catch (error) {
      console.error('解析失敗:', error);
      showToast.error('解析失敗，請檢查輸入格式');
    }
  };

  return (
    <>
      
      <div className="container mx-auto py-8 space-y-6">
      {/* 頁面標題和統計 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">研究所考古題查詢</h1>
        </div>
        <p className="text-muted-foreground">
          瀏覽全台 {stats?.totalSchools || 0} 所學校的研究所考古題網站
        </p>
        {stats && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>碩士班：{stats.masterSchools} 所</span>
            <span>轉學考：{stats.transferSchools} 所</span>
          </div>
        )}
      </div>

      {/* 搜尋欄 */}
      <Card>
        <CardHeader>
          <CardTitle>搜尋學校</CardTitle>
          <CardDescription>輸入學校名稱進行搜尋</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="例如：台灣大學、政治大學"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>搜尋</Button>
            {searchKeyword && (
              <Button variant="outline" onClick={handleClearSearch}>
                清除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 批次下載按鈕 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleBatchDownloadAll}
          disabled={batchDownloadMutation.isPending}
        >
          <Download className="mr-2 h-4 w-4" />
          {batchDownloadMutation.isPending ? '正在爬取...' : '批次下載所有學校'}
        </Button>
      </div>

      {/* 考試類型分頁 */}
      <Tabs value={examType} onValueChange={(value) => setExamType(value as "master" | "transfer")}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="master">碩士班</TabsTrigger>
          <TabsTrigger value="transfer">轉學考</TabsTrigger>
        </TabsList>

        <TabsContent value={examType} className="mt-6">
          {/* 學校列表 */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : schools && schools.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => (
                <Card key={school.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <a
                          href={school.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {school.schoolName}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(school.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            isFavorite(school.id)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {school.displayMethod || "點擊下方按鈕下載 PDF 連結列表"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => handleDownloadLinks(school)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下載連結 TXT
                    </Button>
                    {school.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{school.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>找不到符合條件的學校</p>
                <p className="text-sm mt-2">請嘗試其他搜尋關鍵字</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 使用說明 */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">使用說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 選擇考試類型（碩士班或轉學考）</p>
          <p>2. 使用搜尋欄快速找到目標學校</p>
          <p>3. 點擊「下載連結 TXT」按鈕，系統會自動爬取該校網站的所有 PDF 連結</p>
          <p>4. 下載完成後，會得到一個 TXT 檔案，包含所有考古題 PDF 的連結列表</p>
        </CardContent>
      </Card>

      {/* PDF 連結編輯和驗證對話框 */}
      <Dialog open={showLinksDialog} onOpenChange={setShowLinksDialog}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSchool?.schoolName} - PDF 連結列表</DialogTitle>
            <DialogDescription>
              共 {pdfLinks.length} 個 PDF 檔案，已勾選 {pdfLinks.filter(link => link.checked).length} 個。您可以篩選、編輯網址、驗證有效性，然後下載 TXT 檔案。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 篩選和批次勾選 UI */}
            <div className="flex flex-wrap gap-4 items-center bg-muted/50 p-4 rounded-md">
              {/* 系所篩選 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">系所：</label>
                <select
                  value={filteredDepartment}
                  onChange={(e) => setFilteredDepartment(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">全部</option>
                  {Array.from(new Set(pdfLinks.map(link => link.department).filter(Boolean))).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* 年份篩選 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">年份：</label>
                <select
                  value={filteredYear}
                  onChange={(e) => setFilteredYear(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">全部</option>
                  {Array.from(new Set(pdfLinks.map(link => link.year).filter(Boolean))).sort((a, b) => (b || '').localeCompare(a || '')).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* 批次勾選按鈕 */}
              <div className="flex gap-2 ml-auto">
                <Button size="sm" variant="outline" onClick={() => {
                  setPdfLinks(pdfLinks.map(link => ({ ...link, checked: true })));
                }}>
                  全選
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setPdfLinks(pdfLinks.map(link => ({ ...link, checked: false })));
                }}>
                  取消全選
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  if (filteredDepartment !== 'all') {
                    setPdfLinks(pdfLinks.map(link => 
                      link.department === filteredDepartment ? { ...link, checked: true } : link
                    ));
                  }
                }}>
                  勾選當前系所
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  if (filteredYear !== 'all') {
                    setPdfLinks(pdfLinks.map(link => 
                      link.year === filteredYear ? { ...link, checked: true } : link
                    ));
                  }
                }}>
                  勾選當前年份
                </Button>
              </div>
            </div>

            {/* 驗證和批次爬取按鈕 */}
            <div className="flex justify-end gap-2">
              {pdfLinks.some(link => link.url.includes('.html')) && (
                <Button onClick={handleBatchDeepCrawl} variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  批次深入爬取 PDF
                </Button>
              )}
              <Button onClick={handleValidateUrls} variant="outline">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                驗證所有網址
              </Button>
            </div>

            {/* PDF 連結表格 */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={pdfLinks.every(link => link.checked)}
                        onChange={(e) => {
                          setPdfLinks(pdfLinks.map(link => ({ ...link, checked: e.target.checked })));
                        }}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="w-[250px]">標題</TableHead>
                    <TableHead className="min-w-[400px]">PDF 網址</TableHead>
                    <TableHead className="w-[100px]">狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdfLinks
                    .filter(link => {
                      if (filteredDepartment !== 'all' && link.department !== filteredDepartment) return false;
                      if (filteredYear !== 'all' && link.year !== filteredYear) return false;
                      return true;
                    })
                    .map((link, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={link.checked || false}
                          onChange={(e) => {
                            const originalIndex = pdfLinks.findIndex(l => l.url === link.url);
                            const newLinks = [...pdfLinks];
                            newLinks[originalIndex] = { ...newLinks[originalIndex], checked: e.target.checked };
                            setPdfLinks(newLinks);
                          }}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          {link.title}
                        </a>
                      </TableCell>
                      <TableCell>
                  <Input
                    value={link.url}
                    onChange={(e) => handleUpdatePdfUrl(index, e.target.value)}
                    className="w-full min-w-0"
                  />
                      </TableCell>
                      <TableCell>
                        {link.validationStatus === 'checking' && (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        {link.validationStatus === 'valid' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {link.validationStatus === 'invalid' && (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-5 w-5 text-red-500" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 mr-auto">
              <label className="text-sm font-medium">檔案格式：</label>
              <div className="text-sm text-muted-foreground">
                aria2 格式（支援自動改檔名）
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLinksDialog(false)}>
                取消
              </Button>
              <Button onClick={handleDownloadTxt}>
                <Download className="mr-2 h-4 w-4" />
                下載 TXT 檔案
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提取模式選擇對話框 */}
      <Dialog open={showModeSelectionDialog} onOpenChange={setShowModeSelectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSchool?.schoolName} - 選擇提取模式</DialogTitle>
            <DialogDescription>
              請選擇您想要使用的連結提取方式
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* 自動爬取 */}
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={handleAutoCrawl}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  自動爬取
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  系統自動訪問學校網站並爬取所有 PDF 連結
                </p>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  <li>• 適用於結構簡單的網站</li>
                  <li>• 可能需要等待 10-30 秒</li>
                  <li>• 部分網站可能爬取失敗</li>
                  <li className="text-orange-600 font-medium">⚠️ 檔名可能只有年度（例如：114.pdf）</li>
                </ul>
              </CardContent>
            </Card>

            {/* 手動輸入 */}
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={handleManualInput}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">✏️</span>
                  手動輸入
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  貼上 HTML 原始碼或網址列表，系統自動解析
                </p>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  <li>• 支援 HTML 原始碼（view-source:）</li>
                  <li>• 支援網址列表（每行一個）</li>
                  <li>• 更準確、更快速</li>
                  <li className="text-green-600 font-medium">✅ 支援智能檔名（系所 - 科目 - 年度）</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModeSelectionDialog(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 手動輸入對話框 */}
      <Dialog open={showManualInputDialog} onOpenChange={setShowManualInputDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedSchool?.schoolName} - 手動輸入連結</DialogTitle>
            <DialogDescription>
              請貼上 HTML 原始碼或網址列表（每行一個）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                輸入內容
              </label>
              <textarea
                className="w-full h-[400px] p-3 border rounded-md font-mono text-sm"
                placeholder={`支援兩種格式：\n\n1. HTML 原始碼：\n<html>\n  <a href="exam/LA01_104_01.pdf">104</a>\n  <a href="exam/LA01_103_01.pdf">103</a>\n</html>\n\n2. 網址列表：\nhttps://rapid.lib.ncu.edu.tw/cexamn/exam/LA01_104_01.pdf\nhttps://rapid.lib.ncu.edu.tw/cexamn/exam/LA01_103_01.pdf`}
                value={manualInputContent}
                onChange={(e) => setManualInputContent(e.target.value)}
              />
            </div>

            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium mb-2">使用說明：</p>
              <ul className="space-y-1">
                <li>• <strong>HTML 原始碼</strong>：在瀏覽器按 Ctrl+U 或在網址前加 view-source: 查看原始碼</li>
                <li>• <strong>網址列表</strong>：每行一個網址，支援完整網址或相對路徑</li>
                <li>• 系統會自動識別格式並提取所有 PDF 連結</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowManualInputDialog(false);
              setManualInputContent('');
            }}>
              取消
            </Button>
            <Button onClick={handleParseManualInput}>
              解析連結
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
