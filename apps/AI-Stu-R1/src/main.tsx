import React from "react";
import { createRoot } from "react-dom/client";
import { Link, BrowserRouter, Route, Routes } from "react-router-dom";

function BooksPage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#f8fafc)", padding: 32 }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 40, marginBottom: 8 }}>智能書本</h1>
        <p style={{ color: "#475569" }}>AI-Stu-R1 student frontend. 舊版 SmartBook Lite 前台 UX 將選擇性移植到這裡。</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginTop: 28 }}>
          <article style={{ background: "white", borderRadius: 24, padding: 24, boxShadow: "0 20px 50px rgba(15,23,42,.12)" }}>
            <div style={{ height: 130, borderRadius: 18, background: "linear-gradient(135deg,#2563eb,#7c3aed)", marginBottom: 18 }} />
            <h2>Demo SmartBook</h2>
            <p style={{ color: "#64748b" }}>SQLite seed 後會顯示正式書本資料。</p>
            <Link to="/books/demo/read">開始閱讀</Link>
            <span> ｜ </span>
            <Link to="/books/demo/chat">問書本</Link>
          </article>
        </div>
      </section>
    </main>
  );
}

function ReadPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: 32 }}>
      <section style={{ maxWidth: 900, margin: "0 auto", background: "white", borderRadius: 24, padding: 32 }}>
        <Link to="/books">← 返回書本</Link>
        <h1>閱讀頁</h1>
        <p>這裡會接 /api/student/books/:bookId/contents，並套用舊版閱讀 UX。</p>
      </section>
    </main>
  );
}

function ChatPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "white", padding: 32 }}>
      <section style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link to="/books" style={{ color: "#bfdbfe" }}>← 返回書本</Link>
        <h1>書本對話機器人</h1>
        <div style={{ background: "white", color: "#0f172a", borderRadius: 24, padding: 24 }}>
          <p>ChatPanel placeholder。1GB sqlite-api mode 使用 keyword chat。</p>
          <input placeholder="請輸入問題..." style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #cbd5e1" }} />
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BooksPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:bookId/read" element={<ReadPage />} />
        <Route path="/books/:bookId/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
