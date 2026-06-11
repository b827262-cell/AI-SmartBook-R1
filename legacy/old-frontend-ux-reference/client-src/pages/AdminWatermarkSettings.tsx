import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Layers, Upload, Eye, Save, RefreshCw } from "lucide-react";

interface WatermarkConfig {
  isEnabled: number;
  textEnabled: number;
  textTemplate: string;
  fontSize: number;
  fontColor: string;
  imageEnabled: number;
  imageUrl: string | null;
  imageKey: string | null;
  imageWidth: number;
  imageHeight: number;
  opacity: number;
  rotation: number;
  repeatX: number;
  repeatY: number;
  voucherEnabled: number;
  voucherPrompt: string;
}

const DEFAULT_CONFIG: WatermarkConfig = {
  isEnabled: 1,
  textEnabled: 1,
  textTemplate: "{voucherCode}",
  fontSize: 20,
  fontColor: "#888888",
  imageEnabled: 0,
  imageUrl: null,
  imageKey: null,
  imageWidth: 80,
  imageHeight: 80,
  opacity: 25,
  rotation: -30,
  repeatX: 2,
  repeatY: 3,
  voucherEnabled: 1,
  voucherPrompt: "請輸入您的購書憑證編號以解鎖閱讀",
};

export default function AdminWatermarkSettings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [previewVoucher, setPreviewVoucher] = useState("ABC-12345");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = trpc.watermarkAdmin.getSettings.useQuery();
  const updateMutation = trpc.watermarkAdmin.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("浮水印設定已儲存！");
      setIsDirty(false);
    },
    onError: (err) => toast.error("儲存失敗：" + err.message),
  });
  const uploadMutation = trpc.watermarkAdmin.uploadImage.useMutation({
    onSuccess: (data) => {
      setConfig((prev) => ({ ...prev, imageUrl: data.url, imageKey: data.key }));
      setIsDirty(true);
      toast.success("圖案上傳成功！");
    },
    onError: (err) => toast.error("上傳失敗：" + err.message),
  });

  useEffect(() => {
    if (settings) {
      setConfig({
        isEnabled: settings.isEnabled,
        textEnabled: settings.textEnabled,
        textTemplate: settings.textTemplate,
        fontSize: settings.fontSize,
        fontColor: settings.fontColor,
        imageEnabled: settings.imageEnabled,
        imageUrl: settings.imageUrl ?? null,
        imageKey: (settings as any).imageKey ?? null,
        imageWidth: settings.imageWidth,
        imageHeight: settings.imageHeight,
        opacity: settings.opacity,
        rotation: settings.rotation,
        repeatX: settings.repeatX,
        repeatY: settings.repeatY,
        voucherEnabled: settings.voucherEnabled,
        voucherPrompt: settings.voucherPrompt,
      });
    }
  }, [settings]);

  if (!user || user.role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">無權限存取此頁面</div>;
  }

  const update = (patch: Partial<WatermarkConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      isEnabled: config.isEnabled,
      textEnabled: config.textEnabled,
      textTemplate: config.textTemplate,
      fontSize: config.fontSize,
      fontColor: config.fontColor,
      imageEnabled: config.imageEnabled,
      imageUrl: config.imageUrl,
      imageKey: config.imageKey,
      imageWidth: config.imageWidth,
      imageHeight: config.imageHeight,
      opacity: config.opacity,
      rotation: config.rotation,
      repeatX: config.repeatX,
      repeatY: config.repeatY,
      voucherEnabled: config.voucherEnabled,
      voucherPrompt: config.voucherPrompt,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("圖案檔案不能超過 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMutation.mutate({ base64, mimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  // 計算預覽文字
  const previewText = config.textTemplate.replace("{voucherCode}", previewVoucher);

  // 預覽浮水印
  const renderPreview = () => {
    const items = [];
    for (let y = 0; y < config.repeatY; y++) {
      for (let x = 0; x < config.repeatX; x++) {
        items.push(
          <div
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: `${(x / config.repeatX) * 100 + 50 / config.repeatX}%`,
              top: `${(y / config.repeatY) * 100 + 50 / config.repeatY}%`,
              transform: `translate(-50%, -50%) rotate(${config.rotation}deg)`,
              opacity: config.opacity / 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {config.imageEnabled === 1 && config.imageUrl && (
              <img
                src={config.imageUrl}
                style={{ width: config.imageWidth / 2, height: config.imageHeight / 2, objectFit: "contain" }}
                alt="watermark"
              />
            )}
            {config.textEnabled === 1 && (
              <span
                style={{
                  fontSize: config.fontSize / 1.5,
                  color: config.fontColor,
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                }}
              >
                {previewText}
              </span>
            )}
          </div>
        );
      }
    }
    return items;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">PDF 浮水印管理</h1>
            <p className="text-sm text-muted-foreground">設定智能書本 PDF 的浮水印樣式與購書憑證驗證</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "儲存中..." : "儲存設定"}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：設定面板 */}
        <div className="space-y-5">
          {/* 全域開關 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">浮水印總開關</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>啟用 PDF 浮水印</Label>
                <Switch
                  checked={config.isEnabled === 1}
                  onCheckedChange={(v) => update({ isEnabled: v ? 1 : 0 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 購書憑證驗證 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">購書憑證驗證</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>啟用購書憑證驗證</Label>
                <Switch
                  checked={config.voucherEnabled === 1}
                  onCheckedChange={(v) => update({ voucherEnabled: v ? 1 : 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">驗證提示文字</Label>
                <Input
                  value={config.voucherPrompt}
                  onChange={(e) => update({ voucherPrompt: e.target.value })}
                  placeholder="請輸入您的購書憑證編號以解鎖閱讀"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                💡 每本書的贈點數可在「智能書本管理」中個別設定
              </p>
            </CardContent>
          </Card>

          {/* 文字浮水印 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">文字浮水印</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>顯示文字</Label>
                <Switch
                  checked={config.textEnabled === 1}
                  onCheckedChange={(v) => update({ textEnabled: v ? 1 : 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">文字模板</Label>
                <Input
                  value={config.textTemplate}
                  onChange={(e) => update({ textTemplate: e.target.value })}
                  placeholder="{voucherCode}"
                />
                <p className="text-xs text-muted-foreground">
                  使用 <code className="bg-muted px-1 rounded">{"{voucherCode}"}</code> 代入購書憑證編號
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">字體大小：{config.fontSize}px</Label>
                  <Slider
                    min={10} max={48} step={1}
                    value={[config.fontSize]}
                    onValueChange={([v]) => update({ fontSize: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">字體顏色</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.fontColor}
                      onChange={(e) => update({ fontColor: e.target.value })}
                      className="w-10 h-9 rounded border cursor-pointer"
                    />
                    <Input
                      value={config.fontColor}
                      onChange={(e) => update({ fontColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 圖案浮水印 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">圖案浮水印</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>顯示圖案</Label>
                <Switch
                  checked={config.imageEnabled === 1}
                  onCheckedChange={(v) => update({ imageEnabled: v ? 1 : 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">上傳圖案（PNG/SVG，建議透明背景）</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadMutation.isPending ? "上傳中..." : "選擇圖案"}
                  </Button>
                  {config.imageUrl && (
                    <img src={config.imageUrl} className="w-10 h-10 object-contain border rounded" alt="preview" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">圖案寬度：{config.imageWidth}px</Label>
                  <Slider
                    min={20} max={200} step={5}
                    value={[config.imageWidth]}
                    onValueChange={([v]) => update({ imageWidth: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">圖案高度：{config.imageHeight}px</Label>
                  <Slider
                    min={20} max={200} step={5}
                    value={[config.imageHeight]}
                    onValueChange={([v]) => update({ imageHeight: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 排版設定 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">排版設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm">透明度：{config.opacity}%</Label>
                <Slider
                  min={5} max={80} step={5}
                  value={[config.opacity]}
                  onValueChange={([v]) => update({ opacity: v })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">旋轉角度：{config.rotation}°</Label>
                <Slider
                  min={-90} max={90} step={5}
                  value={[config.rotation]}
                  onValueChange={([v]) => update({ rotation: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">橫向重複：{config.repeatX} 次</Label>
                  <Slider
                    min={1} max={5} step={1}
                    value={[config.repeatX]}
                    onValueChange={([v]) => update({ repeatX: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">縱向重複：{config.repeatY} 次</Label>
                  <Slider
                    min={1} max={6} step={1}
                    value={[config.repeatY]}
                    onValueChange={([v]) => update({ repeatY: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：即時預覽 */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  即時預覽
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">預覽憑證：</Label>
                  <Input
                    value={previewVoucher}
                    onChange={(e) => setPreviewVoucher(e.target.value)}
                    className="w-32 h-7 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* PDF 頁面模擬 */}
              <div
                className="relative bg-white border rounded-lg overflow-hidden"
                style={{ aspectRatio: "210/297", maxHeight: "600px" }}
              >
                {/* 模擬 PDF 內容 */}
                <div className="absolute inset-0 p-6 text-gray-800">
                  <div className="text-center mb-4">
                    <div className="text-lg font-bold mb-1">資料庫應用</div>
                    <div className="text-sm text-gray-500">【第一回】</div>
                  </div>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="font-semibold">第一章　資料庫概論 .............. 2</div>
                    <div className="pl-4">一、定義與介紹 .............. 2</div>
                    <div className="pl-4">二、資料庫與檔案系統 .............. 6</div>
                    <div className="pl-4">三、資料庫系統架構 .............. 9</div>
                    <div className="font-semibold mt-2">第二章　概念資料模型 .............. 30</div>
                    <div className="pl-4">一、實體關係模型 .............. 30</div>
                    <div className="pl-4">二、強化實體關係 .............. 42</div>
                  </div>
                </div>

                {/* 浮水印層 */}
                {config.isEnabled === 1 && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {renderPreview()}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3 text-center">
                ↑ 模擬 PDF 頁面效果（實際顯示以書本內容為準）
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
