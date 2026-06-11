import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, RefreshCw, Edit2, Users, ChevronLeft, ChevronRight } from "lucide-react";

type IdentityType = 'ibrain' | 'gaodian' | 'book_buyer' | 'trial' | 'unset';

const IDENTITY_LABELS: Record<string, { label: string; color: string }> = {
  ibrain:     { label: '知識達學員', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  gaodian:    { label: '高點學員',   color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  book_buyer: { label: '購書者',     color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  trial:      { label: '試玩訪客',   color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  unset:      { label: '未設定',     color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export default function AdminMemberIdentity() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editIdentity, setEditIdentity] = useState<IdentityType>('unset');
  const [editAccount, setEditAccount] = useState("");

  const { data, isLoading, refetch } = trpc.credits.getMemberIdentityList.useQuery({
    page,
    pageSize: 20,
    identityType: filterType as any,
    search: search || undefined,
  });

  const updateMutation = trpc.credits.updateMemberIdentity.useMutation({
    onSuccess: () => {
      toast.success("身分已更新");
      setEditingMember(null);
      refetch();
    },
    onError: (err) => toast.error("更新失敗：" + err.message),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleFilterChange = (val: string) => {
    setFilterType(val);
    setPage(1);
  };

  const openEdit = (member: any) => {
    setEditingMember(member);
    setEditIdentity(member.identityType || 'unset');
    setEditAccount(member.memberAccount || "");
  };

  const handleSave = () => {
    if (!editingMember) return;
    updateMutation.mutate({
      userId: editingMember.id,
      identityType: editIdentity,
      memberAccount: editAccount || undefined,
    });
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  // 統計各身分人數
  const stats = data?.members.reduce((acc, m) => {
    const t = m.identityType || 'unset';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">會員身分管理</h1>
        <Button variant="ghost" size="icon" onClick={() => refetch()} title="重新整理">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* 身分統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(IDENTITY_LABELS).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key === filterType ? 'all' : key)}
            className={`rounded-xl p-3 text-left border-2 transition-all ${
              filterType === key ? 'border-primary' : 'border-transparent'
            } bg-card hover:bg-accent`}
          >
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold text-foreground">
              {isLoading ? '—' : (stats?.[key] ?? 0)}
            </p>
          </button>
        ))}
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="搜尋姓名、Email、帳號..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="w-4 h-4 mr-1" />
            搜尋
          </Button>
        </div>
        <Select value={filterType} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="篩選身分" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部身分</SelectItem>
            <SelectItem value="ibrain">知識達學員</SelectItem>
            <SelectItem value="gaodian">高點學員</SelectItem>
            <SelectItem value="book_buyer">購書者</SelectItem>
            <SelectItem value="trial">試玩訪客</SelectItem>
            <SelectItem value="unset">未設定</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 資料表 */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">用戶</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">身分</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">帳號</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">點數</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">最後登入</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">載入中...</td></tr>
            ) : !data?.members.length ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">沒有符合條件的會員</td></tr>
            ) : data.members.map((m, i) => {
              const identity = IDENTITY_LABELS[m.identityType || 'unset'];
              const totalCredits = (m.credits ?? 0) + (m.permanentCredits ?? 0) + (m.dailyCredits ?? 0);
              return (
                <tr key={m.id} className={`border-t border-border ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{m.nickname || m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${identity.color}`}>
                      {identity.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {m.memberAccount || <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                    {totalCredits}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.lastSignedIn ? new Date(m.lastSignedIn).toLocaleDateString('zh-TW') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      編輯
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            共 {data.total} 筆，第 {page} / {totalPages} 頁
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 編輯身分對話框 */}
      <Dialog open={!!editingMember} onOpenChange={open => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯會員身分</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">用戶</p>
                <p className="text-sm text-muted-foreground">{editingMember.nickname || editingMember.name} ({editingMember.email})</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">身分類型</p>
                <Select value={editIdentity} onValueChange={v => setEditIdentity(v as IdentityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ibrain">知識達學員</SelectItem>
                    <SelectItem value="gaodian">高點學員</SelectItem>
                    <SelectItem value="book_buyer">購書者</SelectItem>
                    <SelectItem value="trial">試玩訪客</SelectItem>
                    <SelectItem value="unset">未設定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  {editIdentity === 'ibrain' ? '帳號（身分證號）' :
                   editIdentity === 'gaodian' ? '帳號（Email）' :
                   editIdentity === 'book_buyer' ? '購書憑證編號' : '帳號'}
                </p>
                <Input
                  value={editAccount}
                  onChange={e => setEditAccount(e.target.value)}
                  placeholder="選填"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>取消</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
