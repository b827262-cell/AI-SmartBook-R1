import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Trash2,
  Lock,
  Unlock,
  BarChart2,
  AlertTriangle,
  Copy,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function AdminApiKeys() {
  const utils = trpc.useUtils();

  // ─── 資料查詢 ───────────────────────────────────────────────────────────────
  const { data: keys = [], isLoading } = trpc.apiKeys.list.useQuery();
  const { data: stats } = trpc.apiKeys.getStats.useQuery();

  // ─── 選中的 Key（查看 log） ──────────────────────────────────────────────────
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const { data: logs = [] } = trpc.apiKeys.getLogs.useQuery(
    { id: selectedKeyId! },
    { enabled: !!selectedKeyId }
  );

  // ─── 建立 Key 對話框 ─────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    expiresAt: "",
    dailyCallLimit: 100,
    dailyTokenLimit: 100000,
    singleCallTokenLimit: 5000,
    notes: "",
  });

  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewKey(data.rawKey);
      utils.apiKeys.list.invalidate();
      utils.apiKeys.getStats.invalidate();
    },
    onError: (e) => toast.error("建立失敗: " + e.message),
  });

  const revokeMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      toast.success("已撤銷 API Key");
    },
    onError: (e) => toast.error("操作失敗: " + e.message),
  });

  const unlockMutation = trpc.apiKeys.unlock.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      toast.success("已解鎖 API Key");
    },
    onError: (e) => toast.error("操作失敗: " + e.message),
  });

  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      utils.apiKeys.getStats.invalidate();
      toast.success("已刪除 API Key");
    },
    onError: (e) => toast.error("刪除失敗: " + e.message),
  });

  // ─── helpers ─────────────────────────────────────────────────────────────────
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("已複製到剪貼板");
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  }

  function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  function getStatusBadge(row: any) {
    if (row.isAnomalyLocked) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />異常鎖定</Badge>;
    if (!row.isActive) return <Badge variant="secondary">已停用</Badge>;
    if (isExpired(row.expiresAt)) return <Badge variant="outline" className="text-orange-600 border-orange-300">已到期</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle className="h-3 w-3" />啟用中</Badge>;
  }

  function handleCreate() {
    createMutation.mutate({
      name: form.name,
      expiresAt: form.expiresAt || null,
      dailyCallLimit: form.dailyCallLimit,
      dailyTokenLimit: form.dailyTokenLimit,
      singleCallTokenLimit: form.singleCallTokenLimit,
      notes: form.notes,
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* 頁首 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Key className="h-6 w-6 text-blue-600" />
            API Key 管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">管理外部系統存取 iBrain AI 的 API 金鑰，支援有效期限、用量限制與異常偵測</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setNewKey(null); }} className="gap-2">
          <Plus className="h-4 w-4" />
          建立新 Key
        </Button>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="總 Key 數" value={stats.totalKeys} icon={Key} color="bg-blue-500" />
          <StatCard label="啟用中" value={stats.activeKeys} icon={CheckCircle} color="bg-green-500" />
          <StatCard label="異常鎖定" value={stats.anomalyKeys} icon={AlertTriangle} color="bg-red-500" />
          <StatCard label="今日呼叫" value={stats.todayCalls} icon={Activity} color="bg-purple-500" />
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">今日 Token 用量</p>
            <p className="text-2xl font-bold text-gray-800">{stats.todayTokens.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">累計 Token 用量</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalTokens.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* API Key 列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700">API Key 列表</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">載入中...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-400">尚未建立任何 API Key</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名稱</TableHead>
                <TableHead>Key 前綴</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>到期時間</TableHead>
                <TableHead className="text-right">今日呼叫</TableHead>
                <TableHead className="text-right">今日 Token</TableHead>
                <TableHead className="text-right">累計呼叫</TableHead>
                <TableHead>最後使用</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k: any) => (
                <TableRow key={k.id} className={k.isAnomalyLocked ? "bg-red-50" : ""}>
                  <TableCell>
                    <div className="font-medium text-gray-800">{k.name}</div>
                    {k.notes && <div className="text-xs text-gray-400">{k.notes}</div>}
                    {k.lockReason && (
                      <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{k.lockReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{k.keyPrefix}…</code>
                  </TableCell>
                  <TableCell>{getStatusBadge(k)}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {k.expiresAt ? (
                      <span className={isExpired(k.expiresAt) ? "text-orange-500" : ""}>
                        {formatDate(k.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-gray-400">永久</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={(k.todayCallCount ?? 0) >= (k.dailyCallLimit ?? 100) ? "text-red-600 font-bold" : ""}>
                      {k.todayCallCount ?? 0} / {k.dailyCallLimit ?? 100}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={(k.todayTokenCount ?? 0) >= (k.dailyTokenLimit ?? 100000) ? "text-red-600 font-bold" : ""}>
                      {(k.todayTokenCount ?? 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{(k.totalCallCount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-500">{k.lastUsedAt ? formatDate(k.lastUsedAt) : "從未使用"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="查看使用紀錄"
                        onClick={() => setSelectedKeyId(k.id)}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                      {k.isActive ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="撤銷"
                          className="text-orange-600 hover:text-orange-700"
                          onClick={() => revokeMutation.mutate({ id: k.id })}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="解鎖"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => unlockMutation.mutate({ id: k.id })}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        title="刪除"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm(`確定要刪除「${k.name}」？此操作不可復原。`)) {
                            deleteMutation.mutate({ id: k.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ─── 建立 Key 對話框 ─────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setNewKey(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>建立新 API Key</DialogTitle>
            <DialogDescription>建立後請立即複製金鑰，之後將無法再次查看完整金鑰。</DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  API Key 建立成功！請立即複製並妥善保存
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border rounded px-3 py-2 break-all">{newKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(newKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-red-500 mt-2">⚠ 此金鑰只顯示一次，關閉後無法再次查看</p>
              </div>
              <Button className="w-full" onClick={() => { setShowCreate(false); setNewKey(null); }}>
                已複製，關閉
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>名稱 *</Label>
                <Input
                  placeholder="例如：ji3 系統"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>到期時間（留空 = 永久有效）</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">每日呼叫上限</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.dailyCallLimit}
                    onChange={(e) => setForm({ ...form, dailyCallLimit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">每日 Token 上限</Label>
                  <Input
                    type="number"
                    min={1000}
                    value={form.dailyTokenLimit}
                    onChange={(e) => setForm({ ...form, dailyTokenLimit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">單次 Token 上限 <span className="text-red-500">（超過自動鎖定）</span></Label>
                  <Input
                    type="number"
                    min={100}
                    value={form.singleCallTokenLimit}
                    onChange={(e) => setForm({ ...form, singleCallTokenLimit: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>備註</Label>
                <Textarea
                  placeholder="用途說明..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                disabled={!form.name || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? "建立中..." : "建立 API Key"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 使用紀錄對話框 ──────────────────────────────────────────────────── */}
      <Dialog open={!!selectedKeyId} onOpenChange={(o) => { if (!o) setSelectedKeyId(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              使用紀錄（最近 100 筆）
            </DialogTitle>
            <DialogDescription>
              {keys.find((k: any) => k.id === selectedKeyId)?.name ?? ""}
            </DialogDescription>
          </DialogHeader>
          {logs.length === 0 ? (
            <div className="py-8 text-center text-gray-400">尚無使用紀錄</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Prompt</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Total Token</TableHead>
                  <TableHead className="text-right">回應時間</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>請求摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id} className={log.isAnomaly ? "bg-red-50" : ""}>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="text-xs text-gray-500">{log.callerIp}</TableCell>
                    <TableCell className="text-right text-sm">{(log.promptTokens ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{(log.completionTokens ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={log.isAnomaly ? "text-red-600 font-bold" : "text-sm"}>
                        {(log.totalTokens ?? 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{log.responseTimeMs ? `${log.responseTimeMs}ms` : "—"}</TableCell>
                    <TableCell>
                      {log.isAnomaly ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" />異常
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs">正常</Badge>
                      )}
                      {log.anomalyReason && <div className="text-xs text-red-500 mt-0.5">{log.anomalyReason}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-xs truncate">{log.requestBody}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
