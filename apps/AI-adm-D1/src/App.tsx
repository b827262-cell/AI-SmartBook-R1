import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { BooksPage } from "./pages/BooksPage";
import { NewBookPage } from "./pages/NewBookPage";
import { BookDetail } from "./pages/BookDetail";

function Sidebar() {
  return (
    <aside className="adm-side">
      <h1>📚 AI-adm-D1</h1>
      <nav>
        <Link to="/admin/books">書本管理</Link>
        <Link to="/admin/books/new">新增書本</Link>
      </nav>
      <p className="muted" style={{ marginTop: 24, color: "#64748b" }}>
        Phase 0.5 智能書本後台
      </p>
    </aside>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="adm-shell">
        <Sidebar />
        <main className="adm-main">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/books" replace />} />
            <Route path="/admin/books" element={<BooksPage />} />
            <Route path="/admin/books/new" element={<NewBookPage />} />
            <Route path="/admin/books/:bookId/*" element={<BookDetail />} />
            <Route path="*" element={<Navigate to="/admin/books" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
