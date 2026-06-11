import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { BooksPage } from "./pages/BooksPage";
import { ReadPage } from "./pages/ReadPage";
import { ChatPage } from "./pages/ChatPage";

function Header() {
  return (
    <header className="stu-header">
      <div className="inner">
        <h1>📖 AI SmartBook</h1>
        <Link to="/books">書庫</Link>
      </div>
    </header>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="stu-main">
        <Routes>
          <Route path="/" element={<Navigate to="/books" replace />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:bookId/read" element={<ReadPage />} />
          <Route path="/books/:bookId/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/books" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
