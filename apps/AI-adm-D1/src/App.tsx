import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/admin/AdminShell";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminAccountsPage } from "./pages/AdminAccountsPage";
import { BooksPage } from "./pages/BooksPage";
import { NewBookPage } from "./pages/NewBookPage";
import { BookDetail } from "./pages/BookDetail";
import { ChaptersPage } from "./pages/ChaptersPage";
import { QaPage } from "./pages/QaPage";

export function App() {
  return (
    <BrowserRouter>
      <AdminShell>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/accounts" element={<AdminAccountsPage />} />
          <Route path="/admin/books" element={<BooksPage />} />
          <Route path="/admin/books/new" element={<NewBookPage />} />
          {/* Dedicated reader-management pages take precedence over the tabbed detail. */}
          <Route path="/admin/books/:bookId/chapters" element={<ChaptersPage />} />
          <Route path="/admin/books/:bookId/qa" element={<QaPage />} />
          <Route path="/admin/books/:bookId/*" element={<BookDetail />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminShell>
    </BrowserRouter>
  );
}
