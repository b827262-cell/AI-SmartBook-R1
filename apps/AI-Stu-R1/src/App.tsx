import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppearanceProvider } from "./appearance";
import { BooksPage } from "./pages/BooksPage";
import { BookReaderPage } from "./pages/BookReaderPage";
import { StudentHeader } from "./components/StudentHeader";

/** Legacy /read and /chat routes now resolve to the unified reader. */
function RedirectToReader() {
  const { bookId = "" } = useParams();
  return <Navigate to={`/books/${bookId}`} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AppearanceProvider>
        <StudentHeader />
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
      </AppearanceProvider>
    </BrowserRouter>
  );
}
