import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { BooksPage } from "./pages/BooksPage";
import { BookReaderPage } from "./pages/BookReaderPage";

/** Legacy /read and /chat routes now resolve to the unified reader. */
function RedirectToReader() {
  const { bookId = "" } = useParams();
  return <Navigate to={`/books/${bookId}`} replace />;
}

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
          <Route path="/books/:bookId" element={<BookReaderPage />} />
          <Route path="/books/:bookId/read" element={<RedirectToReader />} />
          <Route path="/books/:bookId/chat" element={<RedirectToReader />} />
          <Route path="*" element={<Navigate to="/books" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
