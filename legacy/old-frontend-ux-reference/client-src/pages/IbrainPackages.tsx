import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

/**
 * iBrain 資料包管理頁面
 * 
 * 功能：
 * - 上傳 .ibrain 資料包
 * - 查看資料包列表
 * - 查看資料包詳情
 * - 刪除資料包
 */

export default function IbrainPackages() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 查詢資料包列表
  const packagesQuery = trpc.ibrainPackage.list.useQuery({
    limit: 20,
    offset: 0,
  });
  
  // 上傳 mutation
  const uploadMutation = trpc.ibrainPackage.upload.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`上傳成功！已提取 ${data.questionCount} 題`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        packagesQuery.refetch();
      } else {
        toast.error(data.error || "上傳失敗");
      }
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(`上傳失敗：${error.message}`);
      setIsUploading(false);
    },
  });
  
  // 刪除 mutation
  const deleteMutation = trpc.ibrainPackage.delete.useMutation({
    onSuccess: () => {
      toast.success("刪除成功");
      packagesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });
  
  // 處理檔案選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".ibrain")) {
        toast.error("請選擇 .ibrain 檔案");
        return;
      }
      setSelectedFile(file);
    }
  };
  
  // 處理上傳
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("請選擇檔案");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // 讀取檔案內容
      const fileContent = await readFileAsBase64(selectedFile);
      
      // 上傳
      await uploadMutation.mutateAsync({
        fileName: selectedFile.name,
        fileContent,
      });
    } catch (error) {
      toast.error(`讀取檔案失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
      setIsUploading(false);
    }
  };
  
  // 讀取檔案為 Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // 移除 data:application/octet-stream;base64, 前綴
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  // 處理刪除
  const handleDelete = async (id: number, fileName: string) => {
    if (!confirm(`確定要刪除「${fileName}」嗎？此操作無法復原。`)) {
      return;
    }
    
    await deleteMutation.mutateAsync({ id });
  };
  
  // 狀態標籤
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />已完成</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />處理中</Badge>;
      case "failed":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />失敗</Badge>;
      default:
        return <Badge className="bg-gray-500"><Clock className="w-3 h-3 mr-1" />待處理</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">iBrain 資料包管理</h1>
        <p className="text-muted-foreground">
          上傳和管理從本地端 iBrain Extractor 工具生成的資料包
        </p>
      </div>
      
      {/* 上傳區域 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>上傳資料包</CardTitle>
          <CardDescription>
            選擇 .ibrain 檔案並上傳，系統會自動解析並儲存題目到資料庫
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ibrain"
              onChange={handleFileChange}
              className="hidden"
              id="ibrain-file-input"
            />
            <label htmlFor="ibrain-file-input">
              <Button variant="outline" asChild>
                <span>
                  <FileText className="w-4 h-4 mr-2" />
                  選擇檔案
                </span>
              </Button>
            </label>
            
            {selectedFile && (
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  已選擇：<span className="font-medium">{selectedFile.name}</span>
                  （{(selectedFile.size / 1024).toFixed(2)} KB）
                </p>
              </div>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "上傳中..." : "上傳"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 資料包列表 */}
      <Card>
        <CardHeader>
          <CardTitle>資料包列表</CardTitle>
          <CardDescription>
            已上傳的資料包和題目統計
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packagesQuery.isLoading && (
            <p className="text-center text-muted-foreground py-8">載入中...</p>
          )}
          
          {packagesQuery.error && (
            <p className="text-center text-red-500 py-8">
              載入失敗：{packagesQuery.error.message}
            </p>
          )}
          
          {packagesQuery.data && packagesQuery.data.packages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              尚未上傳任何資料包
            </p>
          )}
          
          {packagesQuery.data && packagesQuery.data.packages.length > 0 && (
            <div className="space-y-4">
              {packagesQuery.data.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{pkg.fileName}</h3>
                        {getStatusBadge(pkg.status)}
                      </div>
                      
                      {pkg.metadata && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          {pkg.metadata.examName && (
                            <p>考試名稱：{pkg.metadata.examName}</p>
                          )}
                          {pkg.metadata.category && (
                            <p>類科：{pkg.metadata.category}</p>
                          )}
                          {pkg.metadata.subject && (
                            <p>科目：{pkg.metadata.subject}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-muted-foreground">
                          總題數：<span className="font-medium text-foreground">{pkg.totalQuestions}</span>
                        </span>
                        <span className="text-green-600">
                          已批准：{pkg.approvedQuestions}
                        </span>
                        <span className="text-yellow-600">
                          待審核：{pkg.pendingQuestions}
                        </span>
                        <span className="text-red-600">
                          已拒絕：{pkg.rejectedQuestions}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        上傳時間：{new Date(pkg.uploadedAt).toLocaleString("zh-TW")}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/admin/ibrain-question-review?packageId=${pkg.id}`;
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        審核題目
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(pkg.id, pkg.fileName)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        刪除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
