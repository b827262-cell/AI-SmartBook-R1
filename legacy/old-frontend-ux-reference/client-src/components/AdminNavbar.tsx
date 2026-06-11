/**
 * 管理後台左側欄組件
 * 支援完全收合/展開功能，以及拖曳手動排序
 * 排序結果存入 localStorage
 */

import { Button } from "@/components/ui/button";
import {
  Home, BookOpen, MessageSquare, BarChart3, Image, Download,
  GraduationCap, FileEdit, Library, FileQuestion, FileText,
  Coins, Users, Database, TrendingUp, Settings, ClipboardCheck,
  PenSquare, UserCheck, AlertTriangle, BookMarked, ToggleLeft,
  KeyRound, Globe, Headphones, Menu, X, GripVertical, Video, CalendarDays, Layers, Ticket,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STORAGE_KEY = "admin_sidebar_order";
const SIDEBAR_OPEN_KEY = "admin_sidebar_open";
const HIDDEN_NAV_PATHS = new Set([
  "/admin/questions",
  "/admin/knowledge-base",
  "/admin/learning-resources",
  "/admin/lecture-materials",
  "/admin/essay-management",
  "/admin/token-stats",
  "/admin/web-search-stats",
  "/graduate-exam",
  "/admin/smart-book-unit-qa",
  "/admin/suggestion-questions",
]);

const ALL_NAV_ITEMS = [
  { path: "/admin", label: "管理員後台", icon: Home, permission: "view_dashboard" },
  { path: "/admin/categories", label: "類科管理", icon: null, permission: "manage_categories" },
  { path: "/admin/questions", label: "問題管理", icon: BookOpen, permission: "view_student_questions" },
  { path: "/admin/exam-questions", label: "考題管理", icon: BookOpen, permission: "view_exam_questions" },
  { path: "/admin/knowledge-base", label: "知識庫管理", icon: BookOpen, permission: "view_knowledge_base" },
  { path: "/admin/learning-resources", label: "學習資源管理", icon: Library, permission: "view_dashboard" },
  { path: "/admin/learning-materials", label: "智能解題管理", icon: FileText, permission: "view_dashboard" },
  { path: "/admin/lecture-materials", label: "講義知識庫管理", icon: BookMarked, permission: "view_dashboard" },
  { path: "/admin/teachers", label: "老師管理", icon: UserCheck, permission: "view_dashboard" },
  { path: "/material-conversation-management", label: "教材對話管理", icon: MessageSquare, permission: "view_dashboard" },
  { path: "/admin/auditory-hall", label: "試聽館管理", icon: Headphones, permission: "view_dashboard" },
  { path: "/admin/ai-question-bank", label: "智能題庫管理", icon: BookOpen, permission: "view_dashboard" },
  { path: "/admin/smart-books", label: "智能書本管理", icon: BookOpen, permission: "view_dashboard" },
  { path: "/admin/smart-book-quiz-stats", label: "智能書本學習紀錄", icon: BarChart3, permission: "view_dashboard" },
  { path: "/admin/video-course", label: "智能函授管理", icon: Video, permission: "view_dashboard" },
  { path: "/admin/smart-book-verifications", label: "學生驗證記錄", icon: ClipboardCheck, permission: "view_dashboard" },
  { path: "/admin/watermark-settings", label: "PDF浮水印管理", icon: Layers, permission: "view_dashboard" },
  { path: "/admin/voucher-records", label: "購書憑證記錄", icon: Ticket, permission: "view_dashboard" },
  { path: "/admin/conversation-logs", label: "對話完整記錄", icon: MessageSquare, permission: "view_dashboard" },
  { path: "/admin/banned-users", label: "封鎖名單", icon: AlertTriangle, permission: "view_dashboard" },
  { path: "/admin/practice-exams", label: "考卷管理", icon: FileQuestion, permission: "view_dashboard" },
  { path: "/admin/feedback", label: "意見回饋", icon: MessageSquare, permission: "view_dashboard" },
  { path: "/admin/announcements", label: "公告管理", icon: null, permission: "manage_announcements" },
  { path: "/admin/calendar", label: "考情管理", icon: CalendarDays, permission: "manage_announcements" },
  { path: "/admin/banners", label: "Banner管理", icon: Image, permission: "manage_banners" },
  { path: "/admin/credits", label: "點數管理", icon: Coins, permission: "view_dashboard" },
  { path: "/admin/credit-rules", label: "扣點規則設定", icon: Settings, permission: "view_dashboard" },
  { path: "/admin/users", label: "用戶管理", icon: Users, permission: "view_dashboard" },
  { path: "/admin/member-identity", label: "會員身分管理", icon: UserCheck, permission: "view_dashboard" },
  { path: "/admin/credits-stats", label: "點數統計", icon: BarChart3, permission: "view_dashboard" },
  { path: "/admin/qa-cache", label: "問答快取管理", icon: Database, permission: "view_dashboard" },
  { path: "/admin/essay-management", label: "申論題管理", icon: PenSquare, permission: "view_dashboard" },
  { path: "/admin/token-stats", label: "Token 統計", icon: TrendingUp, permission: "view_dashboard" },
  { path: "/admin/qa-cache-settings", label: "快取設定", icon: Settings, permission: "view_dashboard" },
  { path: "/admin/qa-records", label: "問答記錄管理", icon: ClipboardCheck, permission: "view_dashboard" },
  { path: "/admin/student-records", label: "學員學習記錄", icon: UserCheck, permission: "view_dashboard" },
  { path: "/admin/student-learning-history", label: "智能課堂學習歷程", icon: BookOpen, permission: "view_dashboard" },
  { path: "/admin/behavior-alerts", label: "異常警告", icon: AlertTriangle, permission: "view_dashboard" },
  { path: "/admin/feature-toggles", label: "功能開關設定", icon: ToggleLeft, permission: "view_dashboard" },
  { path: "/admin/ai-settings", label: "AI 模型設定", icon: Settings, permission: "view_dashboard" },
  { path: "/admin/api-keys", label: "API Key 管理", icon: KeyRound, permission: "view_dashboard" },
  { path: "/admin/web-search-stats", label: "搜尋用量統計", icon: Globe, permission: "view_dashboard" },
  { path: "/graduate-exam", label: "研究所考古題", icon: GraduationCap, permission: "view_exam_questions" },
  { path: "/gaodian-public", label: "高點公職", icon: FileEdit, permission: "view_exam_questions" },
  { path: "/gaodian-graduate", label: "高點研究所", icon: GraduationCap, permission: "view_exam_questions" },
  { path: "/admin/exam-downloader", label: "考古題下載", icon: Download, permission: "manage_exam_questions" },
  { path: "/admin/checklist-reports", label: "測試回饋記錄", icon: ClipboardCheck, permission: "view_dashboard" },
  // ==================== AI 助教系統 ====================
  { path: "/admin/tutor-subjects", label: "AI助教類科管理", icon: GraduationCap, permission: "view_dashboard" },
  { path: "/admin/tutor-chat-records", label: "AI助教問答記錄", icon: MessageSquare, permission: "view_dashboard" },
  { path: "/admin/smart-book-unit-qa", label: "AI課堂知識點管理", icon: GraduationCap, permission: "view_dashboard" },
  { path: "/admin/suggestion-questions", label: "建議問題快取管理", icon: Database, permission: "view_dashboard" },
];

// 單一可排序的側欄項目
function SortableNavItem({
  item,
  isActive,
  onNavigate,
  isDragMode,
}: {
  item: (typeof ALL_NAV_ITEMS)[0];
  isActive: boolean;
  onNavigate: (path: string) => void;
  isDragMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.path,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer select-none mb-0.5
        ${isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }
        ${isDragging ? "z-50 shadow-lg bg-card" : ""}
      `}
      onClick={() => !isDragMode && onNavigate(item.path)}
    >
      {isDragMode && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </span>
      )}
      {Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <span className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="truncate text-xs">{item.label}</span>
    </div>
  );
}

export function AdminNavbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_OPEN_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isDragMode, setIsDragMode] = useState(false);
  const [itemOrder, setItemOrder] = useState<string[]>([]);

  const { data: permissionsData } = trpc.auth.getPermissions.useQuery();
  const permissions = permissionsData?.permissions || {};

  // 從資料庫讀取側欄排序
  const { data: sidebarOrderData } = trpc.auth.getSidebarOrder.useQuery();
  const saveSidebarOrderMutation = trpc.auth.saveSidebarOrder.useMutation();

  // 資料庫排序載入後同步到 state
  useEffect(() => {
    if (sidebarOrderData?.order && sidebarOrderData.order.length > 0) {
      setItemOrder(sidebarOrderData.order);
    }
  }, [sidebarOrderData]);

  // 篩選有權限的項目
  const filteredItems = ALL_NAV_ITEMS.filter((item) => {
    if (HIDDEN_NAV_PATHS.has(item.path)) return false;
    if (!item.permission) return true;
    return permissions[item.permission] === true;
  });

  // 依照儲存的排序重新排列
  const sortedItems = (() => {
    if (itemOrder.length === 0) return filteredItems;
    const orderMap = new Map(itemOrder.map((path, i) => [path, i]));
    return [...filteredItems].sort((a, b) => {
      const ai = orderMap.has(a.path) ? orderMap.get(a.path)! : 9999;
      const bi = orderMap.has(b.path) ? orderMap.get(b.path)! : 9999;
      return ai - bi;
    });
  })();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((i) => i.path === active.id);
      const newIndex = sortedItems.findIndex((i) => i.path === over.id);
      const newOrder = arrayMove(sortedItems, oldIndex, newIndex).map((i) => i.path);
      setItemOrder(newOrder);
      // 儲存到資料庫
      saveSidebarOrderMutation.mutate({ order: newOrder });
    }
  };

  const openSidebar = () => {
    setIsOpen(true);
    try { localStorage.setItem(SIDEBAR_OPEN_KEY, "true"); } catch {}
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setIsDragMode(false);
    try { localStorage.setItem(SIDEBAR_OPEN_KEY, "false"); } catch {}
  };

  // 監聽來自 Navbar 的展開事件
  useEffect(() => {
    const handler = () => openSidebar();
    window.addEventListener('open-admin-sidebar', handler);
    return () => window.removeEventListener('open-admin-sidebar', handler);
  }, []);

  // 點擊側欄外部時收合
  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        closeSidebar();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <>
      {/* 遮罩層 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={closeSidebar}
        />
      )}

      {/* 左側欄 */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-50 h-screen w-56 bg-card border-r border-border shadow-xl flex flex-col transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* 側欄標題 */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground">管理後台</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDragMode((v) => !v)}
              className={`text-xs px-2 py-1 rounded-md transition-colors border ${
                isDragMode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-border"
              }`}
              title={isDragMode ? "完成排序" : "拖曳排序"}
            >
              {isDragMode ? "完成" : "排序"}
            </button>
            <button
              onClick={closeSidebar}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
              aria-label="收合選單"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 選單項目列表 */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedItems.map((i) => i.path)}
              strategy={verticalListSortingStrategy}
            >
              {sortedItems.map((item) => {
                const isActive =
                  location === item.path ||
                  (item.path !== "/admin" && location.startsWith(item.path));
                return (
                  <SortableNavItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    onNavigate={(path) => {
                      setLocation(path);
                      closeSidebar();
                    }}
                    isDragMode={isDragMode}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* 底部提示（排序模式時顯示） */}
        {isDragMode && (
          <div className="px-3 py-2 border-t border-border shrink-0 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {saveSidebarOrderMutation.isPending ? '儲存中...' : '拖曳左側圖示調整順序，已自動儲存到雲端'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
