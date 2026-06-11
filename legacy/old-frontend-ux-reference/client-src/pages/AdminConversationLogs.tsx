import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search, MessageSquare, User, Mail, Eye, Trash2,
  FileDown, Ban, ShieldOff, ChevronLeft, ChevronRight,
  Bot, Image as ImageIcon, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 助教風格對應名稱
const CHAT_STYLE_LABELS: Record<string, string> = {
  brother_kind: "親切學長", brother_strict: "嚴格學長", brother_funny: "幽默學長",
  sister_kind: "親切學姊", sister_strict: "嚴格學姊", sister_funny: "幽默學姊",
};

type ConvItem = {
  id: number; title: string; subject: string | null; chatStyle: string | null;
  messageCount: number; createdAt: string | null; lastMessageAt: string | null;
  userId: number | null; userName: string; userEmail: string;
};

// ─── Word 匯出工具（純前端，使用 docx 套件）─────────────────────────────
async function exportToWord(convData: any[]) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, BorderStyle, PageBorder } = await import("docx");

  const exportTime = new Date().toLocaleString("zh-TW");
  const children: any[] = [];

  // ── 官方標題頁 ──
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "⚠ 異常對話記錄 / 封鎖證據文件",
          bold: true,
          size: 40,
          color: "CC0000",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "iBrain 智匯 AI 課輔助教系統", bold: true, size: 28, color: "1d4ed8" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `匯出時間：${exportTime}`, size: 20, color: "555555" }),
        new TextRun({ text: "　　", size: 20 }),
        new TextRun({ text: `共 ${convData.length} 筆對話記錄`, size: 20, color: "555555" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "本文件由系統管理員匯出，作為使用者異常行為之記錄與封鎖依據，請妥善保存。",
          size: 18,
          color: "888888",
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({ text: "═".repeat(50), alignment: AlignmentType.CENTER, spacing: { after: 600 } })
  );

  for (const { conversation: conv, messages } of convData) {
    // 對話標題
    children.push(
      new Paragraph({
        text: `【對話記錄】${conv.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "學員姓名：", bold: true }),
          new TextRun(conv.userName),
          new TextRun("　　"),
          new TextRun({ text: "Gmail：", bold: true }),
          new TextRun(conv.userEmail || "未提供"),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "助教風格：", bold: true }),
          new TextRun(CHAT_STYLE_LABELS[conv.chatStyle || ""] || conv.chatStyle || "未知"),
          new TextRun("　　"),
          new TextRun({ text: "開始時間：", bold: true }),
          new TextRun(conv.createdAt ? new Date(conv.createdAt).toLocaleString("zh-TW") : ""),
        ],
        spacing: { after: 300 },
      })
    );

    // 每則訊息
    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "🧑 學員" : "🤖 AI 助教";
      const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleString("zh-TW") : "";

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${roleLabel}　`, bold: true, color: msg.role === "user" ? "1d4ed8" : "7c3aed" }),
            new TextRun({ text: timeStr, size: 18, color: "888888" }),
          ],
          spacing: { before: 200, after: 60 },
        })
      );

      // 附件圖片
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.mimeType?.startsWith("image/") && att.fileUrl) {
            try {
              const resp = await fetch(att.fileUrl);
              const buf = await resp.arrayBuffer();
              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: buf,
                      transformation: { width: 400, height: 300 },
                      type: att.mimeType.includes("png") ? "png" : "jpg",
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: `📎 ${att.fileName || "圖片"}`, size: 18, color: "888888" })],
                  spacing: { after: 80 },
                })
              );
            } catch {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: `📎 [圖片無法載入] ${att.fileName || ""}`, color: "cc0000" })],
                })
              );
            }
          } else if (att.fileName) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `📎 附件：${att.fileName}`, size: 18, color: "888888" })],
                spacing: { after: 80 },
              })
            );
          }
        }
      }

      // 訊息內容（逐行分段）
      const lines = (msg.content || "").split("\n");
      for (const line of lines) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line || " " })],
            spacing: { after: 40 },
            indent: { left: 200 },
          })
        );
      }
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }

    // 分隔線
    children.push(
      new Paragraph({
        text: "─".repeat(40),
        spacing: { before: 200, after: 400 },
        alignment: AlignmentType.CENTER,
      })
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: {
          run: { font: "Microsoft JhengHei", size: 22 },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `對話記錄_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 主元件 ──────────────────────────────────────────────────────────────
export default function AdminConversationLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 封鎖對話框
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<{ userId: number; userName: string; userEmail: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  // 警告對話框
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [warnTarget, setWarnTarget] = useState<{ userId: number; userName: string; userEmail: string } | null>(null);
  const [warnMessage, setWarnMessage] = useState("");

  // 刪除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 匯出狀態
  const [exporting, setExporting] = useState(false);

  const utils = trpc.useUtils();

  // 對話列表
  const { data: listData, isLoading, refetch } = trpc.adminConversations.listAllConversations.useQuery({
    page, pageSize: 20, search: search || undefined,
  });

  // 單筆對話詳情
  const { data: detailData, isLoading: isLoadingDetail } = trpc.adminConversations.getConversationDetail.useQuery(
    { conversationId: selectedConvId! },
    { enabled: selectedConvId !== null }
  );

  // 匯出資料查詢（手動觸發）
  const exportQuery = trpc.adminConversations.getConversationsForExport.useQuery(
    { conversationIds: Array.from(selected) },
    { enabled: false }
  );

  // 封鎖 mutation
  const banMutation = trpc.adminConversations.banUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.isBanned ? "已封鎖該學員帳號" : "已解除封鎖");
      setBanDialogOpen(false);
      setBanReason("");
      refetch();
    },
    onError: () => toast.error("操作失敗，請稍後再試"),
  });

  // 警告 mutation
  const warnMutation = trpc.adminConversations.sendWarning.useMutation({
    onSuccess: () => {
      toast.success("警告已發送，學員登入時將看到警告");
      setWarnDialogOpen(false);
      setWarnMessage("");
    },
    onError: () => toast.error("發送警告失敗，請稍後再試"),
  });

  // 批次刪除 mutation
  const deleteMutation = trpc.adminConversations.deleteConversations.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.deleted} 筆對話`);
      setSelected(new Set());
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: () => toast.error("刪除失敗，請稍後再試"),
  });

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };

  // 全選 / 取消全選
  const allIds = listData?.conversations.map((c) => c.id) || [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      allIds.forEach((id) => next.delete(id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      allIds.forEach((id) => next.add(id));
      setSelected(next);
    }
  };
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // 匯出 Word
  const handleExport = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      const result = await utils.adminConversations.getConversationsForExport.fetch({
        conversationIds: Array.from(selected),
      });
      await exportToWord(result.conversations);
      toast.success(`已匯出 ${result.conversations.length} 筆對話為 Word 檔`);
    } catch (e) {
      toast.error("匯出失敗，請稍後再試");
    } finally {
      setExporting(false);
    }
  };

  // 取得被選中對話的學員資訊（用於封鎖）
  const selectedConvs = listData?.conversations.filter((c) => selected.has(c.id)) || [];
  const uniqueUsers = Array.from(
    new Map(selectedConvs.filter((c) => c.userId).map((c) => [c.userId, c])).values()
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          對話完整記錄
        </h1>
        <p className="text-muted-foreground mt-1">查看所有學員與 AI 助教的完整對話，支援批次刪除、匯出 Word 及封鎖帳號</p>
      </div>

      {/* 搜尋列 */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜尋學員姓名、Email 或對話標題..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleKeyDown} className="pl-10" />
        </div>
        <Button onClick={handleSearch}>搜尋</Button>
        {search && <Button variant="outline" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>清除</Button>}
      </div>

      {/* 批次操作列 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">已勾選 {selected.size} 筆</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              {exporting ? "匯出中..." : "匯出 Word"}
            </Button>
            {uniqueUsers.length === 1 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => {
                  const u = uniqueUsers[0];
                  setBanTarget({ userId: u.userId!, userName: u.userName, userEmail: u.userEmail });
                  setBanDialogOpen(true);
                }}>
                <Ban className="h-4 w-4" />
                封鎖學員
              </Button>
            )}
            <Button variant="destructive" size="sm" className="gap-1.5"
              onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
              批次刪除
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>取消</Button>
          </div>
        </div>
      )}

      {/* 統計 */}
      {listData && (
        <p className="text-sm text-muted-foreground">
          共 <span className="font-semibold text-foreground">{listData.total}</span> 筆對話記錄
          {search && `（搜尋：「${search}」）`}
        </p>
      )}

      {/* 對話列表 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="全選" />
              </TableHead>
              <TableHead>學員</TableHead>
              <TableHead>Gmail</TableHead>
              <TableHead>對話標題</TableHead>
              <TableHead className="text-center">助教</TableHead>
              <TableHead className="text-center">訊息數</TableHead>
              <TableHead className="text-center">最後活動</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">載入中...</TableCell></TableRow>
            ) : listData?.conversations.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">沒有找到對話記錄</TableCell></TableRow>
            ) : (
              listData?.conversations.map((conv) => (
                <TableRow key={conv.id} className={cn("hover:bg-muted/30", selected.has(conv.id) && "bg-primary/5")}>
                  <TableCell>
                    <Checkbox checked={selected.has(conv.id)} onCheckedChange={() => toggleOne(conv.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{conv.userName}</span>
                      {conv.isBanned && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          <Ban className="h-2.5 w-2.5" />封鎖
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>{conv.userEmail || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate text-sm">{conv.title}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {CHAT_STYLE_LABELS[conv.chatStyle || ""] || conv.chatStyle || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{conv.messageCount}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString("zh-TW") : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setSelectedConvId(conv.id)} className="gap-1 h-7 px-2">
                        <Eye className="h-3 w-3" />查看
                      </Button>
                      {conv.userId && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-yellow-600 hover:bg-yellow-50"
                            title="發送警告"
                            onClick={() => {
                              setWarnTarget({ userId: conv.userId!, userName: conv.userName, userEmail: conv.userEmail });
                              setWarnDialogOpen(true);
                            }}>
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                          {conv.isBanned ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600 hover:bg-green-50"
                              title="解除封鎖"
                              onClick={() => banMutation.mutate({ userId: conv.userId!, isBanned: false })}>
                              <ShieldOff className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-orange-600 hover:bg-orange-50"
                              title="封鎖學員"
                              onClick={() => {
                                setBanTarget({ userId: conv.userId!, userName: conv.userName, userEmail: conv.userEmail });
                                setBanDialogOpen(true);
                              }}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分頁 */}
      {listData && listData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">第 {listData.page} / {listData.totalPages} 頁</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />上一頁
            </Button>
            <Button variant="outline" size="sm" disabled={page === listData.totalPages} onClick={() => setPage(page + 1)}>
              下一頁<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── 對話詳情 Dialog ── */}
      <Dialog open={selectedConvId !== null} onOpenChange={() => setSelectedConvId(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg">{detailData?.conversation.title || "對話詳情"}</DialogTitle>
            {detailData && (
              <DialogDescription className="flex flex-wrap gap-3 mt-1">
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{detailData.conversation.userName}</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{detailData.conversation.userEmail || "未提供"}</span>
                <Badge variant="outline" className="text-xs">
                  {CHAT_STYLE_LABELS[detailData.conversation.chatStyle || ""] || detailData.conversation.chatStyle || "未知助教"}
                </Badge>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {isLoadingDetail ? (
              <div className="text-center py-12 text-muted-foreground">載入中...</div>
            ) : detailData?.messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">此對話沒有訊息</div>
            ) : (
              detailData?.messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-semibold", msg.role === "user" ? "text-blue-600" : "text-purple-600")}>
                        {msg.role === "user" ? "學員" : "AI 助教"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString("zh-TW") : ""}
                      </span>
                    </div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(msg.attachments as any[]).map((att: any, idx: number) => {
                          const isImage = att.mimeType?.startsWith("image/");
                          return (
                            <div key={idx}>
                              {isImage && att.fileUrl ? (
                                <button onClick={() => setPreviewImage(att.fileUrl)}
                                  className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                                  <img src={att.fileUrl} alt={att.fileName || "截圖"}
                                    className="h-24 w-auto object-contain bg-muted" />
                                  <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />{att.fileName || "圖片"}
                                  </div>
                                </button>
                              ) : (
                                <div className="border rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1 bg-muted/30">
                                  📎 {att.fileName || "附件"}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className={cn("rounded-lg px-4 py-3 text-sm whitespace-pre-wrap break-words",
                      msg.role === "user" ? "bg-blue-50 text-blue-900 border border-blue-100" : "bg-muted text-foreground")}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-6 py-4 border-t shrink-0 flex justify-end">
            <Button variant="outline" onClick={() => setSelectedConvId(null)}>關閉</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 圖片預覽 ── */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="sr-only"><DialogTitle>圖片預覽</DialogTitle></DialogHeader>
          {previewImage && <img src={previewImage} alt="預覽圖片" className="w-full max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>

      {/* ── 封鎖學員 Dialog ── */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />封鎖學員帳號
            </DialogTitle>
            <DialogDescription>
              封鎖後，該學員將無法登入系統。請確認封鎖對象正確。
            </DialogDescription>
          </DialogHeader>
          {banTarget && (
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm space-y-1">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-orange-600" /><span className="font-medium">{banTarget.userName}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-orange-600" /><span>{banTarget.userEmail || "未提供"}</span></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banReason">封鎖原因（必填）</Label>
                <Textarea id="banReason" placeholder="請說明封鎖原因，例如：發送不當內容、濫用系統..." value={banReason}
                  onChange={(e) => setBanReason(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBanDialogOpen(false); setBanReason(""); }}>取消</Button>
            <Button variant="destructive" disabled={!banReason.trim() || banMutation.isPending}
              onClick={() => banTarget && banMutation.mutate({ userId: banTarget.userId, isBanned: true, banReason })}>
              <Ban className="h-4 w-4 mr-1" />
              {banMutation.isPending ? "封鎖中..." : "確認封鎖"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 發送警告 Dialog ── */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />發送警告給學員
            </DialogTitle>
            <DialogDescription>
              警告會在學員下次登入時顯示，學員確認後才能繼續使用系統。
            </DialogDescription>
          </DialogHeader>
          {warnTarget && (
            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm space-y-1">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-yellow-600" /><span className="font-medium">{warnTarget.userName}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-yellow-600" /><span>{warnTarget.userEmail || "未提供"}</span></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warnMessage">警告內容（必填）</Label>
                <Textarea
                  id="warnMessage"
                  placeholder="請說明警告原因，例如：發送不當內容、溺用系統功能..."
                  value={warnMessage}
                  onChange={(e) => setWarnMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setWarnDialogOpen(false); setWarnMessage(""); }}>取消</Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              disabled={!warnMessage.trim() || warnMutation.isPending}
              onClick={() => warnTarget && warnMutation.mutate({ userId: warnTarget.userId, message: warnMessage })}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              {warnMutation.isPending ? "發送中..." : "確認發送警告"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 批次刪除確認 ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認批次刪除？</AlertDialogTitle>
            <AlertDialogDescription>
              即將刪除 <span className="font-semibold text-destructive">{selected.size}</span> 筆對話及其所有訊息，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate({ conversationIds: Array.from(selected) })}>
              {deleteMutation.isPending ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
