import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarDays, Plus, Trash2, Edit, X, Pin, AlertCircle,
  Megaphone, Bell, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";

const EVENT_TYPE_OPTIONS = [
  { value: "exam", label: "考試", color: "text-red-600 bg-red-50 border-red-200" },
  { value: "class", label: "班級公告", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "reminder", label: "提醒", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "edm", label: "廣告連結", color: "text-purple-600 bg-purple-50 border-purple-200" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  eventType: "exam" as "exam" | "class" | "reminder" | "edm",
  visibility: "all" as "all" | "personal",
  externalUrl: "",
  color: "red",
  isPinned: false,
  subjectId: undefined as number | undefined,
  bookId: undefined as number | undefined,
};

/**
 * 後台考情管理頁面
 * 管理員可新增/編輯/刪除考試日期、班級公告、EDM 廣告連結
 */
export function AdminCalendarManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterType, setFilterType] = useState<string>("all");

  // 取得所有事件
  const { data: events = [], refetch } = trpc.calendar.getAllEventsAdmin.useQuery({ limit: 200, offset: 0 });

  // 取得書本列表（用於目標書本選擇）
  const { data: booksData } = trpc.tutorPublic.getAllPublicBooks.useQuery();
  const books = Array.isArray(booksData) ? booksData : [];

  // 新增事件
  const createEvent = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      toast.success("已新增事件");
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // 更新事件
  const updateEvent = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      toast.success("已更新事件");
      setEditingId(null);
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // 刪除事件
  const deleteEvent = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success("已刪除事件");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("請輸入標題"); return; }
    if (!form.eventDate) { toast.error("請選擇日期"); return; }

    if (editingId !== null) {
      updateEvent.mutate({
        id: editingId,
        title: form.title.trim(),
        description: form.description || undefined,
        eventDate: form.eventDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        externalUrl: form.externalUrl || undefined,
        color: form.color,
        isPinned: form.isPinned,
      });
    } else {
      createEvent.mutate({
        title: form.title.trim(),
        description: form.description || undefined,
        eventDate: form.eventDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        eventType: form.eventType,
        visibility: "all",
        externalUrl: form.externalUrl || undefined,
        color: form.color,
        isPinned: form.isPinned,
        subjectId: form.subjectId,
        bookId: form.bookId,
      });
    }
  }

  function startEdit(ev: typeof events[0]) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || "",
      eventDate: ev.eventDate,
      startTime: ev.startTime || "",
      endTime: ev.endTime || "",
      eventType: ev.eventType as any,
      visibility: ev.visibility as any,
      externalUrl: ev.externalUrl || "",
      color: ev.color || "red",
      isPinned: !!ev.isPinned,
      subjectId: ev.subjectId || undefined,
      bookId: ev.bookId || undefined,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  const filteredEvents = filterType === "all"
    ? events
    : events.filter((e) => e.eventType === filterType);

  const typeInfo = (type: string) => EVENT_TYPE_OPTIONS.find((t) => t.value === type) || EVENT_TYPE_OPTIONS[0];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            考情管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理考試日期、班級公告、廣告連結，學員在「智能考情」Tab 可見</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); }}>
          <Plus className="w-4 h-4 mr-2" />
          新增事件
        </Button>
      </div>

      {/* 新增/編輯表單 */}
      {showForm && (
        <div className="bg-card border rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{editingId !== null ? "編輯事件" : "新增事件"}</h2>
            <button onClick={cancelForm} className="p-1 rounded-lg hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 標題 */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">標題 *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例：資通安全管理 第一次考試"
              />
            </div>

            {/* 類型 */}
            {editingId === null && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">類型</label>
                <Select value={form.eventType} onValueChange={(v) => setForm((f) => ({ ...f, eventType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 目標書本 */}
            {editingId === null && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">目標書本（不選 = 全部書本可見）</label>
                <Select
                  value={form.bookId ? String(form.bookId) : "all"}
                  onValueChange={(v) => setForm((f) => ({ ...f, bookId: v === "all" ? undefined : Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部書本" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部書本（所有學員可見）</SelectItem>
                    {books.map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 日期 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">日期 *</label>
              <Input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              />
            </div>

            {/* 開始時間 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">開始時間</label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>

            {/* 結束時間 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">結束時間</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>

            {/* 外部連結（EDM 用） */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">外部連結（選填，廣告/報名連結）</label>
              <Input
                value={form.externalUrl}
                onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* 備註 */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">備註說明</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="選填"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* 置頂 */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  className="rounded"
                />
                置頂顯示（顯示在公告牆最上方）
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleSubmit}
              disabled={createEvent.isPending || updateEvent.isPending}
              className="flex-1"
            >
              {(createEvent.isPending || updateEvent.isPending) ? "儲存中..." : (editingId !== null ? "更新事件" : "確認新增")}
            </Button>
            <Button variant="outline" onClick={cancelForm}>取消</Button>
          </div>
        </div>
      )}

      {/* 篩選列 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ value: "all", label: "全部" }, ...EVENT_TYPE_OPTIONS].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filterType === t.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">共 {filteredEvents.length} 筆</span>
      </div>

      {/* 事件列表 */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">尚無事件，點擊「新增事件」開始建立</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((ev) => {
            const ti = typeInfo(ev.eventType);
            return (
              <div key={ev.id} className={`rounded-xl border p-4 ${ti.color}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ev.isPinned ? <Pin className="w-3.5 h-3.5 text-primary" /> : null}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ti.color}`}>{ti.label}</span>
                      {ev.bookId && (
                        <span className="text-xs text-muted-foreground">
                          📖 {books.find((b: any) => b.id === ev.bookId)?.title || `書本 #${ev.bookId}`}
                        </span>
                      )}
                      {ev.subjectId && !ev.bookId && (
                        <span className="text-xs text-muted-foreground">科目 #{ev.subjectId}</span>
                      )}
                      {!ev.subjectId && !ev.bookId && (
                        <span className="text-xs text-muted-foreground">全部書本</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ev.eventDate}
                      {ev.startTime ? ` ${ev.startTime}` : ""}
                      {ev.endTime ? ` ~ ${ev.endTime}` : ""}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                    )}
                    {ev.externalUrl && (
                      <a
                        href={ev.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs mt-1 underline text-primary"
                      >
                        <ExternalLink className="w-3 h-3" /> {ev.externalUrl}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(ev)}
                      className="p-1.5 rounded-lg hover:bg-white/60 transition-colors"
                      title="編輯"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`確定要刪除「${ev.title}」？`)) {
                          deleteEvent.mutate({ id: ev.id });
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
