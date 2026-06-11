import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: 32 }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1>AI-adm-D1 簡易智能書本後台</h1>
        <p>後台將實作：書本 CRUD、PDF 解析、AI 拆書、章節、知識問答。</p>
        <div style={{ background: "white", padding: 24, borderRadius: 20 }}>
          <h2>Phase 0.5 Admin Shell</h2>
          <ul>
            <li>/admin/books</li>
            <li>/admin/books/:bookId/files</li>
            <li>/admin/books/:bookId/chapters</li>
            <li>/admin/books/:bookId/qa</li>
            <li>/admin/books/:bookId/ai-jobs</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
