import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Minus, Shield, User, Trash2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [creditsAmount, setCreditsAmount] = useState("");
  const [creditsDescription, setCreditsDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 獲取所有用戶列表
  const { data: usersData, isLoading, refetch } = trpc.credits.getAllUsers.useQuery();
  const users = usersData?.users || [];

  // 管理者手動加點 mutation
  const addCreditsMutation = trpc.credits.adminAddCredits.useMutation({
    onSuccess: () => {
      toast.success("點數增加成功！");
      setShowAddCreditsDialog(false);
      setSelectedUser(null);
      setCreditsAmount("");
      setCreditsDescription("");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失敗：${error.message}`);
    },
  });

  // 更新角色 mutation
  const updateRoleMutation = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success("角色更新成功！");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: '管理員', color: 'text-orange-500' },
    user: { label: '一般學員', color: 'text-muted-foreground' },
    teacher: { label: '老師', color: 'text-blue-500' },
    assistant: { label: '助教', color: 'text-purple-500' },
    academic_affairs: { label: '教務', color: 'text-green-600' },
    editor: { label: '編輯', color: 'text-cyan-600' },
  };

  // 批次刪除用戶 mutation
  const deleteUsersMutation = trpc.user.batchDeleteUsers.useMutation({
    onSuccess: () => {
      toast.success(`成功刪除 ${selectedUserIds.length} 個用戶！`);
      setShowDeleteDialog(false);
      setSelectedUserIds([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 篩選用戶
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.nickname?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.openId?.toLowerCase().includes(query) ||
      user.id.toString().includes(query)
    );
  });

  // 處理加點
  const handleAddCredits = () => {
    if (!selectedUser) return;
    
    const amount = parseInt(creditsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("請輸入有效的點數數量（正整數）");
      return;
    }

    addCreditsMutation.mutate({
      userId: selectedUser.id,
      amount,
      description: creditsDescription || undefined,
    });
  };

  // 打開加點對話框
  const openAddCreditsDialog = (user: any) => {
    setSelectedUser(user);
    setShowAddCreditsDialog(true);
  };

  // 處理全選/取消全選
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  // 處理單個用戶選擇
  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUserIds([...selectedUserIds, userId]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    }
  };

  // 處理批次刪除
  const handleBatchDelete = () => {
    if (selectedUserIds.length === 0) {
      toast.error("請先選擇要刪除的用戶");
      return;
    }
    setShowDeleteDialog(true);
  };

  // 確認批次刪除
  const confirmBatchDelete = () => {
    deleteUsersMutation.mutate({ userIds: selectedUserIds });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">載入中...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">用戶管理</CardTitle>
          <p className="text-sm text-muted-foreground">
            管理所有用戶的基本資訊和點數
          </p>
        </CardHeader>
        <CardContent>
          {/* 搜尋欄和批次操作 */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="搜尋用戶（ID、名稱、Email、OpenID）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedUserIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                刪除選中的用戶 ({selectedUserIds.length})
              </Button>
            )}
          </div>

          {/* 用戶列表 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>名稱</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="text-right">總點數</TableHead>
                  <TableHead className="text-right">永久點數</TableHead>
                  <TableHead className="text-right">每日點數</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {searchQuery ? "找不到符合條件的用戶" : "目前沒有用戶"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name || user.nickname || "未設定"}</span>
                          {user.nickname && user.name && (
                            <span className="text-xs text-muted-foreground">{user.nickname}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.email || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={`gap-1 h-7 px-2 ${roleLabels[user.role]?.color || 'text-muted-foreground'}`}>
                              {user.role === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                              <span className="text-xs font-medium">{roleLabels[user.role]?.label || user.role}</span>
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {Object.entries(roleLabels).map(([roleKey, { label }]) => (
                              <DropdownMenuItem
                                key={roleKey}
                                className={user.role === roleKey ? 'font-semibold bg-muted' : ''}
                                onClick={() => {
                                  if (user.role !== roleKey) {
                                    updateRoleMutation.mutate({ userId: user.id, role: roleKey as any });
                                  }
                                }}
                              >
                                {label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{user.totalCredits}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{user.permanentCredits}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{user.dailyCredits}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddCreditsDialog(user)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          加點
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 統計資訊 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{users.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">總用戶數</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">
                    {users.filter((u) => u.role === "admin").length}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">管理員</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {users.reduce((sum, u) => sum + u.totalCredits, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">總點數</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 加點對話框 */}
      <Dialog open={showAddCreditsDialog} onOpenChange={setShowAddCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>增加點數</DialogTitle>
            <DialogDescription>
              為用戶 <span className="font-semibold">{selectedUser?.name || selectedUser?.nickname}</span> (ID: {selectedUser?.id}) 增加點數
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">點數數量 *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                placeholder="請輸入要增加的點數"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">說明（選填）</Label>
              <Input
                id="description"
                type="text"
                placeholder="例如：活動贈送、補償點數"
                value={creditsDescription}
                onChange={(e) => setCreditsDescription(e.target.value)}
              />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">當前總點數：</span>
                  <span className="font-semibold">{selectedUser?.totalCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">增加後：</span>
                  <span className="font-semibold text-green-600">
                    {selectedUser?.totalCredits + (parseInt(creditsAmount) || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCreditsDialog(false);
                setSelectedUser(null);
                setCreditsAmount("");
                setCreditsDescription("");
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddCredits}
              disabled={addCreditsMutation.isPending || !creditsAmount}
            >
              {addCreditsMutation.isPending ? "處理中..." : "確認增加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次刪除確認對話框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除用戶</DialogTitle>
            <DialogDescription>
              您即將刪除 <span className="font-semibold text-destructive">{selectedUserIds.length}</span> 個用戶，此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ 警告：刪除用戶將會同時刪除該用戶的所有相關數據，包括：
              </p>
              <ul className="mt-2 text-sm text-destructive space-y-1 list-disc list-inside">
                <li>點數記錄</li>
                <li>學習進度</li>
                <li>對話記錄</li>
                <li>錯題記錄</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBatchDelete}
              disabled={deleteUsersMutation.isPending}
            >
              {deleteUsersMutation.isPending ? "刪除中..." : `確認刪除 ${selectedUserIds.length} 個用戶`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
