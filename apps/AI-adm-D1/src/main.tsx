import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AiSettingsPage } from "./pages/AiSettingsPage.js";
import { FilesPage } from "./pages/FilesPage.js";

const navItems = [
  { to: "/admin/files", label: "檔案 / PDF" },
  { to: "/admin/settings/ai", label: "AI 模型設定" },
];

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          gap: 32,
          height: 56,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16 }}>AI-adm-D1 後台</span>
        <nav style={{ display: "flex", gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: "6px 14px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                background: isActive ? "#f1f5f9" : "transparent",
                color: isActive ? "#111827" : "#6b7280",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/files" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/files" replace />} />
          <Route path="/admin/files" element={<FilesPage />} />
          <Route path="/admin/settings/ai" element={<AiSettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
