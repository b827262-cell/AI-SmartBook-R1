export type AdminNavItem = {
  label: string;
  to: string;
  end?: boolean;
  enabled?: boolean;
  description?: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "管理後台",
    items: [
      { label: "首頁", to: "/admin", end: true, enabled: true },
      { label: "帳戶管理", to: "/admin/accounts", end: true, enabled: true },
      { label: "介面設定", to: "/admin/appearance", end: true, enabled: true }
    ]
  },
  {
    label: "智能書本管理",
    items: [
      { label: "書本列表", to: "/admin/books", end: true, enabled: true },
      { label: "新增書本", to: "/admin/books/new", end: true, enabled: true },
      {
        label: "AI 筆記管理",
        to: "/admin/notes",
        end: true,
        enabled: true,
        description: "查看與管理學生筆記"
      },
      {
        label: "AI 筆記導覽說明",
        to: "/admin/notes-help",
        end: true,
        enabled: true,
        description: "學生端筆記定位功能使用說明"
      }
    ]
  },
  {
    label: "題庫與題解",
    items: [
      {
        label: "題庫 JSON 匯入",
        to: "/admin/import/question-bank",
        end: true,
        enabled: true,
        description: "上傳題庫 JSON，建立匯入 staging 記錄"
      },
      {
        label: "智慧題解 JSON 匯入",
        to: "/admin/import/smart-solve",
        end: true,
        enabled: true,
        description: "選擇書本後上傳 Smart Solve JSON"
      },
      {
        label: "題庫中心（PDF辨識）",
        to: "/admin/question-bank-center",
        end: true,
        enabled: false,
        description: "尚未實作"
      }
    ]
  },
  {
    label: "AI 助教管理",
    items: [
      {
        label: "AI助教科管理",
        to: "/admin/ai-subject",
        end: true,
        enabled: false,
        description: "尚未實作"
      },
      {
        label: "AI助教答記錄",
        to: "/admin/ai-qa-logs",
        end: true,
        enabled: false,
        description: "尚未實作"
      },
      {
        label: "AI助教本綁定",
        to: "/admin/ai-book-binding",
        end: true,
        enabled: false,
        description: "尚未實作"
      },
      {
        label: "學生內容總覽",
        to: "/admin/student-overview",
        end: true,
        enabled: false,
        description: "尚未實作"
      }
    ]
  }
];
