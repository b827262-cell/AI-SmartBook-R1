import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { BooksPage } from "./pages/BooksPage";
import { ReadPage } from "./pages/ReadPage";
import { ChatPage } from "./pages/ChatPage";
import { NotesDirectoryPage } from "./pages/NotesDirectoryPage";

function Header() {
  return (
    <header className="stu-header">
      <div className="inner">
        <h1>📖 AI SmartBook</h1>
        <div className="header-links">
          <Link to="/books">書庫</Link>
          <Link to="/notes">智能筆記</Link>
        </div>
      </div>
    </header>
  );
}

function NotesPage() {
  return (
    <NotesDirectoryPage
      mode="notes"
      title="智能筆記"
      intro="在此可檢視與管理你在閱讀器中建立的 AI 筆記。"
    />
  );
}

function MyNotesPage() {
  return (
    <NotesDirectoryPage
      mode="my-notes"
      title="題庫與收藏"
      intro="目前將提供已儲存題目與錯題的整合檢視（預設先以智能筆記呈現）。"
    />
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
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/my-notes" element={<MyNotesPage />} />
          <Route path="*" element={<Navigate to="/books" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
