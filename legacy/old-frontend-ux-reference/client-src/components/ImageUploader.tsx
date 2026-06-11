/**
 * 圖片上傳組件
 * 支援本地上傳、貼上、URL 輸入，以及圖片預覽和旋轉功能
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Upload, Link as LinkIcon, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImageUrl?: string;
}

export function ImageUploader({ onImageUploaded, currentImageUrl }: ImageUploaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [imageUrl, setImageUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const uploadImageMutation = trpc.storage.uploadImage.useMutation({
    onSuccess: (data: { success: boolean; url: string; fileKey: string }) => {
      onImageUploaded(data.url);
      toast.success("圖片上傳成功");
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`圖片上傳失敗：${error.message}`);
    },
  });

  // 監聽貼上事件
  useEffect(() => {
    if (!isDialogOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isDialogOpen]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      toast.error("請輸入圖片 URL");
      return;
    }

    // 驗證 URL 格式
    try {
      new URL(imageUrl);
      setPreviewImage(imageUrl);
      setRotation(0);
    } catch {
      toast.error("請輸入有效的 URL");
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleConfirm = async () => {
    if (uploadMode === "url") {
      // URL 模式：直接使用 URL
      if (!imageUrl.trim()) {
        toast.error("請輸入圖片 URL");
        return;
      }
      onImageUploaded(imageUrl);
      toast.success("圖片已添加");
      handleClose();
    } else {
      // 檔案模式：上傳到 S3
      if (!selectedFile) {
        toast.error("請選擇圖片檔案");
        return;
      }

      // 如果有旋轉，需要先處理圖片
      if (rotation !== 0) {
        const rotatedFile = await rotateImage(selectedFile, rotation);
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadImageMutation.mutate({
            filename: selectedFile.name,
            contentType: selectedFile.type,
            base64Data: base64,
          });
        };
        reader.readAsDataURL(rotatedFile);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadImageMutation.mutate({
            filename: selectedFile.name,
            contentType: selectedFile.type,
            base64Data: base64,
          });
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const rotateImage = (file: File, degrees: number): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          if (degrees === 90 || degrees === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((degrees * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }));
            }
          }, file.type);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setPreviewImage(null);
    setSelectedFile(null);
    setImageUrl("");
    setRotation(0);
    setUploadMode("file");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {currentImageUrl && (
          <div className="relative w-20 h-20 border rounded overflow-hidden">
            <img src={currentImageUrl} alt="Current" className="w-full h-full object-cover" />
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-1" />
          {currentImageUrl ? "更換圖片" : "添加圖片"}
        </Button>
        {currentImageUrl && (
          <Button variant="ghost" size="sm" onClick={() => onImageUploaded("")}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" ref={dialogRef}>
          <DialogHeader>
            <DialogTitle>上傳圖片</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 上傳模式選擇 */}
            <div className="flex gap-2">
              <Button
                variant={uploadMode === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode("file")}
              >
                <Upload className="w-4 h-4 mr-1" />
                本地上傳
              </Button>
              <Button
                variant={uploadMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode("url")}
              >
                <LinkIcon className="w-4 h-4 mr-1" />
                URL 輸入
              </Button>
            </div>

            {/* 上傳區域 */}
            {uploadMode === "file" ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  選擇圖片檔案
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  或直接貼上圖片（Ctrl+V / Cmd+V）
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="輸入圖片 URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUrlSubmit();
                    }
                  }}
                />
                <Button onClick={handleUrlSubmit}>預覽</Button>
              </div>
            )}

            {/* 預覽區域 */}
            {previewImage && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">預覽</span>
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="w-4 h-4 mr-1" />
                    旋轉 90°
                  </Button>
                </div>
                <div className="border rounded p-4 bg-gray-50 flex items-center justify-center min-h-[200px]">
                  <img
                    src={previewImage}
                    alt="Preview"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="max-w-full max-h-[400px] object-contain transition-transform"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={uploadImageMutation.isPending || (!previewImage && uploadMode === "file")}
            >
              {uploadImageMutation.isPending ? "上傳中..." : "確定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
