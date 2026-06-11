import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2,
  CalendarDays, Clock, MapPin, Flag, ExternalLink, Pin,
  BookOpen, AlertCircle, Bell, Megaphone,
} from "lucide-react";

// ── 顏色設定 ──────────────────────────────────────────────
const COLOR_OPTIONS = [
  { value: "blue", label: "藍色", bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50 border-blue-200" },
  { value: "red", label: "紅色", bg: "bg-red-500", text: "text-red-600", light: "bg-red-50 border-red-200" },
  { value: "green", label: "綠色", bg: "bg-green-500", text: "text-green-600", light: "bg-green-50 border-green-200" },
  { value: "orange", label: "橘色", bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50 border-orange-200" },
  { value: "purple", label: "紫色", bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50 border-purple-200" },
  { value: "gray", label: "灰色", bg: "bg-gray-500", text: "text-gray-600", light: "bg-gray-50 border-gray-200" },
];

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  exam: { label: "考試", icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-600 bg-red-50 border-red-200" },
  class: { label: "班級公告", icon: <Megaphone className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  personal: { label: "個人", icon: <CalendarDays className="w-3.5 h-3.5" />, color: "text-green-600 bg-green-50 border-green-200" },
  reminder: { label: "提醒", icon: <Bell className="w-3.5 h-3.5" />, color: "text-orange-600 bg-orange-50 border-orange-200" },
  edm: { label: "廣告連結", icon: <ExternalLink className="w-3.5 h-3.5" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
};

// ── 工具函式 ──────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}
function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

// ── 主元件 ────────────────────────────────────────────────
interface CalendarTabProps {
  bookId?: number;
  subjectId?: number;
  subjectName?: string;
}

export function CalendarTab({ bookId, subjectId, subjectName }: CalendarTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDayEvents, setShowDayEvents] = useState<{ dateStr: string; events: any[] } | null>(null);

  // 新增/編輯事件表單
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    eventType: "personal" as "exam" | "class" | "personal" | "reminder" | "edm",
    visibility: "personal" as "all" | "personal",
    externalUrl: "",
    color: "blue",
    isPinned: false,
  });

  const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  // 取得事件
  const { data: events = [], refetch: refetchEvents } = trpc.calendar.getEvents.useQuery({
    yearMonth,
    subjectId,
    bookId,
  });

  // 取得近期重要事件（倒數計時）
  const { data: upcomingEvents = [] } = trpc.calendar.getUpcomingEvents.useQuery({
    subjectId,
    bookId,
    limit: 5,
  });

  // Mutations
  const createEvent = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      toast.success("事件已新增");
      refetchEvents();
      setShowAddDialog(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateEvent = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      toast.success("事件已更新");
      refetchEvents();
      setShowAddDialog(false);
      setEditingId(null);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEvent = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success("事件已刪除");
      refetchEvents();
      setShowEventDetail(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // 月曆計算
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  // 事件依日期分組
  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    events.forEach((ev) => {
      if (!map[ev.eventDate]) map[ev.eventDate] = [];
      map[ev.eventDate].push(ev);
    });
    return map;
  }, [events]);

  function resetForm() {
    setForm({
      title: "", description: "", eventDate: selectedDate || todayStr,
      startTime: "", endTime: "", eventType: "personal", visibility: "personal",
      externalUrl: "", color: "blue", isPinned: false,
    });
  }

  function openAddDialog(dateStr?: string) {
    setEditingId(null);
    resetForm();
    setForm((f) => ({ ...f, eventDate: dateStr || todayStr }));
    setShowAddDialog(true);
  }

  function openEditDialog(ev: any) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || "",
      eventDate: ev.eventDate,
      startTime: ev.startTime || "",
      endTime: ev.endTime || "",
      eventType: ev.eventType,
      visibility: ev.visibility,
      externalUrl: ev.externalUrl || "",
      color: ev.color || "blue",
      isPinned: !!ev.isPinned,
    });
    setShowEventDetail(null);
    setShowAddDialog(true);
  }

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
        color: form.color,
        isPinned: form.isPinned,
        externalUrl: form.externalUrl || undefined,
      });
      return;
    }
    createEvent.mutate({
      title: form.title.trim(),
      description: form.description || undefined,
      eventDate: form.eventDate,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      eventType: form.eventType,
      visibility: form.visibility,
      externalUrl: form.externalUrl || undefined,
      color: form.color,
      isPinned: form.isPinned,
      subjectId,
      bookId,
    });
  }

  function openGoogleCalendar() {
    if (!showEventDetail) return;
    const ev = showEventDetail;
    // 組合 Google Calendar 跳轉 URL
    const dateStr = ev.eventDate.replace(/-/g, "");
    let dates = "";
    if (ev.startTime && ev.endTime) {
      const start = `${dateStr}T${ev.startTime.replace(":", "")}00`;
      const end = `${dateStr}T${ev.endTime.replace(":", "")}00`;
      dates = `${start}/${end}`;
    } else {
      // 全天事件
      dates = `${dateStr}/${dateStr}`;
    }
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title,
      dates,
      ...(ev.description ? { details: ev.description } : {}),
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11); }
    else setCurrentMonth((m) => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0); }
    else setCurrentMonth((m) => m + 1);
  }

  const colorConfig = (color: string) => COLOR_OPTIONS.find((c) => c.value === color) || COLOR_OPTIONS[0];

  const MONTH_NAMES = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  const DAY_NAMES = ["日","一","二","三","四","五","六"];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4">

        {/* 倒數計時區 */}
        {upcomingEvents.filter((e) => e.eventType === "exam").length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">考試倒數</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingEvents
                .filter((e) => e.eventType === "exam")
                .map((ev) => {
                  const days = daysUntil(ev.eventDate);
                  return (
                    <div key={ev.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-red-200 text-sm">
                      <span className="font-medium text-foreground truncate max-w-[120px]">{ev.title}</span>
                      <span className={`font-bold ${days <= 7 ? "text-red-600" : days <= 30 ? "text-orange-500" : "text-muted-foreground"}`}>
                        {days === 0 ? "今天！" : days < 0 ? "已過期" : `${days} 天`}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 月曆標題 */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold">
            {currentYear} 年 {MONTH_NAMES[currentMonth]}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 月曆格 */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* 星期標題 */}
          <div className="grid grid-cols-7 bg-muted/50">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* 日期格 */}
          <div className="grid grid-cols-7 bg-background">
            {/* 空格 */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 border-b border-r border-border/50" />
            ))}

            {/* 日期 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(currentYear, currentMonth, day);
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = (firstDay + i) % 7 === 0 || (firstDay + i) % 7 === 6;

              return (
                <div
                  key={day}
                  className={`h-16 border-b border-r border-border/50 p-1 cursor-pointer transition-colors hover:bg-muted/40 ${isSelected ? "bg-primary/5" : ""} ${isWeekend ? "bg-muted/20" : ""}`}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    openAddDialog(dateStr);
                  }}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-0.5 ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cc = colorConfig(ev.color || "blue");
                      return (
                        <div
                          key={ev.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate border ${cc.light} ${cc.text} leading-tight`}
                          onClick={(e) => { e.stopPropagation(); setShowEventDetail(ev); }}
                        >
                          {ev.isPinned ? "📌 " : ""}{ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div
                        className="text-[10px] text-primary font-medium px-1 cursor-pointer hover:underline"
                        onClick={(e) => { e.stopPropagation(); setShowDayEvents({ dateStr, events: dayEvents }); }}
                      >
                        +{dayEvents.length - 2} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 新增事件按鈕 */}
        <Button
          onClick={() => openAddDialog()}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增事件
        </Button>

        {/* 公告牆 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              本月公告
            </h3>
            {isAdmin && (
              <span className="text-xs text-muted-foreground">管理員可新增班級公告</span>
            )}
          </div>
          {events.filter((e) => e.visibility === "all").length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Megaphone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">本月尚無公告</p>
              {isAdmin ? (
                <p className="text-xs text-muted-foreground mt-1">點擊「新增事件」→ 選擇「班級公告」或「考試」即可發布</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">管理員發布的考試資訊和班級公告將顯示在這裡</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {events
                .filter((e) => e.visibility === "all")
                .sort((a, b) => (b.isPinned || 0) - (a.isPinned || 0))
                .map((ev) => {
                  const typeInfo = EVENT_TYPE_LABELS[ev.eventType] || EVENT_TYPE_LABELS.class;
                  return (
                    <div
                      key={ev.id}
                      className={`rounded-xl border p-3 cursor-pointer hover:shadow-sm transition-all ${typeInfo.color}`}
                      onClick={() => setShowEventDetail(ev)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {ev.isPinned ? <Pin className="w-3 h-3" /> : typeInfo.icon}
                            <span className="text-xs font-medium">{typeInfo.label}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{ev.eventDate}</span>
                          </div>
                          <p className="text-sm font-semibold truncate">{ev.title}</p>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>
                          )}
                          {ev.externalUrl && (
                            <a
                              href={ev.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs mt-1 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" /> 查看連結
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* 本月個人事件列表 */}
        {events.filter((e) => e.visibility === "personal").length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              我的事件
            </h3>
            {events
              .filter((e) => e.visibility === "personal")
              .map((ev) => {
                const cc = colorConfig(ev.color || "blue");
                return (
                  <div
                    key={ev.id}
                    className={`rounded-xl border p-3 cursor-pointer hover:shadow-sm transition-all ${cc.light}`}
                    onClick={() => setShowEventDetail(ev)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cc.bg} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${cc.text} truncate`}>{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ev.eventDate}{ev.startTime ? ` ${ev.startTime}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

      </div>

      {/* ── 當日事件清單 Dialog ── */}
      {showDayEvents && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDayEvents(null)}>
          <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">{showDayEvents.dateStr}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">共 {showDayEvents.events.length} 個事件</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowDayEvents(null); openAddDialog(showDayEvents.dateStr); }}
                  className="text-xs text-primary border border-primary/30 rounded-lg px-2.5 py-1 hover:bg-primary/5 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 新增
                </button>
                <button onClick={() => setShowDayEvents(null)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {showDayEvents.events.map((ev) => {
                const ti = EVENT_TYPE_LABELS[ev.eventType] || EVENT_TYPE_LABELS.personal;
                const cc = colorConfig(ev.color || "blue");
                return (
                  <div
                    key={ev.id}
                    className={`rounded-xl border p-3 cursor-pointer hover:opacity-80 transition-opacity ${cc.light}`}
                    onClick={() => { setShowDayEvents(null); setShowEventDetail(ev); }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {ev.isPinned && <Pin className="w-3 h-3 text-primary" />}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ti.color}`}>{ti.label}</span>
                      {ev.startTime && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{ev.startTime}{ev.endTime ? ` ~ ${ev.endTime}` : ""}</span>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${cc.text}`}>{ev.title}</p>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 新增事件 Dialog ── */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddDialog(false)}>
          <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{editingId !== null ? "編輯事件" : "新增事件"}</h3>
              <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">標題 *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="輸入事件標題"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">日期 *</label>
                <Input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">開始時間</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">結束時間</label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* 事件類型（管理員可選更多） */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">類型</label>
                <div className="flex flex-wrap gap-2">
                  {(isAdmin
                    ? ["personal", "reminder", "exam", "class", "edm"]
                    : ["personal", "reminder"]
                  ).map((type) => {
                    const info = EVENT_TYPE_LABELS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setForm((f) => ({
                          ...f,
                          eventType: type as any,
                          visibility: type === "personal" || type === "reminder" ? "personal" : "all",
                        }))}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${form.eventType === type ? info.color + " font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
                      >
                        {info.icon} {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EDM 外部連結 */}
              {form.eventType === "edm" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">外部連結</label>
                  <Input
                    value={form.externalUrl}
                    onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">備註說明</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="選填"
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* 顏色選擇 */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">顏色標記</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      className={`w-6 h-6 rounded-full ${c.bg} transition-all ${form.color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"}`}
                    />
                  ))}
                </div>
              </div>

              {/* 管理員置頂選項 */}
              {isAdmin && form.visibility === "all" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="rounded"
                  />
                  置頂顯示
                </label>
              )}

              <Button
                onClick={handleSubmit}
                disabled={createEvent.isPending || updateEvent.isPending}
                className="w-full"
              >
                {(createEvent.isPending || updateEvent.isPending) ? "儲存中..." : (editingId !== null ? "確認更新" : "確認新增")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 事件詳情 Dialog ── */}
      {showEventDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEventDetail(null)}>
          <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {showEventDetail.isPinned && <Pin className="w-4 h-4 text-primary" />}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${EVENT_TYPE_LABELS[showEventDetail.eventType]?.color || ""}`}>
                  {EVENT_TYPE_LABELS[showEventDetail.eventType]?.label || showEventDetail.eventType}
                </span>
              </div>
              <button onClick={() => setShowEventDetail(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-semibold mb-3">{showEventDetail.title}</h3>

            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>{showEventDetail.eventDate}</span>
                {(() => {
                  const d = daysUntil(showEventDetail.eventDate);
                  return d >= 0 ? (
                    <span className={`text-xs font-medium ml-auto ${d <= 7 ? "text-red-600" : d <= 30 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {d === 0 ? "今天" : `還有 ${d} 天`}
                    </span>
                  ) : null;
                })()}
              </div>
              {showEventDetail.startTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{showEventDetail.startTime}{showEventDetail.endTime ? ` ~ ${showEventDetail.endTime}` : ""}</span>
                </div>
              )}
              {showEventDetail.description && (
                <p className="text-foreground mt-2 whitespace-pre-wrap">{showEventDetail.description}</p>
              )}
              {showEventDetail.externalUrl && (
                <a
                  href={showEventDetail.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 查看連結
                </a>
              )}
            </div>

            <div className="flex gap-2">
              {/* Google Calendar 跳轉 */}
              <Button variant="outline" size="sm" onClick={openGoogleCalendar} className="flex-1">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                加入 Google 行事曆
              </Button>

              {/* 編輯（自己的個人事件或管理員） */}
              {(isAdmin || showEventDetail.createdBy === user?.id) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => openEditDialog(showEventDetail)}
                >
                  ✏️
                </Button>
              )}

              {/* 刪除（自己的或管理員） */}
              {(isAdmin || showEventDetail.createdBy === user?.id) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("確定要刪除此事件？")) {
                      deleteEvent.mutate({ id: showEventDetail.id });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
